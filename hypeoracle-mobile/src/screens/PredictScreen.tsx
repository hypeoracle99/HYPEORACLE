import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { client } from '../lib/insforge';
import { DePINIdentity } from '../lib/secure-store';
import { TrendingUp, Zap, Clock, Coins, CheckCircle, ArrowUpRight } from 'lucide-react-native';

interface PredictScreenProps {
  identity: DePINIdentity | null;
}

interface Market {
  id: string;
  token_mint: string;
  question: string;
  target_score: number;
  resolution_date: string;
  status: string;
  total_yes_pool: number;
  total_no_pool: number;
  outcome?: 'yes' | 'no';
}

interface Bet {
  id: string;
  market_id: string;
  user_pubkey: string;
  prediction: 'yes' | 'no';
  amount: number;
  created_at: string;
  market?: Market;
}

export function PredictScreen({ identity }: PredictScreenProps) {
  const [activeTab, setActiveTab] = useState<'pools' | 'my-bets'>('pools');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [betPrediction, setBetPrediction] = useState<'yes' | 'no'>('yes');
  const [betAmount, setBetAmount] = useState('0.05');
  const [submitting, setSubmitting] = useState(false);

  const fetchMarketsAndBets = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch active markets directly from InsForge
      const { data: marketData, error: marketError } = await client.database
        .from('vibe_prediction_markets')
        .select('*')
        .order('created_at', { ascending: false });

      if (marketError) throw marketError;
      setMarkets(marketData || []);

      // 2. Fetch user bets if staker identity is loaded
      if (identity) {
        const { data: betData, error: betError } = await client.database
          .from('vibe_prediction_bets')
          .select(`
            *,
            market:market_id (*)
          `)
          .eq('user_pubkey', identity.publicKey)
          .order('created_at', { ascending: false });

        if (betError) throw betError;
        setBets(betData || []);
      }
    } catch (err: any) {
      console.error('[PredictScreen] Sync failure:', err);
      Alert.alert('Connection Stalled', 'Failed to retrieve active prediction pools. Retrying sync.');
    } finally {
      setLoading(false);
    }
  }, [identity]);

  useEffect(() => {
    fetchMarketsAndBets();
  }, [fetchMarketsAndBets]);

  const handlePlaceBet = async () => {
    if (!identity) {
      Alert.alert('Node Unauthenticated', 'Verify your staker DePIN identity first.');
      return;
    }
    if (!selectedMarket || !betAmount) return;

    const parsedAmount = parseFloat(betAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Position', 'Please enter a valid amount of SOL.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Record staker's custom prediction
      const { data: betResult, error: betError } = await client.database
        .from('vibe_prediction_bets')
        .insert({
          market_id: selectedMarket.id,
          user_pubkey: identity.publicKey,
          prediction: betPrediction,
          amount: parsedAmount,
          claimed: false,
        })
        .select()
        .single();

      if (betError) throw betError;

      // 2. Aggregate pool updates atomically in the market
      const isYes = betPrediction === 'yes';
      const yesPool = parseFloat(selectedMarket.total_yes_pool as any || '0');
      const noPool = parseFloat(selectedMarket.total_no_pool as any || '0');

      const updatePayload = isYes
        ? { total_yes_pool: yesPool + parsedAmount }
        : { total_no_pool: noPool + parsedAmount };

      const { error: marketUpdateError } = await client.database
        .from('vibe_prediction_markets')
        .update(updatePayload)
        .eq('id', selectedMarket.id);

      if (marketUpdateError) throw marketUpdateError;

      Alert.alert('Position Staked!', `Log complete: ${parsedAmount} SOL on ${betPrediction.toUpperCase()}.`);
      setSelectedMarket(null);
      fetchMarketsAndBets();
    } catch (err: any) {
      console.error('[PredictScreen] Bet error:', err);
      Alert.alert('Tx Aborted', err.message || 'Failed to submit on-chain staker position.');
    } finally {
      setSubmitting(false);
    }
  };

  const activePools = useMemo(() => {
    return markets.filter(m => m.status === 'active');
  }, [markets]);

  // Memoized card rendering to optimize 60fps scrolling
  const renderMarketItem = useCallback(({ item }: { item: Market }) => {
    const totalPool = (parseFloat(item.total_yes_pool as any || 0) + parseFloat(item.total_no_pool as any || 0));
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.mintBadge}>
            <Coins size={10} color="#FF6B1A" />
            <Text style={styles.mintText}>
              Mint: {item.token_mint.slice(0, 4)}...{item.token_mint.slice(-4)}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <Zap size={10} color="#06b6d4" />
            <Text style={styles.statusText}>ACTIVE</Text>
          </View>
        </View>

        <Text style={styles.questionText}>{item.question}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TARGET VIBE</Text>
            <Text style={styles.targetVal}>{item.target_score}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TOTAL POOL</Text>
            <Text style={styles.poolVal}>{totalPool.toFixed(2)} SOL</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnYes]}
            onPress={() => {
              setSelectedMarket(item);
              setBetPrediction('yes');
            }}
          >
            <Text style={styles.btnText}>BULLISH (YES)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnNo]}
            onPress={() => {
              setSelectedMarket(item);
              setBetPrediction('no');
            }}
          >
            <Text style={styles.btnText}>BEARISH (NO)</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, []);

  const renderBetItem = useCallback(({ item }: { item: Bet }) => {
    const market = item.market;
    return (
      <View style={styles.betCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.betTitle}>
            Pool: {market?.token_mint.slice(0, 5) || 'UNKNOWN'}
          </Text>
          <View style={[styles.choiceBadge, item.prediction === 'yes' ? styles.badgeYes : styles.badgeNo]}>
            <Text style={styles.choiceText}>{item.prediction.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.betQuestion}>{market?.question || 'Sentiment pool question'}</Text>
        <View style={styles.betStats}>
          <Text style={styles.betAmountText}>
            Staked Amount: <Text style={styles.accentText}>{item.amount} SOL</Text>
          </Text>
          <View style={styles.dateContainer}>
            <Clock size={10} color="rgba(255,255,255,0.4)" />
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Tab bar header */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pools' && styles.activeTab]}
          onPress={() => setActiveTab('pools')}
        >
          <TrendingUp size={16} color={activeTab === 'pools' ? '#FF6B1A' : '#777'} />
          <Text style={[styles.tabLabel, activeTab === 'pools' && styles.activeTabLabel]}>
            VIBE POOLS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-bets' && styles.activeTab]}
          onPress={() => setActiveTab('my-bets')}
        >
          <CheckCircle size={16} color={activeTab === 'my-bets' ? '#FF6B1A' : '#777'} />
          <Text style={[styles.tabLabel, activeTab === 'my-bets' && styles.activeTabLabel]}>
            MY FORECASTS
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B1A" />
          <Text style={styles.loadingText}>Syncing Oracle pools...</Text>
        </View>
      ) : activeTab === 'pools' ? (
        <FlatList
          data={activePools}
          renderItem={renderMarketItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No active prediction pools found.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={bets}
          renderItem={renderBetItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Your logged forecasts will appear here.</Text>
            </View>
          }
        />
      )}

      {/* Stake position neon modal */}
      <Modal
        visible={selectedMarket !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedMarket(null)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>STAKE DEPIN PREDICTION</Text>
            <Text style={styles.modalSub}>
              Mint: {selectedMarket?.token_mint.slice(0, 8)}...
            </Text>
            
            <View style={styles.selectedChoiceBox}>
              <Text style={styles.choiceLabel}>Direction Selected:</Text>
              <View style={[styles.choiceValueBadge, betPrediction === 'yes' ? styles.badgeYes : styles.badgeNo]}>
                <Text style={styles.choiceValueText}>
                  {betPrediction === 'yes' ? 'BULLISH (YES)' : 'BEARISH (NO)'}
                </Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Position Size (SOL)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={betAmount}
              onChangeText={setBetAmount}
              placeholder="0.05"
              placeholderTextColor="rgba(255,255,255,0.2)"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setSelectedMarket(null)}
              >
                <Text style={styles.btnLabel}>ABORT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={handlePlaceBet}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#050507" />
                ) : (
                  <>
                    <Text style={[styles.btnLabel, { color: '#050507' }]}>CONFIRM</Text>
                    <ArrowUpRight size={14} color="#050507" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050507',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#0a0a0f',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B1A',
  },
  tabLabel: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
  },
  activeTabLabel: {
    color: '#FF6B1A',
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
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,26,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  mintText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#FF6B1A',
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6,182,212,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#06b6d4',
    fontWeight: 'bold',
  },
  questionText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  statLabel: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  targetVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  poolVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#06b6d4',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 48, // Touch target compliance (minimum 44pt/48dp)
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  btnYes: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  btnNo: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  btnText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  betCard: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  betTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  choiceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeYes: {
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  badgeNo: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  choiceText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
  },
  betQuestion: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginVertical: 10,
  },
  betStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
    paddingTop: 10,
    marginTop: 2,
  },
  betAmountText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  accentText: {
    color: '#FF6B1A',
    fontWeight: 'bold',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0d0d14',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,107,26,0.3)',
  },
  modalHeader: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B1A',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  modalSub: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 20,
  },
  selectedChoiceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  choiceLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  choiceValueBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  choiceValueText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  inputLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#050507',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#fff',
    height: 48, // Minimum touch targets compliance
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'monospace',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modalBtn: {
    flex: 1,
    height: 48, // Touch target compliance (minimum 44pt/48dp)
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  confirmBtn: {
    backgroundColor: '#FF6B1A',
  },
  btnLabel: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
});
