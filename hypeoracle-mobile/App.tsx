import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  ScrollView,
} from 'react-native';
import bs58 from 'bs58';
import { getOrCreateDePINKeypair, importPrivateWalletKey, clearStoredDePINKeypair, DePINIdentity } from './src/lib/secure-store';
import { generateEphemeralKeyPair, buildConnectUrl, decryptPhantomResponse } from './src/lib/phantom';
import { RecordScreen } from './src/screens/RecordScreen';
import { MarketScreen } from './src/screens/MarketScreen';
import { PredictScreen } from './src/screens/PredictScreen';
import { CommunityScreen } from './src/screens/CommunityScreen';
import { SoulprintScreen } from './src/screens/SoulprintScreen';
import { OracleFeedScreen } from './src/screens/OracleFeedScreen';
import { WalletHub } from './src/screens/WalletHub';
import { StakeScreen } from './src/screens/StakeScreen';
import { AgentScreen } from './src/screens/AgentScreen';
import { EarningsScreen } from './src/screens/EarningsScreen';
import {
  Mic,
  TrendingUp,
  Award,
  Settings,
  Key,
  ShieldCheck,
  X,
  Copy,
  RotateCcw,
  Smartphone,
  CheckCircle,
  Eye,
  EyeOff,
  Cpu,
  Wallet,
  BrainCircuit,
  Coins,
  Users,
  Sparkles,
  Trophy,
} from 'lucide-react-native';

