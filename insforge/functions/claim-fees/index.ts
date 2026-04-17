// @ts-nocheck
// Deno edge function — runs on InsForge/Deno runtime, not Node.js.

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
      return new Response(
        JSON.stringify({ error: "user_pubkey is required", success: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = createClient({
      baseUrl: "https://9s8ct2b5.us-east.insforge.app",
      anonKey: Deno.env.get("ANON_KEY") || ""
    });

    // 1. Fetch all unclaimed fee_share_claims for this wallet
    const { data: claims, error: fetchError } = await client.database
      .from("fee_share_claims")
      .select("*")
      .eq("contributor_pubkey", user_pubkey)
      .eq("claimed", false);

    if (fetchError) throw fetchError;

    if (!claims || claims.length === 0) {
      return new Response(
        JSON.stringify({ message: "No unclaimed fees found.", claimedSol: 0, success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Calculate total SOL payout
    // Each claim has a bps (basis points) share of the oracle's trade (0.005 SOL per trade)
    const TRADE_AMOUNT_SOL = parseFloat(Deno.env.get("ORACLE_MAX_BUY_SOL") || "0.005");
    const totalBps = claims.reduce((sum: number, c: any) => sum + (c.bps || 5), 0);
    const totalSol = (totalBps / 10000) * TRADE_AMOUNT_SOL * claims.length;

    // 3. Execute SOL transfer from oracle wallet to contributor
    let transferSignature: string | null = null;
    const privateKey = Deno.env.get("PRIVATE_KEY");
    const rpcUrl = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";

    if (privateKey && totalSol > 0) {
      const {
        Keypair, Connection, LAMPORTS_PER_SOL, PublicKey,
        Transaction, SystemProgram, sendAndConfirmTransaction,
      } = await import("npm:@solana/web3.js");
      const bs58 = (await import("npm:bs58")).default;

      const connection = new Connection(rpcUrl, "confirmed");
      const oracleWallet = Keypair.fromSecretKey(bs58.decode(privateKey));

      // Safety: never drain the oracle wallet below minimum buffer
      const MIN_BALANCE = parseFloat(Deno.env.get("ORACLE_MIN_BALANCE_SOL") || "0.2");
      const oracleBalance = (await connection.getBalance(oracleWallet.publicKey)) / LAMPORTS_PER_SOL;

      if (oracleBalance - totalSol < MIN_BALANCE) {
        return new Response(
          JSON.stringify({
            error: "Oracle wallet below minimum buffer. Try again later.",
            success: false,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const lamports = Math.floor(totalSol * LAMPORTS_PER_SOL);
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: oracleWallet.publicKey,
          toPubkey: new PublicKey(user_pubkey),
          lamports,
        })
      );

      transferSignature = await sendAndConfirmTransaction(connection, tx, [oracleWallet]);
    }

    // 4. Mark all claims as claimed
    const claimIds = claims.map((c: any) => c.id);
    const { error: updateError } = await client.database
      .from("fee_share_claims")
      .update({ claimed: true, claimed_at: new Date().toISOString() })
      .in("id", claimIds);

    if (updateError) throw updateError;

    // 5. Broadcast earnings update so UI refreshes instantly
    await client.realtime.broadcast("fee_claims", "fees_claimed", {
      contributor_pubkey: user_pubkey,
      claimed_count: claims.length,
      claimed_sol: totalSol,
      signature: transferSignature,
    });

    return new Response(
      JSON.stringify({
        success: true,
        claimedCount: claims.length,
        claimedSol: totalSol,
        signature: transferSignature,
        message: transferSignature
          ? `Claimed ${totalSol.toFixed(6)} SOL!`
          : `${claims.length} claims recorded. SOL transfer pending wallet config.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[claim-fees] fatal:", msg);
    return new Response(
      JSON.stringify({ error: msg, success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
