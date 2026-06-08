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
  RefreshControl,
  ScrollView,
} from 'react-native';
import Svg, { Polyline, Line, Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Connection, PublicKey, Transaction, SystemProgram, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';
import { client } from '../lib/insforge';
import { DePINIdentity } from '../lib/secure-store';
import { TrendingUp, Zap, Clock, Coins, CheckCircle, ArrowUpRight } from 'lucide-react-native';

const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const ORACLE_TREASURY_PUBKEY = new PublicKey('BBz7heBU32GENqiBqEVVCfFoc8QcJJduezjpN6oesKaP');

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
  final_score?: number;
  outcome?: 'yes' | 'no';
}

interface Bet {
  id: string;
  market_id: string;
  user_pubkey: string;
  prediction: 'yes' | 'no';
  amount: number;
  claimed: boolean;
  created_at: string;
  market?: Market;
}

// Mobile-friendly Custom SVG Sentiment Trend Chart
function VibeMiniChart({ tokenMint, targetScore, status, outcome }: { tokenMint: string; targetScore: number; status: string; outcome?: string }) {
  const padding = 3;
  const height = 45;
  const width = 220;

  const points = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < tokenMint.length; i++) {
      seed += tokenMint.charCodeAt(i);
    }
    
    const count = 10;
    const values: number[] = [];
    let current = 50 + (seed % 20); // start around 50-70
    
    for (let i = 0; i < count; i++) {
      const stepSeed = Math.sin(seed + i) * 15;
      current = Math.max(30, Math.min(95, current + stepSeed));
      values.push(current);
    }

    if (status === 'resolved') {
      if (outcome === 'yes') {
        values[count - 1] = Math.max(targetScore + 3, values[count - 1]);
      } else {
        values[count - 1] = Math.min(targetScore - 3, values[count - 1]);
      }
    }
    
    return values;
  }, [tokenMint, targetScore, status, outcome]);

  const { svgPoints, pathD, lastCircleY } = useMemo(() => {
    const step = width / (points.length - 1);
    const mapped = points.map((p, i) => {
      const x = i * step;
      const y = padding + ((95 - p) / (95 - 30)) * (height - padding * 2);
      return { x, y };
    });

    const svgPoints = mapped.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
    
    let pathDStr = `M 0 45`;
    mapped.forEach(pt => {
      pathDStr += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    });
    pathDStr += ` L 220 45 Z`;

    const lastCircleYVal = mapped[mapped.length - 1]?.y || 0;

    return { svgPoints, pathD: pathDStr, lastCircleY: lastCircleYVal };
  }, [points]);

  const targetY = useMemo(() => {
    return padding + ((95 - targetScore) / (95 - 30)) * (height - padding * 2);
  }, [targetScore]);

  const strokeColor = status === 'resolved' 
    ? (outcome === 'yes' ? '#22c55e' : '#ef4444') 
    : '#FF6B1A';

  const gradId = `grad-${tokenMint.slice(0, 8)}-${status}`;

  return (
    <View style={styles.chartWrapper}>
      <View style={styles.chartMeta}>
        <Text style={styles.chartTitle}>SENTIMENT TREND</Text>
        <Text style={styles.chartTarget}>
          Target: <Text style={styles.chartTargetVal}>{targetScore.toFixed(0)}</Text>
        </Text>
      </View>
      <View style={styles.chartSvgContainer}>
        <Svg width={width} height={height} viewBox="0 0 220 45">
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
              <Stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
            </LinearGradient>
          </Defs>
          
          <Line 
            x1="0" 
            y1={targetY} 
            x2="220" 
            y2={targetY} 
            stroke="rgba(255,107,26,0.2)" 
            strokeWidth="1" 
            strokeDasharray="3,3" 
          />

          <Path
            d={pathD}
            fill={`url(#${gradId})`}
          />

          <Polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
            points={svgPoints}
          />

          <Circle
            cx="220"
            cy={lastCircleY}
            r="2.5"
            fill={strokeColor}
          />
        </Svg>
      </View>
    </View>
  );
}

