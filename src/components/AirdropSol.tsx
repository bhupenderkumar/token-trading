import React, { useCallback, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useToast } from './Toast';
import type { TransactionResponse } from '../types/transaction';

const AirdropSol: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<TransactionResponse | null>(null);

  const isLocalhost = connection.rpcEndpoint.includes('localhost') || connection.rpcEndpoint.includes('127.0.0.1');

  const handleAirdrop = useCallback(async () => {
    if (!publicKey) {
      showToast('error', 'Connect a wallet first');
      return;
    }
    setIsLoading(true);
    setResponse(null);
    try {
      const sig = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
      try {
        const latest = await connection.getLatestBlockhash(isLocalhost ? 'processed' : 'confirmed');
        await connection.confirmTransaction({ signature: sig, ...latest }, isLocalhost ? 'processed' : 'confirmed');
      } catch {}
      setResponse({
        status: 'success',
        timestamp: Date.now(),
        signature: sig,
        logs: ['Airdropped 1 SOL to your wallet']
      });
      showToast('success', 'Airdropped 1 SOL');
    } catch (e: any) {
      setResponse({
        status: 'error',
        timestamp: Date.now(),
        error: { code: 'AirdropFailed', message: e?.message || 'Airdrop failed' }
      });
      showToast('error', e?.message || 'Airdrop failed');
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey, isLocalhost, showToast]);

  return (
    <div style={{ background: '#222', borderRadius: 12, padding: 16, border: '1px solid #333' }}>
      <div style={{ color: '#fff', marginBottom: 8, fontWeight: 700 }}>Get Test SOL</div>
      <button
        onClick={handleAirdrop}
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
        {isLoading ? 'Requesting...' : 'Airdrop 1 SOL'}
      </button>
      {response && (
        <div style={{ marginTop: 12, color: '#ccc', fontSize: 12 }}>
          {response.status === 'success' ? 'Airdrop successful.' : response.error?.message}
        </div>
      )}
    </div>
  );
};

export default AirdropSol;


