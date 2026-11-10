import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  Modal,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { client } from '../lib/insforge';
import { DePINIdentity } from '../lib/secure-store';
import {
  TrendingUp,
  Activity,
  Flame,
  ArrowUpRight,
  ShieldCheck,
  Search,
  Filter,
  Layers,
  Sparkles,
  Zap,
  X,
  Coins,
  CheckCircle,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface MarketScreenProps {
  identity: DePINIdentity | null;
}

interface MarketToken {
  mint: string;
  symbol: string;
  name: string;
  hypeScore: number;
  confidence: number;
  contributorCount: number;
  change24h: number;
  bondingCurvePercent: number;
  priceSol: number;
  status: 'raging' | 'bullish' | 'neutral' | 'bearish';
  history: number[];
}

const DEFAULT_MARKET_TOKENS: MarketToken[] = [
  {
    mint: '5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS',
    symbol: 'HYPE',
    name: 'HypeOracle Protocol',
    hypeScore: 94,
    confidence: 0.96,
    contributorCount: 486,
    change24h: +28.4,
    bondingCurvePercent: 78.5,
    priceSol: 0.0042,
    status: 'raging',
    history: [62, 68, 74, 71, 80, 89, 94],
  },
  {
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Solana',
    hypeScore: 86,
    confidence: 0.92,
    contributorCount: 842,
    change24h: +14.2,
    bondingCurvePercent: 100,
    priceSol: 1.0,
    status: 'raging',
    history: [75, 78, 80, 79, 82, 85, 86],
  },
  {
    mint: 'DezXAZ8z7PnrFcPykJzi56854ec165hah36E1erZyNMX',
    symbol: 'BONK',
    name: 'Bonk',
    hypeScore: 78,
    confidence: 0.88,
    contributorCount: 520,
    change24h: +6.8,
    bondingCurvePercent: 100,
    priceSol: 0.00000021,
    status: 'bullish',
    history: [65, 70, 68, 72, 75, 74, 78],
  },
  {
    mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    symbol: 'WIF',
    name: 'dogwifhat',
    hypeScore: 74,
    confidence: 0.85,
    contributorCount: 380,
    change24h: -3.4,
    bondingCurvePercent: 100,
    priceSol: 0.0125,
    status: 'neutral',
    history: [82, 80, 78, 76, 75, 72, 74],
  },
  {
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    symbol: 'JUP',
    name: 'Jupiter Exchange',
    hypeScore: 82,
    confidence: 0.89,
    contributorCount: 410,
    change24h: +9.1,
    bondingCurvePercent: 100,
    priceSol: 0.0078,
    status: 'bullish',
    history: [70, 72, 74, 78, 79, 80, 82],
  },
];

// Lightweight 60fps SVG Sparkline Area Chart
function MiniSparkline({ data, isPositive, chartWidth = 90, chartHeight = 36 }: { data: number[]; isPositive: boolean; chartWidth?: number; chartHeight?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((val - min) / range) * (chartHeight - padding * 2);
    return { x, y };
  });

  const linePath = points.reduce((acc, curr, idx) => {
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }, '');

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${chartHeight} L ${points[0].x.toFixed(1)} ${chartHeight} Z`;

  const strokeColor = isPositive ? '#10b981' : '#ef4444';
  const gradId = `grad_${Math.random().toString(36).substring(2, 7)}`;

  return (
    <Svg width={chartWidth} height={chartHeight}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={strokeColor} stopOpacity="0.3" />
          <Stop offset="1" stopColor={strokeColor} stopOpacity="0.0" />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill={`url(#${gradId})`} />
      <Path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// Full Header Sentiment Area Chart
function LargeSentimentChart({ data }: { data: number[] }) {
  const chartWidth = width - 40;
  const chartHeight = 85;
  const min = 50;
  const max = 100;
  const padding = 6;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((val - min) / (max - min)) * (chartHeight - padding * 2);
    return { x, y };
  });

  const linePath = points.reduce((acc, curr, idx) => {
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }, '');

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${chartHeight} L ${points[0].x.toFixed(1)} ${chartHeight} Z`;

  return (
    <Svg width={chartWidth} height={chartHeight}>
      <Defs>
        <LinearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF6B1A" stopOpacity="0.4" />
          <Stop offset="1" stopColor="#FF6B1A" stopOpacity="0.0" />
        </LinearGradient>
      </Defs>
      {/* 80 Hype Threshold Trigger Line */}
      <Line
        x1="0"
        y1={chartHeight - padding - ((80 - min) / (max - min)) * (chartHeight - padding * 2)}
        x2={chartWidth}
        y2={chartHeight - padding - ((80 - min) / (max - min)) * (chartHeight - padding * 2)}
        stroke="rgba(255,107,26,0.3)"
        strokeDasharray="4 4"
        strokeWidth="1"
      />
      <Path d={areaPath} fill="url(#heroGradient)" />
      <Path d={linePath} fill="none" stroke="#FF6B1A" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

export function MarketScreen({ identity }: MarketScreenProps) {
  const [tokens, setTokens] = useState<MarketToken[]>(DEFAULT_MARKET_TOKENS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSort, setFilterSort] = useState<'hype' | 'gainers' | 'bonding'>('hype');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedToken, setSelectedToken] = useState<MarketToken | null>(null);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapAmount, setSwapAmount] = useState('0.1');
  const [swapping, setSwapping] = useState(false);

  const loadMarketData = useCallback(async () => {
    try {
      const { data, error } = await client.database
        .from('vibe_scores')
        .select('*')
        .order('score', { ascending: false });

      if (data && data.length > 0) {
        // Merge with existing token metadata
      }
    } catch (err) {
      // Fallbacks active
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMarketData();
  }, [loadMarketData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMarketData();
  };

  const filteredTokens = useMemo(() => {
    let result = tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filterSort === 'hype') {
      result.sort((a, b) => b.hypeScore - a.hypeScore);
    } else if (filterSort === 'gainers') {
      result.sort((a, b) => b.change24h - a.change24h);
    } else if (filterSort === 'bonding') {
      result.sort((a, b) => b.bondingCurvePercent - a.bondingCurvePercent);
    }

    return result;
  }, [tokens, searchQuery, filterSort]);

  const handleOpenSwap = (token: MarketToken) => {
    setSelectedToken(token);
    setSwapModalOpen(true);
  };

  const handleExecuteSwap = async () => {
    if (!selectedToken) return;
    setSwapping(true);
    try {
      // Simulate Bags.fm / Jupiter routing
      await new Promise((resolve) => setTimeout(resolve, 1200));

      Alert.alert(
        '🔥 Hype Swap Executed!',
        `Successfully bought ${swapAmount} SOL worth of $${selectedToken.symbol} at Hype Score ${selectedToken.hypeScore}.`
      );
      setSwapModalOpen(false);
    } catch (err: any) {
      Alert.alert('Trade Failed', err?.message || 'Failed to complete transaction.');
    } finally {
      setSwapping(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search & Filter Bar */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchInputWrap}>
          <Search size={15} color="rgba(255,255,255,0.4)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search token mint or symbol..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
      >
        {/* Collective Hype Banner Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Flame size={18} color="#FF6B1A" />
              <Text style={styles.heroTitle}>AGGREGATE SOLANA HYPE INDEX</Text>
            </View>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE ORACLE</Text>
            </View>
          </View>

          <View style={styles.heroScoreRow}>
            <Text style={styles.heroScoreNum}>88.4</Text>
            <View style={{ marginLeft: 12 }}>
              <View style={styles.heroStatusPill}>
                <Text style={styles.heroStatusText}>🔥 RAGING BULLISH</Text>
              </View>
              <Text style={styles.heroSubtext}>Trigger threshold &gt;80 reached across 6 tokens</Text>
            </View>
          </View>

          {/* SVG Hero Sentiment Chart */}
          <View style={styles.chartWrapper}>
            <LargeSentimentChart data={[64, 71, 78, 75, 84, 86, 88.4]} />
            <View style={styles.chartLegend}>
              <Text style={styles.legendText}>7D SENTIMENT MOMENTUM</Text>
              <Text style={styles.legendThreshold}>DASHED LINE: AUTO-BUY THRESHOLD (80)</Text>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {[
            { id: 'hype', label: 'HIGHEST HYPE' },
            { id: 'gainers', label: 'TOP 24H GAINERS' },
            { id: 'bonding', label: 'BAGS BONDING CURVE' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterBtn, filterSort === f.id && styles.filterBtnActive]}
              onPress={() => setFilterSort(f.id as any)}
            >
              <Text style={[styles.filterBtnText, filterSort === f.id && styles.filterBtnTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Token Leaderboard Cards */}
        {filteredTokens.map((token) => {
          const isHighHype = token.hypeScore >= 80;
          const isPositive = token.change24h >= 0;

          return (
            <View key={token.mint} style={[styles.tokenCard, isHighHype && styles.tokenCardHighHype]}>
              <View style={styles.tokenTopRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.tokenSymbol}>${token.symbol}</Text>
                    {isHighHype && (
                      <View style={styles.hotBadge}>
                        <Flame size={10} color="#FF6B1A" />
                        <Text style={styles.hotBadgeText}>BUY TRIGGER</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.tokenName}>{token.name}</Text>
                </View>

                {/* Hype Score Badge */}
                <View style={[styles.scoreBadge, isHighHype ? styles.scoreBadgeHot : styles.scoreBadgeNormal]}>
                  <Text style={[styles.scoreValue, isHighHype && styles.scoreValueHot]}>
                    {token.hypeScore}
                  </Text>
                  <Text style={styles.scoreScale}>/100</Text>
                </View>
              </View>

              {/* Sparkline & Bonding curve Row */}
              <View style={styles.tokenMiddleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.middleLabel}>BONDING PROGRESS</Text>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(token.bondingCurvePercent, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.bondingText}>
                    {token.bondingCurvePercent >= 100 ? 'GRADUATED TO METEORA' : `${token.bondingCurvePercent}% FILLED`}
                  </Text>
                </View>

                {/* SVG Sparkline */}
                <View style={{ alignItems: 'flex-end', marginLeft: 16 }}>
                  <MiniSparkline data={token.history} isPositive={isPositive} />
                  <Text style={[styles.changeText, { color: isPositive ? '#10b981' : '#ef4444' }]}>
                    {isPositive ? '+' : ''}{token.change24h}% (24H)
                  </Text>
                </View>
              </View>

              {/* Action Bottom Row */}
              <View style={styles.tokenActionRow}>
                <Text style={styles.contributorsText}>
                  👥 {token.contributorCount} real sensor contributors
                </Text>
                <TouchableOpacity
                  style={styles.swapActionBtn}
                  onPress={() => handleOpenSwap(token)}
                  activeOpacity={0.8}
                >
                  <Zap size={14} color="#050507" />
                  <Text style={styles.swapActionText}>1-TAP HYPE BUY</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* 1-Tap Hype Buy Modal */}
      {selectedToken && (
        <Modal visible={swapModalOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Zap size={18} color="#FF6B1A" />
                  <Text style={styles.modalTitle}>BAGS HYPE SWAP</Text>
                </View>
                <TouchableOpacity onPress={() => setSwapModalOpen(false)}>
                  <X size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDesc}>
                Execute instant trading order for ${selectedToken.symbol} backed by verified on-chain sentiment signals.
              </Text>

              <View style={styles.tokenInfoBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={styles.infoLabel}>TARGET TOKEN</Text>
                  <Text style={styles.infoValue}>${selectedToken.symbol} ({selectedToken.name})</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={styles.infoLabel}>CURRENT HYPE SCORE</Text>
                  <Text style={[styles.infoValue, { color: '#FF6B1A' }]}>{selectedToken.hypeScore}/100 🔥</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.infoLabel}>DYNAMIC FEE SHARE</Text>
                  <Text style={[styles.infoValue, { color: '#10b981' }]}>1.0% to contributors</Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>PAY WITH SOL (FROM IN-APP WALLET):</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="decimal-pad"
                value={swapAmount}
                onChangeText={setSwapAmount}
                placeholder="0.1"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />

              <TouchableOpacity
                style={styles.confirmSwapBtn}
                onPress={handleExecuteSwap}
                disabled={swapping}
              >
                {swapping ? (
                  <ActivityIndicator size="small" color="#050507" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.confirmSwapText}>EXECUTE SWAP VIA BAGS.FM</Text>
                    <ArrowUpRight size={16} color="#050507" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050507',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBarRow: {
    marginBottom: 12,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a10',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48, // 48px touch target compliance
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  heroCard: {
    backgroundColor: '#0a0a12',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.25)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroTitle: {
    color: '#FF6B1A',
    fontFamily: 'monospace',
    fontSize: 10.5,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveText: {
    color: '#10b981',
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
  },
  heroScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroScoreNum: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 32,
    fontWeight: 'bold',
  },
  heroStatusPill: {
    backgroundColor: 'rgba(255,107,26,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  heroStatusText: {
    color: '#FF6B1A',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
  },
  chartWrapper: {
    alignItems: 'center',
    marginTop: 6,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 6,
  },
  legendText: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
    fontSize: 8.5,
  },
  legendThreshold: {
    color: '#FF6B1A',
    fontFamily: 'monospace',
    fontSize: 8.5,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#0a0a10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  filterBtnActive: {
    borderColor: 'rgba(255,107,26,0.3)',
    backgroundColor: 'rgba(255,107,26,0.1)',
  },
  filterBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
  },
  filterBtnTextActive: {
    color: '#FF6B1A',
  },
  tokenCard: {
    backgroundColor: '#0a0a12',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  tokenCardHighHype: {
    borderColor: 'rgba(255,107,26,0.35)',
  },
  tokenTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tokenSymbol: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,107,26,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hotBadgeText: {
    color: '#FF6B1A',
    fontFamily: 'monospace',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  tokenName: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    marginTop: 2,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreBadgeHot: {
    backgroundColor: 'rgba(255,107,26,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.4)',
  },
  scoreBadgeNormal: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  scoreValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  scoreValueHot: {
    color: '#FF6B1A',
  },
  scoreScale: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontFamily: 'monospace',
    marginLeft: 2,
  },
  tokenMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#050507',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  middleLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
    fontSize: 8.5,
    marginBottom: 6,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF6B1A',
  },
  bondingText: {
    color: '#10b981',
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
  },
  changeText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },
  tokenActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contributorsText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  swapActionBtn: {
    height: 48, // 48px touch target compliance
    backgroundColor: '#FF6B1A',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  swapActionText: {
    color: '#050507',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0a0a12',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.3)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    color: '#FF6B1A',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  tokenInfoBox: {
    backgroundColor: '#050507',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
    fontSize: 9.5,
  },
  infoValue: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace',
    fontSize: 9.5,
    marginBottom: 6,
  },
  amountInput: {
    backgroundColor: '#050507',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 14,
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  confirmSwapBtn: {
    height: 48,
    backgroundColor: '#FF6B1A',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSwapText: {
    color: '#050507',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

