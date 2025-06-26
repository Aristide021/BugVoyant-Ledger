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

      // Verify signature and authenticate with Supabase
      const { data, error } = await supabase.functions.invoke('wallet-auth', {
        body: {
          address: walletConnection.address,
          message,
          signature: signature.signature,
          nonce
        }
      });

      if (error) {
        return { data: null, error };
      }

      // Set session from wallet auth response
      if (data?.session) {
        await supabase.auth.setSession(data.session);
        toast.success('Wallet connected!', `Authenticated with ${walletConnection.address.slice(0, 8)}...`);
      }

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