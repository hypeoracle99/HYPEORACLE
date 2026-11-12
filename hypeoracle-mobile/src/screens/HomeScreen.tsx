import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  Dimensions,
  Modal,
  Image,
  Linking,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Circle, G, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { client } from '../lib/insforge';
import { fetchLiveTokenVibes, TokenVibe } from '../lib/live-tokens';
import { DePINIdentity } from '../lib/secure-store';
import { THEME } from '../lib/theme';
import { RecordScreen } from './RecordScreen';
import {
  Activity,
  Flame,
  Search,
  Zap,
  TrendingUp,
  Radio,
  ExternalLink,
  ShieldCheck,
  Award,
  Users,
  Cpu,
  X,
  ArrowUpRight,
  Sparkles,
  CheckCircle,
  Coins,
  ChevronRight,
  Mic,
  Gift,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface AutoMovingTickerProps {
  tokens: TokenVibe[];
  onNavigateTab: (tab: 'market') => void;
}

function AutoMovingTicker({ tokens, onNavigateTab }: AutoMovingTickerProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [sequenceWidth, setSequenceWidth] = useState(0);

  useEffect(() => {
    if (sequenceWidth <= 0 || tokens.length === 0) return;

    animatedValue.setValue(0);
    // Smooth readable marquee speed: ~32ms per pixel
    const duration = Math.max(16000, sequenceWidth * 32);

    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: -sequenceWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => animation.stop();
  }, [sequenceWidth, tokens.length]);

  if (!tokens || tokens.length === 0) return null;

  const renderItem = (token: TokenVibe, keyPrefix: string, index: number) => {
    const isPos = token.change24h >= 0;
    return (
      <TouchableOpacity
        key={`${keyPrefix}-${token.symbol}-${index}`}
        style={styles.tickerItem}
        onPress={() => onNavigateTab('market')}
        activeOpacity={0.75}
      >
        <View style={styles.tickerDot} />
        <Text style={styles.tickerSymbol}>${token.symbol}</Text>
        {token.priceUsd ? (
          <Text style={styles.tickerPrice}>
            ${token.priceUsd < 0.001 ? token.priceUsd.toPrecision(3) : token.priceUsd.toFixed(2)}
          </Text>
        ) : null}
        <Text style={[styles.tickerChange, { color: isPos ? THEME.primary : THEME.bearish }]}>
          {isPos ? '+' : ''}{token.change24h}%
        </Text>
        <View style={styles.tickerBagsBadge}>
          <Text style={styles.tickerBagsText}>Bags.fm 👜</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.tickerBar}>
      <Animated.View
        style={[
          styles.tickerTrack,
          {
            transform: [{ translateX: animatedValue }],
          },
        ]}
      >
        <View
          style={styles.tickerSequence}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0 && Math.abs(w - sequenceWidth) > 2) {
              setSequenceWidth(w);
            }
          }}
        >
          {tokens.map((token, i) => renderItem(token, 'seq1', i))}
        </View>

        <View style={styles.tickerSequence}>
          {tokens.map((token, i) => renderItem(token, 'seq2', i))}
        </View>

        <View style={styles.tickerSequence}>
          {tokens.map((token, i) => renderItem(token, 'seq3', i))}
        </View>

        <View style={styles.tickerSequence}>
          {tokens.map((token, i) => renderItem(token, 'seq4', i))}
        </View>
      </Animated.View>
    </View>
  );
}

interface HomeScreenProps {
  identity: DePINIdentity | null;
  onNavigateTab: (tab: 'home' | 'market' | 'predict' | 'community' | 'hub') => void;
}

