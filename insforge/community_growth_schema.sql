-- HypeOracle AI Growth & Community Manager - PostgreSQL Schema for InsForge
-- Integrates Zealy-style Quests, Campaigns, Reputation, Anti-Abuse Referrals, DePIN nodes, and AI Social Growth

-- 1. Community Campaigns
CREATE TABLE IF NOT EXISTS public.community_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    badge_title TEXT,
    banner_url TEXT,
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ,
    target_xp INTEGER DEFAULT 10000,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed', 'draft'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.community_campaigns(status);

-- 2. Community Quests
CREATE TABLE IF NOT EXISTS public.community_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.community_campaigns(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'social', 'community', 'sentiment', 'depin', 'referral', 'education'
    verification_type TEXT NOT NULL, -- 'instant_click', 'x_follow', 'x_post', 'discord_join', 'telegram_join', 'vibe_score', 'depin_sensor', 'referral_count', 'manual_review'
    verification_config JSONB DEFAULT '{}'::jsonb,
    xp_reward INTEGER NOT NULL DEFAULT 50,
    reputation_reward INTEGER NOT NULL DEFAULT 10,
    max_completions INTEGER, -- NULL = unlimited
    current_completions INTEGER DEFAULT 0,
    cooldown_hours INTEGER DEFAULT 0, -- 0 = once ever
    start_date TIMESTAMPTZ DEFAULT now(),
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quests_campaign ON public.community_quests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_quests_active ON public.community_quests(is_active);
CREATE INDEX IF NOT EXISTS idx_quests_category ON public.community_quests(category);

-- 3. Community Participants
CREATE TABLE IF NOT EXISTS public.community_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_pubkey TEXT UNIQUE NOT NULL,
    username TEXT,
    avatar_url TEXT,
    bio TEXT,
    total_xp INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 0,
    completed_quests_count INTEGER DEFAULT 0,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by_code TEXT,
    qualified_referrals_count INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_active_at TIMESTAMPTZ DEFAULT now(),
    tier TEXT DEFAULT 'Initiate', -- 'Initiate', 'Vibester', 'Hype Scout', 'Oracle Vanguard', 'Ambassador'
    depin_nodes_count INTEGER DEFAULT 0,
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_participants_xp ON public.community_participants(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_participants_rep ON public.community_participants(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_participants_ref_code ON public.community_participants(referral_code);

-- 4. Quest Completions
CREATE TABLE IF NOT EXISTS public.community_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_id UUID NOT NULL REFERENCES public.community_quests(id) ON DELETE CASCADE,
    user_pubkey TEXT NOT NULL,
    campaign_id UUID REFERENCES public.community_campaigns(id) ON DELETE SET NULL,
    xp_awarded INTEGER NOT NULL,
    reputation_awarded INTEGER NOT NULL,
    proof_data JSONB DEFAULT '{}'::jsonb,
    verification_status TEXT DEFAULT 'verified', -- 'verified', 'pending_review', 'rejected'
    completed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_completions_user ON public.community_completions(user_pubkey);
CREATE INDEX IF NOT EXISTS idx_completions_quest ON public.community_completions(quest_id);
CREATE INDEX IF NOT EXISTS idx_completions_quest_user ON public.community_completions(quest_id, user_pubkey);

-- 5. Reputation & XP Ledger (Audit trail of every balance mutation)
CREATE TABLE IF NOT EXISTS public.community_reputation_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_pubkey TEXT NOT NULL,
    amount_xp INTEGER NOT NULL,
    amount_rep INTEGER NOT NULL,
    source_type TEXT NOT NULL, -- 'quest', 'referral', 'depin_stream', 'sentiment_streak', 'admin_adjustment'
    reference_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_user ON public.community_reputation_ledger(user_pubkey);

-- 6. Referrals & Sybil Guard
CREATE TABLE IF NOT EXISTS public.community_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_pubkey TEXT NOT NULL,
    invited_pubkey TEXT UNIQUE NOT NULL,
    referral_code TEXT NOT NULL,
    campaign_id UUID REFERENCES public.community_campaigns(id) ON DELETE SET NULL,
    is_qualified BOOLEAN DEFAULT false,
    qualification_action TEXT, -- e.g. 'completed_first_quest', 'submitted_sensor_vibe'
    qualification_date TIMESTAMPTZ,
    inviter_xp_awarded INTEGER DEFAULT 0,
    anti_fraud_flags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON public.community_referrals(inviter_pubkey);
CREATE INDEX IF NOT EXISTS idx_referrals_invited ON public.community_referrals(invited_pubkey);

-- 7. Badges & Milestone Rewards
CREATE TABLE IF NOT EXISTS public.community_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    reputation_bonus INTEGER DEFAULT 25,
    criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_participant_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_pubkey TEXT NOT NULL,
    badge_key TEXT NOT NULL REFERENCES public.community_badges(badge_key) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_pubkey, badge_key)
);

-- 8. DePIN Sensor Interface Nodes
CREATE TABLE IF NOT EXISTS public.community_depin_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_pubkey TEXT NOT NULL,
    node_type TEXT NOT NULL, -- 'browser_pwa_sensor', 'mobile_audio_stream', 'ambient_hardware_rig'
    device_fingerprint TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'standby', 'degraded'
    data_points_submitted INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 100,
    last_ping_at TIMESTAMPTZ DEFAULT now(),
    registered_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_depin_nodes_user ON public.community_depin_nodes(user_pubkey);

-- 9. AI Growth Agent Recommendations
CREATE TABLE IF NOT EXISTS public.community_ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL, -- 'quest_performance', 'campaign_opportunity', 'sentiment_shift', 'ambassador_candidate', 'retention_warning'
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    confidence NUMERIC(4,2) DEFAULT 0.85,
    suggested_action JSONB NOT NULL,
    status TEXT DEFAULT 'staged', -- 'staged', 'applied', 'dismissed'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_status ON public.community_ai_insights(status);

-- 10. AI Social Manager Drafts & Approval Queue
CREATE TABLE IF NOT EXISTS public.community_social_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL, -- 'x_post', 'x_thread', 'x_reply', 'campaign_announcement'
    primary_text TEXT NOT NULL,
    thread_items JSONB DEFAULT '[]'::jsonb,
    reply_to_url TEXT,
    status TEXT NOT NULL DEFAULT 'staged', -- 'staged', 'approved', 'rejected', 'scheduled', 'published'
    scheduled_for TIMESTAMPTZ,
    ai_generation_metadata JSONB DEFAULT '{}'::jsonb,
    admin_reviewer_pubkey TEXT,
    reviewed_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_drafts_status ON public.community_social_drafts(status);

-- 11. Admin Audit Trail
CREATE TABLE IF NOT EXISTS public.community_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_identity TEXT NOT NULL, -- Solana pubkey or InsForge email
    auth_method TEXT NOT NULL, -- 'solana_signature', 'insforge_session', 'dev_master'
    action_type TEXT NOT NULL, -- 'create_quest', 'update_quest', 'approve_social', 'reject_social', 'award_xp', 'toggle_campaign'
    target_entity TEXT,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin ON public.community_audit_logs(admin_identity);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.community_audit_logs(created_at DESC);
