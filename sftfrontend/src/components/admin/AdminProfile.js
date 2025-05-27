/*
this is the profile that source for training staff/employees will see
*/

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import './Admin.css';
import { AddSchool } from './AddSchool';

const AdminProfile = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [contacts, setContacts] = useState([]);

    useEffect(() => {
        const mockData = {
            sftName: "Daniel Lapan",
            LogoUrl: "/images/daniel.png",
            email: "dan@sourcefortraining.edu",
            phone: "(000) 000-0000",
            contacts: [
                { firstName: "Jane", lastName: "Doe", email: "jane@neumont.edu" },
                { firstName: "John", lastName: "Smith", email: "john@neumont.edu" }
            ]
        };

        setProfile(mockData);
        setContacts(mockData.contacts);
    }, []);

    const handleAddContactClick = () => {
        navigate("/addcontacts");
    };

    const deleteContact = (email) => {
        const updatedContacts = contacts.filter((contact) => contact.email !== email);
        setContacts(updatedContacts);
    };

    if (!profile) return null;

    return (
        <div className="sft-profile-container">
            <div className="sft-info">
                <img src={profile.LogoUrl} alt="sft_staff" />
                <h2>{profile.sftName}</h2>
                <p>{profile.email}</p>
                <p>{profile.phone}</p>
            </div>

            <div className="contacts-section">
                <h3>Contacts</h3>
                <div className="add-contact">
                    <button onClick={handleAddContactClick}><p>+</p></button>
                </div>

                {contacts.map((contact, idx) => (
                    <div key={idx} className="contact-card">
                        <a href={`mailto:${contact.email}`} className="contact-card">
                            <span className="contact-name">{contact.firstName} {contact.lastName}</span>
                            <img src="/images/mail-icon.png" alt="mail" className="contact-icon" />
                        </a>
                        <button onClick={() => deleteContact(contact.email)}>🗑️</button>
                    </div>
                ))}
            </div>
            <AddSchool />
        </div>
    );
};

export default AdminProfile;
;