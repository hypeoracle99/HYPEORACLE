/**
 * HypeOracle AI X Manager - Type Definitions
 * 
 * Maps directly to the 10 PostgreSQL x_* tables and handles X API v2 payload contracts.
 */

export type XContentType = 
  | 'single_tweet' 
  | 'thread' 
  | 'sentiment_alert' 
  | 'depin_update' 
  | 'bags_trade_signal' 
  | 'ambassador_spotlight';

export type XTone = 
  | 'hype' 
  | 'technical' 
  | 'analytical' 
  | 'community' 
  | 'alpha';

export type XDraftStatus = 
  | 'pending_approval' 
  | 'approved' 
  | 'rejected' 
  | 'scheduled' 
  | 'published';

export type XScheduledStatus = 
  | 'queued' 
  | 'processing' 
  | 'dispatched' 
  | 'failed' 
  | 'cancelled';

export interface XAccount {
  id: string;
  username: string;
  name: string;
  profileImageUrl?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  tweetCount: number;
  isVerified: boolean;
  isActive: boolean;
  apiAuthState: 'connected' | 'sandbox_ready' | 'error';
  lastSyncedAt: string;
}

export interface XDraft {
  id: string;
  contentType: XContentType;
  tone: XTone;
  primaryText: string;
  threadItems?: string[];
  mediaUrls?: string[];
  status: XDraftStatus;
  scheduledFor?: string;
  rejectionReason?: string;
  aiPromptMetadata?: Record<string, any>;
  sentimentScoreReferenced?: number;
  adminReviewerIdentity?: string;
  reviewedAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface XScheduledPost {
  id: string;
  draftId?: string;
  primaryText: string;
  threadItems?: string[];
  mediaUrls?: string[];
  scheduledFor: string;
  status: XScheduledStatus;
  xTweetId?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
  dispatchedAt?: string;
}

export interface XPublishedPost {
  id: string;
  xTweetId: string;
  contentType: XContentType;
  primaryText: string;
  threadItems?: string[];
  impressionsCount: number;
  likesCount: number;
  repostsCount: number;
  repliesCount: number;
  clicksCount: number;
  sentimentContext?: Record<string, any>;
  publishedVia: 'ai_x_manager' | 'manual_dashboard' | 'autopilot_cron';
  publishedAt: string;
}

export type XMentionCategory = 
  | 'positive' 
  | 'question' 
  | 'depin_feedback' 
  | 'partnership' 
  | 'issue';

export interface XMention {
  id: string;
  xTweetId: string;
  authorUsername: string;
  authorName?: string;
  authorAvatarUrl?: string;
  tweetText: string;
  category: XMentionCategory;
  sentimentScore: number;
  hasReplied: boolean;
  replyTweetId?: string;
  createdAt: string;
  suggestedReply?: XReplySuggestion;
}

export interface XReplySuggestion {
  id: string;
  mentionId: string;
  suggestedReplyText: string;
  reasoning?: string;
  tone: string;
  status: 'staged' | 'used' | 'edited' | 'dismissed';
  createdAt: string;
}

export interface XAIRecommendation {
  id: string;
  category: 'timing_optimization' | 'narrative_gap' | 'viral_opportunity' | 'depin_spotlight';
  title: string;
  description: string;
  suggestedPostDraft?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'implemented' | 'dismissed';
  createdAt: string;
}

export interface XAnalyticsSnapshot {
  id: string;
  snapshotDate: string;
  totalFollowers: number;
  netFollowerChange: number;
  totalImpressions: number;
  totalEngagements: number;
  avgEngagementRate: number;
  topPostId?: string;
  createdAt: string;
}

export interface XAutomationSettings {
  id: string;
  accountUsername: string;
  autopilotEnabled: boolean;
  autopilotIntervalHours: number;
  dailyPostLimit: number;
  dailyReplyLimit: number;
  requireHumanApproval: boolean;
  autoCommentEnabled: boolean;
  preferredTone: XTone;
  bannedPhrases: string[];
  updatedAt: string;
}

export interface XAuditLog {
  id: string;
  actorIdentity: string;
  actionType: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface XApiCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  accessTokenSecret?: string;
  bearerToken?: string;
  isConfigured: boolean;
}
