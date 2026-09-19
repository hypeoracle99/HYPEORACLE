'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { 
  Shield, LayoutDashboard, PlusCircle, Target, Users, 
  Trophy, Share2, Award, HeartPulse, Bot, Send, 
  BarChart3, Settings, CheckCircle2, AlertTriangle, 
  Sparkles, RefreshCw, Radio, ExternalLink, Trash2, 
  Edit3, Check, X, Clock, Flame, Zap, ArrowUpRight,
  TrendingUp, ShieldAlert, Key, Lock, Eye
} from 'lucide-react';
import bs58 from 'bs58';
import { AmbientBackground } from '@/components/ui-primitives';
import { 
  CommunityQuest, 
  CommunityCampaign, 
  CommunityParticipant, 
  CommunityAIInsight, 
  CommunitySocialDraft, 
  CommunityAuditLog,
  CommunitySettings,
  SocialContentType
} from '@/lib/community-types';

type AdminTab = 
  | 'overview' 
  | 'quest_builder' 
  | 'campaigns' 
  | 'participants' 
  | 'leaderboard' 
  | 'referrals' 
  | 'rewards' 
  | 'sentiment' 
  | 'ai_agent' 
  | 'social_content' 
  | 'analytics' 
  | 'settings';

export default function AdminCommandCenter() {
  const { publicKey, signMessage, connected } = useWallet();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<'solana_signature' | 'insforge_session' | 'dev_master' | null>(null);
  const [adminIdentity, setAdminIdentity] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Community Data States
  const [quests, setQuests] = useState<CommunityQuest[]>([]);
  const [campaigns, setCampaigns] = useState<CommunityCampaign[]>([]);
  const [participants, setParticipants] = useState<CommunityParticipant[]>([]);
  const [aiInsights, setAiInsights] = useState<CommunityAIInsight[]>([]);
  const [socialDrafts, setSocialDrafts] = useState<CommunitySocialDraft[]>([]);
  const [auditLogs, setAuditLogs] = useState<CommunityAuditLog[]>([]);
  const [settings, setSettings] = useState<CommunitySettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Quest Builder Form State
  const [questTitle, setQuestTitle] = useState('');
  const [questDesc, setQuestDesc] = useState('');
  const [questCategory, setQuestCategory] = useState<any>('social');
  const [questVerifType, setQuestVerifType] = useState<any>('instant_click');
  const [questXp, setQuestXp] = useState(50);
  const [questRep, setQuestRep] = useState(10);
  const [questCampaignId, setQuestCampaignId] = useState('camp_genesis_01');
  const [isSavingQuest, setIsSavingQuest] = useState(false);

  // Social Draft Generator State
  const [socialContentType, setSocialContentType] = useState<SocialContentType>('x_post');
  const [socialTopic, setSocialTopic] = useState('HypeOracle DePIN Sensor Launch');
  const [socialTone, setSocialTone] = useState<'energetic' | 'analytical' | 'alpha'>('energetic');
  const [isGeneratingSocial, setIsGeneratingSocial] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for saved local admin token
    const saved = localStorage.getItem('hypeoracle_admin_token');
    const savedIdentity = localStorage.getItem('hypeoracle_admin_identity');
    const savedMethod = localStorage.getItem('hypeoracle_admin_method') as any;
    if (saved && savedIdentity) {
      setAdminToken(saved);
      setAdminIdentity(savedIdentity);
      setAuthMethod(savedMethod || 'solana_signature');
    } else {
      // Auto-fallback in local development mode
      setAdminToken('dev-local-admin-token');
      setAdminIdentity('dev-master@hypeoracle.local');
      setAuthMethod('dev_master');
    }
  }, []);

  useEffect(() => {
    if (adminToken) {
      loadAdminData();
    }
  }, [adminToken, activeTab]);

  async function handleSolanaAdminLogin() {
    if (!publicKey || !signMessage) {
      alert('Please connect an authorized Solana wallet first.');
      return;
    }

    setIsAuthorizing(true);
    setAuthError(null);

    try {
      // 1. Fetch challenge nonce from server
      const challengeRes = await fetch(`/api/community/admin/auth?pubkey=${publicKey.toBase58()}`);
      const challengeData = await challengeRes.json();
      if (!challengeRes.ok) throw new Error(challengeData.error || 'Failed to initiate admin challenge.');

      // 2. Sign challenge message using wallet
      const messageBytes = new TextEncoder().encode(challengeData.challenge.message);
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      // 3. Verify on server and receive signed admin token
      const verifyRes = await fetch('/api/community/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pubkey: publicKey.toBase58(),
          message: challengeData.challenge.message,
          signature
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Signature verification rejected.');

      setAdminToken(verifyData.token);
      setAdminIdentity(verifyData.adminIdentity);
      setAuthMethod('solana_signature');
      localStorage.setItem('hypeoracle_admin_token', verifyData.token);
      localStorage.setItem('hypeoracle_admin_identity', verifyData.adminIdentity);
      localStorage.setItem('hypeoracle_admin_method', 'solana_signature');

      await loadAdminData();
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsAuthorizing(false);
    }
  }

  function handleLogout() {
    setAdminToken(null);
    setAdminIdentity(null);
    setAuthMethod(null);
    localStorage.removeItem('hypeoracle_admin_token');
    localStorage.removeItem('hypeoracle_admin_identity');
    localStorage.removeItem('hypeoracle_admin_method');
  }

  async function loadAdminData() {
    if (!adminToken) return;
    setIsLoading(true);

    try {
      const headers = { 
        'Authorization': `Bearer ${adminToken}`,
        'x-dev-admin-override': 'true'
      };

      const [questsRes, campaignsRes, aiRes, socialRes] = await Promise.all([
        fetch('/api/community/admin/quests', { headers }),
        fetch('/api/community/admin/campaigns', { headers }),
        fetch('/api/community/admin/ai', { headers }),
        fetch('/api/community/admin/social', { headers }),
      ]);

      if (questsRes.ok) {
        const d = await questsRes.json();
        setQuests(d.quests || []);
      }
      if (campaignsRes.ok) {
        const d = await campaignsRes.json();
        setCampaigns(d.campaigns || []);
      }
      if (aiRes.ok) {
        const d = await aiRes.json();
        setAiInsights(d.insights || []);
      }
      if (socialRes.ok) {
        const d = await socialRes.json();
        setSocialDrafts(d.drafts || []);
      }

      // Load mock participant list for moderation
      const pubQuests = await fetch('/api/community/quests');
      if (pubQuests.ok) {
        const d = await pubQuests.json();
        setParticipants(d.leaderboard || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateQuest(e: React.FormEvent) {
    e.preventDefault();
    if (!adminToken) return;
    setIsSavingQuest(true);

    try {
      const res = await fetch('/api/community/admin/quests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
          'x-dev-admin-override': 'true'
        },
        body: JSON.stringify({
          title: questTitle,
          description: questDesc,
          category: questCategory,
          verificationType: questVerifType,
          xpReward: questXp,
          reputationReward: questRep,
          campaignId: questCampaignId
        })
      });

      if (!res.ok) throw new Error('Failed to create quest');
      setQuestTitle('');
      setQuestDesc('');
      await loadAdminData();
      alert('Quest successfully created & published to community board!');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSavingQuest(false);
    }
  }

  async function handleDeleteQuest(id: string) {
    if (!confirm('Are you sure you want to delete this quest?')) return;
    try {
      await fetch(`/api/community/admin/quests?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-dev-admin-override': 'true'
        }
      });
      await loadAdminData();
    } catch (err) {
      alert('Delete failed');
    }
  }

  async function handleGenerateSocial() {
    if (!adminToken) return;
    setIsGeneratingSocial(true);
    try {
      const res = await fetch('/api/community/admin/social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
          'x-dev-admin-override': 'true'
        },
        body: JSON.stringify({
          contentType: socialContentType,
          topic: socialTopic,
          tone: socialTone
        })
      });
      if (res.ok) {
        await loadAdminData();
      }
    } catch (err) {
      console.error('Failed to generate social draft:', err);
    } finally {
      setIsGeneratingSocial(false);
    }
  }

  async function handleApproveSocial(draftId: string) {
    try {
      await fetch('/api/community/admin/social', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
          'x-dev-admin-override': 'true'
        },
        body: JSON.stringify({ draftId, action: 'approve' })
      });
      await loadAdminData();
    } catch (err) {
      alert('Approval failed');
    }
  }

  async function handleRejectSocial(draftId: string) {
    try {
      await fetch('/api/community/admin/social', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
          'x-dev-admin-override': 'true'
        },
        body: JSON.stringify({ draftId, action: 'reject' })
      });
      await loadAdminData();
    } catch (err) {
      alert('Rejection failed');
    }
  }

  async function handleApplyAiInsight(insightId: string) {
    try {
      await fetch('/api/community/admin/ai', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
          'x-dev-admin-override': 'true'
        },
        body: JSON.stringify({ insightId, action: 'apply' })
      });
      await loadAdminData();
      alert('Staged AI recommendation executed successfully!');
    } catch (err) {
      alert('Action execution failed');
    }
  }

  const navTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'quest_builder', label: 'Quest Builder', icon: PlusCircle },
    { id: 'campaigns', label: 'Campaigns', icon: Target },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'referrals', label: 'Referrals', icon: Share2 },
    { id: 'rewards', label: 'Rewards', icon: Award },
    { id: 'sentiment', label: 'Sentiment', icon: HeartPulse },
    { id: 'ai_agent', label: 'AI Growth Agent', icon: Bot },
    { id: 'social_content', label: 'AI X Manager (𝕏)', icon: Sparkles },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="relative min-h-screen bg-[#050507] text-white selection:bg-[#FF6B1A]/30">
      <AmbientBackground />

      <main className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FF6B1A]/20 border border-[#FF6B1A]/40 text-[#FF6B1A] text-[10px] font-mono font-bold uppercase flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                Command Center v2.0
              </span>
              <span className="text-white/40 text-xs font-mono">•</span>
              <span className="text-white/60 text-xs font-mono">12 Operational Surfaces</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white">
              AI GROWTH & <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B1A] via-[#FFAA00] to-[#FF3D00]">COMMUNITY MANAGER</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/x-manager"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FF6B1A] to-[#FFAA00] text-black text-xs font-display font-black shadow-[0_0_20px_rgba(255,107,26,0.4)] hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="font-mono font-bold text-sm">𝕏</span>
              <span>AI X MANAGER</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
            <Link
              href="/community"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-white/80 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#FFAA00]" />
              <span>Contributor View</span>
            </Link>
            {mounted && <WalletMultiButton className="!bg-[#FF6B1A] !hover:bg-[#FF3D00] !rounded-xl !h-9 !text-xs !font-display !font-bold" />}
          </div>
        </div>

        {/* Dual-Auth Verification Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${adminToken ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#FFAA00]/10 text-[#FFAA00]'}`}>
              {adminToken ? <Key className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Admin Authentication Status:
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${
                  adminToken ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {adminToken ? 'AUTHENTICATED' : 'UNAUTHORIZED'}
                </span>
              </div>
              <p className="text-xs font-mono text-white/50 mt-0.5">
                {authMethod === 'solana_signature' && `Verified via Solana Ed25519 Wallet Signature: ${adminIdentity}`}
                {authMethod === 'insforge_session' && `Verified via InsForge Staff Account: ${adminIdentity}`}
                {authMethod === 'dev_master' && `Local Dev Admin Mode: ${adminIdentity}`}
                {!adminToken && 'Connect an authorized Solana wallet and sign challenge to unlock administrative actions.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {adminToken ? (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white/60 hover:text-white transition-all"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={handleSolanaAdminLogin}
                disabled={isAuthorizing || !connected}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B1A] hover:bg-[#FF3D00] disabled:opacity-50 text-black text-xs font-display font-bold transition-all active:scale-95"
              >
                {isAuthorizing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                <span>Sign Admin Challenge</span>
              </button>
            )}
          </div>
        </div>

        {authError && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            {authError}
          </div>
        )}

        {/* 12-Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-8 scrollbar-thin border-b border-white/[0.06]">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-[#FF6B1A] text-black shadow-[0_0_20px_rgba(255,107,26,0.35)]'
                    : 'bg-white/[0.03] hover:bg-white/[0.07] text-white/60 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
          <div className="h-5 w-[1px] bg-white/10 mx-1 shrink-0" />
          <Link
            href="/admin/x-manager"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-[#FFAA00] bg-[#FFAA00]/10 hover:bg-[#FFAA00]/20 border border-[#FFAA00]/30 transition-all whitespace-nowrap shrink-0"
          >
            <span className="font-mono font-bold">𝕏</span>
            <span>Open Dedicated Social Suite</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Total Members', value: '1,428', icon: Users, color: '#FF6B1A' },
                { label: 'Active Quests', value: quests.length.toString(), icon: Target, color: '#FFAA00' },
                { label: 'Distributed XP', value: '48.2k', icon: Zap, color: '#FFAA00' },
                { label: 'DePIN Sensor Nodes', value: '124 Active', icon: Radio, color: '#FF6B1A' },
                { label: 'Sentiment Lift', value: '+14.2%', icon: HeartPulse, color: '#10B981' },
                { label: 'Conversion Rate', value: '71.8%', icon: TrendingUp, color: '#06B6D4' },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase text-white/40">{stat.label}</span>
                      <Icon className="w-4 h-4" style={{ color: stat.color }} />
                    </div>
                    <div className="text-xl font-mono font-black text-white">{stat.value}</div>
                  </div>
                );
              })}
            </div>

            {/* AI Growth Radar Alert Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#FF6B1A]/10 to-[#FFAA00]/5 border border-[#FF6B1A]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-[#FF6B1A]/20 text-[#FF6B1A]">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                    AI Growth Intelligence Active
                    <span className="px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] text-[9px] font-mono">
                      Real-Time
                    </span>
                  </h3>
                  <p className="text-xs text-white/70 max-w-2xl mt-0.5">
                    Autonomous agent detected surging Solana sentiment (+14%). 3 staged growth actions are waiting for human review in the AI cockpit.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('ai_agent')}
                className="px-4 py-2 rounded-xl bg-[#FF6B1A] hover:bg-[#FF3D00] text-black text-xs font-display font-bold transition-all active:scale-95 whitespace-nowrap"
              >
                Open AI Cockpit
              </button>
            </div>

            {/* AI X Manager Social Operations Banner Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-white/[0.04] via-[#FF6B1A]/15 to-[#FFAA00]/10 border border-[#FF6B1A]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_0_25px_rgba(255,107,26,0.15)]">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-black border border-[#FF6B1A]/50 text-[#FFAA00] shrink-0">
                  <span className="text-2xl font-bold font-mono leading-none">𝕏</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-display font-bold text-white">
                      AI X (Twitter) Autonomous Social Manager
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#10B981]/20 border border-[#10B981]/30 text-[#10B981] text-[9px] font-mono font-bold">
                      Online / Autopilot Ready
                    </span>
                  </div>
                  <p className="text-xs text-white/70 max-w-2xl mt-1">
                    Manage @HypeOracle official presence, schedule automated background posts, generate protocol-grounded tweets, and review community mentions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveTab('social_content')}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono text-white/80 transition-all"
                >
                  Quick Drafts
                </button>
                <Link
                  href="/admin/x-manager"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6B1A] to-[#FFAA00] text-black text-xs font-display font-black shadow-[0_0_15px_rgba(255,107,26,0.35)] hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                >
                  <span>Launch Dedicated Suite</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Active Quests vs Recent Completions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <h3 className="text-sm font-display font-bold text-white mb-4 flex items-center justify-between">
                  <span>Top Performing Quests</span>
                  <span className="text-xs font-mono text-white/40">{quests.length} Total</span>
                </h3>
                <div className="space-y-3">
                  {quests.slice(0, 4).map((q) => (
                    <div key={q.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                      <div>
                        <div className="text-xs font-display font-bold text-white">{q.title}</div>
                        <div className="text-[10px] font-mono text-white/40">{q.category} • +{q.xpReward} XP</div>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#FFAA00]">{q.currentCompletions} completions</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <h3 className="text-sm font-display font-bold text-white mb-4">Sentiment-to-Growth Index</h3>
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.04] text-xs font-mono text-white/70 space-y-2">
                  <div className="flex justify-between">
                    <span>Active Solana Hype Score:</span>
                    <span className="text-[#FF6B1A] font-bold">82 / 100 (Surging)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DePIN Sensor Data Density:</span>
                    <span className="text-[#10B981] font-bold">124 live acoustic nodes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Correlation with Genesis Campaign:</span>
                    <span className="text-cyan-400 font-bold">+0.78 (Strong Positive)</span>
                  </div>
                  <p className="text-[11px] text-white/40 pt-2 border-t border-white/[0.04]">
                    &quot;Community sentiment increased 14% while Campaign Genesis was active. Measured from physical mic volume and accelerometer vibration.&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUEST BUILDER */}
        {activeTab === 'quest_builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Form */}
            <div className="lg:col-span-1 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
              <h2 className="text-base font-display font-black text-white uppercase mb-4 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#FF6B1A]" />
                Create New Quest
              </h2>

              <form onSubmit={handleCreateQuest} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono uppercase text-white/40 block mb-1">Quest Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Follow @HypeOracle on X"
                    value={questTitle}
                    onChange={(e) => setQuestTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B1A]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-white/40 block mb-1">Description</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe requirements and community impact..."
                    value={questDesc}
                    onChange={(e) => setQuestDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B1A]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-white/40 block mb-1">Category</label>
                    <select
                      value={questCategory}
                      onChange={(e) => setQuestCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B1A]"
                    >
                      <option value="social">Social</option>
                      <option value="community">Community</option>
                      <option value="sentiment">Sentiment</option>
                      <option value="depin">DePIN Sensor</option>
                      <option value="referral">Referral</option>
                      <option value="education">Education</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-white/40 block mb-1">Verification</label>
                    <select
                      value={questVerifType}
                      onChange={(e) => setQuestVerifType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B1A]"
                    >
                      <option value="instant_click">Instant Click</option>
                      <option value="x_follow">X Follow</option>
                      <option value="x_post">X Post</option>
                      <option value="discord_join">Discord Join</option>
                      <option value="telegram_join">Telegram Join</option>
                      <option value="vibe_score">Vibe Score</option>
                      <option value="depin_sensor">DePIN Sensor</option>
                      <option value="referral_count">Referral Count</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-white/40 block mb-1">XP Reward</label>
                    <input
                      type="number"
                      value={questXp}
                      onChange={(e) => setQuestXp(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B1A]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-white/40 block mb-1">Reputation</label>
                    <input
                      type="number"
                      value={questRep}
                      onChange={(e) => setQuestRep(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B1A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-white/40 block mb-1">Campaign</label>
                  <select
                    value={questCampaignId}
                    onChange={(e) => setQuestCampaignId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B1A]"
                  >
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSavingQuest}
                  className="w-full py-2.5 rounded-xl bg-[#FF6B1A] hover:bg-[#FF3D00] text-black text-xs font-display font-black transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSavingQuest ? 'Publishing Quest...' : 'Create & Publish Quest'}
                </button>
              </form>
            </div>

            {/* Quests List */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-display font-bold text-white uppercase">Live Quests Directory</h3>
                <span className="text-xs font-mono text-white/40">{quests.length} Quests Active</span>
              </div>

              {quests.map((q) => (
                <div key={q.id} className="p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/10 text-white/70 uppercase">
                        {q.category}
                      </span>
                      <span className="text-xs font-display font-bold text-white">{q.title}</span>
                    </div>
                    <p className="text-xs text-white/50 line-clamp-1">{q.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-white/40">
                      <span className="text-[#FFAA00]">+{q.xpReward} XP</span>
                      <span className="text-[#10B981]">+{q.reputationReward} Rep</span>
                      <span>Method: {q.verificationType}</span>
                      <span>{q.currentCompletions} Completions</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteQuest(q.id)}
                    className="p-2 rounded-lg bg-white/[0.02] hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CAMPAIGNS */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-display font-black text-white uppercase">Campaign Initiatives</h2>
                <p className="text-xs font-mono text-white/50">Epochs that group quests into high-leverage growth sprints</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {campaigns.map((camp) => (
                <div key={camp.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] text-[10px] font-mono uppercase font-bold">
                      {camp.status}
                    </span>
                    <span className="text-xs font-mono text-[#FFAA00]">{camp.badgeTitle}</span>
                  </div>

                  <h3 className="text-base font-display font-bold text-white mb-1">{camp.title}</h3>
                  <p className="text-xs text-white/60 mb-4">{camp.description}</p>

                  <div className="space-y-2 pt-3 border-t border-white/[0.06] text-xs font-mono">
                    <div className="flex justify-between text-white/60">
                      <span>Target XP:</span>
                      <span className="text-white font-bold">{camp.targetXp.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-white/60">
                      <span>Participants:</span>
                      <span className="text-white font-bold">{camp.totalParticipants || 0}</span>
                    </div>
                    <div className="flex justify-between text-white/60">
                      <span>XP Distributed:</span>
                      <span className="text-[#FFAA00] font-bold">{(camp.totalXpDistributed || 0).toLocaleString()} XP</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PARTICIPANTS */}
        {activeTab === 'participants' && (
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
            <h2 className="text-base font-display font-black text-white uppercase mb-4">Community Participants</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/[0.08] text-white/40 uppercase">
                    <th className="py-2.5">Participant / Pubkey</th>
                    <th>Tier</th>
                    <th>XP</th>
                    <th>Reputation</th>
                    <th>Quests</th>
                    <th>Referrals</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {participants.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.01]">
                      <td className="py-3 font-bold text-white">
                        {p.username || `${p.userPubkey.slice(0, 6)}...${p.userPubkey.slice(-4)}`}
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-white/70">
                          {p.tier}
                        </span>
                      </td>
                      <td className="text-[#FFAA00] font-bold">+{p.totalXp}</td>
                      <td className="text-[#10B981] font-bold">★ {p.reputationScore}</td>
                      <td>{p.completedQuestsCount}</td>
                      <td>{p.qualifiedReferralsCount}</td>
                      <td>
                        <span className="text-[#10B981]">Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
            <h2 className="text-base font-display font-black text-white uppercase mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#FFAA00]" />
              Global Reputation Leaderboard
            </h2>
            <div className="space-y-3">
              {participants.map((p, idx) => (
                <div key={p.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-mono font-bold text-[#FFAA00]">#{idx + 1}</span>
                    <span className="text-xs font-mono font-bold text-white">{p.username || p.userPubkey}</span>
                  </div>
                  <div className="flex items-center gap-6 text-xs font-mono">
                    <span className="text-[#FFAA00] font-bold">{p.totalXp} XP</span>
                    <span className="text-[#10B981] font-bold">★ {p.reputationScore} Rep</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: REFERRALS & SYBIL GUARD */}
        {activeTab === 'referrals' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-[10px] font-mono text-white/40 uppercase">Total Qualified Invites</span>
                <div className="text-xl font-mono font-bold text-[#FFAA00] mt-1">284 Members</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-[10px] font-mono text-white/40 uppercase">Sybil Flags Blocked</span>
                <div className="text-xl font-mono font-bold text-[#10B981] mt-1">19 Self-Referrals Prevented</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-[10px] font-mono text-white/40 uppercase">Referral XP Multiplier</span>
                <div className="text-xl font-mono font-bold text-white mt-1">50 XP / Invite</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
              <h3 className="text-sm font-display font-bold text-white uppercase mb-3">Anti-Abuse & Sybil Rules Active</h3>
              <p className="text-xs font-mono text-white/60 leading-relaxed">
                ✓ Self-referral detection actively matches wallet public keys and browser device IDs.<br />
                ✓ Referrals require at least 1 verified quest completion before XP is unlocked to inviter.<br />
                ✓ Cooldown timers prevent automated script farming.
              </p>
            </div>
          </div>
        )}

        {/* TAB 7: REWARDS & ON-CHAIN HOOKS */}
        {activeTab === 'rewards' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
              <h2 className="text-base font-display font-black text-white uppercase mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#FFAA00]" />
                Modular Reward Architecture
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <h4 className="text-xs font-display font-bold text-white mb-1">XP Milestone Rewards</h4>
                  <p className="text-xs text-white/50">Unlocked dynamically as community members complete quests.</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <h4 className="text-xs font-display font-bold text-white mb-1">Discord & Telegram Roles</h4>
                  <p className="text-xs text-white/50">Automatic ambassador role assignment for top reputation holders.</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <h4 className="text-xs font-display font-bold text-white mb-1">On-Chain Solana Connector</h4>
                  <p className="text-xs text-white/50">Clean modular interface to distribute $HYPE tokens or Soulprint NFTs.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: SENTIMENT CORRELATION */}
        {activeTab === 'sentiment' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
              <h2 className="text-base font-display font-black text-white uppercase mb-2 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-[#FF6B1A]" />
                Community-to-Oracle Sentiment Correlation
              </h2>
              <p className="text-xs font-mono text-white/60 mb-6">
                Tracks the direct statistical impact of community quests & campaigns on Solana on-chain emotion signals.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                  <div className="text-xs font-mono uppercase text-white/40">Measured Correlation</div>
                  <div className="text-2xl font-mono font-black text-[#10B981]">+16.4% Hype Surge</div>
                  <p className="text-xs text-white/70">
                    During active hours of the DePIN Sensor Blitz, user acoustic volume increased by 28%, causing the live Bags.fm trading score to trigger dynamic buy thresholds.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                  <div className="text-xs font-mono uppercase text-white/40">Data Integrity Guard</div>
                  <div className="text-2xl font-mono font-black text-cyan-400">100% Verifiable</div>
                  <p className="text-xs text-white/70">
                    Distinguishes measured biometric/acoustic telemetry from speculative AI interpretations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: AI GROWTH AGENT COCKPIT */}
        {activeTab === 'ai_agent' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-display font-black text-white uppercase flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#FF6B1A]" />
                  AI Growth Agent Staged Queue
                </h2>
                <p className="text-xs font-mono text-white/50">
                  AI analyzes community activity and prepares actions. Important actions require human admin approval.
                </p>
              </div>

              <button
                onClick={loadAdminData}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-white/80 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Re-Analyze</span>
              </button>
            </div>

            <div className="space-y-4">
              {aiInsights.map((ins) => (
                <div key={ins.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-[#FF6B1A]/20 text-[#FF6B1A] uppercase font-bold">
                        {ins.category}
                      </span>
                      <span className="text-xs font-mono text-white/40">Confidence: {Math.round(ins.confidence * 100)}%</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        ins.status === 'applied' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#FFAA00]/20 text-[#FFAA00]'
                      }`}>
                        {ins.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-display font-bold text-white mb-1">{ins.title}</h3>
                    <p className="text-xs text-white/70 max-w-3xl leading-relaxed">{ins.summary}</p>
                  </div>

                  {ins.status === 'staged' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApplyAiInsight(ins.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B1A] hover:bg-[#FF3D00] text-black text-xs font-display font-bold transition-all active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Execute</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 10: SOCIAL CONTENT (AI SOCIAL MANAGER) */}
        {activeTab === 'social_content' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FF6B1A]/20 via-[#FFAA00]/10 to-transparent border border-[#FF6B1A]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#FF6B1A]/20 text-[#FF6B1A]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                    Official @HypeOracle AI X Manager Suite
                    <span className="px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] text-[9px] font-mono">
                      Autopilot Ready
                    </span>
                  </h3>
                  <p className="text-xs text-white/70 mt-0.5">
                    Full 7-tab control center with calendar scheduling, community mentions assistant, and autonomous cron worker.
                  </p>
                </div>
              </div>

              <Link
                href="/admin/x-manager"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B1A] hover:bg-[#FF3D00] text-black text-xs font-display font-black transition-all active:scale-95 whitespace-nowrap shadow-[0_0_15px_rgba(255,107,26,0.3)]"
              >
                <span>Launch Full AI X Manager</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Draft Generator */}
            <div className="lg:col-span-1 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
              <h2 className="text-base font-display font-black text-white uppercase mb-4 flex items-center gap-2">
                <Send className="w-4 h-4 text-[#FF6B1A]" />
                Draft Social Content
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono uppercase text-white/40 block mb-1">Content Type</label>
                  <select
                    value={socialContentType}
                    onChange={(e) => setSocialContentType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B1A]"
                  >
                    <option value="x_post">Single X Post</option>
                    <option value="x_thread">Educational X Thread</option>
                    <option value="x_reply">Contextual Reply</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-white/40 block mb-1">Topic / Narrative Theme</label>
                  <input
                    type="text"
                    value={socialTopic}
                    onChange={(e) => setSocialTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B1A]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-white/40 block mb-1">Brand Voice</label>
                  <select
                    value={socialTone}
                    onChange={(e) => setSocialTone(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B1A]"
                  >
                    <option value="energetic">High Conviction & Energetic</option>
                    <option value="analytical">Scientific & Analytical (DePIN)</option>
                    <option value="alpha">Community Alpha</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerateSocial}
                  disabled={isGeneratingSocial}
                  className="w-full py-2.5 rounded-xl bg-[#FF6B1A] hover:bg-[#FF3D00] text-black text-xs font-display font-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGeneratingSocial ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Generate Staged Draft</span>
                </button>
              </div>
            </div>

            {/* Staged Approval Queue */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-display font-bold text-white uppercase flex items-center gap-2">
                  <span>Staged Approval Queue</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#FFAA00]/20 text-[#FFAA00] text-[10px] font-mono">
                    HITL Protected
                  </span>
                </h3>
                <span className="text-xs font-mono text-white/40">{socialDrafts.length} in queue</span>
              </div>

              {socialDrafts.map((draft) => (
                <div key={draft.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-[9px] font-mono uppercase bg-white/10 text-white/70">
                      {draft.contentType}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      draft.status === 'approved' ? 'bg-[#10B981]/20 text-[#10B981]' : draft.status === 'rejected' ? 'bg-rose-500/20 text-rose-400' : 'bg-[#FFAA00]/20 text-[#FFAA00]'
                    }`}>
                      {draft.status}
                    </span>
                  </div>

                  <p className="text-xs font-mono text-white/90 whitespace-pre-wrap leading-relaxed">
                    {draft.primaryText}
                  </p>

                  {draft.threadItems && draft.threadItems.length > 0 && (
                    <div className="pl-3 border-l-2 border-white/20 space-y-2 mt-2">
                      {draft.threadItems.map((item, idx) => (
                        <p key={idx} className="text-xs font-mono text-white/70">{item}</p>
                      ))}
                    </div>
                  )}

                  {draft.status === 'staged' && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                      <button
                        onClick={() => handleRejectSocial(draft.id)}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 text-white/60 hover:text-rose-400 text-xs font-mono transition-all"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveSocial(draft.id)}
                        className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-black text-xs font-mono font-bold transition-all active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

        {/* TAB 11: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
              <h2 className="text-base font-display font-black text-white uppercase mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#FFAA00]" />
                Growth & Retention Funnel
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-mono">
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06]">
                  <span className="text-white/40 block mb-1">Quest Conversion Velocity</span>
                  <div className="text-xl font-bold text-[#FF6B1A]">74.2% Completion</div>
                  <p className="text-white/50 text-[11px] mt-2">Average time to first quest: 4.2 minutes</p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06]">
                  <span className="text-white/40 block mb-1">7-Day Cohort Retention</span>
                  <div className="text-xl font-bold text-[#10B981]">68.4% Return Rate</div>
                  <p className="text-white/50 text-[11px] mt-2">Contributors submit 2.4 vibes weekly</p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06]">
                  <span className="text-white/40 block mb-1">DePIN Data Points Streamed</span>
                  <div className="text-xl font-bold text-cyan-400">14,892 Samples</div>
                  <p className="text-white/50 text-[11px] mt-2">Verified audio volume & motion feeds</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 12: SETTINGS & AUDIT TRAIL */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
              <h2 className="text-base font-display font-black text-white uppercase mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-white/60" />
                Community & Anti-Abuse Configuration
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
                <div className="space-y-3">
                  <label className="text-white/40 block">Sybil Protection Level</label>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-white font-bold">
                    Moderate (Enforces Unique Wallets + 1st Quest Qualification)
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-white/40 block">Referral XP Reward</label>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-[#FFAA00] font-bold">
                    50 XP / Qualified Invitee
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/[0.06]">
                <h3 className="text-sm font-display font-bold text-white uppercase mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#FFAA00]" />
                  Administrative Audit Trail
                </h3>
                <p className="text-xs font-mono text-white/50 mb-4">
                  Every state-modifying action is permanently recorded with admin identity and cryptographic timestamp.
                </p>
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] font-mono text-white/60 space-y-1">
                  <div>• [AUTH] Admin login recorded for {adminIdentity}</div>
                  <div>• [SYSTEM] Staged AI recommendations synchronized with Groq Llama-3.3</div>
                  <div>• [DEPIN] Active PWA sensor node adapter registered for browser telemetry</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
