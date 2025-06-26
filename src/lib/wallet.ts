import algosdk from 'algosdk';

interface WalletConnection {
  success: boolean;
  address?: string;
  error?: string;
}

interface SignatureResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export class WalletService {
  private static instance: WalletService;
  private connectedAddress: string | null = null;
  private walletConnector: any = null;

  private constructor() {}

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  async connect(): Promise<WalletConnection> {
    try {
      // Check if Pera Wallet is available
      if (typeof window !== 'undefined' && (window as any).PeraWallet) {
        return this.connectPeraWallet();
      }
      
      // Check if AlgoSigner is available
      if (typeof window !== 'undefined' && (window as any).AlgoSigner) {
        return this.connectAlgoSigner();
      }

      // Fallback to WalletConnect
      return this.connectWalletConnect();
    } catch (error) {
      console.error('Wallet connection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet'
      };
    }
  }

  private async connectPeraWallet(): Promise<WalletConnection> {
    try {
      const PeraWallet = (window as any).PeraWallet;
      const peraWallet = new PeraWallet();
      
      const accounts = await peraWallet.connect();
      
      if (accounts.length === 0) {
        return { success: false, error: 'No accounts found' };
      }

      this.connectedAddress = accounts[0];
      this.walletConnector = peraWallet;

      return {
        success: true,
        address: this.connectedAddress
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Pera Wallet connection failed'
      };
    }
  }

  private async connectAlgoSigner(): Promise<WalletConnection> {
    try {
      const AlgoSigner = (window as any).AlgoSigner;
      
      await AlgoSigner.connect();
      const accounts = await AlgoSigner.accounts({ ledger: 'TestNet' });
      
      if (accounts.length === 0) {
        return { success: false, error: 'No accounts found' };
      }

      this.connectedAddress = accounts[0].address;
      this.walletConnector = AlgoSigner;

      return {
        success: true,
        address: this.connectedAddress
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AlgoSigner connection failed'
      };
    }
  }

  private async connectWalletConnect(): Promise<WalletConnection> {
    try {
      // For demo purposes, we'll simulate a wallet connection
      // In production, you'd integrate with @walletconnect/modal
      const mockAddress = 'DEMO' + Math.random().toString(36).substring(2, 15).toUpperCase();
      
      this.connectedAddress = mockAddress;
      
      return {
        success: true,
        address: this.connectedAddress
      };
    } catch (error) {
      return {
        success: false,
        error: 'WalletConnect not available'
      };
    }
  }

  async signMessage(message: string): Promise<SignatureResult> {
    if (!this.connectedAddress) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      // Convert message to bytes
      const messageBytes = new TextEncoder().encode(message);
      
      if (this.walletConnector && this.walletConnector.signData) {
        // Pera Wallet signing
        const signedData = await this.walletConnector.signData([{
          data: messageBytes,
          from: this.connectedAddress
        }]);
        
        return {
          success: true,
          signature: Buffer.from(signedData[0]).toString('base64')
        };
      } else if (this.walletConnector && this.walletConnector.signBytes) {
        // AlgoSigner signing
        const signedData = await this.walletConnector.signBytes({
          data: Array.from(messageBytes),
          from: this.connectedAddress
        });
        
        return {
          success: true,
          signature: signedData.blob
        };
      } else {
        // Mock signing for demo
        const mockSignature = Buffer.from(
          `mock_signature_${this.connectedAddress}_${Date.now()}`
        ).toString('base64');
        
        return {
          success: true,
          signature: mockSignature
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sign message'
      };
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.walletConnector && this.walletConnector.disconnect) {
        await this.walletConnector.disconnect();
      }
    } catch (error) {
      console.warn('Error disconnecting wallet:', error);
    } finally {
      this.connectedAddress = null;
      this.walletConnector = null;
    }
  }

  getConnectedAddress(): string | null {
    return this.connectedAddress;
  }

  isConnected(): boolean {
    return !!this.connectedAddress;
  }
}

export const walletService = WalletService.getInstance();