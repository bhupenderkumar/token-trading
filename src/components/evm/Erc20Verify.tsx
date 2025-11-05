import React, { useState } from 'react';
import { ERC20_ABI, getInjectedProvider, loadEthersSafely, formatEth } from '../../utils/evm';

const Erc20Verify: React.FC = () => {
  const [tokenAddress, setTokenAddress] = useState('');
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const fetchInfo = async () => {
    setError('');
    setInfo(null);
    const ethers = await loadEthersSafely();
    if (!ethers) { setError('Missing dependency: ethers'); return; }
    if (!ethers.isAddress(tokenAddress)) { setError('Invalid token address'); return; }
    try {
      const provider = getInjectedProvider();
      const eProvider = provider ? new ethers.BrowserProvider(provider) : new ethers.JsonRpcProvider();
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, eProvider);
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name(), contract.symbol(), contract.decimals(), contract.totalSupply()
      ]);
      setInfo({ name, symbol, decimals, totalSupply: totalSupply.toString() });
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch');
    }
  };

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: 16, color: '#e8e8e8' }}>
      <h2 style={{ marginTop: 0 }}>Verify ERC-20</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Token Address</label>
          <input value={tokenAddress} onChange={e => setTokenAddress(e.target.value)} placeholder="0x..." style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #333', background: '#11161f', color: '#e8e8e8' }} />
        </div>
        <div>
          <button onClick={fetchInfo} className="ux-button" style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #232836', background: '#11161f', color: '#e8e8e8' }}>Fetch</button>
        </div>
        {error && <div style={{ fontSize: 12, color: '#ffb86c' }}>{error}</div>}
        {info && (
          <div style={{ display: 'grid', gap: 8 }}>
            <div><strong>Name:</strong> {info.name}</div>
            <div><strong>Symbol:</strong> {info.symbol}</div>
            <div><strong>Decimals:</strong> {info.decimals}</div>
            <div><strong>Total Supply:</strong> {formatEth(BigInt(info.totalSupply), info.decimals)} {info.symbol}</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              <a href={`https://etherscan.io/token/${tokenAddress}`} target="_blank" rel="noopener noreferrer" style={{ color: '#14f195' }}>Etherscan</a>
              <a href={`https://dexscreener.com/ethereum/${tokenAddress}`} target="_blank" rel="noopener noreferrer" style={{ color: '#14f195' }}>Dexscreener</a>
              <a href={`https://www.dextools.io/app/en/ether/pair-explorer/${tokenAddress}`} target="_blank" rel="noopener noreferrer" style={{ color: '#14f195' }}>DEXTools</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Erc20Verify;


