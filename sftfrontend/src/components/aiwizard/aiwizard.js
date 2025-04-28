import { useState } from 'react';
import './aiwizard.css';

const defaultForm = {
  modelname: '',
  modellogo: '',
  botintro: '',
  botgoodbye: '',
  botinstructions: '',
  accent: '',
  friendliness: 5,
  formality: 5,
  verbosity: 5,
  humor: 5,
  technicalLevel: 5,
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

  return (
    <div className="aiwizard-container">
      <h2>Build Your AI Assistant</h2>

      {/* Step Navigation */}
      <div>
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
          >
            Step {s}
          </button>
        ))}
      </div>

      {/* Step 1: Bot Info */}
      {step === 1 && (
        <div>
          <input className="modelname" name="modelname" placeholder="Bot Name" value={form.modelname} onChange={handleChange} />
          <input className="modelurl" name="modellogo" placeholder="Logo URL" value={form.modellogo} onChange={handleChange} />
        </div>
      )}

      {/* Step 2: Bot Messages */}
      {step === 2 && (
        <div>
          <textarea name="botintro" placeholder="Bot Intro Message" value={form.botintro} onChange={handleChange} />
          <textarea name="botgoodbye" placeholder="Goodbye Message" value={form.botgoodbye} onChange={handleChange} />
          <textarea name="botinstructions" placeholder="Special Instructions" value={form.botinstructions} onChange={handleChange} />
        </div>
      )}

      {/* Step 3: Accent Selection */}
      {step === 3 && (
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

      {/* Step 4: Sliders */}
      {step === 4 && (
        <div>
          {['Friendliness', 'Formality', 'Verbosity', 'Humor', 'TechnicalLevel'].map((attr) => (
            <div key={attr}>
              <label className="capitalize">{attr}:</label>
              <input
                type="range"
                min={0}
                max={10}
                value={form[attr]}
                onChange={(e) => handleSliderChange(attr, Number(e.target.value))}
              />
              <p>Level: {form[attr]}</p>
            </div>
          ))}
        </div>
      )}

      {/* Save/ Clear Form */}
      <div>
        <button>Save</button>
        <button>Clear</button>
      </div>

      {/* Preview */}
      <div>
        <h3>Live Preview</h3>
        <p><strong>Name:</strong> {form.modelname}</p>
        <p><strong>Intro:</strong> {form.botintro}</p>
        <p><strong>Instructions:</strong> {form.botinstructions}</p>
        <p><strong>Accent:</strong> {form.accent}</p>
        <p><strong>Friendliness:</strong> {form.friendliness}</p>
        <p><strong>Formality:</strong> {form.formality}</p>
        <p><strong>Verbosity:</strong> {form.verbosity}</p>
        <p><strong>Humor:</strong> {form.humor}</p>
        <p><strong>Technical Level:</strong> {form.technicalLevel}</p>
      </div>
    </div>
  );
}