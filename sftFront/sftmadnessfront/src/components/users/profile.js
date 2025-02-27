import React, { useState, useEffect } from 'react';
import { userService } from '../../services/api/userService';

export const UserProfileForm = ({ user, onProfileUpdate }) => {
  const [profile, setProfile] = useState({
    email: '',
    companyName: '',
    phoneNumber: '',
  });

  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Initialize the form with data from props
    if (user) {
      setProfile({
        email: user.email || user.username || '',
        companyName: user.companyname || '',
        phoneNumber: user.phonenumber || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUpdating(true);

    try {
        // Critical: Use the numerical database ID for API calls
        // This is a hack for now - in a real app, you'd need to ensure this ID is correct
        const userId = user.id || "1";
        
        // Create update payload 
        const updatePayload = {
          companyName: profile.companyName,
          phoneNumber: profile.phoneNumber
        };
        
        console.log(`Updating user ${userId} with:`, updatePayload);
        
        await userService.updateProfile(userId, updatePayload);
        
        setSuccess('Profile updated successfully');
        
        // Notify parent to refresh the profile data
        if (onProfileUpdate) {
          onProfileUpdate();
        }
    } catch (err) {
        console.error('Error updating profile:', err);
        setError(err.message || 'Failed to update profile. The API may be unavailable.');
    } finally {
        setUpdating(false);
    }
};

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Profile</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            name="email"
            value={profile.email}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-gray-100"
            disabled
          />
          <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Company Name</label>
          <input
            type="text"
            name="companyName"
            value={profile.companyName || ''}
            onChange={handleChange}
            placeholder="Enter your company name"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            name="phoneNumber"
            value={profile.phoneNumber || ''}
            onChange={handleChange}
            placeholder="Enter your phone number"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={updating}
          className={`w-full py-2 px-4 rounded text-white font-semibold
            ${updating ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {updating ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
};