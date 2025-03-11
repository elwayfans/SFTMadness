import React, { useState } from "react";
import { userService } from "../../services/api/userService";
import { ConfirmSignUp } from "./confirmRegistration";
import { Button } from "@mui/material";

//form for registering a new user
export const RegisterForm = ({ onSuccess }) => {
    const [formData, setFormData] = useState({
      email: '',
      password: '',
      confirmPassword: '',
      companyName: '',
      phoneNumber: ''
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [tempRegistrationData, setTempRegistrationData] = useState(null);
  
    const handleChange = (e) => {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    };
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
  
      //validates that the password and confirm password fields match
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
  
      setLoading(true);
  
      //registers user with the provided information
      try {
        console.log('Submitting registration...', formData);
        const result = await userService.register({
          email: formData.email,
          password: formData.password,
          companyName: formData.companyName,
          phoneNumber: formData.phoneNumber
        });

        console.log('Registration result:', result);
  
        if (result.success) {
          setTempRegistrationData(result);
          setShowConfirmation(true);
        } else {
          setError('Registration failed. Please try again.');
        }
      } catch (err) {
        console.error('Registration error:', err);
        setError(err.message || 'An error occurred during registration');
      } finally {
        setLoading(false);
      }
    };

    //handles the confirmation of the registration - logs in the user if successful
    const handleConfirmationSuccess = async () => {
      try {
        const result = await userService.completeRegistration(tempRegistrationData);
        if (result.success) {
          //log in automatically
          const loginResult = await userService.login(
            tempRegistrationData.email,
            tempRegistrationData.password
          );
          if (loginResult.success) {
            onSuccess?.(loginResult);
          }
        }
      } catch (err) {
        console.error('Error completing registration:', err);
        setError('Failed to complete registration. Please try logging in manually.');
      }
    };

    //confirmation form for the registration
    if (showConfirmation) {
      return (
        <ConfirmSignUp
          email={formData.email}
          onSuccess={handleConfirmationSuccess}
          onCancel={() => setShowConfirmation(false)}
        />
      );
    }
  
    //registration form
    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Register</h2>
        
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
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
  
          <div>
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
  
          <div>
            <label className="block text-gray-700 mb-2">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
  
          <div>
            <label className="block text-gray-700 mb-2">Company Name (Optional)</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
  
          <div>
            <label className="block text-gray-700 mb-2">Phone Number (Optional)</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
  
          <Button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded text-white font-semibold
              ${loading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
              variant="contained"
          >
            {loading ? 'Registering...' : 'Register'}
          </Button>
        </form>
      </div>
    );
  };