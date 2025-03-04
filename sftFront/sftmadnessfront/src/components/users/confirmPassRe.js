import React, { useState } from 'react';
import { userService } from '../../services/api/userService';

//form to confirm password reset
export const ConfirmPasswordResetForm = ({ email, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
      code: '',
      newPassword: '',
      confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const handleChange = (e) => {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    };
    
    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      
      if (formData.newPassword !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      
      setLoading(true);
      
      try {
        const result = await userService.confirmForgotPassword(
          email,
          formData.code,
          formData.newPassword
        );
        
        if (result.success) {
          onSuccess();
        } else {
          setError('Failed to reset password');
        }
      } catch (err) {
        console.error('Password reset confirmation error:', err);
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    //form to confirm password reset
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Confirm Password Reset</h2>
        <p className="mb-4 text-gray-600">
          Enter the code sent to {email} and your new password.
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">Verification Code</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2 px-4 rounded text-white font-semibold
                ${loading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-4 rounded text-gray-700 font-semibold border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  };