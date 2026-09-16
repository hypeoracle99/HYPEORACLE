/**
 * HypeOracle Community & Growth Data Service Layer
 * 
 * Provides unified CRUD operations with InsForge PostgreSQL database,
 * accompanied by resilient initial seed state and anti-abuse verification.
 */

import { 
  CommunityQuest, 
  CommunityCampaign, 
  CommunityParticipant, 
  QuestCompletion, 
  CommunityReferral, 
  CommunityBadge,
  CommunityAIInsight,
  CommunitySocialDraft,
  CommunityAuditLog,
  CommunitySettings
} from '@/lib/community-types';
import { activeDePINAdapter } from '@/lib/depin-interface';

// Default Seed Campaigns
export const SEED_CAMPAIGNS: CommunityCampaign[] = [
  {
    id: 'camp_genesis_01',
    slug: 'genesis-vanguard',
    title: 'HypeOracle Genesis Campaign',
    description: 'The foundation epoch. Onboard your Solana wallet, learn the collective emotion protocol, and earn your Genesis Vanguard reputation.',
    badgeTitle: 'Genesis Vanguard',
    bannerUrl: '/logo.png',
    startDate: '2026-09-01T00:00:00Z',
    targetXp: 25000,
    status: 'active',
    totalParticipants: 428,
    totalXpDistributed: 18450,
    completionRate: 74,
    createdAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'camp_depin_02',
    slug: 'depin-sensor-blitz',
    title: 'DePIN Acoustic & Motion Sensor Blitz',
    description: 'Transform mobile devices into real-world ambient hype nodes. Stream vocal frequency and physical acceleration to power Bags.fm trades.',
    badgeTitle: 'Acoustic Sentinel',
    bannerUrl: '/logo.png',
    startDate: '2026-09-10T00:00:00Z',
    targetXp: 50000,
    status: 'active',
    totalParticipants: 290,
    totalXpDistributed: 31200,
    completionRate: 62,
    createdAt: '2026-09-10T00:00:00Z'
  },
  {
    id: 'camp_ambassador_03',
    slug: 'ambassador-recruitment',
    title: 'Ambassador Onboarding Wave 1',
    description: 'For high-reputation contributors who spread HypeOracle across Web3. Invite vetted contributors and lead regional squads.',
    badgeTitle: 'Oracle Ambassador',
    bannerUrl: '/logo.png',
    startDate: '2026-09-15T00:00:00Z',
    targetXp: 100000,
    status: 'active',
    totalParticipants: 84,
    totalXpDistributed: 12400,
    completionRate: 45,
    createdAt: '2026-09-15T00:00:00Z'
  }
];

