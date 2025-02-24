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
    console.log('Starting registration with data:', userData);
    
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

    if (signUpResult.isSignUpComplete) {
      // Make API call to your backend
      try {
        const response = await post({
          apiName: 'sft',
          path: '/users',
          options: {
            body: {
              email,
              password,
              role: 'customer',
              companyName: rest.companyName || '',
              phoneNumber: rest.phoneNumber || ''
            }
          }
        });
        
        console.log('Backend API response:', response);
        
        return {
          success: true,
          user: response.body
        };
      } catch (apiError) {
        console.error('Backend API Error:', apiError);
        // Clean up Cognito user if DB creation fails
        await signOut();
        throw new Error(apiError.message || 'Failed to create user in database');
      }
    }
  
    return {
      success: false,
      nextStep: signUpResult.nextStep
    };
  } catch (error) {
    console.error("Registration error:", error);
    // Attempt to clean up if there's an error
    try {
      await signOut();
    } catch (e) {
      console.error('Error during cleanup:', e);
    }
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