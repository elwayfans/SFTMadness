/*
✖have user input fields for the following so that a user can register
    first and last name
    email
    phone number
    school name
    password
    verify password
✖add register button at bottom
*/
import React, { useState } from 'react'
import './Auth.css';

const Register = () => {
    const [formData, setFormData] = useState({
        fname: '',
        lname: '',
        email: '',
        password: '',
        confirmPassword: '',
        school: '',
        number: ''
    })

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {

    };

    return (
        <div className='signUp'>
            <h1 className='signUpTitle'>Sign Up</h1>

            <form onSubmit={handleSubmit} className='signUpForm'>
                <label>First Name:</label>
                <input type="text" name="fName" placeholder="First Name" value={formData.fname} onChange={handleChange} />
                <label>Last Name:</label>
                <input type="text" name="lName" placeholder="Last Name" value={formData.lname} onChange={handleChange} />
                <label>Email:</label>
                <input type="email" name="email" placeholder="Your Email" value={formData.email} onChange={handleChange} />
                <label>Password:</label>
                <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} />
                <label>Confirm Password:</label>
                <input type="password" name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} />
                <label>School:</label>
                <input type="text" name="school" placeholder="School Name" value={formData.school} onChange={handleChange} />
                <label>Phone Number:</label>
                <input type="number" name="number" placeholder="Your Number" value={formData.number} onChange={handleChange} />
                <button className='registerbtn' type="submit">Register</button>
            </form>
        </div>
    );
};

export default Register;