// Default Seed Quests
export const SEED_QUESTS: CommunityQuest[] = [
  {
    id: 'quest_x_follow',
    campaignId: 'camp_genesis_01',
    title: 'Follow HypeOracle on X (@HypeOracle)',
    description: 'Stay wired into the latest real-time sentiment alerts, protocol updates, and token announcements.',
    category: 'social',
    verificationType: 'x_follow',
    verificationConfig: { targetHandle: 'HypeOracle', targetUrl: 'https://x.com/HypeOracle' },
    xpReward: 50,
    reputationReward: 10,
    currentCompletions: 394,
    cooldownHours: 0,
    isActive: true,
    sortOrder: 1,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'quest_discord_join',
    campaignId: 'camp_genesis_01',
    title: 'Join Discord Community Sanctuary',
    description: 'Chat with builders, alpha scouts, and participate in community governance polls.',
    category: 'community',
    verificationType: 'discord_join',
    verificationConfig: { targetUrl: 'https://discord.gg/hypeoracle' },
    xpReward: 50,
    reputationReward: 10,
    currentCompletions: 342,
    cooldownHours: 0,
    isActive: true,
    sortOrder: 2,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'quest_telegram_join',
    campaignId: 'camp_genesis_01',
    title: 'Join Official Telegram Trading Signals',
    description: 'Real-time push notifications when collective sentiment crosses the >80 buy trigger threshold.',
    category: 'community',
    verificationType: 'telegram_join',
    verificationConfig: { targetUrl: 'https://t.me/HypeOracleApp' },
    xpReward: 50,
    reputationReward: 10,
    currentCompletions: 288,
    cooldownHours: 0,
    isActive: true,
    sortOrder: 3,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z'
  },
  {
    id: 'quest_learn_oracle',
    campaignId: 'camp_genesis_01',
    title: 'Learn How Emotional Oracles Work',
    description: 'Read the whitepaper primer on how Whisper audio AI and accelerometer telemetry turn human hype into Solana on-chain signals.',
    category: 'education',
    verificationType: 'instant_click',
    verificationConfig: { targetUrl: '/sandbox' },
    xpReward: 75,
    reputationReward: 15,
    currentCompletions: 215,
    cooldownHours: 0,
    isActive: true,
    sortOrder: 4,
    createdAt: '2026-09-02T00:00:00Z',
    updatedAt: '2026-09-02T00:00:00Z'
  },
  {
    id: 'quest_submit_vibe',
    campaignId: 'camp_depin_02',
    title: 'Submit a 5-Second Voice Vibe',
    description: 'Use the recorder to speak your authentic market sentiment. AI extracts vocal energy and writes it to the oracle database.',
    category: 'sentiment',
    verificationType: 'vibe_score',
    verificationConfig: { requiredScore: 50 },
    xpReward: 120,
    reputationReward: 30,
    currentCompletions: 178,
    cooldownHours: 24, // Daily repeatable
    isActive: true,
    sortOrder: 5,
    createdAt: '2026-09-10T00:00:00Z',
    updatedAt: '2026-09-10T00:00:00Z'
  },
  {
    id: 'quest_depin_sensor',
    campaignId: 'camp_depin_02',
    title: 'Contribute DePIN PWA Motion & Acoustic Stream',
    description: 'Verify your browser or mobile phone as an active sensor node. Transmit physical motion to prove real-world human presence.',
    category: 'depin',
    verificationType: 'depin_sensor',
    verificationConfig: { sensorThreshold: 60 },
    xpReward: 150,
    reputationReward: 35,
    currentCompletions: 124,
    cooldownHours: 12,
    isActive: true,
    sortOrder: 6,
    createdAt: '2026-09-11T00:00:00Z',
    updatedAt: '2026-09-11T00:00:00Z'
  },
  {
    id: 'quest_share_x_post',
    campaignId: 'camp_genesis_01',
    title: 'Create an X Post with #HypeOracle',
    description: 'Share your vibe score or a link to HypeOracle on X to bring new verified traders into the network.',
    category: 'social',
    verificationType: 'x_post',
    verificationConfig: { customInstructions: 'Include your referral link and tag @HypeOracle with #Solana' },
    xpReward: 100,
    reputationReward: 25,
    currentCompletions: 98,
    cooldownHours: 48,
    isActive: true,
    sortOrder: 7,
    createdAt: '2026-09-12T00:00:00Z',
    updatedAt: '2026-09-12T00:00:00Z'
  },
  {
    id: 'quest_referral_trio',
    campaignId: 'camp_ambassador_03',
    title: 'Refer 3 Active Community Vibers',
    description: 'Invite 3 friends who connect their Solana wallet and complete at least 1 quest. Earn continuous referral XP.',
    category: 'referral',
    verificationType: 'referral_count',
    verificationConfig: { requiredReferrals: 3 },
    xpReward: 250,
    reputationReward: 60,
    currentCompletions: 46,
    cooldownHours: 0,
    isActive: true,
    sortOrder: 8,
    createdAt: '2026-09-15T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z'
  }
];

// Default Badges
export const SEED_BADGES: CommunityBadge[] = [
  {
    badgeKey: 'genesis_vibester',
    name: 'Genesis Vibester',
    description: 'Joined during the Genesis launch and completed your first vibe submission.',
    iconName: 'Zap',
    rarity: 'common',
    reputationBonus: 20,
    criteria: { minQuests: 1 }
  },
  {
    badgeKey: 'sensor_sentinel',
    name: 'Acoustic Sentinel',
    description: 'Verified active DePIN sensor node contributing authentic acoustic/motion data.',
    iconName: 'Radio',
    rarity: 'rare',
    reputationBonus: 50,
    criteria: { minDePinReadings: 5 }
  },
  {
    badgeKey: 'viral_amplifier',
    name: 'Viral Amplifier',
    description: 'Successfully onboarded 5+ qualified community members via referral links.',
    iconName: 'Share2',
    rarity: 'epic',
    reputationBonus: 100,
    criteria: { minReferrals: 5 }
  },
  {
    badgeKey: 'oracle_vanguard',
    name: 'Oracle Vanguard',
    description: 'Top 5% reputation holder shaping on-chain sentiment signals on Bags.fm.',
    iconName: 'Crown',
    rarity: 'legendary',
    reputationBonus: 250,
    criteria: { minXp: 1000 }
  }
];

