/*
Use the naming convention as you see below so that this navbar can stay clean. 
Other Routes/ nav that needs to be added:
Profile (Student)
Profile (School)
Admin (SFT/ schools)
*/
import React from 'react';
import './NavBar.css'
import { Link } from 'react-router-dom';

function NavBar() {
  return (
    <nav>
      <ul>
        <li>
          <Link to="/">Home</Link>
          <Link to="/signup">Sign Up</Link>
          <Link to="/login">Login</Link>
          <Link to="/aboutus">About Us</Link>
        </li>
      </ul>
    </nav>
  );
}

export default NavBar;