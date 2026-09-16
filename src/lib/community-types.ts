/**
 * HypeOracle AI Growth & Community Manager - Core Type Definitions
 */

export type VerificationType = 
  | 'instant_click'
  | 'x_follow'
  | 'x_post'
  | 'discord_join'
  | 'telegram_join'
  | 'vibe_score'
  | 'depin_sensor'
  | 'referral_count'
  | 'manual_review';

export type QuestCategory = 
  | 'social'
  | 'community'
  | 'sentiment'
  | 'depin'
  | 'referral'
  | 'education';

export interface CommunityQuest {
  id: string;
  campaignId?: string | null;
  title: string;
  description: string;
  category: QuestCategory;
  verificationType: VerificationType;
  verificationConfig?: {
    targetUrl?: string;
    targetHandle?: string;
    requiredScore?: number;
    sensorThreshold?: number;
    requiredReferrals?: number;
    customInstructions?: string;
  };
  xpReward: number;
  reputationReward: number;
  maxCompletions?: number | null;
  currentCompletions: number;
  cooldownHours: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus = 'active' | 'paused' | 'completed' | 'draft';

export interface CommunityCampaign {
  id: string;
  slug: string;
  title: string;
  description: string;
  badgeTitle?: string;
  bannerUrl?: string;
  startDate: string;
  endDate?: string;
  targetXp: number;
  status: CampaignStatus;
  totalParticipants?: number;
  totalXpDistributed?: number;
  completionRate?: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export type ParticipantTier = 
  | 'Initiate'
  | 'Vibester'
  | 'Hype Scout'
  | 'Oracle Vanguard'
  | 'Ambassador';

export interface CommunityParticipant {
  id: string;
  userPubkey: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  totalXp: number;
  reputationScore: number;
  completedQuestsCount: number;
  referralCode: string;
  referredByCode?: string | null;
  qualifiedReferralsCount: number;
  currentStreak: number;
  lastActiveAt: string;
  tier: ParticipantTier;
  depinNodesCount: number;
  isBanned: boolean;
  banReason?: string;
  badges?: string[];
  createdAt: string;
}

export interface QuestCompletion {
  id: string;
  questId: string;
  userPubkey: string;
  campaignId?: string | null;
  xpAwarded: number;
  reputationAwarded: number;
  proofData?: {
    socialHandle?: string;
    submittedUrl?: string;
    vibeScore?: number;
    sensorReading?: Record<string, any>;
    note?: string;
  };
  verificationStatus: 'verified' | 'pending_review' | 'rejected';
  completedAt: string;
}

export interface CommunityReferral {
  id: string;
  inviterPubkey: string;
  invitedPubkey: string;
  referralCode: string;
  campaignId?: string | null;
  isQualified: boolean;
  qualificationAction?: string;
  qualificationDate?: string;
  inviterXpAwarded: number;
  antiFraudFlags?: string[];
  createdAt: string;
}

export interface CommunityBadge {
  badgeKey: string;
  name: string;
  description: string;
  iconName: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  reputationBonus: number;
  criteria: {
    minXp?: number;
    minQuests?: number;
    minReferrals?: number;
    minDePinReadings?: number;
    specialRole?: string;
  };
}

export type AIInsightCategory = 
  | 'quest_performance'
  | 'campaign_opportunity'
  | 'sentiment_shift'
  | 'ambassador_candidate'
  | 'retention_warning';

export interface CommunityAIInsight {
  id: string;
  category: AIInsightCategory;
  title: string;
  summary: string;
  confidence: number;
  suggestedAction: {
    actionType: 'create_quest' | 'adjust_rewards' | 'promote_user' | 'launch_campaign' | 'send_nudge';
    payload: Record<string, any>;
  };
  status: 'staged' | 'applied' | 'dismissed';
  metadata?: Record<string, any>;
  createdAt: string;
  resolvedAt?: string;
}

export type SocialDraftStatus = 'staged' | 'approved' | 'rejected' | 'scheduled' | 'published';
export type SocialContentType = 'x_post' | 'x_thread' | 'x_reply' | 'campaign_announcement';

export interface CommunitySocialDraft {
  id: string;
  contentType: SocialContentType;
  primaryText: string;
  threadItems?: string[];
  replyToUrl?: string;
  status: SocialDraftStatus;
  scheduledFor?: string;
  aiGenerationMetadata?: {
    modelUsed: string;
    promptTheme: string;
    tone: string;
    sentimentScoreReferenced?: number;
  };
  adminReviewerPubkey?: string;
  reviewedAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityAuditLog {
  id: string;
  adminIdentity: string;
  authMethod: 'solana_signature' | 'insforge_session' | 'dev_master';
  actionType: string;
  targetEntity?: string;
  entityId?: string;
  details?: Record<string, any>;
  ipHash?: string;
  createdAt: string;
}

export interface CommunitySettings {
  cooldownPeriodMinutes: number;
  maxDailyXpPerUser: number;
  sybilProtectionStrictness: 'lenient' | 'moderate' | 'strict';
  referralXpReward: number;
  referralReputationReward: number;
  adminWallets: string[];
  allowSelfVerification: boolean;
  autoAnalyzeFrequencyHours: number;
}
