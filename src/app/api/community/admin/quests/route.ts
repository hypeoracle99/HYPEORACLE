import { NextResponse } from 'next/server';
import { verifyAdminRequest, logAdminAudit } from '@/lib/community-auth';
import { 
  getQuests, 
  adminCreateQuest, 
  adminUpdateQuest, 
  adminDeleteQuest 
} from '@/lib/community-service';

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  const quests = await getQuests();
  return NextResponse.json({ quests });
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const created = await adminCreateQuest(body);

    await logAdminAudit(
      auth.adminIdentity!,
      auth.authMethod!,
      'create_quest',
      'community_quests',
      created.id,
      { title: created.title, xp: created.xpReward }
    );

    return NextResponse.json({ success: true, quest: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'Quest ID is required' }, { status: 400 });

    const updated = await adminUpdateQuest(id, updates);

    await logAdminAudit(
      auth.adminIdentity!,
      auth.authMethod!,
      'update_quest',
      'community_quests',
      id,
      updates
    );

    return NextResponse.json({ success: true, quest: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Quest ID is required' }, { status: 400 });

    const success = await adminDeleteQuest(id);

    await logAdminAudit(
      auth.adminIdentity!,
      auth.authMethod!,
      'delete_quest',
      'community_quests',
      id
    );

    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
