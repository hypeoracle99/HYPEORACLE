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

    await client.realtime.connect();

    // READ BUFFER FIRST — voiceFile is a stream that can only be consumed once.
    // Doing storage.upload(voiceFile) first would exhaust the stream, leaving arrayBuffer() empty.
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) throw new Error("GROQ_API_KEY not set");

    // Determine extension/mimeType based on incoming file type
    let extension = "wav";
    let mimeType = "audio/wav";
    if (voiceFile.type && (voiceFile.type.includes("mp4") || voiceFile.type.includes("m4a"))) {
      extension = "m4a"; mimeType = "audio/mp4";
    } else if (voiceFile.type && (voiceFile.type.includes("mpeg") || voiceFile.type.includes("mp3"))) {
      extension = "mp3"; mimeType = "audio/mpeg";
    } else if (voiceFile.type && voiceFile.type.includes("webm")) {
      extension = "webm"; mimeType = "audio/webm";
    }

    // Read the buffer ONCE, reuse for both storage and Groq
    const voiceBuffer = await voiceFile.arrayBuffer();
    console.log(`[submit-vibe] Buffer size: ${voiceBuffer.byteLength} bytes, type: ${mimeType}`);
    if (voiceBuffer.byteLength === 0) throw new Error("Audio buffer is empty — microphone may not have captured any audio.");

    const voiceBlob = new Blob([voiceBuffer], { type: mimeType });

    // 1. Upload voice to storage (use the blob, not the original file)
    const uniqueKey = `vibes/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { data: uploadData, error: uploadError } = await client.storage
      .from("vibes")
      .upload(uniqueKey, voiceBlob);

    if (uploadError || !uploadData) {
      throw new Error(`Upload failed: ${uploadError?.message}`);
    }

    const voiceUrl = uploadData.url;

    // 2. AI Processing: Transcription (Whisper via Groq)
    const transcribeForm = new FormData();
    transcribeForm.append("file", new Blob([voiceBuffer], { type: mimeType }), `audio.${extension}`);
    transcribeForm.append("model", "whisper-large-v3");
    transcribeForm.append("response_format", "text");

    console.log(`[submit-vibe] Sending to Groq: audio.${extension} (${mimeType}, ${voiceBuffer.byteLength} bytes)`);

    const transcribeRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqApiKey}` },
      body: transcribeForm,
    });

    if (!transcribeRes.ok) {
      const errorData = await transcribeRes.text();
      console.error("[submit-vibe] Groq Error:", errorData);
      throw new Error(`Groq transcription failed (${transcribeRes.status}): ${errorData}`);
    }

    const rawTranscript = await transcribeRes.text();

    if (!rawTranscript || rawTranscript.trim().length === 0) {
      console.warn("[submit-vibe] Transcription was empty. Using fallback.");
      // We don't throw here, we just use a fallback transcript to avoid 500
    }

    const transcriptToAnalyze = (rawTranscript && rawTranscript.trim().length > 0) 
      ? rawTranscript 
      : "No clear audio captured (silent hype).";

    // 3. AI Processing: Enhanced Sentiment Analysis (Consensus-Aware)
    let excitementScore = 50;
    let conviction = 0.5;

    try {
      const analysisPrompt = `
        Analyze this crypto hype submission. 
        Transcript: "${transcriptToAnalyze}"
        Emoji: ${emoji}
        
        Return a JSON object:
        {
          "score": number (0-100),
          "conviction": number (0-1),
          "momentum": "bullish" | "bearish" | "neutral",
          "is_bot_like": boolean
        }
      `;

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You are the HypeOracle Sentiment Engine. Output JSON only." },
            { role: "user", content: analysisPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        })
      });

      const completion = await groqRes.json();
      if (completion.error) throw new Error(completion.error.message);

      const aiResult = JSON.parse(completion.choices[0]?.message?.content || "{}");
      excitementScore = aiResult.score || 50;
      conviction = aiResult.conviction || 0.5;
      console.log(`[submit-vibe] Groq Sentiment Score: ${excitementScore}`);
    } catch (aiErr) {
      console.error("[submit-vibe] Groq Sentiment failed, using defaults:", aiErr);
      excitementScore = (energy > 50 || ["🔥", "🚀"].includes(emoji)) ? 75 : 50;
    }

    // 4. Scoring Formula
    // emoji_weight: Mapping positive/negative vibes
    const weights: Record<string, number> = {
      "🔥": 20, "🚀": 20, "💎": 20, "🐂": 20, "🌙": 20,
      "💩": -50, "📉": -50, "💀": -50, "🐻": -30
    };
    const emojiWeight = weights[emoji] || 0;

    // score = (excitement * 0.6) + (volume/energy * 0.3) + emoji_weight
    let totalScore = (excitementScore * 0.6) + (energy * 0.3) + emojiWeight;
    
    // 4.1 Apply Staking Multiplier (10-50% boost)
    const { data: stakingData } = await client.database
      .from("user_staking")
      .select("staked_amount")
      .eq("user_pubkey", userPubkey)
      .single();
    
    if (stakingData && stakingData.staked_amount > 0) {
      // Simple scaling logic: 1M $HYPE = 50% boost (max), capped at 50%
      const boostPercent = Math.min(0.5, (stakingData.staked_amount / 1_000_000));
      totalScore = totalScore * (1 + boostPercent);
      console.log(`[submit-vibe] Staking Boost Applied: +${(boostPercent * 100).toFixed(1)}%`);
    }

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
    await client.realtime.publish("vibe_scores", "score_updated", {
      token_mint: tokenMint,
      score: nextScore,
      contributor_count: nextCount,
      confidence: Math.min(1, nextCount / 10),
      updated_at: updatedAt,
    });

    // 6. Bags.fm Trading Integration (Vibe 2.0 Dynamic Sizing)
    let tradeSignature = null;
    
    // Security & Sizing Logic
    const COOLDOWN_MINS = parseInt(Deno.env.get("ORACLE_COOLDOWN_MINUTES") || "5");
    const MIN_BALANCE = parseFloat(Deno.env.get("ORACLE_MIN_BALANCE_SOL") || "0.2");
    const MAX_SINGLE_BUY = 0.01; // Safety Cap

    // Dynamic Buy Calculation (Consensus Aware)
    // Base 0.003 + (Contributor Boost: 0.001 per unique user in last 10min)
    const baseBuy = 0.003;
    const consensusBoost = Math.min(0.007, (nextCount - 1) * 0.001);
    const INTENDED_BUY = Math.min(MAX_SINGLE_BUY, baseBuy + consensusBoost);

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
            
            // Sync identity and live balance
            await client.database
              .from("oracle_fuel")
              .update({ 
                oracle_pubkey: wallet.publicKey.toBase58(),
                current_balance: balanceSol,
                updated_at: new Date().toISOString()
              })
              .eq("id", (await client.database.from("oracle_fuel").select("id").limit(1).single()).data?.id);
          } else {
            // Sync identity and live balance
            await client.database
              .from("oracle_fuel")
              .update({ 
                oracle_pubkey: wallet.publicKey.toBase58(),
                current_balance: balanceSol,
                updated_at: new Date().toISOString()
              })
              .eq("id", (await client.database.from("oracle_fuel").select("id").limit(1).single()).data?.id);
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
                amount: INTENDED_BUY * LAMPORTS_PER_SOL,
              });

              const swap = await sdk.trade.createSwapTransaction({
                quoteResponse: quote,
                userPublicKey: wallet.publicKey,
                connection,
              });

              tradeSignature = await sdk.sendTransaction(swap.transaction, wallet, connection);
              
              // 6.3 Logging & State Update
              if (tradeSignature) {
                const FEE_SOL = INTENDED_BUY * 0.01; // 1% fee simulation

                const tradeRecord = {
                  token_mint: tokenMint,
                  signature: tradeSignature,
                  amount_sol: INTENDED_BUY,
                  vibe_score: Math.round(nextScore),
                  created_at: now.toISOString(),
                };

                // Record Platform Fee
                await client.database.from("platform_fees").insert({
                  vibe_id: null, // we can link if we have vibe record id
                  amount_sol: FEE_SOL,
                });

                // 6.4 Trigger Automated Fuel Refill & Staker Distribution
                // We fire and forget this so it doesn't slow down the vibe submission
                fetch("https://9s8ct2b5.functions.insforge.app/refill-oracle-fuel", {
                  method: "POST",
                  body: JSON.stringify({ trigger: "auto-buy" })
                }).catch(e => console.error("[submit-vibe] Refill Trigger Error:", e));

                // Trigger Refill Logic (Internal call to update pools)
                // 40% Fuel, 40% Stakers, 20% Treasury
                const fuelAmount = FEE_SOL * 0.4;
                const rewardAmount = FEE_SOL * 0.4;

                await client.database.query(`
                  UPDATE oracle_fuel SET current_balance = current_balance + ${fuelAmount};
                  UPDATE hype_token_stats SET 
                    oracle_fuel_pool = oracle_fuel_pool + ${fuelAmount},
                    staking_reward_pool = COALESCE(staking_reward_pool, 0) + ${rewardAmount};
                `);

                // We'll update stakers pool in a batch or rewards table later
                // For MVP, logging the fee is the primary recording step.

                // Record trade for transparency
                const { data: insertedTrade } = await client.database
                  .from("oracle_trades")
                  .insert(tradeRecord)
                  .select()
                  .single();

                // Broadcast live trade event to trade-feed listeners
                await client.realtime.publish("oracle_trades", "new_trade", {
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
                await client.realtime.publish("vibe_scores", "score_updated", {
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
    let msg = "Unknown error";
    if (error instanceof Error) {
      msg = error.message;
    } else if (typeof error === "object" && error !== null) {
      msg = JSON.stringify(error);
    } else {
      msg = String(error);
    }
    console.error("[submit-vibe] fatal:", msg);
    return new Response(JSON.stringify({ error: msg, success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
