import React, { useEffect, useState } from 'react';
import { getInjectedProvider, loadEthersSafely } from '../../utils/evm';

const EvmWalletConnect: React.FC = () => {
  const [address, setAddress] = useState<string>('');
  const [networkName, setNetworkName] = useState<string>('');
  const [missingEthers, setMissingEthers] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const ethers = await loadEthersSafely();
      if (!ethers) {
        setMissingEthers(true);
        return;
      }
      const provider = getInjectedProvider();
      if (!provider) return;
      const eProvider = new ethers.BrowserProvider(provider);
      try {
        const signer = await eProvider.getSigner();
        const addr = await signer.getAddress();
        setAddress(addr);
      } catch {}
      try {
        const net = await eProvider.getNetwork();
        setNetworkName(String(net.name));
      } catch {}
    })();
  }, []);

  const connect = async () => {
    const ethers = await loadEethersOrNotify();
    if (!ethers) return;
    const provider = getInjectedProvider();
    if (!provider) {
      alert('MetaMask not detected. Please install or enable it.');
      return;
    }
    try {
      await provider.request({ method: 'eth_requestAccounts' });
      const eProvider = new ethers.BrowserProvider(provider);
      const signer = await eProvider.getSigner();
      const addr = await signer.getAddress();
      setAddress(addr);
      const net = await eProvider.getNetwork();
      setNetworkName(String(net.name));
    } catch (e: any) {
      alert('Connection failed: ' + (e?.message || 'Unknown error'));
    }
  };

  async function loadEethersOrNotify() {
    const ethers = await loadEthersSafely();
    if (!ethers) {
      setMissingEthers(true);
      alert('Dependency missing: Please install ethers (npm i ethers) to use Ethereum features.');
      return null;
    }
    return ethers;
  }

  return (
    <div style={{
      background: '#151821', border: '1px solid #232836', color: '#e8e8e8', borderRadius: 8, padding: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
    }}>
      <div>
        <div style={{ fontWeight: 700 }}>Ethereum Wallet</div>
        <div style={{ fontSize: 12, color: '#9aa4b2' }}>
          {address ? `Connected: ${address.slice(0, 6)}…${address.slice(-4)} (${networkName || 'network'})` : 'Not connected'}
        </div>
        {missingEthers && (
          <div style={{ fontSize: 12, color: '#ffb86c', marginTop: 6 }}>Install dependency: ethers</div>
        )}
      </div>
      <button onClick={connect} className="ux-button" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #232836', background: '#11161f', color: '#e8e8e8' }}>
        {address ? 'Reconnect' : 'Connect MetaMask'}
      </button>
    </div>
  );
};

export default EvmWalletConnect;


