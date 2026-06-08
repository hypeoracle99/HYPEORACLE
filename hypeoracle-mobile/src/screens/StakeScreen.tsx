import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import bs58 from 'bs58';
import { client } from '../lib/insforge';
import { DePINIdentity } from '../lib/secure-store';
import { Coins, Zap, TrendingUp, ShieldCheck, Landmark, RotateCcw, AlertTriangle } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const HYPE_MINT = '5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS';
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

interface StakeScreenProps {
  identity: DePINIdentity | null;
}

export function StakeScreen({ identity }: StakeScreenProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [fuel, setFuel] = useState<any>(null);
  const [userStake, setUserStake] = useState<any>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [stakingStatus, setStakingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [unstakingStatus, setUnstakingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [claiming, setClaiming] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const fetchStakingData = useCallback(async () => {
    if (!identity) {
      setLoading(false);
      return;
    }

    try {
      const [statsRes, fuelRes, userRes, leaderboardRes] = await Promise.all([
        client.database.from('hype_token_stats').select('*').limit(1),
        client.database.from('oracle_fuel').select('*').limit(1),
        client.database.from('user_staking').select('*').eq('user_pubkey', identity.publicKey).limit(1),
        client.database.from('user_staking').select('user_pubkey, staked_amount').order('staked_amount', { ascending: false }).limit(5)
      ]);

      if (statsRes.data && statsRes.data[0]) setStats(statsRes.data[0]);
      if (fuelRes.data && fuelRes.data[0]) setFuel(fuelRes.data[0]);
      
      if (userRes.data && userRes.data[0]) {
        setUserStake(userRes.data[0]);
      } else {
        setUserStake({ user_pubkey: identity.publicKey, staked_amount: 0, pending_rewards: 0 });
      }

      if (leaderboardRes.data) setLeaderboard(leaderboardRes.data);
    } catch (err) {
      console.error('[StakeScreen] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [identity]);

  useEffect(() => {
    fetchStakingData();
    const interval = setInterval(fetchStakingData, 15000);
    return () => clearInterval(interval);
  }, [fetchStakingData]);

  const handleClaim = async () => {
    if (!identity) return;
    setClaiming(true);
    try {
      const res = await fetch('https://9s8ct2b5.functions.insforge.app/claim-staking-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_pubkey: identity.publicKey })
      });
      const result = await res.json();
      if (result.success) {
        Alert.alert('Rewards Claimed!', `Claimed ${result.claimed_amount.toFixed(6)} SOL successfully.`);
        fetchStakingData();
      } else {
        Alert.alert('Claim Failed', result.error || 'Server rejected request.');
      }
    } catch (err: any) {
      Alert.alert('Claim Error', err.message || 'Transmission error.');
    } finally {
      setClaiming(false);
    }
  };

  const handleStake = async () => {
    if (!identity || !stakeAmount || !fuel?.oracle_pubkey) {
      if (!fuel?.oracle_pubkey) Alert.alert('Error', 'Oracle public key not synchronized. Refreshing...');
      return;
    }

    if (identity.isExternal) {
      Alert.alert('Action Blocked', 'Built-in staking requires a local node wallet. Please import your private key or create a fresh local identity under settings.');
      return;
    }

    setStakingStatus('loading');
    try {
      // 1. Setup Solana Connection & Keys
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');
      const stakerWallet = Keypair.fromSecretKey(identity.rawSecretKey);
      const mintPubKey = new PublicKey(HYPE_MINT);
      const vaultPubKey = new PublicKey(fuel.oracle_pubkey);
      const amount = parseFloat(stakeAmount) * 1e9; // 9 decimals for HYPE

      const userAta = await getAssociatedTokenAddress(mintPubKey, stakerWallet.publicKey);
      const vaultAta = await getAssociatedTokenAddress(mintPubKey, vaultPubKey);

      const transaction = new Transaction();
      transaction.add(
        createTransferInstruction(
          userAta,
          vaultAta,
          stakerWallet.publicKey,
          amount
        )
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = stakerWallet.publicKey;

      // 2. Sign and broadcast transaction natively
      transaction.sign(stakerWallet);
      const serializedTx = transaction.serialize();
      const signature = await connection.sendRawTransaction(serializedTx);
      
      // 3. Confirm transfer and register with InsForge stake ledger
      const res = await fetch('https://9s8ct2b5.functions.insforge.app/stake-hype', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_pubkey: identity.publicKey,
          amount_hype: parseFloat(stakeAmount),
          signature: signature
        })
      });

      const result = await res.json();
      if (result.success) {
        setStakingStatus('success');
        setStakeAmount('');
        Alert.alert('Position Locked!', `Successfully staked ${stakeAmount} $HYPE.`);
        fetchStakingData();
        setTimeout(() => setStakingStatus('idle'), 3000);
      } else {
        setStakingStatus('error');
        Alert.alert('Ledger Sync Failed', result.error || 'Server staking registration failed.');
      }
    } catch (err: any) {
      console.error('[StakeScreen] Staking failed:', err);
      Alert.alert('Staking Failed', err.message || 'On-chain transaction failed. Verify SOL gas and HYPE balances.');
      setStakingStatus('error');
    }
  };

  const handleUnstake = async () => {
    if (!identity || !unstakeAmount) return;
    setUnstakingStatus('loading');
    try {
      const res = await fetch('https://9s8ct2b5.functions.insforge.app/unstake-hype', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_pubkey: identity.publicKey,
          amount_hype: parseFloat(unstakeAmount)
        })
      });

      const result = await res.json();
      if (result.success) {
        setUnstakingStatus('success');
        setUnstakeAmount('');
        Alert.alert('Position Unlocked', `Successfully unstaked ${unstakeAmount} $HYPE. On-chain payout executing.`);
        fetchStakingData();
        setTimeout(() => setUnstakingStatus('idle'), 3000);
      } else {
        Alert.alert('Unstake Rejected', result.error || 'Unstaking failed.');
        setUnstakingStatus('error');
      }
    } catch (err: any) {
      Alert.alert('Unstake Error', err.message || 'Unstake request rejected.');
      setUnstakingStatus('error');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B1A" />
        <Text style={styles.loadingText}>SYNCING STAKING LEDGER...</Text>
      </View>
    );
  }

  const userStakedAmount = userStake ? Number(userStake.staked_amount) : 0;
  const multiplier = 1 + Math.min(0.5, userStakedAmount / 1_000_000);
  const unclaimedRewards = userStake ? Number(userStake.pending_rewards || 0) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* HUD Global Staking Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TOTAL STAKED</Text>
          <Text style={styles.statValue}>
            {stats ? `${(Number(stats.total_staked) / 1000).toFixed(1)}K` : '0.0K'}
          </Text>
          <Text style={styles.statSub}>$HYPE POOL</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>REWARD SHARE</Text>
          <Text style={[styles.statValue, { color: '#10b981' }]}>40.0%</Text>
          <Text style={styles.statSub}>PLATFORM FEES</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>EST. APY</Text>
          <Text style={[styles.statValue, { color: '#fbbf24' }]}>12.5%</Text>
          <Text style={styles.statSub}>DYNAMIC</Text>
        </View>
      </View>

      {/* Main Staking Controls */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Coins size={18} color="#FF6B1A" />
          <Text style={styles.panelTitle}>MANAGE STAKE POSITION</Text>
        </View>

        {/* User Stake Info */}
        <View style={styles.userPositions}>
          <View style={styles.positionCard}>
            <Text style={styles.positionLabel}>YOUR ACTIVE STAKE</Text>
            <Text style={styles.positionValue}>
              {userStakedAmount.toLocaleString()} <Text style={styles.positionUnit}>HYPE</Text>
            </Text>
          </View>
          <View style={styles.positionCard}>
            <Text style={styles.positionLabel}>VIBE MULTIPLIER</Text>
            <Text style={[styles.positionValue, { color: '#FF6B1A' }]}>
              {multiplier.toFixed(2)}x
            </Text>
          </View>
        </View>

        {/* Claim Rewards Box */}
        <View style={styles.rewardBox}>
          <View>
            <Text style={styles.rewardLabel}>PENDING REWARDS</Text>
            <Text style={styles.rewardValue}>
              {unclaimedRewards.toFixed(5)} <Text style={styles.rewardUnit}>SOL</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.claimButton, unclaimedRewards <= 0 && styles.disabledBtn]}
            onPress={handleClaim}
            disabled={claiming || unclaimedRewards <= 0}
          >
            {claiming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.claimBtnText}>CLAIM SOL</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Stake Form */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={stakeAmount}
            onChangeText={setStakeAmount}
            placeholder="Enter $HYPE to stake..."
            placeholderTextColor="rgba(255,255,255,0.2)"
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleStake}
            disabled={stakingStatus === 'loading' || !stakeAmount}
          >
            {stakingStatus === 'loading' ? (
              <ActivityIndicator size="small" color="#050507" />
            ) : (
              <Text style={styles.actionBtnText}>LOCK STAKE</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.separator}>
          <View style={styles.sepLine} />
          <Text style={styles.sepText}>MANAGED WITHDRAWAL</Text>
          <View style={styles.sepLine} />
        </View>

        {/* Unstake Form */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.textInput, styles.textInputAlt]}
            value={unstakeAmount}
            onChangeText={setUnstakeAmount}
            placeholder="Unstake $HYPE..."
            placeholderTextColor="rgba(255,255,255,0.2)"
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonAlt]}
            onPress={handleUnstake}
            disabled={unstakingStatus === 'loading' || !unstakeAmount}
          >
            {unstakingStatus === 'loading' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionBtnTextAlt}>UNSTAKE</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stakers Leaderboard */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <TrendingUp size={18} color="#FF6B1A" />
          <Text style={styles.panelTitle}>TOP ORACLE GUARDIANS</Text>
        </View>

        <View style={styles.leaderboardList}>
          {leaderboard.length > 0 ? (
            leaderboard.map((staker, idx) => (
              <View key={staker.user_pubkey} style={styles.leaderRow}>
                <View style={styles.leaderLeft}>
                  <View style={[styles.leaderBadge, idx === 0 && styles.goldBadge]}>
                    <Text style={[styles.leaderBadgeText, idx === 0 && styles.goldBadgeText]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.leaderPubKey}>
                      {staker.user_pubkey.slice(0, 6)}...{staker.user_pubkey.slice(-6)}
                    </Text>
                    <Text style={styles.leaderRole}>
                      {idx === 0 ? 'LEGENDARY GUARDIAN' : idx < 3 ? 'ELITE PROTECTOR' : 'VIBE SENTINEL'}
                    </Text>
                  </View>
                </View>
                <View style={styles.leaderRight}>
                  <Text style={styles.leaderAmount}>
                    {(Number(staker.staked_amount) / 1000).toFixed(1)}K <Text style={styles.leaderUnit}>HYPE</Text>
                  </Text>
                  <Text style={styles.leaderBoost}>
                    +{((Math.min(0.5, staker.staked_amount / 1_000_000)) * 100).toFixed(0)}% Boost
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noLeaders}>Leaderboard compiling staker weights...</Text>
          )}
        </View>
      </View>
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
    fontSize: 10,
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B1A',
  },
  statSub: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  panel: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 10,
    marginBottom: 16,
  },
  panelTitle: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  userPositions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  positionCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
  },
  positionLabel: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
  },
  positionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  positionUnit: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  rewardBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,26,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  rewardLabel: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: '#FF6B1A',
    marginBottom: 2,
  },
  rewardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  rewardUnit: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  claimButton: {
    backgroundColor: '#FF6B1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  claimBtnText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#050507',
    letterSpacing: 0.5,
  },
  disabledBtn: {
    backgroundColor: 'rgba(255,107,26,0.15)',
    opacity: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#050507',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#fff',
    height: 48,
    paddingHorizontal: 12,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  textInputAlt: {
    borderColor: 'rgba(239,68,68,0.15)',
  },
  actionButton: {
    backgroundColor: '#FF6B1A',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonAlt: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  actionBtnText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#050507',
    letterSpacing: 0.5,
  },
  actionBtnTextAlt: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ef4444',
    letterSpacing: 0.5,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    opacity: 0.3,
  },
  sepLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sepText: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: '#fff',
    paddingHorizontal: 10,
    letterSpacing: 1,
  },
  leaderboardList: {
    gap: 10,
  },
  leaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 10,
  },
  leaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  leaderBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldBadge: {
    backgroundColor: '#FF6B1A',
  },
  leaderBadgeText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
  },
  goldBadgeText: {
    color: '#050507',
  },
  leaderPubKey: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#fff',
  },
  leaderRole: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  leaderRight: {
    alignItems: 'flex-end',
  },
  leaderAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  leaderUnit: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
  },
  leaderBoost: {
    fontSize: 8.5,
    fontFamily: 'monospace',
    color: '#fbbf24',
    marginTop: 2,
  },
  noLeaders: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