const DEFAULT_HOME_TOKENS: TokenVibe[] = [
  {
    mint: '5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS',
    symbol: 'HYPE',
    name: 'HypeOracle',
    score: 96.8,
    confidence: 0.98,
    contributorCount: 486,
    change24h: +42.7,
    priceSol: 0.0042,
    isHot: true,
    history: [65, 72, 78, 85, 91, 94, 96.8],
  },
  {
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Solana',
    score: 93.1,
    confidence: 0.95,
    contributorCount: 842,
    change24h: +12.3,
    priceSol: 1.0,
    isHot: true,
    history: [78, 80, 84, 82, 88, 91, 93.1],
  },
  {
    mint: 'DezXAZ8z7PnrFcPykJzi56854ec165hah36E1erZyNMX',
    symbol: 'BONK',
    name: 'Bonk',
    score: 90.4,
    confidence: 0.91,
    contributorCount: 520,
    change24h: +11.9,
    priceSol: 0.00000021,
    isHot: true,
    history: [68, 72, 70, 79, 83, 87, 90.4],
  },
  {
    mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    symbol: 'WIF',
    name: 'dogwifhat',
    score: 88.7,
    confidence: 0.89,
    contributorCount: 380,
    change24h: +9.6,
    priceSol: 0.0125,
    isHot: true,
    history: [72, 75, 78, 81, 80, 85, 88.7],
  },
  {
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    symbol: 'JUP',
    name: 'Jupiter Exchange',
    score: 85.2,
    confidence: 0.88,
    contributorCount: 410,
    change24h: +8.1,
    priceSol: 0.0078,
    isHot: true,
    history: [70, 74, 76, 79, 81, 83, 85.2],
  },
];

