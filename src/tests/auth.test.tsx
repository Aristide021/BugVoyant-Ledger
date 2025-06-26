import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthForm } from '../components/AuthForm';
import { useAuth } from '../hooks/useAuth';

// Mock the useAuth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

// Mock toast
vi.mock('../components/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('AuthForm', () => {
  const mockSignIn = vi.fn();
  const mockSignUp = vi.fn();
  const mockSignInWithOAuth = vi.fn();
  const mockSignInWithWallet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useAuth as any).mockReturnValue({
      signIn: mockSignIn,
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
      signInWithWallet: mockSignInWithWallet
    });
  });

  it('should render all authentication options', () => {
    render(<AuthForm />);
    
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
    expect(screen.getByText('Connect Algorand Wallet')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
  });

  it('should handle Google OAuth sign-in', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    
    render(<AuthForm />);
    
    const googleButton = screen.getByText('Continue with Google');
    fireEvent.click(googleButton);
    
    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith('google');
    });
  });

  it('should handle GitHub OAuth sign-in', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    
    render(<AuthForm />);
    
    const githubButton = screen.getByText('Continue with GitHub');
    fireEvent.click(githubButton);
    
    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith('github');
    });
  });

  it('should handle wallet sign-in', async () => {
    mockSignInWithWallet.mockResolvedValue({ error: null });
    
    render(<AuthForm />);
    
    const walletButton = screen.getByText('Connect Algorand Wallet');
    fireEvent.click(walletButton);
    
    await waitFor(() => {
      expect(mockSignInWithWallet).toHaveBeenCalled();
    });
  });

  it('should handle email/password sign-in', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    
    render(<AuthForm />);
    
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signInButton);
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should display error messages', async () => {
    const errorMessage = 'Invalid credentials';
    mockSignIn.mockResolvedValue({ error: { message: errorMessage } });
    
    render(<AuthForm />);
    
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(signInButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should toggle between sign in and sign up modes', () => {
    render(<AuthForm />);
    
    const toggleButton = screen.getByText("Don't have an account? Sign up");
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByText('Already have an account? Sign in')).toBeInTheDocument();
  });

  it('should show loading state during authentication', async () => {
    mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<AuthForm />);
    
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signInButton);
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });
});