export interface TransactionResponse {
  status: 'success' | 'error';
  timestamp: number;
  signature?: string;
  error?: {
    code: string;
    message: string;
    data?: any;
  };
  logs?: string[];
}

export interface ErrorMapping {
  message: string;
  solution: string;
}

export const ERROR_MAPPINGS: Record<string, ErrorMapping> = {
  AccountNotFound: {
    message: "Wallet has insufficient SOL balance",
    solution: "Run 'solana airdrop 2' in terminal to get more SOL"
  },
  WalletNotConnected: {
    message: "Wallet is not connected",
    solution: "Connect your wallet and ensure it's on the correct network"
  },
  SimulationFailed: {
    message: "Transaction simulation failed",
    solution: "Check your wallet has sufficient SOL and is on the correct network"
  },
  default: {
    message: "An error occurred",
    solution: "Please try again or check your wallet configuration"
  }
};