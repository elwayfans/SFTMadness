/*
profile for school staff/administrative




*/

import React from "react";
import AIWizardCustomizer from "../aiwizard/aiwizard";

const SchoolProfile = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const handleAddContactClick = () => {
    navigate("/addcontacts");
  };

  const deleteContact = (email) => {
    const updatedContacts = contacts.filter((contact) => contact.email !== email);
    setContacts(updatedContacts);
    localStorage.setItem("contacts", JSON.stringify(updatedContacts));
  };

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
