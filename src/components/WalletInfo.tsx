import React, { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import TransactionHistory from './TransactionHistory';

const WalletInfo: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [network, setNetwork] = useState<string>('');
  const [showTx, setShowTx] = useState(false);

  useEffect(() => {
    const getBalance = async () => {
      if (!publicKey) {
        setBalance(null);
        return;
      }
      try {
        const bal = await connection.getBalance(publicKey);
        setBalance(bal / LAMPORTS_PER_SOL);
      } catch (e) {
        console.error('Failed to fetch balance:', e);
        setBalance(null);
      }
    };

    const getNetworkInfo = async () => {
      try {
  await connection.getGenesisHash();
        const endpoint = connection.rpcEndpoint;
        if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
          setNetwork('Localhost');
        } else if (endpoint.includes('testnet')) {
          setNetwork('Testnet');
        } else if (endpoint.includes('devnet')) {
          setNetwork('Devnet');
        } else if (endpoint.includes('mainnet')) {
          setNetwork('Mainnet');
        } else {
          setNetwork('Unknown');
        }
      } catch (e) {
        console.error('Failed to fetch network info:', e);
        setNetwork('Unknown');
      }
    };

    getBalance();
    getNetworkInfo();
    
    // Set up balance polling
    const intervalId = setInterval(getBalance, 5000); // Poll every 5 seconds
    
    return () => clearInterval(intervalId);
  }, [connection, publicKey]);

  if (!publicKey) return null;

  return (
    <div style={{
      background: '#333',
      padding: '12px 16px',
      borderRadius: 8,
      marginTop: 12,
      color: '#fff',
      fontSize: 14
    }}>
      <div style={{ marginBottom: 8 }}>
        <strong>Address:</strong>{' '}
        <span style={{ color: '#14f195', wordBreak: 'break-all' }}>
          {publicKey.toBase58()}
        </span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Network:</strong>{' '}
        <span style={{ color: '#14f195' }}>
          {network}
        </span>
      </div>
      <div>
        <strong>Balance:</strong>{' '}
        <span style={{ color: '#14f195' }}>
          {balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}
        </span>
        {balance !== null && balance < 0.5 && (
          <div style={{ 
            color: '#ff5252',
            fontSize: 12,
            marginTop: 4 
          }}>
            Low balance! Run 'solana airdrop 2' in terminal to get more SOL
          </div>
        )}
      </div>
      <div style={{marginTop: 4, textAlign: 'right'}}>
        <button
          onClick={() => setShowTx(true)}
          style={{
            background: '#14f195',
            color: '#222',
            border: 'none',
            fontWeight: 600,
            borderRadius: 5,
            padding: '6px 16px',
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          View Transactions
        </button>
      </div>
      {showTx && publicKey && (
        <TransactionHistory address={publicKey.toBase58()} onClose={() => setShowTx(false)} />
      )}
    </div>
  );
};

export default WalletInfo;