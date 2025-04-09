/*
Use the naming convention as you see below so that these routes can stay clean. 
To do list:
Hook up routes 
Make navbar ----
*/
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import NavBar from './components/navbar/NavBar.js'
import Info from './components/about_contact_us/Info.js'
import Home from './components/home/Home.js'
import Register from './components/authentication/Register.js'
import Login from './components/authentication/Login.js'
import ForgotPassword from './components/authentication/ForgotPassword.js'

function App() {
  return (
    <Router>
      <NavBar />
      <div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/aboutus" element={<Info />} />
          <Route path="/signup" element={<Register />} /> 
          <Route path="/login" element={<Login />} /> 
          <Route path="/forgotpassword" element={<ForgotPassword/>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
