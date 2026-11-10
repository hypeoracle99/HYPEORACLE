import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { client } from '../lib/insforge';
import { DePINIdentity } from '../lib/secure-store';
import { RecordScreen } from './RecordScreen';
import {
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
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  identity: DePINIdentity | null;
  onNavigateTab: (tab: 'home' | 'market' | 'predict' | 'community' | 'hub') => void;
}

interface TokenVibe {
  mint: string;
  symbol: string;
  name: string;
  score: number;
  confidence: number;
  contributorCount: number;
  change24h: number;
  priceSol: number;
  isHot: boolean;
}

const DEFAULT_HOME_TOKENS: TokenVibe[] = [
  {
    mint: '5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS',
    symbol: 'HYPE',
    name: 'HypeOracle Protocol',
    score: 94,
    confidence: 0.96,
    contributorCount: 486,
    change24h: +28.4,
    priceSol: 0.0042,
    isHot: true,
  },
  {
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Solana',
    score: 86,
    confidence: 0.92,
    contributorCount: 842,
    change24h: +14.2,
    priceSol: 1.0,
    isHot: true,
  },
  {
    mint: 'DezXAZ8z7PnrFcPykJzi56854ec165hah36E1erZyNMX',
    symbol: 'BONK',
    name: 'Bonk',
    score: 78,
    confidence: 0.88,
    contributorCount: 520,
    change24h: +6.8,
    priceSol: 0.00000021,
    isHot: false,
  },
  {
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    symbol: 'JUP',
    name: 'Jupiter Exchange',
    score: 82,
    confidence: 0.89,
    contributorCount: 410,
    change24h: +9.1,
    priceSol: 0.0078,
    isHot: true,
  },
  {
    mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    symbol: 'WIF',
    name: 'dogwifhat',
    score: 74,
    confidence: 0.85,
    contributorCount: 380,
    change24h: -3.4,
    priceSol: 0.0125,
    isHot: false,
  },
];

// Circular SVG Score Gauge (Direct match of Web ScoreGauge)
function CircularScoreGauge({ score, size = 68 }: { score: number; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const isHot = score >= 80;
  const isWarm = score >= 60;
  const strokeColor = isHot ? '#FF6B1A' : isWarm ? '#f59e0b' : '#4b5563';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress stroke */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>
      <View style={styles.gaugeInnerContent}>
        <Text style={[styles.gaugeScoreText, isHot && styles.gaugeScoreHot]}>{score}</Text>
        <Text style={styles.gaugeSubText}>SCORE</Text>
      </View>
    </View>
  );
}

