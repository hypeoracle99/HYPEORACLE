'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { ShieldAlert, Lock, ShieldCheck, ArrowLeft, Key, CheckCircle } from 'lucide-react';
import { XManagerDashboard } from "@/components/admin/x-manager/XManagerDashboard";
import { checkIsAdminWallet, registerAdminSession } from '@/lib/admin-wallets';

export default function XManagerPage() {
  const { publicKey, connected } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [isPassAuthed, setIsPassAuthed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setMounted(true);
    const pubkeyStr = publicKey ? publicKey.toBase58() : null;
    if (checkIsAdminWallet(pubkeyStr)) {
      setIsPassAuthed(true);
      if (pubkeyStr) registerAdminSession(pubkeyStr);
    }
  }, [publicKey]);

  const isWalletAdmin = Boolean(publicKey && checkIsAdminWallet(publicKey.toBase58()));
  const isAuthorized = isWalletAdmin || isPassAuthed;

  const handleAdminKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const validKey = process.env.NEXT_PUBLIC_ADMIN_PIN || 'hypeoracle_admin_2026';
    if (adminKey.trim() === validKey) {
      registerAdminSession(publicKey ? publicKey.toBase58() : null);
      setIsPassAuthed(true);
      window.location.reload();
    } else {
      setErrorMsg('Invalid administrator access key.');
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#050709] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00FF88] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not authorized as admin, display strict 403 Restricted Gate
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#050709] text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0d0d14] border border-red-500/20 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-red-400" />
          </div>

          <span className="text-[10px] font-mono tracking-widest text-red-400 uppercase bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
            403 • RESTRICTED ACCESS
          </span>

          <h1 className="text-xl sm:text-2xl font-bold mt-4 mb-2 text-white">
            Protocol Administrator Only
          </h1>

          <p className="text-xs text-white/60 mb-6 leading-relaxed">
            The AI X Manager is restricted strictly to authorized HypeOracle protocol operators. Public access is disabled.
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-left">
              <p className="text-[11px] font-mono text-white/50 mb-3 text-center">
                Connected Solana Wallet
              </p>
              <div className="flex justify-center mb-3">
                <WalletMultiButton className="!bg-[#00FF88]/15 !border !border-[#00FF88]/30 !rounded-xl !h-10 !text-xs !font-bold !text-[#00FF88]" />
              </div>

              {connected && publicKey && (
                <div className="mt-3 p-3 rounded-xl bg-black/40 border border-white/10">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Your Wallet Address:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(publicKey.toBase58());
                        alert('Wallet address copied to clipboard!');
                      }}
                      className="text-[10px] font-mono text-[#00FF88] hover:underline"
                    >
                      Copy Full Key
                    </button>
                  </div>
                  <p className="text-[11px] font-mono text-[#00FF88] break-all select-all bg-white/[0.02] p-2 rounded-lg border border-white/5">
                    {publicKey.toBase58()}
                  </p>

                  {!isWalletAdmin && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-[10px] font-mono text-amber-400 mb-2">
                        Status: Not registered yet. Enter the protocol admin key below to authorize this wallet forever.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleAdminKeySubmit} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-left">
              <p className="text-[11px] font-mono text-white/50 mb-2">
                Authorize Wallet via Protocol Passkey:
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter admin passkey..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#00FF88]/50"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00FF88] text-black text-xs font-bold rounded-xl hover:bg-[#00FF88]/90 transition-all font-mono shrink-0"
                >
                  Authorize & Unlock
                </button>
              </div>
              <p className="text-[9.5px] font-mono text-white/40 mt-2">
                Default Master Key: <code className="text-[#00FF88]">hypeoracle_admin_2026</code>
              </p>
              {errorMsg && (
                <p className="text-[10px] font-mono text-red-400 mt-2 text-left">
                  {errorMsg}
                </p>
              )}
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.05]">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-white/40 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authorized Admin View
  return <XManagerDashboard />;
}

