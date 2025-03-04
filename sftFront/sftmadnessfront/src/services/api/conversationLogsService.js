import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

//log conversation
//get conversation logs
//get user Id by cognito - helper method
//conversation logs:

export const conversationLogsService = {
  //log conversation
  logConversation: async (logData) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      console.log('Logging new conversation:', logData);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/conversation_logs`, {
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
        throw new Error(`Failed to log conversation: ${response.status}`);
      }
      
      const responseData = await response.json();
      return responseData.log;
    } catch (error) {
      console.error('Error logging conversation:', error);
      throw error;
    }
  },

  //get conversation logs for a user
  getConversationLogs: async (userId, options = {}) => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) {
        throw new Error('Authentication required');
      }
      const token = session.tokens.idToken.toString();
      
      //build query parameters
      const queryParams = new URLSearchParams();
      
      if (options.contactId) {
        queryParams.append('contactId', options.contactId);
      }
      
      if (options.interactionType) {
        queryParams.append('interactionType', options.interactionType);
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
      
      //appends query parameters to request if they exist, otherwise empty string
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      console.log(`Fetching conversation logs for user ID: ${userId}${queryString ? ' with filters' : ''}`);
      
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/conversation_logs/${userId}${queryString}`, {
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
        throw new Error(`Failed to fetch conversation logs: ${response.status}`);
      }
      
      const responseData = await response.json();
      return {
        logs: responseData.logs,
        pagination: responseData.pagination
      };
    } catch (error) {
      console.error('Error fetching conversation logs:', error);
      throw error;
    }
  },

  //helper method to get current user's db Id
  //get user by cognito Id
  getUserByCognitoId: async () => {
    try {
      const cognitoUser = await getCurrentUser();
      console.log('Current Cognito user:', cognitoUser);
      
      const session = await fetchAuthSession();
      
      const token = session.tokens.idToken.toString();
      console.log('Using ID token for authorization');
      
      console.log('Fetching user by Cognito ID:', cognitoUser.userId);
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
        
        try {
          //creates basic user in cognito (fallback approach)
          return {
            cognitoId: cognitoUser.userId,
            username: cognitoUser.username,
            email: cognitoUser.username,
            companyName: '',
            phoneNumber: '',
            id: 1,
            createdFromCognito: true
          };
        } catch (err) {
          console.error('Error in fallback user creation:', err);
          throw new Error('Could not determine user database ID');
        }
      }
      
      const userData = await response.json();
      return userData.user;
    } catch (error) {
      console.error('Error getting user by Cognito ID:', error);
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

export default conversationLogsService;