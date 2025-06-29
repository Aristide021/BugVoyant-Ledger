import algosdk from 'algosdk';

// Algorand configuration using Nodely API
const ALGORAND_TOKEN = import.meta.env.VITE_ALGORAND_TOKEN || '98D9CE80660AD243893D56D9F125CD2D';
const ALGORAND_SERVER = import.meta.env.VITE_ALGORAND_SERVER || 'https://testnet-api.4160.nodely.io';

// Initialize Algorand client with Nodely headers
export const algodClient = new algosdk.Algodv2(
  { 'X-Algo-api-token': ALGORAND_TOKEN },
  ALGORAND_SERVER,
  ''
);

// Initialize indexer client for querying
export const indexerClient = new algosdk.Indexer(
  { 'X-Algo-api-token': ALGORAND_TOKEN },
  ALGORAND_SERVER.replace('-api.', '-idx.'),
  ''
);

export interface AlgorandTransaction {
  txId: string;
  round: number;
  timestamp: number;
  note?: string;
}

export class AlgorandService {
  private static instance: AlgorandService;

  private constructor() {}

  static getInstance(): AlgorandService {
    if (!AlgorandService.instance) {
      AlgorandService.instance = new AlgorandService();
    }
    return AlgorandService.instance;
  }

  // Get network status
  async getNetworkStatus() {
    try {
      const status = await algodClient.status().do();
      return {
        success: true,
        data: {
          lastRound: status['last-round'],
          timeSinceLastRound: status['time-since-last-round'],
          catchupTime: status['catchup-time'],
          hasSyncedSinceStartup: status['has-synced-since-startup']
        }
      };
    } catch (error) {
      console.error('Failed to get network status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get transaction details
  async getTransaction(txId: string): Promise<{ success: boolean; data?: AlgorandTransaction; error?: string }> {
    try {
      const txInfo = await indexerClient.lookupTransactionByID(txId).do();
      const tx = txInfo.transaction;
      
      return {
        success: true,
        data: {
          txId: tx.id,
          round: tx['confirmed-round'],
          timestamp: tx['round-time'],
          note: tx.note ? Buffer.from(tx.note, 'base64').toString('hex') : undefined
        }
      };
    } catch (error) {
      console.error('Failed to get transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction not found'
      };
    }
  }

  // Verify hash anchoring
  async verifyHashAnchoring(txId: string, expectedHash: string): Promise<{ success: boolean; verified?: boolean; error?: string }> {
    try {
      const result = await this.getTransaction(txId);
      
      if (!result.success || !result.data) {
        return { success: false, error: result.error };
      }

      const verified = result.data.note === expectedHash;
      
      return {
        success: true,
        verified
      };
    } catch (error) {
      console.error('Failed to verify hash anchoring:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  // Generate hash for content
  async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Get account information
  async getAccountInfo(address: string) {
    try {
      const accountInfo = await algodClient.accountInformation(address).do();
      return {
        success: true,
        data: {
          address: accountInfo.address,
          amount: accountInfo.amount,
          minBalance: accountInfo['min-balance'],
          round: accountInfo.round
        }
      };
    } catch (error) {
      console.error('Failed to get account info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Account not found'
      };
    }
  }

  // Get explorer URL for transaction
  getExplorerUrl(txId: string, network: 'mainnet' | 'testnet' | 'betanet' = 'testnet'): string {
    const baseUrl = network === 'mainnet' 
      ? 'https://explorer.algorand.org' 
      : `https://${network}.explorer.algorand.org`;
    return `${baseUrl}/transaction/${txId}`;
  }

  // Get current network from server URL
  getCurrentNetwork(): 'mainnet' | 'testnet' | 'betanet' {
    if (ALGORAND_SERVER.includes('mainnet')) return 'mainnet';
    if (ALGORAND_SERVER.includes('betanet')) return 'betanet';
    return 'testnet';
  }
}

export const algorandService = AlgorandService.getInstance();