'use client';

import React from 'react';
import { Calendar, Clock, Send, CheckCircle2, Play, AlertCircle } from 'lucide-react';
import { XScheduledPost, XPublishedPost } from '@/lib/x-manager-types';

interface XCalendarTabProps {
  scheduled: XScheduledPost[];
  published: XPublishedPost[];
  onTriggerWorker: () => void;
  isWorking: boolean;
}

export function XCalendarTab({
  scheduled,
  published,
  onTriggerWorker,
  isWorking
}: XCalendarTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <h2 className="text-base font-display font-black text-white uppercase flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#06B6D4]" />
            Broadcast Schedule & Timeline
          </h2>
          <p className="text-xs font-mono text-white/50">
            Chronological queue of upcoming scheduled broadcasts and past published dispatches.
          </p>
        </div>

        <button
          onClick={onTriggerWorker}
          disabled={isWorking}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-white transition-all active:scale-95 disabled:opacity-50"
        >
          <Play className={`w-3.5 h-3.5 text-[#10B981] ${isWorking ? 'animate-spin' : ''}`} />
          <span>{isWorking ? 'Executing Worker Cycle...' : 'Run Scheduled Worker Now'}</span>
        </button>
      </div>

      {/* Upcoming Scheduled Queue */}
      <div className="space-y-3">
        <h3 className="text-sm font-display font-bold text-white uppercase flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#FFAA00]" />
          Queued for Dispatch ({scheduled.length})
        </h3>

        {scheduled.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/[0.04] text-xs font-mono text-white/40">
            No posts currently queued. Schedule drafts from the Content Studio or Approval Queue.
          </div>
        ) : (
          <div className="space-y-3">
            {scheduled.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
                    <span className="px-2 py-0.5 rounded bg-[#FFAA00]/20 text-[#FFAA00] font-bold uppercase">
                      {item.status}
                    </span>
                    <span>Target: {new Date(item.scheduledFor).toLocaleString()}</span>
                  </div>
                  <p className="text-xs font-mono text-white/90 line-clamp-2 max-w-2xl">
                    {item.primaryText}
                  </p>
                </div>

                <span className="text-[10px] font-mono text-white/30 shrink-0">
                  ID: {item.id.slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Published History Timeline */}
      <div className="space-y-3 pt-6 border-t border-white/[0.06]">
        <h3 className="text-sm font-display font-bold text-white uppercase flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          Dispatched Posts History ({published.length})
        </h3>

        <div className="space-y-3">
          {published.map((post) => (
            <div key={post.id} className="p-4 rounded-xl bg-black/40 border border-white/[0.04] space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                <span>Dispatched: {new Date(post.publishedAt).toLocaleString()}</span>
                <span>Tweet ID: {post.xTweetId}</span>
              </div>
              <p className="text-xs font-mono text-white/80">{post.primaryText}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
