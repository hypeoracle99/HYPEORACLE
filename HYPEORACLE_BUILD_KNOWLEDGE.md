# HYPEORACLE BUILD KNOWLEDGE BASE
**For AI Coding Agents (Cursor / Claude / Windsurf / etc.)**

**Project**: HypeOracle – Collective Emotion Oracle for Bags.fm  
**Tagline**: Real human hype & vibes → live on-chain trading signals  
**Core Idea (from Day 1)**: Turn phone voice + sensors into a verifiable “emotional DePIN” oracle that powers Bags.fm trading.

**Strategy**: Build the app first → get real users & traction → launch $HYPE as a **bonding-curve token** (Meteora Dynamic Bonding Curve via Bags SDK) later for maximum liquidity.

**All-in-One Platform**: InsForge.dev only.

---

## PROJECT STRUCTURE

hypeoracle/
├── frontend/
├── .env
├── .env.example
├── HYPEORACLE_BUILD_KNOWLEDGE.md
└── .gitignore

---

## OUTSIDE-THE-BOX WINNING FEATURES (THIS IS WHY WE WIN)
- Light DePIN: Phone mic volume (energy), accelerometer (party vibe), optional GPS → physical emotion data no one else has.
- Multimodal AI scoring formula: score = (excitement * 0.6) + (volume/energy * 0.3) + emoji weight.
- Viral Blinks: One-click “Send Hype” links anyone can share.
- Instant feedback: Score >80 → auto small buy + dynamic fee-share to contributor.
- Realtime dashboard + leaderboard.
- Bonding-curve token launch planned (post-traction).

---

## PHASE 0: PREREQUISITES (Human does this)

1. Run:
   ```bash
   mkdir hypeoracle && cd hypeoracle
   npm install -g @insforge/cli

Create .env.example:env

BAGS_API_KEY=your_bags_api_key_here
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your_helius_key
PRIVATE_KEY=your_dev_wallet_private_key_here
GROQ_API_KEY=your_groq_api_key_here

Copy to .env and fill real values.

Commit: "PHASE 0 COMPLETE – Setup done"PHASE 1: CREATE INSFORGE FULL-STACK PROJECTCopy-paste this exact prompt:

Create InsForge full-stack project "hypeoracle-fullstack" with Next.js template.
Enable: Postgres, Realtime, Storage, AI Gateway (Groq), Edge Functions, Site Deployment.

Create tables:
1. vibes_raw (id, token_mint, user_pubkey, voice_file_url, emoji, sensor_data jsonb, raw_transcript, submitted_at)
2. vibe_scores (id, token_mint, score 0-100, confidence, contributor_count, updated_at)
3. fee_share_claims (id, token_mint, contributor_pubkey, bps, claimed)

Create Edge Function "submit-vibe":
- Accept multipart: voice file (5s), emoji, token_mint, sensor_data JSON
- Upload voice to InsForge Storage → get URL
- Use Groq AI Gateway: Whisper → transcript + Llama-3.1 emotion analysis
- Calculate score EXACTLY: score = (excitement * 0.6) + (volume/energy from sensor_data * 0.3) + emoji weight (0-100)
- Insert raw data + update vibe_scores (aggregate live)
- If score > 80: @bagsfm/bags-sdk → small auto-buy (0.01 SOL) + add contributor to dynamic fee share
- Return {vibeScore, message, success}

Reply with Project ID and live URL.

Commit: "PHASE 1 COMPLETE – InsForge + tables + submit-vibe (with exact scoring formula)"PHASE 2: FRONTEND SETUPCopy-paste this exact prompt:

Inside InsForge Next.js frontend:
- Install: @solana/wallet-adapter-react @solana/wallet-adapter-wallets @solana/web3.js @solana/actions @bagsfm/bags-sdk recharts lucide-react
- shadcn/ui + Tailwind + dark mode
- Solana wallet adapter
- /dashboard page:
  - "HypeOracle" header
  - Token mint search
  - Animated gauge (score 0-100, 🔥 when >80)
  - Recharts history chart
  - Leaderboard
  - "SEND HYPE" modal: emoji picker + 5s MediaRecorder + sensor toggle (mic volume + accelerometer)

Commit: "PHASE 2 COMPLETE – Frontend + wallet"PHASE 3: REALTIME + BLINKS + VIBE FLOWCopy-paste this exact prompt:

Connect to InsForge Realtime (subscribe vibe_scores by token_mint).
Full SEND HYPE flow: record → upload → call submit-vibe → animated score.
Create Blinks/Actions for shareable "Send Hype on [Token]".
Add "Hype Trade" one-click buy button when score high.

Commit: "PHASE 3 COMPLETE – Realtime + Blinks + full flow"PHASE 4: BAGS.FM INTEGRATIONSCopy-paste this exact prompt:

Enhance submit-vibe: high score triggers @bagsfm/bags-sdk auto-buy + dynamic fee recipient.
Create "claim-fees" Edge Function.
Add "My Hype Earnings" page.

Commit: "PHASE 4 COMPLETE – Bags trading + fee sharing"PHASE 5: POLISH & TESTINGCopy-paste this exact prompt:

Polish: animations, mobile PWA, error handling, analytics (vibes count).
Full test: connect wallet → search token → send vibes → see realtime score + trade + fees.

Commit: "PHASE 5 COMPLETE – Polish & tested"PHASE 6: DEPLOYMENTCopy-paste this exact prompt:

Deploy full app on InsForge. Provide live URL.

Commit: "PHASE 6 COMPLETE – Live on InsForge"FUTURE PHASE 7: BONDING-CURVE TOKEN LAUNCH (after traction)When we have users:Use Bags SDK + Meteora Dynamic Bonding Curve to launch $HYPE token.
Set creator fee 1% + dynamic fee-share from HypeOracle oracle.

FINAL RULES FOR AI AGENTUse exact scoring formula.
Emphasize DePIN sensors in comments/code.
All in InsForge only.
Token = bonding curve (post-MVP).

Start with PHASE 1 now.

