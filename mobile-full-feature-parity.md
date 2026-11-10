# Plan: HypeOracle Mobile Full Feature Parity

This document outlines the end-to-end implementation to bring 100% of the Web application features to the React Native (Expo) mobile application (`hypeoracle-mobile`), incorporating the 5-bottom-tab thumb-friendly architecture and in-app Solana wallet.

---

## Project Type
**MOBILE** (React Native / Expo SDK 56 + InsForge Backend + Solana Web3)

---

## Success Criteria
1. **5 Bottom Navigation Tabs**: `[RECORD | MARKET | PREDICT | COMMUNITY | HUB]` in `App.tsx` ensuring thumb-friendly 1-tap access to all primary features.
2. **Dedicated Market Screen (`MarketScreen.tsx`)**: Real-time token sentiment leaderboard, Bags.fm bonding-curve progress, and lightweight 60fps SVG trend charts (`react-native-svg`).
3. **Dedicated Community Screen (`CommunityScreen.tsx`)**: Quests hub, referral link generator with native share sheet (`Share` / `expo-clipboard`), campaign leaderboards, and quest completion verification.
4. **First-Class In-App Wallet**: Front-and-center inside `Hub`, featuring SOL and SPL token balances, send/receive modals, and secure local key management.
5. **Dynamic Soulprint NFT & Evolving Tiers**: Dynamic SVG tier badge visualizer (Genesis, Sentinel, Elite, Legendary) and direct Metaplex NFT minting integration.

---

## File Architecture

```
hypeoracle-mobile/
├── App.tsx                                  # Updated with 5 bottom tabs & Hub navigation
└── src/
    ├── screens/
    │   ├── RecordScreen.tsx                 # [Existing] DePIN microphone & accelerometer
    │   ├── MarketScreen.tsx                 # [NEW] Bags.fm trading & sentiment intelligence
    │   ├── PredictScreen.tsx                # [Existing] Prediction markets
    │   ├── CommunityScreen.tsx              # [NEW] Quests, referrals, and XP leaderboards
    │   ├── WalletHub.tsx                    # [Existing] In-App Solana wallet
    │   ├── SoulprintScreen.tsx              # [Updated] Dynamic SVG Tier badges & Metaplex minting
    │   ├── AgentScreen.tsx                  # [Existing] Autonomous AI trading agent
    │   ├── StakeScreen.tsx                  # [Existing] Token staking & tiers
    │   ├── EarningsScreen.tsx               # [Existing] Dynamic fee sharing
    │   └── OracleFeedScreen.tsx             # [Existing] Oracle publications
    └── lib/
        ├── insforge.ts                      # Client connection
        └── secure-store.ts                  # DePIN keychain & in-app wallet
```

---

## Implementation Steps

### Step 1: Create `CommunityScreen.tsx`
- Implement social, audio, and DePIN check-in quests.
- Connect to InsForge `community_quests`, `community_campaigns`, and `community_participants`.
- Add native Referral link generator and native `Share.share()` sheet.
- Add XP Leaderboard with user rank badge.

### Step 2: Create `MarketScreen.tsx`
- Implement live sentiment score cards for popular Solana tokens (SOL, HYPE, BONK, etc.).
- Build lightweight SVG sparkline area chart component for 60fps mobile performance.
- Display Bags.fm bonding curve progress, 24h sentiment shifts, and 1-tap Hype Swap execution.

### Step 3: Enhance `SoulprintScreen.tsx` with Dynamic Evolving Tiers
- Render visual Soulprint badge corresponding to tier (Level 1 Genesis Orange, Level 2 Sentinel Green, Level 3 Elite Cyan, Level 4 Legendary Gold).
- Implement 1-tap "Mint Dynamic Soulprint NFT" invoking the `mint-soulprint-nft` edge function with in-app wallet signature.

### Step 4: Update `App.tsx` Navigation & In-App Wallet Prominence
- Reconfigure bottom tab bar to 5 items:
  - `record` (Mic)
  - `market` (TrendingUp)
  - `predict` (Sparkles)
  - `community` (Users)
  - `hub` (Wallet / Cpu)
- Ensure In-App Wallet balance and address are prominently displayed in the top bar with quick-switch and backup options.

### Step 5: Verification & Quality Audit
- TypeScript type checking.
- Verify touch targets (>48px compliant).
- Validate safe area handling, keyboard avoiding views, and dark mode theme consistency.

