import React, { useState } from 'react';
import { userService } from '../../services/api/userService';
import './users.css'
import { Button } from '@mui/material';

//form to delete user account
export const DeleteAccountForm = ({ onSuccess, user }) => {
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (confirmation !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }
    
    setLoading(true);
    
    try {
      if (user && user.id) {
        console.log("Deleting user with ID:", user.id);
        await userService.deleteUser(user.id);
      }
      else {
        const currentUser = await userService.getCurrentUser();
        console.log("Current user data:", currentUser);

        const userId = currentUser.id || currentUser.userId || currentUser.cognito_id;

        if (!userId) {
          throw new Error('User ID not found, cannot delete user.');
        }

        console.log("Deleting user with ID:", userId);
        await userService.deleteUser(userId);
      }

      onSuccess();
    } catch (err) {
      console.error('Account deletion error:', err);
      setError(err.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="MainContent">
      <h2 className="text-2xl font-bold mb-6 text-red-600">Delete Account</h2>
      <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">
        <h3 className="font-bold">Warning:</h3>
        <p>This action cannot be undone. All of your data will be permanently deleted.</p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">
            Type <span className="font-bold">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500"
            required
          />
        </div>
        
        <Button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 rounded text-white font-semibold
            ${loading ? 'bg-red-300' : 'bg-red-600 hover:bg-red-700'}`}
          variant='contained'
          color='error'
          size='small'
        >
          {loading ? 'Deleting...' : 'Permanently Delete Account'}
        </Button>
      </form>
    </div>
  );
};