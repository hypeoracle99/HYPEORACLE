// @ts-nocheck
// Deno edge function — runs on InsForge/Deno runtime, not Node.js.
import { createClient } from "npm:@insforge/sdk";
import { Connection, LAMPORTS_PER_SOL, Keypair, PublicKey } from "npm:@solana/web3.js";
import bs58 from "npm:bs58";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const privateKey = Deno.env.get("PRIVATE_KEY");
    const rpcUrl = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";

    if (!privateKey) {
      return new Response(JSON.stringify({
        status: "not_configured",
        address: "N/A",
        balance: 0,
        success: true
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const connection = new Connection(rpcUrl);
    let address = "N/A";
    let balanceSol = 0;

    try {
      const wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
      address = wallet.publicKey.toBase58();
      const balance = await connection.getBalance(wallet.publicKey);
      balanceSol = balance / LAMPORTS_PER_SOL;
    } catch (e) {
      console.error("Wallet/Balance fetch failed", e);
      return new Response(JSON.stringify({
        status: "error",
        error: "Invalid Wallet Key",
        address: "N/A",
        balance: 0,
        success: true
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const minBalance = parseFloat(Deno.env.get("ORACLE_MIN_BALANCE_SOL") || "0.2");

    return new Response(JSON.stringify({
      address,
      balance: balanceSol,
      status: balanceSol > minBalance ? "active" : "low_fuel",
      success: true
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg, success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
