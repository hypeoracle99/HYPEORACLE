import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Clipboard,
  RefreshControl,
} from 'react-native';
import { Connection, PublicKey, Transaction, Keypair, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { Buffer } from 'buffer';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
  Lock,
  Coins,
  ChevronDown,
} from 'lucide-react-native';
import { DePINIdentity } from '../lib/secure-store';

// Set global Buffer polyfill using globalThis
if (typeof (globalThis as any).Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer;
}

const { width } = Dimensions.get('window');
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

const KNOWN_TOKENS: Record<string, { symbol: string; name: string; decimals: number }> = {
  'So11111111111111111111111111111111111111112': { symbol: 'wSOL', name: 'Wrapped SOL', decimals: 9 },
  '5k87WMWqpzPEWFqrUoAbriD2Xr4fNZx4288NtFZSBAGS': { symbol: 'HYPE', name: 'HypeOracle', decimals: 9 },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  'DezXAZ8z7PnrFcPykJzi56854ec165hah36E1erZyNMX': { symbol: 'BONK', name: 'Bonk', decimals: 5 },
};

interface WalletHubProps {
  identity: DePINIdentity | null;
}

interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  pubkey?: string; // Token account address
}

export function WalletHub({ identity }: WalletHubProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [currentTab, setCurrentTab] = useState<'balance' | 'send' | 'receive' | 'backup'>('balance');

  // Send Form States
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null);
  const [sending, setSending] = useState(false);
  const [showTokenSelector, setShowTokenSelector] = useState(false);

  // Backup key reveal state
  const [revealKey, setRevealKey] = useState(false);

  const fetchBalances = useCallback(async (showLoading = true) => {
    if (!identity) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (showLoading) setLoading(true);

    try {
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');
      const ownerPubKey = new PublicKey(identity.publicKey);

      // 1. Fetch native SOL balance
      const solBalanceLamports = await connection.getBalance(ownerPubKey);
      const solBal: TokenBalance = {
        mint: 'SOL',
        symbol: 'SOL',
        name: 'Solana',
        balance: solBalanceLamports / 1e9,
        decimals: 9,
      };

      // 2. Fetch SPL tokens owned by wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        ownerPubKey,
        { programId: new PublicKey(TOKEN_PROGRAM_ID) }
      );

      const splBalances: TokenBalance[] = tokenAccounts.value.map((ta) => {
        const info = ta.account.data.parsed.info;
        const mint = info.mint;
        const uiAmount = info.tokenAmount.uiAmount || 0;
        const decimals = info.tokenAmount.decimals;

        const metadata = KNOWN_TOKENS[mint] || {
          symbol: mint.slice(0, 4).toUpperCase() + '...' + mint.slice(-4).toUpperCase(),
          name: 'Unknown SPL Token',
          decimals: decimals,
        };

        return {
          mint,
          symbol: metadata.symbol,
          name: metadata.name,
          balance: uiAmount,
          decimals: decimals,
          pubkey: ta.pubkey.toBase58(),
        };
      });

      const allBalances = [solBal, ...splBalances].filter(b => b.balance > 0 || b.symbol === 'SOL' || b.symbol === 'HYPE');
      setBalances(allBalances);

      // Default selected token for Send form
      if (allBalances.length > 0) {
        setSelectedToken(allBalances[0]);
      }
    } catch (err) {
      console.error('[WalletHub] Failed to fetch balances:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [identity]);

  useEffect(() => {
    fetchBalances(true);
    const interval = setInterval(() => fetchBalances(false), 20000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBalances(false);
  }, [fetchBalances]);

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', `${label} copied to clipboard.`);
  };

  const handleSend = async () => {
    if (!identity || !recipient || !amount || !selectedToken) return;

    // Validate Address
    try {
      new PublicKey(recipient);
    } catch (err) {
      Alert.alert('Invalid Address', 'Please check the recipient address format.');
      return;
    }

    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid transfer amount.');
      return;
    }

    if (value > selectedToken.balance) {
      Alert.alert('Insufficient Balance', `You only hold ${selectedToken.balance} ${selectedToken.symbol}.`);
      return;
    }

    if (identity.isExternal) {
      Alert.alert('Signing Blocked', 'External wallets must sign transactions via their native apps (Phantom). Built-in Wallet only supports local DePIN key pairs.');
      return;
    }

    setSending(true);
    try {
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');
      const stakerWallet = Keypair.fromSecretKey(identity.rawSecretKey);
      const transaction = new Transaction();

      if (selectedToken.symbol === 'SOL') {
        // SOL Transfer
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: stakerWallet.publicKey,
            toPubkey: new PublicKey(recipient),
            lamports: value * 1e9,
          })
        );
      } else {
        // SPL Token Transfer
        const mintPubKey = new PublicKey(selectedToken.mint);
        const recipientPubKey = new PublicKey(recipient);

        const senderAta = await getAssociatedTokenAddress(mintPubKey, stakerWallet.publicKey);
        const recipientAta = await getAssociatedTokenAddress(mintPubKey, recipientPubKey);

        // Check if recipient ATA exists
        const accountInfo = await connection.getAccountInfo(recipientAta);
        if (!accountInfo) {
          // Add instruction to create associated token account
          transaction.add(
            createAssociatedTokenAccountInstruction(
              stakerWallet.publicKey,
              recipientAta,
              recipientPubKey,
              mintPubKey
            )
          );
        }

        const rawAmount = Math.floor(value * Math.pow(10, selectedToken.decimals));
        transaction.add(
          createTransferInstruction(
            senderAta,
            recipientAta,
            stakerWallet.publicKey,
            rawAmount
          )
        );
      }

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = stakerWallet.publicKey;

      transaction.sign(stakerWallet);
      const signature = await connection.sendRawTransaction(transaction.serialize());

      Alert.alert(
        'Transaction Broadcast!',
        `Successfully broadcast transaction to network.\n\nSignature: ${signature.slice(0, 12)}...`,
        [
          {
            text: 'OK',
            onPress: () => {
              setRecipient('');
              setAmount('');
              setCurrentTab('balance');
              fetchBalances(false);
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('[WalletHub] Send failed:', err);
      Alert.alert('Transfer Failed', err.message || 'On-chain broadcast error. Ensure you hold a small SOL gas buffer.');
    } finally {
      setSending(false);
    }
  };

  if (loading && balances.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B1A" />
        <Text style={styles.loadingText}>CONNECTING TO SOLANA BLOCKCHAIN...</Text>
      </View>
    );
  }

  const solBalance = balances.find((b) => b.symbol === 'SOL')?.balance || 0;

  return (
    <View style={styles.container}>
      {/* Tab Selectors */}
      <View style={styles.tabBar}>
        {[
          { id: 'balance', label: 'ASSETS', icon: Coins },
          { id: 'send', label: 'SEND', icon: ArrowUpRight },
          { id: 'receive', label: 'RECEIVE', icon: ArrowDownLeft },
          { id: 'backup', label: 'BACKUP', icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = currentTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, active && styles.tabItemActive]}
              onPress={() => {
                setCurrentTab(tab.id as any);
                setRevealKey(false);
              }}
            >
              <Icon size={14} color={active ? '#FF6B1A' : 'rgba(255,255,255,0.4)'} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          currentTab === 'balance' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FF6B1A"
              colors={['#FF6B1A']}
            />
          ) : undefined
        }
      >
        {currentTab === 'balance' && (
          <View>
            {/* Total Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Wallet size={16} color="rgba(255,255,255,0.4)" />
                <Text style={styles.balanceTitle}>NODE STAKER KEYPAIR</Text>
              </View>
              <Text style={styles.addressMini} numberOfLines={1}>
                {identity?.publicKey}
              </Text>
              <View style={styles.solValueContainer}>
                <Text style={styles.bigSolVal}>{solBalance.toFixed(4)}</Text>
                <Text style={styles.bigSolUnit}>SOL</Text>
              </View>
              <TouchableOpacity
                style={styles.copyBtnMini}
                onPress={() => copyToClipboard(identity?.publicKey || '', 'Wallet Address')}
              >
                <Copy size={10} color="#FF6B1A" />
                <Text style={styles.copyBtnText}>COPY ADDRESS</Text>
              </TouchableOpacity>
            </View>

            {/* Assets list */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>TOKEN BALANCES</Text>
              <TouchableOpacity onPress={() => fetchBalances(false)}>
                <RefreshCw size={12} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            <View style={styles.assetList}>
              {balances.map((token) => (
                <View key={token.mint} style={styles.assetRow}>
                  <View style={styles.assetLeft}>
                    <View style={styles.tokenIconPlaceholder}>
                      <Text style={styles.tokenIconText}>{token.symbol.slice(0, 2)}</Text>
                    </View>
                    <View>
                      <Text style={styles.assetSymbol}>{token.symbol}</Text>
                      <Text style={styles.assetName}>{token.name}</Text>
                    </View>
                  </View>
                  <View style={styles.assetRight}>
                    <Text style={styles.assetBalance}>
                      {token.balance.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}
                    </Text>
                    <Text style={styles.assetMintMini}>
                      {token.mint === 'SOL'
                        ? 'Native Network'
                        : `${token.mint.slice(0, 5)}...${token.mint.slice(-4)}`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {currentTab === 'send' && (
          <View style={styles.formContainer}>
            <Text style={styles.formHeader}>SEND ON-CHAIN ASSETS</Text>
            <Text style={styles.formDesc}>
              Assets are signed and broadcast directly from this device keychain using your secure private key.
            </Text>

            {/* Asset Selector */}
            <Text style={styles.inputLabel}>SELECT TOKEN</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => setShowTokenSelector(!showTokenSelector)}
            >
              <View style={styles.selectorLeft}>
                <View style={styles.tokenIconPlaceholderMini}>
                  <Text style={styles.tokenIconTextMini}>
                    {selectedToken ? selectedToken.symbol.slice(0, 2) : 'SOL'}
                  </Text>
                </View>
                <Text style={styles.selectorText}>
                  {selectedToken
                    ? `${selectedToken.symbol} (${selectedToken.balance.toLocaleString()} available)`
                    : 'Select token'}
                </Text>
              </View>
              <ChevronDown size={14} color="#FF6B1A" />
            </TouchableOpacity>

            {showTokenSelector && (
              <View style={styles.dropdownContainer}>
                {balances.map((tok) => (
                  <TouchableOpacity
                    key={tok.mint}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedToken(tok);
                      setShowTokenSelector(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{tok.symbol}</Text>
                    <Text style={styles.dropdownItemBal}>
                      {tok.balance.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recipient Input */}
            <Text style={styles.inputLabel}>RECIPIENT SOLANA ADDRESS</Text>
            <TextInput
              style={styles.formInput}
              value={recipient}
              onChangeText={setRecipient}
              placeholder="Paste SOL address (e.g. 5k87W...)"
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Amount Input */}
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>AMOUNT TO SEND</Text>
              {selectedToken && (
                <TouchableOpacity
                  onPress={() => setAmount(selectedToken.balance.toString())}
                >
                  <Text style={styles.maxText}>MAX: {selectedToken.balance}</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.formInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.0"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="numeric"
            />

            {/* Send Action Button */}
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!recipient || !amount || sending) && styles.disabledSendBtn,
              ]}
              onPress={handleSend}
              disabled={!recipient || !amount || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#050507" />
              ) : (
                <View style={styles.sendBtnContent}>
                  <Send size={14} color="#050507" />
                  <Text style={styles.sendBtnText}>BROADCAST TRANSACTION</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ All transactions are final. Ensure target addresses are correct on the Solana network. A dynamic rent fee applies if the recipient has no Associated Token Account.
              </Text>
            </View>
          </View>
        )}

        {currentTab === 'receive' && (
          <View style={styles.receiveContainer}>
            <Text style={styles.formHeader}>RECEIVE SOL & SPL TOKENS</Text>
            <Text style={styles.formDesc}>
              Send any Solana Mainnet assets to the public key address listed below.
            </Text>

            {/* QR Code Container */}
            <View style={styles.qrFrame}>
              <Image
                style={styles.qrCodeImage}
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=050507&data=${identity?.publicKey}`,
                }}
              />
              <Text style={styles.qrFallbackText}>Scan to Deposit SOL/HYPE</Text>
            </View>

            {/* Address Display Box */}
            <View style={styles.addressBox}>
              <Text style={styles.addressBoxLabel}>YOUR DEPOSIT ADDRESS</Text>
              <Text style={styles.addressBoxValue}>{identity?.publicKey}</Text>

              <TouchableOpacity
                style={styles.addressBoxCopyBtn}
                onPress={() => copyToClipboard(identity?.publicKey || '', 'Wallet Address')}
              >
                <Copy size={12} color="#050507" />
                <Text style={styles.addressBoxCopyText}>COPY TO CLIPBOARD</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentTab === 'backup' && (
          <View style={styles.formContainer}>
            <Text style={styles.formHeader}>STAKER KEY BACKUP</Text>
            <Text style={styles.formDesc}>
              HypeOracle Mobile generates a self-custodial key pair. Your secret key is stored in your device's hardware enclave and never uploaded to any server. If you lose this key, your staked positions and earnings cannot be recovered.
            </Text>

            <View style={styles.securityAlertBox}>
              <Text style={styles.securityAlertTitle}>🚨 CRITICAL SECURITY RULES</Text>
              <Text style={styles.securityAlertText}>
                • Never screenshot your private key.{'\n'}
                • Never share it with HypeOracle support or administrators.{'\n'}
                • Write it down on paper and store it in a physical safe.
              </Text>
            </View>

            {revealKey ? (
              <View style={styles.privateKeyBox}>
                <Text style={styles.privateKeyLabel}>YOUR BASE58 SECRET KEY</Text>
                <Text style={styles.privateKeyValue}>{identity?.secretKey}</Text>

                <View style={styles.pkButtonRow}>
                  <TouchableOpacity
                    style={styles.pkCopyBtn}
                    onPress={() => copyToClipboard(identity?.secretKey || '', 'Private Key')}
                  >
                    <Copy size={12} color="#050507" />
                    <Text style={styles.pkCopyText}>COPY KEY</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pkHideBtn}
                    onPress={() => setRevealKey(false)}
                  >
                    <EyeOff size={12} color="#fff" />
                    <Text style={styles.pkHideText}>HIDE KEY</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.revealBtn}
                onPress={() => {
                  Alert.alert(
                    'Reveal Private Key?',
                    'Are you sure you want to reveal your private key? Make sure no one is looking at your screen.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Reveal', onPress: () => setRevealKey(true) },
                    ]
                  );
                }}
              >
                <Eye size={14} color="#FF6B1A" />
                <Text style={styles.revealBtnText}>REVEAL STAKER SECRET KEY</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050507',
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
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#0d0d14',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B1A',
  },
  tabLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: '#FF6B1A',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  balanceTitle: {
    fontFamily: 'monospace',
    fontSize: 8,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },
  addressMini: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 16,
    maxWidth: width - 80,
  },
  solValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  bigSolVal: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
  },
  bigSolUnit: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginLeft: 6,
    marginBottom: 4,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  copyBtnMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,107,26,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  copyBtnText: {
    fontFamily: 'monospace',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FF6B1A',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
  },
  assetList: {
    gap: 8,
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenIconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenIconPlaceholderMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenIconText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  tokenIconTextMini: {
    fontFamily: 'monospace',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
  },
  assetSymbol: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  assetName: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  assetRight: {
    alignItems: 'flex-end',
  },
  assetBalance: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
  },
  assetMintMini: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  formContainer: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 16,
  },
  formHeader: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 8,
  },
  formDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: 'monospace',
    fontSize: 8,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  maxText: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: '#FF6B1A',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#050507',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#fff',
    height: 48,
    paddingHorizontal: 12,
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 16,
  },
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#050507',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  dropdownContainer: {
    backgroundColor: '#050507',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    marginTop: -12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  dropdownItemBal: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  sendBtn: {
    backgroundColor: '#FF6B1A',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabledSendBtn: {
    backgroundColor: 'rgba(255,107,26,0.2)',
    opacity: 0.5,
  },
  sendBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendBtnText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#050507',
    letterSpacing: 0.5,
  },
  warningBox: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  warningText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    lineHeight: 13,
  },
  receiveContainer: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
  },
  qrFrame: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeImage: {
    width: 180,
    height: 180,
  },
  qrFallbackText: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#050507',
    fontWeight: 'bold',
    marginTop: 8,
  },
  addressBox: {
    width: '100%',
    backgroundColor: '#050507',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  addressBoxLabel: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  addressBoxValue: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  addressBoxCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF6B1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addressBoxCopyText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#050507',
    letterSpacing: 0.5,
  },
  securityAlertBox: {
    backgroundColor: 'rgba(239,68,68,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  securityAlertTitle: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ef4444',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  securityAlertText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 16,
  },
  revealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.3)',
    backgroundColor: 'rgba(255,107,26,0.03)',
    borderRadius: 12,
    height: 48,
  },
  revealBtnText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF6B1A',
    letterSpacing: 0.5,
  },
  privateKeyBox: {
    backgroundColor: '#050507',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 16,
    padding: 16,
  },
  privateKeyLabel: {
    fontFamily: 'monospace',
    fontSize: 8,
    color: '#ef4444',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  privateKeyValue: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#fff',
    lineHeight: 15,
    marginBottom: 16,
  },
  pkButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pkCopyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF6B1A',
    height: 38,
    borderRadius: 8,
  },
  pkCopyText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#050507',
  },
  pkHideBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 38,
    borderRadius: 8,
  },
  pkHideText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
  },
});
