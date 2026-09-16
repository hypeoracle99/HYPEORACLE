import { NextResponse } from 'next/server';
import { verifyAdminRequest, logAdminAudit } from '@/lib/community-auth';
import { 
  generateSocialDraft, 
  sanitizeSocialContent 
} from '@/lib/community-ai-agent';
import { 
  getAdminSocialDrafts, 
  adminApproveSocialDraft, 
  adminRejectSocialDraft, 
  adminUpdateSocialDraft 
} from '@/lib/community-service';

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  const drafts = await getAdminSocialDrafts();
  return NextResponse.json({ drafts });
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { contentType = 'x_post', topic = 'HypeOracle Protocol Growth', tone = 'energetic' } = body;

    const draft = await generateSocialDraft(contentType, topic, tone);
    const drafts = await getAdminSocialDrafts();
    drafts.unshift(draft);

    await logAdminAudit(
      auth.adminIdentity!,
      auth.authMethod!,
      'generate_social_draft',
      'community_social_drafts',
      draft.id,
      { contentType, topic, tone }
    );

    return NextResponse.json({ success: true, draft });
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
    const { draftId, action, primaryText, threadItems } = body;

    if (!draftId || !action) {
      return NextResponse.json({ error: 'Missing draftId or action' }, { status: 400 });
    }

    if (action === 'edit' && primaryText) {
      const safety = sanitizeSocialContent(primaryText);
      if (!safety.isSafe) {
        return NextResponse.json({ error: safety.warning }, { status: 400 });
      }
      const updated = await adminUpdateSocialDraft(draftId, primaryText, threadItems);
      return NextResponse.json({ success: true, draft: updated });
    }

    if (action === 'approve') {
      const approved = await adminApproveSocialDraft(draftId, auth.adminIdentity!);
      await logAdminAudit(
        auth.adminIdentity!,
        auth.authMethod!,
        'approve_social_draft',
        'community_social_drafts',
        draftId
      );
      return NextResponse.json({ success: true, draft: approved });
    }

    if (action === 'reject') {
      const rejected = await adminRejectSocialDraft(draftId, auth.adminIdentity!);
      await logAdminAudit(
        auth.adminIdentity!,
        auth.authMethod!,
        'reject_social_draft',
        'community_social_drafts',
        draftId
      );
      return NextResponse.json({ success: true, draft: rejected });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
