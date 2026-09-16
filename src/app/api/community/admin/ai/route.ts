import { NextResponse } from 'next/server';
import { verifyAdminRequest, logAdminAudit } from '@/lib/community-auth';
import { 
  generateGrowthInsights, 
  GrowthMetricsContext 
} from '@/lib/community-ai-agent';
import { 
  getAdminGrowthInsights, 
  saveAdminGrowthInsights,
  adminCreateQuest,
  adminCreateCampaign 
} from '@/lib/community-service';

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  let insights = await getAdminGrowthInsights();
  if (insights.length === 0) {
    // Generate initial staged insights if none present
    const defaultContext: GrowthMetricsContext = {
      totalMembers: 428,
      activeQuestsCount: 8,
      avgCompletionRate: 68,
      globalSentimentScore: 82,
      sentimentTrend: 'surging',
      activeCampaigns: ['Genesis Campaign', 'DePIN Sensor Blitz'],
      recentDePinNodesCount: 124
    };
    insights = await generateGrowthInsights(defaultContext);
    await saveAdminGrowthInsights(insights);
  }

  return NextResponse.json({ insights });
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const context: GrowthMetricsContext = {
      totalMembers: body.totalMembers || 428,
      activeQuestsCount: body.activeQuestsCount || 8,
      avgCompletionRate: body.avgCompletionRate || 68,
      globalSentimentScore: body.globalSentimentScore || 82,
      sentimentTrend: body.sentimentTrend || 'surging',
      activeCampaigns: body.activeCampaigns || ['Genesis Campaign'],
      recentDePinNodesCount: body.recentDePinNodesCount || 124
    };

    const newInsights = await generateGrowthInsights(context);
    await saveAdminGrowthInsights(newInsights);

    await logAdminAudit(
      auth.adminIdentity!,
      auth.authMethod!,
      'generate_ai_growth_insights',
      'community_ai_insights',
      undefined,
      { count: newInsights.length }
    );

    return NextResponse.json({ success: true, insights: newInsights });
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
    const { insightId, action } = body; // action: 'apply' | 'dismiss'
    const insights = await getAdminGrowthInsights();
    const target = insights.find((i) => i.id === insightId);

    if (!target) return NextResponse.json({ error: 'Insight not found' }, { status: 404 });

    if (action === 'apply') {
      target.status = 'applied';
      target.resolvedAt = new Date().toISOString();

      // If suggested action was create_quest, execute it in the quest system
      if (target.suggestedAction.actionType === 'create_quest' && target.suggestedAction.payload) {
        await adminCreateQuest(target.suggestedAction.payload);
      } else if (target.suggestedAction.actionType === 'launch_campaign' && target.suggestedAction.payload) {
        await adminCreateCampaign(target.suggestedAction.payload);
      }

      await logAdminAudit(
        auth.adminIdentity!,
        auth.authMethod!,
        'apply_ai_insight',
        'community_ai_insights',
        insightId,
        { actionType: target.suggestedAction.actionType }
      );
    } else {
      target.status = 'dismissed';
      target.resolvedAt = new Date().toISOString();
    }

    return NextResponse.json({ success: true, insight: target });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
