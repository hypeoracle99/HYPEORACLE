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
      You are an expert psychological trader profiler. Analyze the user's audio transcript history and emojis. 
      Create a concise, fun, and highly personalized crypto trading personality profile ("Vibe Agent").
      
      User's Vibe History:
      ${transcriptText}

      Return ONLY raw JSON in this exact format, with no markdown wrappers or extra text:
      {
        "agent_name": "suggested fun name (e.g., 'Chad The Bull' or 'Conservative Carl')",
        "personality_summary": "1-2 sentences summarizing their emotions and crypto mindset",
        "risk_tolerance": 65,  // an integer from 0 (lowest risk) to 100 (complete degen)
        "trading_style": "momentum chaser", // a very short phrase
        "key_insights": ["insight 1", "insight 2", "insight 3"] // exactly 3 key behavioral insights
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
        model: "llama-3.3-70b-versatile", // Latest production model for analysis
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
        trading_style: profile.trading_style || "Neutral",
        favorite_tokens: profile.key_insights || [], // Using this field to store insights for now
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
