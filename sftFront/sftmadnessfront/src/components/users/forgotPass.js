import React, { useState } from 'react';
import { userService } from '../../services/api/userService';
import { Button } from '@mui/material';

//initial form to request password reset
export const ForgotPasswordForm = ({ onSuccess, defaultEmail }) => {
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await userService.forgotPassword(email);
      if (result.success) {
        onSuccess(email, result.userId);
      } else {
        setError('Failed to initiate password reset');
      }
    } catch (err) {
      console.error('Password reset request error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  //form to request password reset
  return (
    <div className="MainContent">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Reset Password</h2>
      <p className="">
        Enter your email address and we'll send you a code to reset your password.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <Button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 rounded text-white font-semibold
            ${loading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
          color='success'
          variant='contained'
          size='small'
        >
          {loading ? 'Sending...' : 'Send Reset Code'}
        </Button>
      </form>
    </div>
  );
};
