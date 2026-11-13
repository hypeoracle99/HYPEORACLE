import { Vibration, Platform } from 'react-native';

/**
 * Cyber-Haptic Feedback Engine for HypeOracle DePIN Mobile
 * Provides tactile sensory feedback for physical & vocal interactions.
 */
export const haptics = {
  /** Light 15ms pulse for buttons, tabs, and chips */
  tap: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(18);
    }
  },

  /** 35ms pulse when sensory recording starts */
  recordStart: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(40);
    }
  },

  /** Micro-tick (12ms) on audio amplitude or accelerometer spikes */
  vibePulse: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(14);
    }
  },

  /** Rhythmic dual-fanfare when score is calibrated and XP is credited */
  success: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 45, 70, 80]);
    }
  },

  /** Double-warning buzz on blocked action or error */
  error: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 60, 50, 70]);
    }
  },
};

