import React, { useState, useEffect, useMemo } from 'react';
import type { TransactionResponse } from '../types/transaction';
import { ERROR_MAPPINGS } from '../types/transaction';
import type { ToastType } from './Toast';

interface TransactionInfoProps {
  response: TransactionResponse;
  showToast?: (type: ToastType, message: string) => void;
  compact?: boolean;
  selectedNetwork?: 'devnet' | 'localnet' | 'mainnet';
}

const TransactionInfo: React.FC<TransactionInfoProps> = ({ response, showToast, compact, selectedNetwork }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);

  const mintAddress = useMemo(() => {
    if (response.status !== 'success') return null;
    if (!response.logs || response.logs.length === 0) return null;
    const mintLine = response.logs.find(l => l.toLowerCase().startsWith('mint address:'));
    if (!mintLine) return null;
    const parts = mintLine.split(':');
    const addr = parts[1]?.trim();
    return addr && addr.length > 20 ? addr : null;
  }, [response]);

  useEffect(() => {
    if (showToast) {
      if (response.status === 'success') {
        showToast('success', 'Transaction successful');
      } else if (response.status === 'error') {
        showToast('error', response.error?.message || 'Transaction failed');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response.status]);

  const getErrorInfo = () => {
    if (!response.error) return null;
    const errorCode = response.error.data?.err || 'default';
    return ERROR_MAPPINGS[errorCode] || ERROR_MAPPINGS.default;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getExplorerUrl = (signature: string) => {
    if (!selectedNetwork || selectedNetwork === 'localnet') {
      return null;
    }
    let url = `https://explorer.solana.com/tx/${signature}`;
    if (selectedNetwork !== 'mainnet') {
      url += `?cluster=${selectedNetwork}`;
    }
    return url;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (response.status === 'success') {
    return (
      <div className="ux-mount-highlight" style={{
        background: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '16px',
        marginTop: compact ? 6 : '16px',
        fontSize: compact ? 12 : 14
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ color: '#14f195', fontSize: compact ? '16px' : '20px' }}>✓</span>
          <span style={{ color: '#fff', fontWeight: 600 }}>Transaction Successful</span>
        </div>

        <div style={{ color: '#ccc', fontSize: compact ? '12px' : '14px', marginBottom: '8px' }}>
          <strong>Time:</strong> {formatTimestamp(response.timestamp)}
        </div>

        {response.signature && (
          <div style={{ color: '#ccc', fontSize: compact ? '12px' : '14px', marginBottom: '8px' }}>
            <strong>Signature:</strong>{' '}
            <span style={{ color: '#14f195', wordBreak: 'break-all' }}>
              {response.signature}
            </span>
            <button
              onClick={() => copyToClipboard(response.signature!)}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                marginLeft: '8px',
                padding: '4px',
                fontSize: 16
              }}
            >📋</button>
            {getExplorerUrl(response.signature) && (
              <a
                href={getExplorerUrl(response.signature)!}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#14f195',
                  marginLeft: '10px',
                  textDecoration: 'underline'
                }}
              >
                View on Explorer
              </a>
            )}
          </div>
        )}

        {response.logs && response.logs.length > 0 && !compact && (
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: 'none',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#14f195',
                cursor: 'pointer',
                padding: '4px 8px',
                fontSize: compact ? 10 : 12
              }}>{showDetails ? 'Hide Details ▲' : 'View Details ▼'}</button>
            {showDetails && (
              <pre style={{
                background: '#111',
                padding: '12px',
                borderRadius: '4px',
                marginTop: '8px',
                overflow: 'auto',
                fontSize: compact ? 10 : 12,
                color: '#ccc'
              }}>{response.logs.join('\n')}</pre>
            )}
            {mintAddress && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowTokenModal(true)}
                  style={{
                    background: 'none',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#e8e8e8',
                    cursor: 'pointer',
                    padding: '6px 10px',
                    fontSize: 12
                  }}
                >Show Token Details</button>
                <a
                  href={`https://explorer.solana.com/address/${mintAddress}` + (selectedNetwork && selectedNetwork !== 'mainnet' ? `?cluster=${selectedNetwork}` : '')}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: '#14f195', fontSize: 12 }}
                >Explorer</a>
                <a
                  href={`https://solscan.io/token/${mintAddress}` + (selectedNetwork && selectedNetwork !== 'mainnet' ? `?cluster=${selectedNetwork}` : '')}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: '#14f195', fontSize: 12 }}
                >Solscan</a>
                <a
                  href={`https://birdeye.so/token/${mintAddress}?chain=solana`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: '#14f195', fontSize: 12 }}
                >Birdeye Chart</a>
                <a
                  href={`https://dexscreener.com/solana/${mintAddress}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: '#14f195', fontSize: 12 }}
                >Dexscreener</a>
              </div>
            )}
          </div>
        )}
        {showTokenModal && mintAddress && (
          <div className="ux-fade-in" style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div className="ux-pop-in" style={{
              width: '95%', maxWidth: 560, background: '#191b20', border: '1px solid #232836', borderRadius: 12, padding: 16, color: '#e8e8e8', position: 'relative'
            }}>
              <button onClick={() => setShowTokenModal(false)} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: '#e8e8e8', fontSize: 22, cursor: 'pointer' }}>×</button>
              <h3 style={{ marginTop: 0, marginBottom: 8, color: '#14f195' }}>Token Details</h3>
              <div style={{ fontSize: 12, color: '#9aa4b2', marginBottom: 8 }}>Mint Address</div>
              <div style={{ wordBreak: 'break-all', background: '#11161f', border: '1px solid #232836', borderRadius: 8, padding: 10, fontSize: 13 }}>{mintAddress}</div>
              <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                <a href={`https://explorer.solana.com/address/${mintAddress}` + (selectedNetwork && selectedNetwork !== 'mainnet' ? `?cluster=${selectedNetwork}` : '')} target="_blank" rel="noopener noreferrer" style={{ color: '#14f195' }}>Open in Solana Explorer</a>
                <a href={`https://solscan.io/token/${mintAddress}` + (selectedNetwork && selectedNetwork !== 'mainnet' ? `?cluster=${selectedNetwork}` : '')} target="_blank" rel="noopener noreferrer" style={{ color: '#14f195' }}>Open in Solscan</a>
                <a href={`https://birdeye.so/token/${mintAddress}?chain=solana`} target="_blank" rel="noopener noreferrer" style={{ color: '#14f195' }}>View Birdeye Price Chart</a>
                <a href={`https://dexscreener.com/solana/${mintAddress}`} target="_blank" rel="noopener noreferrer" style={{ color: '#14f195' }}>View Dexscreener Pairs</a>
              </div>
              {response.logs && (
                <div style={{ marginTop: 12, background: '#111', border: '1px solid #333', borderRadius: 8, padding: 12 }}>
                  <div style={{ color: '#9aa4b2', fontSize: 12, marginBottom: 6 }}>Summary</div>
                  <div style={{ color: '#e8e8e8', fontSize: 13 }}>
                    {response.logs.find(l => l.startsWith('Total supply:')) || 'Supply: (check explorer)'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Error state
  const errorInfo = getErrorInfo();

  return (
    <div className="ux-mount-highlight" style={{
      background: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '8px',
      padding: '16px',
      marginTop: compact ? 6 : '16px',
      fontSize: compact ? 12 : 14
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ color: '#ff5252', fontSize: compact ? '16px' : '20px' }}>×</span>
        <span style={{ color: '#ff5252', fontWeight: 600 }}>Transaction Failed</span>
      </div>

      <div style={{ color: '#ff5252', fontSize: compact ? '12px' : '14px', marginBottom: '12px' }}>
        {errorInfo?.message || response.error?.message}
      </div>

      {errorInfo?.solution && !compact && (
        <div style={{
          background: '#333',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '12px',
          color: '#fff',
          fontSize: compact ? 10 : 14
        }}>
          <div style={{ color: '#14f195', marginBottom: '4px', fontSize: compact ? 10 : 14 }}>💡 Solution:</div>
          <div>{errorInfo.solution}</div>
        </div>
      )}

      <div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            background: 'none',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#ccc',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: compact ? 10 : 12
          }}>
          {showDetails ? 'Hide Technical Details ▲' : 'View Technical Details ▼'}
        </button>
        {showDetails && (
          <pre style={{
            background: '#111',
            padding: '12px',
            borderRadius: '4px',
            marginTop: '8px',
            overflow: 'auto',
            fontSize: compact ? 10 : 12,
            color: '#ccc'
          }}>{JSON.stringify(response.error, null, 2)}</pre>
        )}
      </div>
    </div>
  );
};

export default TransactionInfo;