export default function App() {
  const [activeTab, setActiveTab] = useState<'record' | 'market' | 'predict' | 'community' | 'hub'>('record');
  const [identity, setIdentity] = useState<DePINIdentity | null>(null);
  const [loadingIdentity, setLoadingIdentity] = useState(true);
  
  // Settings / Key Import modal
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importedKey, setImportedKey] = useState('');
  const [importing, setImporting] = useState(false);

  // Expanded custom Phantom and settings state
  const [ephemeralKeypair, setEphemeralKeypair] = useState<{ publicKey: string; secretKey: string } | null>(null);
  const [showBackup, setShowBackup] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [activeImportTab, setActiveImportTab] = useState<'phantom' | 'privateKey'>('phantom');
  const [hubTab, setHubTab] = useState<'wallet' | 'staking' | 'agent' | 'soulprint' | 'earnings' | 'identity'>('wallet');

  const loadIdentity = async () => {
    setLoadingIdentity(true);
    try {
      const depinId = await getOrCreateDePINKeypair();
      setIdentity(depinId);
    } catch (err) {
      console.error('[App] Failed to load DePIN staker identity:', err);
    } finally {
      setLoadingIdentity(false);
    }
  };

  const getQueryParam = (url: string, param: string): string | null => {
    const regex = new RegExp(`[?&]${param}=([^&#]*)`);
    const results = regex.exec(url);
    return results ? decodeURIComponent(results[1]) : null;
  };

  const handlePhantomConnectCallback = async (urlStr: string) => {
    try {
      console.log('[Phantom] handlePhantomConnectCallback invoked with URL:', urlStr);
      console.log('[Phantom] Current ephemeralKeypair state:', ephemeralKeypair);
      if (!ephemeralKeypair) {
        console.error('[Phantom] No active ephemeral keypair found to decrypt incoming response.');
        return;
      }

      const data = getQueryParam(urlStr, 'data');
      const nonce = getQueryParam(urlStr, 'nonce');
      const phantomPubkey = getQueryParam(urlStr, 'phantom_encryption_public_key');
      const errorCode = getQueryParam(urlStr, 'errorCode');
      const errorMessage = getQueryParam(urlStr, 'errorMessage');

      if (errorCode) {
        Alert.alert('Phantom Connection Refused', errorMessage || 'User cancelled connection.');
        return;
      }

      if (!data || !nonce || !phantomPubkey) {
        return; // Unrelated deep link
      }

      const decrypted = decryptPhantomResponse(
        data,
        nonce,
        phantomPubkey,
        ephemeralKeypair.secretKey
      );

      const phantomIdentity = {
        publicKey: decrypted.public_key,
        secretKey: '', // External wallet doesn't expose private keys
        rawPublicKey: bs58.decode(decrypted.public_key),
        rawSecretKey: new Uint8Array(0),
        isExternal: true,
      };

      setIdentity(phantomIdentity as any);
      Alert.alert(
        'Phantom Connected',
        `Linked securely to staker address:\n${decrypted.public_key.slice(0, 8)}...${decrypted.public_key.slice(-8)}`
      );
      setSettingsOpen(false);
    } catch (err: any) {
      console.error('[Phantom] Connection processing failed:', err);
      Alert.alert('Connection Failed', err.message || 'Decryption validation failed.');
    }
  };

  const handleConnectPhantom = async () => {
    try {
      console.log('[Phantom] Generating ephemeral keypair...');
      const keys = generateEphemeralKeyPair();
      setEphemeralKeypair(keys);
      
      const connectUrl = buildConnectUrl(keys.publicKey);
      console.log('[Phantom] Built deep link URL:', connectUrl);
      console.log('[Phantom] Opening URL via Linking...');
      await Linking.openURL(connectUrl);
      console.log('[Phantom] Linking.openURL completed successfully.');
    } catch (err: any) {
      console.error('[Phantom] Failed to open URL:', err);
      Alert.alert(
        'Phantom Wallet Launcher Error',
        'Could not redirect to Phantom Wallet. Ensure it is installed on this device.\n\nRedirect link: https://phantom.app/download'
      );
    }
  };

  const handleResetLocalIdentity = async () => {
    Alert.alert(
      'Reset Local Node Identity?',
      'This will discard your current identity and generate a fresh secure keypair in your local keychain. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Generate New Key', 
          onPress: async () => {
            setLoadingIdentity(true);
            try {
              await clearStoredDePINKeypair();
              await loadIdentity();
              Alert.alert('Identity Reset', 'A new node public key has been successfully provisioned.');
            } catch (err: any) {
              Alert.alert('Reset Failed', err.message || 'Storage error.');
            } finally {
              setLoadingIdentity(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadIdentity();
  }, []);

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      console.log('[App] Incoming deep link:', event.url);
      if (event.url.includes('/phantomConnect')) {
        handlePhantomConnectCallback(event.url);
      }
    };

    const sub = Linking.addEventListener('url', handleUrl);
    
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl({ url });
      }
    });

    return () => {
      sub.remove();
    };
  }, [ephemeralKeypair]);

  const handleImportKey = async () => {
    if (!importedKey.trim()) return;
    setImporting(true);
    try {
      const imported = await importPrivateWalletKey(importedKey.trim());
      setIdentity(imported);
      Alert.alert('Identity Provisioned', 'Your Solana staker keypair has been secure-cached in Keychain.');
      setImportedKey('');
      setSettingsOpen(false);
    } catch (err: any) {
      Alert.alert('Import Failed', err.message || 'Check your private key formatting (base58 raw secret key expected).');
    } finally {
      setImporting(false);
    }
  };

  // Callback to trigger profile reload on vibe submissions
  const handleVibeSubmitted = () => {
    console.log('[App] Sensory Vibe sync complete.');
  };


  return (
    <View style={styles.safeBg}>
      <StatusBar barStyle="light-content" backgroundColor="#050507" />
      
      {/* Header bar with In-App Wallet Prominence */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.headerTitle}>HYPEORACLE</Text>
          <Text style={styles.headerSub}>DEPIN SENSOR CLIENT</Text>
        </View>

        {/* Prominent In-App Wallet Quick Pill */}
        <View style={styles.headerRightActions}>
          <TouchableOpacity 
            style={styles.walletHeaderPill}
            onPress={() => {
              setHubTab('wallet');
              setActiveTab('hub');
            }}
            activeOpacity={0.8}
          >
            <Wallet size={14} color="#FF6B1A" />
            <Text style={styles.walletHeaderText}>
              {identity?.publicKey 
                ? `${identity.publicKey.slice(0, 4)}...${identity.publicKey.slice(-4)}`
                : 'WALLET'}
            </Text>
            <View style={styles.walletOnlineDot} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingsBtn}
            onPress={() => setSettingsOpen(true)}
            activeOpacity={0.8}
          >
            <Settings size={18} color="#rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Screen views container */}
      <View style={styles.contentView}>
        {loadingIdentity ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FF6B1A" />
            <Text style={styles.loadingText}>Unlocking Secure Keychain...</Text>
          </View>
        ) : activeTab === 'record' ? (
          <RecordScreen identity={identity} onVibeSubmitted={handleVibeSubmitted} />
        ) : activeTab === 'market' ? (
          <MarketScreen identity={identity} />
        ) : activeTab === 'predict' ? (
          <PredictScreen identity={identity} />
        ) : activeTab === 'community' ? (
          <CommunityScreen identity={identity} />
        ) : (
          /* Hub Embedded Screen */
          <View style={{ flex: 1, backgroundColor: '#050507' }}>
            <View style={styles.hubTabBar}>
              {[
                { id: 'wallet', label: 'WALLET', icon: Wallet },
                { id: 'staking', label: 'STAKE', icon: Coins },
                { id: 'agent', label: 'AGENT', icon: BrainCircuit },
                { id: 'soulprint', label: 'SOULPRINT', icon: Award },
                { id: 'earnings', label: 'EARN', icon: Trophy },
                { id: 'identity', label: 'KEYS', icon: Key },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = hubTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.hubTabItem, active && styles.hubTabItemActive]}
                    onPress={() => {
                      setHubTab(tab.id as any);
                      setShowBackup(false);
                    }}
                  >
                    <Icon size={15} color={active ? '#FF6B1A' : 'rgba(255,255,255,0.4)'} />
                    <Text style={[styles.hubTabLabel, active && styles.hubTabLabelActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.hubContent}>
              {hubTab === 'wallet' ? (
                <WalletHub identity={identity} />
              ) : hubTab === 'staking' ? (
                <StakeScreen identity={identity} />
              ) : hubTab === 'agent' ? (
                <AgentScreen identity={identity} />
              ) : hubTab === 'soulprint' ? (
                <SoulprintScreen identity={identity} />
              ) : hubTab === 'earnings' ? (
                <EarningsScreen identity={identity} />
              ) : (
                <ScrollView style={styles.setupScrollContainer} contentContainerStyle={styles.setupScrollContent}>
                  {identity && (
                    <View style={styles.activeKeyBox}>
                      <View style={styles.keyHeader}>
                        <ShieldCheck size={14} color="#10b981" />
                        <Text style={styles.keyHeaderText}>
                          {identity.isExternal ? 'PHANTOM WALLET ACTIVE ID' : 'SECURE KEYCHAIN ACTIVE ID'}
                        </Text>
                      </View>
                      <Text style={styles.keyString}>{identity.publicKey}</Text>

                      {!identity.isExternal && identity.secretKey ? (
                        <View style={styles.backupContainer}>
                          <TouchableOpacity
                            style={styles.backupHeaderBtn}
                            onPress={() => setShowBackup(!showBackup)}
                          >
                            <Key size={12} color="rgba(255,255,255,0.5)" />
                            <Text style={styles.backupHeaderText}>
                              {showBackup ? 'Hide Local Private Key Backup' : 'Show Local Private Key Backup'}
                            </Text>
                          </TouchableOpacity>
                          
                          {showBackup && (
                            <View style={styles.backupContent}>
                              <Text style={styles.privateKeyText} numberOfLines={2} selectable={true}>
                                {showPrivateKey ? identity.secretKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                              </Text>
                              <View style={styles.backupActionRow}>
                                <TouchableOpacity
                                  style={styles.backupActionBtn}
                                  onPress={() => setShowPrivateKey(!showPrivateKey)}
                                >
                                  {showPrivateKey ? <EyeOff size={14} color="#fff" /> : <Eye size={14} color="#fff" />}
                                  <Text style={styles.backupActionText}>{showPrivateKey ? 'Mask' : 'Reveal'}</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                  style={styles.backupActionBtn}
                                  onPress={() => {
                                    try {
                                      const Clipboard = require('expo-clipboard');
                                      Clipboard.setStringAsync(identity.secretKey);
                                      Alert.alert('Copied', 'Private key copied to clipboard.');
                                    } catch (err) {
                                      console.error('[Backup] Copy failed:', err);
                                    }
                                  }}
                                >
                                  <Copy size={14} color="#fff" />
                                  <Text style={styles.backupActionText}>Copy</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* Wallet Connection / Key Importer Tabs */}
                  <View style={styles.modalTabContainer}>
                    <TouchableOpacity
                      style={[styles.modalTab, activeImportTab === 'phantom' && styles.modalTabActive]}
                      onPress={() => setActiveImportTab('phantom')}
                    >
                      <Smartphone size={14} color={activeImportTab === 'phantom' ? '#FF6B1A' : 'rgba(255,255,255,0.4)'} />
                      <Text style={[styles.modalTabLabel, activeImportTab === 'phantom' && styles.modalTabLabelActive]}>
                        PHANTOM
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalTab, activeImportTab === 'privateKey' && styles.modalTabActive]}
                      onPress={() => setActiveImportTab('privateKey')}
                    >
                      <Key size={14} color={activeImportTab === 'privateKey' ? '#FF6B1A' : 'rgba(255,255,255,0.4)'} />
                      <Text style={[styles.modalTabLabel, activeImportTab === 'privateKey' && styles.modalTabLabelActive]}>
                        BASE58 KEY
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {activeImportTab === 'phantom' ? (
                    <View style={styles.phantomConnectContainer}>
                      <Text style={styles.importerSub}>
                        Connect your Phantom mobile app directly to sign on-chain transactions and link your verified Solana address.
                      </Text>
                      <TouchableOpacity
                        style={styles.phantomBtn}
                        onPress={handleConnectPhantom}
                      >
                        <Smartphone size={16} color="#050507" />
                        <Text style={styles.phantomBtnText}>CONNECT PHANTOM APP</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.importerBox}>
                      <TextInput
                        style={styles.keyInput}
                        placeholder="Paste base58 private key..."
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={importedKey}
                        onChangeText={setImportedKey}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.importBtn}
                        onPress={handleImportKey}
                        disabled={importing}
                      >
                        {importing ? (
                          <ActivityIndicator size="small" color="#050507" />
                        ) : (
                          <Text style={styles.importBtnText}>IMPORT KEYPAIR</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.resetContainer}>
                    <TouchableOpacity
                      style={styles.resetBtn}
                      onPress={handleResetLocalIdentity}
                    >
                      <RotateCcw size={12} color="rgba(255,255,255,0.4)" />
                      <Text style={styles.resetBtnText}>GENERATE FRESH LOCAL IDENTITY</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Cyberpunk custom Bottom Tab Navigation in Thumb Zone (5 Core Tabs) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'record' && styles.activeTabItem]}
          onPress={() => setActiveTab('record')}
        >
          <Mic size={20} color={activeTab === 'record' ? '#FF6B1A' : 'rgba(255,255,255,0.3)'} />
          <Text style={[styles.tabLabel, activeTab === 'record' && styles.activeTabLabel]}>
            RECORD
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'market' && styles.activeTabItem]}
          onPress={() => setActiveTab('market')}
        >
          <TrendingUp size={20} color={activeTab === 'market' ? '#FF6B1A' : 'rgba(255,255,255,0.3)'} />
          <Text style={[styles.tabLabel, activeTab === 'market' && styles.activeTabLabel]}>
            MARKET
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'predict' && styles.activeTabItem]}
          onPress={() => setActiveTab('predict')}
        >
          <Sparkles size={20} color={activeTab === 'predict' ? '#FF6B1A' : 'rgba(255,255,255,0.3)'} />
          <Text style={[styles.tabLabel, activeTab === 'predict' && styles.activeTabLabel]}>
            PREDICT
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'community' && styles.activeTabItem]}
          onPress={() => setActiveTab('community')}
        >
          <Users size={20} color={activeTab === 'community' ? '#FF6B1A' : 'rgba(255,255,255,0.3)'} />
          <Text style={[styles.tabLabel, activeTab === 'community' && styles.activeTabLabel]}>
            COMMUNITY
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'hub' && styles.activeTabItem]}
          onPress={() => setActiveTab('hub')}
        >
          <Wallet size={20} color={activeTab === 'hub' ? '#FF6B1A' : 'rgba(255,255,255,0.3)'} />
          <Text style={[styles.tabLabel, activeTab === 'hub' && styles.activeTabLabel]}>
            HUB
          </Text>
        </TouchableOpacity>
      </View>

      {/* Settings / Setup Modal */}
      {settingsOpen && (
        <View style={styles.hubModalContainer}>
          <View style={styles.hubHeader}>
            <TouchableOpacity onPress={() => setSettingsOpen(false)}>
              <X size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.hubHeaderTitle}>SETTINGS & KEYS</Text>
            <View style={{ width: 22 }} />
          </View>
          <ScrollView style={styles.setupScrollContainer} contentContainerStyle={styles.setupScrollContent}>
            {identity && (
              <View style={styles.activeKeyBox}>
                <View style={styles.keyHeader}>
                  <ShieldCheck size={14} color="#10b981" />
                  <Text style={styles.keyHeaderText}>
                    {identity.isExternal ? 'PHANTOM WALLET ACTIVE ID' : 'SECURE KEYCHAIN ACTIVE ID'}
                  </Text>
                </View>
                <Text style={styles.keyString}>{identity.publicKey}</Text>
              </View>
            )}
            <View style={styles.resetContainer}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleResetLocalIdentity}
              >
                <RotateCcw size={12} color="rgba(255,255,255,0.4)" />
                <Text style={styles.resetBtnText}>GENERATE FRESH LOCAL IDENTITY</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeBg: {
    flex: 1,
    backgroundColor: '#050507',
    paddingTop: StatusBar.currentHeight || 30,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#0a0a0f',
  },
  titleGroup: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,107,26,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.3)',
    borderRadius: 20,
    paddingHorizontal: 10,
    height: 36,
  },
  walletHeaderText: {
    color: '#FF6B1A',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
  },
  walletOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  headerTitle: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B1A',
    letterSpacing: 2,
  },
  headerSub: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  settingsBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,107,26,0.05)',
  },
  contentView: {
    flex: 1,
    backgroundColor: '#050507',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
    fontSize: 12,
  },
  tabBar: {
    height: 88,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#0a0a0f',
    paddingBottom: 24,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  activeTabItem: {
    borderTopWidth: 2,
    borderTopColor: '#FF6B1A',
  },
  tabLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
  },
  activeTabLabel: {
    color: '#fff',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.2)',
    borderRadius: 24,
    padding: 24,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    fontFamily: 'monospace',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF6B1A',
    letterSpacing: 1.5,
  },
  activeKeyBox: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 20,
  },
  keyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  keyHeaderText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#10b981',
    letterSpacing: 1,
  },
  keyString: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 15,
  },
  backupContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 10,
  },
  backupHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backupHeaderText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
  backupContent: {
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  privateKeyText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 13,
    marginBottom: 10,
  },
  backupActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  backupActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  backupActionText: {
    fontSize: 10,
    color: '#fff',
    fontFamily: 'monospace',
  },
  modalTabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  modalTab: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalTabActive: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.15)',
  },
  modalTabLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },
  modalTabLabelActive: {
    color: '#FF6B1A',
  },
  phantomConnectContainer: {
    paddingVertical: 10,
  },
  phantomBtn: {
    backgroundColor: '#FF6B1A',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  phantomBtnText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#050507',
    letterSpacing: 1.5,
  },
  importerBox: {
    marginTop: 0,
  },
  importerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  importerTitleText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF6B1A',
    letterSpacing: 1.5,
  },
  importerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
    marginBottom: 16,
  },
  keyInput: {
    backgroundColor: '#050507',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#fff',
    height: 48, // Minimum touch targets compliance
    paddingHorizontal: 16,
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: 20,
  },
  importBtn: {
    backgroundColor: '#FF6B1A',
    height: 48, // Touch target compliance
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importBtnText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#050507',
    letterSpacing: 1.5,
  },
  resetContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 16,
    alignItems: 'center',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resetBtnText: {
    fontFamily: 'monospace',
    fontSize: 8.5,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },
  hubModalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#050507',
    zIndex: 1000,
    elevation: 20,
  },
  hubHeader: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#0a0a0f',
  },
  hubHeaderTitle: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B1A',
    letterSpacing: 2,
  },
  hubTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#0d0d14',
  },
  hubTabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  hubTabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B1A',
  },
  hubTabLabel: {
    fontFamily: 'monospace',
    fontSize: 8,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
  hubTabLabelActive: {
    color: '#FF6B1A',
  },
  hubContent: {
    flex: 1,
    backgroundColor: '#050507',
  },
  setupScrollContainer: {
    flex: 1,
  },
  setupScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
});