export function PredictScreen({ identity }: PredictScreenProps) {
  const [activeTab, setActiveTab] = useState<'pools' | 'my-bets' | 'resolved'>('pools');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [stakedAmount, setStakedAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [betPrediction, setBetPrediction] = useState<'yes' | 'no'>('yes');
  const [betAmount, setBetAmount] = useState('0.05');
  const [submitting, setSubmitting] = useState(false);

  const fetchMarketsAndBets = useCallback(async () => {
    try {
      // 1. Fetch prediction markets directly from InsForge
      const { data: marketData, error: marketError } = await client.database
        .from('vibe_prediction_markets')
        .select('*')
        .order('created_at', { ascending: false });

      if (marketError) throw marketError;
      setMarkets(marketData || []);

      // 2. Fetch user bets and staking details if staker identity is loaded
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

        try {
          const { data: stakingInfo } = await client.database
            .from('user_staking')
            .select('staked_amount')
            .eq('user_pubkey', identity.publicKey)
            .single();

          if (stakingInfo && stakingInfo.staked_amount) {
            setStakedAmount(parseFloat(stakingInfo.staked_amount));
          } else {
            setStakedAmount(0);
          }
        } catch (_) {
          setStakedAmount(0);
        }
      }
    } catch (err: any) {
      console.error('[PredictScreen] Sync failure:', err);
      Alert.alert('Connection Stalled', 'Failed to retrieve active prediction pools. Retrying sync.');
    }
  }, [identity]);

  const loadData = async () => {
    setLoading(true);
    await fetchMarketsAndBets();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMarketsAndBets();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [fetchMarketsAndBets]);

  // Handle Placing an On-Chain Bet
  const handlePlaceBet = async () => {
    if (!identity) {
      Alert.alert('Node Unauthenticated', 'Verify your staker DePIN identity first.');
      return;
    }
    if (identity.isExternal) {
      Alert.alert('Signing Blocked', 'External wallets must sign transactions via their native apps. Built-in Wallet only supports local DePIN key pairs.');
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
      // 1. Initialize Connection and verify staker balance
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');
      const stakerWallet = Keypair.fromSecretKey(identity.rawSecretKey);
      
      const balance = await connection.getBalance(stakerWallet.publicKey);
      const requiredLamports = Math.floor(parsedAmount * 1e9) + 5000; // Transfer amount + estimated fee

      if (balance < requiredLamports) {
        Alert.alert('Insolvent Wallet', `Insufficient funds in built-in wallet. You need at least ${(requiredLamports / 1e9).toFixed(4)} SOL.`);
        setSubmitting(false);
        return;
      }

      // 2. Build on-chain SOL transfer transaction to the Oracle Treasury
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: stakerWallet.publicKey,
          toPubkey: ORACLE_TREASURY_PUBKEY,
          lamports: Math.floor(parsedAmount * 1e9),
        })
      );

      // 3. Sign and broadcast to the Solana network
      const signature = await sendAndConfirmTransaction(connection, transaction, [stakerWallet]);
      console.log('[PredictScreen] On-chain transfer confirmed:', signature);

      // 4. Record staker's custom prediction in InsForge database
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

      // 5. Aggregate pool updates atomically in the market
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

      Alert.alert(
        'Position Staked!',
        `On-chain transaction confirmed!\n\nStaked ${parsedAmount} SOL on ${betPrediction.toUpperCase()}.\n\nTx Hash: ${signature.slice(0, 16)}...`
      );
      setSelectedMarket(null);
      fetchMarketsAndBets();
    } catch (err: any) {
      console.error('[PredictScreen] Bet error:', err);
      Alert.alert('Transaction Failed', err.message || 'Failed to submit on-chain staker position.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Claiming Payouts via Edge Function
  const handleClaimPayout = async (betId: string) => {
    if (!identity) return;
    setSubmitting(true);
    try {
      const res = await fetch('https://9s8ct2b5.functions.insforge.app/claim-prediction-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bet_id: betId,
          user_pubkey: identity.publicKey,
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to claim prediction winnings.');
      }

      Alert.alert(
        'Payout Credited!',
        `Successfully claimed payout of ${json.claimed_amount.toFixed(4)} SOL!\n\nSignature: ${json.signature?.slice(0, 16)}...`
      );
      fetchMarketsAndBets();
    } catch (err: any) {
      console.error('[PredictScreen] Payout Claim failure:', err);
      Alert.alert('Claim Blocked', err.message || 'Winnings distribution failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Memoized staker tier stats
  const activeBoostTier = useMemo(() => {
    if (stakedAmount >= 10000) return { name: 'VIBE PROPHET', desc: '+5% Winnings / 0% Payout Fee' };
    if (stakedAmount >= 1000) return { name: 'SENTIMENT SEER', desc: '+2% Winnings / 0.5% Payout Fee' };
    return { name: 'BASE ORACLE', desc: '1.0x Payouts / 1.0% Payout Fee' };
  }, [stakedAmount]);

  // Calculate dynamic simulated payouts for the modal
  const simulatedPayout = useMemo(() => {
    if (!selectedMarket) return { gross: 0, net: 0, odds: 0, fee: 1.0, multiplier: 1.0, tierName: 'Base Oracle' };
    const yesPool = parseFloat(selectedMarket.total_yes_pool as any || '0');
    const noPool = parseFloat(selectedMarket.total_no_pool as any || '0');
    const userBet = parseFloat(betAmount || '0');
    
    if (isNaN(userBet) || userBet <= 0) return { gross: 0, net: 0, odds: 0, fee: 1.0, multiplier: 1.0, tierName: 'Base Oracle' };

    const totalPool = yesPool + noPool + userBet;
    const winningPool = betPrediction === 'yes' ? yesPool + userBet : noPool + userBet;

    const gross = (userBet / winningPool) * totalPool;
    
    let feeDiscount = 0;
    let multiplier = 1.0;
    let tierName = 'Base Oracle';

    if (stakedAmount >= 10000) {
      feeDiscount = 1.0;
      multiplier = 1.05;
      tierName = 'Vibe Prophet';
    } else if (stakedAmount >= 1000) {
      feeDiscount = 0.5;
      multiplier = 1.02;
      tierName = 'Sentiment Seer';
    }

    const appliedFee = 1.0 * (1 - feeDiscount);
    const net = gross * (1 - (appliedFee / 100)) * multiplier;
    const odds = userBet > 0 ? net / userBet : 1;

    return {
      gross: parseFloat(gross.toFixed(4)),
      net: parseFloat(net.toFixed(4)),
      odds: parseFloat(odds.toFixed(2)),
      fee: appliedFee,
      multiplier,
      tierName
    };
  }, [selectedMarket, betPrediction, betAmount, stakedAmount]);

  const activePools = useMemo(() => {
    return markets.filter(m => m.status === 'active');
  }, [markets]);

  const resolvedPools = useMemo(() => {
    return markets.filter(m => m.status === 'resolved');
  }, [markets]);

  // Card Rendering for Active and Resolved markets
  const renderMarketItem = useCallback(({ item }: { item: Market }) => {
    const isResolved = item.status === 'resolved';
    const yesPool = parseFloat(item.total_yes_pool as any || 0);
    const noPool = parseFloat(item.total_no_pool as any || 0);
    const total = yesPool + noPool;
    const yesPct = total > 0 ? (yesPool / total) * 100 : 50;

    return (
      <View style={[styles.card, isResolved && styles.cardResolved]}>
        <View style={styles.cardHeader}>
          <View style={styles.mintBadge}>
            <Coins size={10} color="#FF6B1A" />
            <Text style={styles.mintText}>
              Mint: {item.token_mint.slice(0, 4)}...{item.token_mint.slice(-4)}
            </Text>
          </View>
          {isResolved ? (
            <View style={[styles.statusBadge, styles.badgeResolved]}>
              <CheckCircle size={10} color="#22c55e" />
              <Text style={[styles.statusText, { color: '#22c55e' }]}>RESOLVED</Text>
            </View>
          ) : (
            <View style={styles.statusBadge}>
              <Zap size={10} color="#06b6d4" />
              <Text style={styles.statusText}>ACTIVE</Text>
            </View>
          )}
        </View>

        <Text style={[styles.questionText, isResolved && styles.textMuted]}>{item.question}</Text>

        <VibeMiniChart 
          tokenMint={item.token_mint} 
          targetScore={item.target_score} 
          status={item.status} 
          outcome={item.outcome} 
        />

        {isResolved ? (
          <View style={styles.resolvedOutcomeBox}>
            <View style={styles.outcomeMeta}>
              <Text style={styles.outcomeLabel}>OUTCOME</Text>
              <Text style={[styles.outcomeValue, item.outcome === 'yes' ? styles.textYes : styles.textNo]}>
                {item.outcome?.toUpperCase()}
              </Text>
            </View>
            <View style={styles.outcomeMetaRight}>
              <Text style={styles.outcomeLabel}>FINAL VIBE</Text>
              <Text style={styles.outcomeScore}>{item.final_score}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.progressContainer}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressText}>YES: {yesPct.toFixed(0)}% ({yesPool.toFixed(2)} SOL)</Text>
              <Text style={styles.progressText}>NO: {(100 - yesPct).toFixed(0)}% ({noPool.toFixed(2)} SOL)</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarYes, { width: `${yesPct}%` }]} />
              <View style={[styles.progressBarNo, { width: `${100 - yesPct}%` }]} />
            </View>
          </View>
        )}

        {!isResolved && (
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
        )}
      </View>
    );
  }, []);

  const renderBetItem = useCallback(({ item }: { item: Bet }) => {
    const market = item.market;
    const isResolved = market?.status === 'resolved';
    const isWinner = isResolved && item.prediction === market?.outcome;

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
          <View>
            <Text style={styles.betAmountText}>
              Staked Size: <Text style={styles.accentText}>{item.amount} SOL</Text>
            </Text>
            {isResolved && (
              <Text style={styles.outcomeDesc}>
                Outcome: <Text style={isWinner ? styles.textYes : styles.textMuted}>{market?.outcome?.toUpperCase()}</Text> (Final: {market?.final_score})
              </Text>
            )}
          </View>

          <View style={styles.claimSection}>
            {isResolved ? (
              isWinner ? (
                item.claimed ? (
                  <View style={styles.claimedBadge}>
                    <CheckCircle size={10} color="#22c55e" />
                    <Text style={styles.claimedText}>CLAIMED</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.claimBtn}
                    onPress={() => handleClaimPayout(item.id)}
                    disabled={submitting}
                  >
                    <ArrowUpRight size={10} color="#22c55e" />
                    <Text style={styles.claimBtnText}>CLAIM WINNINGS</Text>
                  </TouchableOpacity>
                )
              ) : (
                <View style={styles.lossBadge}>
                  <Text style={styles.lossText}>RESOLVED LOSS</Text>
                </View>
              )
            ) : (
              <View style={styles.liveBadge}>
                <Text style={styles.liveText}>LIVE MONITOR</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }, [submitting]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Mini Stats Banner */}
      <View style={styles.statsBanner}>
        <View style={styles.statBannerItem}>
          <Text style={styles.bannerLabel}>BOOST TIER</Text>
          <Text style={styles.bannerValue}>{activeBoostTier.name}</Text>
        </View>
        <View style={styles.statBannerItem}>
          <Text style={styles.bannerLabel}>BENEFIT RATES</Text>
          <Text style={styles.bannerSubValue}>{activeBoostTier.desc}</Text>
        </View>
      </View>

      {/* Tab Selector pills */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pools' && styles.activeTab]}
          onPress={() => setActiveTab('pools')}
        >
          <TrendingUp size={14} color={activeTab === 'pools' ? '#FF6B1A' : '#777'} />
          <Text style={[styles.tabLabel, activeTab === 'pools' && styles.activeTabLabel]}>
            ACTIVE
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-bets' && styles.activeTab]}
          onPress={() => setActiveTab('my-bets')}
        >
          <CheckCircle size={14} color={activeTab === 'my-bets' ? '#FF6B1A' : '#777'} />
          <Text style={[styles.tabLabel, activeTab === 'my-bets' && styles.activeTabLabel]}>
            MY FORECASTS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'resolved' && styles.activeTab]}
          onPress={() => setActiveTab('resolved')}
        >
          <Clock size={14} color={activeTab === 'resolved' ? '#FF6B1A' : '#777'} />
          <Text style={[styles.tabLabel, activeTab === 'resolved' && styles.activeTabLabel]}>
            RESOLVED
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B1A" />
          <Text style={styles.loadingText}>Syncing consensus index...</Text>
        </View>
      ) : activeTab === 'pools' ? (
        <FlatList
          data={activePools}
          renderItem={renderMarketItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No active prediction pools found.</Text>
            </View>
          }
        />
      ) : activeTab === 'resolved' ? (
        <FlatList
          data={resolvedPools}
          renderItem={renderMarketItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No past resolved pools found.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={bets}
          renderItem={renderBetItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
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

            {/* Estimated Staker Payout Preview */}
            <View style={styles.simulatedContainer}>
              <View style={styles.simRow}>
                <Text style={styles.simLabel}>Oracle Tier Bonus:</Text>
                <Text style={styles.simVal}>{simulatedPayout.multiplier === 1 ? '1.00x (Base)' : `${simulatedPayout.multiplier.toFixed(2)}x (${simulatedPayout.tierName})`}</Text>
              </View>
              <View style={styles.simRow}>
                <Text style={styles.simLabel}>Est. Odds Multiplier:</Text>
                <Text style={[styles.simVal, { color: '#fbbf24' }]}>{simulatedPayout.odds.toFixed(2)}x</Text>
              </View>
              <View style={styles.simRow}>
                <Text style={styles.simLabel}>Est. Net Return:</Text>
                <Text style={[styles.simVal, { color: '#22c55e' }]}>{simulatedPayout.net.toFixed(4)} SOL</Text>
              </View>
            </View>

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
                    <Text style={[styles.btnLabel, { color: '#050507' }]}>STAKE ON-CHAIN</Text>
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
  statsBanner: {
    backgroundColor: '#0c0c12',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBannerItem: {
    flex: 1,
  },
  bannerLabel: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: '#FF6B1A',
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  bannerValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  bannerSubValue: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
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
    paddingVertical: 14,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B1A',
  },
  tabLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
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
    fontSize: 11,
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
    fontSize: 11,
  },
  card: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardResolved: {
    borderColor: 'rgba(255,255,255,0.02)',
    backgroundColor: '#07070a',
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
  badgeResolved: {
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  statusText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#06b6d4',
    fontWeight: 'bold',
  },
  questionText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 10,
  },
  textMuted: {
    color: 'rgba(255,255,255,0.4)',
  },
  // Custom SVG Trend Chart Styles
  chartWrapper: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chartMeta: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  chartTitle: {
    fontFamily: 'monospace',
    fontSize: 7.5,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
  },
  chartTarget: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  chartTargetVal: {
    color: '#FF6B1A',
    fontWeight: 'bold',
  },
  chartSvgContainer: {
    width: 220,
    height: 45,
    overflow: 'hidden',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.5)',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  progressBarYes: {
    height: '100%',
    backgroundColor: '#FF6B1A',
  },
  progressBarNo: {
    height: '100%',
    backgroundColor: '#06b6d4',
  },
  resolvedOutcomeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  outcomeMeta: {
    flexDirection: 'column',
  },
  outcomeMetaRight: {
    alignItems: 'flex-end',
  },
  outcomeLabel: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },
  outcomeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  outcomeScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  textYes: {
    color: '#22c55e',
  },
  textNo: {
    color: '#ef4444',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  btnYes: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  btnNo: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
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
    lineHeight: 18,
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
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  outcomeDesc: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  accentText: {
    color: '#FF6B1A',
    fontWeight: 'bold',
  },
  claimSection: {
    alignItems: 'flex-end',
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  claimedText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#22c55e',
    fontWeight: 'bold',
  },
  lossBadge: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lossText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
  },
  liveBadge: {
    backgroundColor: 'rgba(255,107,26,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveText: {
    fontFamily: 'monospace',
    fontSize: 8.5,
    color: '#FF6B1A',
    fontWeight: 'bold',
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  claimBtnText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#22c55e',
    fontWeight: 'bold',
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
    marginBottom: 16,
  },
  selectedChoiceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
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
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  simulatedContainer: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    gap: 6,
  },
  simRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  simLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  simVal: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modalBtn: {
    flex: 1,
    height: 48,
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