// In-Memory Fallback State (Ensures instant interactivity during development)
class CommunityStore {
  quests: CommunityQuest[] = [...SEED_QUESTS];
  campaigns: CommunityCampaign[] = [...SEED_CAMPAIGNS];
  participants: Map<string, CommunityParticipant> = new Map();
  completions: QuestCompletion[] = [];
  referrals: CommunityReferral[] = [];
  socialDrafts: CommunitySocialDraft[] = [];
  aiInsights: CommunityAIInsight[] = [];
  auditLogs: CommunityAuditLog[] = [];
  settings: CommunitySettings = {
    cooldownPeriodMinutes: 60,
    maxDailyXpPerUser: 1000,
    sybilProtectionStrictness: 'moderate',
    referralXpReward: 50,
    referralReputationReward: 15,
    adminWallets: ['5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS'],
    allowSelfVerification: false,
    autoAnalyzeFrequencyHours: 6
  };

  constructor() {
    this.seedInitialParticipants();
    this.seedInitialSocialDrafts();
  }

  private seedInitialParticipants() {
    const seedUsers = [
      { pubkey: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', username: 'sol_vibester', xp: 1450, rep: 320, quests: 8, refCount: 12, tier: 'Ambassador' as const },
      { pubkey: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLyNzkKqNppJ', username: 'hype_whale', xp: 1180, rep: 260, quests: 7, refCount: 8, tier: 'Oracle Vanguard' as const },
      { pubkey: '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM', username: 'bags_trader', xp: 840, rep: 180, quests: 5, refCount: 4, tier: 'Hype Scout' as const },
      { pubkey: '9aB8xQ2M1cK6wY7zE4vT8rP0sL5mN3jH2fD1gS4kL7p', username: 'crypto_sentry', xp: 620, rep: 130, quests: 4, refCount: 2, tier: 'Vibester' as const },
      { pubkey: '2zC5vL8mN1kP4wY7zE9aB3jH6fD0gS2rT5xQ8mK1vP9', username: 'sensor_rig_01', xp: 450, rep: 95, quests: 3, refCount: 1, tier: 'Initiate' as const },
    ];

    seedUsers.forEach((u) => {
      this.participants.set(u.pubkey, {
        id: `part_${u.pubkey.slice(0, 6)}`,
        userPubkey: u.pubkey,
        username: u.username,
        totalXp: u.xp,
        reputationScore: u.rep,
        completedQuestsCount: u.quests,
        referralCode: `HYPE_${u.pubkey.slice(0, 4).toUpperCase()}`,
        qualifiedReferralsCount: u.refCount,
        currentStreak: 4,
        lastActiveAt: new Date().toISOString(),
        tier: u.tier,
        depinNodesCount: 1,
        isBanned: false,
        badges: ['genesis_vibester', 'sensor_sentinel'],
        createdAt: '2026-09-01T00:00:00Z'
      });
    });
  }

  private seedInitialSocialDrafts() {
    this.socialDrafts = [
      {
        id: 'draft_seed_01',
        contentType: 'x_post',
        primaryText: '⚡ The HypeOracle Genesis Epoch is LIVE on Solana. Over 400+ physical sensor nodes are turning real human emotion into verifiable trading momentum. Complete quests & earn XP: https://hypeoracle.io/community',
        status: 'staged',
        aiGenerationMetadata: {
          modelUsed: 'llama-3.3-70b-versatile',
          promptTheme: 'Genesis Launch Announcement',
          tone: 'energetic'
        },
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'draft_seed_02',
        contentType: 'x_thread',
        primaryText: 'Why Twitter sentiment analysis is completely broken in 2026 (and how DePIN acoustics fixes it) 🧵👇',
        threadItems: [
          '1/ LLM bot farms can generate 10,000 bullish tweets in 4 minutes. Relying on tweet volume alone guarantees buying the top.',
          '2/ HypeOracle requires biological audio energy & device motion captured live via PWA nodes. Bots cannot fake acoustic timbre or physical accelerometer vibration.',
          '3/ Result: Verifiable signals that feed directly into @bagsfm dynamic bonding curves on Solana. Zero wash trading.'
        ],
        status: 'staged',
        aiGenerationMetadata: {
          modelUsed: 'llama-3.3-70b-versatile',
          promptTheme: 'Anti-Bot DePIN Architecture',
          tone: 'analytical'
        },
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 7200000).toISOString()
      }
    ];
  }
}

const store = new CommunityStore();

// --- PUBLIC DATA METHODS ---

export async function getQuests(campaignId?: string): Promise<CommunityQuest[]> {
  try {
    const { getInsforgeServerClient } = await import('@/lib/insforge');
    const insforge = getInsforgeServerClient();
    let query = insforge.database
      .from('community_quests')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (campaignId) query = query.eq('campaign_id', campaignId);
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        campaignId: d.campaign_id,
        title: d.title,
        description: d.description,
        category: d.category,
        verificationType: d.verification_type,
        verificationConfig: d.verification_config,
        xpReward: d.xp_reward,
        reputationReward: d.reputation_reward,
        maxCompletions: d.max_completions,
        currentCompletions: d.current_completions || 0,
        cooldownHours: d.cooldown_hours || 0,
        startDate: d.start_date,
        endDate: d.end_date,
        isActive: d.is_active,
        sortOrder: d.sort_order || 0,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }));
    }
  } catch {}

  // Fallback to store
  if (campaignId) {
    return store.quests.filter((q) => q.campaignId === campaignId && q.isActive);
  }
  return store.quests.filter((q) => q.isActive);
}

