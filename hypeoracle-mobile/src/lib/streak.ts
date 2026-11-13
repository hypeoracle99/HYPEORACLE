import * as SecureStore from 'expo-secure-store';

const STREAK_KEY = 'hypeoracle_daily_streak_data';

export interface StreakInfo {
  streakDays: number;
  lastDate: string | null;
  totalVibes: number;
  badge: string;
  multiplier: number;
  todayLogged: boolean;
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function computeBadgeAndMultiplier(days: number): { badge: string; multiplier: number } {
  if (days >= 14) {
    return { badge: 'High Priest of Hype 👑', multiplier: 2.0 };
  }
  if (days >= 7) {
    return { badge: 'Consensus Guardian 💎', multiplier: 1.5 };
  }
  if (days >= 3) {
    return { badge: 'Sensory DePIN Node 🔥', multiplier: 1.2 };
  }
  return { badge: 'Novice Oracle ⚡', multiplier: 1.0 };
}

/**
 * Loads the current daily contributor streak
 */
export async function getDailyStreak(): Promise<StreakInfo> {
  try {
    const raw = await SecureStore.getItemAsync(STREAK_KEY);
    const today = getTodayString();
    const yesterday = getYesterdayString();

    if (!raw) {
      const { badge, multiplier } = computeBadgeAndMultiplier(1);
      return {
        streakDays: 1,
        lastDate: null,
        totalVibes: 0,
        badge,
        multiplier,
        todayLogged: false,
      };
    }

    const data = JSON.parse(raw);
    const lastDate = data.lastDate || null;
    let streakDays = data.streakDays || 1;
    const totalVibes = data.totalVibes || 0;

    let todayLogged = false;

    if (lastDate === today) {
      todayLogged = true;
    } else if (lastDate === yesterday) {
      // Streak is active from yesterday, waiting for today's submission
      todayLogged = false;
    } else if (lastDate !== null) {
      // Missed more than 1 day -> streak reset to 1
      streakDays = 1;
      todayLogged = false;
    }

    const { badge, multiplier } = computeBadgeAndMultiplier(streakDays);

    return {
      streakDays,
      lastDate,
      totalVibes,
      badge,
      multiplier,
      todayLogged,
    };
  } catch (err) {
    console.warn('[Streak] Read error:', err);
    return {
      streakDays: 1,
      lastDate: null,
      totalVibes: 0,
      badge: 'Novice Oracle ⚡',
      multiplier: 1.0,
      todayLogged: false,
    };
  }
}

/**
 * Records a successful vibe submission, updating the streak and granting bonus XP
 */
export async function recordDailyVibeSubmission(): Promise<{ streak: StreakInfo; bonusXp: number }> {
  try {
    const current = await getDailyStreak();
    const today = getTodayString();
    const yesterday = getYesterdayString();

    let newStreak = current.streakDays;

    if (current.lastDate === today) {
      // Already logged today; keep streak count, increment total vibes
      newStreak = current.streakDays;
    } else if (current.lastDate === yesterday) {
      // Consecutive day! Increment streak
      newStreak = current.streakDays + 1;
    } else {
      // First day or restart
      newStreak = 1;
    }

    const newTotalVibes = current.totalVibes + 1;
    const { badge, multiplier } = computeBadgeAndMultiplier(newStreak);

    const updatedData: StreakInfo = {
      streakDays: newStreak,
      lastDate: today,
      totalVibes: newTotalVibes,
      badge,
      multiplier,
      todayLogged: true,
    };

    await SecureStore.setItemAsync(STREAK_KEY, JSON.stringify(updatedData));

    const baseReward = 250;
    const bonusXp = Math.round(baseReward * multiplier);

    return { streak: updatedData, bonusXp };
  } catch (err) {
    console.warn('[Streak] Update error:', err);
    return {
      streak: {
        streakDays: 1,
        lastDate: getTodayString(),
        totalVibes: 1,
        badge: 'Novice Oracle ⚡',
        multiplier: 1.0,
        todayLogged: true,
      },
      bonusXp: 250,
    };
  }
}

