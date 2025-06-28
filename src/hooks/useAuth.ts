import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { walletService } from '../lib/wallet';
import { toast } from '../components/Toast';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      return { data, error };
    } catch (err) {
      // Handle the case where OAuth provider is not enabled
      if (err instanceof Error && err.message.includes('provider is not enabled')) {
        return { 
          data: null, 
          error: { 
            message: `${provider} sign-in is not configured. Please contact support or use email authentication.` 
          } 
        };
      }
      return { 
        data: null, 
        error: { 
          message: err instanceof Error ? err.message : 'OAuth authentication failed' 
        } 
      };
    }
  };

  const signInWithWallet = async () => {
    try {
      // Connect to Algorand wallet
      const walletConnection = await walletService.connect();
      
      if (!walletConnection.success || !walletConnection.address) {
        return { 
          data: null, 
          error: { message: walletConnection.error || 'Failed to connect wallet' } 
        };
      }

      // Generate sign-in message
      const nonce = Math.random().toString(36).substring(2, 15);
      const message = `Sign this message to authenticate with BugVoyant-Ledger.\n\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
      
      // Sign message with wallet
      const signature = await walletService.signMessage(message);
      
      if (!signature.success || !signature.signature) {
        return { 
          data: null, 
          error: { message: signature.error || 'Failed to sign message' } 
        };
      }

      // For demo purposes, create a mock user session
      // In production, you'd verify the signature server-side
      const mockUser = {
        id: `wallet_${walletConnection.address.slice(0, 8)}`,
        email: `${walletConnection.address}@wallet.algorand`,
        user_metadata: {
          wallet_address: walletConnection.address,
          auth_method: 'wallet'
        }
      };

      // Create a demo session (in production, this would be handled by your wallet-auth edge function)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: mockUser.email,
        password: 'wallet_auth_demo'
      });

      if (error && error.message.includes('Invalid login credentials')) {
        // User doesn't exist, create them
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: mockUser.email,
          password: 'wallet_auth_demo',
          options: {
            data: {
              wallet_address: walletConnection.address,
              auth_method: 'wallet',
              display_name: `${walletConnection.address.slice(0, 8)}...${walletConnection.address.slice(-4)}`
            }
          }
        });

        if (signUpError) {
          return { data: null, error: signUpError };
        }

        toast.success('Wallet connected!', `New account created for ${walletConnection.address.slice(0, 8)}...`);
        return { data: signUpData, error: null };
      }

      if (error) {
        return { data: null, error };
      }

      toast.success('Wallet connected!', `Authenticated with ${walletConnection.address.slice(0, 8)}...`);
      return { data, error: null };

    } catch (err) {
      console.error('Wallet sign-in error:', err);
      return { 
        data: null, 
        error: { message: err instanceof Error ? err.message : 'Wallet authentication failed' } 
      };
    }
  };

  const signOut = async () => {
    // Disconnect wallet if connected
    await walletService.disconnect();
    
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    signInWithWallet,
    signOut,
  };
}