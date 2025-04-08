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
// import logo from '../../public/sft.png';

function NavBar() {
  return (
    <nav>
      <img src="/images/sft.png" alt="sft" className="images" />
      <ul>
        <li>
          <Link className='flex-container' to="/">Home</Link>
          <Link className='flex-container' to="/signup">Sign Up</Link>
          <Link className='flex-container' to="/login">Login</Link>
          <Link className='flex-container' to="/aboutus">About Us</Link>
        </li>
      </ul>
    </nav>
  );
}

export default NavBar;