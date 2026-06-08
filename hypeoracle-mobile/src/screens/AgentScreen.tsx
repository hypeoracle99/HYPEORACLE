import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { client } from '../lib/insforge';
import { DePINIdentity } from '../lib/secure-store';
import { BrainCircuit, Activity, Target, ShieldAlert, Sparkles, Lock, Unlock, Eye, EyeOff } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface AgentScreenProps {
  identity: DePINIdentity | null;
}

export function AgentScreen({ identity }: AgentScreenProps) {
  const [profile, setProfile] = useState<any>(null);
  const [stakedHype, setStakedHype] = useState(0);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchProfileAndStaking = useCallback(async () => {
    if (!identity) {
      setLoading(false);
      return;
    }
    try {
      const [profileRes, stakingRes] = await Promise.all([
        client.database
          .from('user_vibe_profiles')
          .select('*')
          .eq('user_pubkey', identity.publicKey)
          .maybeSingle(),
        client.database
          .from('user_staking')
          .select('staked_amount')
          .eq('user_pubkey', identity.publicKey)
          .maybeSingle()
      ]);

      setProfile(profileRes.data || null);
      setStakedHype(stakingRes.data?.staked_amount || 0);
    } catch (err) {
      console.error('[AgentScreen] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [identity]);

  useEffect(() => {
    fetchProfileAndStaking();
  }, [fetchProfileAndStaking]);

  const handleUpdateSetting = async (field: string, value: any) => {
    if (!identity || !profile) return;
    setUpdating(true);
    try {
      const updatedProfile = { ...profile, [field]: value };
      const { error } = await client.database
        .from('user_vibe_profiles')
        .update({ [field]: value })
        .eq('user_pubkey', identity.publicKey);

      if (error) throw error;
      setProfile(updatedProfile);
    } catch (err: any) {
      console.error(`[AgentScreen] Failed to save ${field}:`, err);
      Alert.alert('Save Failed', err.message || 'Database connection error.');
    } finally {
      setUpdating(false);
    }
  };

  const handleTrainAgent = async () => {
    if (!identity) return;
    setTraining(true);
    try {
      const res = await fetch('https://9s8ct2b5.functions.insforge.app/train-personal-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_pubkey: identity.publicKey })
      });
      const result = await res.json();
      if (result.success) {
        Alert.alert('Agent Calibrated!', 'AI brain updated successfully with your recent vibe history.');
        fetchProfileAndStaking();
      } else {
        Alert.alert('Calibration Denied', result.error || 'Check your vibe history count.');
      }
    } catch (err: any) {
      Alert.alert('Training Failed', err.message || 'Groq model integration offline.');
    } finally {
      setTraining(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B1A" />
        <Text style={styles.loadingText}>SYNTHESIZING COGNITIVE PROFILE...</Text>
      </View>
    );
  }

  const autonomyUnlocked = stakedHype >= 50000;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {!profile ? (
        <View style={styles.emptyCard}>
          <BrainCircuit size={48} color="rgba(255,255,255,0.15)" />
          <Text style={styles.emptyTitle}>UNINITIALIZED SOULPRINT</Text>
          <Text style={styles.emptyDesc}>
            Your on-chain emotional frequency has not been synced yet. Record your first vibe and train your agent to unlock your profile.
          </Text>
          <TouchableOpacity
            style={styles.trainButton}
            onPress={handleTrainAgent}
            disabled={training}
          >
            {training ? (
              <ActivityIndicator size="small" color="#050507" />
            ) : (
              <Text style={styles.trainBtnText}>CALIBRATE AGENT</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Agent Identity Card */}
          <View style={styles.agentCard}>
            <View style={styles.agentHeader}>
              <View style={styles.avatarCircle}>
                <BrainCircuit size={28} color="#FF6B1A" />
              </View>
              <View>
                <Text style={styles.agentName}>{profile.agent_name.toUpperCase()}</Text>
                <Text style={styles.agentStyle}>STYLE: {profile.trading_style.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.agentSummary}>{profile.personality_summary}</Text>
          </View>

          {/* Cognitive Indicators */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>COGNITIVE BEHAVIORAL INDICES</Text>
            
            <View style={styles.indexItem}>
               <View style={styles.indexInfo}>
                  <Text style={styles.indexLabel}>PANIC INDEX</Text>
                  <Text style={[styles.indexVal, { color: '#ef4444' }]}>{profile.panic_index}%</Text>
               </View>
               <View style={styles.progressBg}>
                  <View style={[styles.progressBar, { width: `${profile.panic_index}%`, backgroundColor: '#ef4444' }]} />
               </View>
            </View>

            <View style={styles.indexItem}>
               <View style={styles.indexInfo}>
                  <Text style={styles.indexLabel}>FOMO INDEX</Text>
                  <Text style={[styles.indexVal, { color: '#fbbf24' }]}>{profile.fomo_index}%</Text>
               </View>
               <View style={styles.progressBg}>
                  <View style={[styles.progressBar, { width: `${profile.fomo_index}%`, backgroundColor: '#fbbf24' }]} />
               </View>
            </View>

            <View style={styles.indexItem}>
               <View style={styles.indexInfo}>
                  <Text style={styles.indexLabel}>CONVICTION INDEX</Text>
                  <Text style={[styles.indexVal, { color: '#10b981' }]}>{profile.conviction_index}%</Text>
               </View>
               <View style={styles.progressBg}>
                  <View style={[styles.progressBar, { width: `${profile.conviction_index}%`, backgroundColor: '#10b981' }]} />
               </View>
            </View>
          </View>

          {/* Autonomy Controls */}
          <View style={styles.panel}>
            <View style={styles.rowBetween}>
              <Text style={styles.panelTitle}>AUTONOMOUS EXECUTION</Text>
              {autonomyUnlocked ? (
                <Unlock size={14} color="#10b981" />
              ) : (
                <Lock size={14} color="#FF6B1A" />
              )}
            </View>
            <Text style={styles.panelDesc}>
              Allows the Oracle to trade SOL for high sentiment vibes natively on Bags.fm. Requires 50,000 $HYPE staked.
            </Text>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>
                CURRENT MODE:{' '}
                <Text style={{ color: (profile.approval_mode === 'autonomous') ? '#10b981' : '#fbbf24' }}>
                  {(profile.approval_mode === 'autonomous') ? 'AUTONOMOUS' : 'SUPERVISED'}
                </Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.switchBg,
                  (profile.approval_mode === 'autonomous') && styles.switchBgActive,
                  !autonomyUnlocked && styles.switchDisabled
                ]}
                onPress={() => {
                  if (!autonomyUnlocked) {
                    Alert.alert(
                      'Feature Locked',
                      `Autonomous trading requires 50,000 $HYPE staked. Current staker weight: ${stakedHype.toLocaleString()} HYPE.`
                    );
                    return;
                  }
                  const next = profile.approval_mode === 'autonomous' ? 'supervised' : 'autonomous';
                  handleUpdateSetting('approval_mode', next);
                }}
              >
                <View style={[styles.switchKnob, (profile.approval_mode === 'autonomous') && styles.switchKnobActive]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Max Sizing Guardrail */}
          <View style={styles.panel}>
            <View style={styles.rowBetween}>
              <Text style={styles.panelTitle}>MAX POSITION SIZING</Text>
              <Text style={styles.sliderVal}>{(Number(profile.max_position_size) || 0.01).toFixed(3)} SOL</Text>
            </View>
            <Text style={styles.panelDesc}>
              Caps the maximum swap transaction size executed by your Agent per vibe block.
            </Text>

            <Slider
              style={styles.slider}
              minimumValue={0.001}
              maximumValue={0.05}
              step={0.001}
              value={Number(profile.max_position_size) || 0.01}
              minimumTrackTintColor="#FF6B1A"
              maximumTrackTintColor="rgba(255,255,255,0.05)"
              thumbTintColor="#FF6B1A"
              onSlidingComplete={(val: number) => handleUpdateSetting('max_position_size', val)}
            />
          </View>

          {/* Style & Dampening Toggles */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>TRADING STYLE GUARDRAILS</Text>
            <Text style={styles.panelDesc}>Adjusts emotional filters and trade trigger parameters.</Text>
            
            <View style={styles.gridBtnRow}>
              {[
                { val: 'degen', label: 'DEGEN', desc: 'Max Conviction' },
                { val: 'hybrid', label: 'HYBRID', desc: 'Default Balance' },
                { val: 'safe', label: 'SAFE', desc: 'Panic Filter' }
              ].map((styleOpt) => (
                <TouchableOpacity
                  key={styleOpt.val}
                  style={[
                    styles.gridBtn,
                    profile.trading_guardrails === styleOpt.val && styles.gridBtnActive
                  ]}
                  onPress={() => handleUpdateSetting('trading_guardrails', styleOpt.val)}
                >
                  <Text style={[styles.gridBtnText, profile.trading_guardrails === styleOpt.val && styles.gridBtnTextActive]}>
                    {styleOpt.label}
                  </Text>
                  <Text style={styles.gridBtnDesc}>{styleOpt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Deep Insights */}
          {Array.isArray(profile.favorite_tokens) && profile.favorite_tokens.length > 0 && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>DEEP SOULPRINT INSIGHTS</Text>
              <View style={styles.insightsList}>
                {profile.favorite_tokens.map((insight: string, idx: number) => (
                  <View key={idx} style={styles.insightItem}>
                    <Sparkles size={12} color="#fbbf24" style={{ marginTop: 2 }} />
                    <Text style={styles.insightText}>{insight}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Retrain Controls */}
          <TouchableOpacity
            style={styles.retrainButton}
            onPress={handleTrainAgent}
            disabled={training}
          >
            {training ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.retrainBtnText}>RE-CALIBRATE AI AGENT</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050507',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
    fontSize: 10,
    letterSpacing: 1,
  },
  emptyCard: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.15)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B1A',
    letterSpacing: 1.5,
    marginVertical: 12,
  },
  emptyDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  trainButton: {
    backgroundColor: '#FF6B1A',
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainBtnText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#050507',
    letterSpacing: 1,
  },
  agentCard: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,107,26,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  agentStyle: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  agentSummary: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  panel: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  panelTitle: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: 12,
  },
  panelDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 15,
    marginBottom: 12,
  },
  indexItem: {
    marginBottom: 12,
  },
  indexInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  indexLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
  },
  indexVal: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  toggleText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  switchBg: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    padding: 2,
  },
  switchBgActive: {
    backgroundColor: '#10b981',
  },
  switchDisabled: {
    opacity: 0.3,
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  switchKnobActive: {
    alignSelf: 'flex-end',
  },
  sliderVal: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FF6B1A',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  gridBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gridBtn: {
    flex: 1,
    backgroundColor: '#050507',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  gridBtnActive: {
    backgroundColor: 'rgba(255,107,26,0.05)',
    borderColor: 'rgba(255,107,26,0.3)',
  },
  gridBtnText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.3)',
  },
  gridBtnTextActive: {
    color: '#FF6B1A',
  },
  gridBtnDesc: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  insightsList: {
    gap: 8,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 10,
    padding: 8,
  },
  insightText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
    lineHeight: 15,
  },
  retrainButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.3)',
    backgroundColor: 'rgba(255,107,26,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  retrainBtnText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF6B1A',
    letterSpacing: 1,
  },
});
