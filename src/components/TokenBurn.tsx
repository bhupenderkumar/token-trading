import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  PublicKey,
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createBurnInstruction,
  getAccount,
  getMint,
} from '@solana/spl-token';
import type { TransactionResponse } from '../types/transaction';
import TransactionInfo from './TransactionInfo';
import { setupWallet, validateWalletState } from '../utils/wallet';
import { getResilientConnection, detectNetwork } from '../utils/connection';
import { useToast } from './Toast';

interface TokenBurnProps {
  mintAddress?: string;
  onBurnComplete?: () => void;
}

const TokenBurn: React.FC<TokenBurnProps> = ({ mintAddress: initialMintAddress, onBurnComplete }) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { showToast } = useToast();
  
  const [mintAddress, setMintAddress] = useState(initialMintAddress || '');
  const [amount, setAmount] = useState('');
  const [mintAddressError, setMintAddressError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [transactionResponse, setTransactionResponse] = useState<TransactionResponse | null>(null);
  const [isBurning, setIsBurning] = useState(false);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);

  // Fetch and set the user's full token balance for burning
  const handleBurnAll = async () => {
    if (!publicKey || !mintAddress) return;
    setIsFetchingBalance(true);
    try {
      const ata = await getAssociatedTokenAddress(new PublicKey(mintAddress), publicKey);
      const accountInfo = await getAccount(connection, ata);
      const mintInfo = await getMint(connection, new PublicKey(mintAddress));
      const decimals = mintInfo.decimals;
      // Convert bigint to number safely
      const balance = Number(accountInfo.amount) / Math.pow(10, decimals);
      setAmount(balance.toString());
      setAmountError('');
    } catch (err) {
      showToast('error', 'Failed to fetch token balance');
    }
    setIsFetchingBalance(false);
  };

  useEffect(() => {
    if (initialMintAddress) {
      setMintAddress(initialMintAddress);
      validateMintAddress(initialMintAddress);
    }
  }, [initialMintAddress]);

  const validateMintAddress = (value: string) => {
    if (!value.trim()) {
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
      setMintAddressError('');
      return;
    }
    try {
      new PublicKey(value);
      setMintAddressError('');
    } catch (err) {
      setMintAddressError('Invalid mint address format');
    }
  };

  const validateAmount = (value: string) => {
    if (!value.trim()) {
      setAmountError('');
      return;
    }
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      setAmountError('Amount must be a positive number');
    } else {
      setAmountError('');
    }
  };

  const isFormValid = () => {
    return (
      publicKey &&
      mintAddress.trim() &&
      amount.trim() &&
      !mintAddressError &&
      !amountError &&
      !isBurning
    );
  };

  const resetForm = () => {
    setMintAddress(initialMintAddress || '');
    setAmount('');
    setMintAddressError('');
    setAmountError('');
    setTransactionResponse(null);
    if (onBurnComplete) {
      onBurnComplete();
    }
  };

  const handleBurnToken = async () => {
    if (!isFormValid()) {
      console.log('Form is not valid, cannot burn');
      return;
    }

    setIsBurning(true);
    setTransactionResponse(null);

    const maxRetries = 3;
  // Fetch and set the user's full token balance for burning
  const handleBurnAll = async () => {
    if (!publicKey || !mintAddress) return;
    setIsFetchingBalance(true);
    try {
      const ata = await getAssociatedTokenAddress(new PublicKey(mintAddress), publicKey);
      const accountInfo = await getAccount(connection, ata);
      const mintInfo = await getMint(connection, new PublicKey(mintAddress));
      const decimals = mintInfo.decimals;
      // Convert bigint to number safely
      const balance = Number(accountInfo.amount) / Math.pow(10, decimals);
      setAmount(balance.toString());
      setAmountError('');
    } catch (err) {
      showToast('error', 'Failed to fetch token balance');
    }
    setIsFetchingBalance(false);
  };
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // Validate wallet state with retry
        const walletCheck = await validateWalletState(connection, publicKey!);
        if (!walletCheck.isValid && walletCheck.error) {
          const setup = await setupWallet(connection, publicKey!);
          if (!setup.success) {
            throw new Error('Failed to set up wallet state');
          }
        }

        // Use resilient connection for better reliability
        const network = detectNetwork(connection.rpcEndpoint);
        const resilientConnection = getResilientConnection(network);

        // Get mint info with resilient connection
        const mintPubkey = new PublicKey(mintAddress);
        const mintInfo = await resilientConnection.executeWithFallback(async (conn) => {
          return await getMint(conn, mintPubkey);
        });
        const decimals = mintInfo.decimals;

        // Validate token account and balance with resilient connection
        const associatedTokenAddress = await getAssociatedTokenAddress(mintPubkey, publicKey!);
        
        const tokenAccount = await resilientConnection.executeWithFallback(async (conn) => {
          try {
            return await getAccount(conn, associatedTokenAddress);
          } catch (e: any) {
            if (e.message.includes('could not find account')) {
              throw new Error('Token account not found. Make sure you own this token.');
            }
            throw e;
          }
        });

        const balance = tokenAccount.amount;
        const burnAmountValue = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));

        if (balance < burnAmountValue) {
          throw new Error(`Insufficient token balance. Available: ${Number(balance) / Math.pow(10, decimals)}, Required: ${amount}`);
        }

        // Validate decimal places
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) {
          throw new Error('Invalid amount format');
        }

        const [, decimalPart] = amount.split('.');
        if (decimalPart && decimalPart.length > decimals) {
          throw new Error(`Maximum ${decimals} decimal places allowed`);
        }

        const burnAmount = BigInt(Math.floor(parsedAmount * Math.pow(10, decimals)));

        // Get fresh blockhash with resilient connection
        const { blockhash, lastValidBlockHeight } = await resilientConnection.executeWithFallback(async (conn) => {
          return await conn.getLatestBlockhash('confirmed');
        });

        // Create transaction with optimized settings
        const computeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 });
        const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 });
        const burnIx = createBurnInstruction(associatedTokenAddress, mintPubkey, publicKey!, burnAmount);
        
        const messageV0 = new TransactionMessage({
          payerKey: publicKey!,
          recentBlockhash: blockhash,
          instructions: [computeUnitLimitIx, priorityFeeIx, burnIx],
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);

        // Send transaction with retry using the current connection (wallet adapter requirement)
        let signature;
        try {
          signature = await sendTransaction(transaction, connection, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 3
          });
        } catch (e: any) {
          if (retryCount < maxRetries - 1 && (
            e.code === -32603 ||
            e.message.includes('429') ||
            e.message.includes('503') ||
            e.message.includes('blockhash not found') ||
            e.message.includes('Transaction was not confirmed')
          )) {
            console.log(`Retrying transaction (attempt ${retryCount + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
            retryCount++;
            continue;
          }
          throw e;
        }

        // Wait for confirmation with resilient connection and timeout
        const confirmation = await resilientConnection.executeWithFallback(async (conn) => {
          const confirmationPromise = conn.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
          }, 'confirmed');

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Transaction confirmation timeout')), 30000)
          );

          return await Promise.race([confirmationPromise, timeoutPromise]);
        }) as any;
        
        if (confirmation.value?.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        showToast('success', 'Tokens burned successfully');
        
        const success: TransactionResponse = {
          status: 'success',
          timestamp: Date.now(),
          signature,
          logs: [`Tokens burned successfully`, `Mint address: ${mintAddress}`, `Amount burned: ${amount}`]
        };
        setTransactionResponse(success);
        
        if (onBurnComplete) {
          onBurnComplete();
        }
        
        // Reset form after 3 seconds
        setTimeout(() => {
          resetForm();
        }, 3000);

        return; // Success, exit retry loop

      } catch (error: any) {
        console.error(`Burn error (attempt ${retryCount + 1}/${maxRetries}):`, error);

        // If this is the last retry or a non-retryable error, handle it
        if (retryCount >= maxRetries - 1 ||
            (!error.code || (error.code !== -32603 && !error.message.includes('429') && !error.message.includes('503')))) {
          
          let message = 'Failed to burn tokens. Please try again.';
          if (error.name === 'WalletSendTransactionError' || error.code === -32603) {
            message = 'Transaction was rejected by the wallet or RPC node. Please check your wallet connection, ensure you have enough SOL for fees, and try again. If the issue persists, reconnect your wallet or refresh the page.';
            console.error('WalletSendTransactionError details:', error);

            // Print extra debug info for RPC errors
            if (error.code === -32603) {
              console.error('Solana RPC internal error (-32603):', error.message, error.data);
              showToast('error', 'Solana RPC error (-32603): Network congestion or node issue. Please try again later or reduce the burn amount.');
            }
          } else if (error.message.includes('insufficient lamports')) {
            message = 'Insufficient SOL balance for transaction fees.';
          } else if (error.message.includes('Insufficient token balance')) {
            message = error.message;
          } else if (error.message.includes('Transaction confirmation timeout')) {
            message = 'Transaction timed out. It may still be processing. Check your wallet or try again.';
          }

          const errorResponse: TransactionResponse = {
            status: 'error',
            timestamp: Date.now(),
            error: {
              code: error.code || 'BurnError',
              message: error.message || message,
              data: error
            }
          };
          setTransactionResponse(errorResponse);
          showToast('error', message);
          break;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
        retryCount++;
      }
    }

    setIsBurning(false);
  };

  const getButtonText = () => {
    if (isBurning) return 'Burning...';
    if (!publicKey) return 'Connect Wallet First';
    if (!mintAddress.trim()) return 'Enter Mint Address';
    if (!amount.trim()) return 'Enter Amount';
    if (mintAddressError) return 'Fix Mint Address Error';
    if (amountError) return 'Fix Amount Error';
    return 'Burn Tokens';
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      margin: '32px auto',
      maxWidth: '600px',
      padding: '0 16px'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '10px 10px 20px #161616, -10px -10px 20px #3c3c3c',
        width: '100%',
        color: '#e0e0e0',
        fontFamily: "'Roboto', sans-serif"
      }}>
        <h2 style={{
          textAlign: 'center',
          color: '#14f195',
          marginBottom: '30px',
          fontWeight: 'bold',
          fontSize: '2rem'
        }}>
          Burn Tokens
        </h2>
        
        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            marginBottom: '10px',
            color: '#a0a0a0',
            fontSize: '0.9rem'
          }}>
            Mint Address
          </label>
          <input
            type="text"
            value={mintAddress}
            onChange={(e) => {
              setMintAddress(e.target.value);
              validateMintAddress(e.target.value);
            }}
            placeholder="Enter token mint address"
            disabled={!!initialMintAddress}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${mintAddressError ? '#ff4d4d' : '#444'}`,
              background: '#222',
              color: '#e0e0e0',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.3s'
            }}
          />
          {mintAddressError && <p style={{ color: '#ff4d4d', fontSize: '0.8rem', marginTop: '5px' }}>{mintAddressError}</p>}
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'block',
            marginBottom: '10px',
            color: '#a0a0a0',
            fontSize: '0.9rem'
          }}>
            Amount to Burn
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                validateAmount(e.target.value);
              }}
              placeholder="e.g., 100"
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${amountError ? '#ff4d4d' : '#444'}`,
                background: '#222',
                color: '#e0e0e0',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.3s'
              }}
            />
            <button
              type="button"
              onClick={handleBurnAll}
              disabled={isFetchingBalance || !publicKey || !mintAddress}
              style={{ padding: '12px 16px', borderRadius: 8, background: '#14f195', color: '#181a20', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              {isFetchingBalance ? 'Fetching...' : 'Burn All'}
            </button>
          </div>
          {amountError && <p style={{ color: '#ff4d4d', fontSize: '0.8rem', marginTop: '5px' }}>{amountError}</p>}
        </div>

        <button
          onClick={handleBurnToken}
          disabled={!isFormValid()}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: '8px',
            border: 'none',
            background: isFormValid() ? 'linear-gradient(145deg, #16a085, #1abc9c)' : '#444',
            color: '#fff',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: isFormValid() ? 'pointer' : 'not-allowed',
            transition: 'background 0.3s, transform 0.2s',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {isBurning && (
            <div style={{
              width: '20px',
              height: '20px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          )}
          {getButtonText()}
        </button>

        {transactionResponse && (
          <div style={{ marginTop: '30px' }}>
            <TransactionInfo response={transactionResponse} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenBurn;

const keyframes = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

const styleSheet = document.styleSheets[0];
try {
  styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
} catch (e) {
  console.error("Could not insert keyframes for spinner", e);
}