// Mini Neon Green Sparkline
function MiniGreenSparkline({ data }: { data: number[] }) {
  const chartWidth = 65;
  const chartHeight = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * chartWidth;
    const y = chartHeight - ((val - min) / range) * (chartHeight - 4) - 2;
    return { x, y };
  });

  const path = points.reduce((acc, curr, idx) => {
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }, '');

  return (
    <Svg width={chartWidth} height={chartHeight}>
      <Path d={path} fill="none" stroke={THEME.primary} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

// Circular Cyber-Green Score Gauge (Matches Futuristic Command Center)
function CyberScoreGauge({ score, size = 110 }: { score: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Outer glow ring background */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(0, 255, 136, 0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Luminous progress stroke */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={THEME.primary}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>
      <View style={styles.gaugeInnerContent}>
        <Text style={styles.gaugeScoreText}>{score}</Text>
        <Text style={styles.gaugeSubText}>HYPE SCORE</Text>
      </View>
    </View>
  );
}

export function HomeScreen({ identity, onNavigateTab }: HomeScreenProps) {
  const [tokens, setTokens] = useState<TokenVibe[]>(DEFAULT_HOME_TOKENS);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedTokenForHype, setSelectedTokenForHype] = useState<TokenVibe | null>(null);

  const loadVibeData = useCallback(async () => {
    try {
      const liveTokens = await fetchLiveTokenVibes();
      if (liveTokens && liveTokens.length > 0) {
        setTokens(liveTokens);
      }
    } catch (err: any) {
      console.warn('[HomeScreen] Live prices fetch error, using resilient state:', err?.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVibeData();
    // Live price refresh every 25 seconds
    const interval = setInterval(loadVibeData, 25000);
    return () => clearInterval(interval);
  }, [loadVibeData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadVibeData();
  };

  const handleOpenSendHype = (token?: TokenVibe) => {
    setSelectedTokenForHype(token || null);
    setRecordModalOpen(true);
  };

  const filteredTokens = useMemo(() => {
    return tokens.filter((t) =>
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tokens, searchQuery]);

  return (
    <View style={styles.container}>
      {/* 1. Horizontal Auto-Moving Live Ticker Strip */}
      <AutoMovingTicker tokens={tokens} onNavigateTab={onNavigateTab} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 70 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />}
      >
        {/* 2. Hero Section (Inspired by Reference Image 2) */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitleMain}>
            Feel the <Text style={{ color: THEME.primary }}>Hype.</Text>
            {'\n'}Trigger the <Text style={{ color: '#fff' }}>Oracle.</Text>
          </Text>

          <Text style={styles.heroSub}>
            Your voice. AI intelligence. On-chain action.
          </Text>

          {/* Primary CTA: Electric Neon Green "Scan Your Vibe" */}
          <TouchableOpacity
            style={styles.scanVibeBtn}
            onPress={() => handleOpenSendHype()}
            activeOpacity={0.85}
          >
            <Mic size={18} color={THEME.onPrimary} />
            <Text style={styles.scanVibeBtnText}>Scan Your Vibe ➔</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Four Core Metric Cards (From Mockup) */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <Flame size={12} color={THEME.gold} />
              <Text style={styles.statLabel}>Live Signals</Text>
            </View>
            <Text style={styles.statNumber}>24,753</Text>
            <Text style={styles.statChange}>▲ +12.5%</Text>
          </View>

          <View style={styles.statCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <Award size={12} color={THEME.gold} />
              <Text style={styles.statLabel}>Your XP</Text>
            </View>
            <Text style={styles.statNumber}>3,420</Text>
            <Text style={styles.statChange}>▲ +8%</Text>
          </View>

          <View style={styles.statCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <Cpu size={12} color={THEME.primary} />
              <Text style={styles.statLabel}>Oracle Trades</Text>
            </View>
            <Text style={styles.statNumber}>1,248</Text>
            <Text style={styles.statChange}>▲ +22%</Text>
          </View>

          <View style={styles.statCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <Activity size={12} color={THEME.teal} />
              <Text style={styles.statLabel}>Fuel Reserve</Text>
            </View>
            <Text style={styles.statNumber}>87.4%</Text>
            <Text style={[styles.statChange, { color: THEME.primary }]}>Healthy</Text>
          </View>
        </View>

        {/* 4. Oracle Signal Circular Card (Command Center Gauge) */}
        <View style={styles.oracleGaugeCard}>
          <View style={styles.gaugeHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Radio size={14} color={THEME.primary} />
              <Text style={styles.gaugeHeaderTitle}>ORACLE SIGNAL MOMENTUM</Text>
            </View>
            <View style={styles.liveIndicatorPill}>
              <View style={styles.liveGreenDot} />
              <Text style={styles.liveIndicatorText}>LIVE</Text>
            </View>
          </View>

          <View style={styles.gaugeCenterWrap}>
            <CyberScoreGauge score={96.8} size={118} />
          </View>

          <View style={styles.strongSignalPill}>
            <Zap size={13} color={THEME.primary} />
            <Text style={styles.strongSignalText}>Signal: Strong Hype (&gt;80 Trigger)</Text>
          </View>
        </View>

        {/* 5. Trending Tokens Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Tokens</Text>
          <TouchableOpacity onPress={() => onNavigateTab('market')}>
            <Text style={styles.seeAllText}>See All ➔</Text>
          </TouchableOpacity>
        </View>

        {/* Token Search Bar */}
        <View style={styles.searchBarWrap}>
          <Search size={15} color={THEME.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tokens or symbols..."
            placeholderTextColor={THEME.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Trending Token List */}
        <View style={styles.tokenListWrap}>
          {filteredTokens.map((token) => (
            <TouchableOpacity
              key={token.mint}
              style={styles.tokenRowItem}
              onPress={() => onNavigateTab('market')}
              activeOpacity={0.8}
            >
              {/* Token Info */}
              <View style={styles.tokenLeftGroup}>
                <View style={styles.tokenAvatarBox}>
                  <Text style={styles.tokenAvatarText}>{token.symbol.slice(0, 3)}</Text>
                </View>
                <View>
                  <Text style={styles.tokenSymbolText}>${token.symbol}</Text>
                  <Text style={styles.tokenNameText}>{token.name}</Text>
                </View>
              </View>

              {/* Sparkline */}
              <View style={styles.tokenMiddleSparkline}>
                <MiniGreenSparkline data={token.history} />
              </View>

              {/* Price & Change Pill */}
              <View style={styles.tokenRightPillGroup}>
                <View style={styles.tokenChangePill}>
                  {token.priceUsd ? (
                    <Text style={styles.tokenPriceSmall}>
                      ${token.priceUsd < 0.001 ? token.priceUsd.toPrecision(3) : token.priceUsd.toFixed(2)}
                    </Text>
                  ) : null}
                  <Text style={[styles.tokenChangeText, { color: token.change24h >= 0 ? THEME.primary : THEME.bearish }]}>
                    {token.change24h >= 0 ? '+' : ''}{token.change24h}%
                  </Text>
                </View>
                <View style={styles.tokenScoreBox}>
                  <Text style={styles.tokenScoreText}>{token.score}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 6. Activity Feed / Recent Oracle Events */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => onNavigateTab('community')}>
            <Text style={styles.seeAllText}>View All ➔</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <View style={[styles.activityIconBox, { backgroundColor: 'rgba(0, 255, 136, 0.12)' }]}>
              <Zap size={14} color={THEME.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle}>Oracle Executed Trade</Text>
              <Text style={styles.activitySub}>$HYPE • +12.5 SOL via Bags.fm • 2m ago</Text>
            </View>
            <Text style={styles.activityRewardText}>+50 XP</Text>
          </View>

          <View style={styles.activityItem}>
            <View style={[styles.activityIconBox, { backgroundColor: 'rgba(251, 191, 36, 0.12)' }]}>
              <Award size={14} color={THEME.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle}>Quest Completed: Daily Voice Vibe</Text>
              <Text style={styles.activitySub}>Acoustic DePIN node verified • 7m ago</Text>
            </View>
            <Text style={styles.activityRewardText}>+200 XP</Text>
          </View>
        </View>
      </ScrollView>

      {/* Recording / Vibe Scanner Modal */}
      <Modal visible={recordModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Activity size={18} color={THEME.primary} />
                <Text style={styles.modalSheetTitle}>
                  {selectedTokenForHype ? `VIBE SCANNER: $${selectedTokenForHype.symbol}` : 'DEPIN VIBE SCANNER'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRecordModalOpen(false)}>
                <X size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
              <RecordScreen
                identity={identity}
                onVibeSubmitted={() => {
                  setRecordModalOpen(false);
                  loadVibeData();
                }}
              />
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
    backgroundColor: THEME.bg,
  },
  tickerBar: {
    height: 38,
    backgroundColor: THEME.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  tickerTrack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tickerSequence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingRight: 16,
  },
  tickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tickerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: THEME.primary,
  },
  tickerSymbol: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tickerPrice: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tickerChange: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tickerBagsBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  tickerBagsText: {
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 8.5,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  heroTitleMain: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textAlign: 'center',
    color: '#fff',
    lineHeight: 38,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 13,
    color: THEME.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  scanVibeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.primary,
    paddingHorizontal: 24,
    height: 50,
    borderRadius: THEME.radiusFull,
    gap: 8,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  scanVibeBtnText: {
    color: THEME.onPrimary,
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: THEME.radiusMd,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: {
    color: THEME.textMuted,
    fontSize: 8.5,
    fontFamily: 'monospace',
  },
  statNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  statChange: {
    color: THEME.primary,
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  oracleGaugeCard: {
    marginHorizontal: 16,
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.borderAccent,
    borderRadius: THEME.radiusLg,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  gaugeHeaderTitle: {
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  liveIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveGreenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: THEME.primary,
  },
  liveIndicatorText: {
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  gaugeCenterWrap: {
    marginVertical: 10,
  },
  gaugeInnerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeScoreText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 26,
    fontWeight: 'bold',
  },
  gaugeSubText: {
    color: THEME.textMuted,
    fontFamily: 'monospace',
    fontSize: 8,
    marginTop: 2,
  },
  strongSignalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 136, 0.12)',
    borderWidth: 1,
    borderColor: THEME.borderAccent,
    borderRadius: THEME.radiusFull,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 6,
  },
  strongSignalText: {
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  seeAllText: {
    color: THEME.primary,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: THEME.radiusMd,
    paddingHorizontal: 12,
    height: 48,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  tokenListWrap: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
  },
  tokenRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: THEME.radiusMd,
    padding: 12,
  },
  tokenLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: 110,
  },
  tokenAvatarBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 255, 136, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.25)',
  },
  tokenAvatarText: {
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tokenSymbolText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tokenNameText: {
    color: THEME.textMuted,
    fontSize: 10,
  },
  tokenMiddleSparkline: {
    flex: 1,
    alignItems: 'center',
  },
  tokenRightPillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tokenChangePill: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'flex-end',
  },
  tokenPriceSmall: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  tokenChangeText: {
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tokenScoreBox: {
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tokenScoreText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  activityList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: THEME.radiusMd,
    padding: 12,
    gap: 10,
  },
  activityIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activitySub: {
    color: THEME.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  activityRewardText: {
    color: THEME.gold,
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '82%',
    backgroundColor: THEME.bgSurface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: THEME.borderAccent,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    paddingBottom: 10,
  },
  modalSheetTitle: {
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
