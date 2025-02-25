import React, { useState, useEffect } from 'react';
import { signOut } from 'aws-amplify/auth';
import { LoginForm } from './components/users/logIn';
import { RegisterForm } from './components/users/register';
import { Dashboard } from './components/dashboard';
import { userService } from './services/api/userService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setAuthError('');
      
      const authenticated = await userService.isAuthenticated();
      console.log('Authentication status:', authenticated);
      setIsAuthenticated(authenticated);
      
      if (!authenticated) {
        // If there was a previous auth token but it's no longer valid, sign out
        try {
          await signOut();
        } catch (e) {
          console.error('Error during cleanup sign out:', e);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthError('Authentication check failed. Please try again.');
      setIsAuthenticated(false);
      
      try {
        await signOut();
      } catch (e) {
        console.error('Error during error-cleanup sign out:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (result) => {
    console.log('Login successful:', result);
    setIsAuthenticated(true);
  };

  const handleRegisterSuccess = async (result) => {
    console.log('Registration successful:', result);
    setIsAuthenticated(true);
  };

  const handleSignOut = async () => {
    try {
      // Direct signOut call
      await signOut();
      console.log('Sign out successful');
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Sign out error:', error);
      setIsAuthenticated(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-center text-blue-600 mb-8">
            SFT Madness
          </h1>
          
          {authError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {authError}
            </div>
          )}
          
          {showRegister ? (
            <>
              <RegisterForm onSuccess={handleRegisterSuccess} />
              <p className="text-center mt-4">
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setShowRegister(false);
                    setShowForgotPassword(false);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Login here
                </button>
              </p>
            </>
          ) : showForgotPassword ? (
            <>
              {/* This would be your ForgotPasswordForm */}
              <p className="text-center mt-4">
                Remember your password?{' '}
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Back to login
                </button>
              </p>
            </>
          ) : (
            <>
              <LoginForm onSuccess={handleLoginSuccess} />
              <div className="flex justify-between mt-4">
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Forgot password?
                </button>
                <button
                  onClick={() => setShowRegister(true)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Register here
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // If user is authenticated, render the Dashboard component with onSignOut prop
  return <Dashboard onSignOut={handleSignOut} />;
}

export default App;