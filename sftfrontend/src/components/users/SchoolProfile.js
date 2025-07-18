import React, { useState, useEffect } from "react";
import AIWizardCustomizer from "../ai/aiWizard/aiWizard";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

const SchoolProfile = () => {
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

    fetch("http://localhost:8000/school/profile", {
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
        setProfile(null);
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

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="school-profile-container">
      <div className="school-info">
        <img
          src={profile.schoolLogoUrl || "/images/TempPFP.png"}
          alt="school"
        />
        <h2>{profile.schoolName}</h2>
        <p>{profile.email}</p>
        <p>
          {profile.phone_number ||
            profile.phoneNumber ||
            "No phone number on file"}
        </p>

        <button onClick={() => navigate("/settings")}>Settings</button>

        <button onClick={handleLogout}>Log out</button>
      </div>

      <div className="contacts-section">
        <h3>Contacts</h3>
        <div className="add-contact">
          <button onClick={handleAddContactClick}>
            <p>+</p>
          </button>
        </div>

        {contacts.map((contact, idx) => (
          <div key={idx} className="contact-card">
            <a href={`mailto:${contact.email}`} className="contact-card">
              <span className="contact-name">
                {contact.firstName} {contact.lastName}
              </span>
              <img
                src="/images/mail-icon.png"
                alt="mail"
                className="contact-icon"
              />
            </a>
            <button onClick={() => deleteContact(contact.email)}>🗑️</button>
          </div>
        ))}
      </div>
      <AIWizardCustomizer />
    </div>
  );
};

export default SchoolProfile;
