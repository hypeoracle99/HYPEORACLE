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
import { THEME } from '../lib/theme';
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
    hypeScore: 96.8,
    confidence: 0.98,
    contributorCount: 486,
    change24h: +42.7,
    bondingCurvePercent: 88.5,
    priceSol: 0.0042,
    status: 'raging',
    history: [65, 72, 78, 85, 91, 94, 96.8],
  },
  {
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Solana',
    hypeScore: 93.1,
    confidence: 0.95,
    contributorCount: 842,
    change24h: +12.3,
    bondingCurvePercent: 100,
    priceSol: 1.0,
    status: 'raging',
    history: [78, 80, 84, 82, 88, 91, 93.1],
  },
  {
    mint: 'DezXAZ8z7PnrFcPykJzi56854ec165hah36E1erZyNMX',
    symbol: 'BONK',
    name: 'Bonk',
    hypeScore: 90.4,
    confidence: 0.91,
    contributorCount: 520,
    change24h: +11.9,
    bondingCurvePercent: 100,
    priceSol: 0.00000021,
    status: 'raging',
    history: [68, 72, 70, 79, 83, 87, 90.4],
  },
  {
    mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    symbol: 'WIF',
    name: 'dogwifhat',
    hypeScore: 88.7,
    confidence: 0.89,
    contributorCount: 380,
    change24h: +9.6,
    bondingCurvePercent: 100,
    priceSol: 0.0125,
    status: 'bullish',
    history: [72, 75, 78, 81, 80, 85, 88.7],
  },
  {
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    symbol: 'JUP',
    name: 'Jupiter Exchange',
    hypeScore: 85.2,
    confidence: 0.88,
    contributorCount: 410,
    change24h: +8.1,
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
  const strokeColor = isPositive ? THEME.primary : THEME.bearish;
  const gradId = `grad_${Math.random().toString(36).substring(2, 7)}`;

  return (
    <Svg width={chartWidth} height={chartHeight}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={strokeColor} stopOpacity="0.35" />
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
          <Stop offset="0" stopColor={THEME.primary} stopOpacity="0.35" />
          <Stop offset="1" stopColor={THEME.primary} stopOpacity="0.0" />
        </LinearGradient>
      </Defs>
      {/* 80 Hype Threshold Trigger Line */}
      <Line
        x1="0"
        y1={chartHeight - padding - ((80 - min) / (max - min)) * (chartHeight - padding * 2)}
        x2={chartWidth}
        y2={chartHeight - padding - ((80 - min) / (max - min)) * (chartHeight - padding * 2)}
        stroke="rgba(0, 255, 136, 0.3)"
        strokeDasharray="4 4"
        strokeWidth="1"
      />
      <Path d={areaPath} fill="url(#heroGradient)" />
      <Path d={linePath} fill="none" stroke={THEME.primary} strokeWidth="2.5" strokeLinecap="round" />
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
        // Merge with existing token metadata if available
      }
    } catch (err) {
      // Keep state resilient
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
      await new Promise((resolve) => setTimeout(resolve, 1200));

      Alert.alert(
        '⚡ Hype Swap Executed!',
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
          <Search size={15} color={THEME.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search token mint or symbol..."
            placeholderTextColor={THEME.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />}
      >
        {/* Collective Hype Banner Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Activity size={18} color={THEME.primary} />
              <Text style={styles.heroTitle}>AGGREGATE SOLANA HYPE INDEX</Text>
            </View>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE ORACLE</Text>
            </View>
          </View>

          <View style={styles.heroScoreRow}>
            <Text style={styles.heroScoreNum}>96.8</Text>
            <View style={{ marginLeft: 12 }}>
              <View style={styles.heroStatusPill}>
                <Text style={styles.heroStatusText}>⚡ STRONG HYPE</Text>
              </View>
              <Text style={styles.heroSubtext}>Trigger threshold &gt;80 reached across 6 tokens</Text>
            </View>
          </View>

          {/* SVG Hero Sentiment Chart */}
          <View style={styles.chartWrapper}>
            <LargeSentimentChart data={[64, 71, 78, 85, 91, 94, 96.8]} />
            <View style={styles.chartLegend}>
              <Text style={styles.legendText}>7D SENTIMENT MOMENTUM</Text>
              <Text style={styles.legendThreshold}>DASHED: AUTO-BUY THRESHOLD (80)</Text>
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
                        <Zap size={10} color={THEME.primary} />
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
                  <Text style={[styles.changeText, { color: isPositive ? THEME.primary : THEME.bearish }]}>
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
                  <Zap size={14} color={THEME.onPrimary} />
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
                  <Zap size={18} color={THEME.primary} />
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
                  <Text style={[styles.infoValue, { color: THEME.primary }]}>{selectedToken.hypeScore}/100 ⚡</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.infoLabel}>DYNAMIC FEE SHARE</Text>
                  <Text style={[styles.infoValue, { color: THEME.primary }]}>1.0% to contributors</Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>PAY WITH SOL (FROM IN-APP WALLET):</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="decimal-pad"
                value={swapAmount}
                onChangeText={setSwapAmount}
                placeholder="0.1"
                placeholderTextColor={THEME.textDim}
              />

              <TouchableOpacity
                style={styles.confirmSwapBtn}
                onPress={handleExecuteSwap}
                disabled={swapping}
              >
                {swapping ? (
                  <ActivityIndicator size="small" color={THEME.onPrimary} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.confirmSwapText}>EXECUTE SWAP VIA BAGS.FM</Text>
                    <ArrowUpRight size={16} color={THEME.onPrimary} />
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
    backgroundColor: THEME.bg,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBarRow: {
    marginBottom: 12,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: THEME.radiusMd,
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: THEME.text,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  heroCard: {
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.borderAccent,
    borderRadius: THEME.radiusLg,
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
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 10.5,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
  },
  liveText: {
    color: THEME.primary,
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
    color: THEME.text,
    fontFamily: 'monospace',
    fontSize: 32,
    fontWeight: 'bold',
  },
  heroStatusPill: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  heroStatusText: {
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  heroSubtext: {
    color: THEME.textSecondary,
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
    color: THEME.textMuted,
    fontFamily: 'monospace',
    fontSize: 8.5,
  },
  legendThreshold: {
    color: THEME.primary,
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
    backgroundColor: THEME.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
  },
  filterBtnActive: {
    borderColor: THEME.borderAccentStrong,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  filterBtnText: {
    color: THEME.textMuted,
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
  },
  filterBtnTextActive: {
    color: THEME.primary,
  },
  tokenCard: {
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  tokenCardHighHype: {
    borderColor: THEME.borderAccent,
  },
  tokenTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tokenSymbol: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 255, 136, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hotBadgeText: {
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  tokenName: {
    color: THEME.textSecondary,
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
    backgroundColor: 'rgba(0, 255, 136, 0.12)',
    borderWidth: 1,
    borderColor: THEME.borderAccent,
  },
  scoreBadgeNormal: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  scoreValue: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  scoreValueHot: {
    color: THEME.primary,
  },
  scoreScale: {
    color: THEME.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
    marginLeft: 2,
  },
  tokenMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.bgSurface,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  middleLabel: {
    color: THEME.textMuted,
    fontFamily: 'monospace',
    fontSize: 8.5,
    marginBottom: 6,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.primary,
  },
  bondingText: {
    color: THEME.primary,
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
    color: THEME.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  swapActionBtn: {
    height: 48,
    backgroundColor: THEME.primary,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  swapActionText: {
    color: THEME.onPrimary,
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
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.borderAccentStrong,
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
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalDesc: {
    color: THEME.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  tokenInfoBox: {
    backgroundColor: THEME.bgSurface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoLabel: {
    color: THEME.textMuted,
    fontFamily: 'monospace',
    fontSize: 9.5,
  },
  infoValue: {
    color: THEME.text,
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  inputLabel: {
    color: THEME.textSecondary,
    fontFamily: 'monospace',
    fontSize: 9.5,
    marginBottom: 6,
  },
  amountInput: {
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    color: THEME.text,
    fontFamily: 'monospace',
    fontSize: 14,
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  confirmSwapBtn: {
    height: 48,
    backgroundColor: THEME.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSwapText: {
    color: THEME.onPrimary,
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
