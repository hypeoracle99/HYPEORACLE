import { NextResponse } from 'next/server';
import { 
  getQuests, 
  getCampaigns, 
  getParticipantProfile, 
  getUserCompletions,
  getLeaderboard 
} from '@/lib/community-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pubkey = searchParams.get('pubkey');
    const campaignId = searchParams.get('campaignId') || undefined;

    const [quests, campaigns, leaderboard] = await Promise.all([
      getQuests(campaignId),
      getCampaigns(),
      getLeaderboard('xp', 10)
    ]);

    let userProfile = null;
    let completions: any[] = [];

    if (pubkey) {
      [userProfile, completions] = await Promise.all([
        getParticipantProfile(pubkey),
        getUserCompletions(pubkey)
      ]);
    }

    return NextResponse.json({
      quests,
      campaigns,
      leaderboard,
      userProfile,
      completions
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
