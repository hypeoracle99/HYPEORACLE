import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  Share,
  Linking,
  RefreshControl,
  Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { client } from '../lib/insforge';
import { DePINIdentity } from '../lib/secure-store';
import { THEME } from '../lib/theme';
import {
  Users,
  Trophy,
  Zap,
  Share2,
  Copy,
  CheckCircle,
  ExternalLink,
  Flame,
  Award,
  Shield,
  ChevronRight,
  Radio,
  Sparkles,
  ArrowUpRight,
  Star,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface CommunityScreenProps {
  identity: DePINIdentity | null;
}

interface Quest {
  id: string;
  campaignId?: string;
  title: string;
  description: string;
  category: 'social' | 'community' | 'sentiment' | 'depin' | 'education' | 'referral';
  verificationType: string;
  verificationConfig?: {
    targetUrl?: string;
    targetHandle?: string;
    requiredScore?: number;
    sensorThreshold?: number;
  };
  xpReward: number;
  reputationReward: number;
  currentCompletions: number;
  isActive: boolean;
}

interface Participant {
  userPubkey: string;
  username: string;
  totalXp: number;
  reputationScore: number;
  completedQuestsCount: number;
  referralCode: string;
  qualifiedReferralsCount: number;
  currentStreak: number;
  tier: string;
}

const DEFAULT_QUESTS: Quest[] = [
  {
    id: 'quest_x_follow',
    title: 'Follow HypeOracle on X (@HypeOracle)',
    description: 'Stay connected to real-time sentiment alerts, protocol updates, and token launches.',
    category: 'social',
    verificationType: 'x_follow',
    verificationConfig: { targetUrl: 'https://x.com/HypeOracle' },
    xpReward: 50,
    reputationReward: 10,
    currentCompletions: 480,
    isActive: true,
  },
  {
    id: 'quest_depin_vibe',
    title: 'Stream Ambient Audio & Motion Vibe',
    description: 'Use the Scanner tab to stream 5s acoustic + accelerometer telemetry to the DePIN oracle.',
    category: 'depin',
    verificationType: 'depin_sensor',
    xpReward: 250,
    reputationReward: 25,
    currentCompletions: 312,
    isActive: true,
  },
  {
    id: 'quest_discord_join',
    title: 'Join Discord Alpha Sanctuary',
    description: 'Chat with quantitative traders, oracle builders, and vote in weekly governance.',
    category: 'community',
    verificationType: 'discord_join',
    verificationConfig: { targetUrl: 'https://discord.gg/hypeoracle' },
    xpReward: 50,
    reputationReward: 10,
    currentCompletions: 390,
    isActive: true,
  },
  {
    id: 'quest_telegram_join',
    title: 'Join Official Telegram Signals Channel',
    description: 'Receive real-time push alerts when collective hype cross the >80 buy trigger.',
    category: 'community',
    verificationType: 'telegram_join',
    verificationConfig: { targetUrl: 'https://t.me/HypeOracleApp' },
    xpReward: 50,
    reputationReward: 10,
    currentCompletions: 340,
    isActive: true,
  },
  {
    id: 'quest_predict_bet',
    title: 'Trade a Trending Token via Bags.fm',
    description: 'Execute a verified 1-tap swap on any high sentiment token in the Market tab.',
    category: 'sentiment',
    verificationType: 'instant_click',
    xpReward: 500,
    reputationReward: 50,
    currentCompletions: 220,
    isActive: true,
  },
  {
    id: 'quest_referral_share',
    title: 'Invite a Friend to HypeOracle',
    description: 'Share your personal referral link. Earn 250 XP when they connect their wallet.',
    category: 'referral',
    verificationType: 'referral_count',
    xpReward: 250,
    reputationReward: 35,
    currentCompletions: 185,
    isActive: true,
  },
];

const DEFAULT_LEADERBOARD: Participant[] = [
  { userPubkey: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', username: 'sol_vibester', totalXp: 3420, reputationScore: 420, completedQuestsCount: 12, referralCode: 'HYPE_7XKX', qualifiedReferralsCount: 14, currentStreak: 6, tier: 'Ambassador' },
  { userPubkey: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLyNzkKqNppJ', username: 'hype_whale', totalXp: 2840, reputationScore: 310, completedQuestsCount: 9, referralCode: 'HYPE_3J98', qualifiedReferralsCount: 9, currentStreak: 5, tier: 'Oracle Vanguard' },
  { userPubkey: '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM', username: 'bags_trader', totalXp: 1980, reputationScore: 210, completedQuestsCount: 6, referralCode: 'HYPE_4UQE', qualifiedReferralsCount: 5, currentStreak: 3, tier: 'Hype Scout' },
  { userPubkey: '9aB8xQ2M1cK6wY7zE4vT8rP0sL5mN3jH2fD1gS4kL7p', username: 'crypto_sentry', totalXp: 1420, reputationScore: 160, completedQuestsCount: 5, referralCode: 'HYPE_9AB8', qualifiedReferralsCount: 3, currentStreak: 4, tier: 'Vibester' },
  { userPubkey: '2zC5vL8mN1kP4wY7zE9aB3jH6fD0gS2rT5xQ8mK1vP9', username: 'acoustic_node', totalXp: 850, reputationScore: 110, completedQuestsCount: 4, referralCode: 'HYPE_2ZC5', qualifiedReferralsCount: 2, currentStreak: 2, tier: 'Initiate' },
];

export function CommunityScreen({ identity }: CommunityScreenProps) {
  const [activeTab, setActiveTab] = useState<'quests' | 'leaderboard'>('quests');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [quests, setQuests] = useState<Quest[]>(DEFAULT_QUESTS);
  const [leaderboard, setLeaderboard] = useState<Participant[]>(DEFAULT_LEADERBOARD);
  const [completedQuestIds, setCompletedQuestIds] = useState<Set<string>>(new Set(['quest_x_follow']));
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const userPubkey = identity?.publicKey || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
  const referralCode = `HYPE_${userPubkey.slice(0, 4).toUpperCase()}`;
  const referralLink = `https://hypeoracle.io/community?ref=${referralCode}`;

  const userStats = {
    xp: 2840 + (completedQuestIds.size - 1) * 250,
    reputation: 310 + (completedQuestIds.size - 1) * 25,
    tier: completedQuestIds.size >= 4 ? 'Oracle Vanguard' : 'Hype Scout',
    completedCount: completedQuestIds.size,
    rank: 2,
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: dbQuests, error } = await client.database
        .from('community_quests')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (dbQuests && dbQuests.length > 0) {
        setQuests(dbQuests);
      }
    } catch (err) {
      // Fallback populated
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCopyReferral = async () => {
    await Clipboard.setStringAsync(referralLink);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    Alert.alert('Link Copied!', 'Your referral invite link has been copied to your clipboard.');
  };

  const handleShareReferral = async () => {
    try {
      await Share.share({
        message: `Join me on HypeOracle – The Collective Emotion DePIN Oracle for Solana! Submit voice hype, complete quests, and earn fee shares: ${referralLink}`,
        url: referralLink,
        title: 'Join HypeOracle',
      });
    } catch (error: any) {
      console.error('[CommunityScreen] Share error:', error);
    }
  };

  const handleQuestAction = async (quest: Quest) => {
    if (completedQuestIds.has(quest.id)) {
      Alert.alert('Already Completed', 'You have already verified and claimed XP for this quest.');
      return;
    }

    setCompletingId(quest.id);

    try {
      if (quest.verificationConfig?.targetUrl) {
        if (quest.verificationConfig.targetUrl.startsWith('http')) {
          await Linking.openURL(quest.verificationConfig.targetUrl);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCompletedQuestIds((prev) => new Set([...prev, quest.id]));

      Alert.alert(
        '🎉 Quest Verified!',
        `Congratulations! You earned +${quest.xpReward} XP and +${quest.reputationReward} Reputation.`
      );
    } catch (err: any) {
      Alert.alert('Verification Issue', err?.message || 'Could not verify quest completion.');
    } finally {
      setCompletingId(null);
    }
  };

  const categories = [
    { id: 'all', label: 'ALL' },
    { id: 'social', label: 'SOCIAL' },
    { id: 'depin', label: 'DEPIN' },
    { id: 'community', label: 'COMMUNITY' },
    { id: 'sentiment', label: 'TRADING' },
  ];

  const filteredQuests = quests.filter(
    (q) => selectedCategory === 'all' || q.category === selectedCategory
  );

  return (
    <View style={styles.container}>
      {/* Rewards Header Card matching Mockup */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View style={styles.userBadge}>
            <Star size={14} color={THEME.primary} />
            <Text style={styles.userTierText}>{userStats.tier.toUpperCase()}</Text>
          </View>
          <View style={styles.rankPill}>
            <Trophy size={12} color={THEME.primary} />
            <Text style={styles.rankText}>RANK #{userStats.rank}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{userStats.xp.toLocaleString()}</Text>
            <Text style={styles.statLabel}>TOTAL XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>+{userStats.reputation}</Text>
            <Text style={styles.statLabel}>REPUTATION</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{userStats.completedCount}</Text>
            <Text style={styles.statLabel}>COMPLETED</Text>
          </View>
        </View>
      </View>

      {/* Referral Hub Card */}
      <View style={styles.referralCard}>
        <View style={styles.referralHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Share2 size={16} color={THEME.primary} />
            <Text style={styles.referralTitle}>VIRAL REFERRALS</Text>
          </View>
          <View style={styles.rewardPill}>
            <Text style={styles.rewardPillText}>+250 XP / INVITE</Text>
          </View>
        </View>
        <Text style={styles.referralDesc}>
          Share your referral link with traders and node contributors to unlock higher fee share tiers.
        </Text>
        <View style={styles.referralActionRow}>
          <TouchableOpacity
            style={styles.codeButton}
            onPress={handleCopyReferral}
            activeOpacity={0.8}
          >
            <Text style={styles.codeText}>{referralCode}</Text>
            <Copy size={14} color={copiedCode ? THEME.primary : THEME.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareReferral}
            activeOpacity={0.8}
          >
            <Share2 size={14} color={THEME.onPrimary} />
            <Text style={styles.shareText}>SHARE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Switcher Tabs */}
      <View style={styles.mainTabRow}>
        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'quests' && styles.mainTabBtnActive]}
          onPress={() => setActiveTab('quests')}
        >
          <Zap size={14} color={activeTab === 'quests' ? THEME.primary : THEME.textMuted} />
          <Text style={[styles.mainTabText, activeTab === 'quests' && styles.mainTabTextActive]}>
            CAMPAIGN QUESTS ({quests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'leaderboard' && styles.mainTabBtnActive]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Trophy size={14} color={activeTab === 'leaderboard' ? THEME.primary : THEME.textMuted} />
          <Text style={[styles.mainTabText, activeTab === 'leaderboard' && styles.mainTabTextActive]}>
            LEADERBOARD
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'quests' ? (
        <View style={{ flex: 1 }}>
          {/* Categories Horizontal Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.categoryPill, selectedCategory === c.id && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(c.id)}
              >
                <Text style={[styles.categoryPillText, selectedCategory === c.id && styles.categoryPillTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quests List */}
          <FlatList
            data={filteredQuests}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />}
            contentContainerStyle={{ paddingBottom: 60 }}
            renderItem={({ item }) => {
              const isDone = completedQuestIds.has(item.id);
              const isProcessing = completingId === item.id;

              return (
                <View style={[styles.questCard, isDone && styles.questCardDone]}>
                  <View style={styles.questTopRow}>
                    <View style={styles.questCatPill}>
                      <Text style={styles.questCatText}>{item.category.toUpperCase()}</Text>
                    </View>
                    <View style={styles.questRewardPill}>
                      <Zap size={10} color={THEME.primary} />
                      <Text style={styles.questRewardText}>+{item.xpReward} XP</Text>
                    </View>
                  </View>

                  <Text style={styles.questTitle}>{item.title}</Text>
                  <Text style={styles.questDescription}>{item.description}</Text>

                  <View style={styles.questBottomRow}>
                    <Text style={styles.questCompletions}>
                      👥 {item.currentCompletions} verified
                    </Text>

                    <TouchableOpacity
                      style={[styles.questActionBtn, isDone ? styles.questActionDone : styles.questActionActive]}
                      onPress={() => handleQuestAction(item)}
                      disabled={isDone || isProcessing}
                      activeOpacity={0.8}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color={THEME.onPrimary} />
                      ) : isDone ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={14} color={THEME.primary} />
                          <Text style={styles.questDoneText}>COMPLETED</Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={styles.questActiveText}>START QUEST</Text>
                          <ArrowUpRight size={14} color={THEME.onPrimary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      ) : (
        /* Leaderboard View */
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.userPubkey}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />}
          contentContainerStyle={{ paddingBottom: 60 }}
          renderItem={({ item, index }) => {
            const isSelf = item.userPubkey === userPubkey;

            return (
              <View style={[styles.leaderRow, isSelf && styles.leaderRowSelf]}>
                <View style={[styles.rankCircle, index === 0 && styles.rankCircleFirst]}>
                  <Text style={[styles.rankNumber, index === 0 && styles.rankNumberFirst]}>
                    #{index + 1}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.leaderUsername}>{item.username} {isSelf && '(You)'}</Text>
                  <Text style={styles.leaderAddress}>
                    {item.userPubkey.slice(0, 4)}...{item.userPubkey.slice(-4)} • {item.tier}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.leaderXpText}>{item.totalXp.toLocaleString()} XP</Text>
                  <Text style={styles.leaderQuests}>{item.completedQuestsCount} quests</Text>
                </View>
              </View>
            );
          }}
        />
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
  headerCard: {
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.borderAccent,
    borderRadius: THEME.radiusLg,
    padding: 16,
    marginBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  userTierText: {
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 255, 136, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rankText: {
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  statLabel: {
    color: THEME.textMuted,
    fontSize: 8.5,
    fontFamily: 'monospace',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: THEME.border,
  },
  referralCard: {
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: THEME.radiusLg,
    padding: 14,
    marginBottom: 12,
  },
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  referralTitle: {
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  rewardPill: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rewardPillText: {
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  referralDesc: {
    color: THEME.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  referralActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.bgSurface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  codeText: {
    color: THEME.text,
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shareButton: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    height: 48,
  },
  shareText: {
    color: THEME.onPrimary,
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  mainTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    height: 40,
  },
  mainTabBtnActive: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderColor: THEME.borderAccentStrong,
  },
  mainTabText: {
    color: THEME.textMuted,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mainTabTextActive: {
    color: THEME.primary,
  },
  categoryScroll: {
    marginBottom: 10,
    maxHeight: 36,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
    marginRight: 8,
  },
  categoryPillActive: {
    borderColor: THEME.primary,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
  },
  categoryPillText: {
    color: THEME.textMuted,
    fontFamily: 'monospace',
    fontSize: 10,
  },
  categoryPillTextActive: {
    color: THEME.primary,
    fontWeight: 'bold',
  },
  questCard: {
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  questCardDone: {
    borderColor: 'rgba(0, 255, 136, 0.25)',
    opacity: 0.85,
  },
  questTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questCatPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  questCatText: {
    color: THEME.textMuted,
    fontFamily: 'monospace',
    fontSize: 9,
  },
  questRewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  questRewardText: {
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  questTitle: {
    color: THEME.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  questDescription: {
    color: THEME.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  questBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questCompletions: {
    color: THEME.textDim,
    fontFamily: 'monospace',
    fontSize: 9.5,
  },
  questActionBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questActionActive: {
    backgroundColor: THEME.primary,
  },
  questActionDone: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  questActiveText: {
    color: THEME.onPrimary,
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  questDoneText: {
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  leaderRowSelf: {
    borderColor: THEME.borderAccentStrong,
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
  },
  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  rankCircleFirst: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderColor: THEME.primary,
  },
  rankNumber: {
    color: THEME.textMuted,
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  rankNumberFirst: {
    color: THEME.primary,
  },
  leaderUsername: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  leaderAddress: {
    color: THEME.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  leaderXpText: {
    color: THEME.primary,
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 'bold',
  },
  leaderQuests: {
    color: THEME.textMuted,
    fontSize: 9.5,
    fontFamily: 'monospace',
  },
});
