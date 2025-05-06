import { useState } from "react";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import "./aiwizard.css";

const defaultForm = {
  modelname: "",
  modellogo: "",
  botintro: "",
  botgoodbye: "",
  botinstructions: "",
  accent: "",
  friendliness: 5,
  formality: 5,
  verbosity: 5,
  humor: 5,
  technicalLevel: 5,
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

  const saveBotInfo = () => {
    const botInfo = {
      name: form.modelname,
      logo: form.modellogo,
      intro: form.botintro,
      goodbye: form.botgoodbye,
      instructions: form.botinstructions,
      accent: form.accent,
      sliders: {
        friendliness: form.friendliness,
        formality: form.formality,
        verbosity: form.verbosity,
        humor: form.humor,
        technicalLevel: form.technicalLevel,
      },
      websites: form.websites,
      files: form.files.map((file) => file.name), // Save file names only
    };
  
    // Save to local storage or send to backend
    const bots = JSON.parse(localStorage.getItem("bots")) || [];
    bots.push(botInfo);
    localStorage.setItem("bots", JSON.stringify(bots));
  
    alert("Bot information saved!");
  };

  return (
    <div className="aiwizard-container">
      <h2>Build Your AI Assistant</h2>

      {/* Step Navigation */}
      <div>
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} onClick={() => setStep(s)}>
            Step {s}
          </button>
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
            className="modelurl"
            name="modellogo"
            placeholder="Logo URL"
            value={form.modellogo}
            onChange={handleChange}
          />
        </div>
      )}

      {/* Step 2: Bot Messages */}
      {step === 2 && (
        <div>
          <textarea
            name="botintro"
            placeholder="Bot Intro Message"
            value={form.botintro}
            onChange={handleChange}
          />
          <textarea
            name="botgoodbye"
            placeholder="Goodbye Message"
            value={form.botgoodbye}
            onChange={handleChange}
          />
          <textarea
            name="botinstructions"
            placeholder="Special Instructions"
            value={form.botinstructions}
            onChange={handleChange}
          />
        </div>
      )}

      {/* Step 3: Websites & Files for Information */}
      {step === 3 && (
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

      {/* Step 4: Accent Selection */}
      {step === 4 && (
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

      {/* Step 5: Sliders */}
      {step === 5 && (
        <div>
          {[
            "friendliness",
            "formality",
            "verbosity",
            "humor",
            "technicalLevel",
          ].map((attr) => (
            <div key={attr} className="slider-container">
              <label className="capitalize">{attr}:</label>
              <Box sx={{ width: 300 }}>
                <Slider
                  aria-label={attr}
                  value={form[attr]}
                  onChange={(e, value) => handleSliderChange(attr, value)}
                  step={1}
                  marks
                  min={0}
                  max={10}
                  valueLabelDisplay="auto"
                />
              </Box>
              <p>Level: {form[attr]}</p>
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
      <div>
        <h3>Live Preview</h3>
        <p>
          <strong>Name:</strong> {form.modelname}
        </p>
        <p>
          <strong>Intro:</strong> {form.botintro}
        </p>
        <p>
          <strong>Instructions:</strong> {form.botinstructions}
        </p>
        <p>
          <strong>Accent:</strong> {form.accent}
        </p>
        <p>
          <strong>Friendliness:</strong> {form.friendliness}
        </p>
        <p>
          <strong>Formality:</strong> {form.formality}
        </p>
        <p>
          <strong>Verbosity:</strong> {form.verbosity}
        </p>
        <p>
          <strong>Humor:</strong> {form.humor}
        </p>
        <p>
          <strong>Technical Level:</strong> {form.technicalLevel}
        </p>
      </div>
    </div>
  );
}
