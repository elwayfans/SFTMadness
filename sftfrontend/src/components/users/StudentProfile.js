/*
when a student registers or creates an account this is how they will view their profile




*/

import React from 'react'
import './Profile.css';

const StudentProfile = () => {
    return (
        <div className="student-profile-container">
            <div className="student-info">
                <img src="/images/temp-pfp.jpg" alt="student" />
                <h2>Alexander Stokes</h2>
                <p>jedistokes26@gmail.com</p>
                <p>(801) 913-8620</p>
            </div>

            <div className="contacts-section">
                <h3>Contacts</h3>
                <div className="contact-card">
                    <span className="contact-name">Aron Reed</span>
                    <img src="/images/mail-icon.png" alt="mail" className="contact-icon" />
                </div>
                {/* Repeat contact-card */}
            </div>
        </div>
    )
}

export default StudentProfile