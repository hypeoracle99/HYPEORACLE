import { NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk';
import { INSFORGE_CONFIG } from '@/lib/constants';

const client = createClient(INSFORGE_CONFIG);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, body: content, userPubkey, url } = body;

    if (!title || !content || !userPubkey) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Optionally, record that a push alert was dispatched to this user in a mock table or logs
    console.log(`[PWA Push Alert Dispatch] To: ${userPubkey} | Title: "${title}" | Body: "${content}"`);

    // Fetch user profile to customize simulated alerts if needed
    let agentName = 'Personal Vibe Agent';
    try {
      const { data: profile } = await client.database
        .from('user_vibe_profiles')
        .select('agent_name')
        .eq('user_pubkey', userPubkey)
        .single();
      if (profile && profile.agent_name) {
        agentName = profile.agent_name;
      }
    } catch (_) {
      // safe fallback
    }

    return NextResponse.json({
      success: true,
      message: `Push alert successfully dispatched from ${agentName}`,
      payload: {
        title,
        body: content,
        url: url || '/sandbox',
        icon: '/logo.png',
        badge: '/favicon.ico',
        tag: 'hypeoracle-alert'
      }
    });
  } catch (error: any) {
    console.error('[API/Automation/Push] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Push dispatch failed' }, { status: 500 });
  }
}
