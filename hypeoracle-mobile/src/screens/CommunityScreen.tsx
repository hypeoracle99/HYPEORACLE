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
    description: 'Use the Record tab to stream 5s acoustic + accelerometer telemetry to the DePIN oracle.',
    category: 'depin',
    verificationType: 'depin_sensor',
    xpReward: 100,
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
    title: 'Place a Prediction Market Stake',
    description: 'Bet YES or NO on any token sentiment target in the Predict tab.',
    category: 'sentiment',
    verificationType: 'instant_click',
    xpReward: 75,
    reputationReward: 20,
    currentCompletions: 220,
    isActive: true,
  },
  {
    id: 'quest_referral_share',
    title: 'Invite a Friend to HypeOracle',
    description: 'Share your personal referral link. Earn 50 XP when they connect their wallet.',
    category: 'referral',
    verificationType: 'referral_count',
    xpReward: 150,
    reputationReward: 35,
    currentCompletions: 185,
    isActive: true,
  },
];

const DEFAULT_LEADERBOARD: Participant[] = [
  { userPubkey: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', username: 'sol_vibester', totalXp: 1850, reputationScore: 420, completedQuestsCount: 12, referralCode: 'HYPE_7XKX', qualifiedReferralsCount: 14, currentStreak: 6, tier: 'Ambassador' },
  { userPubkey: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLyNzkKqNppJ', username: 'hype_whale', totalXp: 1420, reputationScore: 310, completedQuestsCount: 9, referralCode: 'HYPE_3J98', qualifiedReferralsCount: 9, currentStreak: 5, tier: 'Oracle Vanguard' },
  { userPubkey: '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM', username: 'bags_trader', totalXp: 980, reputationScore: 210, completedQuestsCount: 6, referralCode: 'HYPE_4UQE', qualifiedReferralsCount: 5, currentStreak: 3, tier: 'Hype Scout' },
  { userPubkey: '9aB8xQ2M1cK6wY7zE4vT8rP0sL5mN3jH2fD1gS4kL7p', username: 'crypto_sentry', totalXp: 720, reputationScore: 160, completedQuestsCount: 5, referralCode: 'HYPE_9AB8', qualifiedReferralsCount: 3, currentStreak: 4, tier: 'Vibester' },
  { userPubkey: '2zC5vL8mN1kP4wY7zE9aB3jH6fD0gS2rT5xQ8mK1vP9', username: 'acoustic_node', totalXp: 510, reputationScore: 110, completedQuestsCount: 4, referralCode: 'HYPE_2ZC5', qualifiedReferralsCount: 2, currentStreak: 2, tier: 'Initiate' },
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

  // Derive participant code
  const userPubkey = identity?.publicKey || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
  const referralCode = `HYPE_${userPubkey.slice(0, 4).toUpperCase()}`;
  const referralLink = `https://hypeoracle.io/community?ref=${referralCode}`;

  const userStats = {
    xp: 620 + (completedQuestIds.size - 1) * 75,
    reputation: 140 + (completedQuestIds.size - 1) * 15,
    tier: completedQuestIds.size >= 4 ? 'Hype Scout' : 'Vibester',
    completedCount: completedQuestIds.size,
    rank: 4,
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Attempt to fetch from InsForge API or DB
      const { data: dbQuests, error } = await client.database
        .from('community_quests')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (dbQuests && dbQuests.length > 0) {
        setQuests(dbQuests);
      }
    } catch (err) {
      // Fallback already populated
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
      // If quest has an external URL, open it
      if (quest.verificationConfig?.targetUrl) {
        if (quest.verificationConfig.targetUrl.startsWith('http')) {
          await Linking.openURL(quest.verificationConfig.targetUrl);
        }
      }

      // Simulate network verification delay
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
    { id: 'sentiment', label: 'SENTIMENT' },
  ];

  const filteredQuests = quests.filter(
    (q) => selectedCategory === 'all' || q.category === selectedCategory
  );

  return (
    <View style={styles.container}>
      {/* User Stats Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View style={styles.userBadge}>
            <Award size={14} color="#FF6B1A" />
            <Text style={styles.userTierText}>{userStats.tier.toUpperCase()}</Text>
          </View>
          <View style={styles.rankPill}>
            <Trophy size={12} color="#10b981" />
            <Text style={styles.rankText}>GLOBAL RANK #{userStats.rank}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{userStats.xp}</Text>
            <Text style={styles.statLabel}>TOTAL XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{userStats.reputation}</Text>
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
            <Share2 size={16} color="#FF6B1A" />
            <Text style={styles.referralTitle}>VIRAL REFERRALS</Text>
          </View>
          <View style={styles.rewardPill}>
            <Text style={styles.rewardPillText}>+50 XP / INVITE</Text>
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
            <Copy size={14} color={copiedCode ? '#10b981' : 'rgba(255,255,255,0.6)'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareReferral}
            activeOpacity={0.8}
          >
            <Share2 size={15} color="#050507" />
            <Text style={styles.shareButtonText}>SHARE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Tab Toggle */}
      <View style={styles.tabToggleRow}>
        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'quests' && styles.mainTabBtnActive]}
          onPress={() => setActiveTab('quests')}
        >
          <Zap size={14} color={activeTab === 'quests' ? '#FF6B1A' : 'rgba(255,255,255,0.4)'} />
          <Text style={[styles.mainTabText, activeTab === 'quests' && styles.mainTabTextActive]}>
            COMMUNITY QUESTS ({quests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'leaderboard' && styles.mainTabBtnActive]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Trophy size={14} color={activeTab === 'leaderboard' ? '#FF6B1A' : 'rgba(255,255,255,0.4)'} />
          <Text style={[styles.mainTabText, activeTab === 'leaderboard' && styles.mainTabTextActive]}>
            LEADERBOARD
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'quests' ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
        >
          {/* Category Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.categoryPill, selectedCategory === c.id && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(c.id)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    selectedCategory === c.id && styles.categoryPillTextActive,
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quests List */}
          {filteredQuests.map((quest) => {
            const isCompleted = completedQuestIds.has(quest.id);
            const isWorking = completingId === quest.id;

            return (
              <View key={quest.id} style={[styles.questCard, isCompleted && styles.questCardDone]}>
                <View style={styles.questTopRow}>
                  <View style={styles.questCatPill}>
                    <Text style={styles.questCatText}>{quest.category.toUpperCase()}</Text>
                  </View>
                  <View style={styles.questRewardPill}>
                    <Zap size={10} color="#FF6B1A" />
                    <Text style={styles.questRewardText}>+{quest.xpReward} XP</Text>
                  </View>
                </View>

                <Text style={styles.questTitle}>{quest.title}</Text>
                <Text style={styles.questDescription}>{quest.description}</Text>

                <View style={styles.questBottomRow}>
                  <Text style={styles.questCompletions}>
                    {quest.currentCompletions} verified participants
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.questActionBtn,
                      isCompleted ? styles.questActionDone : styles.questActionActive,
                    ]}
                    onPress={() => handleQuestAction(quest)}
                    disabled={isCompleted || isWorking}
                  >
                    {isWorking ? (
                      <ActivityIndicator size="small" color="#050507" />
                    ) : isCompleted ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={14} color="#10b981" />
                        <Text style={styles.questDoneText}>COMPLETED</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.questActiveText}>START & VERIFY</Text>
                        <ArrowUpRight size={14} color="#050507" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
        >
          {leaderboard.map((item, index) => {
            const isSelf = identity?.publicKey === item.userPubkey;
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

            return (
              <View key={item.userPubkey} style={[styles.leaderRow, isSelf && styles.leaderRowSelf]}>
                <View style={styles.leaderRankBox}>
                  <Text style={styles.leaderRankText}>{medal}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.leaderUsername}>{item.username}</Text>
                    {isSelf && <Text style={styles.youBadge}>YOU</Text>}
                  </View>
                  <Text style={styles.leaderPubkey}>
                    {item.userPubkey.slice(0, 4)}...{item.userPubkey.slice(-4)} • {item.tier}
                  </Text>
                </View>
                <View style={styles.leaderXpBox}>
                  <Text style={styles.leaderXpValue}>{item.totalXp} XP</Text>
                  <Text style={styles.leaderRepValue}>{item.reputationScore} REP</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
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
  headerCard: {
    backgroundColor: '#0a0a10',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
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
    backgroundColor: 'rgba(255,107,26,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.3)',
  },
  userTierText: {
    color: '#FF6B1A',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  rankText: {
    color: '#10b981',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
    fontSize: 9,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  referralCard: {
    backgroundColor: '#0d0d16',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.25)',
    borderRadius: 14,
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
    color: '#FF6B1A',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  rewardPill: {
    backgroundColor: 'rgba(255,107,26,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rewardPillText: {
    color: '#FF6B1A',
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
  },
  referralDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  referralActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  codeButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#050507',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  codeText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  shareButton: {
    width: 90,
    height: 48,
    backgroundColor: '#FF6B1A',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareButtonText: {
    color: '#050507',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#0a0a10',
    borderRadius: 10,
    padding: 4,
    marginBottom: 10,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  mainTabBtnActive: {
    backgroundColor: 'rgba(255,107,26,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.3)',
  },
  mainTabText: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mainTabTextActive: {
    color: '#FF6B1A',
  },
  categoryScroll: {
    marginBottom: 10,
    maxHeight: 36,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0d0d16',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginRight: 8,
  },
  categoryPillActive: {
    borderColor: '#FF6B1A',
    backgroundColor: 'rgba(255,107,26,0.15)',
  },
  categoryPillText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  categoryPillTextActive: {
    color: '#FF6B1A',
    fontWeight: 'bold',
  },
  questCard: {
    backgroundColor: '#0a0a12',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  questCardDone: {
    borderColor: 'rgba(16,185,129,0.25)',
    opacity: 0.85,
  },
  questTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questCatPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  questCatText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace',
    fontSize: 9,
  },
  questRewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,107,26,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  questRewardText: {
    color: '#FF6B1A',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  questTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  questDescription: {
    color: 'rgba(255,255,255,0.55)',
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
    color: 'rgba(255,255,255,0.3)',
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
    backgroundColor: '#FF6B1A',
  },
  questActionDone: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  questActiveText: {
    color: '#050507',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  questDoneText: {
    color: '#10b981',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a12',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  leaderRowSelf: {
    borderColor: '#FF6B1A',
    backgroundColor: 'rgba(255,107,26,0.05)',
  },
  leaderRankBox: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderRankText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  leaderUsername: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  youBadge: {
    backgroundColor: '#FF6B1A',
    color: '#050507',
    fontFamily: 'monospace',
    fontSize: 8,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  leaderPubkey: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
    fontSize: 10,
    marginTop: 2,
  },
  leaderXpBox: {
    alignItems: 'flex-end',
  },
  leaderXpValue: {
    color: '#FF6B1A',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 'bold',
  },
  leaderRepValue: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
    fontSize: 9,
  },
});
