import { NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';
import { INSFORGE_CONFIG } from '@/lib/constants';

const client = createClient(INSFORGE_CONFIG);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userPubkey = searchParams.get('userPubkey');

    if (!userPubkey) {
      return NextResponse.json({ error: 'Missing userPubkey parameter' }, { status: 400 });
    }

    // Fetch bets enriched with market details
    const { data: bets, error } = await client.database
      .from('vibe_prediction_bets')
      .select(`
        *,
        market:market_id (*)
      `)
      .eq('user_pubkey', userPubkey)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Fetch user $HYPE staking details for staker vibe multiplier display
    let stakedAmount = 0;
    try {
      const { data: stakingInfo } = await client.database
        .from('user_staking')
        .select('staked_amount')
        .eq('user_pubkey', userPubkey)
        .single();

      if (stakingInfo && stakingInfo.staked_amount) {
        stakedAmount = parseFloat(stakingInfo.staked_amount);
      }
    } catch (_) {
      // safe fallback
    }

    return NextResponse.json({ data: bets, stakedAmount });
  } catch (error: any) {
    console.error('[API/Predict/Bet] GET Error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to fetch user bets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { marketId, userPubkey, prediction, amount } = body;

    if (!marketId || !userPubkey || !prediction || !amount) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (prediction !== 'yes' && prediction !== 'no') {
      return NextResponse.json({ error: 'Invalid prediction choice. Must be yes or no.' }, { status: 400 });
    }

    const betAmount = parseFloat(amount);
    if (isNaN(betAmount) || betAmount <= 0) {
      return NextResponse.json({ error: 'Invalid bet amount' }, { status: 400 });
    }

    // 1. Fetch current market to get existing pool sizes
    const { data: market, error: fetchError } = await client.database
      .from('vibe_prediction_markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (fetchError || !market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    if (market.status !== 'active') {
      return NextResponse.json({ error: 'Betting is closed for this market' }, { status: 400 });
    }

    // 2. Insert user bet record
    const { data: bet, error: insertError } = await client.database
      .from('vibe_prediction_bets')
      .insert({
        market_id: marketId,
        user_pubkey: userPubkey,
        prediction: prediction,
        amount: betAmount,
        claimed: false
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 3. Increment the corresponding pool size in the market table
    const currentYes = parseFloat(market.total_yes_pool || '0');
    const currentNo = parseFloat(market.total_no_pool || '0');

    const updatePayload = prediction === 'yes'
      ? { total_yes_pool: currentYes + betAmount }
      : { total_no_pool: currentNo + betAmount };

    const { error: updateError } = await client.database
      .from('vibe_prediction_markets')
      .update(updatePayload)
      .eq('id', marketId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ data: bet, success: true });
  } catch (error: any) {
    console.error('[API/Predict/Bet] POST Error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to place bet' }, { status: 500 });
  }
}
