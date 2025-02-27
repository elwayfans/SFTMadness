import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

export const userService = {
  // Register new user
  register: async (userData) => {
    try {
      const { email, password, companyName, phoneNumber } = userData;
      console.log('Starting registration process...', { email, companyName, phoneNumber });

      // First register with Cognito
      const signUpResult = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email
          }
        }
      });

      console.log('Cognito signup result:', signUpResult);

      return {
        success: true,
        isSignUpComplete: signUpResult.isSignUpComplete,
        userId: signUpResult.userId,
        email,
        password,
        companyName,
        phoneNumber
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  completeRegistration: async (userData) => {
    try {
      const { email, password, companyName, phoneNumber } = userData;

      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin 
        },
        body: JSON.stringify({
          email,
          password,
          role: 'customer',
          companyName: companyName || '',
          phoneNumber: phoneNumber || '',
          skipCognitoCreation: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`API Error: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Backend API response:', responseData);

      return {
        success: true,
        user: responseData
      };
    } catch (error) {
      console.error('Complete registration error:', error);
      throw error;
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password
      });

      if (isSignedIn) {
        const session = await fetchAuthSession();
        return {
          success: true,
          session,
          token: session.tokens.idToken.toString()
        };
      }

      return {
        success: false,
        nextStep
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Get database user by Cognito ID
  getUserByCognitoId: async () => {
    try {
      // Get Cognito user
      const cognitoUser = await getCurrentUser();
      console.log('Current Cognito user:', cognitoUser);
      
      // Get auth session
      const session = await fetchAuthSession();
      
      // Use the ID token instead of the access token
      const token = session.tokens.idToken.toString();
      console.log('Using ID token for authorization');
      
      // Create a custom endpoint to look up the user by Cognito ID
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
        
        // Try a different approach - direct query for all users and filter
        try {
          // Create a basic user from Cognito data as fallback
          return {
            cognitoId: cognitoUser.userId,
            username: cognitoUser.username,
            email: cognitoUser.username,
            companyName: '',
            phoneNumber: '',
            id: 1, // Default ID
            createdFromCognito: true
          };
        } catch (err) {
          console.error('Error in fallback user creation:', err);
          throw new Error('Could not determine user database ID');
        }
      }
      
      // Parse the response
      const userData = await response.json();
      return userData.user;
    } catch (error) {
      console.error('Error getting user by Cognito ID:', error);
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      // Create a more robust mechanism to get the user from your database
      try {
        // Try to get the user data from the database using Cognito ID
        const userData = await userService.getUserByCognitoId();
        return userData;
      } catch (dbError) {
        console.error('Error fetching user profile from DB:', dbError);
        
        // Fall back to just Cognito data if DB lookup fails
        const cognitoUser = await getCurrentUser();
        return {
          cognitoId: cognitoUser.userId,
          username: cognitoUser.username,
          email: cognitoUser.username,
          companyName: '',
          phoneNumber: '',
          id: 1, // Default ID
          createdFromCognito: true
        };
      }
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      throw error;
    }
  },

  // Get user profile from the database API
  getUserProfile: async (userId) => {
    try {
      // Get the auth token
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      
      console.log(`Fetching user profile for ID: ${userId}`);
      
      // Make the API call with the database ID
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/users/${userId}`, {
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
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }
      
      const userData = await response.json();
      return userData;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (userId, userData) => {
    try {
      // Get the auth token
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      
      console.log(`Updating user profile for ID: ${userId}`, userData);
      
      // Make the API call with the database ID
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to update profile: ${response.status}`);
      }
      
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  // Delete user
  deleteUser: async (userId) => {
    try {
      // Get the auth token
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      
      // Make the API call with the database ID
      const response = await fetch(`${process.env.REACT_APP_API_ENDPOINT}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': window.location.origin
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}): ${errorText}`);
        throw new Error(`Failed to delete user: ${response.status}`);
      }
      
      // Sign out from Cognito after successful deletion
      await signOut();
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // Get current session
  getCurrentSession: async () => {
    try {
      const session = await fetchAuthSession();
      return session;
    } catch (error) {
      console.error('Error getting current session:', error);
      throw error;
    }
  },

  // Check if user is authenticated
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

export default userService;