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

    if (!user_pubkey || amount_hype === undefined) {
      return new Response(JSON.stringify({ error: "Missing required fields", success: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient({
      baseUrl: "https://9s8ct2b5.us-east.insforge.app",
      anonKey: Deno.env.get("ANON_KEY") || ""
    });

    // 1. Record User Staking
    const { data: currentStake } = await client.database
      .from("user_staking")
      .select("staked_amount")
      .eq("user_pubkey", user_pubkey)
      .single();

    const newAmount = (currentStake?.staked_amount || 0) + Number(amount_hype);

    const { error: stakeError } = await client.database
      .from("user_staking")
      .upsert({
        user_pubkey,
        staked_amount: newAmount,
        last_calculated_at: new Date().toISOString()
      });

    if (stakeError) throw stakeError;

    // 2. Update Global Stats
    const { data: stats } = await client.database
      .from("hype_token_stats")
      .select("total_staked, stakers_count")
      .limit(1)
      .single();

    if (stats) {
       await client.database
        .from("hype_token_stats")
        .update({
          total_staked: Number(stats.total_staked) + Number(amount_hype),
          stakers_count: currentStake ? stats.stakers_count : stats.stakers_count + 1
        })
        .eq("id", stats.id);
    }

    return new Response(JSON.stringify({
      message: `Successfully staked ${amount_hype} $HYPE!`,
      current_stake: newAmount,
      success: true
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[stake-hype] fatal:", msg);
    return new Response(JSON.stringify({ error: msg, success: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
