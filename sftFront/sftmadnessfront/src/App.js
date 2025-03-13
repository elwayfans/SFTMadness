import React, { useState, useEffect } from 'react';
import { signOut } from 'aws-amplify/auth';
import { LoginForm } from './components/registration/logIn';
import { RegisterForm } from './components/registration/register';
import { Dashboard } from './components/dashboard';
import { AdminDashboard } from './components/adminDashboard';
import { userService } from './services/api/userService';
import { adminsService } from './services/api/adminsService';
import { Button } from '@mui/material';

function App() { 
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
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
      
      if (authenticated) {
        //check if user is an admin
        const adminStatus = await adminsService.isAdmin();
        console.log('Admin status:', adminStatus);
        setIsAdmin(adminStatus);
      } else {
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
      setIsAdmin(false);
      
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

    try {
      const adminStatus = await adminsService.isAdmin();
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error checking admin status after login:', error);
    }
  };

  const handleRegisterSuccess = async (result) => {
    console.log('Registration successful:', result);
    setIsAuthenticated(true);
    setIsAdmin(false);
  };

  const handleSignOut = async () => {
    try {
      // Direct signOut call
      await signOut();
      console.log('Sign out successful');
      setIsAuthenticated(false);
      setIsAdmin(false);
    } catch (error) {
      console.error('Sign out error:', error);
      setIsAuthenticated(false);
      setIsAdmin(false);
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
      <div className="MainContent">
        <div className="max-w-md mx-auto">
          <h1 className="">
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
              {/* ForgotPasswordForm */}
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
                <Button
                  onClick={() => setShowForgotPassword(true)}
                  className="text-blue-600 hover:text-blue-800"
                  variant='contained'
                  color='warning'
                >
                  Forgot password?
                </Button>
                <Button
                  onClick={() => setShowRegister(true)}
                  className="text-blue-600 hover:text-blue-800"
                  variant='contained'
                  
                >
                  Register here
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // dashboard shown based on user role : admin/customer
  return isAdmin ? (
    <AdminDashboard onSignOut={handleSignOut} />
  ) : (
    <Dashboard onSignOut={handleSignOut} />
  );
}

export default App;