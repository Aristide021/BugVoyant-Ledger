import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Homepage } from './components/Homepage';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';

function App() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // If user is authenticated, show dashboard
  if (user) {
    return <Dashboard />;
  }

  // If user wants to authenticate, show auth form
  if (showAuth) {
    return <AuthForm onBack={() => setShowAuth(false)} />;
  }

  // Otherwise show homepage
  return <Homepage onGetStarted={() => setShowAuth(true)} />;
}

export default App;