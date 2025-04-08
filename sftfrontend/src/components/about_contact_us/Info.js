/*
✔add both the about us and contact us as one page

✔about us:
    should give a brief description of what source for training does to
        help a school and the benefits that the ai will bring to the school

✔Contact us:
    create a form that allows a user to enter the following details (* = required)
        *first and last name
        *email
        *school name
        *phone number
        *message/content
    add submit button so user can send the form to daniel or another SFT member
*/
import React, { useState } from 'react'
import './Info.css';
import emailjs from 'emailjs-com';

const Info = () => {
    const [formData, setFormData] = useState({
        fname: '',
        lname: '',
        email: '',
        number: '',
        school: '',
        message: ''
    })

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if ( !formData.email || !formData.number || !formData.school || !formData.message) {
            setError('Please fill in all fields!');
            return;
        }
        // !formData.fname || !formData.lname ||

        if (!/\S+@\S+\.\S+/.test(formData.email)) {
            setError('Please enter a vaild email address!')
            return;
        }

        console.log('Form submitted:', formData);
        setSuccess("Thank you for reaching out! We'll get back to you soon.");

        setFormData({
            // fname: '',
            // lname: '',
            email: '',
            number: '',
            school: '',
            message: ''
        });
    };

    return (
        <div className='aboutContactUs'>
            <h1 className='aboutUsTitle'>About Us</h1>
            <div className='aboutUsBody'>
                <h3>Our Mission</h3>
                <p>
                    For over three decades, we have been trailblazing the transformation of post-secondary
                    admissions processes. Our story is one of relentless dedication to excellence and continuous
                    improvement. Our innovative solutions have revolutionized how schools operate and raised the
                    standard for student service and enrollment success. Our journey is far from over—we're
                    constantly evolving, pushing boundaries, and working hand-in-hand with our clients to achieve
                    their goals and exceed their expectations. Let's write the next chapter of success for your
                    institution together.
                </p>
            </div>
            <h1 className='contactUsTitle'>Contact Us</h1>
            <div className='contactUsBody'>
                <form onSubmit={handleSubmit} className='contactForm'>
                    {/* <input type="text" name="fName" placeholder="First Name" value={formData.fname} onChange={handleChange} /> */}
                    {/* <input type="text" name="lName" placeholder="Last Name" value={formData.lname} onChange={handleChange} /> */}
                    <input type="email" name="email" placeholder="Your Email" value={formData.email} onChange={handleChange} />
                    <input type="number" name="number" placeholder="Your Number" value={formData.number} onChange={handleChange} />
                    <input type="text" name="school" placeholder="School Name" value={formData.school} onChange={handleChange} />
                    <textarea name="message" placeholder="Your Message" value={formData.message} onChange={handleChange}></textarea>

                    {error && <p className="error">{error}</p>}
                    {success && <p className='success'>{success}</p>}

                    <button type="submit">Send Message</button>
                </form>
            </div>
        </div>
    );
};

export default Info;