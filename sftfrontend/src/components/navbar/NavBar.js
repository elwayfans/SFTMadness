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
    /*
    if logged in display the following navbar and have the profile link show a drop down menu that shows settings and sign out

    <nav>
      <img src="/images/sft.png" alt="sft" className="images" />
      <ul>
        <li>
          <Link className='flex-container' to="/">Home</Link>
          <Link className='flex-container' to="/aboutus">About Us</Link>
          <Link className='flex-container' to="/ai-chatbot">Chat(AI)</Link>
          <Link className='flex-container' to="/Profile">Profile</Link>

                make the above link a drop down that has Settings and Sign Out
        </li>
      </ul>
    </nav>
    */

    <nav>
      <img src="/images/sft.png" alt="sft" className="images" />
      <ul>
        <li>
          <Link className='flex-container' to="/">Home</Link>
          <Link className='flex-container' to="/aboutus">About Us</Link>
          <Link className='flex-container' to="/signup">Sign Up</Link>
          <Link className='flex-container' to="/login">Login</Link>
        </li>
      </ul>
    </nav>
  );
}

export default NavBar;