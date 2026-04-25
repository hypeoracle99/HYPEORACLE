// @ts-ignore
import { createClient } from "https://esm.sh/@insforge/sdk@1.2.2";

interface RefillRequest {
  trigger?: string;
}

export default async function(req: Request) {
  const client = createClient();
  
  try {
    // 1. Calculate Unprocessed Fees
    // Logic: Sum all SOL in platform_fees that hasn't been "distributed" yet.
    // In our simplified schema, we'll just process all available records and then delete them or mark them.
    
    const { data: fees, error: feeError } = await client.database
      .from("platform_fees")
      .select("id, amount_sol");
      
    if (feeError) throw feeError;
    if (!fees || fees.length === 0) {
      return Response.json({ success: true, message: "No fees to process" });
    }
    
    const totalCollected = fees.reduce((acc: number, curr: any) => acc + Number(curr.amount_sol), 0);
    
    // 2. Apply 40/40/20 Split
    const fuelShare = totalCollected * 0.4;
    const stakerShare = totalCollected * 0.4;
    const treasuryShare = totalCollected * 0.2;
    
    // 3. Update Oracle Fuel
    const { data: currentFuel } = await client.database
      .from("oracle_fuel")
      .select("id, current_balance")
      .limit(1)
      .single();
      
    if (currentFuel) {
      await client.database
        .from("oracle_fuel")
        .update({ 
          current_balance: Number(currentFuel.current_balance) + fuelShare,
          last_refill: new Date().toISOString()
        })
        .eq("id", currentFuel.id);
    }
    
    // 4. Update Staker Rewards (Global Pool Distribution)
    // For simplicity, we add the 40% share proportionately to ALL current stakers
    // In a production app, we'd use a 'reward_per_share' accumulator.
    const { data: totalStakedData } = await client.database
      .from("hype_token_stats")
      .select("total_staked_amount")
      .single();
      
    const totalStaked = Number(totalStakedData?.total_staked_amount || 0);
    
    if (totalStaked > 0) {
      // Direct update to unclaimed_rewards for all stakers
      // SQL: unclaimed_rewards = unclaimed_rewards + (stakerShare * (staked_amount / totalStaked))
      // Since we can't easily do a relative update with the SDK without RPC, we'll use a raw query or just log the distribution.
      
      // OPTIMIZATION: We'll record this in a 'rewards_log' for transparency and update the user_staking table.
      await client.database.rpc("distribute_staking_rewards", { 
        total_reward_sol: stakerShare 
      });
    }
    
    // 5. Cleanup processed fees
    const feeIds = fees.map((f: any) => f.id);
    await client.database
      .from("platform_fees")
      .delete()
      .in("id", feeIds);
      
    console.log(`[refill-oracle-fuel] Processed ${totalCollected} SOL. Fuel: +${fuelShare}, Stakers: +${stakerShare}`);
    
    return Response.json({ 
      success: true, 
      processed: totalCollected,
      distribution: { fuel: fuelShare, stakers: stakerShare, treasury: treasuryShare }
    });
    
  } catch (err: any) {
    console.error("[refill-oracle-fuel] Error:", err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
