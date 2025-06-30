import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Homepage } from './components/Homepage';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { PageLoader } from './components/LoadingSpinner';
import { AuthCallback } from './components/AuthCallback';

function App() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // Check if we're on the auth callback route
  const isAuthCallback = window.location.pathname === '/auth/callback';

  if (loading) {
    return <PageLoader text="Initializing BugVoyant-Ledger..." />;
  }

  // Handle OAuth callback
  if (isAuthCallback) {
    return <AuthCallback />;
  }

  return (
    <ErrorBoundary>
      <div className="App">
        {/* Toast notifications */}
        <ToastContainer />
        
        {/* Main content */}
        {user ? (
          <Dashboard />
        ) : showAuth ? (
          <AuthForm onBack={() => setShowAuth(false)} />
        ) : (
          <Homepage onGetStarted={() => setShowAuth(true)} />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;