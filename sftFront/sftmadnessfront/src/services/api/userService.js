import { post, get, put, del } from 'aws-amplify/api';
import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

const apiName = 'sft';

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
          token: session.tokens.accessToken.toString()
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

  // Get user profile
  getUserProfile: async (userId) => {
    try {
      const session = await fetchAuthSession();
      const response = await get({
        apiName: apiName,
        path: `/users/${userId}`,
        options: {
          headers: {
            Authorization: `Bearer ${session.tokens.accessToken.toString()}`
          }
        }
      });
      return response.body;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (userId, userData) => {
    try {
      const session = await fetchAuthSession();
      const response = await put({
        apiName: apiName,
        path: `/users/${userId}`,
        options: {
          headers: {
            Authorization: `Bearer ${session.tokens.accessToken.toString()}`
          },
          body: userData
        }
      });
      return response.body;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  // Delete user
  deleteUser: async (userId) => {
    try {
      const session = await fetchAuthSession();
      await del({
        apiName: apiName,
        path: `/users/${userId}`,
        options: {
          headers: {
            Authorization: `Bearer ${session.tokens.accessToken.toString()}`
          }
        }
      });
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
      return !!user;
    } catch {
      return false;
    }
  }
};

export default userService;