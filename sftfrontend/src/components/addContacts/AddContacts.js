import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AddContacts.css";

const AddContacts = () => {
  const navigate = useNavigate();
  const [contact, setContact] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const handleChange = (e) => {
    setContact({ ...contact, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Get idToken from cookie
    function getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(";").shift();
      return null;
    }
    const idToken = getCookie("idToken");

    try {
      const response = await fetch("http://localhost:8000/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(contact),
      });

      if (response.ok) {
        navigate("/profile");
      } else {
        alert("Failed to add contact.");
      }
    } catch (error) {
      alert("Error adding contact.");
    }
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
