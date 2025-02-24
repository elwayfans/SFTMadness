import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/logIn';
import { RegisterForm } from './components/register';
import { userService } from './services/api/userService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await userService.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (result) => {
    setIsAuthenticated(true);
  };

  const handleRegisterSuccess = async (result) => {
    // Automatically log in after successful registration
    setIsAuthenticated(true);
    // try {
    //   const loginResult = await userService.login(
    //     result.user.email,
    //     result.user.password
    //   );
    //   if (loginResult.success) {
    //     setIsAuthenticated(true);
    //   }
    // } catch (error) {
    //   console.error('Auto-login after registration failed:', error);
    // }
  };

  const handleSignOut = async () => {
    try {
      await userService.signOut();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-center text-blue-600 mb-8">
            SFT Madness
          </h1>
          
          {showRegister ? (
            <>
              <RegisterForm onSuccess={handleRegisterSuccess} />
              <p className="text-center mt-4">
                Already have an account?{' '}
                <button
                  onClick={() => setShowRegister(false)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Login here
                </button>
              </p>
            </>
          ) : (
            <>
              <LoginForm onSuccess={handleLoginSuccess} />
              <p className="text-center mt-4">
                Don't have an account?{' '}
                <button
                  onClick={() => setShowRegister(true)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Register here
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
        <h1 className="text-2xl font-bold text-blue-600
          mb-4">Welcome to SFT Madness</h1>
        <button
          onClick={handleSignOut}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export default App;

// import { Authenticator } from '@aws-amplify/ui-react';
// import '@aws-amplify/ui-react/styles.css';

// function App() {
//   return (
//     <Authenticator>
//       {({ signOut }) => (
//         <div className="min-h-screen bg-gray-100 p-8">
//           <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
//             <h1 className="text-2xl font-bold text-blue-600 mb-4">Welcome to SFT Madness</h1>
//             <button 
//               onClick={signOut}
//               className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
//             >
//               Sign out
//             </button>
//           </div>
//         </div>
//       )}
//     </Authenticator>
//   );
// }

// export default App;