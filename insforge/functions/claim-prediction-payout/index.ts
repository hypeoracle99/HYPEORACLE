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
    const { user_pubkey, bet_id } = await req.json();

    if (!user_pubkey || !bet_id) {
      return new Response(JSON.stringify({ error: "Missing user_pubkey or bet_id", success: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient({
      baseUrl: "https://9s8ct2b5.us-east.insforge.app",
      anonKey: Deno.env.get("ANON_KEY") || ""
    });

    // 1. Fetch bet and associated market details
    const { data: bet, error: betError } = await client.database
      .from("vibe_prediction_bets")
      .select(`
        *,
        market:market_id (*)
      `)
      .eq("id", bet_id)
      .eq("user_pubkey", user_pubkey)
      .single();

    if (betError || !bet) {
      return new Response(JSON.stringify({ error: "Prediction position not found.", success: false }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const market = bet.market;
    if (!market) {
      return new Response(JSON.stringify({ error: "Associated market not found.", success: false }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (market.status !== "resolved") {
      return new Response(JSON.stringify({ error: "Prediction market is still active.", success: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (bet.claimed) {
      return new Response(JSON.stringify({ error: "Winnings have already been claimed.", success: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (bet.prediction !== market.outcome) {
      return new Response(JSON.stringify({ error: "This prediction was incorrect.", success: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch staker details to apply boosts
    let feeDiscount = 0;
    let payoutMultiplier = 1.0;
    let stakedAmount = 0;

    try {
      const { data: stakingInfo } = await client.database
        .from("user_staking")
        .select("staked_amount")
        .eq("user_pubkey", user_pubkey)
        .single();

      if (stakingInfo && stakingInfo.staked_amount) {
        stakedAmount = parseFloat(stakingInfo.staked_amount);
        if (stakedAmount >= 10000) {
          feeDiscount = 1.0; // 0% fee
          payoutMultiplier = 1.05; // 5% boost
        } else if (stakedAmount >= 1000) {
          feeDiscount = 0.5; // 0.5% fee
          payoutMultiplier = 1.02; // 2% boost
        }
      }
    } catch (err) {
      console.warn("[claim-prediction-payout] Staking read fail, using defaults:", err);
    }

    // Calculate payouts
    const yesPool = parseFloat(market.total_yes_pool || "0");
    const noPool = parseFloat(market.total_no_pool || "0");
    const totalPool = yesPool + noPool;
    const winningPool = market.outcome === "yes" ? yesPool : noPool;

    if (winningPool <= 0) {
      return new Response(JSON.stringify({ error: "Invalid pool configuration", success: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const betSize = parseFloat(bet.amount);
    const grossPayout = (betSize / winningPool) * totalPool;
    const baseFeeRate = 0.01;
    const appliedFeeRate = baseFeeRate * (1 - feeDiscount);
    const netPayout = grossPayout * (1 - appliedFeeRate) * payoutMultiplier;

    if (netPayout <= 0) {
      return new Response(JSON.stringify({ error: "Net payout calculation error", success: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Execute REAL SOL transfer from oracle wallet to user
    const privateKey = Deno.env.get("PRIVATE_KEY");
    const rpcUrl = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";
    let transferSignature: string | null = null;

    if (privateKey) {
      const { 
        Keypair, Connection, LAMPORTS_PER_SOL, PublicKey, 
        Transaction, SystemProgram, sendAndConfirmTransaction 
      } = await import("npm:@solana/web3.js");
      const bs58 = (await import("npm:bs58")).default;

      const connection = new Connection(rpcUrl, "confirmed");
      const oracleWallet = Keypair.fromSecretKey(bs58.decode(privateKey));
      
      const lamports = Math.floor(netPayout * LAMPORTS_PER_SOL);
      
      // Safety: check oracle balance
      const oracleBalance = await connection.getBalance(oracleWallet.publicKey);
      if (oracleBalance < lamports + 5000) {
        return new Response(JSON.stringify({ error: "Oracle wallet has insufficient balance for payout.", success: false }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: oracleWallet.publicKey,
          toPubkey: new PublicKey(user_pubkey),
          lamports,
        })
      );

      transferSignature = await sendAndConfirmTransaction(connection, tx, [oracleWallet]);
      console.log(`[claim-prediction-payout] Payout Success: ${transferSignature}`);
    }

    // 4. Update Database
    const { error: updateError } = await client.database
      .from("vibe_prediction_bets")
      .update({ claimed: true })
      .eq("id", bet_id);

    if (updateError) {
      throw updateError;
    }

    // Dynamic fee injection to oracle fuel
    try {
      const platformFee = grossPayout * 0.01;
      const oracleShare = platformFee * 0.40;
      const { data: fuel } = await client.database.from("oracle_fuel").select("*").limit(1).single();
      if (fuel) {
        const currentBal = parseFloat(fuel.current_balance || "0");
        await client.database
          .from("oracle_fuel")
          .update({ current_balance: currentBal + oracleShare })
          .eq("id", fuel.id);
      }
    } catch (err) {
      console.warn("[claim-prediction-payout] Oracle fuel refill warnings:", err);
    }

    return new Response(JSON.stringify({
      message: `Claim completed successfully! credited ${netPayout.toFixed(4)} SOL.`,
      claimed_amount: netPayout,
      signature: transferSignature,
      success: true
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[claim-prediction-payout] fatal:", msg);
    return new Response(JSON.stringify({ error: msg, success: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
