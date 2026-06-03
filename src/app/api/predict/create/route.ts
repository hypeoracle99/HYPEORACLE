import { NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';
import { INSFORGE_CONFIG } from '@/lib/constants';

const client = createClient(INSFORGE_CONFIG);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const tokenMint = searchParams.get('tokenMint');

    // 1. Fetch active markets count to determine if we need auto-seeding
    const { data: activeMarkets, error: countError } = await client.database
      .from('vibe_prediction_markets')
      .select('*')
      .eq('status', 'active');

    if (countError) throw countError;

    if (!activeMarkets || activeMarkets.length < 6) {
      const defaults = [
        {
          token_mint: "5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS", // HYPE Mint
          question: "Will the average sentiment rating for $HYPE hold above 75 this week?",
          target_score: 75,
          offset_days: 7
        },
        {
          token_mint: "Bags222222222222222222222222222222222222222", // SOL
          question: "Will $SOL acceleration indexes cross 80 during next party vibe cycle?",
          target_score: 80,
          offset_days: 1
        },
        {
          token_mint: "DePIN11111111111111111111111111111111111111", // BONK
          question: "Will $BONK volume aggregates hold above 65 over the next 3 days?",
          target_score: 65,
          offset_days: 3
        },
        {
          token_mint: "Wif444444444444444444444444444444444444444", // WIF
          question: "Will $WIF score Euphoria indexes (>85) in the next 24 hours?",
          target_score: 85,
          offset_days: 1
        },
        {
          token_mint: "5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS", // HYPE Mint
          question: "Will the collective HypeOracle ecosystem index hold above 70 today?",
          target_score: 70,
          offset_days: 1
        },
        {
          token_mint: "Bags222222222222222222222222222222222222222", // SOL
          question: "Will the dynamic staker fee share volume exceed 0.5 SOL this week?",
          target_score: 75,
          offset_days: 7
        }
      ];

      const existingQuestions = new Set((activeMarkets || []).map(m => m.question));

      for (const item of defaults) {
        if (!existingQuestions.has(item.question)) {
          const resDate = new Date(Date.now() + item.offset_days * 24 * 60 * 60 * 1000).toISOString();
          await client.database
            .from('vibe_prediction_markets')
            .insert({
              token_mint: item.token_mint,
              question: item.question,
              target_score: item.target_score,
              resolution_date: resDate,
              status: 'active',
              total_yes_pool: parseFloat((0.1 + Math.random() * 0.4).toFixed(2)),
              total_no_pool: parseFloat((0.1 + Math.random() * 0.4).toFixed(2))
            });
        }
      }
    }

    // 2. Fetch the queried list
    let query = client.database.from('vibe_prediction_markets').select('*');

    if (status) {
      query = query.eq('status', status);
    }
    if (tokenMint) {
      query = query.eq('token_mint', tokenMint);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('[API/Predict/Create] GET Error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to fetch prediction markets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tokenMint, question, targetScore, resolutionDate, adminPubkey } = body;

    if (adminPubkey !== 'BBz7heBU32GENqiBqEVVCfFoc8QcJJduezjpN6oesKaP') {
      return NextResponse.json({ error: 'Unauthorized: Admin wallet validation failed' }, { status: 403 });
    }

    if (!tokenMint || !question || targetScore === undefined || !resolutionDate) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const { data, error } = await client.database
      .from('vibe_prediction_markets')
      .insert({
        token_mint: tokenMint,
        question: question,
        target_score: parseFloat(targetScore),
        resolution_date: resolutionDate,
        status: 'active',
        total_yes_pool: 0,
        total_no_pool: 0
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('[API/Predict/Create] POST Error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to create prediction market' }, { status: 500 });
  }
}
