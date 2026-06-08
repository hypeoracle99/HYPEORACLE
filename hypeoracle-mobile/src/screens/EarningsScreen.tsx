import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  Linking,
} from 'react-native';
import { client } from '../lib/insforge';
import { DePINIdentity } from '../lib/secure-store';
import {
  Coins,
  TrendingUp,
  Clock,
  CheckCircle2,
  Zap,
  ArrowUpRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const TRADE_SOL = 0.005;

interface Claim {
  id: string;
  token_mint: string;
  bps: number;
  claimed: boolean;
  claimed_at?: string;
  created_at: string;
}

interface EarningsScreenProps {
  identity: DePINIdentity | null;
}

// Memoized Claim Row Item for maximum performance
const ClaimRow = React.memo(({ claim, index }: { claim: Claim; index: number }) => {
  const earnedSol = ((claim.bps / 10000) * TRADE_SOL).toFixed(6);
  const formattedDate = new Date(claim.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View
      style={[
        styles.claimRow,
        {
          backgroundColor: claim.claimed
            ? 'rgba(16, 185, 129, 0.03)'
            : 'rgba(255, 107, 26, 0.03)',
          borderColor: claim.claimed
            ? 'rgba(16, 185, 129, 0.12)'
            : 'rgba(255, 107, 26, 0.12)',
        },
      ]}
    >
      <View style={styles.claimLeft}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: claim.claimed
                ? 'rgba(16, 185, 129, 0.1)'
                : 'rgba(255, 107, 26, 0.1)',
            },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: claim.claimed ? '#10b981' : '#FF6B1A' },
            ]}
          >
            {claim.claimed ? '✓' : '⚡'}
          </Text>
        </View>
        <View>
          <Text style={styles.mintText}>
            {claim.token_mint?.slice(0, 6)}...{claim.token_mint?.slice(-4)}
          </Text>
          <Text style={styles.subDetailText}>
            {formattedDate} · {claim.bps} bps
          </Text>
        </View>
      </View>
      <View style={styles.claimRight}>
        <Text
          style={[
            styles.earnedText,
            { color: claim.claimed ? '#10b981' : '#FF6B1A' },
          ]}
        >
          +{earnedSol} SOL
        </Text>
        <Text style={styles.statusLabelText}>
          {claim.claimed ? 'Claimed' : 'Pending'}
        </Text>
      </View>
    </View>
  );
});

