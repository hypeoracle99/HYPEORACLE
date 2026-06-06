import React from 'react';
import { Shield, Lock, Eye, CheckCircle2 } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="relative min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-mono py-20 px-4 sm:px-6">
      {/* Background radial glow */}
      <div className="absolute top-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />

      <main className="relative z-10 max-w-3xl mx-auto border border-white/5 bg-black/40 rounded-3xl p-6 sm:p-10 backdrop-blur-md">
        
        {/* Header */}
        <section className="text-center pb-8 border-b border-white/5 mb-8">
          <div className="flex justify-center mb-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Shield className="w-6 h-6" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight uppercase">
            Privacy Policy
          </h1>
          <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">
            Last Updated: June 2026 · HypeOracle Protocol
          </p>
        </section>

        {/* Content Blocks */}
        <div className="space-y-8 text-xs text-white/70 leading-relaxed">
          
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wide">
              <Eye className="w-4 h-4 text-orange-400 shrink-0" />
              <h2>1. Information We Collect</h2>
            </div>
            <p>
              The HypeOracle DePIN client collects the following sensor and node metadata to evaluate collective consciousness trading parameters:
            </p>
            <ul className="list-disc list-inside pl-2 space-y-1.5 text-white/60">
              <li>
                <strong className="text-white">Audio Recording (Voice Vibe)</strong>: If permission is explicitly granted, the client records up to 5 seconds of audio to evaluate volume and excitement. This audio is transmitted securely to our AI model endpoint for immediate sentiment scoring. <span className="text-orange-400 font-bold">We do not store or keep raw audio recordings on our servers</span>; they are discarded immediately after analysis.
              </li>
              <li>
                <strong className="text-white">Device Motion & Accelerometer Data</strong>: We collect physical vibration/shake magnitude statistics locally during the 5-second sampling window. This serves as a DePIN proof-of-physicality check to prevent botting and Sybil consensus attacks.
              </li>
              <li>
                <strong className="text-white">Solana Wallet Address</strong>: When you connect your decentralized wallet (e.g., Phantom or Solflare), we view your public key to retrieve $HYPE token staking records and process smart contract transactions you authorize.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wide">
              <Lock className="w-4 h-4 text-orange-400 shrink-0" />
              <h2>2. How We Use Your Data</h2>
            </div>
            <p>
              We process sensor telemetry solely to run the sentiment oracle algorithms:
            </p>
            <ul className="list-disc list-inside pl-2 space-y-1.5 text-white/60">
              <li>To compute collective vibe indices used as automated trading signals on Solana.</li>
              <li>To prevent botting and verify authentic physical node activity (Proof of Vibe).</li>
              <li>To process manual prediction stakes, pool payouts, and staking updates.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wide">
              <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
              <h2>3. Data Sharing & Security</h2>
            </div>
            <p>
              We do not sell, rent, or distribute any user identifiers or sensor metrics to marketing networks or third parties. 
            </p>
            <p>
              All financial prediction transactions, claims, and staking actions occur directly on the decentralized Solana blockchain. Transactions are transparent, public, and secured by your wallet's cryptography.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wide">
              <Shield className="w-4 h-4 text-orange-400 shrink-0" />
              <h2>4. Target Audience & Age Restrictions</h2>
            </div>
            <p>
              Our services are strictly designed and intended for users who are **18 years of age or older**. We do not knowingly collect or solicit any data from children under 13. If we discover any records matching users under 18, we will immediately purge them from all context logs.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wide">
              <Shield className="w-4 h-4 text-orange-400 shrink-0" />
              <h2>5. Contact Information</h2>
            </div>
            <p>
              For any questions regarding this policy or the DePIN sensory framework, reach out to the HypeOracle core team on our official channels:
            </p>
            <div className="flex flex-col gap-1 mt-2 text-white/50 pl-2">
              <p>Twitter / X: <span className="text-white">@HypeOracle1</span></p>
              <p>Telegram: <span className="text-white">t.me/hypeoracle</span></p>
            </div>
          </section>

        </div>

        {/* Footer info */}
        <div className="mt-10 pt-6 border-t border-white/5 text-center">
          <p className="text-[10px] text-white/30 uppercase tracking-widest">
            HypeOracle · Verifiable DePIN Sentiment Stream
          </p>
        </div>

      </main>
    </div>
  );
}
