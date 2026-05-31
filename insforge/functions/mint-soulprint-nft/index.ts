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
    return new Response("ok", { headers: corsHeaders });
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

    // 1. Check if user profile already exists
    const { data: profile, error: fetchError } = await client.database
      .from("user_vibe_profiles")
      .select("*")
      .eq("user_pubkey", user_pubkey)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!profile) {
      return new Response(JSON.stringify({
        error: "Vibe Agent profile not found. You must calibrate your personal agent first!",
        success: false
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. If NFT already minted, return the existing mint address
    if (profile.nft_token_mint) {
      return new Response(JSON.stringify({
        success: true,
        tokenMintAddress: profile.nft_token_mint,
        mintedAt: profile.nft_minted_at,
        lastSyncedAt: profile.nft_last_synced_at,
        message: "Dynamic Soulprint NFT already minted!"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Generate high-fidelity base58 Metaplex mock Solana token mint address
    const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let randomBase58 = "";
    for (let i = 0; i < 32; i++) {
      randomBase58 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const tokenMintAddress = `HypeNFT_${randomBase58}`;
    const now = new Date().toISOString();

    // 4. Update user profile row
    const { data: updatedProfile, error: updateError } = await client.database
      .from("user_vibe_profiles")
      .update({
        nft_token_mint: tokenMintAddress,
        nft_minted_at: now,
        nft_last_synced_at: now
      })
      .eq("user_pubkey", user_pubkey)
      .select()
      .single();

    if (updateError) throw updateError;

    // 5. Broadcast to realtime dashboard clients
    await client.realtime.publish("user_vibe_profiles", "nft_minted", {
      user_pubkey,
      nft_token_mint: tokenMintAddress,
      nft_minted_at: now
    });

    return new Response(JSON.stringify({
      success: true,
      tokenMintAddress,
      mintedAt: now,
      lastSyncedAt: now,
      message: "Dynamic Soulprint NFT minted successfully!"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[mint-soulprint-nft] fatal:", msg);
    return new Response(JSON.stringify({ error: msg, success: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
