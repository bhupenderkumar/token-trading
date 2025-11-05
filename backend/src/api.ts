import { Connection, PublicKey, LAMPORTS_PER_SOL, type Commitment } from "@solana/web3.js";

// 1. Endpoint URLs
export const SOLANA_ENDPOINTS = {
  mainnet: "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
  localnet: "http://127.0.0.1:8899",
};

type Network = keyof typeof SOLANA_ENDPOINTS;

// 2. Request/Response Types

// getTokenSupply
export interface GetTokenSupplyRequest {
  mint: string;
}
export interface GetTokenSupplyResponse {
  amount: string;
  decimals: number;
  uiAmountString?: string;
}

// getBalance
export interface GetBalanceRequest {
  publicKey: string;
}
export interface GetBalanceResponse {
  lamports: number;
  sol: number;
}

// requestAirdrop
export interface RequestAirdropRequest {
  publicKey: string;
  amount: number; // in SOL
}
export interface RequestAirdropResponse {
  signature: string;
}

// getLatestBlockhash
export interface GetLatestBlockhashResponse {
  blockhash: string;
  lastValidBlockHeight: number;
}

// 3. API Functions

/**
 * Establishes a connection to the specified Solana network.
 * @param network - The network to connect to ('mainnet', 'devnet', 'localnet').
 * @returns A Connection object.
 */
function getConnection(network: Network): Connection {
  const endpoint = SOLANA_ENDPOINTS[network];
  return new Connection(endpoint, 'confirmed');
}

/**
 * Fetches the total supply of a given token mint.
 * @param req - The request containing the mint address.
 * @param network - The Solana network to query.
 * @returns A promise that resolves to the token supply information.
 */
export async function getTokenSupply(req: GetTokenSupplyRequest, network: Network): Promise<GetTokenSupplyResponse> {
  const connection = getConnection(network);
  const mintPublicKey = new PublicKey(req.mint);
  const supply = await connection.getTokenSupply(mintPublicKey);
  return supply.value;
}

/**
 * Fetches the SOL balance for a given public key.
 * @param req - The request containing the public key.
 * @param network - The Solana network to query.
 * @returns A promise that resolves to the wallet's balance.
 */
export async function getBalance(req: GetBalanceRequest, network: Network): Promise<GetBalanceResponse> {
  const connection = getConnection(network);
  const publicKey = new PublicKey(req.publicKey);
  const lamports = await connection.getBalance(publicKey, 'confirmed');
  return { lamports, sol: lamports / LAMPORTS_PER_SOL };
}

/**
 * Requests an airdrop of SOL to a specified account.
 * (Primarily for 'devnet' or 'localnet').
 * @param req - The request containing the public key and amount of SOL.
 * @param network - The Solana network to perform the airdrop on.
 * @returns A promise that resolves to the transaction signature.
 */
export async function requestAirdrop(req: RequestAirdropRequest, network: Network): Promise<RequestAirdropResponse> {
  if (network === 'mainnet') {
    throw new Error("Airdrops are not available on Mainnet.");
  }
  const connection = getConnection(network);
  const publicKey = new PublicKey(req.publicKey);
  const signature = await connection.requestAirdrop(publicKey, req.amount * LAMPORTS_PER_SOL);
  return { signature };
}

/**
 * Fetches the latest blockhash from the network.
 * @param network - The Solana network to query.
 * @param commitment - The commitment level to use.
 * @returns A promise that resolves to the latest blockhash information.
 */
export async function getLatestBlockhash(network: Network, commitment: Commitment = 'confirmed'): Promise<GetLatestBlockhashResponse> {
  const connection = getConnection(network);
  const blockhash = await connection.getLatestBlockhash(commitment);
  return blockhash;
}
