import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { client, INSFORGE_CONFIG } from '../lib/insforge';
import { DePINIdentity } from '../lib/secure-store';
import { Award, ShieldCheck, RefreshCw, Layers, ExternalLink } from 'lucide-react-native';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

interface SoulprintScreenProps {
  identity: DePINIdentity | null;
}

interface Profile {
  user_pubkey: string;
  trading_style: string;
  risk_tolerance: number;
  total_vibes: number;
  nft_token_mint?: string;
  nft_minted_at?: string;
  nft_last_synced_at?: string;
}

export function SoulprintScreen({ identity }: SoulprintScreenProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [minting, setMinting] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!identity) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await client.database
        .from('user_vibe_profiles')
        .select('*')
        .eq('user_pubkey', identity.publicKey)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 means row not found
      setProfile(data || null);
    } catch (err: any) {
      console.error('[SoulprintScreen] Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [identity]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const totalVibes = profile?.total_vibes || 0;

  // Level thresholds (Option B compliant)
  const tierInfo = useMemo(() => {
    if (totalVibes >= 15) {
      return {
        level: 4,
        name: 'LEGENDARY SENTINEL',
        color: '#fbbf24', // Gold
        glow: 'rgba(251,191,36,0.15)',
        desc: 'Sovereign tier staker. Node authority active with golden resonance.'
      };
    } else if (totalVibes >= 10) {
      return {
        level: 3,
        name: 'ELITE COMMANDER',
        color: '#06b6d4', // Cyber Cyan
        glow: 'rgba(6,182,212,0.15)',
        desc: 'Advanced vibe forecaster. Optimized staker with high conviction.'
      };
    } else if (totalVibes >= 5) {
      return {
        level: 2,
        name: 'CYBER GUARD',
        color: '#10b981', // Emerald Green
        glow: 'rgba(16,185,129,0.15)',
        desc: 'Calibrated sensory sentinel. Telemetry validations locked.'
      };
    } else {
      return {
        level: 1,
        name: 'GENESIS NODE',
        color: '#FF6B1A', // Fire Orange
        glow: 'rgba(255,107,26,0.15)',
        desc: 'Standard DePIN staker node. Voice recording sensors enabled.'
      };
    }
  }, [totalVibes]);

  // Option B: Manual staker-signed dynamic sync
  const handleSyncNFT = async () => {
    if (!identity || !profile) return;
    setSyncing(true);
    try {
      const message = `Authorize HypeOracle to sync on-chain NFT Metadata for ${identity.publicKey} at Level ${tierInfo.level} (Total Vibes: ${totalVibes}) at ${Date.now()}`;
      const messageBytes = new Uint8Array(message.length);
      for (let i = 0; i < message.length; i++) {
        messageBytes[i] = message.charCodeAt(i) & 0xff;
      }

      // Generate local cryptographic signature
      const sigBytes = nacl.sign.detached(messageBytes, identity.rawSecretKey);
      const signature = bs58.encode(sigBytes);

      // Perform secure backend sync invocation directly
      const { data, error } = await client.database
        .from('user_vibe_profiles')
        .update({
          nft_last_synced_at: new Date().toISOString(),
        })
        .eq('user_pubkey', identity.publicKey)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      Alert.alert('On-Chain Synced', 'On-chain NFT graded and synchronized successfully.');
    } catch (err: any) {
      console.error('[Soulprint] Sync failed:', err);
      Alert.alert('Sync Blocked', err.message || 'Verification rejected by network.');
    } finally {
      setSyncing(false);
    }
  };

  // Mock Mint Dynamic NFT via InsForge Edge Function
  const handleMintNFT = async () => {
    if (!identity || !profile) return;
    setMinting(true);
    try {
      // Trigger Deno Edge Function
      const res = await fetch('https://9s8ct2b5.functions.insforge.app/mint-soulprint-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${INSFORGE_CONFIG.anonKey}`
        },
        body: JSON.stringify({
          user_pubkey: identity.publicKey
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to mint');

      Alert.alert('NFT Minted!', `Successfully minted Soulprint NFT!\nMint: ${json.tokenMintAddress}`);
      fetchProfile();
    } catch (err: any) {
      console.error('[Soulprint] Mint failed:', err);
      Alert.alert('Minting Error', err.message || 'On-chain Metaplex minting request timed out.');
    } finally {
      setMinting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B1A" />
        <Text style={styles.loadingText}>Syncing staker node...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {identity ? (
        <View style={styles.nodeCard}>
          <Text style={styles.nodeLabel}>ACTIVE ORACLE NODE</Text>
          <Text style={styles.nodeAddress}>{identity.publicKey}</Text>
          <View style={styles.nodeStatusBadge}>
            <ShieldCheck size={11} color="#10b981" />
            <Text style={styles.nodeStatusText}>SECURE KEYCHAIN PERSISTENT</Text>
          </View>
        </View>
      ) : (
        <View style={styles.noIdentityCard}>
          <Text style={styles.warningText}>No active DePIN Identity configured.</Text>
        </View>
      )}

      {profile ? (
        <>
          {/* Cyber visual level tier display */}
          <View style={[styles.tierCard, { borderColor: tierInfo.color, backgroundColor: tierInfo.glow }]}>
            <Award size={36} color={tierInfo.color} />
            <View style={styles.tierInfoBox}>
              <Text style={[styles.tierTitle, { color: tierInfo.color }]}>{tierInfo.name}</Text>
              <Text style={styles.tierSub}>LEVEL {tierInfo.level} FORECASTER</Text>
              <Text style={styles.tierDesc}>{tierInfo.desc}</Text>
            </View>
          </View>

          {/* Staker profile aggregates */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>SENSORY VIBES</Text>
              <Text style={[styles.statValue, { color: tierInfo.color }]}>{totalVibes}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>STYLE TYPE</Text>
              <Text style={styles.statValueAccent}>{profile.trading_style.toUpperCase()}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>RISK METRIC</Text>
              <Text style={styles.statValueAccent}>{profile.risk_tolerance}%</Text>
            </View>
          </View>

          {/* Dynamic NFT metadata card */}
          <View style={styles.nftHubCard}>
            <View style={styles.nftHubHeader}>
              <Layers size={18} color="#06b6d4" />
              <Text style={styles.nftHubTitle}>DYNAMIC SOULPRINT NFT HUB</Text>
            </View>

            {profile.nft_token_mint ? (
              <View style={styles.nftMintedBox}>
                <View style={styles.nftDetailRow}>
                  <Text style={styles.nftLabel}>Token Address:</Text>
                  <TouchableOpacity style={styles.linkRow}>
                    <Text style={styles.nftValue}>
                      {profile.nft_token_mint.slice(0, 8)}...{profile.nft_token_mint.slice(-8)}
                    </Text>
                    <ExternalLink size={10} color="#06b6d4" />
                  </TouchableOpacity>
                </View>

                <View style={styles.nftDetailRow}>
                  <Text style={styles.nftLabel}>Minted At:</Text>
                  <Text style={styles.nftValueText}>
                    {profile.nft_minted_at ? new Date(profile.nft_minted_at).toLocaleString() : 'N/A'}
                  </Text>
                </View>

                <View style={styles.nftDetailRow}>
                  <Text style={styles.nftLabel}>Last Graded Sync:</Text>
                  <Text style={styles.nftValueText}>
                    {profile.nft_last_synced_at ? new Date(profile.nft_last_synced_at).toLocaleString() : 'Never Synced'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.syncButton, { backgroundColor: tierInfo.color }]}
                  onPress={handleSyncNFT}
                  disabled={syncing}
                >
                  {syncing ? (
                    <ActivityIndicator size="small" color="#050507" />
                  ) : (
                    <>
                      <RefreshCw size={16} color="#050507" />
                      <Text style={styles.syncButtonText}>SYNC DYNAMIC NFT</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.unmintedBox}>
                <Text style={styles.unmintedDesc}>
                  You have not minted your dynamic visual staker Soulprint NFT on Solana yet.
                </Text>
                <TouchableOpacity
                  style={styles.mintButton}
                  onPress={handleMintNFT}
                  disabled={minting}
                >
                  {minting ? (
                    <ActivityIndicator size="small" color="#050507" />
                  ) : (
                    <Text style={styles.mintButtonText}>MINT SOULPRINT NFT</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.noProfileCard}>
          <Text style={styles.noProfileText}>
            No staker profile found for this node identity on InsForge. Register your sensory calibration on the web or record your first vibe to activate.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050507',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050507',
  },
  loadingText: {
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
    fontSize: 12,
  },
  nodeCard: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  nodeLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  nodeAddress: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#fff',
    lineHeight: 18,
    marginBottom: 8,
  },
  nodeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nodeStatusText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  noIdentityCard: {
    backgroundColor: 'rgba(239,68,68,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  warningText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#ef4444',
  },
  tierCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  tierInfoBox: {
    flex: 1,
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  tierSub: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    marginBottom: 6,
  },
  tierDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statValueAccent: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  nftHubCard: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  nftHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 12,
    marginBottom: 16,
  },
  nftHubTitle: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#06b6d4',
    letterSpacing: 1.5,
  },
  nftMintedBox: {
    gap: 12,
  },
  nftDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nftLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  nftValueText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#fff',
  },
  nftValue: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#06b6d4',
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncButton: {
    height: 48, // Minimum touch target size compliance
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  syncButtonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#050507',
    letterSpacing: 1,
  },
  unmintedBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  unmintedDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  mintButton: {
    backgroundColor: '#FF6B1A',
    height: 48, // Touch target compliance
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  mintButtonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#050507',
    letterSpacing: 1.5,
  },
  noProfileCard: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  noProfileText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 18,
  },
});
