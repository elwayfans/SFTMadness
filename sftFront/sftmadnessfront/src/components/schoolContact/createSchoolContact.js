import React, { useState } from 'react';
import { schoolContactService } from '../../services/api/schoolContactService.js';

export const CreateContact = ({ onSuccess }) => {
  const [contact, setContact] = useState({
    email: '',
    phoneNumber: '',
  });

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setContact({
      ...contact,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate form
    if (!contact.email && !contact.phoneNumber) {
      setError('Please provide either an email or phone number');
      return;
    }
    
    setCreating(true);

    try {
      const newContact = await schoolContactService.createContact(contact);
      
      setSuccess(`Contact created successfully with ID: ${newContact.id}`);
      
      // Reset form
      setContact({
        email: '',
        phoneNumber: '',
      });
      
      // Notify parent component
      if (onSuccess) {
        onSuccess(newContact);
      }
    } catch (err) {
      console.error('Error creating contact:', err);
      setError(err.message || 'Failed to create contact. The API may be unavailable.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Create School Contact</h2>

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
            value={contact.email}
            onChange={handleChange}
            placeholder="Enter contact email"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            name="phoneNumber"
            value={contact.phoneNumber}
            onChange={handleChange}
            placeholder="Enter contact phone number"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={creating}
          className={`w-full py-2 px-4 rounded text-white font-semibold
            ${creating ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {creating ? 'Creating...' : 'Create Contact'}
        </button>
      </form>
    </div>
  );
};

export default CreateContact;