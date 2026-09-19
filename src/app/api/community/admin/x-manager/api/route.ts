import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/community-auth';
import { 
  getXAccount,
  getXDrafts,
  getXScheduledPosts,
  getXPublishedPosts,
  getXMentions,
  getXRecommendations,
  getXAutomationSettings,
  updateXAutomationSettings,
  getXAuditLogs,
  generateXContent,
  rewriteDraftContent,
  approveAndPublishDraft,
  approveAndScheduleDraft,
  rejectDraft,
  publishReplyToMention,
  triggerWorkerCycle
} from '@/lib/x-manager-service';
import { testXConnection } from '@/lib/x-api-client';

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get('resource') || 'all';

  try {
    if (resource === 'account') {
      const account = await getXAccount();
      return NextResponse.json({ account });
    }

    if (resource === 'connection_test') {
      const result = await testXConnection();
      return NextResponse.json(result);
    }

    // Default full load
    const [account, drafts, scheduled, posts, mentions, recommendations, settings, auditLogs] = await Promise.all([
      getXAccount(),
      getXDrafts(),
      getXScheduledPosts(),
      getXPublishedPosts(),
      getXMentions(),
      getXRecommendations(),
      getXAutomationSettings(),
      getXAuditLogs()
    ]);

    return NextResponse.json({
      account,
      drafts,
      scheduled,
      posts,
      mentions,
      recommendations,
      settings,
      auditLogs
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    // 1. Generate Content
    if (action === 'generate_content') {
      const { contentType = 'single_tweet', tone = 'hype', customPrompt } = body;
      const draft = await generateXContent(contentType, tone, customPrompt);
      return NextResponse.json({ success: true, draft });
    }

    // 2. Rewrite Tools
    if (action === 'rewrite_text') {
      const { text, mode } = body;
      const rewritten = await rewriteDraftContent(text, mode);
      return NextResponse.json({ success: true, text: rewritten });
    }

    // 3. Approve and Publish Now
    if (action === 'approve_and_publish') {
      const { draftId } = body;
      const result = await approveAndPublishDraft(draftId, auth.adminIdentity!);
      return NextResponse.json(result);
    }

    // 4. Approve and Schedule
    if (action === 'approve_and_schedule') {
      const { draftId, scheduledFor } = body;
      const scheduledPost = await approveAndScheduleDraft(draftId, scheduledFor, auth.adminIdentity!);
      return NextResponse.json({ success: true, scheduledPost });
    }

    // 5. Reject Draft
    if (action === 'reject_draft') {
      const { draftId, reason = 'Not aligned with brand voice' } = body;
      const rejected = await rejectDraft(draftId, reason, auth.adminIdentity!);
      return NextResponse.json({ success: true, draft: rejected });
    }

    // 6. Reply to Mention
    if (action === 'reply_to_mention') {
      const { mentionId, replyText } = body;
      const result = await publishReplyToMention(mentionId, replyText, auth.adminIdentity!);
      return NextResponse.json(result);
    }

    // 7. Update Settings
    if (action === 'update_settings') {
      const { settings } = body;
      const updated = await updateXAutomationSettings(settings);
      return NextResponse.json({ success: true, settings: updated });
    }

    // 8. Trigger Worker Cycle Manually
    if (action === 'trigger_worker') {
      const result = await triggerWorkerCycle();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
