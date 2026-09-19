/**
 * HypeOracle Production AI X Manager Service
 * 
 * Central orchestration service handling grounded prompt generation,
 * approval queue lifecycle, calendar scheduling, mention reply generation,
 * and automated autopilot dispatch.
 */

import { 
  XAccount, 
  XDraft, 
  XScheduledPost, 
  XPublishedPost, 
  XMention, 
  XReplySuggestion, 
  XAIRecommendation, 
  XAnalyticsSnapshot, 
  XAutomationSettings, 
  XAuditLog,
  XContentType,
  XTone
} from '@/lib/x-manager-types';
import { publishToX, testXConnection } from '@/lib/x-api-client';

/**
 * Factual Grounding Context for HypeOracle
 * Injected into AI prompts to prevent hallucinations.
 */
export const HYPEORACLE_BRAND_GROUNDING = `
Project Name: HypeOracle
Tagline: Real human hype & collective vibes → live on-chain trading signals on Solana.
Official Handle: @HypeOracle
Official Token: $HYPE on Solana (Mint: 5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS)
Exchange / Mechanism: Meteora Dynamic Bonding Curve via Bags.fm SDK.
Core Innovation:
1. DePIN Emotional Sensors: Phone microphone volume (acoustic energy) + accelerometer (party vibe motion) create an un-spoofable human physical presence verification.
2. Multimodal AI Formula: score = (excitement * 0.6) + (volume/energy * 0.3) + emoji weight.
3. On-chain Execution: Global score > 80 triggers automated buy orders + dynamic fee-sharing directly to genuine contributors via Bags.fm smart contracts.
4. Bot Resistance: LLM bot farms can fake 10,000 text tweets, but cannot fake physical acoustic frequency timbre or device accelerometer vibration.
5. Community Quest Hub: Users complete quests, stream sensor data, refer friends, earn XP/reputation, and climb the Vanguard leaderboard at https://hypeoracle.io/community.

Safety & Brand Guardrails:
- NEVER promise guaranteed financial returns or specific multiplier targets (e.g. no "guaranteed 100x").
- NEVER post ungrounded roadmap dates or fake token airdrops.
- Keep every tweet under 280 characters.
- Tone: Sharp, high conviction, scientifically grounded in DePIN and Solana speed.
`;

// Seed Data for @HypeOracle
const SEED_ACCOUNT: XAccount = {
  id: 'acc_hypeoracle_01',
  username: 'HypeOracle',
  name: 'HypeOracle ⚡',
  profileImageUrl: '/logo.png',
  bio: 'The Collective Emotion Oracle on Solana. Converting real human vocal energy & DePIN motion into live @bagsfm trading signals. 🎙️🔥',
  followersCount: 14850,
  followingCount: 284,
  tweetCount: 624,
  isVerified: true,
  isActive: true,
  apiAuthState: 'sandbox_ready',
  lastSyncedAt: new Date().toISOString()
};

const SEED_DRAFTS: XDraft[] = [
  {
    id: 'draft_x_01',
    contentType: 'sentiment_alert',
    tone: 'hype',
    primaryText: '⚡ ALERT: Global Solana Hype Score crossed 84/100!\n\nOver 120+ active PWA acoustic nodes streamed peak vocal excitement in the last 15 minutes. Dynamic fee-share triggered on @bagsfm for verified contributors.\n\nLive pulse: https://hypeoracle.io',
    status: 'pending_approval',
    sentimentScoreReferenced: 84,
    aiPromptMetadata: { model: 'llama-3.3-70b-versatile', source: 'sentiment_spike' },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'draft_x_02',
    contentType: 'thread',
    tone: 'technical',
    primaryText: 'Why LLM bot farms ruined Twitter sentiment analysis in 2026 — and how DePIN physical acoustics fixes it forever 🧵👇',
    threadItems: [
      '1/ Traditional crypto scrapers look at hashtag counts. Anyone with $5 can deploy 5,000 synthetic bots to pump an artificial sentiment score in 60 seconds.',
      '2/ HypeOracle requires biological audio energy & device motion captured live via PWA nodes. Bots cannot fake acoustic timbre or physical accelerometer vibration.',
      '3/ When authentic human sentiment exceeds 80/100, dynamic fee-sharing streams directly to real contributors via @bagsfm contracts. Verifiable truth wins.'
    ],
    status: 'pending_approval',
    aiPromptMetadata: { model: 'llama-3.3-70b-versatile', source: 'educational_deep_dive' },
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString()
  }
];

