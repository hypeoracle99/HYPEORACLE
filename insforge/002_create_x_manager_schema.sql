-- HypeOracle AI X Manager - PostgreSQL Schema for InsForge
-- 10 Specialized tables managing official account presence (@HypeOracle),
-- AI content generation, approval queues, calendar scheduling, community mentions, and automated autopilot.

-- 1. Connected Account Metadata
CREATE TABLE IF NOT EXISTS public.x_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL, -- e.g. 'HypeOracle'
    name TEXT NOT NULL DEFAULT 'HypeOracle',
    profile_image_url TEXT,
    bio TEXT,
    followers_count INTEGER DEFAULT 14200,
    following_count INTEGER DEFAULT 280,
    tweet_count INTEGER DEFAULT 540,
    is_verified BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    api_auth_state TEXT DEFAULT 'sandbox_ready', -- 'connected', 'sandbox_ready', 'error'
    last_synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_x_accounts_username ON public.x_accounts(username);

-- 2. Content Drafts (Awaiting Admin Review)
CREATE TABLE IF NOT EXISTS public.x_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL, -- 'single_tweet', 'thread', 'sentiment_alert', 'depin_update', 'bags_trade_signal', 'ambassador_spotlight'
    tone TEXT NOT NULL DEFAULT 'energetic', -- 'hype', 'technical', 'analytical', 'community', 'alpha'
    primary_text TEXT NOT NULL,
    thread_items JSONB DEFAULT '[]'::jsonb,
    media_urls JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending_approval', -- 'pending_approval', 'approved', 'rejected', 'scheduled', 'published'
    scheduled_for TIMESTAMPTZ,
    rejection_reason TEXT,
    ai_prompt_metadata JSONB DEFAULT '{}'::jsonb,
    sentiment_score_referenced NUMERIC(5,2),
    admin_reviewer_identity TEXT,
    reviewed_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_x_drafts_status ON public.x_drafts(status);
CREATE INDEX IF NOT EXISTS idx_x_drafts_scheduled ON public.x_drafts(scheduled_for);

-- 3. Scheduled Posts Queue
CREATE TABLE IF NOT EXISTS public.x_scheduled_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID REFERENCES public.x_drafts(id) ON DELETE SET NULL,
    primary_text TEXT NOT NULL,
    thread_items JSONB DEFAULT '[]'::jsonb,
    media_urls JSONB DEFAULT '[]'::jsonb,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'processing', 'dispatched', 'failed', 'cancelled'
    x_tweet_id TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    dispatched_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_x_scheduled_status_time ON public.x_scheduled_posts(status, scheduled_for);

-- 4. Published Posts History
CREATE TABLE IF NOT EXISTS public.x_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    x_tweet_id TEXT UNIQUE,
    content_type TEXT NOT NULL,
    primary_text TEXT NOT NULL,
    thread_items JSONB DEFAULT '[]'::jsonb,
    impressions_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    reposts_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    sentiment_context JSONB DEFAULT '{}'::jsonb,
    published_via TEXT DEFAULT 'ai_x_manager', -- 'ai_x_manager', 'manual_dashboard', 'autopilot_cron'
    published_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_x_posts_published ON public.x_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_x_posts_tweet_id ON public.x_posts(x_tweet_id);

-- 5. Community Mentions & Tagged Tweets
CREATE TABLE IF NOT EXISTS public.x_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    x_tweet_id TEXT UNIQUE NOT NULL,
    author_username TEXT NOT NULL,
    author_name TEXT,
    author_avatar_url TEXT,
    tweet_text TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'positive', -- 'positive', 'question', 'depin_feedback', 'partnership', 'issue'
    sentiment_score NUMERIC(4,2) DEFAULT 0.85,
    has_replied BOOLEAN DEFAULT false,
    reply_tweet_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_x_mentions_category ON public.x_mentions(category);
CREATE INDEX IF NOT EXISTS idx_x_mentions_replied ON public.x_mentions(has_replied);

-- 6. AI Reply Suggestions
CREATE TABLE IF NOT EXISTS public.x_reply_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mention_id UUID REFERENCES public.x_mentions(id) ON DELETE CASCADE,
    suggested_reply_text TEXT NOT NULL,
    reasoning TEXT,
    tone TEXT DEFAULT 'community',
    status TEXT DEFAULT 'staged', -- 'staged', 'used', 'edited', 'dismissed'
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_x_reply_status ON public.x_reply_suggestions(status);

-- 7. Autonomous Strategist Recommendations
CREATE TABLE IF NOT EXISTS public.x_ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL, -- 'timing_optimization', 'narrative_gap', 'viral_opportunity', 'depin_spotlight'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    suggested_post_draft TEXT,
    priority TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'
    status TEXT DEFAULT 'active', -- 'active', 'implemented', 'dismissed'
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_x_ai_recs_status ON public.x_ai_recommendations(status);

-- 8. Analytics Snapshots
CREATE TABLE IF NOT EXISTS public.x_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_followers INTEGER DEFAULT 14200,
    net_follower_change INTEGER DEFAULT 45,
    total_impressions INTEGER DEFAULT 84500,
    total_engagements INTEGER DEFAULT 4210,
    avg_engagement_rate NUMERIC(5,2) DEFAULT 4.98,
    top_post_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(snapshot_date)
);

-- 9. Automation & Autopilot Settings
CREATE TABLE IF NOT EXISTS public.x_automation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_username TEXT UNIQUE NOT NULL DEFAULT 'HypeOracle',
    autopilot_enabled BOOLEAN DEFAULT false,
    autopilot_interval_hours INTEGER DEFAULT 6, -- post every 6 hours
    daily_post_limit INTEGER DEFAULT 4,
    daily_reply_limit INTEGER DEFAULT 8,
    require_human_approval BOOLEAN DEFAULT true,
    auto_comment_enabled BOOLEAN DEFAULT false,
    preferred_tone TEXT DEFAULT 'energetic',
    banned_phrases JSONB DEFAULT '["guaranteed return", "100x pump", "financial advice", "airdrop claim link"]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Immutable Audit Trail
CREATE TABLE IF NOT EXISTS public.x_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_identity TEXT NOT NULL, -- Admin Pubkey, Staff Email, or 'AI_AUTOPILOT_CRON'
    action_type TEXT NOT NULL, -- 'draft_created', 'draft_approved', 'draft_rejected', 'post_scheduled', 'post_published', 'reply_dispatched', 'settings_updated'
    target_type TEXT NOT NULL, -- 'draft', 'scheduled_post', 'mention', 'settings'
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_x_audit_created ON public.x_audit_logs(created_at DESC);
