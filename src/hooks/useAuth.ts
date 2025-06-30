import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface OAuthProviders {
  google: boolean;
  github: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [oauthProviders, setOauthProviders] = useState<OAuthProviders>({
    google: false,
    github: false
  });

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

    // Check OAuth provider status
    checkOAuthProviders();

    return () => subscription.unsubscribe();
  }, []);

  const checkOAuthProviders = async () => {
    try {
      // Try to get OAuth provider status by attempting to get the OAuth URL
      // This is a workaround since Supabase doesn't expose provider status directly
      const { data: googleData } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      
      const { data: githubData } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: window.location.origin }
      });

      setOauthProviders({
        google: !!googleData.url,
        github: !!githubData.url
      });
    } catch (error) {
      console.warn('Could not determine OAuth provider status:', error);
      // Default to enabled if we can't determine status
      setOauthProviders({ google: true, github: true });
    }
  };

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
      // Handle specific OAuth errors
      if (err instanceof Error) {
        if (err.message.includes('provider is not enabled')) {
          return { 
            data: null, 
            error: { 
              message: `${provider} sign-in is not configured in your Supabase project. Please contact your administrator.` 
            } 
          };
        }
        if (err.message.includes('redirect_uri_mismatch')) {
          return { 
            data: null, 
            error: { 
              message: `OAuth configuration error: Redirect URI mismatch. Please check your ${provider} OAuth app settings.` 
            } 
          };
        }
        if (err.message.includes('invalid_client')) {
          return { 
            data: null, 
            error: { 
              message: `OAuth configuration error: Invalid client credentials for ${provider}. Please check your OAuth app settings.` 
            } 
          };
        }
        if (err.message.includes('access_denied')) {
          return { 
            data: null, 
            error: { 
              message: `Access denied by ${provider}. Please try again or use email authentication.` 
            } 
          };
        }
      }
      
      return { 
        data: null, 
        error: { 
          message: err instanceof Error ? err.message : 'OAuth authentication failed. Please try again or use email authentication.' 
        } 
      };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    loading,
    oauthProviders,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
  };
}