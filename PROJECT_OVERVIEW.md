# Project Overview: Solana Token Management Dashboard

This project is a web-based dashboard for managing Solana tokens, providing a comprehensive suite of tools for token creation, distribution, and analysis.

## Core Functionalities

### 1. Wallet Management
- **Connect Wallet**: Users can connect their Solana wallets (e.g., Phantom, Solflare) to interact with the application.
- **Wallet Info**: Displays the connected wallet's address, SOL balance, and the current network (Mainnet, Devnet, Localnet).
- **Airdrop SOL**: On Devnet or Localnet, users can airdrop SOL to their wallet for testing purposes.

### 2. Token Creation (Minting)
- **Create Token**: A form allows users to define the properties of a new SPL (Solana Program Library) token, including:
  - Token Name
  - Symbol
  - Decimals
  - Initial Supply
  - Image URL (for metadata)
  - Description
- **Metadata**: The application supports creating token metadata on-chain.
- **Transaction Handling**: It constructs and sends the transaction to the Solana network, handling potential errors and providing feedback.

### 3. Token Operations
- **Token Overview**: Lists all tokens created by the user or held in their wallet, showing details like mint address, supply, and decimals.
- **Airdrop Tokens**: Allows the user to send a specified amount of a token to another Solana address.
- **Burn Tokens**: Users can burn (permanently destroy) a specified amount of a token they own.

### 4. Token and Network Analysis
- **Verify Token**: Users can input a mint address to fetch and display on-chain details for any SPL token, including:
  - Total Supply
  - Largest Token Holders
  - Links to explorers (Solana Explorer, Solscan, etc.)
- **Transaction History**: Displays a log of recent transactions performed through the application, with status, signature, and links to explorers.
- **Network Indicator**: Shows the currently selected network and provides a visual cue for network activity.

## Technical Architecture

- **Frontend**: Built with React and TypeScript.
- **Solana Integration**: Uses `@solana/web3.js` and `@solana/spl-token` for interacting with the Solana blockchain.
- **Wallet Adapter**: Implements `@solana/wallet-adapter` for wallet connectivity.
- **Styling**: A combination of inline styles and CSS for a clean, modern UI.
- **Resilient Connection**: A custom utility (`ResilientConnection`) manages RPC endpoint failover to ensure application reliability.
- **Configuration**: Network endpoints and other settings are managed in a central `config.ts` file.
