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
    const groqApiKey = Deno.env.get("GROQ_API_KEY");

    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY is not configured in backend secrets");
    }

    // 1. Fetch user's vibe history (up to 50 recent)
    const { data: vibeHistory, error: vibeError } = await client.database
      .from("vibes_raw")
      .select("raw_transcript, emoji")
      .eq("user_pubkey", user_pubkey)
      .limit(50);

    if (vibeError) throw vibeError;

    const totalVibes = vibeHistory ? vibeHistory.length : 0;

    if (totalVibes === 0) {
      return new Response(JSON.stringify({
        error: "Not enough vibe history to train an agent. Go to the dashboard and submit some vibes first!",
        success: false
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Build the context prompt
    const transcriptText = vibeHistory.map(v => `Vibe: "${v.raw_transcript}" (Emoji: ${v.emoji})`).join("\n");
    
    const systemPrompt = `
      You are an expert psychological trader profiler. Analyze the user's audio transcript history and emojis to create an "Emotional Soulprint".
      This is a deep analysis of their on-chain identity.
      
      User's Vibe History:
      ${transcriptText}

      Return ONLY raw JSON in this exact format:
      {
        "agent_name": "suggested fun name",
        "personality_summary": "1-2 sentences summarizing their mindset",
        "risk_tolerance": 65,  // 0-100
        "panic_index": 30, // 0-100, how likely they are to panic sell or react negatively to dips
        "fomo_index": 45, // 0-100, how likely they are to chase green candles
        "conviction_index": 80, // 0-100, how consistent their vibes are relative to price action (if detectable) or tone
        "emotional_spectrum": {
          "Greed": 10,
          "Fear": 5,
          "Hope": 40,
          "Confidence": 35,
          "Skepticism": 10
        }, // Must sum to 100
        "trading_style": "momentum chaser",
        "key_insights": ["insight 1", "insight 2", "insight 3"]
      }
    `;

    // 3. Request Groq AI processing
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: systemPrompt }],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    const completion = await groqRes.json();
    
    if (completion.error) {
      throw new Error(`Groq API Error: ${completion.error.message}`);
    }

    const aiResponse = completion.choices[0].message.content;
    const profile = JSON.parse(aiResponse);

    // 4. Save to Database
    const now = new Date().toISOString();
    
    const { data: savedProfile, error: saveError } = await client.database
      .from("user_vibe_profiles")
      .upsert({
        user_pubkey,
        agent_name: profile.agent_name || "My Vibe Agent",
        personality_summary: profile.personality_summary,
        risk_tolerance: profile.risk_tolerance || 50,
        panic_index: profile.panic_index || 0,
        fomo_index: profile.fomo_index || 0,
        conviction_index: profile.conviction_index || 0,
        emotional_spectrum: profile.emotional_spectrum || {},
        trading_style: profile.trading_style || "Neutral",
        favorite_tokens: profile.key_insights || [],
        total_vibes: totalVibes,
        last_trained_at: now
      }, { onConflict: "user_pubkey" })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify({
      data: {
        ...savedProfile,
        key_insights: profile.key_insights
      },
      message: "Agent training complete!",
      success: true
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[train-personal-agent] fatal:", msg);
    return new Response(JSON.stringify({ error: msg, success: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
