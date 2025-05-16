/*
profile for school staff/administrative




*/

import React, { useState } from "react";
import Slider from "@mui/material/Slider";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid"
import { useNavigate } from "react-router-dom";
import './Profile.css'

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

      <div className="aicustom">
        <h3>AI Model Customization</h3>
        <p>
          Here you will be able to customize how your AI model appears and
          behaves.
        </p>
        <form>
          <Grid container spacing={8} columns={16}>
            <Grid size={8}>
              <label>Model Name:</label>
              <input type="text" name="modelname" required />
              <br />

              <label>Model Logo:</label>
              <input type="text" name="modellogo" required />
              <br />

              <label>Bot's Introduction:</label>
              <br />
              <textarea
                name="botintro"
                rows="3"
                placeholder="Provide the message you want the bot to send when indroducing itself."
              />
              <br />

              <label>Bot's Goodbye Message:</label>
              <br />
              <textarea
                name="botintro"
                rows="3"
                placeholder="Provide the message you want the bot to send when saying goodbye."
              />
              <br />

              <label>Bot's Special Instructions:</label>
              <br />
              <textarea
                name="botintro"
                rows="3"
                placeholder="Provide instructions of how you would like your bot to respond and behave"
              />
              <br />

              <label>Bot's Accent:</label>
              <br />
              <select name="accent">
                <option value="">No specific accent</option>
                <option value="american">American English</option>
                <option value="british">British English</option>
                <option value="australian">Australian English</option>
                <option value="canadian">Canadian English</option>
                <option value="indian">Indian English</option>
                <option value="japanese">Japanese English</option>
              </select>
            </Grid>
            <Grid size={8}>
              <h3>Bot's personality</h3>
              <label>Friendliness:</label>
              <Box width={300}>
                <Slider type="range" name="friendliness" />
              </Box>
              <label>Formality:</label>
              <Box width={300}>
                <Slider type="range" name="formality" />
              </Box>
              <label>Verbosity:</label>
              <Box width={300}>
                <Slider type="range" name="verbosity" />
              </Box>
              <label>Humor:</label>
              <Box width={300}>
                <Slider type="range" name="Humor" />
              </Box>
              <label>Technical Level:</label>
              <Box width={300}>
                <Slider type="range" name="technicalLevel" />
              </Box>
              <button>Save</button>
              <button>Clear</button>
            </Grid>
          </Grid>
        </form>
      </div>
    </div>
  );
};

export default SchoolProfile;
