-- HypeOracle Vibe Prediction Market Schema
-- Evolving sentiment oracle metrics into a gamified Polymarket-style competitor

-- 1. Create Prediction Markets Table
CREATE TABLE IF NOT EXISTS public.vibe_prediction_markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_mint TEXT NOT NULL,
    question TEXT NOT NULL,
    target_score NUMERIC(5,2) NOT NULL,
    resolution_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'resolved', 'cancelled'
    total_yes_pool NUMERIC DEFAULT 0,
    total_no_pool NUMERIC DEFAULT 0,
    final_score NUMERIC(5,2),
    outcome TEXT, -- 'yes', 'no'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for scanning active markets and token-specific searches
CREATE INDEX IF NOT EXISTS idx_prediction_markets_token ON public.vibe_prediction_markets(token_mint);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_status ON public.vibe_prediction_markets(status);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_date ON public.vibe_prediction_markets(resolution_date);

-- 2. Create User Bets Table
CREATE TABLE IF NOT EXISTS public.vibe_prediction_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID REFERENCES public.vibe_prediction_markets(id) ON DELETE CASCADE,
    user_pubkey TEXT NOT NULL,
    prediction TEXT NOT NULL, -- 'yes', 'no'
    amount NUMERIC NOT NULL, -- SOL bet size
    claimed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fetching a user's bet history and active stakes
CREATE INDEX IF NOT EXISTS idx_prediction_bets_user ON public.vibe_prediction_bets(user_pubkey);
CREATE INDEX IF NOT EXISTS idx_prediction_bets_market ON public.vibe_prediction_bets(market_id);
