import { Connection } from '@solana/web3.js';
import type { ConnectionConfig } from '@solana/web3.js';
import { getBackupEndpoints, CONNECTION_CONFIG } from '../config/config';

export class ResilientConnection {
  private connections: Connection[] = [];
  private currentIndex = 0;
  private network: 'devnet' | 'localnet' | 'mainnet';

  constructor(network: 'devnet' | 'localnet' | 'mainnet') {
    this.network = network;
    this.initializeConnections();
  }

  private initializeConnections() {
    const endpoints = getBackupEndpoints(this.network);
    this.connections = endpoints.map(endpoint => 
      new Connection(endpoint, CONNECTION_CONFIG)
    );
  }

  async getHealthyConnection(): Promise<Connection> {
    // Try current connection first
    if (await this.isConnectionHealthy(this.connections[this.currentIndex])) {
      return this.connections[this.currentIndex];
    }

    // Try other connections
    for (let i = 0; i < this.connections.length; i++) {
      if (i === this.currentIndex) continue;
      
      if (await this.isConnectionHealthy(this.connections[i])) {
        this.currentIndex = i;
        console.log(`Switched to backup RPC endpoint: ${this.connections[i].rpcEndpoint}`);
        return this.connections[i];
      }
    }

    // If all connections fail, return the primary one and let the caller handle the error
    console.warn('All RPC endpoints appear unhealthy, using primary endpoint');
    return this.connections[0];
  }

  private async isConnectionHealthy(connection: Connection): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      await connection.getSlot('confirmed');
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      return false;
    }
  }

  async executeWithFallback<T>(
    operation: (connection: Connection) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const connection = await this.getHealthyConnection();
        return await operation(connection);
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.message?.includes('Invalid public key') || 
            error.message?.includes('Account does not exist') ||
            error.code === 'AccountNotFound') {
          throw error;
        }

        // Try next connection on network errors
        if (error.code === -32603 || 
            error.message?.includes('429') || 
            error.message?.includes('503') ||
            error.message?.includes('timeout')) {
          
          this.currentIndex = (this.currentIndex + 1) % this.connections.length;
          
          if (attempt < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            console.log(`Retrying with next endpoint in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        throw error;
      }
    }

    throw lastError;
  }
}

// Global connection instances
const connectionInstances = new Map<string, ResilientConnection>();

export function getResilientConnection(network: 'devnet' | 'localnet' | 'mainnet'): ResilientConnection {
  if (!connectionInstances.has(network)) {
    connectionInstances.set(network, new ResilientConnection(network));
  }
  return connectionInstances.get(network)!;
}

// Helper function to detect network from endpoint
export function detectNetwork(endpoint: string): 'devnet' | 'localnet' | 'mainnet' {
  if (endpoint.includes('devnet')) return 'devnet';
  if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) return 'localnet';
  return 'mainnet';
}