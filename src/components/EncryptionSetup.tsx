import React, { useState } from 'react';
import { Shield, Key, AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { encryptionService } from '../lib/encryption';

interface EncryptionSetupProps {
  onComplete: () => void;
  onCancel?: () => void;
}

export function EncryptionSetup({ onComplete, onCancel }: EncryptionSetupProps) {
  const [mode, setMode] = useState<'password' | 'auto'>('password');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordSetup = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await encryptionService.generateEncryptionKeyFromPassword(password);
      onComplete();
    } catch {
      setError('Failed to set up encryption');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      await encryptionService.generateEncryptionKey();
      onComplete();
    } catch {
      setError('Failed to set up encryption');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f1419] border border-gray-800 rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Security Setup</h3>
            <p className="text-gray-400 text-sm">Choose your encryption method</p>
          </div>
        </div>

        {/* Security Mode Selection */}
        <div className="space-y-4 mb-6">
          <div 
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              mode === 'password' 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => setMode('password')}
          >
            <div className="flex items-start space-x-3">
              <Key className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-white font-medium">Password-Based (Recommended)</h4>
                <p className="text-gray-400 text-sm mt-1">
                  Maximum security. Key derived from your password using PBKDF2.
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-xs">No key stored in browser</span>
                </div>
              </div>
            </div>
          </div>

          <div 
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              mode === 'auto' 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => setMode('auto')}
          >
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <h4 className="text-white font-medium">Auto-Generated</h4>
                <p className="text-gray-400 text-sm mt-1">
                  Convenient but less secure. Key stored in session storage.
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 text-xs">Vulnerable to XSS attacks</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password Setup Form */}
        {mode === 'password' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Encryption Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter a strong password"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm your password"
                minLength={8}
              />
            </div>

            <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-3">
              <p className="text-blue-400 text-xs">
                💡 Your password is used to derive an encryption key locally. It's never sent to our servers.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-600/10 border border-red-600/20 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={mode === 'password' ? handlePasswordSetup : handleAutoSetup}
            disabled={loading || (mode === 'password' && (!password || !confirmPassword))}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Setting up...
              </div>
            ) : (
              'Set Up Encryption'
            )}
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}