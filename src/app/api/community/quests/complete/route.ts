import { NextResponse } from 'next/server';
import { completeQuest } from '@/lib/community-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userPubkey, questId, proofData } = body;

    if (!userPubkey || !questId) {
      return NextResponse.json({ error: 'Missing userPubkey or questId' }, { status: 400 });
    }

    const result = await completeQuest(userPubkey, questId, proofData);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
