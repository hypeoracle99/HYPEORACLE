import { NextResponse } from 'next/server';
import { processReferral } from '@/lib/community-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inviterCode, userPubkey } = body;

    if (!inviterCode || !userPubkey) {
      return NextResponse.json({ error: 'Missing inviterCode or userPubkey' }, { status: 400 });
    }

    const result = await processReferral(inviterCode, userPubkey);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
