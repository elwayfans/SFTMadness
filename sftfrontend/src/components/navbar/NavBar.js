import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './NavBar.css';

function NavBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsLoggedIn(false);
    navigate('/');
  };

  return (
    <nav>
      <img src="/images/sft.png" alt="sft" className="images" />
      <ul>
        <li>
          <Link className="flex-container" to="/">Home</Link>
          <Link className="flex-container" to="/aboutus">About Us</Link>
          <Link className='flex-container' to="/bot-selector">Bot Selector</Link>

           {!isLoggedIn ? (
            <Link className="flex-container" to="/login">Login</Link>
          ) : (
            <>
              <Link className="flex-container" to="/profile">Profile</Link>
              <button className="flex-container" onClick={handleLogout}>Logout</button>
            </>
          )}
        </li>
      </ul>
    </nav>
  );
}

export default NavBar;