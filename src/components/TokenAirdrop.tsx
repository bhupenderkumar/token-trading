import React, { useCallback, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { useToast } from './Toast';
import type { TransactionResponse } from '../types/transaction';

const TokenAirdrop: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { showToast } = useToast();
  const [mintAddress, setMintAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [decimals, setDecimals] = useState<number | null>(9);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<TransactionResponse | null>(null);

  const isLocalhost = connection.rpcEndpoint.includes('localhost') || connection.rpcEndpoint.includes('127.0.0.1');

  const handleAirdropTokens = useCallback(async () => {
    if (!publicKey || !sendTransaction) {
      showToast('error', 'Connect a wallet first');
      return;
    }
    if (!mintAddress || !recipient || !amount || Number(amount) <= 0) {
      showToast('error', 'Enter mint, recipient and positive amount');
      return;
    }
    setIsLoading(true);
    setResponse(null);
    try {
      const mintPubkey = new PublicKey(mintAddress);
      const recipientPubkey = new PublicKey(recipient);

      // Fetch decimals if unknown
      if (decimals === null) {
        try {
          const info = await connection.getTokenSupply(mintPubkey);
          setDecimals(info.value.decimals ?? 9);
        } catch {}
      }
      const tokenDecimals = decimals ?? 9;
      const amountInSmallest = BigInt(Math.floor(Number(amount) * Math.pow(10, tokenDecimals)));

      const fromAta = await getAssociatedTokenAddress(mintPubkey, publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const toAta = await getAssociatedTokenAddress(mintPubkey, recipientPubkey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

      const tx = new Transaction();
      // Ensure recipient ATA exists
      tx.add(
        createAssociatedTokenAccountInstruction(
          publicKey,
          toAta,
          recipientPubkey,
          mintPubkey
        )
      );
      // Transfer tokens
      tx.add(
        createTransferInstruction(
          fromAta,
          toAta,
          publicKey,
          Number(amountInSmallest)
        )
      );

      const sig = await sendTransaction(tx, connection, { preflightCommitment: isLocalhost ? 'processed' : 'processed' });
      try {
        const latest = await connection.getLatestBlockhash(isLocalhost ? 'processed' : 'confirmed');
        await connection.confirmTransaction({ signature: sig, ...latest }, isLocalhost ? 'processed' : 'confirmed');
      } catch {}

      setResponse({
        status: 'success',
        timestamp: Date.now(),
        signature: sig,
        logs: [
          'Token airdrop successful',
          `Mint: ${mintPubkey.toBase58()}`,
          `To: ${recipientPubkey.toBase58()}`,
          `Amount: ${amount}`,
        ]
      });
      showToast('success', 'Token airdrop sent');
    } catch (e: any) {
      setResponse({
        status: 'error',
        timestamp: Date.now(),
        error: { code: 'TokenAirdropFailed', message: e?.message || 'Token transfer failed', data: { err: e?.message } }
      });
      showToast('error', e?.message || 'Token transfer failed');
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, sendTransaction, mintAddress, recipient, amount, decimals, connection, isLocalhost, showToast]);

  return (
    <div style={{ background: '#222', borderRadius: 12, padding: 16, border: '1px solid #333' }}>
      <div style={{ color: '#fff', marginBottom: 8, fontWeight: 700 }}>Airdrop Tokens</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Mint address"
          value={mintAddress}
          onChange={(e) => setMintAddress(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #444', background: '#333', color: '#fff' }}
        />
        <input
          type="text"
          placeholder="Recipient address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #444', background: '#333', color: '#fff' }}
        />
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #444', background: '#333', color: '#fff' }}
        />
      </div>
      <button
        onClick={handleAirdropTokens}
        disabled={!publicKey || isLoading}
        style={{
          padding: '10px 16px',
          borderRadius: 8,
          border: 'none',
          background: isLoading ? '#0c9b5e' : '#14f195',
          color: '#222',
          fontWeight: 700,
          cursor: publicKey && !isLoading ? 'pointer' : 'not-allowed'
        }}
      >
        {isLoading ? 'Sending...' : 'Airdrop Tokens'}
      </button>
      {response && (
        <div style={{ marginTop: 12, color: '#ccc', fontSize: 12 }}>
          {response.status === 'success' ? 'Airdrop sent.' : response.error?.message}
        </div>
      )}
    </div>
  );
};

export default TokenAirdrop;


