import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { userService } from './userService';

//create admin user as an admin
//update user role
//get user by Id
//get all users
//delete user
//log admin action
//get admin logs
//admins:

export const adminsService = {
  //create admin user
  createAdmin: async (adminData) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log('Creating new admin user:', adminData);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/admins`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify(adminData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to create admin: ${response.status}`);
      }
      
      const responseData = await response.json();
      return {
        admin: responseData.admin,
        cognitoUser: responseData.cognitoUser
      };
    } catch (error) {
      console.error('Error creating admin:', error);
      throw error;
    }
  },

  //update a user's role (promote to admin or demote to customer) as an admin
  updateUserRole: async (updateData) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log('Updating user role:', updateData);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/admins`, {
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
        throw new Error(`Failed to update user role: ${response.status}`);
      }
      
      const responseData = await response.json();
      return responseData.user;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },

  //get user by Id
  getUserById: async (userId) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log(`Fetching user with ID: ${userId}`);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/admins/${userId}`, {
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
        throw new Error(`Failed to fetch user: ${response.status}`);
      }
      
      const responseData = await response.json();
      return responseData.user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },

  //get all users, allows for filtering and pagination
  getUsers: async (options = {}) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      //build query parameters
      const queryParams = new URLSearchParams();
      
      if (options.role) {
        queryParams.append('role', options.role);
      }
      
      if (options.search) {
        queryParams.append('search', options.search);
      }
      
      if (options.limit) {
        queryParams.append('limit', options.limit);
      }
      
      if (options.offset) {
        queryParams.append('offset', options.offset);
      }
      
      //appends query parameters to request if they exist, otherwise empty string
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      console.log(`Fetching users${queryString ? ' with filters' : ''}`);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/admins${queryString}`, {
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
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
      
      const responseData = await response.json();
      return {
        users: responseData.users,
        pagination: responseData.pagination
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  //delete user
  deleteUser: async (userId) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log(`Deleting user with ID: ${userId}`);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/admins/${userId}`, {
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
        throw new Error(`Failed to delete user: ${response.status}`);
      }
      
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  //log an admin action
  logAction: async (logData) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log('Logging admin action:', logData);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/admins/log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify(logData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to log action: ${response.status}`);
      }
      
      const responseData = await response.json();
      return responseData.log;
    } catch (error) {
      console.error('Error logging action:', error);
      throw error;
    }
  },

  //get all admin logs for a target user, allows for filtering and pagination
  getLogs: async (userId, options = {}) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      //build query parameters
      const queryParams = new URLSearchParams();
      
      if (options.actionType) {
        queryParams.append('actionType', options.actionType);
      }
      
      if (options.startDate) {
        queryParams.append('startDate', options.startDate);
      }
      
      if (options.endDate) {
        queryParams.append('endDate', options.endDate);
      }
      
      if (options.limit) {
        queryParams.append('limit', options.limit);
      }
      
      if (options.offset) {
        queryParams.append('offset', options.offset);
      }
      
      //url depends on whether a userId is provided
      let url;
      if (userId) {
        url = `${process.env.REACT_APP_API_ENDPOINT}/admins/log/${userId}`;
      } else {
        //returns all logs
        url = `${process.env.REACT_APP_API_ENDPOINT}/admins/log`;
      }
      
      //appends query parameters to request if they exist, otherwise empty string
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      url += queryString;
      
      console.log(`Fetching admin logs${userId ? ` for userId: ${userId}` : ' for all users'}${queryString ? ' with filters' : ''}`);
      
      const response = await fetch(url, {
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
        throw new Error(`Failed to fetch logs: ${response.status}`);
      }
      
      const responseData = await response.json();
      return {
        logs: responseData.logs,
        pagination: responseData.pagination,
        filters: responseData.filters
      };
    } catch (error) {
      console.error('Error fetching logs:', error);
      throw error;
    }
  },

  //get current user ID from db with cognito Id
  getCurrentUserId: async () => {
    try {
      return await userService.getCurrentUserId();
    } catch (error) {
      console.error('Error getting current user ID from adminsService:', error);
      throw error;
    }
  },

  //check if current user is an admin
  isAdmin: async () => {
    try {
      //get cognito user
      const cognitoUser = await getCurrentUser();
      if (!cognitoUser) {
        return false;
      }
      
      //get auth session (Id token)
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        return false;
      }
      
      const token = session.tokens.idToken.toString();
      
      //fetch user with cognito Id
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/users/cognito/${cognitoUser.userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        }
      });
      
      if (!response.ok) {
        console.error(`Error looking up user by Cognito ID: ${response.status}`);
        return false;
      }
      
      const userData = await response.json();
      //check if user is an admin
      return userData.user && userData.user.role === 'admin';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
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

export default adminsService;