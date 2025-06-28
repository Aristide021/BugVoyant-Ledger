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
      const timestamp = Date.now();
      const message = `Sign this message to authenticate with BugVoyant-Ledger.\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
      
      // Sign message with wallet
      const signature = await walletService.signMessage(message);
      
      if (!signature.success || !signature.signature) {
        return { 
          data: null, 
          error: { message: signature.error || 'Failed to sign message' } 
        };
      }

      // Call the wallet-auth edge function
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallet-auth`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          address: walletConnection.address,
          message,
          signature: signature.signature,
          nonce,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { 
          data: null, 
          error: { message: result.error || 'Wallet authentication failed' } 
        };
      }

      if (!result.success) {
        return { 
          data: null, 
          error: { message: result.message || 'Authentication failed' } 
        };
      }

      // If the edge function returns a session URL, use it to establish the session
      if (result.session?.properties?.action_link) {
        // Extract the session from the magic link
        const url = new URL(result.session.properties.action_link);
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            return { data: null, error: sessionError };
          }

          toast.success('Wallet connected!', `Authenticated with ${walletConnection.address.slice(0, 8)}...`);
          return { data: sessionData, error: null };
        }
      }

      // Fallback: refresh the session to get the updated user
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        return { data: null, error: sessionError };
      }

      toast.success('Wallet connected!', `Authenticated with ${walletConnection.address.slice(0, 8)}...`);
      return { data: sessionData, error: null };

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