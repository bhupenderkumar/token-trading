import React from 'react';
import TransactionInfo from './TransactionInfo';
import type { TransactionResponse } from '../types/transaction';

interface TransactionHistoryProps {
  history: TransactionResponse[];
  selectedNetwork: 'devnet' | 'localnet' | 'mainnet';
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ history, selectedNetwork }) => {
  if (history.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: '2rem', color: '#888' }}>
        No transaction history yet.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem' }}>
      <h2 style={{ textAlign: 'center', color: '#fff', marginBottom: '2rem' }}>Transaction History</h2>
      {history.slice().reverse().map((tx, index) => (
        <div key={index} style={{ marginBottom: '1.5rem' }}>
          <TransactionInfo response={tx} selectedNetwork={selectedNetwork} compact={false} />
        </div>
      ))}
    </div>
  );
};

export default TransactionHistory;
