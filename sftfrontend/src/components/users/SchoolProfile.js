/*
profile for school staff/administrative




*/

import React from 'react'

const SchoolProfile = () => {
    return (
        <div className="school-profile-container">
            <div className="school-info">
                <img src="/images/neumont-college.png" alt="school" />
                <h2>Neumont College of Computer Science</h2>
                <p>admissions@neumont.edu</p>
                <p>(801) 302-2800</p>
            </div>

            <div className="contacts-section">
                <h3>Contacts</h3>
                <div className="contact-card">
                    <span className="contact-name">Alexander Stokes</span>
                    <img src="/images/mail-icon.png" alt="mail" className="contact-icon" />
                </div>
                <div className="contact-card">
                    <span className="contact-name">Chelsea Bui</span>
                    <img src="/images/mail-icon.png" alt="mail" className="contact-icon" />
                </div>
                <div className="contact-card">
                    <span className="contact-name">Daniel Vallejo</span>
                    <img src="/images/mail-icon.png" alt="mail" className="contact-icon" />
                </div>
                {/* Repeat contact-card */}
            </div>
        </div>
    )
}

export default SchoolProfile