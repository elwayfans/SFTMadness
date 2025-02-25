import React, { Fragment } from 'react'
import { Helmet } from 'react-helmet'
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import DataTakeIn from './components/DataTakeIn'
import Navbar1 from './components/navbar1'


function App() {
  
  return (
    <Authenticator>
      {({ signOut }) => (
        
        <div className="min-h-screen bg-gray-100 p-8">
          
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
           <h1 className="text-2xl font-bold text-blue-600 mb-4">Welcome to SFT Madness</h1>
            
            <DataTakeIn/>
            <button 
              onClick={signOut}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </Authenticator>
  );
}

export default App;

// import { Amplify } from 'aws-amplify';
// import { Authenticator } from '@aws-amplify/ui-react';
// import '@aws-amplify/ui-react/styles.css';
// import awsConfig from './aws-config';
// import logo from './logo.svg';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//         <p>
//           i love you kylie
//         </p>
//       </header>
//     </div>
//   );
// }

// export default App;


// Amplify.configure(awsConfig);

// function App() {
//   return (
//     <Authenticator>
//       {({ signOut, user }) => (
//         <div className="App">
//           <h1>Hello World</h1>
//           <button onClick={signOut}>Sign out</button>
//         </div>
//       )}
//     </Authenticator>
//   );
// }

// export default App;