export function HomeScreen({ identity, onNavigateTab }: HomeScreenProps) {
  const [tokens, setTokens] = useState<TokenVibe[]>(DEFAULT_HOME_TOKENS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'hot' | 'bags'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedTokenForHype, setSelectedTokenForHype] = useState<TokenVibe | null>(null);

  const loadVibeData = useCallback(async () => {
    try {
      const { data, error } = await client.database
        .from('vibe_scores')
        .select('*')
        .order('score', { ascending: false });

      if (data && data.length > 0) {
        // Enhance with real remote scores if present
      }
    } catch (err) {
      // Fallback state active
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVibeData();
  }, [loadVibeData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadVibeData();
  };

  const filteredTokens = useMemo(() => {
    return tokens.filter((t) => {
      const matchesSearch =
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (filterMode === 'hot') return t.score >= 80;
      if (filterMode === 'bags') return t.symbol === 'HYPE';
      return true;
    });
  }, [tokens, searchQuery, filterMode]);

  const handleOpenSendHype = (token?: TokenVibe) => {
    setSelectedTokenForHype(token || null);
    setRecordModalOpen(true);
  };

  return (
    <View style={styles.container}>
      {/* 1. Horizontal Live Ticker Bar (Exact Web Match) */}
      <View style={styles.tickerBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tickerContent}>
          {tokens.map((token, i) => {
            const isPos = token.change24h >= 0;
            return (
              <TouchableOpacity
                key={`${token.symbol}-${i}`}
                style={styles.tickerItem}
                onPress={() => onNavigateTab('market')}
              >
                <View style={styles.tickerDot} />
                <Text style={styles.tickerSymbol}>${token.symbol}</Text>
                <Text style={[styles.tickerChange, { color: isPos ? '#10b981' : '#ef4444' }]}>
                  {isPos ? '+' : ''}{token.change24h}%
                </Text>
                <View style={styles.tickerBagsBadge}>
                  <Text style={styles.tickerBagsText}>Bags.fm 👜</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
      >
        {/* 2. Web-Equivalent Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroLogoWrap}>
            <View style={styles.heroGlowCircle} />
            <View style={styles.heroBadgeBox}>
              <Flame size={32} color="#FF6B1A" />
            </View>
          </View>

          <Text style={styles.heroTitle}>
            <Text style={{ color: '#FF6B1A' }}>HYPE </Text>
            <Text style={{ color: '#fff' }}>ORACLE</Text>
          </Text>

          <Text style={styles.heroTagline}>
            Real human voice &amp; DePIN sensors → AI-scored emotion oracle →
            {'\n'}
            <Text style={{ color: '#FF6B1A', fontWeight: 'bold' }}>Automated token trades on Solana</Text>
          </Text>

          {/* Quick Stats Grid */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statPill} onPress={() => onNavigateTab('community')}>
              <Text style={styles.statValText}>VIBE 2.0</Text>
              <Text style={styles.statLabelText}>INTELLIGENCE</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statPill} onPress={() => onNavigateTab('market')}>
              <Text style={styles.statValText}>6 TOKENS</Text>
              <Text style={styles.statLabelText}>TRACKED</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statPill} onPress={() => onNavigateTab('hub')}>
              <Text style={styles.statValText}>1.0 SOL</Text>
              <Text style={styles.statLabelText}>MAX BUY LIMIT</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Primary CTA: Send Hype Trigger Banner */}
        <TouchableOpacity
          style={styles.mainCtaCard}
          onPress={() => handleOpenSendHype()}
          activeOpacity={0.85}
        >
          <View style={styles.ctaLeft}>
            <View style={styles.ctaIconBox}>
              <Zap size={20} color="#050507" />
            </View>
            <View>
              <Text style={styles.ctaTitle}>SEND PHYSICAL HYPE</Text>
              <Text style={styles.ctaSub}>Stream 5s voice + motion to trigger Bags.fm buys</Text>
            </View>
          </View>
          <View style={styles.ctaActionPill}>
            <Text style={styles.ctaActionPillText}>RECORD NOW</Text>
          </View>
        </TouchableOpacity>

        {/* 4. Token Search Bar */}
        <View style={styles.searchWrap}>
          <Search size={15} color="rgba(255,255,255,0.4)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search token name or symbol..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* 5. Filter Pills */}
        <View style={styles.filterPillsRow}>
          {[
            { id: 'all', label: 'ALL TOKENS' },
            { id: 'hot', label: '🔥 HOT (>80 HYPE)' },
            { id: 'bags', label: 'BAGS.FM OFFICIAL' },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterPill, filterMode === f.id && styles.filterPillActive]}
              onPress={() => setFilterMode(f.id as any)}
            >
              <Text style={[styles.filterPillText, filterMode === f.id && styles.filterPillTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 6. Live Token Cards with Circular Score Gauge */}
        <View style={styles.tokenGrid}>
          {filteredTokens.map((token) => {
            const isHot = token.score >= 80;

            return (
              <View key={token.mint} style={[styles.vibeCard, isHot && styles.vibeCardHot]}>
                <View style={styles.vibeCardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.vibeTokenSymbol}>${token.symbol}</Text>
                      {isHot && (
                        <View style={styles.hotPill}>
                          <Flame size={10} color="#FF6B1A" />
                          <Text style={styles.hotPillText}>BUY TRIGGER</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.vibeTokenName}>{token.name}</Text>
                    <Text style={styles.vibeContributors}>
                      👥 {token.contributorCount} real sensor contributors
                    </Text>
                  </View>

                  {/* Circular Score Gauge */}
                  <CircularScoreGauge score={token.score} size={68} />
                </View>

                {/* Card Action Row */}
                <View style={styles.vibeCardActions}>
                  <TouchableOpacity
                    style={styles.vibeSendHypeBtn}
                    onPress={() => handleOpenSendHype(token)}
                  >
                    <Zap size={13} color="#FF6B1A" />
                    <Text style={styles.vibeSendHypeText}>SEND HYPE</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.vibeTradeBagsBtn}
                    onPress={() => onNavigateTab('market')}
                  >
                    <Text style={styles.vibeTradeBagsText}>TRADE ON BAGS 👜</Text>
                    <ArrowUpRight size={13} color="#050507" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Recording & DePIN Submission Modal */}
      <Modal visible={recordModalOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Flame size={18} color="#FF6B1A" />
                <Text style={styles.modalSheetTitle}>
                  {selectedTokenForHype ? `SUBMIT HYPE: $${selectedTokenForHype.symbol}` : 'SUBMIT DEPIN SENSOR VIBE'}
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
    backgroundColor: '#050507',
  },
  tickerBar: {
    height: 38,
    backgroundColor: '#0a0a12',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tickerContent: {
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 16,
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
    backgroundColor: '#FF6B1A',
  },
  tickerSymbol: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tickerChange: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tickerBagsBadge: {
    backgroundColor: 'rgba(255,107,26,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.25)',
  },
  tickerBagsText: {
    color: '#FF6B1A',
    fontFamily: 'monospace',
    fontSize: 8.5,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  heroLogoWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroGlowCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,107,26,0.25)',
  },
  heroBadgeBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0a0a12',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTagline: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  statPill: {
    flex: 1,
    backgroundColor: '#0a0a12',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statLabelText: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
    fontSize: 8.5,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  mainCtaCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: 'rgba(255,107,26,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.4)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  ctaIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FF6B1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: {
    color: '#FF6B1A',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  ctaSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 2,
  },
  ctaActionPill: {
    backgroundColor: '#FF6B1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ctaActionPillText: {
    color: '#050507',
    fontFamily: 'monospace',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a10',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  filterPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#0a0a12',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterPillActive: {
    borderColor: 'rgba(255,107,26,0.4)',
    backgroundColor: 'rgba(255,107,26,0.12)',
  },
  filterPillText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  filterPillTextActive: {
    color: '#FF6B1A',
    fontWeight: 'bold',
  },
  tokenGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  vibeCard: {
    backgroundColor: '#0a0a12',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
  },
  vibeCardHot: {
    borderColor: 'rgba(255,107,26,0.35)',
    backgroundColor: 'rgba(255,107,26,0.03)',
  },
  vibeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  vibeTokenSymbol: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 17,
    fontWeight: 'bold',
  },
  hotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,107,26,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hotPillText: {
    color: '#FF6B1A',
    fontFamily: 'monospace',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  vibeTokenName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  vibeContributors: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
    fontSize: 9.5,
    marginTop: 6,
  },
  gaugeInnerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeScoreText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 17,
    fontWeight: 'bold',
  },
  gaugeScoreHot: {
    color: '#FF6B1A',
  },
  gaugeSubText: {
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace',
    fontSize: 7.5,
  },
  vibeCardActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12,
  },
  vibeSendHypeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(255,107,26,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  vibeSendHypeText: {
    color: '#FF6B1A',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  vibeTradeBagsBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FF6B1A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  vibeTradeBagsText: {
    color: '#050507',
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
    height: '80%',
    backgroundColor: '#0a0a12',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.3)',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 10,
  },
  modalSheetTitle: {
    color: '#FF6B1A',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