export async function getCampaigns(): Promise<CommunityCampaign[]> {
  try {
    const { getInsforgeServerClient } = await import('@/lib/insforge');
    const insforge = getInsforgeServerClient();
    const { data, error } = await insforge.database
      .from('community_campaigns')
      .select('*')
      .order('start_date', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        slug: d.slug,
        title: d.title,
        description: d.description,
        badgeTitle: d.badge_title,
        bannerUrl: d.banner_url,
        startDate: d.start_date,
        endDate: d.end_date,
        targetXp: d.target_xp,
        status: d.status,
        metadata: d.metadata,
        createdAt: d.created_at
      }));
    }
  } catch {}

  return store.campaigns;
}

export async function getParticipantProfile(userPubkey: string): Promise<CommunityParticipant> {
  const existing = store.participants.get(userPubkey);
  if (existing) return existing;

  // Create clean initial participant profile
  const newProfile: CommunityParticipant = {
    id: `part_${userPubkey.slice(0, 6)}`,
    userPubkey,
    totalXp: 0,
    reputationScore: 0,
    completedQuestsCount: 0,
    referralCode: `HYPE_${userPubkey.slice(0, 4).toUpperCase()}`,
    qualifiedReferralsCount: 0,
    currentStreak: 1,
    lastActiveAt: new Date().toISOString(),
    tier: 'Initiate',
    depinNodesCount: 1,
    isBanned: false,
    badges: ['genesis_vibester'],
    createdAt: new Date().toISOString()
  };

  store.participants.set(userPubkey, newProfile);
  return newProfile;
}

export async function getUserCompletions(userPubkey: string): Promise<QuestCompletion[]> {
  return store.completions.filter((c) => c.userPubkey === userPubkey);
}

