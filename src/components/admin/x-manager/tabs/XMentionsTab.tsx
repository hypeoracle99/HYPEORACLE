'use client';

import React, { useState } from 'react';
import { 
  MessageSquare, Send, Check, Sparkles, User, 
  HelpCircle, ThumbsUp, AlertCircle, Edit3, Radio
} from 'lucide-react';
import { XMention } from '@/lib/x-manager-types';

interface XMentionsTabProps {
  mentions: XMention[];
  onReplyToMention: (mentionId: string, replyText: string) => Promise<void>;
  onRefresh: () => void;
}

export function XMentionsTab({
  mentions,
  onReplyToMention,
  onRefresh
}: XMentionsTabProps) {
  const [editingMentionId, setEditingMentionId] = useState<string | null>(null);
  const [editedReplyText, setEditedReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  async function handleSendReply(mentionId: string, text: string) {
    setIsReplying(true);
    try {
      await onReplyToMention(mentionId, text);
      setEditingMentionId(null);
      setEditedReplyText('');
      onRefresh();
    } catch (err: any) {
      alert(`Reply failed: ${err.message}`);
    } finally {
      setIsReplying(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div>
          <h2 className="text-base font-display font-black text-white uppercase flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#FFAA00]" />
            Community Mentions & AI Reply Assistant
          </h2>
          <p className="text-xs font-mono text-white/50">
            Incoming tweets tagging @HypeOracle with automated sentiment categorization and 1-click AI replies.
          </p>
        </div>
        <span className="text-xs font-mono text-white/40">{mentions.length} Mentions Tracked</span>
      </div>

      <div className="space-y-4">
        {mentions.map((mention) => (
          <div key={mention.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-mono text-xs font-bold text-white">
                  {mention.authorUsername.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <span>{mention.authorName || mention.authorUsername}</span>
                    <span className="text-white/40 font-normal">@{mention.authorUsername}</span>
                  </div>
                  <span className="text-[10px] font-mono text-white/40">
                    {new Date(mention.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-white/10 text-white/70">
                  {mention.category}
                </span>
                {mention.hasReplied && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-[#10B981]/20 text-[#10B981] font-bold">
                    ✓ Replied
                  </span>
                )}
              </div>
            </div>

            {/* Mention Body */}
            <p className="text-xs font-mono text-white/85 leading-relaxed pl-10">
              {mention.tweetText}
            </p>

            {/* AI Reply Assistant Suggestion Box */}
            {mention.suggestedReply && !mention.hasReplied && (
              <div className="ml-10 p-4 rounded-xl bg-gradient-to-r from-[#FF6B1A]/10 to-transparent border border-[#FF6B1A]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#FFAA00] font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Suggested Reply ({mention.suggestedReply.tone} tone)
                  </span>
                  {mention.suggestedReply.reasoning && (
                    <span className="text-[10px] font-mono text-white/40 hidden sm:inline">
                      💡 {mention.suggestedReply.reasoning}
                    </span>
                  )}
                </div>

                {editingMentionId === mention.id ? (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={editedReplyText}
                      onChange={(e) => setEditedReplyText(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B1A]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingMentionId(null)}
                        className="px-3 py-1 rounded-lg bg-white/5 text-xs font-mono text-white/60"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSendReply(mention.id, editedReplyText)}
                        className="px-3 py-1 rounded-lg bg-[#10B981] text-black text-xs font-mono font-bold"
                      >
                        Send Edited Reply
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p className="text-xs font-mono text-white/90">
                      {mention.suggestedReply.suggestedReplyText}
                    </p>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingMentionId(mention.id);
                          setEditedReplyText(mention.suggestedReply!.suggestedReplyText);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                        title="Edit before sending"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleSendReply(mention.id, mention.suggestedReply!.suggestedReplyText)}
                        disabled={isReplying}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-black text-xs font-mono font-bold transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>Post Reply</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
