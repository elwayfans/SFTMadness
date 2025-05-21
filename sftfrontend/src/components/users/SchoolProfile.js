import React, {useState, useEffect} from "react";
import AIWizardCustomizer from "../ai/aiWizard/aiWizard";
import {useNavigate} from "react-router-dom";
import "./Profile.css";


const SchoolProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    const mockData = {
      schoolName: "Neumont College of Computer Science",
      schoolLogoUrl: "/images/neumont-college.png",
      email: "admissions@neumont.edu",
      phone: "(801) 302-2800",
      contacts: [
        { firstName: "Jane", lastName: "Doe", email: "jane@neumont.edu" },
        { firstName: "John", lastName: "Smith", email: "john@neumont.edu" }
      ],
      modelName: "AdmissionsBot",
      modelLogo: "/images/bot-logo.png",
      botIntro: "Hello, I’m here to help!",
      botGoodbye: "Thank you for chatting!",
      botInstructions: "Be polite and informative",
      accent: "american",
      friendliness: 80,
      formality: 60,
      verbosity: 70,
      humor: 50,
      technicalLevel: 40
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

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="school-profile-container">
      <div className="school-info">
        <img src={profile.schoolLogoUrl || "/images/default-school.png"} alt="school" />
        <h2>{profile.schoolName}</h2>
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
      <AIWizardCustomizer />
    </div>
  );
};

export default SchoolProfile;