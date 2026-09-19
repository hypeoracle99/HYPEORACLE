'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Sparkles, Clock, Calendar, 
  MessageSquare, Target, Settings, Send, Radio, 
  CheckCircle2, AlertCircle, RefreshCw, Key, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { AmbientBackground } from '@/components/ui-primitives';
import { XOverviewTab } from './tabs/XOverviewTab';
import { XContentStudioTab } from './tabs/XContentStudioTab';
import { XApprovalQueueTab } from './tabs/XApprovalQueueTab';
import { XCalendarTab } from './tabs/XCalendarTab';
import { XMentionsTab } from './tabs/XMentionsTab';
import { XStrategistTab } from './tabs/XStrategistTab';
import { XSettingsAuditTab } from './tabs/XSettingsAuditTab';
import { 
  XAccount, 
  XDraft, 
  XScheduledPost, 
  XPublishedPost, 
  XMention, 
  XAIRecommendation, 
  XAutomationSettings, 
  XAuditLog,
  XContentType,
  XTone
} from '@/lib/x-manager-types';

export function XManagerDashboard() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [account, setAccount] = useState<XAccount | null>(null);
  const [drafts, setDrafts] = useState<XDraft[]>([]);
  const [scheduled, setScheduled] = useState<XScheduledPost[]>([]);
  const [posts, setPosts] = useState<XPublishedPost[]>([]);
  const [mentions, setMentions] = useState<XMention[]>([]);
  const [recommendations, setRecommendations] = useState<XAIRecommendation[]>([]);
  const [settings, setSettings] = useState<XAutomationSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<XAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    fetchXManagerData();
  }, []);

  async function fetchXManagerData() {
    setLoading(true);
    try {
      const res = await fetch('/api/community/admin/x-manager/api', {
        headers: { 'x-dev-admin-override': 'true' }
      });
      if (res.ok) {
        const data = await res.json();
        setAccount(data.account || null);
        setDrafts(data.drafts || []);
        setScheduled(data.scheduled || []);
        setPosts(data.posts || []);
        setMentions(data.mentions || []);
        setRecommendations(data.recommendations || []);
        setSettings(data.settings || null);
        setAuditLogs(data.auditLogs || []);
      }
    } catch (err) {
      console.error('Failed to load X Manager data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateContent(contentType: XContentType, tone: XTone, prompt?: string) {
    const res = await fetch('/api/community/admin/x-manager/api', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-dev-admin-override': 'true'
      },
      body: JSON.stringify({
        action: 'generate_content',
        contentType,
        tone,
        customPrompt: prompt
      })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Generation failed');
    await fetchXManagerData();
    return d.draft;
  }

  async function handleRewrite(text: string, mode: 'shorten' | 'more_hype' | 'more_professional' | 'add_cta') {
    const res = await fetch('/api/community/admin/x-manager/api', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-dev-admin-override': 'true'
      },
      body: JSON.stringify({
        action: 'rewrite_text',
        text,
        mode
      })
    });
    const d = await res.json();
    return d.text || text;
  }

  async function handlePublishNow(draftId: string) {
    const res = await fetch('/api/community/admin/x-manager/api', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-dev-admin-override': 'true'
      },
      body: JSON.stringify({
        action: 'approve_and_publish',
        draftId
      })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Publish failed');
    }
    await fetchXManagerData();
  }

  async function handleSchedule(draftId: string, scheduledFor: string) {
    const res = await fetch('/api/community/admin/x-manager/api', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-dev-admin-override': 'true'
      },
      body: JSON.stringify({
        action: 'approve_and_schedule',
        draftId,
        scheduledFor
      })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Scheduling failed');
    }
    await fetchXManagerData();
  }

  async function handleReject(draftId: string, reason: string) {
    const res = await fetch('/api/community/admin/x-manager/api', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-dev-admin-override': 'true'
      },
      body: JSON.stringify({
        action: 'reject_draft',
        draftId,
        reason
      })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Rejection failed');
    }
    await fetchXManagerData();
  }

  async function handleReplyToMention(mentionId: string, replyText: string) {
    const res = await fetch('/api/community/admin/x-manager/api', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-dev-admin-override': 'true'
      },
      body: JSON.stringify({
        action: 'reply_to_mention',
        mentionId,
        replyText
      })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Reply failed');
    }
    await fetchXManagerData();
  }

  async function handleUpdateSettings(updates: Partial<XAutomationSettings>) {
    const res = await fetch('/api/community/admin/x-manager/api', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-dev-admin-override': 'true'
      },
      body: JSON.stringify({
        action: 'update_settings',
        settings: updates
      })
    });
    if (!res.ok) throw new Error('Settings update failed');
    await fetchXManagerData();
  }

  async function handleTestConnection() {
    const res = await fetch('/api/community/admin/x-manager/api?resource=connection_test', {
      headers: { 'x-dev-admin-override': 'true' }
    });
    return res.json();
  }

  async function handleTriggerWorker() {
    setIsWorking(true);
    try {
      const res = await fetch('/api/community/admin/x-manager/api', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-dev-admin-override': 'true'
        },
        body: JSON.stringify({ action: 'trigger_worker' })
      });
      const d = await res.json();
      alert(d.message || 'Worker cycle finished');
      await fetchXManagerData();
    } catch (err: any) {
      alert(`Worker failed: ${err.message}`);
    } finally {
      setIsWorking(false);
    }
  }

  const pendingApprovalsCount = drafts.filter((d) => d.status === 'pending_approval').length;

  const tabs = [
    { id: 'overview', label: 'Overview & Metrics', icon: LayoutDashboard },
    { id: 'content_studio', label: 'AI Content Studio', icon: Sparkles },
    { id: 'approval_queue', label: 'Approval Queue', icon: Clock, badge: pendingApprovalsCount },
    { id: 'calendar', label: 'Content Calendar', icon: Calendar },
    { id: 'mentions', label: 'Mentions & Replies', icon: MessageSquare },
    { id: 'strategist', label: 'AI Strategist', icon: Target },
    { id: 'settings', label: 'Settings & Audit', icon: Settings },
  ];

  return (
    <div className="relative min-h-screen bg-[#050507] text-white selection:bg-[#FF6B1A]/30">
      <AmbientBackground />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Top Breadcrumb & Navigation Link */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/community/admin"
            className="flex items-center gap-1.5 text-xs font-mono text-white/50 hover:text-white transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Community Admin</span>
          </Link>

          <span className="text-[10px] font-mono text-[#FFAA00]">
            Autonomous Autopilot: {settings?.autopilotEnabled ? 'ACTIVE (Every 6h)' : 'PAUSED'}
          </span>
        </div>

        {/* Official Account Banner */}
        {account && (
          <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-white/[0.04] to-white/[0.01] border border-white/[0.08] backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden">
                  <img src={account.profileImageUrl || '/logo.png'} alt={account.name} className="w-10 h-10 object-contain" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#10B981] border-2 border-[#050507]" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-display font-black text-white">{account.name}</h1>
                  <span className="text-xs font-mono text-[#FF6B1A] font-bold">@{account.username}</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-[#10B981]/20 text-[#10B981] font-bold uppercase">
                    Official Verified
                  </span>
                </div>
                <p className="text-xs text-white/60 max-w-xl mt-1 leading-relaxed">{account.bio}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="flex flex-col">
                <span className="text-white/40 text-[10px] uppercase">Followers</span>
                <span className="text-white font-bold text-sm">{account.followersCount.toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/40 text-[10px] uppercase">API Mode</span>
                <span className="text-[#10B981] font-bold text-sm">
                  {account.apiAuthState === 'connected' ? 'Live X v2' : 'Sandbox Ready'}
                </span>
              </div>
              <button
                onClick={handleTriggerWorker}
                disabled={isWorking}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-white/80 transition-all active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isWorking ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>
          </div>
        )}

        {/* 7-Tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-8 border-b border-white/[0.06]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-[#FF6B1A] text-black shadow-[0_0_20px_rgba(255,107,26,0.35)]'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] text-white/60 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-black text-white text-[9px] font-black">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        {account && settings && (
          <div>
            {activeTab === 'overview' && (
              <XOverviewTab
                account={account}
                drafts={drafts}
                scheduled={scheduled}
                posts={posts}
                recommendations={recommendations}
                onNavigateTab={setActiveTab}
                onTriggerWorker={handleTriggerWorker}
                isWorking={isWorking}
              />
            )}

            {activeTab === 'content_studio' && (
              <XContentStudioTab
                onGenerate={handleGenerateContent}
                onRewrite={handleRewrite}
                onPublishNow={handlePublishNow}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'approval_queue' && (
              <XApprovalQueueTab
                drafts={drafts}
                onPublishNow={handlePublishNow}
                onSchedule={handleSchedule}
                onReject={handleReject}
                onRefresh={fetchXManagerData}
              />
            )}

            {activeTab === 'calendar' && (
              <XCalendarTab
                scheduled={scheduled}
                published={posts}
                onTriggerWorker={handleTriggerWorker}
                isWorking={isWorking}
              />
            )}

            {activeTab === 'mentions' && (
              <XMentionsTab
                mentions={mentions}
                onReplyToMention={handleReplyToMention}
                onRefresh={fetchXManagerData}
              />
            )}

            {activeTab === 'strategist' && (
              <XStrategistTab
                recommendations={recommendations}
                onSendToStudio={(text) => {
                  setActiveTab('content_studio');
                }}
              />
            )}

            {activeTab === 'settings' && (
              <XSettingsAuditTab
                settings={settings}
                auditLogs={auditLogs}
                onUpdateSettings={handleUpdateSettings}
                onTestConnection={handleTestConnection}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
