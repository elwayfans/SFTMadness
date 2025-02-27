import { Amplify } from 'aws-amplify';

const awsConfig = {
  Auth: {
    Cognito: {
      region: 'us-east-2',
      userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
      userPoolClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
      mandatorySignIn: true,
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true,
        phone: false,
        username: false
      }
    }
  },
  API: {
    REST: {
      MyAPI: {
        endpoints: [
          {
            name: 'sft',
            endpoint: process.env.REACT_APP_API_ENDPOINT,
            region: 'us-east-2',
            custom_header: async () => {
              return {
                'Content-Type': 'application/json',
                // Authorization: `Bearer ${(await Amplify.Auth.currentSession()).getIdToken().getJwtToken()}
              };
            }
          }
        ]
      }
    }
  }
};

try {
  if (!process.env.REACT_APP_COGNITO_USER_POOL_ID) {
    throw new Error('User Pool ID is not configured');
  }
  if (!process.env.REACT_APP_COGNITO_CLIENT_ID) {
    throw new Error('Client ID is not configured');
  }
  if (!process.env.REACT_APP_API_ENDPOINT) {
    throw new Error('API Endpoint is not configured');
  }
  
  Amplify.configure(awsConfig);
  console.log('Amplify configured successfully with:', {
    userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
    apiEndpoint: process.env.REACT_APP_API_ENDPOINT
  });
} catch (error) {
  console.error('Error configuring Amplify:', error);
}

export default awsConfig;