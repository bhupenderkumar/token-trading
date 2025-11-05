import React, { useCallback, useEffect, useState } from 'react';
import { Buffer } from 'buffer';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  TransactionInstruction
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata';
import type { DataV2 } from '@metaplex-foundation/mpl-token-metadata';
import { getConfigForNetwork } from '../config/config';
import type { TokenConfig } from '../config/config';
import TokenPreview from './TokenPreview';
import TransactionInfo from './TransactionInfo';
import type { TransactionResponse } from '../types/transaction';
import { setupWallet, validateWalletState } from '../utils/wallet';
import { useToast } from './Toast';
import { useNetworkActivity } from '../context/NetworkActivityContext';

// Polyfill Buffer for browser
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

// Constants
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const SPL_TOKEN_MINT_SIZE = 82;

// (optional backend metadata registration removed to reduce coupling during mint)

interface TokenMintProps {
  selectedNetwork: 'devnet' | 'localnet' | 'mainnet';
  onTransaction: (tx: TransactionResponse) => void;
}

const TokenMint: React.FC<TokenMintProps> = ({ selectedNetwork, onTransaction }) => {
  const config = getConfigForNetwork(selectedNetwork);
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const { showToast } = useToast();
  const { startActivity, endActivity } = useNetworkActivity();
  const [, setMintAddress] = useState<string>('');
  const [, setTokenAccount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [, setStatus] = useState<string>('');
  const [transactionResponse, setTransactionResponse] = useState<TransactionResponse | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [, setImagePreview] = useState<string>('');
  const [mintRent, setMintRent] = useState<number | null>(null);
  const [ataRent, setAtaRent] = useState<number | null>(null);
  const estimatedFeesLamports = 50_000_000; // ~0.05 SOL heuristic
  const [formData, setFormData] = useState<TokenConfig>({
    name: config?.defaultToken?.name || 'My Token',
    symbol: config?.defaultToken?.symbol || 'MTK',
    description: config?.defaultToken?.description || 'A new SPL token',
    decimals: config?.defaultToken?.decimals ?? 9,
    initialSupply: config?.defaultToken?.initialSupply ?? 1000000,
    image: config?.defaultToken?.image || '',
    twitter: config?.defaultToken?.twitter || '',
    website: config?.defaultToken?.website || ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'decimals' || name === 'initialSupply' ? Number(value) : value
    }));
  };

  const validateForm = useCallback(() => {
    if (!formData.name || !formData.symbol) {
      setStatus('Error: Name and symbol are required');
      showToast('error', 'Name and symbol are required');
      return false;
    }
    if (formData.decimals < 0 || formData.decimals > 9) {
      setStatus('Error: Decimals must be between 0 and 9');
      showToast('error', 'Decimals must be between 0 and 9');
      return false;
    }
    if (formData.initialSupply <= 0) {
      setStatus('Error: Initial supply must be greater than 0');
      showToast('error', 'Initial supply must be greater than 0');
      return false;
    }
    return true;
  }, [formData.decimals, formData.initialSupply, formData.name, formData.symbol]);

  // Estimate rent-exempt lamports for accounts and show a fee breakdown
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mintL = await connection.getMinimumBalanceForRentExemption(SPL_TOKEN_MINT_SIZE);
        const ataL = await connection.getMinimumBalanceForRentExemption(165);
        if (!cancelled) {
          setMintRent(mintL);
          setAtaRent(ataL);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [connection]);

  useEffect(() => {
    if (!isLoading) return;
    const timeout = setTimeout(() => {
      setIsLoading(false);
      showToast('error', 'Operation timed out after 30 seconds. Please retry or check your wallet.');
    }, 30_000);
    return () => clearTimeout(timeout);
  }, [isLoading, showToast]);

  const isLocalhost = connection.rpcEndpoint.includes('localhost') || connection.rpcEndpoint.includes('127.0.0.1');

  const handleCreateMint = useCallback(async () => {
    if (!publicKey || !sendTransaction) {
      const error: TransactionResponse = {
        status: 'error',
        timestamp: Date.now(),
        error: {
          code: 'WalletNotConnected',
          message: 'Wallet is not connected',
        },
      };
      setTransactionResponse(error);
      showToast('error', 'Wallet is not connected');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    startActivity();

    // Validate wallet state and attempt to fix if needed
    let walletCheck;
    try {
      walletCheck = await validateWalletState(connection, publicKey);
      // ...existing code...
      // Step 2: Create a new Keypair for the mint
      const mintKeypair = Keypair.generate();
      // Step 2: Get latest blockhash and build transaction (with retry for Brave)
      let blockhash = '';
      let blockhashRetries = 0;
      while (blockhashRetries < 3) {
        try {
          const bh = await connection.getLatestBlockhash('confirmed');
          blockhash = bh.blockhash;
          if (blockhash) break;
        } catch {}
        blockhashRetries++;
        await new Promise(r => setTimeout(r, 1000 * blockhashRetries));
      }
      if (!blockhash) {
        setTransactionResponse({
          status: 'error',
          timestamp: Date.now(),
          error: { code: 'BlockhashError', message: 'Failed to fetch a valid blockhash. Please retry.' }
        });
        setIsLoading(false);
        endActivity();
        return;
      }
      // Create transaction
      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      // ...existing transaction construction code...
      const associatedTokenAddress = await getAssociatedTokenAddress(mintKeypair.publicKey, publicKey);
      let signature = '';
      let simulationRetries = 0;
      let mintSuccess = false;
      while (simulationRetries < 3 && !mintSuccess) {
        try {
          // ...existing code for transaction simulation and sending...
          // Confirmation loop
          const started = Date.now();
          const timeoutMs = isLocalhost ? 8000 : 25000;
          let confirmed = false;
          let lastStatus: any = null;
          while (Date.now() - started < timeoutMs) {
            const statuses = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
            lastStatus = statuses && statuses.value && statuses.value[0];
            if (lastStatus && (lastStatus.confirmationStatus === 'confirmed' || lastStatus.confirmationStatus === 'finalized' || lastStatus.err === null)) {
              confirmed = true;
              break;
            }
            if (lastStatus && lastStatus.err) {
              break;
            }
            await new Promise(r => setTimeout(r, 500));
          }
          if (!confirmed) {
            if (lastStatus && lastStatus.err) {
              throw new Error('Transaction failed: ' + JSON.stringify(lastStatus.err));
            } else {
              throw new Error('Confirmation timeout. Please retry in a moment.');
            }
          }
          console.log('Transaction confirmed');
          setMintAddress(mintKeypair.publicKey.toBase58());
          mintSuccess = true;
        } catch (err) {
          if (simulationRetries < 2) {
            await new Promise(r => setTimeout(r, 1000 * (simulationRetries + 1)));
            simulationRetries++;
            continue;
          }
          throw err;
        }
      }
      // Verification: fetch token supply and ATA balance
      let supplyInfo: any = null;
      let ataBalanceInfo: any = null;
      try {
        supplyInfo = await connection.getTokenSupply(mintKeypair.publicKey);
      } catch {}
      try {
        ataBalanceInfo = await connection.getTokenAccountBalance(associatedTokenAddress);
      } catch {}
      // ...existing metadata creation code...
    } catch (e: any) {
      // ...existing error handling code...
    } finally {
      setIsLoading(false);
      endActivity();
    }
  }, [connection, publicKey, sendTransaction, formData, validateForm, isLocalhost, showToast]);

  const populateSampleData = () => {
    setFormData(prev => ({
      ...prev,
      image: 'https://raw.githubusercontent.com/solana-labs/token-creator/main/assets/token-creator.png',
      twitter: 'https://twitter.com/solana',
      website: 'https://solana.com'
    }));
    showToast('info', 'Sample data populated');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '32px 0' }}>
      <div style={{ background: '#222', borderRadius: 16, padding: 32, width: 500, boxShadow: '0 2px 12px #0004' }}>
        <h2 style={{ marginBottom: 24, color: '#fff', textAlign: 'center' }}>Create SPL Token</h2>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button
            onClick={populateSampleData}
            style={{
              background: 'none',
              border: '1px solid #555',
              color: '#aaa',
              padding: '6px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Populate with Sample Data
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#fff', display: 'block', marginBottom: 8 }}>Token Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #444',
                background: '#333',
                color: '#fff'
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#fff', display: 'block', marginBottom: 8 }}>Symbol *</label>
            <input
              type="text"
              name="symbol"
              value={formData.symbol}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #444',
                background: '#333',
                color: '#fff'
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#fff', display: 'block', marginBottom: 8 }}>Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #444',
                background: '#333',
                color: '#fff'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ color: '#fff', display: 'block', marginBottom: 8 }}>Decimals *</label>
              <input
                type="number"
                name="decimals"
                value={formData.decimals}
                onChange={handleInputChange}
                min="0"
                max="9"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #444',
                  background: '#333',
                  color: '#fff'
                }}
              />
            </div>
            <div>
              <label style={{ color: '#fff', display: 'block', marginBottom: 8 }}>Initial Supply *</label>
              <input
                type="number"
                name="initialSupply"
                value={formData.initialSupply}
                onChange={handleInputChange}
                min="1"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #444',
                  background: '#333',
                  color: '#fff'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#fff', display: 'block', marginBottom: 8 }}>Image URL</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="url"
                name="image"
                value={formData.image}
                onChange={(e) => {
                  handleInputChange(e);
                  setImagePreview(e.target.value);
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #444',
                  background: '#333',
                  color: '#fff'
                }}
              />
              {formData.image && (
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid #444'
                }}>
                  <img
                    src={formData.image}
                    alt="Token"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#fff', display: 'block', marginBottom: 8 }}>Twitter</label>
            <input
              type="text"
              name="twitter"
              value={formData.twitter}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #444',
                background: '#333',
                color: '#fff'
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ color: '#fff', display: 'block', marginBottom: 8 }}>Website</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #444',
                background: '#333',
                color: '#fff'
              }}
            />
          </div>
        </div>

        {mintRent !== null && ataRent !== null && (
          <div style={{
            marginBottom: 16,
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: 8,
            padding: 12,
            color: '#ccc',
            fontSize: 14
          }}>
            <div style={{ marginBottom: 6, color: '#fff' }}><strong>Estimated Cost</strong> (rent + fees)</div>
            <div>Mint account rent: {(mintRent / LAMPORTS_PER_SOL).toFixed(6)} SOL</div>
            <div>ATA account rent: {(ataRent / LAMPORTS_PER_SOL).toFixed(6)} SOL</div>
            <div>Network fees (est.): {(estimatedFeesLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL</div>
            <div style={{ marginTop: 6, color: '#14f195' }}>
              Total: {((mintRent + ataRent + estimatedFeesLamports) / LAMPORTS_PER_SOL).toFixed(6)} SOL
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#888' }}>
              Note: On localnet, fees can display as 0 SOL. Rent is still deducted to new accounts.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <button
            onClick={() => setPreviewOpen(true)}
            style={{
              flex: 1,
              padding: '12px 24px',
              fontSize: 16,
              borderRadius: 8,
              border: '1px solid #14f195',
              background: 'transparent',
              color: '#14f195',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Preview Token
          </button>
          <button
            onClick={handleCreateMint}
            disabled={!publicKey || isLoading}
            style={{
              flex: 2,
              padding: '12px 24px',
              fontSize: 16,
              borderRadius: 8,
              border: 'none',
              background: isLoading ? '#0c9b5e' : '#14f195',
              color: '#222',
              fontWeight: 700,
              cursor: publicKey && !isLoading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {isLoading ? 'Creating...' : 'Create Token'}
          </button>
        </div>

        <TokenPreview
          token={formData}
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
        />

        {transactionResponse && <TransactionInfo response={transactionResponse} showToast={showToast} selectedNetwork={selectedNetwork} />}
      </div>
    </div>
  );
};

export default TokenMint;
