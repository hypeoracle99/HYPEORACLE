'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  TrendingUp, Zap, Clock, ShieldAlert, Award, 
  HelpCircle, CheckCircle2, ChevronRight, Loader2, Coins, ArrowUpRight 
} from 'lucide-react';
import { AmbientBackground } from '@/components/ui-primitives';

// Cyberpunk Historical Sentiment mini-trend SVG chart (Color rule compliant)
function VibeMiniChart({ tokenMint, targetScore, status, outcome }: { tokenMint: string; targetScore: number; status: string; outcome?: string }) {
  const padding = 3;
  const height = 45;
  const width = 220;

  const points = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < tokenMint.length; i++) {
      seed += tokenMint.charCodeAt(i);
    }
    
    const count = 10;
    const values: number[] = [];
    let current = 50 + (seed % 20); // start around 50-70
    
    for (let i = 0; i < count; i++) {
      const stepSeed = Math.sin(seed + i) * 15;
      current = Math.max(30, Math.min(95, current + stepSeed));
      values.push(current);
    }

    if (status === 'resolved') {
      if (outcome === 'yes') {
        values[count - 1] = Math.max(targetScore + 3, values[count - 1]);
      } else {
        values[count - 1] = Math.min(targetScore - 3, values[count - 1]);
      }
    }
    
    return values;
  }, [tokenMint, targetScore, status, outcome]);

  const svgPoints = useMemo(() => {
    const step = width / (points.length - 1);
    
    return points.map((p, i) => {
      const x = i * step;
      const y = padding + ((95 - p) / (95 - 30)) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [points]);

  const targetY = useMemo(() => {
    return padding + ((95 - targetScore) / (95 - 30)) * (height - padding * 2);
  }, [targetScore]);

  const strokeColor = status === 'resolved' 
    ? (outcome === 'yes' ? '#22c55e' : '#ef4444') 
    : '#FF6B1A';

  return (
    <div className="mt-3 p-2 rounded-xl bg-black/50 border border-white/5 flex items-center justify-between gap-3">
      <div className="flex flex-col text-left shrink-0">
        <span className="text-[7.5px] font-mono text-white/40 uppercase tracking-widest">SENTIMENT TREND</span>
        <span className="text-[10px] font-mono text-white/70 mt-0.5">
          Target: <strong className="text-orange-400 font-bold">{targetScore.toFixed(0)}</strong>
        </span>
      </div>
      <div className="relative flex-1 h-[32px] overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 220 45" preserveAspectRatio="none">
          <line 
            x1="0" 
            y1={targetY} 
            x2="220" 
            y2={targetY} 
            stroke="rgba(255,107,26,0.2)" 
            strokeWidth="1" 
            strokeDasharray="3,3" 
          />
          <defs>
            <linearGradient id={`grad-${tokenMint}-${status}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path
            d={`M 0,45 L ${svgPoints} L 220,45 Z`}
            fill={`url(#grad-${tokenMint}-${status})`}
          />
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
            points={svgPoints}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.length > 0 && (
            <circle
              cx="220"
              cy={padding + ((95 - points[points.length - 1]) / (95 - 30)) * (45 - padding * 2)}
              r="2.5"
              fill={strokeColor}
            />
          )}
        </svg>
      </div>
    </div>
  );
}

export default function PredictCenter() {
  const { publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState<'markets' | 'my-bets' | 'resolved'>('markets');
  
  // Data States
  const [markets, setMarkets] = useState<any[]>([]);
  const [bets, setBets] = useState<any[]>([]);
  const [stakedAmount, setStakedAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal States
  const [selectedMarket, setSelectedMarket] = useState<any>(null);
  const [betPrediction, setBetPrediction] = useState<'yes' | 'no'>('yes');
  const [betAmount, setBetAmount] = useState<string>('0.05');

  // Admin Oracle Pool Creator States
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [newMarketTokenMint, setNewMarketTokenMint] = useState('5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS');
  const [customTokenMint, setCustomTokenMint] = useState('');
  const [newMarketQuestion, setNewMarketQuestion] = useState('');
  const [newMarketTargetScore, setNewMarketTargetScore] = useState('75');
  const [newMarketTimeframe, setNewMarketTimeframe] = useState('3'); // 3 days default
  const [customResolutionDate, setCustomResolutionDate] = useState('');
  const [creatorSubmitting, setCreatorSubmitting] = useState(false);
  const [creatorError, setCreatorError] = useState<string | null>(null);
  const [creatorSuccess, setCreatorSuccess] = useState<string | null>(null);

  // Load Prediction Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Load Markets
      const marketsRes = await fetch('/api/predict/create');
      const marketsJson = await marketsRes.json();
      if (marketsJson.error) throw new Error(marketsJson.error);
      setMarkets(marketsJson.data || []);

      // 2. Load User Bets and Staking details if wallet is connected
      if (publicKey) {
        const betsRes = await fetch(`/api/predict/bet?userPubkey=${publicKey.toBase58()}`);
        const betsJson = await betsRes.json();
        if (betsJson.error) throw new Error(betsJson.error);
        setBets(betsJson.data || []);
        setStakedAmount(betsJson.stakedAmount || 0);
      } else {
        setStakedAmount(0);
      }
    } catch (err: any) {
      console.error('[PredictCenter] Load error:', err);
      setError('Failed to sync prediction pools. Retrying connection.');
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Placing a Bet
  async function handlePlaceBet() {
    if (!publicKey) {
      setError('Connect your wallet first to stake a prediction.');
      return;
    }
    if (!selectedMarket || !betAmount) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/predict/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: selectedMarket.id,
          userPubkey: publicKey.toBase58(),
          prediction: betPrediction,
          amount: betAmount
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to submit position');
      }

      setSuccessMsg(`Position logged! staked ${betAmount} SOL on ${betPrediction.toUpperCase()}.`);
      setSelectedMarket(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Transaction submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Claiming Payouts
  async function handleClaimPayout(betId: string) {
    if (!publicKey) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/predict/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claim',
          betId,
          userPubkey: publicKey.toBase58()
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Payout claim failed');
      }

      setSuccessMsg(json.message || 'Winnings claimed successfully!');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Claim transaction failed.');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Debug Resolution (Allows manual resolution testing in hackathon context)
  async function handleDebugResolve(marketId: string) {
    if (!publicKey || publicKey.toBase58() !== 'BBz7heBU32GENqiBqEVVCfFoc8QcJJduezjpN6oesKaP') {
      setError('Unauthorized: Only the designated admin wallet can resolve pools.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/predict/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          marketId,
          adminPubkey: publicKey.toBase58()
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Pool resolution failed');
      }

      setSuccessMsg(`Market resolved successfully! Final Oracle Vibe Score: ${json.data.final_score}. Outcome: ${json.data.outcome.toUpperCase()}`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Resolution failed.');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Admin Market Creation
  async function handleCreateMarket(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey || publicKey.toBase58() !== 'BBz7heBU32GENqiBqEVVCfFoc8QcJJduezjpN6oesKaP') {
      setCreatorError('Unauthorized: Only the designated admin wallet can create prediction pools.');
      return;
    }

    const mint = newMarketTokenMint === 'custom' ? customTokenMint : newMarketTokenMint;
    if (!mint || mint.trim().length < 32) {
      setCreatorError('Please enter a valid Solana token mint address.');
      return;
    }

    if (!newMarketQuestion || newMarketQuestion.trim().length < 10) {
      setCreatorError('Please enter a descriptive sentiment question (min 10 characters).');
      return;
    }

    const target = parseFloat(newMarketTargetScore);
    if (isNaN(target) || target < 0 || target > 100) {
      setCreatorError('Target sentiment score must be between 0 and 100.');
      return;
    }

    let resDate = '';
    if (newMarketTimeframe === 'custom') {
      if (!customResolutionDate) {
        setCreatorError('Please select a custom resolution date.');
        return;
      }
      resDate = new Date(customResolutionDate).toISOString();
    } else {
      const days = parseInt(newMarketTimeframe);
      resDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    setCreatorSubmitting(true);
    setCreatorError(null);
    setCreatorSuccess(null);

    try {
      const res = await fetch('/api/predict/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenMint: mint,
          question: newMarketQuestion,
          targetScore: target,
          resolutionDate: resDate,
          adminPubkey: publicKey.toBase58()
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to create prediction market pool.');
      }

      setCreatorSuccess(`Market successfully created! Token Mint: ${mint.slice(0, 4)}...${mint.slice(-4)}`);
      setNewMarketQuestion('');
      setCustomTokenMint('');
      await loadData();
    } catch (err: any) {
      setCreatorError(err.message || 'Failed to submit prediction market to oracle database.');
    } finally {
      setCreatorSubmitting(false);
    }
  }

  // Calculate dynamic simulated payouts for the modal including staker boosts
  const simulatedPayout = useMemo(() => {
    if (!selectedMarket) return { gross: 0, net: 0, odds: 0, fee: 1.0, multiplier: 1.0, tierName: 'Base Oracle' };
    const yesPool = parseFloat(selectedMarket.total_yes_pool || '0');
    const noPool = parseFloat(selectedMarket.total_no_pool || '0');
    const userBet = parseFloat(betAmount || '0');
    
    if (isNaN(userBet) || userBet <= 0) return { gross: 0, net: 0, odds: 0, fee: 1.0, multiplier: 1.0, tierName: 'Base Oracle' };

    const totalPool = yesPool + noPool + userBet;
    const winningPool = betPrediction === 'yes' ? yesPool + userBet : noPool + userBet;

    const gross = (userBet / winningPool) * totalPool;
    
    // Apply dynamic staking tier calculations matching the resolve API
    let feeDiscount = 0;
    let multiplier = 1.0;
    let tierName = 'Base Oracle';

    if (stakedAmount >= 10000) {
      feeDiscount = 1.0; // 0% fee (100% discount)
      multiplier = 1.05; // 5% payout boost
      tierName = 'Vibe Prophet';
    } else if (stakedAmount >= 1000) {
      feeDiscount = 0.5; // 0.5% fee (50% discount)
      multiplier = 1.02; // 2% payout boost
      tierName = 'Sentiment Seer';
    }

    const appliedFee = 1.0 * (1 - feeDiscount);
    const net = gross * (1 - (appliedFee / 100)) * multiplier;
    const odds = userBet > 0 ? net / userBet : 1;

    return {
      gross: parseFloat(gross.toFixed(4)),
      net: parseFloat(net.toFixed(4)),
      odds: parseFloat(odds.toFixed(2)),
      fee: appliedFee,
      multiplier,
      tierName
    };
  }, [selectedMarket, betPrediction, betAmount, stakedAmount]);

  // Filters for Tabs
  const activeMarkets = markets.filter(m => m.status === 'active');
  const resolvedMarkets = markets.filter(m => m.status === 'resolved');

  return (
    <div className="relative min-h-screen pb-20">
      <AmbientBackground />

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-24">
        
        {/* Header Section */}
        <section className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
              <TrendingUp className="w-3.5 h-3.5" /> SENTIMENT PREDICTION MARKET
            </div>
          </div>
          <h1 className="display-heading text-[clamp(2rem,6vw,4.5rem)] mb-3 leading-[1] font-sans tracking-tighter">
            <span className="gradient-text-fire">VIBE</span> <span className="text-white">PROPHET</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/60 max-w-xl mx-auto leading-relaxed">
            Bet on future average sentiment metrics of Solana tokens. Markets resolve automatically using verifiable DePIN sound &amp; motion sensor oracle aggregates.
          </p>
        </section>

        {/* Global Action Banners */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 rounded-xl border bg-red-950/10 border-red-500/20 text-red-400 flex items-start gap-3 w-full"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-xs font-mono">
                <span className="font-bold">SYSTEM WARNING</span>: {error}
              </div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 rounded-xl border bg-green-950/10 border-green-500/20 text-green-400 flex items-start gap-3 w-full"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-xs font-mono">
                <span className="font-bold">TRANSACTION SUCCESS</span>: {successMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Staking & Wallet Dashboard Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Markets Active', value: activeMarkets.length, desc: 'Live sentiment pools' },
            { label: 'Staked $HYPE', value: publicKey ? `${stakedAmount.toLocaleString()} HYPE` : 'NO WALLET', desc: stakedAmount >= 1000 ? 'Boost multiplier active' : 'Stake HYPE to unlock boosts' },
            { 
              label: 'Active Boost Tier', 
              value: stakedAmount >= 10000 ? 'VIBE PROPHET' : stakedAmount >= 1000 ? 'SENTIMENT SEER' : 'BASE ORACLE', 
              desc: stakedAmount >= 10000 ? '+5% Winnings / 0% Payout Fee' : stakedAmount >= 1000 ? '+2% Winnings / 0.5% Payout Fee' : '1.0x Payouts / 1.0% Payout Fee'
            },
            { 
              label: 'Node Connection', 
              value: publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : 'DISCONNECTED',
              desc: publicKey ? 'Node active & calibrated' : 'Connect Solana wallet to play'
            }
          ].map((card, i) => (
            <div 
              key={card.label} 
              className="p-4 rounded-xl border bg-black/30 text-left flex flex-col justify-between"
              style={{ borderColor: 'rgba(255, 107, 26, 0.1)' }}
            >
              <div>
                <p className="mono-label uppercase tracking-widest text-[8.5px] text-orange-400/80">{card.label}</p>
                <p className="font-display font-extrabold text-sm text-white mt-1 uppercase tracking-tight">{card.value}</p>
              </div>
              <p className="text-[9px] font-mono text-white/40 mt-2 leading-tight">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Admin Oracle Pool Creator (only visible if admin wallet is connected) */}
        <AnimatePresence>
          {publicKey && publicKey.toBase58() === 'BBz7heBU32GENqiBqEVVCfFoc8QcJJduezjpN6oesKaP' && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden animate-fade-in"
            >
              <div 
                className="p-5 rounded-2xl border bg-black/40 text-left flex flex-col gap-4 relative overflow-hidden"
                style={{ borderColor: 'rgba(255, 107, 26, 0.15)' }}
              >
                {/* Glowing subtle background dot */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400">
                      <Zap className="w-3.5 h-3.5 animate-pulse" />
                    </span>
                    <div>
                      <h3 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">
                        Oracle Pool Creator
                      </h3>
                      <p className="text-[9px] font-mono text-white/40">ADMIN PREDICTIVE INDEX CONTROL PANEL</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatorOpen(!isCreatorOpen);
                      setCreatorError(null);
                      setCreatorSuccess(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] font-mono font-bold transition-all cursor-pointer"
                  >
                    {isCreatorOpen ? '[✕ HIDE PANEL]' : '[🛠️ SHOW PANEL]'}
                  </button>
                </div>

                {isCreatorOpen && (
                  <motion.form
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleCreateMarket}
                    className="flex flex-col gap-4"
                  >
                    {/* Warning & Success banners inside form */}
                    {creatorError && (
                      <div className="p-3 rounded-xl border bg-red-950/15 border-red-500/20 text-red-400 text-[10px] font-mono flex items-start gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{creatorError}</span>
                      </div>
                    )}
                    {creatorSuccess && (
                      <div className="p-3 rounded-xl border bg-green-950/15 border-green-500/20 text-green-400 text-[10px] font-mono flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{creatorSuccess}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Token Mint Dropdown & Custom Address */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9.5px] font-mono text-white/50 tracking-widest uppercase">
                          Target Token Mint
                        </label>
                        <select
                          value={newMarketTokenMint}
                          onChange={(e) => setNewMarketTokenMint(e.target.value)}
                          className="p-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs outline-none focus:border-orange-500/40 cursor-pointer"
                        >
                          <option value="5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS">$HYPE (Current Protocol Token)</option>
                          <option value="Bags222222222222222222222222222222222222222">$SOL (Solana Native)</option>
                          <option value="DePIN11111111111111111111111111111111111111">$BONK (Meme Aggregate)</option>
                          <option value="Wif444444444444444444444444444444444444444">$WIF (Sentiment Standard)</option>
                          <option value="custom">-- Custom Token Mint --</option>
                        </select>

                        {newMarketTokenMint === 'custom' && (
                          <input
                            type="text"
                            value={customTokenMint}
                            onChange={(e) => setCustomTokenMint(e.target.value)}
                            placeholder="Enter Solana Mint Address..."
                            className="mt-2 p-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs placeholder:text-white/25 outline-none focus:border-orange-500/40"
                          />
                        )}
                      </div>

                      {/* Target Score Selection */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9.5px] font-mono text-white/50 tracking-widest uppercase">
                          Target Sentiment Score (0 - 100)
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="10"
                            max="90"
                            value={newMarketTargetScore}
                            onChange={(e) => setNewMarketTargetScore(e.target.value)}
                            className="flex-1 accent-orange-500 cursor-pointer bg-white/10 rounded-lg h-2"
                          />
                          <span className="w-12 text-center p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono text-xs font-bold">
                            {newMarketTargetScore}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Question text box */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9.5px] font-mono text-white/50 tracking-widest uppercase">
                        Vibe Sentiment Question
                      </label>
                      <input
                        type="text"
                        value={newMarketQuestion}
                        onChange={(e) => setNewMarketQuestion(e.target.value)}
                        placeholder="e.g. Will $SOL cross 80 during next party vibe cycle?"
                        className="p-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs placeholder:text-white/25 outline-none focus:border-orange-500/40"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Expiration Timeframe Selection */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9.5px] font-mono text-white/50 tracking-widest uppercase">
                          Oracle Resolution Timeframe
                        </label>
                        <select
                          value={newMarketTimeframe}
                          onChange={(e) => setNewMarketTimeframe(e.target.value)}
                          className="p-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs outline-none focus:border-orange-500/40 cursor-pointer"
                        >
                          <option value="1">1 Day (Quick resolution)</option>
                          <option value="3">3 Days (Medium timeframe)</option>
                          <option value="7">7 Days (Standard weekly cycle)</option>
                          <option value="custom">-- Custom Date & Time --</option>
                        </select>

                        {newMarketTimeframe === 'custom' && (
                          <input
                            type="datetime-local"
                            value={customResolutionDate}
                            onChange={(e) => setCustomResolutionDate(e.target.value)}
                            className="mt-2 p-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs outline-none focus:border-orange-500/40 cursor-pointer"
                          />
                        )}
                      </div>

                      {/* Form Submission Action */}
                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={creatorSubmitting}
                          className="w-full p-3 rounded-xl font-display font-extrabold text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2 border hover:shadow-[0_0_15px_rgba(255,107,26,0.15)] cursor-pointer"
                          style={{
                            background: 'linear-gradient(135deg, #FF6B1A 0%, #FF8C42 100%)',
                            borderColor: '#FF6B1A',
                            color: '#ffffff',
                          }}
                        >
                          {creatorSubmitting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                              LOGGING POOL TO ORACLE CONTEXT...
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5 text-white" />
                              LAUNCH PREDICTIVE ORACLE POOL
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Selection pills */}
        <div className="flex items-center gap-1.5 mb-6 border-b border-white/5 pb-4">
          {[
            { id: 'markets', label: 'Active Markets', count: activeMarkets.length },
            { id: 'my-bets', label: 'My Bets', count: publicKey ? bets.length : 0 },
            { id: 'resolved', label: 'Past Resolutions', count: resolvedMarkets.length }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-display font-extrabold transition-all"
                style={{
                  background: isActive ? 'rgba(255,107,26,0.12)' : 'rgba(255,255,255,0.02)',
                  border: `1.5px solid ${isActive ? 'rgba(255,107,26,0.25)' : 'rgba(255,255,255,0.04)'}`,
                  color: isActive ? '#FF8C42' : 'rgba(255,255,255,0.4)',
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-black/40 border border-white/10 text-white/60">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}

          <div className="flex-1" />

          {/* Quick Wallet multi-button inside layout */}
          <WalletMultiButton className="!h-9 !py-0 !px-4 !text-xs !bg-orange-500/10 hover:!bg-orange-500/20 !border !border-orange-500/30 !rounded-xl !text-orange-400 !font-display !font-bold transition-all" />
        </div>

        {/* MAIN DISPLAY LOOP */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-[10px] font-mono text-white/50 tracking-wider">SYNCING DEPIN CONSENSUS POOLS...</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Active Markets Tab */}
            {activeTab === 'markets' && (
              activeMarkets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeMarkets.map((market) => {
                    const yesPool = parseFloat(market.total_yes_pool || '0');
                    const noPool = parseFloat(market.total_no_pool || '0');
                    const total = yesPool + noPool;
                    const yesPct = total > 0 ? (yesPool / total) * 100 : 50;
                    
                    return (
                      <motion.div
                        layout
                        key={market.id}
                        className="p-5 rounded-2xl border bg-black/40 text-left flex flex-col justify-between group"
                        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                      >
                        <div>
                          {/* Top Info Bar */}
                          <div className="flex justify-between items-center mb-3">
                            <span className="px-2 py-0.5 rounded bg-orange-500/15 border border-orange-500/20 text-orange-400 text-[8px] font-mono uppercase tracking-widest">
                              {market.token_mint.slice(0, 4)}...{market.token_mint.slice(-4)}
                            </span>
                            <span className="text-[9px] font-mono text-white/40 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-orange-500/70" /> 
                              {new Date(market.resolution_date).toLocaleDateString()}
                            </span>
                          </div>

                          <h3 className="font-display font-extrabold text-sm text-white leading-snug pr-3">
                            {market.question}
                          </h3>

                          {/* Historical Trend Wave SVG */}
                          <VibeMiniChart 
                            tokenMint={market.token_mint} 
                            targetScore={parseFloat(market.target_score)} 
                            status="active" 
                          />

                          {/* Dynamic YES vs NO pools bar */}
                          <div className="mt-4 mb-3">
                            <div className="flex justify-between text-[9px] font-mono text-white/60 mb-1">
                              <span>YES: {yesPct.toFixed(0)}% ({yesPool.toFixed(2)} SOL)</span>
                              <span>NO: {(100 - yesPct).toFixed(0)}% ({noPool.toFixed(2)} SOL)</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/5 overflow-hidden flex border border-white/5">
                              <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400" style={{ width: `${yesPct}%` }} />
                              <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 animate-pulse" style={{ width: `${100 - yesPct}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Bet & Resolution Actions */}
                        <div className="mt-4 flex gap-2 items-center">
                          <button
                            onClick={() => setSelectedMarket(market)}
                            className="flex-1 py-2 px-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 text-orange-400 font-display font-extrabold text-xs tracking-wider transition-all"
                          >
                            PLACE PREDICTION
                          </button>
                          
                          {/* Hackathon Manual Resolve triggers (only visible if admin wallet connected) */}
                          {publicKey && publicKey.toBase58() === 'BBz7heBU32GENqiBqEVVCfFoc8QcJJduezjpN6oesKaP' && (
                            <button
                              onClick={() => handleDebugResolve(market.id)}
                              disabled={submitting}
                              className="py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-[10px] font-mono transition-all flex items-center gap-1 cursor-pointer"
                              title="Simulate Oracle Resolution"
                            >
                              <Zap className="w-3 h-3 text-orange-400" /> RESOLVE
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center border border-dashed border-white/5 rounded-2xl">
                  <p className="text-3xl mb-2">📡</p>
                  <p className="font-display font-bold text-xs text-white">NO ACTIVE PREDICTION POOLS</p>
                  <p className="text-[10px] font-mono text-white/40 mt-0.5">Vibe index scanning is active. Check back for fresh pools shortly.</p>
                </div>
              )
            )}

            {/* My Bets Tab */}
            {activeTab === 'my-bets' && (
              !publicKey ? (
                <div className="py-20 text-center border border-dashed border-white/5 rounded-2xl flex flex-col items-center gap-3">
                  <p className="text-3xl">🔑</p>
                  <div>
                    <p className="font-display font-bold text-xs text-white uppercase tracking-wider">WALLET NODE OFFLINE</p>
                    <p className="text-[10px] font-mono text-white/40 mt-0.5">Please connect your Solana wallet to load your position board.</p>
                  </div>
                  <WalletMultiButton className="!h-9 !py-0 !px-4 !text-xs !bg-orange-500/10 hover:!bg-orange-500/20 !border !border-orange-500/30 !rounded-xl !text-orange-400 !font-display !font-bold transition-all" />
                </div>
              ) : bets.length > 0 ? (
                <div className="space-y-3">
                  {bets.map((bet) => {
                    const isResolved = bet.market?.status === 'resolved';
                    const isWinner = isResolved && bet.prediction === bet.market?.outcome;
                    
                    return (
                      <div 
                        key={bet.id}
                        className="p-4 rounded-xl border bg-black/40 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-left"
                        style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                      >
                        <div className="flex-1">
                          <p className="text-[10px] font-mono text-orange-400/80 tracking-widest uppercase">
                            {bet.market?.question}
                          </p>
                          <div className="flex gap-4 mt-1.5 flex-wrap">
                            <span className="text-[10px] font-mono text-white/60">
                              POSITION: <strong className="text-white uppercase">{bet.prediction}</strong>
                            </span>
                            <span className="text-[10px] font-mono text-white/60">
                              STAKE: <strong className="text-white">{bet.amount} SOL</strong>
                            </span>
                            {isResolved && (
                              <span className="text-[10px] font-mono text-white/60">
                                OUTCOME: <strong className="text-white uppercase">{bet.market?.outcome}</strong> (Score {bet.market?.final_score})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Position Payout State */}
                        <div>
                          {isResolved ? (
                            isWinner ? (
                              bet.claimed ? (
                                <span className="px-3 py-1 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-mono font-bold tracking-widest uppercase flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> CLAIMED
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleClaimPayout(bet.id)}
                                  disabled={submitting}
                                  className="py-2 px-4 rounded-xl bg-green-500/20 hover:bg-green-500/35 border border-green-500/40 text-green-400 font-display font-extrabold text-xs tracking-wider transition-all flex items-center gap-1 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5 text-green-400" /> CLAIM PAYOUT
                                </button>
                              )
                            ) : (
                              <span className="px-3 py-1 rounded bg-white/5 border border-white/10 text-white/40 text-[10px] font-mono tracking-widest uppercase">
                                RESOLVED LOSS
                              </span>
                            )
                          ) : (
                            <span className="px-3 py-1 rounded bg-orange-500/10 border border-orange-500/25 text-orange-400 text-[10px] font-mono tracking-widest uppercase animate-pulse">
                              LIVE MONITORING
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center border border-dashed border-white/5 rounded-2xl">
                  <p className="text-3xl mb-2">🔮</p>
                  <p className="font-display font-bold text-xs text-white">NO PREDICTIONS LOGGED</p>
                  <p className="text-[10px] font-mono text-white/40 mt-0.5">Explore active markets and stake your conviction to get listed.</p>
                </div>
              )
            )}

            {/* Past Resolutions Tab */}
            {activeTab === 'resolved' && (
              resolvedMarkets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resolvedMarkets.map((market) => {
                    const yesPool = parseFloat(market.total_yes_pool || '0');
                    const noPool = parseFloat(market.total_no_pool || '0');
                    const total = yesPool + noPool;
                    
                    return (
                      <div
                        key={market.id}
                        className="p-5 rounded-2xl border bg-black/40 text-left flex flex-col justify-between"
                        style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/55 text-[8px] font-mono uppercase tracking-widest">
                              Oracle Resolved
                            </span>
                            <span className="text-[9px] font-mono text-white/40 flex items-center gap-1">
                              Final: <strong className="text-orange-400">{market.final_score}</strong>
                            </span>
                          </div>

                          <h3 className="font-display font-extrabold text-sm text-white/80 leading-snug">
                            {market.question}
                          </h3>

                          {/* Historical Trend Wave SVG for Resolved Market */}
                          <VibeMiniChart 
                            tokenMint={market.token_mint} 
                            targetScore={parseFloat(market.target_score)} 
                            status="resolved" 
                            outcome={market.outcome}
                          />

                          {/* Outcome and Pools */}
                          <div className="mt-4 p-3 rounded-xl bg-black/50 border border-white/5 flex justify-between items-center">
                            <div>
                              <p className="text-[8px] font-mono text-white/40 uppercase tracking-widest">WINNING OUTCOME</p>
                              <p className="font-display font-extrabold text-base text-green-400 uppercase tracking-wide mt-0.5">
                                {market.outcome}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] font-mono text-white/40 uppercase tracking-widest">TOTAL POOL SIZE</p>
                              <p className="font-mono font-bold text-sm text-white/85 mt-0.5">
                                {total.toFixed(2)} SOL
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center border border-dashed border-white/5 rounded-2xl">
                  <p className="text-3xl mb-2">📜</p>
                  <p className="font-display font-bold text-xs text-white">NO COMPLETED RESOLUTIONS</p>
                  <p className="text-[10px] font-mono text-white/40 mt-0.5">Historical averages are locked and archived once pools expire.</p>
                </div>
              )
            )}

          </div>
        )}

      </main>

      {/* DETAILED BET POPUP MODAL */}
      <AnimatePresence>
        {selectedMarket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md p-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-orange-500/20 backdrop-blur-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 15, 20, 0.95) 0%, rgba(5, 5, 8, 0.98) 100%)',
              }}
            >
              {/* Glowing gradient backings */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -z-10 pointer-events-none" />

              <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
                <span className="text-[9px] font-mono text-orange-400 tracking-widest uppercase">
                  CALIBRATE PREDICTION
                </span>
                <button
                  onClick={() => setSelectedMarket(null)}
                  className="text-white/40 hover:text-white text-xs font-mono transition-colors"
                >
                  [✕ CLOSE]
                </button>
              </div>

              <h3 className="font-display font-extrabold text-base text-white leading-normal mb-5">
                {selectedMarket.question}
              </h3>

              {/* YES vs NO Conviction Selection Toggle */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { id: 'yes', label: 'STAKE YES', color: 'rgba(255, 107, 26, 0.2)', border: '#FF6B1A', activeColor: '#FF6B1A' },
                  { id: 'no', label: 'STAKE NO', color: 'rgba(6, 182, 212, 0.1)', border: '#06b6d4', activeColor: '#06b6d4' }
                ].map((option) => {
                  const isChoice = betPrediction === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setBetPrediction(option.id as any)}
                      className="py-3 px-4 rounded-xl font-display font-extrabold text-xs tracking-wider transition-all duration-300 flex flex-col items-center gap-1 border"
                      style={{
                        background: isChoice ? option.color : 'rgba(255,255,255,0.02)',
                        borderColor: isChoice ? option.border : 'rgba(255,255,255,0.05)',
                        color: isChoice ? option.activeColor : 'rgba(255,255,255,0.4)'
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {/* Stake input box */}
              <div className="flex flex-col gap-2 mb-5">
                <label className="text-[9px] font-mono text-white/50 tracking-widest uppercase">
                  BET AMOUNT (SOL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="SOL Stake amount"
                    className="flex-1 p-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-sm placeholder:text-white/20 outline-none focus:border-orange-500/40"
                  />
                  <div className="flex gap-1">
                    {['0.05', '0.1', '0.5'].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setBetAmount(amt)}
                        className="px-2.5 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-[10px] font-mono text-white/80 transition-colors"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Staking Multiplier Benefits Panel */}
              <div className="p-3 rounded-xl border border-orange-500/10 mb-4 bg-orange-500/5 text-left">
                <div className="flex justify-between items-center text-[9px] font-mono text-white/50">
                  <span>STAKING TIER:</span>
                  <span className="text-orange-400 font-extrabold tracking-wide uppercase">{simulatedPayout.tierName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5 text-[9px] font-mono text-white/40">
                  <div>Payout Boost: <strong className="text-white">{simulatedPayout.multiplier}x</strong></div>
                  <div>Payout Fee: <strong className="text-white">{simulatedPayout.fee.toFixed(1)}%</strong></div>
                </div>
              </div>

              {/* Odds Payout Simulated Card */}
              <div className="p-4 rounded-xl bg-black/50 border border-white/5 space-y-2 mb-6 text-left">
                <div className="flex justify-between items-center text-[10px] font-mono text-white/60">
                  <span>Simulated Conviction Payout:</span>
                  <span className="text-orange-400 font-bold">{simulatedPayout.gross} SOL</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-white/60">
                  <span>Net Payout (Staker Boosted):</span>
                  <span className="text-green-400 font-bold text-sm">{simulatedPayout.net} SOL</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-white/60">
                  <span>Estimated odds ratio:</span>
                  <span className="text-amber-400 font-bold">{simulatedPayout.odds}x</span>
                </div>
              </div>

              {/* Primary action trigger */}
              <button
                onClick={handlePlaceBet}
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl font-display font-extrabold text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #FF6B1A 0%, #FF8C42 100%)',
                  boxShadow: '0 4px 20px rgba(255, 107, 26, 0.35)',
                  color: '#ffffff',
                }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Coins className="w-4 h-4 text-white" />}
                {submitting ? 'LOGGING TRANSACTION NODE...' : 'CONFIRM PREDICTOR STAKE'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
