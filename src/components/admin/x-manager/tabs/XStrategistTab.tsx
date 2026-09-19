'use client';

import React from 'react';
import { 
  Sparkles, TrendingUp, Clock, Target, ArrowRight, 
  Flame, Radio, Zap, HelpCircle, BarChart3 
} from 'lucide-react';
import { XAIRecommendation } from '@/lib/x-manager-types';

interface XStrategistTabProps {
  recommendations: XAIRecommendation[];
  onSendToStudio: (ideaText: string) => void;
}

export function XStrategistTab({
  recommendations,
  onSendToStudio
}: XStrategistTabProps) {
  const contentIdeas = [
    {
      title: 'How 5s of Biological Voice Blocks 10,000 Bots',
      category: 'DePIN Tech Deep Dive',
      hook: 'Most crypto trading algos rely on easily spoofed text sentiment. Explain the Whisper + WebAudio frequency analysis formula.'
    },
    {
      title: 'Bags.fm Dynamic Fee-Sharing Explained',
      category: 'Tokenomics & Liquidity',
      hook: 'Explain how emotional score > 80 auto-buys on the Meteora bonding curve and directly rewards node contributors.'
    },
    {
      title: 'Ambassador Wave 1 Call to Action',
      category: 'Community Growth',
      hook: 'Spotlight the top 3 leaderboard holders and announce exclusive perks for the Vanguard tier.'
    },
    {
      title: 'The Real Cost of Artificial Twitter Hype',
      category: 'Industry Contrast',
      hook: 'Expose how bot farms create fake pumps and why verifiable hardware accelerometer sensors are the antidote.'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-white/[0.06]">
        <h2 className="text-base font-display font-black text-white uppercase flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FFAA00]" />
          AI Social Strategist & Ideas Engine
        </h2>
        <p className="text-xs font-mono text-white/50">
          Continuous algorithmic intelligence analyzing posting cadence, narrative gaps, and community conversion drivers.
        </p>
      </div>

      {/* Strategic Metrics Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
          <div className="flex items-center gap-2 text-[#FF6B1A] text-xs font-mono font-bold uppercase">
            <Clock className="w-4 h-4" />
            Optimal Posting Window
          </div>
          <div className="text-xl font-mono font-black text-white">14:00 - 17:00 UTC</div>
          <p className="text-xs text-white/60">
            Coincides with US market opening & Solana volume peak. 3.2x higher engagement on sentiment alerts.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
          <div className="flex items-center gap-2 text-[#FFAA00] text-xs font-mono font-bold uppercase">
            <Flame className="w-4 h-4" />
            Top Converting Format
          </div>
          <div className="text-xl font-mono font-black text-white">Live Sentiment Alerts</div>
          <p className="text-xs text-white/60">
            Posts referencing live &gt;80 emotion scores generated 44% of all referral traffic into the Genesis campaign.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
          <div className="flex items-center gap-2 text-[#10B981] text-xs font-mono font-bold uppercase">
            <Radio className="w-4 h-4" />
            Narrative Resonance
          </div>
          <div className="text-xl font-mono font-black text-white">DePIN Audio Hardware</div>
          <p className="text-xs text-white/60">
            Community interest in physical sensor nodes grew 68% this week. Focus upcoming posts on mobile node proof.
          </p>
        </div>
      </div>

      {/* Autonomous Strategist Recommendations */}
      <div className="space-y-4">
        <h3 className="text-sm font-display font-bold text-white uppercase flex items-center gap-2">
          <Target className="w-4 h-4 text-[#FF6B1A]" />
          Active Intelligence Recommendations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => (
            <div key={rec.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-[#FF6B1A]/20 text-[#FF6B1A] font-bold">
                    {rec.category}
                  </span>
                  <span className="text-[10px] font-mono text-white/40 uppercase">{rec.priority} Priority</span>
                </div>
                <h4 className="text-sm font-display font-bold text-white mb-1">{rec.title}</h4>
                <p className="text-xs text-white/70 leading-relaxed">{rec.description}</p>
              </div>

              {rec.suggestedPostDraft && (
                <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between gap-3">
                  <span className="text-[11px] font-mono text-white/50 truncate">💡 {rec.suggestedPostDraft}</span>
                  <button
                    onClick={() => onSendToStudio(rec.suggestedPostDraft!)}
                    className="flex items-center gap-1 text-xs font-mono text-[#FFAA00] hover:text-white shrink-0 font-bold"
                  >
                    <span>Use in Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Continuous Content Ideas Generator */}
      <div className="space-y-4 pt-4 border-t border-white/[0.06]">
        <h3 className="text-sm font-display font-bold text-white uppercase flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FFAA00]" />
          Pre-Synthesized Content Hooks
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contentIdeas.map((idea, i) => (
            <div key={i} className="p-4 rounded-xl bg-black/40 border border-white/[0.04] flex flex-col justify-between gap-3">
              <div>
                <span className="text-[9px] font-mono uppercase text-[#06B6D4] block mb-1">{idea.category}</span>
                <h4 className="text-xs font-display font-bold text-white mb-1">{idea.title}</h4>
                <p className="text-xs text-white/60">{idea.hook}</p>
              </div>

              <button
                onClick={() => onSendToStudio(`${idea.title}: ${idea.hook}`)}
                className="self-end flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-[#FFAA00]/20 text-xs font-mono text-white/80 hover:text-[#FFAA00] transition-all"
              >
                <span>Send to Content Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
