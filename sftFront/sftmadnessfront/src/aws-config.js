import { Amplify } from 'aws-amplify';
import { signIn, getCurrentUser, fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';

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
      sftMadnessApi: {
        endpoint: process.env.REACT_APP_API_ENDPOINT,
        region: 'us-east-2',
        custom_header: async () => {
          try {
            const session = await fetchAuthSession();
            return {
              Authorization: `Bearer ${session.tokens.accessToken.toString()}`
            };
          } catch (error) {
            console.error('Error getting auth header:', error);
            return {};
          }
        }
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
  
  Amplify.configure(awsConfig);
  console.log('Amplify configured successfully');
} catch (error) {
  console.error('Error configuring Amplify:', error);
}

export default awsConfig;

// import { Amplify } from 'aws-amplify';
// import { signIn, getCurrentUser, fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';

// const awsConfig = {
//   Auth: {
//     region: 'us-east-2',
//     userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
//     userPoolWebClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
//     mandatorySignIn: true,
//     authenticationFlowType: 'USER_PASSWORD_AUTH'
//   },
//   API: {
//     endpoints: [
//       {
//         name: 'sftMadnessApi',
//         endpoint: process.env.REACT_APP_API_ENDPOINT,
//         region: 'us-east-2',
//         custom_header: async () => {
//           try {
//             const { tokens } = await fetchAuthSession();
//             return {
//               Authorization: `Bearer ${tokens.idToken.toString()}`
//             };
//           } catch (error) {
//             console.error('Error getting session:', error);
//             return {};
//           }
//         }
//       }
//     ]
//   }
// };

// Amplify.configure(awsConfig);

// export default awsConfig;