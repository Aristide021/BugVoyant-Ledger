import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, Zap, ArrowLeft, Github, Chrome, Wallet, Info, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { walletService } from '../lib/wallet';
import { toast } from './Toast';

interface AuthFormProps {
  onBack?: () => void;
}

export function AuthForm({ onBack }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);
  const [oauthEnabled, setOauthEnabled] = useState({ google: false, github: false });
  const { signUp, signIn, signInWithOAuth, signInWithWallet } = useAuth();

  useEffect(() => {
    // Check available wallets on component mount
    const wallets = walletService.getAvailableWallets();
    setAvailableWallets(wallets);
    
    // Check OAuth provider availability
    checkOAuthProviders();
  }, []);

  const checkOAuthProviders = async () => {
    // Check OAuth providers from environment variables
    const googleEnabled = import.meta.env.VITE_OAUTH_GOOGLE_ENABLED === 'true';
    const githubEnabled = import.meta.env.VITE_OAUTH_GITHUB_ENABLED === 'true';
    
    setOauthEnabled({ 
      google: googleEnabled, 
      github: githubEnabled 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        setError(error.message);
        toast.error('Authentication failed', error.message);
      } else {
        toast.success('Welcome to BugVoyant-Ledger!', 'You have been successfully authenticated.');
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred';
      setError(errorMessage);
      toast.error('Authentication error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    if (!oauthEnabled[provider]) {
      toast.error('Provider not available', `${provider} sign-in is not configured yet. Please use email/password or wallet authentication.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await signInWithOAuth(provider);
      if (error) {
        setError(error.message);
        toast.error(`${provider} sign-in failed`, error.message);
      }
    } catch (err) {
      const errorMessage = `Failed to sign in with ${provider}`;
      setError(errorMessage);
      toast.error('OAuth error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleWalletSignIn = async () => {
    setWalletConnecting(true);
    setError(null);

    try {
      const { error } = await signInWithWallet();
      if (error) {
        setError(error.message);
        toast.error('Wallet sign-in failed', error.message);
      } else {
        toast.success('Wallet connected!', 'You have been authenticated with your Algorand wallet.');
      }
    } catch (err) {
      const errorMessage = 'Failed to connect wallet';
      setError(errorMessage);
      toast.error('Wallet error', errorMessage);
    } finally {
      setWalletConnecting(false);
    }
  };

  const getWalletButtonText = () => {
    if (availableWallets.includes('Pera Wallet')) {
      return 'Connect Pera Wallet';
    } else if (availableWallets.includes('AlgoSigner')) {
      return 'Connect AlgoSigner';
    } else {
      return 'Connect Algorand Wallet (Demo)';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-cyan-600/5"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.02%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] animate-pulse"></div>
      
      <div className="relative w-full max-w-md">
        <div className="bg-[#0f1419] border border-gray-800 rounded-3xl shadow-2xl p-8">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to homepage</span>
            </button>
          )}

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/25">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">BugVoyant</h1>
            <p className="text-gray-400">Transform incidents into insights</p>
          </div>

          {/* OAuth Configuration Notice */}
          {(!oauthEnabled.google && !oauthEnabled.github) && (
            <div className="mb-6 p-4 bg-orange-600/10 border border-orange-600/20 rounded-xl">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-orange-400 font-medium mb-1">OAuth Setup Required</h4>
                  <p className="text-gray-400 text-sm">
                    To enable Google and GitHub sign-in, configure OAuth providers in your Supabase dashboard.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SSO Options - Only show if enabled */}
          {(oauthEnabled.google || oauthEnabled.github) && (
            <div className="space-y-3 mb-6">
              {oauthEnabled.google && (
                <button
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={loading || walletConnecting}
                  className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-gray-50 text-gray-900 font-medium py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                >
                  <Chrome className="w-5 h-5" />
                  <span>Continue with Google</span>
                </button>
              )}

              {oauthEnabled.github && (
                <button
                  onClick={() => handleOAuthSignIn('github')}
                  disabled={loading || walletConnecting}
                  className="w-full flex items-center justify-center space-x-3 bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg border border-gray-700"
                >
                  <Github className="w-5 h-5" />
                  <span>Continue with GitHub</span>
                </button>
              )}
            </div>
          )}

          {/* Wallet Authentication */}
          <div className="mb-6">
            <button
              onClick={handleWalletSignIn}
              disabled={loading || walletConnecting}
              className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-green-600/25"
            >
              {walletConnecting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Wallet className="w-5 h-5" />
              )}
              <span>{getWalletButtonText()}</span>
            </button>
          </div>

          {/* Wallet Status Info */}
          {availableWallets.length > 0 && (
            <div className="mb-6 p-3 bg-blue-600/10 border border-blue-600/20 rounded-xl">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-blue-400 text-sm font-medium">Available Wallets</p>
                  <p className="text-gray-400 text-xs">
                    {availableWallets.filter(w => w !== 'Demo Mode').length > 0 
                      ? availableWallets.filter(w => w !== 'Demo Mode').join(', ')
                      : 'Demo mode available for testing'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#0f1419] text-gray-400">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-600/10 border border-red-600/20 rounded-xl p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || walletConnecting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-blue-600/25"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {/* OAuth Setup Instructions */}
          <div className="mt-6 p-4 bg-blue-600/10 border border-blue-600/20 rounded-xl">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-blue-400 font-medium mb-1">OAuth Setup Instructions</h4>
                <p className="text-gray-400 text-sm mb-2">
                  To enable Google and GitHub sign-in:
                </p>
                <ol className="text-gray-400 text-xs space-y-1 list-decimal list-inside">
                  <li>Go to your Supabase Dashboard → Authentication → Providers</li>
                  <li>Enable Google and/or GitHub providers</li>
                  <li>Add your OAuth app credentials from Google Cloud Console / GitHub</li>
                  <li>Set redirect URL to: <code className="text-blue-300">{window.location.origin}/auth/callback</code></li>
                </ol>
              </div>
            </div>
          </div>

          {/* Web3 Notice */}
          <div className="mt-6 p-4 bg-green-600/10 border border-green-600/20 rounded-xl">
            <div className="flex items-start space-x-3">
              <Wallet className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-green-400 font-medium mb-1">Web3-Native Authentication</h4>
                <p className="text-gray-400 text-sm">
                  Connect your Algorand wallet for seamless Web3 authentication. Your wallet signature proves ownership without passwords.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}