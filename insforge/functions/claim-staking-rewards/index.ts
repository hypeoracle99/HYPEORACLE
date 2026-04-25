// @ts-nocheck
import { createClient } from "npm:@insforge/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { user_pubkey } = await req.json();

    if (!user_pubkey) {
      return new Response(JSON.stringify({ error: "Missing user_pubkey", success: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient({
      baseUrl: "https://9s8ct2b5.us-east.insforge.app",
      anonKey: Deno.env.get("ANON_KEY") || ""
    });

    // 1. Fetch Staking Data
    const { data: userStaking } = await client.database
      .from("user_staking")
      .select("*")
      .eq("user_pubkey", user_pubkey)
      .single();

    const { data: globalStats } = await client.database
      .from("hype_token_stats")
      .select("*")
      .limit(1)
      .single();

    if (!userStaking || userStaking.staked_amount <= 0) {
      return new Response(JSON.stringify({ error: "No active staking found.", success: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Calculate Share (MVP simplified proportional allocation)
    const totalStaked = Number(globalStats.total_staked) || 1;
    const globalPool = Number(globalStats.staking_reward_pool) || 0;
    
    // Proportion of the pool the user is entitled to
    const shareRatio = Number(userStaking.staked_amount) / totalStaked;
    const claimableSOL = globalPool * shareRatio;

    if (claimableSOL <= 0) {
      return new Response(JSON.stringify({ error: "No rewards available to claim yet.", success: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Execute REAL SOL transfer from oracle wallet to user
    const privateKey = Deno.env.get("PRIVATE_KEY");
    const rpcUrl = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";
    let transferSignature: string | null = null;

    if (privateKey && claimableSOL > 0) {
      const { 
        Keypair, Connection, LAMPORTS_PER_SOL, PublicKey, 
        Transaction, SystemProgram, sendAndConfirmTransaction 
      } = await import("npm:@solana/web3.js");
      const bs58 = (await import("npm:bs58")).default;

      const connection = new Connection(rpcUrl, "confirmed");
      const oracleWallet = Keypair.fromSecretKey(bs58.decode(privateKey));
      
      const lamports = Math.floor(claimableSOL * LAMPORTS_PER_SOL);
      
      // Safety: check oracle balance
      const oracleBalance = await connection.getBalance(oracleWallet.publicKey);
      if (oracleBalance < lamports + 5000) {
        throw new Error("Oracle wallet has insufficient balance for rewards payout.");
      }

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: oracleWallet.publicKey,
          toPubkey: new PublicKey(user_pubkey),
          lamports,
        })
      );

      transferSignature = await sendAndConfirmTransaction(connection, tx, [oracleWallet]);
      console.log(`[claim-rewards] Payout Success: ${transferSignature}`);
    }
    
    // 4. Update Database
    await client.database.query(`
      UPDATE hype_token_stats SET staking_reward_pool = staking_reward_pool - ${claimableSOL};
      UPDATE user_staking SET pending_rewards = 0, last_calculated_at = now() WHERE user_pubkey = '${user_pubkey}';
    `);

    return new Response(JSON.stringify({
      message: `Successfully claimed ${claimableSOL.toFixed(6)} SOL rewards!`,
      claimed_amount: claimableSOL,
      signature: transferSignature,
      success: true
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[claim-staking-rewards] fatal:", msg);
    return new Response(JSON.stringify({ error: msg, success: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
