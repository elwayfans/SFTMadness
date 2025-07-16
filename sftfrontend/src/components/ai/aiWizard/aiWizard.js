import { useState } from "react";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import "./aiWizard.css";

const defaultForm = {
  modelname: "",
  modellogo: "",
  company: "",
  full_name: "",
  short_name: "",
  type: "",
  forbidden_terms: "",
  botHexTextColor: "#000000",
  botHexBackgroundColor: "#ffffff",
  preferredGreeting: "",
  signatureClosing: "",
  instructions: "",
  accent: "",
  friendliness: 100,
  formality: 100,
  verbosity: 100,
  humor: 100,
  technicalLevel: 100,
  websites: [],
  files: [],
};

export default function AIWizardCustomizer() {
  const [form, setForm] = useState(defaultForm);
  const [step, setStep] = useState(1);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSliderChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addWebsite = () => {
    setForm((prev) => ({
      ...prev,
      websites: [...(prev.websites || []), ""],
    }));
  };

  const handleWebsiteChange = (index, value) => {
    setForm((prev) => {
      const updatedWebsites = [...(prev.websites || [])];
      updatedWebsites[index] = value;
      return { ...prev, websites: updatedWebsites };
    });
  };

  const removeWebsite = (index) => {
    setForm((prev) => {
      const updatedWebsites = [...(prev.websites || [])];
      updatedWebsites.splice(index, 1);
      return { ...prev, websites: updatedWebsites };
    });
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setForm((prev) => ({
      ...prev,
      files: [...(prev.files || []), ...files],
    }));
  };

  const removeFile = (index) => {
    setForm((prev) => {
      const updatedFiles = [...(prev.files || [])];
      updatedFiles.splice(index, 1);
      return { ...prev, files: updatedFiles };
    });
  };

  const saveBotInfo = async () => {
    const idToken = localStorage.getItem("idToken");

    // Prepare the bot info in the requested format
    const payload = {
      modelName: form.modelname,
      modelLogo: form.modellogo,
      introduction: form.preferredGreeting,
      friendliness: form.friendliness,
      formality: form.formality,
      accent: form.accent,
      verbosity: form.verbosity,
      humor: form.humor,
      technicalLevel: form.technicalLevel,
      preferredGreeting: form.preferredGreeting,
      signatureClosing: form.signatureClosing,
      instructions: form.instructions,
      botHexBackgroundColor: form.botHexBackgroundColor,
      botHexTextColor: form.botHexTextColor,
      full_name: form.full_name,
      short_name: form.short_name,
      type: form.type,
      forbidden_terms: form.forbidden_terms
        ? form.forbidden_terms.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
    };

    // If you want to send files/websites, you can append them as needed
    const formData = new FormData();
    // Flattened: append each key/value directly
    Object.entries(payload).forEach(([key, value]) => {
      formData.append(key, typeof value === "object" ? JSON.stringify(value) : value);
    });
    (form.files || []).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("http://localhost:8000/customs", {
        method: "POST",
        body: JSON.stringify(payload),
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to save bot info.");
      }

      alert("Bot information saved!");
    } catch (error) {
      alert("Error saving bot info: " + error.message);
    }
  };

  return (
    <div className="aiwizard-container">
      <h2>Build Your AI Assistant</h2>

      {/* Step Navigation */}
      <div className="step-navigation">
        {[1, 2, 3, 4, 5, 6]
          .reduce((rows, step, index) => {
            if (index % 3 === 0) rows.push([]);
            rows[rows.length - 1].push(step);
            return rows;
          }, [])
          .map((row, rowIndex) => (
            <div key={rowIndex} style={{ marginBottom: "10px" }}>
              {row.map((step) => (
                <button key={step} onClick={() => setStep(step)}>
                  Step {step}
                </button>
              ))}
            </div>
          ))}
      </div>

      {/* Step 1: Bot Info */}
      {step === 1 && (
        <div>
          <input
            className="modelname"
            name="modelname"
            placeholder="Bot Name"
            value={form.modelname}
            onChange={handleChange}
          />
          <input
            className="company"
            name="company"
            placeholder="Name of establishment"
            value={form.company}
            onChange={handleChange}
          />
          <input
            className="full_name"
            name="full_name"
            placeholder="Full Name of Establishment"
            value={form.full_name}
            onChange={handleChange}
          />
          <input 
            className="short_name"
            name="short_name"
            placeholder="Short Name of Establishment"
            value={form.short_name}
            onChange={handleChange}
          />
          <input 
            className="type"
            name="type"
            placeholder="Type of Establishment"
            value={form.type}
            onChange={handleChange}
          />
          <input
            className="modelurl"
            name="modellogo"
            placeholder="Logo URL"
            value={form.modellogo}
            onChange={handleChange}
          />
        </div>
      )}

      {/* Step 2: Bot Response Colors */}
      {step === 2 && (
        <div>
          <label>Bot Text Color:</label>
          <br/>
          <input
            type="color"
            name="botHexTextColor"
            value={form.botHexTextColor}
            onChange={handleChange}
          />

          <br />

          <label>Bot Textbox Background Color:</label>
          <br/>
          <input
            type="color"
            name="botHexBackgroundColor"
            value={form.botHexBackgroundColor}
            onChange={handleChange}
          />
        </div>
      )}

      {/* Step 3: Bot Messages */}
      {step === 3 && (
        <div>
          <textarea
            name="preferredGreeting"
            placeholder="Bot Intro Message"
            value={form.preferredGreeting}
            onChange={handleChange}
          />
          <textarea
            name="signatureClosing"
            placeholder="Goodbye Message"
            value={form.signatureClosing}
            onChange={handleChange}
          />
          <textarea
            name="instructions"
            placeholder="Special Instructions"
            value={form.instructions}
            onChange={handleChange}
          />
          <textarea
            name="forbidden_terms"
            placeholder="Forbidden Terms (comma-separated)"
            value={form.forbidden_terms}
            onChange={handleChange}
          />
        </div>
      )}

      {/* Step 4: Websites & Files for Information */}
      {step === 4 && (
        <div>
          <label>Websites:</label>
          <div>
            {form.websites?.map((website, index) => (
              <div key={index} className="removeBtn">
                <input
                  type="url"
                  placeholder="Enter website URL"
                  value={website}
                  onChange={(e) => handleWebsiteChange(index, e.target.value)}
                />
                <button type="button" onClick={() => removeWebsite(index)}>
                  X
                </button>
              </div>
            ))}
            <button type="button" onClick={addWebsite}>
              Add Website
            </button>
          </div>

          <label>Files:</label>
          <div className="removeBtn">
            <input type="file" multiple onChange={handleFileUpload} />
            <ul>
              {form.files?.map((file, index) => (
                <li key={index}>
                  {file.name}
                  <button type="button" onClick={() => removeFile(index)}>
                    X
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Step 5: Accent Selection */}
      {step === 5 && (
        <div>
          <label>Accent:</label>
          <select name="accent" value={form.accent} onChange={handleChange}>
            <option value="">No specific accent</option>
            <option value="american">American English</option>
            <option value="british">British English</option>
            <option value="australian">Australian English</option>
            <option value="canadian">Canadian English</option>
            <option value="indian">Indian English</option>
            <option value="japanese">Japanese English</option>
          </select>
        </div>
      )}

      {/* Step 6: Sliders */}
      {step === 6 && (
        <div>
          {[
            "friendliness",
            "formality",
            "verbosity",
            "humor",
            "technicalLevel",
          ].map((attr) => (
            <div key={attr} className="slider-container">
              <label className="capitalize">{attr.toUpperCase()} - {form[attr]}</label>
              <Box sx={{ width: 600 }}>
                <Slider
                  aria-label={attr}
                  value={form[attr]}
                  onChange={(e, value) => handleSliderChange(attr, value)}
                  step={1}
                  marks
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                />
              </Box>
              
            </div>
          ))}
        </div>
      )}

      {/* Save/ Clear Form */}
      <div>
        <button onClick={saveBotInfo}>Save Bot Info</button>
        <button>Clear</button>
      </div>

      {/* Preview */}
      <div className="live-preview">
        <h3>Live Preview</h3>
        <dl>
          <dt>Name: {form.modelname}</dt>
          <dt>Full Name: {form.full_name}</dt>
          <dt>Short Name: {form.short_name}</dt>
          <dt>Type: {form.type}</dt>
          <dt>Logo: {form.modellogo}</dt>
          <dt>Company: {form.company}</dt>
          <dt>
            Bot Text Color: {form.botHexTextColor}{" "}
            <span
              style={{
                display: "inline-block",
                width: "20px",
                height: "20px",
                backgroundColor: form.botHexTextColor,
                border: "1px solid #000",
                marginLeft: "10px",
              }}
            ></span>
          </dt>
          <dt>
            Bot Textbox Background Color: {form.botHexBackgroundColor}{" "}
            <span
              style={{
                display: "inline-block",
                width: "20px",
                height: "20px",
                backgroundColor: form.botHexBackgroundColor,
                border: "1px solid #000",
                marginLeft: "10px",
              }}
            ></span>
          </dt>
        </dl>

        {/* Chat Bubble Preview */}
        <div style={{ marginTop: "20px" }}>
          <p>Chat Bubble Preview:</p>
          <div
            style={{
              display: "inline-block",
              padding: "10px 15px",
              borderRadius: "15px",
              backgroundColor: form.botHexBackgroundColor,
              color: form.botHexTextColor,
              maxWidth: "300px",
              textAlign: "left",
              boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.2)",
            }}
          >
            Hello! This is how your bot's chat bubble will look.
          </div>
        </div>

        {/* Websites and Files */}
        <dl>
          <dt>
            Websites:
            <ul>
              {form.websites?.map((website, index) => (
                <li key={index}>{website}</li>
              ))}
            </ul>
          </dt>

          <dt>
            Files:
            <ul>
              {form.files?.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          </dt>
        </dl>

        {/* Other Bot Details */}
        <dl>
          <dt>Intro: {form.preferredGreeting}</dt>
          <dt>Goodbye: {form.signatureClosing}</dt>
          <dt>Forbidden Terms: {form.forbidden_terms}</dt>
          <dt>Instructions: {form.instructions}</dt>
          <dt>Accent: {form.accent}</dt>
          <dt>Friendliness: {form.friendliness}</dt>
          <dt>Formality: {form.formality}</dt>
          <dt>Verbosity: {form.verbosity}</dt>
          <dt>Humor: {form.humor}</dt>
          <dt>Technical Level: {form.technicalLevel}</dt>
        </dl>
      </div>
    </div>
  );
}