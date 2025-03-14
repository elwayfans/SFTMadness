import React, { useState } from 'react';
import { adminsService } from '../../services/api/adminsService';
import Button from '@mui/material/Button';
import './admin.css'

//admin create user component
export const AdminCreateUser = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    phoneNumber: '',
    role: 'customer'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  //validate form data
  const validateForm = () => {
    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const userData = {
        email: formData.email,
        password: formData.password,
        companyName: formData.companyName,
        phoneNumber: formData.phoneNumber
      };

      let result;
      
      //call admin service to create user as an admin
      if (formData.role === 'admin') {
        result = await adminsService.createAdmin(userData);
      } else {
        result = await adminsService.createAdmin({
          ...userData,
          role: 'customer' //default role
        });
      }

      console.log('User created:', result);
      
      setSuccess(`User ${formData.email} created successfully as ${formData.role}`);
      
      //reset form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        companyName: '',
        phoneNumber: '',
        role: 'customer'
      });
      
      //notify parent component
      if (onSuccess) {
        onSuccess(result);
      }

    } catch (err) {
      console.error('Error creating user:', err);
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  //create user form
  return (
    <div className="MainContent">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New User</h2>

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
          <label className="block text-gray-700 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Minimum 8 characters"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Confirm password"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">
            User Role <span className="text-red-500">*</span>
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="customer">Customer</option>
            <option value="admin">Administrator</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">
            Company Name
          </label>
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Company or organization name"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Phone number"
          />
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded text-white font-semibold
              ${loading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
              variant='contained'
          >
            {loading ? 'Creating...' : 'Create User'}
            
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminCreateUser;