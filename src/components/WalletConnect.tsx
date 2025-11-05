import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import WalletInfo from './WalletInfo';

const WalletConnect: React.FC = () => {
  return (
    <div style={{ margin: '20px 0' }}>
      <WalletMultiButton style={{
        backgroundColor: '#14f195',
        color: '#222',
        fontWeight: 600,
        borderRadius: '8px',
        padding: '12px 24px',
      }} />
      <WalletInfo />
    </div>
  );
};

export default WalletConnect;
