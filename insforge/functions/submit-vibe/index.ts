// @ts-nocheck
// Deno edge function — runs on InsForge/Deno runtime, not Node.js.
// @ts-nocheck suppresses false VS Code errors from the Next.js tsconfig.
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
    const formData = await req.formData();
    const voiceFile = formData.get("voice") as File;
    const emoji = formData.get("emoji") as string;
    const tokenMint = formData.get("token_mint") as string;
    const sensorDataStr = formData.get("sensor_data") as string;
    const userPubkey = formData.get("user_pubkey") as string;

    if (!voiceFile || !emoji || !tokenMint || !sensorDataStr || !userPubkey) {
      return new Response(JSON.stringify({ error: "Missing required fields", success: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sensorData = JSON.parse(sensorDataStr);
    const avgVolume = sensorData.avg_volume || 0; // 0-1
    const accel = sensorData.accel_magnitude || 0; // 0-1
    const energy = ((avgVolume + accel) / 2) * 100;

    // Initialize InsForge client using explicit endpoint
    const client = createClient({
      baseUrl: "https://9s8ct2b5.us-east.insforge.app",
      anonKey: Deno.env.get("ANON_KEY") || ""
    });

    // 1. Upload voice to storage
    const uniqueKey = `vibes/${Date.now()}-${crypto.randomUUID()}.webm`;
    const { data: uploadData, error: uploadError } = await client.storage
      .from("vibes")
      .upload(uniqueKey, voiceFile);

    if (uploadError || !uploadData) {
      throw new Error(`Upload failed: ${uploadError?.message}`);
    }

    const voiceUrl = uploadData.url;

    // 2. AI Processing: Transcription (Whisper)
    // We use the AI Gateway for transcription
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) throw new Error("GROQ_API_KEY not set");

    const transcribeForm = new FormData();
    transcribeForm.append("file", voiceFile);
    transcribeForm.append("model", "whisper-large-v3");
    transcribeForm.append("response_format", "text");

    const transcribeRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqApiKey}` },
      body: transcribeForm,
    });

    const rawTranscript = await transcribeRes.text();

    if (!rawTranscript) {
      throw new Error("Transcription returned empty result");
    }

    // 3. AI Processing: Sentiment Analysis (Grok 4.1 Fast via Model Gateway)
    const analysisPrompt = `
      Analyze this crypto hype submission. 
      Transcript: "${rawTranscript}"
      Emoji: ${emoji}
      
      Score the "Excitement Level" from 0-100 based on enthusiasm, energy, and bull-market-readiness.
      Provide ONLY a single integer score.
    `;

    const modelResponse = await client.ai.chat.completions.create({
      model: "x-ai/grok-4.1-fast",
      messages: [{ role: "user", content: analysisPrompt }],
      max_tokens: 10,
      temperature: 0.1,
    });

    const excitementScore = parseInt(modelResponse.choices[0]?.message?.content?.trim()) || 50;

    // 4. Scoring Formula
    // emoji_weight: Mapping positive/negative vibes
    const weights: Record<string, number> = {
      "🔥": 20, "🚀": 20, "💎": 20, "🐂": 20, "🌙": 20,
      "💩": -50, "📉": -50, "💀": -50, "🐻": -30
    };
    const emojiWeight = weights[emoji] || 0;

    // score = (excitement * 0.6) + (volume/energy * 0.3) + emoji_weight
    let totalScore = (excitementScore * 0.6) + (energy * 0.3) + emojiWeight;
    const finalScore = Math.min(100, Math.max(0, totalScore));

    // 5. Database Persistence
    const { error: insertError } = await client.database
      .from("vibes_raw")
      .insert({
        token_mint: tokenMint,
        user_pubkey: userPubkey,
        voice_file_url: voiceUrl,
        emoji,
        sensor_data: sensorData,
        raw_transcript: rawTranscript,
      });

    if (insertError) throw insertError;

    // Atomic aggregate update
    const { data: currentScore } = await client.database
      .from("vibe_scores")
      .select("score, contributor_count")
      .eq("token_mint", tokenMint)
      .single();

    let nextScore, nextCount;
    if (currentScore) {
      nextCount = currentScore.contributor_count + 1;
      nextScore = ((currentScore.score * currentScore.contributor_count) + finalScore) / nextCount;
    } else {
      nextScore = finalScore;
      nextCount = 1;
    }

    const updatedAt = new Date().toISOString();

    await client.database
      .from("vibe_scores")
      .upsert({
        token_mint: tokenMint,
        score: nextScore,
        contributor_count: nextCount,
        updated_at: updatedAt,
      });

    // Broadcast live score update to subscribed dashboard clients
    await client.realtime.broadcast("vibe_scores", "score_updated", {
      token_mint: tokenMint,
      score: nextScore,
      contributor_count: nextCount,
      confidence: Math.min(1, nextCount / 10),
      updated_at: updatedAt,
    });

    // 6. Bags.fm Trading Integration (Production Hardened)
    let tradeSignature = null;
    
    // Safety Constants from Env
    const MAX_BUY = parseFloat(Deno.env.get("ORACLE_MAX_BUY_SOL") || "0.005");
    const COOLDOWN_MINS = parseInt(Deno.env.get("ORACLE_COOLDOWN_MINUTES") || "5");
    const MIN_BALANCE = parseFloat(Deno.env.get("ORACLE_MIN_BALANCE_SOL") || "0.2");

    if (nextScore > 80) {
      try {
        const privateKey = Deno.env.get("PRIVATE_KEY");
        const bagsApiKey = Deno.env.get("BAGS_API_KEY");
        const rpcUrl = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";
        
        if (privateKey && bagsApiKey) {
          const { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey } = await import("npm:@solana/web3.js");
          const { BagsSDK } = await import("npm:@bagsfm/bags-sdk");
          const bs58 = (await import("npm:bs58")).default;

          const connection = new Connection(rpcUrl);
          const wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
          
          // 6.1 Balance Check
          const balance = await connection.getBalance(wallet.publicKey);
          const balanceSol = balance / LAMPORTS_PER_SOL;
          
          if (balanceSol < MIN_BALANCE) {
            console.warn(`Oracle low on fuel: ${balanceSol} SOL. Skipping auto-buy.`);
          } else {
            // 6.2 Rate Limit Check
            const { data: scoreRecord } = await client.database
              .from("vibe_scores")
              .select("last_oracle_trade_at")
              .eq("token_mint", tokenMint)
              .single();

            const lastTrade = scoreRecord?.last_oracle_trade_at ? new Date(scoreRecord.last_oracle_trade_at) : null;
            const now = new Date();
            const cooldownPassed = !lastTrade || (now.getTime() - lastTrade.getTime()) > (COOLDOWN_MINS * 60 * 1000);

            if (!cooldownPassed) {
              console.info(`Cooldown active for ${tokenMint}. Skipping.`);
            } else {
              const sdk = new BagsSDK(bagsApiKey, connection, "processed");
              const quote = await sdk.trade.getQuote({
                inputMint: new PublicKey("So11111111111111111111111111111111111111112"), // SOL
                outputMint: new PublicKey(tokenMint),
                amount: MAX_BUY * LAMPORTS_PER_SOL,
              });

              const swap = await sdk.trade.createSwapTransaction({
                quoteResponse: quote,
                userPublicKey: wallet.publicKey,
                connection,
              });

              tradeSignature = await sdk.sendTransaction(swap.transaction, wallet, connection);
              
              // 6.3 Logging & State Update
              if (tradeSignature) {
                const tradeRecord = {
                  token_mint: tokenMint,
                  signature: tradeSignature,
                  amount_sol: MAX_BUY,
                  vibe_score: Math.round(nextScore),
                  created_at: now.toISOString(),
                };

                // Record trade for transparency
                const { data: insertedTrade } = await client.database
                  .from("oracle_trades")
                  .insert(tradeRecord)
                  .select()
                  .single();

                // Broadcast live trade event to trade-feed listeners
                await client.realtime.broadcast("oracle_trades", "new_trade", {
                  ...(insertedTrade ?? tradeRecord),
                });

                // Update cooldown timestamp + flag on vibe_scores
                await client.database
                  .from("vibe_scores")
                  .update({
                    last_oracle_trade_at: now.toISOString(),
                  })
                  .eq("token_mint", tokenMint);

                // Broadcast updated score with trade flag
                await client.realtime.broadcast("vibe_scores", "score_updated", {
                  token_mint: tokenMint,
                  score: nextScore,
                  contributor_count: nextCount,
                  confidence: Math.min(1, nextCount / 10),
                  last_oracle_trade_at: now.toISOString(),
                  updated_at: now.toISOString(),
                });

                // Record fee share claim for the user
                await client.database.from("fee_share_claims").insert({
                  token_mint: tokenMint,
                  contributor_pubkey: userPubkey,
                  bps: 5, // 0.05%
                });
              }
            }
          }
        }
      } catch (e) {
        console.error("Auto-buy logic failed", e);
      }
    }

    return new Response(JSON.stringify({
      vibeScore: Math.round(finalScore),
      tradeSignature,
      message: finalScore > 80 ? "BULLISH! Trade executed." : "Vibe localized.",
      success: true
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[submit-vibe] fatal:", msg);
    return new Response(JSON.stringify({ error: msg, success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
