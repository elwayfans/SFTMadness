import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './components/authentication/Login.js';
import ForgotPassword from './components/authentication/ForgotPassword.js';
import UpdatePassword from './components/authentication/UpdatePassword.js';
import School from './components/users/SchoolProfile.js';
import Sft from './components/admin/AdminProfile.js';
import AddContacts from './components/addContacts/AddContacts.js';
import ChatAi from './components/ai/ChatBot.js';
import BotSelector from './components/ai/BotSelector.js';

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Helper to decode JWT and extract payload
function parseJwt(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function RequireAuth({ children }) {
  const token = getCookie('idToken');
  console.log("RequireAuth token (cookie):", token);
  return token ? children : <Navigate to="/profile" />;
}

function RequireAdmin({ children }) {
  const idToken = getCookie('idToken');
  const payload = parseJwt(idToken);
  const groups = payload && (payload['cognito:groups'] || []);
  const role = Array.isArray(groups) && groups.length > 0 ? groups[0] : null;
  return role && role.toLowerCase().includes('sftadmin')
    ? children
    : <Navigate to="/login" />;
}

function ProfileRouter() {
  const idToken = getCookie('idToken');
  const payload = parseJwt(idToken);
  console.log("Full JWT payload:", payload);
  const groups = payload && (payload['cognito:groups'] || []);
  console.log("Groups from token:", groups);
  const role = Array.isArray(groups) && groups.length > 0 ? groups[0] : null;
  console.log("ProfileRouter role (from token):", role);

  // Admins
  if (role && role.toLowerCase().includes('sftadmin')) return <Sft />;
  // Schools: no role/group or empty string
  if (!role || role === "") return <School />;
  // Fallback
  return <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgotpassword" element={<ForgotPassword />} />
          <Route path="/updatepassword" element={<UpdatePassword />} />
          <Route path="/profile" element={
            <RequireAuth>
              <ProfileRouter />
            </RequireAuth>
          } />
          <Route path="/addcontacts" element={<AddContacts />} />
          <Route path="/chat-ai" element={<ChatAi />} />
          <Route path="/bot-selector" element={
            <RequireAdmin>
              <BotSelector />
            </RequireAdmin>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;