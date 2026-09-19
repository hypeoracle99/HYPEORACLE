'use client';

import React, { useState } from 'react';
import { 
  Settings, Shield, Check, AlertTriangle, Key, 
  RefreshCw, Clock, Bot, ListFilter, Play 
} from 'lucide-react';
import { XAutomationSettings, XAuditLog } from '@/lib/x-manager-types';

interface XSettingsAuditTabProps {
  settings: XAutomationSettings;
  auditLogs: XAuditLog[];
  onUpdateSettings: (updates: Partial<XAutomationSettings>) => Promise<void>;
  onTestConnection: () => Promise<any>;
}

export function XSettingsAuditTab({
  settings,
  auditLogs,
  onUpdateSettings,
  onTestConnection
}: XSettingsAuditTabProps) {
  const [autopilotEnabled, setAutopilotEnabled] = useState(settings.autopilotEnabled);
  const [intervalHours, setIntervalHours] = useState(settings.autopilotIntervalHours);
  const [dailyPostLimit, setDailyPostLimit] = useState(settings.dailyPostLimit);
  const [dailyReplyLimit, setDailyReplyLimit] = useState(settings.dailyReplyLimit);
  const [requireApproval, setRequireApproval] = useState(settings.requireHumanApproval);
  const [autoComment, setAutoComment] = useState(settings.autoCommentEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  async function handleSaveSettings() {
    setIsSaving(true);
    try {
      await onUpdateSettings({
        autopilotEnabled,
        autopilotIntervalHours: Number(intervalHours),
        dailyPostLimit: Number(dailyPostLimit),
        dailyReplyLimit: Number(dailyReplyLimit),
        requireHumanApproval: requireApproval,
        autoCommentEnabled: autoComment
      });
      alert('Automation settings updated successfully!');
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTestConnectionClick() {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ connected: false, message: err.message });
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-white/[0.06]">
        <h2 className="text-base font-display font-black text-white uppercase flex items-center gap-2">
          <Settings className="w-4 h-4 text-white/70" />
          Autopilot Configuration & Audit Logs
        </h2>
        <p className="text-xs font-mono text-white/50">
          Configure unattended posting intervals, safety limits, X API connection diagnostics, and review the immutable security trail.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Autopilot & Safety Controls */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-6">
          <h3 className="text-sm font-display font-bold text-white uppercase flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#FF6B1A]" />
            Autonomous Social Autopilot
          </h3>

          {/* Autopilot Master Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/[0.06]">
            <div>
              <div className="text-xs font-mono font-bold text-white">Unattended Autopilot Posting</div>
              <div className="text-[11px] font-mono text-white/50">Generates and prepares posts automatically on a schedule</div>
            </div>
            <button
              type="button"
              onClick={() => setAutopilotEnabled(!autopilotEnabled)}
              className={`w-12 h-6 rounded-full transition-all relative ${
                autopilotEnabled ? 'bg-[#10B981]' : 'bg-white/20'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-all absolute top-0.5 ${
                autopilotEnabled ? 'left-6.5' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* Interval & Daily Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono uppercase text-white/40 block mb-1">
                Posting Frequency
              </label>
              <select
                value={intervalHours}
                onChange={(e) => setIntervalHours(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B1A]"
              >
                <option value={4}>Every 4 Hours</option>
                <option value={6}>Every 6 Hours</option>
                <option value={8}>Every 8 Hours</option>
                <option value={12}>Every 12 Hours</option>
                <option value={24}>Once Daily (24h)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-white/40 block mb-1">
                Max Daily Posts Cap
              </label>
              <input
                type="number"
                value={dailyPostLimit}
                onChange={(e) => setDailyPostLimit(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B1A]"
              />
            </div>
          </div>

          {/* Approval Gate Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/[0.06]">
            <div>
              <div className="text-xs font-mono font-bold text-white">Require Human Admin Approval</div>
              <div className="text-[11px] font-mono text-white/50">When disabled, AI posts directly without staging in queue</div>
            </div>
            <button
              type="button"
              onClick={() => setRequireApproval(!requireApproval)}
              className={`w-12 h-6 rounded-full transition-all relative ${
                requireApproval ? 'bg-[#FFAA00]' : 'bg-white/20'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-all absolute top-0.5 ${
                requireApproval ? 'left-6.5' : 'left-0.5'
              }`} />
            </button>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="w-full py-2.5 rounded-xl bg-[#FF6B1A] hover:bg-[#FF3D00] text-black text-xs font-display font-black transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Saving Configuration...' : 'Save Autopilot Settings'}
          </button>
        </div>

        {/* Right: X API Connection Diagnostics & Brand Safety */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-6">
          <h3 className="text-sm font-display font-bold text-white uppercase flex items-center gap-2">
            <Key className="w-4 h-4 text-[#FFAA00]" />
            Official X API v2 Connection
          </h3>

          <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-white/40">Credential Status:</span>
              <span className="text-[#FFAA00] font-bold">Configured via .env.local</span>
            </div>
            <p className="text-xs font-mono text-white/60">
              Keys: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET. Secrets remain strictly on the backend.
            </p>

            <button
              onClick={handleTestConnectionClick}
              disabled={isTesting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Pinging API...' : 'Test Connection & Account Sync'}</span>
            </button>

            {testResult && (
              <div className={`p-3 rounded-lg text-xs font-mono ${
                testResult.connected 
                  ? 'bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981]' 
                  : 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
              }`}>
                {testResult.message}
              </div>
            )}
          </div>

          {/* Brand Safety Policy */}
          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            <span className="text-xs font-display font-bold text-white uppercase">Automated Banned Phrase Filter</span>
            <div className="flex flex-wrap gap-1.5">
              {['guaranteed 100x', 'pump incoming', 'airdrop claim link', 'financial advice', 'send sol'].map((phrase, i) => (
                <span key={i} className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-mono">
                  🚫 {phrase}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Immutable Audit Trail */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
        <h3 className="text-sm font-display font-bold text-white uppercase flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#10B981]" />
          Immutable Security & Action Audit Trail
        </h3>

        <div className="divide-y divide-white/[0.04] text-xs font-mono">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-[10px]">
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="text-white font-bold">[{log.actionType}]</span>
                <span className="text-white/60">by {log.actorIdentity}</span>
              </div>
              <span className="text-white/30 text-[10px]">Target: {log.targetType}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
