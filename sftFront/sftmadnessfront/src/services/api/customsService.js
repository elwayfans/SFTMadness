import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

//create customs related to user
//get all customs related to user
//update customs related to user
//delete all customs related to user
//customs:

export const customsService = {
  //create customs related to user
  setCustoms: async (customsData) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log('Creating new customs:', customsData);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/customs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify(customsData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to create customs: ${response.status}`);
      }
      
      const responseData = await response.json();
      return responseData.customs;
    } catch (error) {
      console.error('Error creating customs:', error);
      throw error;
    }
  },

  //get customs related to current user
  getCustoms: async () => {
    try {
      // Get auth session with Id token
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log('Fetching customs for current user');
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/customs`, {
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
        throw new Error(`Failed to fetch customs: ${response.status}`);
      }
      
      const responseData = await response.json();
      return responseData.customs;
    } catch (error) {
      console.error('Error fetching customs:', error);
      throw error;
    }
  },

  //update customs related to current user
  updateCustoms: async (updateData) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log('Updating customs with:', updateData);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/customs`, {
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
        throw new Error(`Failed to update customs: ${response.status}`);
      }
      
      const responseData = await response.json();
      return responseData.customs;
    } catch (error) {
      console.error('Error updating customs:', error);
      throw error;
    }
  },

  //delete customs related to current user
  deleteCustoms: async () => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log('Deleting customs for current user');
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/customs`, {
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
        throw new Error(`Failed to delete customs: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting customs:', error);
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

export default customsService;