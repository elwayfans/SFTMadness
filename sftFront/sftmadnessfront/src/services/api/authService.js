import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession, resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { post } from 'aws-amplify/api';

export const authService = {
  // Sign in with email and password
  login: async (email, password) => {
    try {
      const { isSignedIn, nextStep } = await signIn({ 
        username: email,
        password,
      });
      
      if (isSignedIn) {
        // Get the current session
        const session = await fetchAuthSession();
        return {
          success: true,
          session: session
        };
      }
      
      return {
        success: false,
        nextStep
      };
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  // Register a new user
  register: async (userData) => {
    try {
      const { email, password, ...rest } = userData;
      
      // First register with Cognito
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email
          }
        }
      });

      if (isSignUpComplete) {
        // Then create user record in your database
        const response = await post({
          apiName: 'sftMadnessApi',
          path: '/users',
          options: {
            body: {
              email,
              password,
              ...rest
            }
          }
        });

        return {
          success: true,
          user: response.data
        };
      }

      return {
        success: false,
        nextStep
      };
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  },

  // Sign out user
  logout: async () => {
    try {
      await signOut();
      return {
        success: true
      };
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  // Get current authenticated user
  getCurrentUser: async () => {
    try {
      const user = await getCurrentUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  },

  // Get current session
  getCurrentSession: async () => {
    try {
      const session = await fetchAuthSession();
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      throw error;
    }
  },

  // Initiate password reset
  forgotPassword: async (email) => {
    try {
      const { nextStep } = await resetPassword({ username: email });
      return {
        success: true,
        nextStep
      };
    } catch (error) {
      console.error('Error initiating password reset:', error);
      throw error;
    }
  },

  // Complete password reset
  confirmForgotPassword: async (email, code, newPassword) => {
    try {
      const { isSuccess } = await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword
      });
      
      return {
        success: isSuccess
      };
    } catch (error) {
      console.error('Error confirming password reset:', error);
      throw error;
    }
  },

  // Helper method to check if user is authenticated
  isAuthenticated: async () => {
    try {
      const user = await getCurrentUser();
      return !!user;
    } catch {
      return false;
    }
  }
};

export default authService;