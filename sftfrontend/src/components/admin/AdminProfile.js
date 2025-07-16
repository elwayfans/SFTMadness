/*
this is the profile that source for training staff/employees will see
*/

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin.css";
import { AddSchool } from "./AddSchool";

const AdminProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    function getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(";").shift();
      return null;
    }
    const idToken = getCookie("idToken");
    if (!idToken) {
      navigate("/login");
      return;
    }

    // Fetch admin profile as before
    fetch("http://localhost:8000/admin/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
      })
      .catch(() => {
        setProfile(null);
      });

    // Fetch contacts for the logged-in user
    fetch("http://localhost:8000/contacts", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setContacts(data.contacts || []);
      })
      .catch(() => {
        setContacts([]);
      });
  }, [navigate]);

  const handleAddContactClick = () => {
    navigate("/addcontacts");
  };

  const deleteContact = (email) => {
    function getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(";").shift();
      return null;
    }
    const idToken = getCookie("idToken");
    fetch("http://localhost:8000/contacts", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to delete contact");
        // Remove from UI if successful
        setContacts((prev) =>
          prev.filter((contact) => contact.email !== email)
        );
      })
      .catch((err) => {
        alert("Error deleting contact: " + err.message);
      });
  };

  const handleLogout = async () => {
    await fetch("http://localhost:8000/logout", {
      method: "POST",
      credentials: "include",
    });
    navigate("/login");
  };

  if (!profile) return null;

  return (
    <div className="sft-profile-container">
      <div className="sft-info">
        <img src={profile.LogoUrl || "/images/TempPFP.png"} alt="sft_staff" />
        <h2>{profile.sftName}</h2>
        <p>{profile.email}</p>
        <p>
          {profile.phone_number ||
            profile.phoneNumber ||
            "No phone number on file"}
        </p>

        <div className="admin-buttons">
          <button
            className="admin-button"
            onClick={() => navigate("/forgotpassword")}
          >
            Update Password
          </button>

          <button className="admin-button">2 Factor Authentication</button>

          <button className="admin-button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      <div className="contacts-section">
        <h3>Contacts</h3>
        <button className="add-contact-btn" onClick={handleAddContactClick}>
          Add Contact
        </button>

        {contacts.map((contact, idx) => (
          <div
            href={`mailto:${contact.email}`}
            key={idx}
            className="contact-card"
          >
            <p className="contact-icon">✉️</p>
            <span className="contact-name">
              {contact.firstName} {contact.lastName}
            </span>
            <button
              className="delete-btn"
              onClick={() => deleteContact(contact.email)}
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      <div className="botSelectorContainer">
        <button className="botSelectorbtn" onClick={() => navigate("/bot-selector")}>
          Bot Selector
        </button>
      </div>
      

      <AddSchool />
    </div>
  );
};

export default AdminProfile;
