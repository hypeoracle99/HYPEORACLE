// @ts-nocheck
// Deno edge function — runs on InsForge/Deno runtime, not Node.js.
import { createClient } from "npm:@insforge/sdk";
import nacl from "npm:tweetnacl";
import bs58 from "npm:bs58";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-staker-pubkey, x-staker-signature, x-staker-timestamp",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Retrieve staker cryptographic authorization headers
    const pubkey = req.headers.get("x-staker-pubkey");
    const signature = req.headers.get("x-staker-signature");
    const timestampStr = req.headers.get("x-staker-timestamp");

    if (!pubkey || !signature || !timestampStr) {
      return new Response(JSON.stringify({ 
        error: "Missing staker authorization headers. x-staker-pubkey, x-staker-signature, and x-staker-timestamp required.",
        success: false 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timestamp = parseInt(timestampStr);
    if (isNaN(timestamp)) {
      return new Response(JSON.stringify({ error: "Invalid timestamp format.", success: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Prevent signature replay attacks (5 minute validity window)
    const now = Date.now();
    const timeDelta = Math.abs(now - timestamp);
    if (timeDelta > 5 * 60 * 1000) {
      return new Response(JSON.stringify({ 
        error: "Signature expired. Verifiable timestamp must be within 5 minutes of server time.",
        success: false 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Cryptographically verify signature
    let isValid = false;
    try {
      const message = `HypeOracleAPIAccess:${timestamp}`;
      const messageBytes = new TextEncoder().encode(message);
      const pubkeyBytes = bs58.decode(pubkey);
      const sigBytes = bs58.decode(signature);
      
      isValid = nacl.sign.detached.verify(messageBytes, sigBytes, pubkeyBytes);
    } catch (sigErr) {
      console.warn("[API Auth] Signature decode error:", sigErr);
    }

    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid signature. Cryptographic challenge failed.", success: false }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Initialize InsForge Client
    const client = createClient({
      baseUrl: "https://9s8ct2b5.us-east.insforge.app",
      anonKey: Deno.env.get("ANON_KEY") || ""
    });

    // 5. Query staker balance to verify they hold >= 100,000 $HYPE
    const { data: stakingInfo, error: stakeError } = await client.database
      .from("user_staking")
      .select("staked_amount")
      .eq("user_pubkey", pubkey)
      .maybeSingle();

    if (stakeError) throw stakeError;

    const stakedAmount = stakingInfo ? parseFloat(stakingInfo.staked_amount) : 0;
    const REQUIRED_STAKE = 100000;

    if (stakedAmount < REQUIRED_STAKE) {
      return new Response(JSON.stringify({
        error: `Insufficient staked balance. Gated access requires at least ${REQUIRED_STAKE.toLocaleString()} $HYPE staked. Your current staked balance: ${stakedAmount.toLocaleString()} $HYPE`,
        success: false,
        stakedHype: stakedAmount,
        requiredHype: REQUIRED_STAKE
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Perform verified query lookup based on parameters
    const url = new URL(req.url);
    const tokenMint = url.searchParams.get("token_mint");

    if (tokenMint) {
      // Return high-resolution token vibe score
      const { data: tokenScore, error: dbErr } = await client.database
        .from("vibe_scores")
        .select("*")
        .eq("token_mint", tokenMint)
        .maybeSingle();

      if (dbErr) throw dbErr;

      if (!tokenScore) {
        return new Response(JSON.stringify({
          error: `No emotional index found for token mint ${tokenMint}. Submit vibes to register.`,
          success: false
        }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate trading momentum signal dynamically
      const score = Math.round(tokenScore.score);
      const signal = score > 75 ? "STRONG BUY" : score > 55 ? "ACCUMULATE" : score > 35 ? "HOLD" : "DAMPENED / EXIT";

      return new Response(JSON.stringify({
        success: true,
        data: {
          token_mint: tokenMint,
          score: score,
          contributors: tokenScore.contributor_count,
          signal: signal,
          updated_at: tokenScore.updated_at
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Return global ecosystem indices
      const { data: globalSentiment, error: dbErr } = await client.database
        .from("global_sentiment_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dbErr) throw dbErr;

      const fallbackSentiment = {
        global_score: 62,
        total_contributors: 48,
        emotional_breakdown: { Greed: 25, Fear: 10, Hope: 35, Confidence: 20, Skepticism: 10 },
        created_at: new Date().toISOString()
      };

      const sentiment = globalSentiment || fallbackSentiment;

      return new Response(JSON.stringify({
        success: true,
        data: {
          index_type: "Solana Collective Consciousness Feed",
          global_score: Math.round(sentiment.global_score),
          total_active_contributors: sentiment.total_contributors,
          emotional_breakdown: sentiment.emotional_breakdown,
          timestamp: sentiment.created_at
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[query-collective-sentiment] fatal:", msg);
    return new Response(JSON.stringify({ error: msg, success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
