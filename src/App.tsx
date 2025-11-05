import { useState, useEffect } from 'react';
import './App.css';
import WalletConnect from './components/WalletConnect';
import TokenMint from './components/TokenMint';
import TokenOverview from './components/TokenOverview';
import TokenBurn from './components/TokenBurn';
import TransactionHistory from './components/TransactionHistory';
import type { TransactionResponse } from './types/transaction';

import { ToastProvider } from './components/Toast';
import { WalletContextProvider } from './WalletContextProvider';
import { getConfigForNetwork } from './config/config';
import AirdropSol from './components/AirdropSol';
import TokenAirdrop from './components/TokenAirdrop';
import VerifyToken from './components/VerifyToken';
import EvmWalletConnect from './components/evm/EvmWalletConnect';
import Erc20Create from './components/evm/Erc20Create';
import Erc20Manage from './components/evm/Erc20Manage';
import Erc20Verify from './components/evm/Erc20Verify';
import LandingPage from './components/LandingPage';
import { NetworkActivityProvider } from './context/NetworkActivityContext';
import NetworkIndicator from './components/NetworkIndicator';

function App() {
  const [activeTab, setActiveTab] = useState<'landing' | 'chains' | 'create' | 'manage' | 'verify' | 'history' | 'mytokens'>('landing');
  const [selectedChain, setSelectedChain] = useState<'solana' | 'ethereum'>('solana');
  const [selectedNetwork, setSelectedNetwork] = useState<'devnet' | 'localnet' | 'mainnet'>('devnet');
  const [transactionHistory, setTransactionHistory] = useState<TransactionResponse[]>([]);
  const [cardClass, setCardClass] = useState<string>('ux-card-enter ux-card-enter-active');

  useEffect(() => {
    const storedHistory = localStorage.getItem('transactionHistory');
    if (storedHistory) {
      setTransactionHistory(JSON.parse(storedHistory));
    }
  }, []);

  const addTransactionToHistory = (tx: TransactionResponse) => {
    const newHistory = [...transactionHistory, tx];
    setTransactionHistory(newHistory);
    localStorage.setItem('transactionHistory', JSON.stringify(newHistory));
  };

  const networkOptions = [
    { label: 'Devnet', value: 'devnet' },
    { label: 'Localnet', value: 'localnet' },
    { label: 'Mainnet', value: 'mainnet' },
  ];

  let endpoint = getConfigForNetwork(selectedNetwork).network.endpoint;
  // Fallback to devnet if endpoint is invalid
  if (!endpoint || (!endpoint.startsWith('http://') && !endpoint.startsWith('https://'))) {
    console.warn('Invalid endpoint for network', selectedNetwork, '->', endpoint, '. Falling back to devnet.');
    endpoint = 'https://api.devnet.solana.com';
  }
  console.log('Using Solana endpoint:', endpoint);

  return (
    <ToastProvider>
      <NetworkActivityProvider>
        <WalletContextProvider endpoint={endpoint}>
          <div className="App">
            <NetworkIndicator />
            <header className="App-header">
              <div className="app-content">
                <h1>Solana SPL Token Manager</h1>
                <div className="app-nav" style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    {selectedChain === 'solana' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label htmlFor="network-select" style={{ marginRight: 8, color: '#14f195' }}>Select Network:</label>
                        <select
                          id="network-select"
                          value={selectedNetwork}
                          onChange={e => setSelectedNetwork(e.target.value as 'devnet' | 'localnet' | 'mainnet')}
                          style={{ padding: '6px 12px', borderRadius: 8, background: '#151821', color: '#e8e8e8', border: '1px solid #232836' }}
                        >
                          {networkOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="app-tabs" style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setActiveTab('mytokens');
                          setCardClass('ux-card-enter');
                          requestAnimationFrame(() => setCardClass('ux-card-enter ux-card-enter-active'));
                        }}
                        className="ux-button"
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          border: '1px solid #232836',
                          background: activeTab === 'mytokens' ? '#2a2f3d' : 'transparent',
                          color: '#fff',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        My Tokens
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('landing');
                          setCardClass('ux-card-enter');
                          requestAnimationFrame(() => setCardClass('ux-card-enter ux-card-enter-active'));
                        }}
                        className="ux-button"
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          border: '1px solid #232836',
                          background: activeTab === 'landing' ? '#2a2f3d' : 'transparent',
                          color: '#fff',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Home
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('chains');
                          setCardClass('ux-card-enter');
                          requestAnimationFrame(() => setCardClass('ux-card-enter ux-card-enter-active'));
                        }}
                        className="ux-button"
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          border: '1px solid #232836',
                          background: activeTab === 'chains' ? '#2a2f3d' : 'transparent',
                          color: '#fff',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Chains
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('create');
                          setCardClass('ux-card-enter');
                          requestAnimationFrame(() => setCardClass('ux-card-enter ux-card-enter-active'));
                        }}
                        className="ux-button"
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          border: '1px solid #232836',
                          background: activeTab === 'create' ? '#14f195' : 'transparent',
                          color: activeTab === 'create' ? '#222' : '#fff',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('manage');
                          setCardClass('ux-card-enter');
                          requestAnimationFrame(() => setCardClass('ux-card-enter ux-card-enter-active'));
                        }}
                        className="ux-button"
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          border: '1px solid #232836',
                          background: activeTab === 'manage' ? '#2a2f3d' : 'transparent',
                          color: '#fff',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Manage
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('verify');
                          setCardClass('ux-card-enter');
                          requestAnimationFrame(() => setCardClass('ux-card-enter ux-card-enter-active'));
                        }}
                        className="ux-button"
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          border: '1px solid #232836',
                          background: activeTab === 'verify' ? '#2a2f3d' : 'transparent',
                          color: '#fff',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('history');
                          setCardClass('ux-card-enter');
                          requestAnimationFrame(() => setCardClass('ux-card-enter ux-card-enter-active'));
                        }}
                        className="ux-button"
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          border: '1px solid #232836',
                          background: activeTab === 'history' ? '#2a2f3d' : 'transparent',
                          color: '#fff',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        History
                      </button>
                    </div>
                  </div>
                </div>
                {selectedChain === 'solana' && (
                  <div style={{
                    background: '#151821',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '14px',
                    color: '#14f195',
                    border: '1px solid #232836'
                  }}>
                    Selected Network: {selectedNetwork}
                  </div>
                )}
                {selectedChain === 'solana' ? <WalletConnect /> : <EvmWalletConnect />}

                <div className="shuffle-stage">
                  <div className={`shuffle-card ${cardClass}`} key={activeTab}>
                    {activeTab === 'landing' && (
                      <LandingPage setActiveTab={setActiveTab} setCardClass={setCardClass} />
                    )}
                    {activeTab === 'chains' && (
                      <div style={{ display: 'grid', gap: 16 }}>
                        <h2 style={{ margin: 0 }}>Select Blockchain</h2>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setSelectedChain('solana')}
                            className="ux-button"
                            style={{
                              flex: 1,
                              minWidth: 220,
                              padding: '16px',
                              borderRadius: 12,
                              border: '1px solid #232836',
                              background: selectedChain === 'solana' ? '#122b24' : '#11161f',
                              color: '#e8e8e8',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#14f195' }}>Solana</div>
                            <div style={{ fontSize: 12, color: '#9aa4b2' }}>Fast, low-fee SPL token flows</div>
                          </button>
                          <button
                            onClick={() => setSelectedChain('ethereum')}
                            className="ux-button"
                            style={{
                              flex: 1,
                              minWidth: 220,
                              padding: '16px',
                              borderRadius: 12,
                              border: '1px solid #232836',
                              background: selectedChain === 'ethereum' ? '#1c1f28' : '#11161f',
                              color: '#e8e8e8',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#82aaff' }}>Ethereum</div>
                            <div style={{ fontSize: 12, color: '#9aa4b2' }}>ERC-20 mint/burn/airdrop (coming soon)</div>
                          </button>
                        </div>
                        <div style={{ fontSize: 12, color: '#9aa4b2' }}>
                          Chain selection affects which features are available in tabs below.
                        </div>
                      </div>
                    )}
                    {activeTab === 'create' && (
                      selectedChain === 'solana' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <TokenMint selectedNetwork={selectedNetwork} onTransaction={addTransactionToHistory} />
                        </div>
                      ) : (
                        <Erc20Create />
                      )
                    )}
                    {activeTab === 'manage' && (
                      selectedChain === 'solana' ? (
                        <div style={{ display: 'grid', gap: 16 }}>
                          <TokenBurn />
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <AirdropSol />
                            <TokenAirdrop />
                          </div>
                        </div>
                      ) : (
                        <Erc20Manage />
                      )
                    )}
                    {activeTab === 'mytokens' && (
                      <TokenOverview />
                    )}
                    {activeTab === 'verify' && (
                      selectedChain === 'solana' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <VerifyToken />
                        </div>
                      ) : (
                        <Erc20Verify />
                      )
                    )}
                    {activeTab === 'history' && (
                      selectedChain === 'solana' ? (
                        <TransactionHistory history={transactionHistory} selectedNetwork={selectedNetwork} />
                      ) : (
                        <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: 16, color: '#e8e8e8' }}>
                          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Ethereum History (Coming Soon)</h3>
                          <div style={{ fontSize: 14, color: '#9aa4b2' }}>Your Ethereum transaction history will appear here.</div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </header>
          </div>
        </WalletContextProvider>
      </NetworkActivityProvider>
    </ToastProvider>
  );
}

export default App;