export function EarningsScreen({ identity }: EarningsScreenProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<any>(null);

  const fetchClaims = useCallback(async (showLoading = true) => {
    if (!identity) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (showLoading) setLoading(true);

    try {
      const { data, error } = await client.database
        .from('fee_share_claims')
        .select('*')
        .eq('contributor_pubkey', identity.publicKey)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (err) {
      console.error('[EarningsScreen] Fetch claims failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [identity]);

  useEffect(() => {
    fetchClaims(true);
  }, [fetchClaims]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClaims(false);
  }, [fetchClaims]);

  const handleClaim = async () => {
    const unclaimed = claims.filter((c) => !c.claimed);
    if (!identity || unclaimed.length === 0) return;

    setClaiming(true);
    setClaimResult(null);

    try {
      const res = await fetch('https://9s8ct2b5.functions.insforge.app/claim-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_pubkey: identity.publicKey }),
      });

      const result = await res.json();

      if (result.success) {
        setClaimResult(result);
        Alert.alert(
          'Claim Successful!',
          `Claimed ${result.claimedSol.toFixed(6)} SOL successfully across ${result.claimedCount} events.`
        );
        fetchClaims(false);
      } else {
        setClaimResult({ success: false, error: result.error || 'Claim rejected.' });
        Alert.alert('Claim Failed', result.error || 'Server error claiming fees.');
      }
    } catch (err: any) {
      console.error('[EarningsScreen] Claim request failed:', err);
      Alert.alert('Transmission Error', err.message || 'Connection to claim server lost.');
      setClaimResult({ success: false, error: err.message || 'Network error' });
    } finally {
      setClaiming(false);
    }
  };

  const handleOpenTx = (signature: string) => {
    if (!signature) return;
    const url = `https://solscan.io/tx/${signature}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      }
    });
  };

  const unclaimed = claims.filter((c) => !c.claimed);
  const claimedList = claims.filter((c) => c.claimed);

  const pendingSol = unclaimed.reduce((sum, c) => sum + (c.bps / 10000) * TRADE_SOL, 0);
  const totalEarned = claims.reduce((sum, c) => sum + (c.bps / 10000) * TRADE_SOL, 0);
  const totalClaimed = totalEarned - pendingSol;

  const renderItem = useCallback(
    ({ item, index }: { item: Claim; index: number }) => (
      <ClaimRow claim={item} index={index} />
    ),
    []
  );

  const keyExtractor = useCallback((item: Claim) => item.id, []);

  // Performance-optimized fixed height item layout
  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: 64,
      offset: 64 * index,
      index,
    }),
    []
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* HUD Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TOTAL EARNED</Text>
          <Text style={styles.statValue}>{totalEarned.toFixed(5)}</Text>
          <Text style={styles.statUnit}>SOL</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>PENDING CLAIM</Text>
          <Text style={[styles.statValue, { color: '#FF6B1A' }]}>
            {pendingSol.toFixed(5)}
          </Text>
          <Text style={styles.statUnit}>SOL</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TOTAL CLAIMED</Text>
          <Text style={[styles.statValue, { color: '#10b981' }]}>
            {totalClaimed.toFixed(5)}
          </Text>
          <Text style={styles.statUnit}>SOL</Text>
        </View>
      </View>

      {/* Claim trigger card */}
      {unclaimed.length > 0 ? (
        <View style={styles.claimActionBox}>
          <Text style={styles.actionTitle}>UNCLAIMED CONTRIBUTOR REWARDS</Text>
          <Text style={styles.actionDesc}>
            Vibes you registered pushed market sentiment and triggered oracle arbitrage. Collect your {unclaimed.length} pending fee-share payouts.
          </Text>

          <TouchableOpacity
            style={[styles.claimButton, claiming && styles.disabledBtn]}
            onPress={handleClaim}
            disabled={claiming}
          >
            {claiming ? (
              <ActivityIndicator size="small" color="#050507" />
            ) : (
              <View style={styles.claimBtnContent}>
                <Sparkles size={14} color="#050507" />
                <Text style={styles.claimBtnText}>
                  CLAIM {pendingSol.toFixed(5)} SOL
                </Text>
                <Zap size={14} color="#050507" />
              </View>
            )}
          </TouchableOpacity>

          {claimResult && (
            <TouchableOpacity
              style={[
                styles.resultCard,
                {
                  borderColor: claimResult.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  backgroundColor: claimResult.success ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                },
              ]}
              onPress={() => claimResult.signature && handleOpenTx(claimResult.signature)}
              disabled={!claimResult.signature}
            >
              <Text
                style={[
                  styles.resultText,
                  { color: claimResult.success ? '#10b981' : '#f87171' },
                ]}
              >
                {claimResult.message || claimResult.error || 'Claim logged.'}
              </Text>
              {claimResult.signature && (
                <View style={styles.solscanLink}>
                  <Text style={styles.solscanText}>VIEW TX</Text>
                  <ArrowUpRight size={10} color="#FF6B1A" />
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.panelInfo}>
          <AlertCircle size={16} color="rgba(255,255,255,0.3)" />
          <Text style={styles.panelInfoText}>
            All contributor fee rewards claimed. Payouts are generated whenever vibes you record trigger oracle trading actions.
          </Text>
        </View>
      )}

      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>EARNINGS LEDGER</Text>
        <Text style={styles.historyCount}>{claims.length} events</Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>💰</Text>
      <Text style={styles.emptyTitle}>NO CONTRIBUTOR EARNINGS</Text>
      <Text style={styles.emptyText}>
        Log sensor vibes in the main panel. If they register significant sentiment peaks, the oracle arb trading engine distributes transaction fee shares directly to your node.
      </Text>
    </View>
  );

  if (loading && claims.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B1A" />
        <Text style={styles.loadingText}>RESOLVING EARNINGS LEDGER...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={claims}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF6B1A"
            colors={['#FF6B1A']}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050507',
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
  },
  statUnit: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  claimActionBox: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.15)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  actionTitle: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF6B1A',
    letterSpacing: 1,
    marginBottom: 8,
  },
  actionDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 16,
    marginBottom: 16,
  },
  claimButton: {
    backgroundColor: '#FF6B1A',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  claimBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  claimBtnText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#050507',
    letterSpacing: 0.5,
  },
  resultCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 11,
    fontFamily: 'monospace',
    flex: 1,
  },
  solscanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  solscanText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#FF6B1A',
  },
  panelInfo: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  panelInfoText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    flex: 1,
    lineHeight: 15,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 8,
    marginBottom: 12,
  },
  historyTitle: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
  },
  historyCount: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
  },
  claimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    height: 60,
  },
  claimLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  mintText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#fff',
  },
  subDetailText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  claimRight: {
    alignItems: 'flex-end',
  },
  earnedText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusLabelText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 16,
  },
});