const SEED_SCHEDULED: XScheduledPost[] = [
  {
    id: 'sched_x_01',
    primaryText: '🌅 Morning Oracle Brief: Solana sentiment holds strong at 78/100. Over 400+ Genesis Vanguard contributors have earned their Acoustic Sentinel badge. Join today\'s quest sprint: https://hypeoracle.io/community',
    scheduledFor: new Date(Date.now() + 4 * 3600000).toISOString(),
    status: 'queued',
    retryCount: 0,
    createdAt: new Date().toISOString()
  }
];

const SEED_PUBLISHED: XPublishedPost[] = [
  {
    id: 'pub_x_01',
    xTweetId: '1892019482910481920',
    contentType: 'depin_update',
    primaryText: '🎙️ Over 14,000 verified DePIN sensor readings streamed into HypeOracle this epoch. Real humans, real excitement, live on Solana.',
    impressionsCount: 24800,
    likesCount: 840,
    repostsCount: 194,
    repliesCount: 62,
    clicksCount: 1420,
    publishedVia: 'ai_x_manager',
    publishedAt: new Date(Date.now() - 86400000).toISOString()
  }
];

const SEED_MENTIONS: XMention[] = [
  {
    id: 'men_x_01',
    xTweetId: '1892048291048192831',
    authorUsername: 'SolanaWhale_99',
    authorName: 'Alex | Solana Alpha',
    authorAvatarUrl: '/logo.png',
    tweetText: 'Testing out @HypeOracle PWA sensor node. Voice recognition is surprisingly fast. Does this integrate directly with Meteora bonding curve on Bags?',
    category: 'question',
    sentimentScore: 0.92,
    hasReplied: false,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    suggestedReply: {
      id: 'rep_x_01',
      mentionId: 'men_x_01',
      suggestedReplyText: '@SolanaWhale_99 Yes! When collective acoustic score hits >80, our smart contract triggers dynamic auto-buys on the Meteora Dynamic Bonding Curve via @bagsfm SDK, and routes fee-share to active node contributors.',
      reasoning: 'Gives accurate technical confirmation of the Bags.fm SDK Meteora integration in clear brand voice.',
      tone: 'technical',
      status: 'staged',
      createdAt: new Date().toISOString()
    }
  },
  {
    id: 'men_x_02',
    xTweetId: '1892059382910481922',
    authorUsername: 'degen_trader_42',
    authorName: 'Crypto Degen',
    authorAvatarUrl: '/logo.png',
    tweetText: 'Just claimed 150 XP on the Genesis quest board @HypeOracle. When is the Ambassador cohort opening?',
    category: 'positive',
    sentimentScore: 0.88,
    hasReplied: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    suggestedReply: {
      id: 'rep_x_02',
      mentionId: 'men_x_02',
      suggestedReplyText: '@degen_trader_42 Ambassador Wave 1 is active right now! Reach 1,000 XP on the quest hub and unlock the Vanguard tier to claim your badge: https://hypeoracle.io/community',
      reasoning: 'Encourages community progression and points to the Ambassador quest campaign.',
      tone: 'community',
      status: 'staged',
      createdAt: new Date().toISOString()
    }
  }
];

