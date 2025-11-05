import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import type { TransactionResponse } from '../types/transaction';

// Retry utility function
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.message?.includes('Invalid public key') ||
          error.message?.includes('Account does not exist') ||
          error.code === 'AccountNotFound') {
        throw error;
      }
      
      // Only retry on network/RPC errors
      if (i < maxRetries - 1 && (
        error.code === -32603 ||
        error.message?.includes('429') ||
        error.message?.includes('503') ||
        error.message?.includes('timeout') ||
        error.message?.includes('network')
      )) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Retrying in ${delay}ms (attempt ${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

export const setupWallet = async (
  connection: Connection,
  walletAddress: PublicKey
): Promise<{ success: boolean; message: string }> => {
  try {
    // Check if account exists and has enough SOL with retry
    const balance = await retryWithBackoff(async () => {
      return await connection.getBalance(walletAddress, 'confirmed');
    });
    
    if (balance < 0.01 * LAMPORTS_PER_SOL) { // Need at least 0.01 SOL for fees
      // Try to airdrop SOL
      try {
        const airdropAmount = 2 * LAMPORTS_PER_SOL;
        const signature = await retryWithBackoff(async () => {
          return await connection.requestAirdrop(walletAddress, airdropAmount);
        });
        
        // Wait for airdrop confirmation with retry
        await retryWithBackoff(async () => {
          const confirmation = await connection.confirmTransaction(signature, 'confirmed');
          if (confirmation.value.err) {
            throw new Error('Airdrop transaction failed');
          }
          return confirmation;
        });
        
        return {
          success: true,
          message: 'Successfully airdropped 2 SOL to your wallet'
        };
      } catch (e: any) {
        console.error('Airdrop failed:', e);
        return {
          success: false,
          message: 'Failed to airdrop SOL. Please run "solana airdrop 2" in terminal or fund your wallet manually'
        };
      }
    }

    return {
      success: true,
      message: `Wallet ready with ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`
    };
  } catch (e: any) {
    console.error('Setup wallet error:', e);
    return {
      success: false,
      message: `Error checking wallet balance: ${e.message || 'Unknown error'}`
    };
  }
};

export const validateWalletState = async (
  connection: Connection,
  walletAddress: PublicKey | null
): Promise<{ isValid: boolean; error?: TransactionResponse }> => {
  if (!walletAddress) {
    return {
      isValid: false,
      error: {
        status: 'error',
        timestamp: Date.now(),
        error: {
          code: 'WalletNotConnected',
          message: 'Please connect your wallet'
        }
      }
    };
  }

  try {
    const balance = await retryWithBackoff(async () => {
      return await connection.getBalance(walletAddress, 'confirmed');
    });
    
    const minBalance = 0.005 * LAMPORTS_PER_SOL; // Minimum 0.005 SOL for transaction fees
    
    if (balance < minBalance) {
      return {
        isValid: false,
        error: {
          status: 'error',
          timestamp: Date.now(),
          error: {
            code: 'InsufficientBalance',
            message: `Insufficient SOL balance. Current: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL, Required: ${(minBalance / LAMPORTS_PER_SOL).toFixed(3)} SOL`,
            data: {
              currentBalance: balance / LAMPORTS_PER_SOL,
              requiredBalance: minBalance / LAMPORTS_PER_SOL,
              suggestedAction: 'Run "solana airdrop 2" in terminal or fund your wallet'
            }
          }
        }
      };
    }

    return { isValid: true };
  } catch (e: any) {
    console.error('Validate wallet state error:', e);
    return {
      isValid: false,
      error: {
        status: 'error',
        timestamp: Date.now(),
        error: {
          code: 'WalletError',
          message: `Error checking wallet state: ${e.message || 'Network connection issue'}`,
          data: { error: e }
        }
      }
    };
  }
};

// New utility function to check RPC health
export const checkRPCHealth = async (connection: Connection): Promise<boolean> => {
  try {
    await retryWithBackoff(async () => {
      const slot = await connection.getSlot('confirmed');
      if (typeof slot !== 'number' || slot <= 0) {
        throw new Error('Invalid slot response');
      }
      return slot;
    }, 2, 500);
    return true;
  } catch (e) {
    console.error('RPC health check failed:', e);
    return false;
  }
};

// New utility function to get optimal commitment level
export const getOptimalCommitment = (network: string): 'processed' | 'confirmed' | 'finalized' => {
  // Use 'confirmed' for better reliability on localnet and devnet
  if (network.includes('localhost') || network.includes('devnet')) {
    return 'confirmed';
  }
  return 'confirmed'; // Use confirmed for all networks for better reliability
};