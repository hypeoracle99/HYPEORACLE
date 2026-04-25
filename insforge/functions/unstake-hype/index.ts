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
    const { user_pubkey, amount_hype } = await req.json();

    if (!user_pubkey || !amount_hype) {
      return new Response(JSON.stringify({ error: "Missing fields", success: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[unstake] Request for ${user_pubkey} amount ${amount_hype}`);
    const client = createClient({
      baseUrl: "https://9s8ct2b5.us-east.insforge.app",
      anonKey: Deno.env.get("ANON_KEY") || ""
    });

    // 1. Check if user has enough staked
    const { data: currentStake, error: dbError } = await client.database
      .from("user_staking")
      .select("staked_amount")
      .eq("user_pubkey", user_pubkey)
      .single();

    if (!currentStake || currentStake.staked_amount < Number(amount_hype)) {
      return new Response(JSON.stringify({ error: "Insufficient staked balance", success: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Perform REAL On-Chain Transfer back to User
    const privateKey = Deno.env.get("PRIVATE_KEY");
    const rpcUrl = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";
    const tokenMint = "5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS"; // HYPE Mint

    if (!privateKey) throw new Error("VAULT_PRIVATE_KEY missing");

    const { Keypair, Connection, PublicKey, Transaction } = await import("npm:@solana/web3.js");
    const { 
      getAssociatedTokenAddress, 
      createTransferInstruction,
      getAccount
    } = await import("npm:@solana/spl-token");
    const bs58 = (await import("npm:bs58")).default;

    const connection = new Connection(rpcUrl, "confirmed");
    const vaultWallet = Keypair.fromSecretKey(bs58.decode(privateKey));
    const userPubKey = new PublicKey(user_pubkey);
    const mintPubKey = new PublicKey(tokenMint);

    console.log(`[unstake] Vault: ${vaultWallet.publicKey.toBase58()}`);

    const vaultAta = await getAssociatedTokenAddress(mintPubKey, vaultWallet.publicKey);
    const userAta = await getAssociatedTokenAddress(mintPubKey, userPubKey);

    const amount = Math.floor(Number(amount_hype) * 1e9); // Ensure integer

    console.log(`[unstake] Sending ${amount} raw to ${userAta.toBase58()}`);

    const { blockhash } = await connection.getLatestBlockhash();
    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = vaultWallet.publicKey;

    transaction.add(
      createTransferInstruction(
        vaultAta,
        userAta,
        vaultWallet.publicKey,
        amount
      )
    );

    const signature = await connection.sendTransaction(transaction, [vaultWallet]);
    console.log(`[unstake] TX signature: ${signature}`);
    
    // We don't wait for confirmation to avoid timing out the cloud function!
    // We update the DB immediately then return.

    // 3. Update Database
    const newAmount = currentStake.staked_amount - Number(amount_hype);
    await client.database
      .from("user_staking")
      .update({ staked_amount: newAmount })
      .eq("user_pubkey", user_pubkey);

    // Update Global Stats
    const { data: stats } = await client.database.from("hype_token_stats").select("*").limit(1).single();
    if (stats) {
      await client.database.from("hype_token_stats").update({
        total_staked: Number(stats.total_staked) - Number(amount_hype)
      }).eq("id", stats.id);
    }

    return new Response(JSON.stringify({
      message: `Successfully unstaked ${amount_hype} $HYPE!`,
      signature,
      success: true
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    return new Response(JSON.stringify({ error: msg, success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
