import React, { useState } from 'react';
import { ERC20_ABI, getInjectedProvider, loadEthersSafely } from '../../utils/evm';

const Erc20Manage: React.FC = () => {
  const [tokenAddress, setTokenAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [airdropList, setAirdropList] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const withContract = async (cb: (contract: any, ethers: any) => Promise<void>) => {
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
    const eProvider = new ethers.BrowserProvider(provider);
    const signer = await eProvider.getSigner();
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    await cb(contract, ethers);
  };

  const handleBurn = async () => {
    setStatus('');
    await withContract(async (contract, ethers) => {
      const decimals: number = await contract.decimals();
      const amt = ethers.parseUnits(String(amount), decimals);
      try {
        const tx = await contract.burn(amt);
        setStatus('Burning...');
        await tx.wait();
        setStatus('Burn successful');
      } catch (e: any) {
        setStatus('Burn failed: ' + (e?.message || 'Unknown error'));
      }
    });
  };

  const handleTransfer = async () => {
    setStatus('');
    await withContract(async (contract, ethers) => {
      if (!recipient) { setStatus('Recipient required'); return; }
      const decimals: number = await contract.decimals();
      const amt = ethers.parseUnits(String(amount), decimals);
      try {
        const tx = await contract.transfer(recipient, amt);
        setStatus('Transferring...');
        await tx.wait();
        setStatus('Transfer successful');
      } catch (e: any) {
        setStatus('Transfer failed: ' + (e?.message || 'Unknown error'));
      }
    });
  };

  const handleAirdrop = async () => {
    setStatus('');
    const lines = airdropList.split(/\n|,|;/).map(s => s.trim()).filter(Boolean);
    const pairs: { to: string; amount: number }[] = [];
    for (const line of lines) {
      const [to, amtStr] = line.split(/\s+/);
      const amt = Number(amtStr);
      if (to && !isNaN(amt)) pairs.push({ to, amount: amt });
    }
    if (pairs.length === 0) { setStatus('No valid airdrop entries'); return; }
    await withContract(async (contract, ethers) => {
      const decimals: number = await contract.decimals();
      try {
        for (const { to, amount } of pairs) {
          const amt = ethers.parseUnits(String(amount), decimals);
          const tx = await contract.transfer(to, amt);
          setStatus(`Transferring to ${to.slice(0,6)}…${to.slice(-4)}...`);
          await tx.wait();
        }
        setStatus('Airdrop complete');
      } catch (e: any) {
        setStatus('Airdrop failed: ' + (e?.message || 'Unknown error'));
      }
    });
  };

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: 16, color: '#e8e8e8' }}>
      <h2 style={{ marginTop: 0 }}>Manage ERC-20</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Token Address</label>
          <input value={tokenAddress} onChange={e => setTokenAddress(e.target.value)} placeholder="0x..." style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #333', background: '#11161f', color: '#e8e8e8' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Recipient</label>
            <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="0x..." style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #333', background: '#11161f', color: '#e8e8e8' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Amount</label>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} placeholder="100" style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #333', background: '#11161f', color: '#e8e8e8' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={handleTransfer} className="ux-button" style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #232836', background: '#14f195', color: '#222', fontWeight: 800 }}>Transfer</button>
          <button onClick={handleBurn} className="ux-button" style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #232836', background: '#f14444', color: '#fff', fontWeight: 800 }}>Burn</button>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Airdrop List (address amount per line)</label>
          <textarea value={airdropList} onChange={e => setAirdropList(e.target.value)} rows={4} placeholder={'0xabc... 10\n0xdef... 20'} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #333', background: '#11161f', color: '#e8e8e8', resize: 'vertical' }} />
        </div>
        <div>
          <button onClick={handleAirdrop} className="ux-button" style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #232836', background: '#11161f', color: '#e8e8e8' }}>Run Airdrop</button>
        </div>
        {status && <div style={{ fontSize: 12, color: '#9aa4b2' }}>{status}</div>}
      </div>
    </div>
  );
};

export default Erc20Manage;


