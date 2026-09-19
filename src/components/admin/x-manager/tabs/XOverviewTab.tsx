'use client';

import React from 'react';
import { 
  Users, Eye, TrendingUp, Heart, Repeat, CheckCircle2, 
  Clock, AlertCircle, Sparkles, Send, ArrowUpRight, Zap, Radio
} from 'lucide-react';
import { 
  XAccount, 
  XDraft, 
  XScheduledPost, 
  XPublishedPost, 
  XAIRecommendation 
} from '@/lib/x-manager-types';

interface XOverviewTabProps {
  account: XAccount;
  drafts: XDraft[];
  scheduled: XScheduledPost[];
  posts: XPublishedPost[];
  recommendations: XAIRecommendation[];
  onNavigateTab: (tabId: string) => void;
  onTriggerWorker: () => void;
  isWorking: boolean;
}

export function XOverviewTab({
  account,
  drafts,
  scheduled,
  posts,
  recommendations,
  onNavigateTab,
  onTriggerWorker,
  isWorking
}: XOverviewTabProps) {
  const pendingCount = drafts.filter((d) => d.status === 'pending_approval').length;

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Followers', value: account.followersCount.toLocaleString(), change: '+48 today', icon: Users, color: '#FF6B1A' },
          { label: 'Total Impressions', value: '148.2k', change: '+18.4%', icon: Eye, color: '#FFAA00' },
          { label: 'Engagement Rate', value: '5.12%', change: '+0.8%', icon: TrendingUp, color: '#10B981' },
          { label: 'Pending Approvals', value: pendingCount.toString(), change: 'Requires Review', icon: Clock, color: '#FFAA00' },
          { label: 'Scheduled in Queue', value: scheduled.length.toString(), change: 'Next in 4h', icon: Send, color: '#06B6D4' },
          { label: 'System Health', value: account.apiAuthState === 'connected' ? 'LIVE API' : 'SANDBOX', change: 'Operational', icon: CheckCircle2, color: '#10B981' }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase text-white/40">{stat.label}</span>
                <Icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <div className="text-xl font-mono font-black text-white">{stat.value}</div>
              <div className="text-[10px] font-mono text-white/50 mt-1">{stat.change}</div>
            </div>
          );
        })}
      </div>

      {/* Pending Approvals Alert Banner */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FFAA00]/10 to-[#FF6B1A]/10 border border-[#FFAA00]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FFAA00]/20 text-[#FFAA00]">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                {pendingCount} Content Draft{pendingCount > 1 ? 's' : ''} Awaiting Review
                <span className="px-2 py-0.5 rounded-full bg-[#FFAA00]/20 text-[#FFAA00] text-[9px] font-mono font-bold">
                  Action Needed
                </span>
              </h3>
              <p className="text-xs text-white/70 mt-0.5">
                AI has prepared sentiment-grounded posts for @{account.username}. Review, edit, or broadcast directly to the timeline.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('approval_queue')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFAA00] hover:bg-[#FF8C00] text-black text-xs font-display font-bold transition-all active:scale-95 whitespace-nowrap"
          >
            <span>Open Approval Queue</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Split: Recent Timeline Posts vs AI Strategist Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Posts History */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-display font-bold text-white uppercase flex items-center gap-2">
              <Send className="w-4 h-4 text-[#FF6B1A]" />
              Recent Published Broadcasts
            </h3>
            <button
              onClick={() => onNavigateTab('calendar')}
              className="text-xs font-mono text-white/50 hover:text-white"
            >
              View All Timeline
            </button>
          </div>

          <div className="space-y-3">
            {posts.slice(0, 3).map((post) => (
              <div key={post.id} className="p-4 rounded-xl bg-black/40 border border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                  <span className="px-2 py-0.5 rounded bg-white/5 text-white/60 uppercase">
                    {post.contentType}
                  </span>
                  <span>{new Date(post.publishedAt).toLocaleDateString()} via {post.publishedVia}</span>
                </div>

                <p className="text-xs font-mono text-white/90 line-clamp-3 leading-relaxed">
                  {post.primaryText}
                </p>

                <div className="flex items-center gap-5 pt-2 border-t border-white/[0.04] text-[11px] font-mono text-white/50">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-[#FFAA00]" />
                    {post.impressionsCount.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                    {post.likesCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Repeat className="w-3.5 h-3.5 text-[#10B981]" />
                    {post.repostsCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Strategist Highlights */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-display font-bold text-white uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFAA00]" />
              Autonomous Strategist Intel
            </h3>
            <button
              onClick={() => onNavigateTab('strategist')}
              className="text-xs font-mono text-white/50 hover:text-white"
            >
              Full Strategy Room
            </button>
          </div>

          <div className="space-y-3">
            {recommendations.slice(0, 2).map((rec) => (
              <div key={rec.id} className="p-4 rounded-xl bg-black/40 border border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display font-bold text-white">{rec.title}</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-[#FF6B1A]/20 text-[#FF6B1A] font-bold">
                    {rec.priority} Priority
                  </span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">{rec.description}</p>
                {rec.suggestedPostDraft && (
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[11px] font-mono text-white/80">
                    💡 Idea: {rec.suggestedPostDraft}
                  </div>
                )}
              </div>
            ))}

            <div className="pt-2">
              <button
                onClick={() => onNavigateTab('content_studio')}
                className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-display font-bold text-white transition-all"
              >
                Launch AI Content Studio
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
