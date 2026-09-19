'use client';

import React, { useState } from 'react';
import { 
  Sparkles, Send, RefreshCw, Layers, Flame, 
  Check, ArrowRight, ShieldCheck, HelpCircle, Edit3, 
  MessageSquare, Radio, Zap, AlertTriangle
} from 'lucide-react';
import { XContentType, XTone, XDraft } from '@/lib/x-manager-types';

interface XContentStudioTabProps {
  onGenerate: (contentType: XContentType, tone: XTone, prompt?: string) => Promise<XDraft>;
  onRewrite: (text: string, mode: 'shorten' | 'more_hype' | 'more_professional' | 'add_cta') => Promise<string>;
  onPublishNow: (draftId: string) => Promise<void>;
  onNavigateTab: (tabId: string) => void;
}

export function XContentStudioTab({
  onGenerate,
  onRewrite,
  onPublishNow,
  onNavigateTab
}: XContentStudioTabProps) {
  const [contentType, setContentType] = useState<XContentType>('single_tweet');
  const [tone, setTone] = useState<XTone>('hype');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<XDraft | null>(null);
  const [composerText, setComposerText] = useState('');
  const [threadItems, setThreadItems] = useState<string[]>([]);
  const [isRewriting, setIsRewriting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleGenerateClick() {
    setIsGenerating(true);
    setSuccessMessage(null);
    try {
      const draft = await onGenerate(contentType, tone, customPrompt);
      setCurrentDraft(draft);
      setComposerText(draft.primaryText);
      setThreadItems(draft.threadItems || []);
    } catch (err: any) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRewriteClick(mode: 'shorten' | 'more_hype' | 'more_professional' | 'add_cta') {
    if (!composerText) return;
    setIsRewriting(true);
    try {
      const rewritten = await onRewrite(composerText, mode);
      setComposerText(rewritten);
      if (currentDraft) currentDraft.primaryText = rewritten;
    } catch (err: any) {
      alert(`Rewrite failed: ${err.message}`);
    } finally {
      setIsRewriting(false);
    }
  }

  async function handleDirectPublish() {
    if (!currentDraft) return;
    try {
      await onPublishNow(currentDraft.id);
      setSuccessMessage('Successfully published to official X timeline!');
      setTimeout(() => {
        onNavigateTab('overview');
      }, 1500);
    } catch (err: any) {
      alert(`Publish failed: ${err.message}`);
    }
  }

  const charCount = composerText.length;
  const isOverLimit = charCount > 280;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left: AI Generator Parameters (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h2 className="text-base font-display font-black text-white uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF6B1A]" />
              AI Prompt Studio
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] text-[9px] font-mono font-bold">
              Grounded Telemetry Active
            </span>
          </div>

          {/* Content Type Selector */}
          <div>
            <label className="text-[10px] font-mono uppercase text-white/40 block mb-2">Content Format</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'single_tweet', label: 'Single Tweet', icon: MessageSquare },
                { id: 'thread', label: 'Educational Thread', icon: Layers },
                { id: 'sentiment_alert', label: 'Sentiment Alert 🔥', icon: Zap },
                { id: 'depin_update', label: 'DePIN Sensor Feed', icon: Radio },
                { id: 'bags_trade_signal', label: 'Bags.fm Buy Signal', icon: Flame },
                { id: 'ambassador_spotlight', label: 'Ambassador Spotlight', icon: ShieldCheck }
              ].map((item) => {
                const Icon = item.icon;
                const selected = contentType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setContentType(item.id as XContentType)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-mono font-bold text-left transition-all ${
                      selected
                        ? 'bg-[#FF6B1A]/20 border-[#FF6B1A] text-white shadow-[0_0_15px_rgba(255,107,26,0.2)]'
                        : 'bg-black/40 hover:bg-white/[0.03] border-white/[0.06] text-white/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: selected ? '#FF6B1A' : 'inherit' }} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tone Selector */}
          <div>
            <label className="text-[10px] font-mono uppercase text-white/40 block mb-2">Brand Tone</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'hype', label: 'High Hype 🔥' },
                { id: 'technical', label: 'Technical / DePIN' },
                { id: 'analytical', label: 'Quant Sentiment' },
                { id: 'community', label: 'Community Focused' },
                { id: 'alpha', label: 'Trader Alpha' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t.id as XTone)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                    tone === t.id
                      ? 'bg-[#FFAA00] text-black shadow-[0_0_10px_rgba(255,170,0,0.3)]'
                      : 'bg-black/40 hover:bg-white/[0.04] border border-white/[0.06] text-white/60'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Directive Prompt */}
          <div>
            <label className="text-[10px] font-mono uppercase text-white/40 block mb-1">
              Custom Topic / Narrative Directive (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Highlight that acoustic energy reached 88/100, dynamic buy orders on Meteora bonding curve, and link to Genesis quest hub."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B1A] placeholder:text-white/20"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateClick}
            disabled={isGenerating}
            className="w-full py-3 rounded-xl bg-[#FF6B1A] hover:bg-[#FF3D00] disabled:opacity-50 text-black text-xs font-display font-black transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,107,26,0.3)]"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Synthesizing Grounded Copy...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Grounded Post</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right: Integrated Composer & AI Rewrite Tools (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h2 className="text-base font-display font-black text-white uppercase flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[#FFAA00]" />
              Post Composer & Polish
            </h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold ${isOverLimit ? 'text-rose-400 font-black' : 'text-white/50'}`}>
                {charCount} / 280
              </span>
              {isOverLimit && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
            </div>
          </div>

          {/* Primary Tweet Textarea */}
          <div>
            <textarea
              rows={5}
              placeholder="Generated draft will appear here, or type custom copy..."
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              className="w-full p-4 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-white/90 focus:outline-none focus:border-[#FF6B1A] leading-relaxed"
            />
          </div>

          {/* AI Rewrite Quick-Tools */}
          <div>
            <span className="text-[10px] font-mono uppercase text-white/40 block mb-2">
              AI Rewrite Quick-Tools
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'shorten', label: '✂️ Shorten (<240 chars)' },
                { id: 'more_hype', label: '🔥 More Hype' },
                { id: 'more_professional', label: '🔬 More Scientific' },
                { id: 'add_cta', label: '⚡ Add Vanguard CTA' }
              ].map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleRewriteClick(tool.id as any)}
                  disabled={isRewriting || !composerText}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-white/80 transition-all active:scale-95 disabled:opacity-40"
                >
                  {tool.label}
                </button>
              ))}
            </div>
          </div>

          {/* Thread Items Preview if present */}
          {threadItems.length > 0 && (
            <div className="pt-3 border-t border-white/[0.06] space-y-2">
              <span className="text-[10px] font-mono uppercase text-white/40 block">
                Thread Sequence ({threadItems.length} follow-up tweets)
              </span>
              {threadItems.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs font-mono text-white/70">
                  <span className="text-white/40 mr-2">{idx + 1}/</span>
                  {item}
                </div>
              ))}
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] text-xs font-mono flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Actions Bar */}
          <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              onClick={() => onNavigateTab('approval_queue')}
              className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-white transition-all text-center"
            >
              Send to Approval Queue
            </button>

            <button
              onClick={handleDirectPublish}
              disabled={!composerText || isOverLimit}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-black text-xs font-display font-black transition-all active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish Broadcast Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
