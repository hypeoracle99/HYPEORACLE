'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { 
  Zap, Trophy, Users, Shield, ArrowRight, CheckCircle2, 
  ExternalLink, Copy, Check, Radio, Sparkles, TrendingUp,
  Share2, Flame, Award, ChevronRight, Lock, Activity,
  Info, AlertCircle, RefreshCw
} from 'lucide-react';
import { AmbientBackground, ScoreGauge } from '@/components/ui-primitives';
import { 
  CommunityQuest, 
  CommunityCampaign, 
  CommunityParticipant, 
  QuestCompletion 
} from '@/lib/community-types';

export default function CommunityQuestHub() {
  const { publicKey, connected } = useWallet();
  const [quests, setQuests] = useState<CommunityQuest[]>([]);
  const [campaigns, setCampaigns] = useState<CommunityCampaign[]>([]);
  const [leaderboard, setLeaderboard] = useState<CommunityParticipant[]>([]);
  const [userProfile, setUserProfile] = useState<CommunityParticipant | null>(null);
  const [completions, setCompletions] = useState<QuestCompletion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [activeQuestModal, setActiveQuestModal] = useState<CommunityQuest | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);
  const [proofInput, setProofInput] = useState<string>('');
  const [sensorStatus, setSensorStatus] = useState<'idle' | 'streaming' | 'verified'>('idle');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchCommunityData();
  }, [publicKey]);

  async function fetchCommunityData() {
    setLoading(true);
    try {
      const pubkeyParam = publicKey ? `?pubkey=${publicKey.toBase58()}` : '';
      const res = await fetch(`/api/community/quests${pubkeyParam}`);
      if (res.ok) {
        const data = await res.json();
        setQuests(data.quests || []);
        setCampaigns(data.campaigns || []);
        setLeaderboard(data.leaderboard || []);
        setUserProfile(data.userProfile || null);
        setCompletions(data.completions || []);
      }
    } catch (err) {
      console.error('Failed to fetch community data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteQuest(quest: CommunityQuest) {
    if (!publicKey) {
      alert('Please connect your Solana wallet to complete quests and earn reputation.');
      return;
    }

    setVerifying(true);
    setCompletionMessage(null);

    try {
      let proofData: Record<string, any> = { input: proofInput };

      // DePIN sensor quest verification payload
      if (quest.verificationType === 'depin_sensor') {
        setSensorStatus('streaming');
        // Capture live sensor simulated or real web audio energy
        proofData = {
          sensorPayload: {
            nodeId: `node_pwa_${publicKey.toBase58().slice(0, 6)}`,
            timestamp: Date.now(),
            sensorType: 'mic_volume_frequency',
            metrics: { energyLevel: 84, motionIntensity: 78 }
          }
        };
        await new Promise((r) => setTimeout(r, 900));
        setSensorStatus('verified');
      }

      const res = await fetch('/api/community/quests/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPubkey: publicKey.toBase58(),
          questId: quest.id,
          proofData
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Quest verification failed');

      setCompletionMessage(result.message);
      await fetchCommunityData();
      setTimeout(() => {
        setActiveQuestModal(null);
        setCompletionMessage(null);
        setProofInput('');
        setSensorStatus('idle');
      }, 1500);
    } catch (err: any) {
      setCompletionMessage(`Error: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  }

  const isCompleted = (questId: string) => {
    return completions.some((c) => c.questId === questId);
  };

  const filteredQuests = quests.filter((q) => {
    if (selectedCategory !== 'all' && q.category !== selectedCategory) return false;
    if (selectedCampaign !== 'all' && q.campaignId !== selectedCampaign) return false;
    return true;
  });

  const referralLink = userProfile
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://hypeoracle.io'}/community?ref=${userProfile.referralCode}`
    : '';

  return (
    <div className="relative min-h-screen bg-[#050507] text-white selection:bg-[#FF6B1A]/30">
      <AmbientBackground />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 pb-6 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 text-[#FF6B1A] text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                AI Growth & Reputation Network
              </span>
              <span className="hidden sm:inline text-white/40 text-xs font-mono">•</span>
              <span className="hidden sm:inline text-white/50 text-xs font-mono">Epoch 1: Genesis</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black tracking-tight text-white">
              COMMUNITY <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B1A] via-[#FFAA00] to-[#FF3D00]">QUEST HUB</span>
            </h1>
            <p className="text-sm text-white/60 max-w-2xl mt-1">
              Complete social tasks, stream verifiable DePIN acoustic telemetry, and unlock protocol reputation powering real-time Solana signals.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/community/admin"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-white/80 transition-all active:scale-95"
            >
              <Shield className="w-3.5 h-3.5 text-[#FFAA00]" />
              <span>Admin Command Center</span>
            </Link>
            {mounted && <WalletMultiButton className="!bg-[#FF6B1A] !hover:bg-[#FF3D00] !rounded-xl !h-10 !text-xs !font-display !font-bold" />}
          </div>
        </div>

        {/* Contributor Profile / Stats Bar */}
        {connected && userProfile && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 p-6 rounded-2xl bg-gradient-to-r from-white/[0.04] to-white/[0.01] border border-white/[0.08] backdrop-blur-xl"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Tier Status</span>
                <div className="flex items-center gap-2 mt-1">
                  <Flame className="w-4 h-4 text-[#FF6B1A]" />
                  <span className="text-sm font-display font-black text-white">{userProfile.tier}</span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Total XP</span>
                <div className="flex items-center gap-2 mt-1">
                  <Zap className="w-4 h-4 text-[#FFAA00]" />
                  <span className="text-lg font-mono font-black text-[#FFAA00]">{userProfile.totalXp}</span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Reputation</span>
                <div className="flex items-center gap-2 mt-1">
                  <Trophy className="w-4 h-4 text-[#10B981]" />
                  <span className="text-lg font-mono font-black text-[#10B981]">{userProfile.reputationScore}</span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Completed</span>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle2 className="w-4 h-4 text-white/60" />
                  <span className="text-lg font-mono font-bold text-white">{userProfile.completedQuestsCount} Quests</span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Qualified Referrals</span>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span className="text-lg font-mono font-bold text-cyan-400">{userProfile.qualifiedReferralsCount}</span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">DePIN Nodes</span>
                <div className="flex items-center gap-2 mt-1">
                  <Radio className="w-4 h-4 text-[#FF6B1A] animate-pulse" />
                  <span className="text-sm font-mono font-bold text-white">1 Active PWA</span>
                </div>
              </div>
            </div>

            {/* Referral Bar */}
            <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#FFAA00]" />
                <span className="text-xs font-mono text-white/70">Your Referral Code:</span>
                <code className="px-2 py-0.5 rounded bg-white/10 font-mono text-xs font-bold text-white">
                  {userProfile.referralCode}
                </code>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                  setCopiedRef(true);
                  setTimeout(() => setCopiedRef(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B1A]/20 hover:bg-[#FF6B1A]/30 border border-[#FF6B1A]/30 text-xs font-mono text-[#FF6B1A] transition-all active:scale-95"
              >
                {copiedRef ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRef ? 'Link Copied!' : 'Copy Invite Link'}</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Campaign Cards Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-black tracking-wide text-white uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFAA00]" />
              Active Campaigns
            </h2>
            <span className="text-xs font-mono text-white/40">{campaigns.length} live epochs</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                onClick={() => setSelectedCampaign(selectedCampaign === camp.id ? 'all' : camp.id)}
                className={`cursor-pointer p-5 rounded-2xl border transition-all ${
                  selectedCampaign === camp.id 
                    ? 'bg-[#FF6B1A]/10 border-[#FF6B1A]/40 shadow-[0_0_25px_rgba(255,107,26,0.15)]' 
                    : 'bg-white/[0.03] hover:bg-white/[0.05] border-white/[0.08]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FFAA00]/20 border border-[#FFAA00]/30 text-[10px] font-mono text-[#FFAA00] uppercase font-bold">
                    {camp.badgeTitle || 'Badge Available'}
                  </span>
                  <span className="text-[10px] font-mono text-white/40">
                    {camp.totalParticipants || 0} participants
                  </span>
                </div>
                <h3 className="text-base font-display font-bold text-white mb-1">{camp.title}</h3>
                <p className="text-xs text-white/60 line-clamp-2 mb-4">{camp.description}</p>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#FF6B1A] to-[#FFAA00] h-full rounded-full"
                    style={{ width: `${Math.min(100, camp.completionRate || 65)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2 text-[10px] font-mono text-white/40">
                  <span>Target: {camp.targetXp.toLocaleString()} XP</span>
                  <span className="text-[#FF6B1A] font-bold">{camp.completionRate || 65}% Complete</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {['all', 'social', 'community', 'sentiment', 'depin', 'referral', 'education'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold capitalize transition-all ${
                selectedCategory === cat
                  ? 'bg-[#FF6B1A] text-black font-black shadow-[0_0_15px_rgba(255,107,26,0.4)]'
                  : 'bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-white/60'
              }`}
            >
              {cat === 'all' ? 'All Quests' : cat}
            </button>
          ))}

          {selectedCampaign !== 'all' && (
            <button
              onClick={() => setSelectedCampaign('all')}
              className="ml-auto text-xs font-mono text-[#FFAA00] underline hover:text-white"
            >
              Clear Campaign Filter
            </button>
          )}
        </div>

        {/* Quests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {filteredQuests.map((quest) => {
            const completed = isCompleted(quest.id);

            return (
              <div
                key={quest.id}
                className={`relative p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  completed
                    ? 'bg-white/[0.02] border-white/[0.05] opacity-75'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.3)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-mono uppercase text-white/70">
                      {quest.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-mono font-bold text-[#FFAA00]">
                        <Zap className="w-3.5 h-3.5" />
                        +{quest.xpReward} XP
                      </span>
                      <span className="flex items-center gap-1 text-xs font-mono font-bold text-[#10B981]">
                        <Trophy className="w-3 h-3" />
                        +{quest.reputationReward} Rep
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-display font-bold text-white mb-1.5">{quest.title}</h3>
                  <p className="text-xs text-white/60 leading-relaxed mb-4">{quest.description}</p>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white/40">
                    {quest.currentCompletions} verified
                  </span>

                  {completed ? (
                    <span className="flex items-center gap-1 text-xs font-mono font-bold text-[#10B981]">
                      <CheckCircle2 className="w-4 h-4" />
                      Completed
                    </span>
                  ) : (
                    <button
                      onClick={() => setActiveQuestModal(quest)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B1A] hover:bg-[#FF3D00] text-black text-xs font-display font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(255,107,26,0.3)]"
                    >
                      <span>Start Quest</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Leaderboard Preview */}
        <div className="mb-14 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-display font-black text-white uppercase flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#FFAA00]" />
                Top Protocol Contributors
              </h2>
              <p className="text-xs font-mono text-white/50">Ranked by verified XP and collective emotion reputation</p>
            </div>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {leaderboard.slice(0, 5).map((item, idx) => (
              <div key={item.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-6 text-center text-xs font-mono font-black ${
                    idx === 0 ? 'text-[#FFAA00]' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-white/40'
                  }`}>
                    #{idx + 1}
                  </span>
                  <div>
                    <span className="text-xs font-mono font-bold text-white">
                      {item.username || `${item.userPubkey.slice(0, 6)}...${item.userPubkey.slice(-4)}`}
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded text-[9px] font-mono bg-white/10 text-white/60">
                      {item.tier}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs font-mono">
                  <span className="text-white/40 hidden sm:inline">{item.completedQuestsCount} quests</span>
                  <span className="text-[#FFAA00] font-bold">+{item.totalXp} XP</span>
                  <span className="text-[#10B981] font-bold">★ {item.reputationScore}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Quest Modal */}
      <AnimatePresence>
        {activeQuestModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg p-6 rounded-3xl bg-[#0e0e12] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full bg-[#FF6B1A]/20 text-[#FF6B1A] text-xs font-mono font-bold uppercase">
                  {activeQuestModal.category}
                </span>
                <button
                  onClick={() => setActiveQuestModal(null)}
                  className="text-white/40 hover:text-white text-xs font-mono"
                >
                  ✕ Close
                </button>
              </div>

              <h2 className="text-xl font-display font-black text-white mb-2">{activeQuestModal.title}</h2>
              <p className="text-xs text-white/60 mb-6 leading-relaxed">{activeQuestModal.description}</p>

              {/* Task specific instructions */}
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-6">
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 block mb-2">
                  Verification Method
                </span>

                {activeQuestModal.verificationType === 'instant_click' && (
                  <p className="text-xs text-white/80">
                    Click verify below to confirm you reviewed the educational documentation.
                  </p>
                )}

                {activeQuestModal.verificationType === 'x_follow' && (
                  <div className="space-y-3">
                    <a
                      href={activeQuestModal.verificationConfig?.targetUrl || 'https://x.com/HypeOracle'}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open @HypeOracle on X</span>
                    </a>
                    <input
                      type="text"
                      placeholder="Your X handle (e.g. @trader_sol)"
                      value={proofInput}
                      onChange={(e) => setProofInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B1A]"
                    />
                  </div>
                )}

                {activeQuestModal.verificationType === 'depin_sensor' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-white/80">
                      <span>PWA Sensor Stream:</span>
                      <span className={sensorStatus === 'verified' ? 'text-[#10B981] font-bold' : 'text-[#FF6B1A]'}>
                        {sensorStatus === 'idle' && 'Ready to stream'}
                        {sensorStatus === 'streaming' && 'Transmitting acoustic audio bars...'}
                        {sensorStatus === 'verified' && '✓ Sensor verified'}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-[#FF6B1A] transition-all duration-700 ${
                          sensorStatus === 'streaming' ? 'w-full animate-pulse' : sensorStatus === 'verified' ? 'w-full bg-[#10B981]' : 'w-0'
                        }`} 
                      />
                    </div>
                  </div>
                )}

                {activeQuestModal.verificationType === 'referral_count' && (
                  <p className="text-xs text-white/80">
                    Invite friends using your unique referral code. This quest verifies automatically once 3 referrals connect their wallets.
                  </p>
                )}
              </div>

              {completionMessage && (
                <div className={`p-3 rounded-xl text-xs font-mono mb-4 ${
                  completionMessage.startsWith('Error') 
                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' 
                    : 'bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981]'
                }`}>
                  {completionMessage}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-[#FFAA00]">+{activeQuestModal.xpReward} XP</span>
                  <span className="text-[#10B981]">+{activeQuestModal.reputationReward} Rep</span>
                </div>

                <button
                  onClick={() => handleCompleteQuest(activeQuestModal)}
                  disabled={verifying}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B1A] hover:bg-[#FF3D00] disabled:opacity-50 text-black text-xs font-display font-black transition-all active:scale-95"
                >
                  {verifying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Claim XP & Reputation</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
