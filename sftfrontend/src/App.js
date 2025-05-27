import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import NavBar from './components/navbar/NavBar.js';
import Info from './components/about_contact_us/Info.js';
import Home from './components/home/Home.js';
import Login from './components/authentication/Login.js';
import ForgotPassword from './components/authentication/ForgotPassword.js';
import School from './components/users/SchoolProfile.js';
import Sft from './components/admin/AdminProfile.js';
import Settings from './components/settings/Settings.js';
import AddContacts from './components/addContacts/AddContacts.js';
import ChatAi from './components/ai/ChatBot.js';
import BotSelector from './components/ai/BotSelector.js';

function RequireAuth({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function ProfileRouter() {
  const role = localStorage.getItem('role');
  if (role === '') return <School />;
  if (role === 'SFT') return <Sft />;
  return <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <NavBar />
      <div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/aboutus" element={<Info />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgotpassword" element={<ForgotPassword />} />
          <Route path="/profile" element={
            <RequireAuth>
              <ProfileRouter />
            </RequireAuth>
          } />
          <Route path="/settings" element={<Settings />} />
          <Route path="/addcontacts" element={<AddContacts />} />
          <Route path="/chat-ai" element={<ChatAi />} />
          <Route path="/bot-selector" element={<BotSelector />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;