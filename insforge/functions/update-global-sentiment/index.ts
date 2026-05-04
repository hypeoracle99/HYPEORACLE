// @ts-nocheck
import { createClient } from "npm:@insforge/sdk";

export default async function (req: Request): Promise<Response> {
  try {
    const client = createClient({
      baseUrl: "https://9s8ct2b5.us-east.insforge.app",
      anonKey: Deno.env.get("ANON_KEY") || ""
    });
    const groqApiKey = Deno.env.get("GROQ_API_KEY");

    // 1. Calculate weighted Global Score from vibe_scores
    const { data: scores } = await client.database
      .from("vibe_scores")
      .select("score, contributor_count");
    
    let weightedSum = 0;
    let totalContributors = 0;
    
    if (scores && scores.length > 0) {
      scores.forEach(s => {
        const count = s.contributor_count || 1;
        weightedSum += s.score * count;
        totalContributors += count;
      });
    }
    
    const globalScore = totalContributors > 0 ? Math.round(weightedSum / totalContributors) : 50;

    // 2. Sample recent vibes for Emotional Breakdown (Last 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentVibes } = await client.database
      .from("vibes_raw")
      .select("raw_transcript, emoji")
      .gt("submitted_at", oneHourAgo)
      .limit(30);

    let emotionalBreakdown = {
      "Greed": 20,
      "Fear": 20,
      "Hope": 20,
      "Confidence": 20,
      "Skepticism": 20
    };

    if (recentVibes && recentVibes.length > 0 && groqApiKey) {
      const transcriptSummary = recentVibes.map(v => `${v.emoji}: ${v.raw_transcript}`).join("\n");
      
      const systemPrompt = `
        Analyze these recent crypto vibes and output a global emotional breakdown.
        Vibes:
        ${transcriptSummary}

        Return ONLY raw JSON:
        {
          "emotional_breakdown": {
            "Greed": 10,
            "Fear": 5,
            "Hope": 40,
            "Confidence": 35,
            "Skepticism": 10
          }
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
          messages: [{ role: "user", content: systemPrompt }],
          temperature: 0.5,
          response_format: { type: "json_object" }
        })
      });

      const completion = await groqRes.json();
      if (!completion.error) {
        const aiResponse = JSON.parse(completion.choices[0].message.content);
        emotionalBreakdown = aiResponse.emotional_breakdown;
      }
    }

    // 3. Save to History
    const { error: saveError } = await client.database
      .from("global_sentiment_history")
      .insert({
        global_score: globalScore,
        emotional_breakdown: emotionalBreakdown,
        total_contributors: totalContributors
      });

    if (saveError) throw saveError;

    return new Response(JSON.stringify({ success: true, globalScore, totalContributors }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
