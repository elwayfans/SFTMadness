import React, { useState } from 'react';
import { authService } from '../services/api/authService';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    console.log('Environment Variables Check:', {
        userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
        clientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
        apiEndpoint: process.env.REACT_APP_API_ENDPOINT
      });

    try {
      const result = await authService.login(email, password);
      if (result.success) {
        // Handle successful login
        console.log('Logged in successfully');
        // Navigate to dashboard or home page
      } else {
        setError('Login failed');
      }
    } catch (error) {
      setError(error.message || 'An error occurred during login');
    }
  };

  return (
    <form onSubmit={handleLogin} className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow">
      {error && <div className="text-red-600 mb-4">{error}</div>}
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          required
        />
      </div>

      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          required
        />
      </div>

      <button 
        type="submit"
        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
      >
        Log In
      </button>
    </form>
  );
};

export default Login;