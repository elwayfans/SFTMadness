import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './NavBar.css';

function NavBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    setIsLoggedIn(!!token);
    if (storedRole) {
      setRole(storedRole);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsLoggedIn(false);
    setRole('');
    navigate('/');
  };

  return (
    <nav>
      <img src="/images/sft.png" alt="sft" className="images" />
      <ul>
        <li>
          <Link className="flex-container" to="/">Home</Link>
          <Link className="flex-container" to="/aboutus">About Us</Link>

          {!isLoggedIn ? (
            <>
              <Link className="flex-container" to="/login">Login</Link>
            </>
          ) : (
            <>
              {role === 'School' && (
                <Link className="flex-container" to="/school-profile">Profile</Link>
              )}
              {role === 'SFT' && (
                <Link className="flex-container" to="/admin-profile">Profile</Link>
              )}
              <button className="flex-container" onClick={handleLogout}>Logout</button>
            </>
          )}
        </li>
      </ul>
    </nav>
  );
}

export default NavBar;
