import React, { useState, useEffect } from "react";
import AIWizardCustomizer from "../ai/aiWizard/aiWizard";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

const SchoolProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [bots, setBots] = useState([]);
  const [company, setCompany] = useState("");

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

    // Fetch profile
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

    // Fetch contacts
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

  // Fetch Bot data and set company based on JWT token
  useEffect(() => {
    function getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(";").shift();
      return null;
    }

    const idToken = getCookie("idToken");
    if (!idToken) return;

    // Decode JWT payload (naively)
    try {
      const payload = JSON.parse(atob(idToken.split(".")[1]));
      console.log("Full JWT payload:", payload);

      const companyFromToken = payload["custom:Company"];
      if (!companyFromToken) {
        console.warn("No company found in token");
        return;
      }

      setCompany(companyFromToken.toLowerCase());

      fetch(`http://localhost:8000/customs?company=${companyFromToken.toLowerCase()}`)
        .then((res) => res.json())
        .then((response) => {
          const bot = response.data;
          if (bot && bot.company) {
            setBots([bot]);
          } else {
            setBots([]);
          }
        })
        .catch((err) => {
          console.error("Error fetching bot:", err);
          setBots([]);
        });
    } catch (error) {
      console.error("Failed to decode JWT token:", error);
    }
  }, []);

const handleSelectBot = (bot) => {
  navigate("/chat-ai", {
    state: {
      bot,
      from: "/profile", 
    },
  });
};

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

        <div className="school-buttons">
          <button
            className="school-button"
            onClick={() => navigate("/forgotpassword")}
          >
            Update Password
          </button>

          <button className="school-button">2 Factor Authentication</button>

          <button className="school-button" onClick={handleLogout}>
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
          <div key={idx} className="contact-card">
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

      {/* AI Bot Demo */}
      <div className="bot-list">
        {bots.length === 0 && <p>No bots found for this company.</p>}
        {bots.map((bot, index) => {
          return (
            <button
              key={index}
              onClick={() => handleSelectBot(bot)}
              className="bot-button"
              title={bot.company || ""}
              style={{
                backgroundImage: `url(${bot.modelLogo || ""})`,
                backgroundSize: "100% 100%",
                backgroundPosition: "center",
              }}
            >
              <p>{bot.company || "Unknown"}</p>
            </button>
          );
        })}
      </div>
    
      <AIWizardCustomizer bots={bots} />
    </div>
  );
};

export default SchoolProfile;