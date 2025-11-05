import React, { useCallback, useMemo, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

type LargestAccount = {
  address: string;
  amount: string;
  uiAmountString?: string;
  owner?: string;
};

const VerifyToken: React.FC = () => {
  const { connection } = useConnection();
  const [mint, setMint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalSupply, setTotalSupply] = useState<string | null>(null);
  const [decimals, setDecimals] = useState<number | null>(null);
  const [largest, setLargest] = useState<LargestAccount[]>([]);

  const isLocalhost = useMemo(
    () => connection.rpcEndpoint.includes('localhost') || connection.rpcEndpoint.includes('127.0.0.1'),
    [connection.rpcEndpoint]
  );

  const onVerify = useCallback(async () => {
    setError(null);
    setTotalSupply(null);
    setDecimals(null);
    setLargest([]);
    if (!mint) {
      setError('Enter a mint address');
      return;
    }
    let mintPk: PublicKey;
    try {
      mintPk = new PublicKey(mint);
    } catch {
      setError('Invalid mint address');
      return;
    }
    setLoading(true);
    try {
      // 1) Total supply
      const supply = await connection.getTokenSupply(mintPk);
      setTotalSupply(supply.value.uiAmountString ?? supply.value.amount);
      setDecimals(supply.value.decimals ?? null);
      // Update localStorage with latest supply and decimals for this mint
      const local = localStorage.getItem('createdTokens');
      if (local) {
        const tokensArr = JSON.parse(local);
        const idx = tokensArr.findIndex((t: any) => t.mint === mint);
        if (idx !== -1) {
          tokensArr[idx].totalSupply = supply.value.uiAmountString ?? supply.value.amount;
          tokensArr[idx].decimals = supply.value.decimals ?? null;
          // Remove tokens with zero supply after update
          const filtered = tokensArr.filter((t: any) => t.totalSupply && Number(t.totalSupply) > 0);
          localStorage.setItem('createdTokens', JSON.stringify(filtered));
        }
      }

      // 2) Largest token accounts for this mint
      const largestResp = await connection.getTokenLargestAccounts(mintPk);
      const top = largestResp.value.slice(0, 10);

      // 3) Resolve owners of these token accounts via parsed account info
      const enriched: LargestAccount[] = [];
      for (const acc of top) {
        try {
          const info = await connection.getParsedAccountInfo(new PublicKey(acc.address));
          let owner: string | undefined = undefined;
          const data: any = info.value?.data;
          if (data && data.parsed && data.parsed.info && data.parsed.info.owner) {
            owner = data.parsed.info.owner as string;
          }
          enriched.push({
            address: acc.address.toBase58 ? acc.address.toBase58() : String(acc.address),
            amount: acc.amount,
            uiAmountString: acc.uiAmountString,
            owner
          });
        } catch {
          enriched.push({
            address: acc.address.toBase58 ? acc.address.toBase58() : String(acc.address),
            amount: acc.amount,
            uiAmountString: acc.uiAmountString
          });
        }
      }
      setLargest(enriched);
    } catch (e: any) {
      setError(e?.message || 'Failed to verify token');
    } finally {
      setLoading(false);
    }
  }, [connection, mint]);

  return (
    <div style={{ background: '#222', borderRadius: 12, padding: 16, border: '1px solid #333', width: '100%' }}>
      <div style={{ color: '#fff', marginBottom: 8, fontWeight: 700 }}>Verify Token (Live)</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Mint address"
          value={mint}
          onChange={(e) => setMint(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #444', background: '#333', color: '#fff' }}
        />
        <button
          onClick={onVerify}
          disabled={loading}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: loading ? '#0c9b5e' : '#14f195',
            color: '#222',
            fontWeight: 700,
            cursor: !loading ? 'pointer' : 'not-allowed'
          }}
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </div>

      {error && (
        <div style={{ color: '#ff6b6b', fontSize: 12, marginBottom: 8 }}>{error}</div>
      )}

      {(totalSupply || decimals !== null) && (
        <div style={{ color: '#ccc', fontSize: 14, marginBottom: 12 }}>
          <div><span style={{ color: '#fff' }}>Network:</span> {isLocalhost ? 'Localnet' : 'Devnet/Mainnet'}</div>
          {decimals !== null && <div><span style={{ color: '#fff' }}>Decimals:</span> {decimals}</div>}
          {totalSupply && <div><span style={{ color: '#fff' }}>Total Supply:</span> {totalSupply}</div>}
        </div>
      )}

      {largest.length > 0 && (
        <div style={{ color: '#ccc', fontSize: 14 }}>
          <div style={{ color: '#fff', marginBottom: 6 }}>Top Accounts (by amount)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            {largest.map((acc, idx) => (
              <div key={idx} style={{ border: '1px solid #333', borderRadius: 8, padding: 10, background: '#1a1a1a' }}>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Account</div>
                <div style={{ wordBreak: 'break-all', color: '#fff' }}>{acc.address}</div>
                {acc.owner && (
                  <div style={{ marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: '#999' }}>Owner</span>
                    <div style={{ wordBreak: 'break-all', color: '#fff' }}>{acc.owner}</div>
                  </div>
                )}
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: '#999' }}>Amount</span>
                  <div style={{ color: '#14f195' }}>{acc.uiAmountString ?? acc.amount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyToken;


