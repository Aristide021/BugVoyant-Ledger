import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Homepage } from './components/Homepage';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { PageLoader } from './components/LoadingSpinner';

function App() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return <PageLoader text="Initializing BugVoyant-Ledger..." />;
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