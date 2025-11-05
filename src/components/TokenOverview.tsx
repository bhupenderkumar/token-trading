import React, { useEffect, useState } from 'react';
import VerifyToken from './VerifyToken';
import TokenBurn from './TokenBurn'; // Import the new TokenBurn component
import { useWallet } from '@solana/wallet-adapter-react';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// ... (keep BurnDialogInfo as it is if it's used elsewhere, or remove if not)

interface TokenMeta {
  mint: string;
  name: string;
  symbol: string;
  image?: string;
  url?: string;
  totalSupply?: string;
  decimals?: number;
  network?: string;
}

const TokenOverview: React.FC<{ selectedNetwork?: string }> = ({ selectedNetwork = 'devnet' }) => {
  const [tokens, setTokens] = useState<TokenMeta[]>([]);
  const [selected, setSelected] = useState<TokenMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [burnMint, setBurnMint] = useState<string | null>(null); // To track which token to burn
  const [sourceMode, setSourceMode] = useState<'wallet' | 'local'>('wallet');
  const { publicKey } = useWallet();

  useEffect(() => {
    setLoading(true);
    const fetchTokens = async () => {
      if (sourceMode === 'local') {
        // Legacy: fetch from localStorage
        const local = localStorage.getItem('createdTokens');
        let tokensArr: TokenMeta[] = [];
        if (local) {
          tokensArr = JSON.parse(local);
          tokensArr = tokensArr.filter(t => !t.network || t.network === selectedNetwork);
        }
        // Always fetch latest total supply from chain for each token
        try {
          const web3 = await import('@solana/web3.js');
          const validCluster = ['devnet', 'testnet', 'mainnet-beta'].includes(selectedNetwork)
            ? selectedNetwork as 'devnet' | 'testnet' | 'mainnet-beta'
            : 'devnet';
          const connection = new web3.Connection(web3.clusterApiUrl(validCluster));
          for (let i = 0; i < tokensArr.length; i++) {
            try {
              const mintPubkey = new web3.PublicKey(tokensArr[i].mint);
              const supplyInfo = await connection.getTokenSupply(mintPubkey);
              tokensArr[i].totalSupply = supplyInfo.value.uiAmountString ?? supplyInfo.value.amount;
              tokensArr[i].network = selectedNetwork;
            } catch {}
          }
        } catch {}
        setTokens(tokensArr);
        setLoading(false);
        return;
      }
      // Wallet mode: fetch from blockchain
      if (!publicKey) {
        setTokens([]);
        setLoading(false);
        return;
      }
      try {
        const web3 = await import('@solana/web3.js');
        const validCluster = ['devnet', 'testnet', 'mainnet-beta'].includes(selectedNetwork)
          ? selectedNetwork as 'devnet' | 'testnet' | 'mainnet-beta'
          : 'devnet';
        const connection = new web3.Connection(web3.clusterApiUrl(validCluster));
        const resp = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID });
        const tokenAccounts = resp.value;
        const tokensArr: TokenMeta[] = [];
        const { Metadata } = await import('@metaplex-foundation/mpl-token-metadata');
        const METADATA_PROGRAM_ID = new web3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
        for (const acc of tokenAccounts) {
          const info = acc.account.data.parsed.info;
          const mint = info.mint;
          const decimals = info.tokenAmount.decimals;
          let name = '';
          let symbol = '';
          let totalSupply = '';
          try {
            // Fetch latest total supply from chain
            const mintPubkey = new web3.PublicKey(mint);
            const supplyInfo = await connection.getTokenSupply(mintPubkey);
            totalSupply = supplyInfo.value.uiAmountString ?? supplyInfo.value.amount;
          } catch {}
          try {
            const [metadataPDA] = await web3.PublicKey.findProgramAddress(
              [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), new web3.PublicKey(mint).toBuffer()],
              METADATA_PROGRAM_ID
            );
            const metadataAcc = await connection.getAccountInfo(metadataPDA);
            if (metadataAcc?.data) {
              const [metadata] = Metadata.deserialize(metadataAcc.data);
              name = metadata.data.name.replace(/\0/g, '');
              symbol = metadata.data.symbol.replace(/\0/g, '');
            }
          } catch (e) {
            // Metadata fetch failed, fallback to empty
          }
          tokensArr.push({
            mint,
            name,
            symbol,
            totalSupply,
            decimals,
            network: selectedNetwork
          });
        }
        setTokens(tokensArr);
      } catch (e) {
        setTokens([]);
      }
      setLoading(false);
    };
    fetchTokens();
  }, [publicKey, selectedNetwork, sourceMode]);

  const handleBurnComplete = async () => {
    setBurnMint(null); // Hide the burn component
    // Refresh token list from chain
    if (publicKey) {
      setLoading(true);
      try {
        const web3 = await import('@solana/web3.js');
        const validCluster = ['devnet', 'testnet', 'mainnet-beta'].includes(selectedNetwork)
          ? selectedNetwork as 'devnet' | 'testnet' | 'mainnet-beta'
          : 'devnet';
        const connection = new web3.Connection(web3.clusterApiUrl(validCluster));
  const resp = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID });
        const tokenAccounts = resp.value;
        const tokensArr: TokenMeta[] = [];
        for (const acc of tokenAccounts) {
          const info = acc.account.data.parsed.info;
          const mint = info.mint;
          const amount = info.tokenAmount.uiAmountString;
          const decimals = info.tokenAmount.decimals;
          tokensArr.push({
            mint,
            name: '',
            symbol: '',
            totalSupply: amount,
            decimals
          });
        }
        setTokens(tokensArr);
      } catch (e) {
        setTokens([]);
      }
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#181a20', borderRadius: 12, padding: 24, color: '#e8e8e8', maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ color: '#14f195', marginBottom: 20 }}>My Created Tokens</h2>
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="sourceMode" style={{ marginRight: 8 }}>Source:</label>
        <select
          id="sourceMode"
          value={sourceMode}
          onChange={e => setSourceMode(e.target.value as 'wallet' | 'local')}
          style={{ padding: '6px 12px', borderRadius: 6, background: '#222', color: '#14f195', border: '1px solid #333' }}
        >
          <option value="wallet">Wallet (Live)</option>
          <option value="local">Local Storage (Legacy)</option>
        </select>
      </div>
      {loading ? <div>Loading...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#222', borderRadius: 8 }}>
          <thead>
            <tr style={{ background: '#232836', color: '#14f195' }}>
              <th style={{ padding: 10 }}>Mint</th>
              <th style={{ padding: 10 }}>Name</th>
              <th style={{ padding: 10 }}>Symbol</th>
              <th style={{ padding: 10 }}>Image</th>
              <th style={{ padding: 10 }}>URL</th>
              <th style={{ padding: 10 }}>Total Supply</th>
              <th style={{ padding: 10 }}>Decimals</th>
              <th style={{ padding: 10 }}>Network</th>
              <th style={{ padding: 10 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tokens.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: '#9aa4b2' }}>No tokens found</td></tr>
            )}
            {tokens.map((token) => (
              <tr key={token.mint} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: 8, fontSize: 12 }}>{token.mint}</td>
                <td style={{ padding: 8 }}>{token.name}</td>
                <td style={{ padding: 8 }}>{token.symbol}</td>
                <td style={{ padding: 8 }}>{token.image ? <img src={token.image} alt={token.symbol} style={{ width: 32, height: 32, borderRadius: 6 }} /> : '-'}</td>
                <td style={{ padding: 8 }}>{token.url ? <a href={token.url} target="_blank" rel="noopener noreferrer" style={{ color: '#14f195' }}>Link</a> : '-'}</td>
                <td style={{ padding: 8 }}>{token.totalSupply ?? '-'}</td>
                <td style={{ padding: 8 }}>{token.decimals ?? '-'}</td>
                <td style={{ padding: 8 }}>{token.network ?? selectedNetwork}</td>
                <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                  <button className="ux-button" onClick={() => setSelected(token)} style={{ fontSize: 12, padding: '4px 10px' }}>View</button>
                  <button className="ux-button" style={{ fontSize: 12, padding: '4px 10px', background: '#f14444', color: '#fff' }}
                    onClick={() => setBurnMint(token.mint)}>
                    Burn
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Render TokenBurn component when a mint is selected for burning */}
      {burnMint && (
        <div style={{ marginTop: 32 }}>
          <TokenBurn mintAddress={burnMint} onBurnComplete={handleBurnComplete} />
          <button className="ux-button" style={{ marginTop: 16 }} onClick={() => setBurnMint(null)}>Cancel</button>
        </div>
      )}

      {selected && !burnMint && (
        <div style={{ marginTop: 32 }}>
          <div style={{ marginBottom: 12, color: '#fff' }}>
            <b>Mint Address:</b> {selected.mint}
          </div>
          <VerifyToken />
          <button className="ux-button" style={{ marginTop: 16 }} onClick={() => setSelected(null)}>Close</button>
        </div>
      )}
    </div>
  );
};

export default TokenOverview;