/*
Will be doing a 4 step method 
1: enter email
2 + 3: enter code + new password
4: success
As each step is completed the next form or message will show.
*/

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import './Auth.css'

const ForgotPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);

  // On mount, check if session/email were passed from login
  useEffect(() => {
    if (location.state) {
      if (location.state.email) setEmail(location.state.email);
      if (location.state.session) {
        setSession(location.state.session);
        setStep(2); // Go directly to password reset step
      }
    }
  }, [location.state]);

  const requestResetCode = async () => {
    try {
      const res = await fetch("http://localhost:8000/users/resetPassword", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Error sending verification code.");
      setStep(2);
      setMessage("Verification code sent to your email.");
      setError("");
    } catch (err) {
      setError(err.message || "Error sending verification code.");
    }
  };

  const handleResetPassword = async () => {
    try {
      const res = await fetch(
        "http://localhost:8000/users/confirmResetPassword",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code, newPassword }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error resetting password.");
      setMessage("Your password was reset, you now may login");
      setStep(1);
      setEmail("");
      setCode("");
      setNewPassword("");
      setSession(null);
      setError("");
    } catch (err) {
      setError(
        err.message ||
          "Sorry there was an issue with resetting your password. Please try again!"
      );
    }
  };

  return (
    <div className="forgotpassword">
      <h2 className="forgotpassTitle">Change Password</h2>
      <button className="forgotpassbtn" onClick={() => navigate("/login")}>
        Go Back
      </button>

      <br />

      {/* Step 1: Enter email, unless session is present */}
      {step === 1 && !session && (
        <>
          <input
            type="email"
            placeholder="Enter your email"
            className="forgotpasswordForm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="forgotpassbtn" onClick={requestResetCode}>
            Send Reset Code
          </button>
        </>
      )}

      {/* Step 2: If session, only ask for new password. Otherwise, ask for code and new password */}
      {step === 2 && (
        <>
          {!session && (
            <input
              type="text"
              placeholder="Enter verification code"
              className="forgotpassform"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          )}
          <input
            type="password"
            placeholder="Enter new password"
            className="forgotpassform"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button className="forgotpassbtn" onClick={handleResetPassword}>
            Change Password
          </button>
        </>
      )}

      {message && <div className="text-green-600">{message}</div>}
      {error && <div className="text-red-600">{error}</div>}
    </div>
  );
};

export default ForgotPassword;
