export interface TokenConfig {
  name: string;
  symbol: string;
  description: string;
  decimals: number;
  initialSupply: number;
  image?: string;
  twitter?: string;
  website?: string;
}

interface NetworkConfig {
  endpoint: string;
  name: string;
}

interface Environment {
  network: NetworkConfig;
  defaultToken: TokenConfig;
}
const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  devnet: {
    endpoint: "https://api.devnet.solana.com",
    name: "Devnet"
  },
  localnet: {
    endpoint: "http://127.0.0.1:8899",
    name: "Localnet"
  },
  mainnet: {
    endpoint: "https://api.mainnet-beta.solana.com",
    name: "Mainnet"
  }
};

// Backup endpoints for better reliability
const BACKUP_ENDPOINTS: Record<string, string[]> = {
  devnet: [
    "https://api.devnet.solana.com",
    "https://devnet.helius-rpc.com",
    "https://rpc.ankr.com/solana_devnet"
  ],
  localnet: [
    "http://127.0.0.1:8899",
    "http://localhost:8899"
  ],
  mainnet: [
    "https://api.mainnet-beta.solana.com",
    "https://mainnet.helius-rpc.com",
    "https://rpc.ankr.com/solana"
  ]
};

// Connection configuration for different networks
export const CONNECTION_CONFIG = {
  commitment: 'confirmed' as const,
  confirmTransactionInitialTimeout: 60000,
  wsEndpoint: undefined,
  httpHeaders: {
    'Content-Type': 'application/json',
  },
  fetch: undefined,
  fetchMiddleware: undefined,
  disableRetryOnRateLimit: false,
};

// Get backup endpoints for a network
export function getBackupEndpoints(network: 'devnet' | 'localnet' | 'mainnet'): string[] {
  return BACKUP_ENDPOINTS[network] || [NETWORK_CONFIGS[network].endpoint];
}

const TOKEN_CONFIGS: Record<string, TokenConfig> = {
  devnet: {
    name: "Devnet Token",
    symbol: "DVT",
    description: "A token for Devnet",
    decimals: 9,
    initialSupply: 1000000
  },
  localnet: {
    name: "Local Token",
    symbol: "LCL",
    description: "A token for Localnet",
    decimals: 9,
    initialSupply: 1000000
  },
  mainnet: {
    name: "Mainnet Token",
    symbol: "MNT",
    description: "A token for Mainnet",
    decimals: 9,
    initialSupply: 1000000
  }
};

export function getConfigForNetwork(network: 'devnet' | 'localnet' | 'mainnet'): Environment {
  return {
    network: NETWORK_CONFIGS[network],
    defaultToken: TOKEN_CONFIGS[network]
  };
}