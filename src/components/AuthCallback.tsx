import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PageLoader } from './LoadingSpinner';
import { toast } from './Toast';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

export function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Get the current URL hash/search params
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const searchParams = new URLSearchParams(window.location.search);
      
      // Check for access token in hash (OAuth flow)
      const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
      const error = hashParams.get('error') || searchParams.get('error');
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');

      if (error) {
        throw new Error(errorDescription || error);
      }

      if (accessToken && refreshToken) {
        // Set the session with the tokens
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          throw sessionError;
        }

        if (data.user) {
          setStatus('success');
          toast.success('Welcome to BugVoyant-Ledger!', `Successfully signed in as ${data.user.email}`);
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          throw new Error('No user data received');
        }
      } else {
        // Try to get session from Supabase (in case it's already set)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          setStatus('success');
          toast.success('Welcome back!', `Successfully signed in as ${session.user.email}`);
          
          // Redirect to dashboard
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          throw new Error('No authentication data found');
        }
      }
    } catch (err) {
      console.error('Auth callback error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setStatus('error');
      toast.error('Authentication failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const goHome = () => {
    window.location.href = '/';
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center">
          <PageLoader text="Completing authentication..." />
          <p className="text-gray-400 mt-4 text-sm">Please wait while we sign you in...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="bg-[#0f1419] border border-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Successful!</h1>
          <p className="text-gray-300 mb-6">
            You have been successfully signed in. Redirecting to your dashboard...
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="bg-[#0f1419] border border-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Failed</h1>
          <p className="text-gray-300 mb-2">
            We encountered an error while signing you in:
          </p>
          <p className="text-red-400 text-sm mb-6 bg-red-600/10 border border-red-600/20 rounded-lg p-3">
            {error}
          </p>
          <button
            onClick={goHome}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Homepage</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}