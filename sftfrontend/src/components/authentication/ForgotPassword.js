/*
Will be doing a 4 step method 
1: enter email
2 + 3: enter code + new password
4: success
As each step is completed the next form or message will show.
*/

import React, { useState } from 'react';
import './Auth.css'

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const requestResetCode = async () => {
    try {
      const res = await fetch('/resetpassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error sending verification code.');
      setStep(2);
      setMessage('Verification code sent to your email.');
      setError('');
    } catch (err) {
      setError(err.message || 'Error sending verification code.');
    }
  };

  const handleResetPassword = async () => {
    try {
      const res = await fetch('/confirmresetpassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error resetting password.');
      setMessage('Your password was reset, you now may login');
      setStep(1);
      setEmail('');
      setCode('');
      setNewPassword('');
      setError('');
    } catch (err) {
      setError(err.message || 'Sorry there was an issue with resetting your password. Please try again!');
    }
  };

  return (
    <div className="forgotpassword">
      <h2 className="forgotpassTitle">Forgot Password</h2>

      {step === 1 && (
        <>
          <input
            type="email"
            placeholder="Enter your email"
            className="forgotpasswordForm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            className="forgotpassbtn"
            onClick={requestResetCode}
          >
            Send Reset Code
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <input
            type="text"
            placeholder="Enter verification code"
            className="forgotpassform"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <input
            type="password"
            placeholder="Enter new password"
            className="forgotpassform"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            className="forgotpassbtn"
            onClick={handleResetPassword}
          >
            Reset Password
          </button>
        </>
      )}

      {message && <div className="text-green-600">{message}</div>}
      {error && <div className="text-red-600">{error}</div>}
    </div>
  );
};

export default ForgotPassword;