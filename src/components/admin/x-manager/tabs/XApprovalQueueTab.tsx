'use client';

import React, { useState } from 'react';
import { 
  Clock, Check, X, Calendar, Send, Edit3, 
  AlertCircle, MessageSquare, Layers, Sparkles 
} from 'lucide-react';
import { XDraft } from '@/lib/x-manager-types';

interface XApprovalQueueTabProps {
  drafts: XDraft[];
  onPublishNow: (draftId: string) => Promise<void>;
  onSchedule: (draftId: string, scheduledFor: string) => Promise<void>;
  onReject: (draftId: string, reason: string) => Promise<void>;
  onRefresh: () => void;
}

export function XApprovalQueueTab({
  drafts,
  onPublishNow,
  onSchedule,
  onReject,
  onRefresh
}: XApprovalQueueTabProps) {
  const [scheduleModalDraft, setScheduleModalDraft] = useState<XDraft | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [rejectModalDraft, setRejectModalDraft] = useState<XDraft | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingDrafts = drafts.filter((d) => d.status === 'pending_approval');

  async function handleScheduleSubmit() {
    if (!scheduleModalDraft || !scheduledDate) return;
    setIsProcessing(true);
    try {
      await onSchedule(scheduleModalDraft.id, new Date(scheduledDate).toISOString());
      setScheduleModalDraft(null);
      setScheduledDate('');
      onRefresh();
    } catch (err: any) {
      alert(`Scheduling failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRejectSubmit() {
    if (!rejectModalDraft) return;
    setIsProcessing(true);
    try {
      await onReject(rejectModalDraft.id, rejectionReason || 'Content does not fit current communication cadence');
      setRejectModalDraft(null);
      setRejectionReason('');
      onRefresh();
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div>
          <h2 className="text-base font-display font-black text-white uppercase flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FFAA00]" />
            Human-In-The-Loop Approval Queue
          </h2>
          <p className="text-xs font-mono text-white/50">
            Strict safety net: Every AI-generated draft must be reviewed, edited, scheduled, or published by an administrator.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-[#FFAA00]/20 text-[#FFAA00] text-xs font-mono font-bold">
          {pendingDrafts.length} Pending
        </span>
      </div>

      {pendingDrafts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <Check className="w-8 h-8 text-[#10B981] mx-auto mb-3" />
          <h3 className="text-sm font-display font-bold text-white">Queue is Clear</h3>
          <p className="text-xs font-mono text-white/50 mt-1">All AI drafts have been reviewed or dispatched.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingDrafts.map((draft) => (
            <div key={draft.id} className="p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.03] border border-white/[0.08] space-y-4 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[9px] font-mono uppercase bg-white/10 text-white/70">
                    {draft.contentType}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[9px] font-mono uppercase bg-[#FF6B1A]/20 text-[#FF6B1A] font-bold">
                    {draft.tone} tone
                  </span>
                  {draft.sentimentScoreReferenced && (
                    <span className="text-[10px] font-mono text-white/40">
                      Referenced Hype: {draft.sentimentScoreReferenced}/100
                    </span>
                  )}
                </div>

                <span className="text-[10px] font-mono text-white/40">
                  Generated {new Date(draft.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Text Body */}
              <p className="text-xs font-mono text-white/90 whitespace-pre-wrap leading-relaxed">
                {draft.primaryText}
              </p>

              {/* Thread Items if any */}
              {draft.threadItems && draft.threadItems.length > 0 && (
                <div className="pl-3 border-l-2 border-[#FF6B1A]/40 space-y-2 mt-2">
                  <span className="text-[10px] font-mono text-[#FFAA00] block">Thread Follow-ups:</span>
                  {draft.threadItems.map((item, idx) => (
                    <p key={idx} className="text-xs font-mono text-white/70">
                      {idx + 1}/ {item}
                    </p>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
                <button
                  onClick={() => setRejectModalDraft(draft)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 text-white/60 hover:text-rose-400 text-xs font-mono transition-all"
                >
                  Reject Draft
                </button>

                <button
                  onClick={() => setScheduleModalDraft(draft)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-all"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#FFAA00]" />
                  <span>Approve & Schedule</span>
                </button>

                <button
                  onClick={() => onPublishNow(draft.id)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-black text-xs font-mono font-bold transition-all active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Now</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModalDraft && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#0e0e12] border border-white/10 space-y-4">
            <h3 className="text-base font-display font-bold text-white">Schedule Broadcast Time</h3>
            <p className="text-xs text-white/60">
              The post will enter the chronological queue and dispatch via the X API at your chosen time.
            </p>

            <div>
              <label className="text-[10px] font-mono uppercase text-white/40 block mb-1">Target Dispatch Time</label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B1A]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setScheduleModalDraft(null)}
                className="px-3 py-1.5 rounded-xl bg-white/5 text-xs font-mono text-white/60"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleSubmit}
                disabled={!scheduledDate || isProcessing}
                className="px-4 py-1.5 rounded-xl bg-[#FFAA00] hover:bg-[#FF8C00] text-black text-xs font-mono font-bold disabled:opacity-50"
              >
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalDraft && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#0e0e12] border border-white/10 space-y-4">
            <h3 className="text-base font-display font-bold text-white">Reject Content Draft</h3>
            <p className="text-xs text-white/60">
              Provide feedback notes. These notes are saved to the audit log to align future AI prompting.
            </p>

            <div>
              <label className="text-[10px] font-mono uppercase text-white/40 block mb-1">Rejection Feedback</label>
              <textarea
                rows={3}
                placeholder="e.g. Tone was too aggressive, wait for next Bags.fm sprint."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalDraft(null)}
                className="px-3 py-1.5 rounded-xl bg-white/5 text-xs font-mono text-white/60"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={isProcessing}
                className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-mono font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
