import { NextResponse } from 'next/server';
import { triggerWorkerCycle } from '@/lib/x-manager-service';

export async function GET(request: Request) {
  // Check authorization header if CRON_SECRET is configured
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
  }

  try {
    const result = await triggerWorkerCycle();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (err: any) {
    console.error('[SocialAutopilotCron] Execution error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
