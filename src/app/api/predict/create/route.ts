import { NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';
import { INSFORGE_CONFIG } from '@/lib/constants';

const client = createClient(INSFORGE_CONFIG);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const tokenMint = searchParams.get('tokenMint');

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
    const { tokenMint, question, targetScore, resolutionDate } = body;

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
