import React, { useState, useEffect } from 'react';
import { signOut } from 'aws-amplify/auth';
import { userService } from '../../services/api/userService';
import { UserProfileForm } from './profile';
import { DeleteAccountForm } from './deleteUser';
import { ForgotPasswordForm } from './forgotPass';
import { ConfirmPasswordResetForm } from './confirmPassRe';

export const Dashboard = ({ onSignOut }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [passwordResetEmail, setPasswordResetEmail] = useState('');
  const [showPasswordResetConfirmation, setShowPasswordResetConfirmation] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError('');

      const userData = await userService.getCurrentUser();
      
      console.log('User data loaded:', userData);
      
      setUser(userData);
      
      if (userData.createdFromCognito) {
        setError('Some profile information could not be loaded from the database. You can still update your profile.');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load complete user data. Using basic profile information.');
      
      try {
        const cognitoUser = await userService.getCurrentUser();
        setUser({
          email: cognitoUser.username,
          username: cognitoUser.username,
          userId: cognitoUser.userId,
          companyName: '',
          phoneNumber: '',
          id: '1', // Default ID for API calls
          createdFromCognito: true
        });
      } catch (cognitoErr) {
        console.error('Failed to get Cognito user data:', cognitoErr);
        setError('Failed to load user data. Please sign in again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
        await signOut();
      
        if (onSignOut) {
          onSignOut();
        } else {
          // Fallback if onSignOut prop not provided
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Sign out error:', error);
        setError('Error signing out. Please try again.');
      }
  };

  const handleDeleteSuccess = () => {
    if (onSignOut) {
        onSignOut();
      } else {
        window.location.href = '/';
      }
  };

  const handlePasswordResetRequest = (email) => {
    setPasswordResetEmail(email);
    setShowPasswordResetConfirmation(true);
  };

  const handlePasswordResetSuccess = () => {
    setShowPasswordResetConfirmation(false);
    setActiveTab('profile');
    alert('Password has been reset successfully. Please log in with your new password.');
    handleSignOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Get display name from the appropriate source
  const displayName = user?.username || user?.email || 'User';

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-blue-600">
              Welcome, {displayName}
            </h1>
            <button
              onClick={handleSignOut}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Sign out
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              <button
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('profile')}
              >
                Profile
              </button>
              <button
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'password'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('password')}
              >
                Reset Password
              </button>
              <button
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'delete'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('delete')}
              >
                Delete Account
              </button>
            </nav>
          </div>

          <div className="mt-6">
            {activeTab === 'profile' && (
              <UserProfileForm 
                user={user}
                onProfileUpdate={fetchUser}
              />
            )}
            
            {activeTab === 'password' && (
              <>
                {showPasswordResetConfirmation ? (
                  <ConfirmPasswordResetForm
                    email={passwordResetEmail}
                    onSuccess={handlePasswordResetSuccess}
                    onCancel={() => setShowPasswordResetConfirmation(false)}
                  />
                ) : (
                  <ForgotPasswordForm 
                    onSuccess={handlePasswordResetRequest}
                    defaultEmail={user?.email}
                  />
                )}
              </>
            )}
            
            {activeTab === 'delete' && (
              <DeleteAccountForm 
                onSuccess={handleDeleteSuccess} 
                user={user}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;