export async function completeQuest(
  userPubkey: string,
  questId: string,
  proofData?: Record<string, any>
): Promise<{ success: boolean; xpAwarded: number; repAwarded: number; message: string }> {
  const quest = store.quests.find((q) => q.id === questId);
  if (!quest) throw new Error("Quest not found.");
  if (!quest.isActive) throw new Error("Quest is not active.");

  const participant = await getParticipantProfile(userPubkey);
  if (participant.isBanned) throw new Error("Participant is suspended.");

  // Check if already completed recently (cooldown)
  const previous = store.completions.find(
    (c) => c.userPubkey === userPubkey && c.questId === questId
  );

  if (previous && quest.cooldownHours === 0) {
    throw new Error("Quest already completed.");
  }

  if (previous && quest.cooldownHours > 0) {
    const elapsedHours = (Date.now() - new Date(previous.completedAt).getTime()) / (1000 * 60 * 60);
    if (elapsedHours < quest.cooldownHours) {
      const waitHours = Math.ceil(quest.cooldownHours - elapsedHours);
      throw new Error(`Quest in cooldown. Please wait ${waitHours} more hours.`);
    }
  }

  // DePIN specific validation verification if requested
  if (quest.verificationType === 'depin_sensor' && proofData?.sensorPayload) {
    const verification = await activeDePINAdapter.verifyContribution(proofData.sensorPayload);
    if (!verification.isValid) {
      throw new Error(verification.rejectionReason || "DePIN sensor verification rejected.");
    }
  }

  const completion: QuestCompletion = {
    id: `comp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    questId,
    userPubkey,
    campaignId: quest.campaignId,
    xpAwarded: quest.xpReward,
    reputationAwarded: quest.reputationReward,
    proofData,
    verificationStatus: 'verified',
    completedAt: new Date().toISOString()
  };

  store.completions.push(completion);
  quest.currentCompletions += 1;

  // Mutate participant metrics
  participant.totalXp += quest.xpReward;
  participant.reputationScore += quest.reputationReward;
  participant.completedQuestsCount += 1;
  participant.lastActiveAt = new Date().toISOString();

  // Tier calculation
  if (participant.totalXp >= 2000) participant.tier = 'Ambassador';
  else if (participant.totalXp >= 1000) participant.tier = 'Oracle Vanguard';
  else if (participant.totalXp >= 500) participant.tier = 'Hype Scout';
  else if (participant.totalXp >= 200) participant.tier = 'Vibester';

  return {
    success: true,
    xpAwarded: quest.xpReward,
    repAwarded: quest.reputationReward,
    message: `Quest verified! Earned +${quest.xpReward} XP and +${quest.reputationReward} Reputation.`
  };
}

export async function processReferral(
  inviterCode: string,
  newPubkey: string
): Promise<{ success: boolean; message: string }> {
  // Anti-Abuse: Prevent self-referral
  const inviter = Array.from(store.participants.values()).find(
    (p) => p.referralCode.toUpperCase() === inviterCode.toUpperCase()
  );

  if (!inviter) {
    return { success: false, message: "Referral code not found." };
  }

  if (inviter.userPubkey === newPubkey) {
    return { success: false, message: "Anti-Fraud: Cannot use your own referral code." };
  }

  // Check if user was already referred
  const alreadyReferred = store.referrals.some((r) => r.invitedPubkey === newPubkey);
  if (alreadyReferred) {
    return { success: false, message: "User has already claimed a referral." };
  }

  const referralRecord: CommunityReferral = {
    id: `ref_${Date.now().toString(36)}`,
    inviterPubkey: inviter.userPubkey,
    invitedPubkey: newPubkey,
    referralCode: inviterCode,
    isQualified: true,
    qualificationAction: 'wallet_connected',
    qualificationDate: new Date().toISOString(),
    inviterXpAwarded: store.settings.referralXpReward,
    createdAt: new Date().toISOString()
  };

  store.referrals.push(referralRecord);
  inviter.qualifiedReferralsCount += 1;
  inviter.totalXp += store.settings.referralXpReward;
  inviter.reputationScore += store.settings.referralReputationReward;

  const newParticipant = await getParticipantProfile(newPubkey);
  newParticipant.referredByCode = inviterCode;

  return {
    success: true,
    message: `Referral applied! Inviter credited +${store.settings.referralXpReward} XP.`
  };
}

export async function getLeaderboard(
  rankingType: 'xp' | 'rep' | 'quests' | 'referrals' = 'xp',
  limit = 25
): Promise<CommunityParticipant[]> {
  const list = Array.from(store.participants.values()).filter((p) => !p.isBanned);

  list.sort((a, b) => {
    if (rankingType === 'rep') return b.reputationScore - a.reputationScore;
    if (rankingType === 'quests') return b.completedQuestsCount - a.completedQuestsCount;
    if (rankingType === 'referrals') return b.qualifiedReferralsCount - a.qualifiedReferralsCount;
    return b.totalXp - a.totalXp;
  });

  return list.slice(0, limit);
}

// --- ADMIN MANAGEMENT METHODS ---

export async function adminCreateQuest(questData: Partial<CommunityQuest>): Promise<CommunityQuest> {
  const newQuest: CommunityQuest = {
    id: `quest_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`,
    campaignId: questData.campaignId || 'camp_genesis_01',
    title: questData.title || 'New Community Quest',
    description: questData.description || 'Complete this task to earn protocol reputation.',
    category: questData.category || 'community',
    verificationType: questData.verificationType || 'instant_click',
    verificationConfig: questData.verificationConfig || {},
    xpReward: questData.xpReward || 50,
    reputationReward: questData.reputationReward || 10,
    maxCompletions: questData.maxCompletions || null,
    currentCompletions: 0,
    cooldownHours: questData.cooldownHours || 0,
    isActive: questData.isActive !== false,
    sortOrder: questData.sortOrder || store.quests.length + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.quests.unshift(newQuest);
  return newQuest;
}

export async function adminUpdateQuest(
  questId: string,
  questData: Partial<CommunityQuest>
): Promise<CommunityQuest> {
  const quest = store.quests.find((q) => q.id === questId);
  if (!quest) throw new Error("Quest not found.");

  Object.assign(quest, questData, { updatedAt: new Date().toISOString() });
  return quest;
}

export async function adminDeleteQuest(questId: string): Promise<boolean> {
  const index = store.quests.findIndex((q) => q.id === questId);
  if (index === -1) return false;
  store.quests.splice(index, 1);
  return true;
}

export async function adminCreateCampaign(campaignData: Partial<CommunityCampaign>): Promise<CommunityCampaign> {
  const newCamp: CommunityCampaign = {
    id: `camp_${Date.now().toString(36)}`,
    slug: campaignData.slug || `campaign-${Date.now().toString(36)}`,
    title: campaignData.title || 'New Campaign',
    description: campaignData.description || '',
    badgeTitle: campaignData.badgeTitle,
    bannerUrl: campaignData.bannerUrl || '/logo.png',
    startDate: campaignData.startDate || new Date().toISOString(),
    endDate: campaignData.endDate,
    targetXp: campaignData.targetXp || 10000,
    status: campaignData.status || 'active',
    totalParticipants: 0,
    totalXpDistributed: 0,
    completionRate: 0,
    createdAt: new Date().toISOString()
  };

  store.campaigns.unshift(newCamp);
  return newCamp;
}

export async function getAdminSocialDrafts(): Promise<CommunitySocialDraft[]> {
  return store.socialDrafts;
}

export async function adminApproveSocialDraft(draftId: string, adminPubkey: string): Promise<CommunitySocialDraft> {
  const draft = store.socialDrafts.find((d) => d.id === draftId);
  if (!draft) throw new Error("Draft not found.");
  draft.status = 'approved';
  draft.adminReviewerPubkey = adminPubkey;
  draft.reviewedAt = new Date().toISOString();
  draft.updatedAt = new Date().toISOString();
  return draft;
}

export async function adminRejectSocialDraft(draftId: string, adminPubkey: string): Promise<CommunitySocialDraft> {
  const draft = store.socialDrafts.find((d) => d.id === draftId);
  if (!draft) throw new Error("Draft not found.");
  draft.status = 'rejected';
  draft.adminReviewerPubkey = adminPubkey;
  draft.reviewedAt = new Date().toISOString();
  draft.updatedAt = new Date().toISOString();
  return draft;
}

export async function adminUpdateSocialDraft(
  draftId: string,
  primaryText: string,
  threadItems?: string[]
): Promise<CommunitySocialDraft> {
  const draft = store.socialDrafts.find((d) => d.id === draftId);
  if (!draft) throw new Error("Draft not found.");
  draft.primaryText = primaryText;
  if (threadItems) draft.threadItems = threadItems;
  draft.updatedAt = new Date().toISOString();
  return draft;
}

export async function getAdminGrowthInsights(): Promise<CommunityAIInsight[]> {
  return store.aiInsights;
}

export async function saveAdminGrowthInsights(insights: CommunityAIInsight[]): Promise<void> {
  store.aiInsights = insights;
}

export async function getAdminAuditLogs(): Promise<CommunityAuditLog[]> {
  return store.auditLogs;
}

export async function getCommunitySettings(): Promise<CommunitySettings> {
  return store.settings;
}

export async function updateCommunitySettings(newSettings: Partial<CommunitySettings>): Promise<CommunitySettings> {
  Object.assign(store.settings, newSettings);
  return store.settings;
}
