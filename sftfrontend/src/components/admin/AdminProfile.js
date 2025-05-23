/*
this is the profile that source for training staff/employees will see




*/

import React from 'react'
import './Admin.css';

const AdminProfile = () => {
    return (
        <div className="sft-profile-container">
            <div className="sft-info">
                <img src="/images/daniel.png" alt="sft_staff" />
                <h2>Daniel Lapan</h2>
                <p>Dan@sourcefortraining.com</p>
                <p>(000) 000-0000</p>
            </div>

            <div className="contacts-section">
                <h3>Contacts</h3>
                <div className="contact-card">
                    <a href="mailto:admissions@neumont.edu" className="contact-card">
                        <span className="contact-name">Neumont College</span>
                        <img src="/images/mail-icon.png" alt="mail" className="contact-icon" />
                    </a>
                </div>
                <div className="contact-card">
                    <a href="mailto:byu-info@byu.edu" className="contact-card">
                        <span className="contact-name">BYU</span>
                        <img src="/images/mail-icon.png" alt="mail" className="contact-icon" />
                    </a>
                </div>
                {/* Repeat contact-card */}
            </div>
        </div>
    )
}

export default AdminProfile