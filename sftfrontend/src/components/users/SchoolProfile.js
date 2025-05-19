import React, { useState, useEffect } from "react";
import Slider from "@mui/material/Slider";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import { useNavigate } from "react-router-dom";
import './Profile.css';

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

      <div className="aicustom">
        <h3>AI Model Customization</h3>
        <p>
          Here you will be able to customize how your AI model appears and behaves.
        </p>
        <form>
          <Grid container spacing={8} columns={16}>
            <Grid item xs={8}>
              <label>Model Name:</label>
              <input type="text" name="modelname" defaultValue={profile.modelName || ""} />
              <br />

              <label>Model Logo:</label>
              <input type="text" name="modellogo" defaultValue={profile.modelLogo || ""} />
              <br />

              <label>Bot's Introduction:</label>
              <br />
              <textarea
                name="botintro"
                rows="3"
                defaultValue={profile.botIntro || ""}
              />
              <br />

              <label>Bot's Goodbye Message:</label>
              <br />
              <textarea
                name="botGoodbye"
                rows="3"
                defaultValue={profile.botGoodbye || ""}
              />
              <br />

              <label>Bot's Special Instructions:</label>
              <br />
              <textarea
                name="botInstructions"
                rows="3"
                defaultValue={profile.botInstructions || ""}
              />
              <br />

              <label>Bot's Accent:</label>
              <br />
              <select name="accent" defaultValue={profile.accent || ""}>
                <option value="">No specific accent</option>
                <option value="american">American English</option>
                <option value="british">British English</option>
                <option value="australian">Australian English</option>
                <option value="canadian">Canadian English</option>
                <option value="indian">Indian English</option>
                <option value="japanese">Japanese English</option>
              </select>
            </Grid>

            <Grid item xs={8}>
              <h3>Bot's personality</h3>
              <label>Friendliness:</label>
              <Box width={300}>
                <Slider value={profile.friendliness || 50} />
              </Box>

              <label>Formality:</label>
              <Box width={300}>
                <Slider value={profile.formality || 50} />
              </Box>

              <label>Verbosity:</label>
              <Box width={300}>
                <Slider value={profile.verbosity || 50} />
              </Box>

              <label>Humor:</label>
              <Box width={300}>
                <Slider value={profile.humor || 50} />
              </Box>

              <label>Technical Level:</label>
              <Box width={300}>
                <Slider value={profile.technicalLevel || 50} />
              </Box>

              <button type="submit">Save</button>
              <button type="reset">Clear</button>
            </Grid>
          </Grid>
        </form>
      </div>
    </div>
  );
};

export default SchoolProfile;
