import { Fragment, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    CoinbaseWalletAdapter,
    TorusWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { CONNECTION_CONFIG } from './config/config';
import '@solana/wallet-adapter-react-ui/styles.css';

export const WalletContextProvider = ({ children, endpoint }: PropsWithChildren<{ endpoint: string }>) => {
    
    // Initialize wallet adapters with network-specific configurations
    const wallets = useMemo(() => {
        const network = endpoint.includes('devnet')
            ? WalletAdapterNetwork.Devnet
            : endpoint.includes('localhost') || endpoint.includes('127.0.0.1')
            ? WalletAdapterNetwork.Devnet // Use devnet config for localnet
            : WalletAdapterNetwork.Mainnet;

        return [
            new PhantomWalletAdapter({ network }),
            new SolflareWalletAdapter({ network }),
            new CoinbaseWalletAdapter(),
            new TorusWalletAdapter()
        ];
    }, [endpoint]);

    // Enhanced connection configuration
    const connectionConfig = useMemo(() => ({
        ...CONNECTION_CONFIG,
        // Add custom fetch with timeout and retry logic
        fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
            
            try {
                const response = await fetch(input, {
                    ...init,
                    signal: controller.signal,
                    headers: {
                        ...CONNECTION_CONFIG.httpHeaders,
                        ...init?.headers,
                    },
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response;
            } catch (error: any) {
                clearTimeout(timeoutId);
                
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }
                
                throw error;
            }
        }
    }), []);

    return (
        <ConnectionProvider
            endpoint={endpoint}
            config={connectionConfig}
        >
            <WalletProvider
                wallets={wallets}
                autoConnect={true}
                onError={(error) => {
                    console.error('Wallet error:', error);
                    // Don't throw here to prevent app crashes
                }}
            >
                <WalletModalProvider>
                    <Fragment>
                        {children}
                    </Fragment>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
