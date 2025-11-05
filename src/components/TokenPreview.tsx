import React from 'react';
import type { TokenConfig } from '../config/config';

interface TokenPreviewProps {
  token: TokenConfig;
  isOpen: boolean;
  onClose: () => void;
}

const TokenPreview: React.FC<TokenPreviewProps> = ({ token, isOpen, onClose }) => {
  if (!isOpen) return null;
  if (!token || !token.name || !token.symbol) {
    return null;
  }

  return (
    <div className="ux-fade-in" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div className="ux-pop-in" style={{
        background: '#23242A',
        borderRadius: 18,
        padding: 32,
        width: '95%',
        maxWidth: 420,
        maxHeight: '85vh',
        overflow: 'auto',
        position: 'relative',
        boxShadow: '0 6px 30px rgba(0,0,0,0.42)',
        border: '1.5px solid #252530'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 14,
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: 26,
            cursor: 'pointer',
            padding: 2,
            lineHeight: 1
          }}
        >
          ×
        </button>
        <h2 style={{ color: '#14f195', marginBottom: 16, textAlign: 'center', fontSize: 24, fontWeight: 800, letterSpacing: 1 }}>Token Preview</h2>
        {token.image && (
          <div style={{ 
            width: '140px',
            height: '140px',
            margin: '0 auto 24px',
            borderRadius: 16,
            overflow: 'hidden',
            border: '2px solid #444',
            background: '#19191d',
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
            <img 
              src={token.image} 
              alt={token.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 16
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
              }}
            />
          </div>
        )}
        <div style={{ 
          display: 'grid',
          gap: 14,
          color: '#fff',
          marginTop: 12
        }}>
          <PreviewItem label="Name" value={token.name} />
          <PreviewItem label="Symbol" value={token.symbol} />
          {token.description && <PreviewItem label="Description" value={token.description} />}
          <PreviewItem label="Decimals" value={token.decimals?.toString?.() ?? ''} />
          <PreviewItem label="Initial Supply" value={token.initialSupply?.toLocaleString?.() ?? ''} />
          {token.twitter && (
            <PreviewItem 
              label="Twitter" 
              value={token.twitter}
              isLink={true}
              href={`https://twitter.com/${token.twitter.replace('@', '')}`}
            />
          )}
          {token.website && (
            <PreviewItem 
              label="Website" 
              value={token.website}
              isLink={true}
              href={token.website}
            />
          )}
        </div>
      </div>
    </div>
  );
};

interface PreviewItemProps {
  label: string;
  value: string;
  isLink?: boolean;
  href?: string;
}

const PreviewItem: React.FC<PreviewItemProps> = ({ label, value, isLink, href }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ color: '#888', fontSize: 14 }}>{label}</span>
    {isLink && href ? (
      <a 
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#14f195',
          textDecoration: 'none',
          wordBreak: 'break-all'
        }}
      >
        {value}
      </a>
    ) : (
      <span style={{ 
        color: '#fff',
        wordBreak: 'break-all'
      }}>
        {value}
      </span>
    )}
  </div>
);

export default TokenPreview;