import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

//create school contact
//get school contact by Id
//update school contact
//delete school contact
//school contact:

export const schoolContactService = {
  //create school contact
  createContact: async (contactData) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log('Creating new school contact:', contactData);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/contact`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify(contactData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to create contact: ${response.status}`);
      }
      
      const responseData = await response.json();
      return responseData.contact;
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  },

  //get school contact by Id
  getContactById: async (contactId) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log(`Fetching contact with ID: ${contactId}`);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/contact/${contactId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to fetch contact: ${response.status}`);
      }
      
      const responseData = await response.json();
      return responseData.contact;
    } catch (error) {
      console.error('Error fetching contact:', error);
      throw error;
    }
  },

  //update school contact
  updateContact: async (contactId, updateData) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log(`Updating contact ID ${contactId} with:`, updateData);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/contact/${contactId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to update contact: ${response.status}`);
      }
      
      const responseData = await response.json();
      return responseData.contact;
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  },

  //delete school contact
  deleteContact: async (contactId) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log(`Deleting contact with ID: ${contactId}`);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/contact/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to delete contact: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  },

  //check if user is authenticated
  isAuthenticated: async () => {
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      return !!user && !!session?.tokens?.idToken;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }
};

export default schoolContactService;