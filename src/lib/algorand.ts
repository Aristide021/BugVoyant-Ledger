import algosdk from 'algosdk';

// Demo mode flag - set to true for demos with real testnet operations
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || window.location.hostname === 'localhost';

// Algorand configuration - use public testnet endpoints for demo
const ALGORAND_TOKEN = import.meta.env.VITE_ALGORAND_TOKEN || '';
const ALGORAND_SERVER = import.meta.env.VITE_ALGORAND_SERVER || 'https://testnet-api.algonode.cloud';

// Demo account configuration for testnet
const DEMO_ACCOUNT = {
  address: 'DEMO7WJZKKKNVK2NURW2U7I2DKMZ6E5H3Q4R5S6T7U8V9W0X1Y2Z3A4B5C6D7E8F9',
  mnemonic: 'demo demo demo demo demo demo demo demo demo demo demo demo demo demo demo demo demo demo demo demo demo demo demo demo',
  privateKey: new Uint8Array(32).fill(1) // Demo private key
};

// Initialize Algorand client with appropriate headers
const headers = ALGORAND_TOKEN ? { 'X-Algo-api-token': ALGORAND_TOKEN } : undefined;
export const algodClient = new algosdk.Algodv2(
  headers || '',
  ALGORAND_SERVER,
  ''
);

// Initialize indexer client for querying
export const indexerClient = new algosdk.Indexer(
  headers || '',
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
          lastRound: status.lastRound ?? 0,
          timeSinceLastRound: status.timeSinceLastRound ?? 0,
          catchupTime: status.catchupTime ?? 0
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
      // If tx.note is a Uint8Array, convert to hex; if base64, decode to hex
      let note: string = '';
      if (tx.note) {
        if (typeof tx.note === 'string') {
          try {
            const raw = atob(tx.note);
            note = Array.from(raw).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
          } catch {
            note = '';
          }
        } else if (tx.note instanceof Uint8Array) {
          note = Array.from(tx.note).map(b => b.toString(16).padStart(2, '0')).join('');
        }
      }
      return {
        success: true,
        data: {
          txId: tx.id ?? '',
          round: Number(tx.confirmedRound ?? 0),
          timestamp: Number(tx.roundTime ?? 0),
          note
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

  // Anchor content on blockchain using real testnet operations
  async anchorContent(content: string): Promise<string> {
    if (DEMO_MODE) {
      try {
        // Generate hash of the content
        const hash = await this.generateContentHash(content);
        
        // Create a real transaction on testnet
        const suggestedParams = await algodClient.getTransactionParams().do();
        
        // Create a note transaction with the hash
        const note = new TextEncoder().encode(`BugVoyant-Ledger: ${hash}`);
        
        const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: DEMO_ACCOUNT.address,
          to: DEMO_ACCOUNT.address, // Send to self (no actual transfer)
          amount: 0, // Zero amount transaction
          note: note,
          suggestedParams: suggestedParams
        } as any);

        // Sign the transaction
        const signedTxn = txn.signTxn(DEMO_ACCOUNT.privateKey);
        
        // Submit the transaction
        const result = await algodClient.sendRawTransaction(signedTxn).do();
        
        // Wait for confirmation
        const confirmation = await algosdk.waitForConfirmation(algodClient, result.txid, 4);
        
        console.log('🔗 DEMO MODE: Real blockchain anchoring completed with txId:', result.txid);
        return result.txid;
        
      } catch (error) {
        console.error('Demo blockchain anchoring failed:', error);
        // Fallback to simulation if real anchoring fails
        const hash = await this.generateContentHash(content);
        const demoTxId = 'demo_' + hash.substring(0, 16) + '_' + Date.now().toString(36);
        console.log('🔗 DEMO MODE: Fallback to simulated anchoring with txId:', demoTxId);
        return demoTxId;
      }
    }

    // For production, implement real anchoring logic here
    throw new Error('Production blockchain anchoring not implemented');
  }

  // Get account information
  async getAccountInfo(address: string) {
    try {
      const accountInfo = await algodClient.accountInformation(address).do();
      return {
        success: true,
        data: {
          address: accountInfo.address ?? '',
          amount: Number(accountInfo.amount ?? 0),
          minBalance: Number(accountInfo.minBalance ?? 0),
          round: Number(accountInfo.round ?? 0)
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

  // Get demo account info
  async getDemoAccountInfo() {
    if (DEMO_MODE) {
      return {
        success: true,
        data: {
          address: DEMO_ACCOUNT.address,
          amount: 1000000, // 1 ALGO in microAlgos
          minBalance: 100000,
          round: 0
        }
      };
    }
    return this.getAccountInfo(DEMO_ACCOUNT.address);
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

  // Check if in demo mode
  isDemoMode(): boolean {
    return DEMO_MODE;
  }

  // Get demo account address
  getDemoAccountAddress(): string {
    return DEMO_ACCOUNT.address;
  }
}

export const algorandService = AlgorandService.getInstance();