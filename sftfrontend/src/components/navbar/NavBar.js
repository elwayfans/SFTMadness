import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './NavBar.css';

function NavBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState('');
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    setIsLoggedIn(!!token);
    if (storedRole) {
      setRole(storedRole);
    }
  }, []);

  return (
    <nav>
      <img src="/images/sft.png" alt="sft" className="images" />
      <ul>
        <li>
          <Link className='flex-container' to="/">Home</Link>
          <Link className='flex-container' to="/aboutus">About Us</Link>
          <Link className='flex-container' to="/login">Login</Link>
          <Link className='flex-container' to="/bot-selector">Bot Selector</Link>
        </li>
      </ul>
    </nav>
  );
}

export default NavBar;
