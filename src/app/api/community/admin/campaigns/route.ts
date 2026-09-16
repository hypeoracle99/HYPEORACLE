import { NextResponse } from 'next/server';
import { verifyAdminRequest, logAdminAudit } from '@/lib/community-auth';
import { getCampaigns, adminCreateCampaign } from '@/lib/community-service';

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  const campaigns = await getCampaigns();
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const created = await adminCreateCampaign(body);

    await logAdminAudit(
      auth.adminIdentity!,
      auth.authMethod!,
      'create_campaign',
      'community_campaigns',
      created.id,
      { title: created.title, slug: created.slug }
    );

    return NextResponse.json({ success: true, campaign: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
