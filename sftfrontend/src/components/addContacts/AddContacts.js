import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import './AddContacts.css';

const AddContacts = () => {
    const navigate = useNavigate();
    const [contact, setContact] = useState({
        firstName: "",
        lastName: "",
        email: ""
    });

    const handleChange = (e) => {
        setContact({ ...contact, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const existingContacts = JSON.parse(localStorage.getItem("contacts")) || [];
        const newContacts = [...existingContacts, contact];
        localStorage.setItem("contacts", JSON.stringify(newContacts));

        navigate("/school-profile");
    };

    return (
        <div className="add-contact-wrapper">
            <div className="add-contact-form">
                <h3>Add Contact</h3>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="firstName">First Name:</label>
                    <input
                        type="text"
                        name="firstName"
                        id="firstName"
                        required
                        onChange={handleChange}
                    />

                    <label htmlFor="lastName">Last Name:</label>
                    <input
                        type="text"
                        name="lastName"
                        id="lastName"
                        required
                        onChange={handleChange}
                    />

                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        name="email"
                        id="email"
                        required
                        onChange={handleChange}
                    />

                    <button type="submit">Save Contact</button>
                </form>
            </div>
        </div>
    );
};

export default AddContacts;
