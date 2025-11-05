import React, { useState } from 'react';
import { ERC20_ABI, getInjectedProvider, loadEthersSafely } from '../../utils/evm';

const Erc20Create: React.FC = () => {
  const [tokenAddress, setTokenAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [status, setStatus] = useState<string>('');

  const handleMint = async () => {
    setStatus('');
    const ethers = await loadEthersSafely();
    if (!ethers) {
      alert('Please install ethers (npm i ethers)');
      return;
    }
    const provider = getInjectedProvider();
    if (!provider) {
      alert('MetaMask not detected');
      return;
    }
    if (!ethers.isAddress(tokenAddress)) {
      alert('Invalid token address');
      return;
    }
    try {
      const eProvider = new ethers.BrowserProvider(provider);
      const signer = await eProvider.getSigner();
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const decimals: number = await contract.decimals();
      const amt = ethers.parseUnits(String(amount), decimals);
      const tx = await contract.mint(toAddress || (await signer.getAddress()), amt);
      setStatus('Sending mint transaction...');
      await tx.wait();
      setStatus('Mint successful');
    } catch (e: any) {
      setStatus('Mint failed: ' + (e?.message || 'Unknown error'));
    }
  };

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: 16, color: '#e8e8e8' }}>
      <h2 style={{ marginTop: 0 }}>Create / Mint ERC-20</h2>
      <div style={{ fontSize: 12, color: '#9aa4b2', marginBottom: 12 }}>
        Provide an existing ERC-20 token address with a mint function (ERC20Mintable). You must be authorized to mint.
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Token Address</label>
          <input value={tokenAddress} onChange={e => setTokenAddress(e.target.value)} placeholder="0x..." style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #333', background: '#11161f', color: '#e8e8e8' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Recipient Address</label>
            <input value={toAddress} onChange={e => setToAddress(e.target.value)} placeholder="0x... (optional)" style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #333', background: '#11161f', color: '#e8e8e8' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Amount</label>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} placeholder="1000" style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #333', background: '#11161f', color: '#e8e8e8' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <a href="https://wizard.openzeppelin.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#14f195' }}>Open OpenZeppelin Wizard</a>
          <a href="https://remix.ethereum.org/" target="_blank" rel="noopener noreferrer" style={{ color: '#14f195' }}>Open Remix</a>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleMint} className="ux-button" style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #232836', background: '#14f195', color: '#222', fontWeight: 800 }}>Mint</button>
        </div>
        {status && <div style={{ fontSize: 12, color: '#9aa4b2' }}>{status}</div>}
      </div>
    </div>
  );
};

export default Erc20Create;


