import { createClient } from "npm:@insforge/sdk";
import { TextDecoder } from "https://deno.land/std@0.177.0/encoding/text_decoder.ts";
import { parse } from "https://deno.land/x/multipart_parser@0.3.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { emoji, tokenMint, sensorDataStr, userPubkey, voiceBase64 } = body;

    if (!emoji || !tokenMint || !sensorDataStr || !userPubkey || !voiceBase64) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const sensorData = JSON.parse(sensorDataStr);
    const avgVolume = sensorData.avg_volume || 0; // 0-1
    const accel = sensorData.accel_magnitude || 0; // 0-1
    const energy = ((avgVolume + accel) / 2) * 100;

    // Upload voice to storage
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || "https://hy7zweqc.us-east.insforge.app";
    const serviceKey = Deno.env.get("INSFORGE_SERVICE_KEY") || "ik_604455395ddf3ab9b91c60a89ed73771";
    const client = createClient({ 
      baseUrl,
      serviceKey 
    });

    // Decode base64 to bytes
    const binaryString = atob(voiceBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const voiceBlob = new Blob([bytes], { type: 'audio/webm' });

    const uniqueKey = `vibes/${Date.now()}-${crypto.randomUUID()}.webm`;
    const { data: uploadData, error: uploadError } = await client.storage
      .from("vibes")
      .upload(uniqueKey, voiceBlob);

    if (uploadError || !uploadData) {
      throw new Error("Upload failed");
    }

    const voiceUrl = uploadData.url;

    // Transcribe with Groq Whisper
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const form = new FormData();
    form.append("file", voiceBlob, "voice.webm");
    form.append("model", "whisper-large-v3");
    form.append("response_format", "text");

    const transcribeRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: form,
    });

    const transcriptData = await transcribeRes.json();
    const rawTranscript = transcriptData.text || "";

    if (!rawTranscript) {
      throw new Error("Transcription failed");
    }

    // Emotion analysis with Llama 3.1 on Groq
    const prompt = `Analyze the following transcript for excitement level on a scale of 0-100. Excitement based on positive language, enthusiasm, hype words. Transcript: "${rawTranscript}" Emoji: ${emoji}. Respond ONLY with a number 0-100.`;

    const analysisRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 10,
        temperature: 0.1,
      }),
    });

    const analysisData = await analysisRes.json();
    const excitementStr = analysisData.choices[0]?.message?.content?.trim() || "50";
    const excitement = parseFloat(excitementStr);

    // Emoji weight
    let emojiWeight = 50;
    const positiveEmojis = ["🔥", "🚀", "💎", "😍", "🤩"];
    const negativeEmojis = ["😢", "😞", "💔"];
    if (positiveEmojis.includes(emoji)) emojiWeight = 100;
    else if (negativeEmojis.includes(emoji)) emojiWeight = 0;

    // Calculate score EXACTLY as per spec
    const score = (excitement * 0.6) + (energy * 0.3) + emojiWeight;

    const vibeScore = Math.min(100, score); // Cap at 100?

    // Insert raw
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

    if (insertError) {
      throw insertError;
    }

    // Update aggregate score
    const { data: existing } = await client.database
      .from("vibe_scores")
      .select("score, contributor_count")
      .eq("token_mint", tokenMint)
      .single();

    let newScore, newCount;
    if (existing) {
      newScore = (existing.score * existing.contributor_count + vibeScore) / (existing.contributor_count + 1);
      newCount = existing.contributor_count + 1;
    } else {
      newScore = vibeScore;
      newCount = 1;
    }

    const { error: updateError } = await client.database
      .from("vibe_scores")
      .upsert({
        token_mint: tokenMint,
        score: newScore,
        confidence: 0.8, // placeholder
        contributor_count: newCount,
      });

    if (updateError) {
      throw updateError;
    }

    // If score > 80, auto-buy and fee share
    if (newScore > 80) {
      try {
        const privateKeyBase58 = Deno.env.get("PRIVATE_KEY") || "";
        const rpcUrl = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";
        const bagsApiKey = Deno.env.get("BAGS_API_KEY") || "";

        // Import required modules
        const { Keypair, PublicKey, Connection, LAMPORTS_PER_SOL } = await import("npm:@solana/web3.js");
        const { BagsSDK, signAndSendTransaction } = await import("npm:@bagsfm/bags-sdk");
        const bs58Mod = await import("npm:bs58");
        const bs58 = bs58Mod.default;

        const keypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
        const connection = new Connection(rpcUrl);
        const sdk = new BagsSDK(bagsApiKey, connection, "processed");

        const inputMint = new PublicKey("So11111111111111111111111111111111111111112"); // WSOL
        const outputMint = new PublicKey(tokenMint);
        const amount = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL

        // Get quote
        const quote = await sdk.trade.getQuote({
          inputMint,
          outputMint,
          amount,
          slippageMode: "auto",
        });

        // Create and execute swap
        const swapResult = await sdk.trade.createSwapTransaction({
          quoteResponse: quote,
          userPublicKey: keypair.publicKey,
        });

        const commitment = sdk.state.getCommitment();
        const signature = await signAndSendTransaction(connection, commitment, swapResult.transaction, keypair);

        console.log("Auto-buy executed:", signature);

        // For fee share, add to claims, say 10 bps
        await client.database
          .from("fee_share_claims")
          .insert({
            token_mint: tokenMint,
            contributor_pubkey: userPubkey,
            bps: 10,
            claimed: false,
          });
      } catch (buyError) {
        console.error("Auto-buy failed:", buyError);
        // Don't fail the whole request
      }
    }

    return new Response(JSON.stringify({
      vibeScore: vibeScore,
      message: "Vibe submitted successfully",
      success: true
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

  try {
    const formData = await parse(await req.arrayBuffer());
    const voiceField = formData.files["voice"];
    const emoji = formData.fields.emoji;
    const tokenMint = formData.fields.token_mint;
    const sensorDataStr = formData.fields.sensor_data;
    const userPubkey = formData.fields.user_pubkey; // Assume sent from frontend after wallet connect

    if (!voiceField || !emoji || !tokenMint || !sensorDataStr || !userPubkey) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const sensorData = JSON.parse(sensorDataStr);
    const avgVolume = sensorData.avg_volume || 0; // 0-1
    const accel = sensorData.accel_magnitude || 0; // 0-1
    const energy = ((avgVolume + accel) / 2) * 100;

    // Upload voice to storage
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || "https://hy7zweqc.us-east.insforge.app";
    const serviceKey = Deno.env.get("INSFORGE_SERVICE_KEY") || "ik_604455395ddf3ab9b91c60a89ed73771";
    const client = createClient({ 
      baseUrl,
      serviceKey 
    });

    const uniqueKey = `vibes/${Date.now()}-${crypto.randomUUID()}.webm`;
    const { data: uploadData, error: uploadError } = await client.storage
      .from("vibes")
      .upload(uniqueKey, new Uint8Array(voiceField.bytes)); 

    if (uploadError || !uploadData) {
      throw new Error("Upload failed");
    }

    const voiceUrl = uploadData.url;

    // Transcribe with Groq Whisper
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const form = new FormData();
    form.append("file", new Blob(voiceField.bytes), "voice.webm");
    form.append("model", "whisper-large-v3");
    form.append("response_format", "text");

    const transcribeRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: form,
    });

    const transcriptData = await transcribeRes.json();
    const rawTranscript = transcriptData.text || "";

    if (!rawTranscript) {
      throw new Error("Transcription failed");
    }

    // Emotion analysis with Llama 3.1 on Groq
    const prompt = `Analyze the following transcript for excitement level on a scale of 0-100. Excitement based on positive language, enthusiasm, hype words. Transcript: "${rawTranscript}" Emoji sentiment: ${emoji}. Respond ONLY with a number 0-100.`;

    const analysisRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 10,
        temperature: 0.1,
      }),
    });

    const analysisData = await analysisRes.json();
    const excitementStr = analysisData.choices[0]?.message?.content?.trim() || "50";
    const excitement = parseFloat(excitementStr);

    // Emoji weight
    let emojiWeight = 50;
    const positiveEmojis = ["🔥", "🚀", "💎", "😍", "🤩"];
    const negativeEmojis = ["😢", "😞", "💔"];
    if (positiveEmojis.includes(emoji)) emojiWeight = 100;
    else if (negativeEmojis.includes(emoji)) emojiWeight = 0;

    // Calculate score
    const score = (excitement * 0.6) + (energy * 0.3) + (emojiWeight * 0.1); // Note: formula adjusted to sum to 1, but phase says + emoji weight 0-100, perhaps *0.1

    const vibeScore = Math.min(100, Math.max(0, score));

    // Insert raw
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

    if (insertError) {
      throw insertError;
    }

    // Update aggregate score
    const { data: existing } = await client.database
      .from("vibe_scores")
      .select("score, contributor_count")
      .eq("token_mint", tokenMint)
      .single();

    let newScore, newCount;
    if (existing) {
      newScore = (existing.score * existing.contributor_count + vibeScore) / (existing.contributor_count + 1);
      newCount = existing.contributor_count + 1;
    } else {
      newScore = vibeScore;
      newCount = 1;
    }

    const { error: updateError } = await client.database
      .from("vibe_scores")
      .upsert({
        token_mint: tokenMint,
        score: newScore,
        confidence: 1.0, // placeholder
        contributor_count: newCount,
      });

    if (updateError) {
      throw updateError;
    }

    // If score > 80, auto-buy and fee share
    if (newScore > 80) {
      try {
        const privateKeyBase58 = Deno.env.get("PRIVATE_KEY") || "";
        const rpcUrl = Deno.env.get("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";
        const bagsApiKey = Deno.env.get("BAGS_API_KEY") || "";

        // Import required modules
        const { Keypair, PublicKey, Connection, LAMPORTS_PER_SOL } = await import("npm:@solana/web3.js");
        const { BagsSDK, signAndSendTransaction } = await import("npm:@bagsfm/bags-sdk");

        const keypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58)); // bs58 from npm:bs58
        const { default: bs58 } = await import("npm:bs58");

        const connection = new Connection(rpcUrl);
        const sdk = new BagsSDK(bagsApiKey, connection, "processed");

        const inputMint = new PublicKey("So11111111111111111111111111111111111111112"); // WSOL
        const outputMint = new PublicKey(tokenMint);
        const amount = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL

        // Get quote
        const quote = await sdk.trade.getQuote({
          inputMint,
          outputMint,
          amount,
          slippageMode: "auto",
        });

        // Create and execute swap
        const swapResult = await sdk.trade.createSwapTransaction({
          quoteResponse: quote,
          userPublicKey: keypair.publicKey,
        });

        const commitment = sdk.state.getCommitment();
        const signature = await signAndSendTransaction(connection, commitment, swapResult.transaction, keypair);

        console.log("Auto-buy executed:", signature);

        // For fee share, add to claims, say 10 bps
        await client.database
          .from("fee_share_claims")
          .insert({
            token_mint: tokenMint,
            contributor_pubkey: userPubkey,
            bps: 10,
            claimed: false,
          });
      } catch (buyError) {
        console.error("Auto-buy failed:", buyError);
        // Don't fail the whole request
      }
    }

    return new Response(JSON.stringify({
      vibeScore: vibeScore,
      message: "Vibe submitted successfully",
      success: true
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}