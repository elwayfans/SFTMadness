import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './NavBar.css';

function NavBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check login state on every route change
    const token = localStorage.getItem('token') || document.cookie.includes('idToken');
    setIsLoggedIn(!!token);
  }, [location]); // <-- rerun when route changes

  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsLoggedIn(false);

    await fetch("http://localhost:8000/logout", {
      method: "POST",
      credentials: "include",
    });

    document.cookie = "idToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    navigate('/login');
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
              <Link className="flex-container" onClick={handleLogout}>Log out</Link>
            </>
          )}
        </li>
      </ul>
    </nav>
  );
}

export default NavBar;