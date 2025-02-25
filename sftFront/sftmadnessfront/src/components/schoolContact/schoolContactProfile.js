//gets school contact, displays school contact information, allows for user to update school contact info, allows user to delete school contact
import React, { useState, useEffect } from 'react';
import { schoolContactService } from '../../services/api/schoolContactService.js';

export const SchoolContactProfile = ({ contactId, onUpdate, onDelete }) => {
  const [contact, setContact] = useState({
    email: '',
    phoneNumber: '',
  });

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchContactDetails = async () => {
      try {
        setLoading(true);
        setError('');
        
        if (!contactId) {
          setError('No contact ID provided');
          setLoading(false);
          return;
        }
        
        const contactData = await schoolContactService.getContactById(contactId);
        
        setContact({
          email: contactData.email || '',
          phoneNumber: contactData.phonenumber || '',
        });
      } catch (err) {
        console.error('Error fetching contact:', err);
        setError('Failed to load contact details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
  
    fetchContactDetails();
  }, [contactId]);

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
    setUpdating(true);

    try {
      // Create update payload
      const updatePayload = {
        email: contact.email,
        phoneNumber: contact.phoneNumber
      };
      
      console.log(`Updating contact ${contactId} with:`, updatePayload);
      
      const updatedContact = await schoolContactService.updateContact(contactId, updatePayload);
      
      setSuccess('Contact updated successfully');
      
      // Notify parent component
      if (onUpdate) {
        onUpdate(updatedContact);
      }
    } catch (err) {
      console.error('Error updating contact:', err);
      setError(err.message || 'Failed to update contact. The API may be unavailable.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this contact? This action cannot be undone.')) {
      return;
    }
    
    setError('');
    setSuccess('');
    setDeleting(true);
    
    try {
      await schoolContactService.deleteContact(contactId);
      
      setSuccess('Contact deleted successfully');
      
      // Notify parent component
      if (onDelete) {
        onDelete(contactId);
      }
    } catch (err) {
      console.error('Error deleting contact:', err);
      setError(err.message || 'Failed to delete contact. The API may be unavailable.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">School Contact Details</h2>

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
            value={contact.phoneNumber || ''}
            onChange={handleChange}
            placeholder="Enter contact phone number"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={updating}
            className={`flex-1 py-2 px-4 rounded text-white font-semibold
              ${updating ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {updating ? 'Updating...' : 'Update Contact'}
          </button>
          
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className={`py-2 px-4 rounded text-white font-semibold
              ${deleting ? 'bg-red-300' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SchoolContactProfile;