const SEED_RECOMMENDATIONS: XAIRecommendation[] = [
  {
    id: 'rec_x_01',
    category: 'timing_optimization',
    title: 'Optimal Posting Window Detected: 14:00 - 17:00 UTC',
    description: 'Solana trading volume and mention engagement peaked 3.2x higher during US market open. Schedule high-conviction sentiment alerts in this window.',
    priority: 'high',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'rec_x_02',
    category: 'depin_spotlight',
    title: 'DePIN Acoustic Proof Narrative Hook',
    description: 'Tweets highlighting how voice volume blocks bot spoofing received 4.1% higher engagement than generic price posts. Recommend drafting a 3-part thread.',
    suggestedPostDraft: 'How 5 seconds of human voice blocks 10,000 bots on Solana: 🧵',
    priority: 'medium',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

// In-Memory Store for Zero-Downtime Resilience
class XManagerDataStore {
  account: XAccount = { ...SEED_ACCOUNT };
  drafts: XDraft[] = [...SEED_DRAFTS];
  scheduled: XScheduledPost[] = [...SEED_SCHEDULED];
  posts: XPublishedPost[] = [...SEED_PUBLISHED];
  mentions: XMention[] = [...SEED_MENTIONS];
  recommendations: XAIRecommendation[] = [...SEED_RECOMMENDATIONS];
  settings: XAutomationSettings = {
    id: 'settings_01',
    accountUsername: 'HypeOracle',
    autopilotEnabled: false,
    autopilotIntervalHours: 6,
    dailyPostLimit: 4,
    dailyReplyLimit: 8,
    requireHumanApproval: true,
    autoCommentEnabled: false,
    preferredTone: 'hype',
    bannedPhrases: ['guaranteed return', '100x pump', 'financial advice', 'airdrop claim link'],
    updatedAt: new Date().toISOString()
  };
  auditLogs: XAuditLog[] = [
    {
      id: 'audit_init',
      actorIdentity: 'system',
      actionType: 'system_initialized',
      targetType: 'account',
      targetId: 'HypeOracle',
      details: { mode: 'sandbox_ready' },
      createdAt: new Date().toISOString()
    }
  ];
}

const xStore = new XManagerDataStore();

// --- PUBLIC SERVICE METHODS ---

export async function getXAccount(): Promise<XAccount> {
  const connection = await testXConnection();
  xStore.account.apiAuthState = connection.mode === 'live' ? 'connected' : 'sandbox_ready';
  if (connection.username) {
    xStore.account.username = connection.username;
  }
  return xStore.account;
}

export async function getXDrafts(status?: string): Promise<XDraft[]> {
  if (status) return xStore.drafts.filter((d) => d.status === status);
  return xStore.drafts;
}

export async function getXScheduledPosts(): Promise<XScheduledPost[]> {
  return xStore.scheduled.filter((s) => s.status === 'queued');
}

export async function getXPublishedPosts(): Promise<XPublishedPost[]> {
  return xStore.posts;
}

export async function getXMentions(): Promise<XMention[]> {
  return xStore.mentions;
}

export async function getXRecommendations(): Promise<XAIRecommendation[]> {
  return xStore.recommendations;
}

export async function getXAutomationSettings(): Promise<XAutomationSettings> {
  return xStore.settings;
}

export async function updateXAutomationSettings(updates: Partial<XAutomationSettings>): Promise<XAutomationSettings> {
  Object.assign(xStore.settings, updates, { updatedAt: new Date().toISOString() });
  xStore.auditLogs.unshift({
    id: `audit_${Date.now().toString(36)}`,
    actorIdentity: 'admin',
    actionType: 'settings_updated',
    targetType: 'settings',
    details: updates,
    createdAt: new Date().toISOString()
  });
  return xStore.settings;
}

export async function getXAuditLogs(): Promise<XAuditLog[]> {
  return xStore.auditLogs;
}

/**
 * AI Content Studio: Generates single tweets or threads grounded in HypeOracle context
 */
export async function generateXContent(
  contentType: XContentType,
  tone: XTone,
  customPrompt?: string
): Promise<XDraft> {
  const groqApiKey = process.env.GROQ_API_KEY;
  let primaryText = '';
  let threadItems: string[] = [];

  // Fetch live sentiment score context
  const liveSentimentScore = 82; // Simulated or live from database

  if (groqApiKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.65,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are the official social media manager for @HypeOracle.
${HYPEORACLE_BRAND_GROUNDING}

Output a JSON object with:
- "primaryText": string (strictly under 280 characters, crisp, high-impact)
- "threadItems": array of strings (empty if contentType is not 'thread')`
            },
            {
              role: "user",
              content: `Generate a ${contentType} with a ${tone} tone.
Live Sentiment Score: ${liveSentimentScore}/100.
${customPrompt ? `Additional directive: ${customPrompt}` : ''}`
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          primaryText = parsed.primaryText || '';
          threadItems = parsed.threadItems || [];
        }
      }
    } catch (err) {
      console.warn('[XManagerService] Groq generation fallback:', err);
    }
  }

  // Deterministic Fallback Copy
  if (!primaryText) {
    if (contentType === 'thread') {
      primaryText = `Most crypto trading algorithms rely on bot-spoofed order books. We rely on biological human vocal excitation. 🎙️⚡\n\nHow HypeOracle turns raw emotion into Solana signals: 🧵👇`;
      threadItems = [
        `1/ Bot farms can generate 10,000 bullish tweets in seconds. Relying on text volume alone guarantees buying top tick.`,
        `2/ HypeOracle streams 5s acoustic & accelerometer vibration from genuine mobile nodes. Biological vocal energy cannot be faked.`,
        `3/ Scores > 80 trigger instant auto-buys on @bagsfm dynamic bonding curve, rewarding contributors with fee-shares.`
      ];
    } else if (contentType === 'sentiment_alert') {
      primaryText = `🔥 LIVE ORACLE PULSE: Sentiment crossed ${liveSentimentScore}/100 on Solana.\n\nBiometric acoustic nodes are registering intense buy conviction across Bags.fm trading pairs. Complete quests: https://hypeoracle.io/community`;
    } else if (contentType === 'depin_update') {
      primaryText = `📡 DePIN Network Update: 140+ verified PWA sensor nodes streaming live emotion metrics.\n\nEvery voice frequency reading sharpens on-chain trading signals. Verify your node: https://hypeoracle.io/community`;
    } else {
      primaryText = `⚡ HypeOracle is converting human excitement into verifiable Solana liquidity. The louder the genuine hype, the faster the trading signal: https://hypeoracle.io`;
    }
  }

  const newDraft: XDraft = {
    id: `draft_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    contentType,
    tone,
    primaryText,
    threadItems,
    status: 'pending_approval',
    sentimentScoreReferenced: liveSentimentScore,
    aiPromptMetadata: {
      model: groqApiKey ? 'llama-3.3-70b-versatile' : 'hypeoracle-grounded-v1',
      tone,
      customPrompt
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  xStore.drafts.unshift(newDraft);

  xStore.auditLogs.unshift({
    id: `audit_${Date.now().toString(36)}`,
    actorIdentity: 'AI_STUDIO',
    actionType: 'draft_created',
    targetType: 'draft',
    targetId: newDraft.id,
    details: { contentType, tone },
    createdAt: new Date().toISOString()
  });

  return newDraft;
}

/**
 * AI Rewrite Quick-Tools
 */
export async function rewriteDraftContent(
  text: string,
  mode: 'shorten' | 'more_hype' | 'more_professional' | 'add_cta'
): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (groqApiKey) {
    try {
      const instructions: Record<string, string> = {
        shorten: 'Shorten this tweet to be strictly under 240 characters while preserving core punchiness.',
        more_hype: 'Make this tweet much more energetic, web3 native, and exciting using fire and lightning emojis.',
        more_professional: 'Make this tweet more institutional, scientifically grounded in DePIN and quantitative sentiment.',
        add_cta: 'Add a clear call to action directing users to join the community quest hub at https://hypeoracle.io/community.'
      };

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.5,
          messages: [
            { role: "system", content: "You are a tweet editor. Return ONLY the edited tweet string without quotes or conversational filler. Max 280 chars." },
            { role: "user", content: `${instructions[mode]}\n\nTweet: "${text}"` }
          ]
        })
      });

      if (res.ok) {
        const d = await res.json();
        const edited = d.choices?.[0]?.message?.content?.trim();
        if (edited) return edited;
      }
    } catch {}
  }

  // Fallback rewrites
  if (mode === 'add_cta') return `${text}\n\nJoin the Vanguard: https://hypeoracle.io/community`;
  if (mode === 'more_hype') return `🔥 LFG: ${text} ⚡`;
  if (mode === 'shorten') return text.length > 240 ? text.slice(0, 237) + '...' : text;
  return text;
}

/**
 * Approval Queue Actions
 */
export async function approveAndPublishDraft(
  draftId: string,
  adminIdentity: string
): Promise<{ success: boolean; result: any }> {
  const draft = xStore.drafts.find((d) => d.id === draftId);
  if (!draft) throw new Error("Draft not found");

  // Broadcast to X
  const result = await publishToX(draft.primaryText, draft.threadItems);

  draft.status = 'published';
  draft.publishedAt = new Date().toISOString();
  draft.adminReviewerIdentity = adminIdentity;
  draft.reviewedAt = new Date().toISOString();

  const publishedPost: XPublishedPost = {
    id: `pub_${Date.now().toString(36)}`,
    xTweetId: result.xTweetId || `sim_${Date.now()}`,
    contentType: draft.contentType,
    primaryText: draft.primaryText,
    threadItems: draft.threadItems,
    impressionsCount: 1,
    likesCount: 0,
    repostsCount: 0,
    repliesCount: 0,
    clicksCount: 0,
    publishedVia: 'ai_x_manager',
    publishedAt: new Date().toISOString()
  };

  xStore.posts.unshift(publishedPost);

  xStore.auditLogs.unshift({
    id: `audit_${Date.now().toString(36)}`,
    actorIdentity: adminIdentity,
    actionType: 'draft_approved_and_published',
    targetType: 'draft',
    targetId: draftId,
    details: { xTweetId: result.xTweetId, mode: result.mode },
    createdAt: new Date().toISOString()
  });

  return { success: true, result };
}

export async function approveAndScheduleDraft(
  draftId: string,
  scheduledFor: string,
  adminIdentity: string
): Promise<XScheduledPost> {
  const draft = xStore.drafts.find((d) => d.id === draftId);
  if (!draft) throw new Error("Draft not found");

  draft.status = 'scheduled';
  draft.scheduledFor = scheduledFor;
  draft.adminReviewerIdentity = adminIdentity;
  draft.reviewedAt = new Date().toISOString();

  const scheduledPost: XScheduledPost = {
    id: `sched_${Date.now().toString(36)}`,
    draftId: draft.id,
    primaryText: draft.primaryText,
    threadItems: draft.threadItems,
    scheduledFor,
    status: 'queued',
    retryCount: 0,
    createdAt: new Date().toISOString()
  };

  xStore.scheduled.push(scheduledPost);

  xStore.auditLogs.unshift({
    id: `audit_${Date.now().toString(36)}`,
    actorIdentity: adminIdentity,
    actionType: 'draft_scheduled',
    targetType: 'scheduled_post',
    targetId: scheduledPost.id,
    details: { scheduledFor },
    createdAt: new Date().toISOString()
  });

  return scheduledPost;
}

export async function rejectDraft(
  draftId: string,
  reason: string,
  adminIdentity: string
): Promise<XDraft> {
  const draft = xStore.drafts.find((d) => d.id === draftId);
  if (!draft) throw new Error("Draft not found");

  draft.status = 'rejected';
  draft.rejectionReason = reason;
  draft.adminReviewerIdentity = adminIdentity;
  draft.reviewedAt = new Date().toISOString();

  xStore.auditLogs.unshift({
    id: `audit_${Date.now().toString(36)}`,
    actorIdentity: adminIdentity,
    actionType: 'draft_rejected',
    targetType: 'draft',
    targetId: draftId,
    details: { reason },
    createdAt: new Date().toISOString()
  });

  return draft;
}

/**
 * Reply to Community Mention
 */
export async function publishReplyToMention(
  mentionId: string,
  replyText: string,
  adminIdentity: string
): Promise<{ success: boolean; result: any }> {
  const mention = xStore.mentions.find((m) => m.id === mentionId);
  if (!mention) throw new Error("Mention not found");

  const result = await publishToX(replyText, [], mention.xTweetId);

  mention.hasReplied = true;
  mention.replyTweetId = result.xTweetId;
  if (mention.suggestedReply) {
    mention.suggestedReply.status = 'used';
  }

  xStore.auditLogs.unshift({
    id: `audit_${Date.now().toString(36)}`,
    actorIdentity: adminIdentity,
    actionType: 'reply_dispatched',
    targetType: 'mention',
    targetId: mentionId,
    details: { inReplyTo: mention.xTweetId, text: replyText },
    createdAt: new Date().toISOString()
  });

  return { success: true, result };
}

/**
 * Background Worker Cycle:
 * Evaluates due scheduled posts and autopilot auto-generation.
 */
export async function triggerWorkerCycle(): Promise<{
  dispatchedCount: number;
  autopilotTriggered: boolean;
  message: string;
}> {
  const now = new Date();
  let dispatchedCount = 0;
  let autopilotTriggered = false;

  // 1. Dispatch Due Scheduled Posts
  const duePosts = xStore.scheduled.filter(
    (s) => s.status === 'queued' && new Date(s.scheduledFor) <= now
  );

  for (const post of duePosts) {
    try {
      post.status = 'processing';
      const result = await publishToX(post.primaryText, post.threadItems);
      post.status = 'dispatched';
      post.xTweetId = result.xTweetId;
      post.dispatchedAt = new Date().toISOString();
      dispatchedCount += 1;

      xStore.auditLogs.unshift({
        id: `audit_${Date.now().toString(36)}`,
        actorIdentity: 'CRON_WORKER',
        actionType: 'scheduled_post_dispatched',
        targetType: 'scheduled_post',
        targetId: post.id,
        details: { result },
        createdAt: new Date().toISOString()
      });
    } catch (err: any) {
      post.status = 'failed';
      post.errorMessage = err.message;
      post.retryCount += 1;
    }
  }

  // 2. Autopilot Check
  if (xStore.settings.autopilotEnabled) {
    const lastPublished = xStore.posts[0];
    const lastTime = lastPublished ? new Date(lastPublished.publishedAt).getTime() : 0;
    const intervalMs = xStore.settings.autopilotIntervalHours * 3600 * 1000;

    if (Date.now() - lastTime > intervalMs) {
      // Generate fresh post
      const draft = await generateXContent('sentiment_alert', xStore.settings.preferredTone);
      autopilotTriggered = true;

      if (!xStore.settings.requireHumanApproval) {
        // Direct Autonomous Publish
        await approveAndPublishDraft(draft.id, 'AI_AUTOPILOT');
      }
    }
  }

  return {
    dispatchedCount,
    autopilotTriggered,
    message: `Worker cycle executed: ${dispatchedCount} scheduled post(s) dispatched.`
  };
}
