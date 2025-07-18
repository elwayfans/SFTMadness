import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

const UpdatePassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);

  // Helper functions for cookies and JWT
  function getCookie(name) {
    const matches = document.cookie.match(
      new RegExp(
        `(?:^|; )${name.replace(/[$()*+?.\\^{}|[\]]/g, "\\$&")}=([^;]*)`
      )
    );
    return matches ? decodeURIComponent(matches[1]) : undefined;
  }

  function parseJwt(token) {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  useEffect(() => {
    const token = getCookie("idToken");
    if (token) {
      const payload = parseJwt(token);
      if (payload && payload.email) {
        setEmail(payload.email);
        setStep(1); // Skip email input step and go directly to step 2
      }
    }
  }, []);

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
      setStep(1);
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
    <div className="updatePassword">
      <h2 className="updatepassTitle">Update Password</h2>
      <button className="forgotpassbtn" type="button" onClick={() => navigate("/profile")}>
        Go Back
      </button>
      
      <br />

      {/* Step 1: Get code sent to your email inbox */}
      {step === 1 && !session && (
        <>
          <button className="forgotpassbtn" onClick={requestResetCode}>
            Send Reset Code
          </button>
          <br />
          <button className="forgotpassbtn" onClick={() => setStep(2)}> Next </button>
        </>
      )}

      {/* Step 2: code + password input */}
      {step === 2 && (
        <>
          {!session && (
            <input
              type="text"
              placeholder="Enter verification code"
              className="updatepassform"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          )}
          <input
            type="password"
            placeholder="Enter new password"
            className="updatepassform"
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

export default UpdatePassword;
