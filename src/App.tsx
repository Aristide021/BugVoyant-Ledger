import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Homepage } from './components/Homepage';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { PageLoader } from './components/LoadingSpinner';
import { AuthCallback } from './components/AuthCallback';
import { DemoWebhookSimulator } from './components/DemoWebhookSimulator';
import { DemoReport } from './components/DemoReport';

function App() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // Check current route
  const currentPath = window.location.pathname;
  const isAuthCallback = currentPath === '/auth/callback';
  const isDemoSimulator = currentPath === '/demo';
  const isDemoReport = currentPath === '/demo-report';

  if (loading) {
    return <PageLoader text="Initializing BugVoyant-Ledger..." />;
  }

  // Handle OAuth callback
  if (isAuthCallback) {
    return <AuthCallback />;
  }

  // Handle demo routes
  if (isDemoSimulator) {
    return (
      <ErrorBoundary>
        <div className="App">
          <ToastContainer />
          <DemoWebhookSimulator />
        </div>
      </ErrorBoundary>
    );
  }

  if (isDemoReport) {
    return (
      <ErrorBoundary>
        <div className="App">
          <ToastContainer />
          <DemoReport />
        </div>
      </ErrorBoundary>
    );
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