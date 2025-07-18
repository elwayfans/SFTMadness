import React, { useState } from "react";

const TwoFactorSetup = () => {
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      recoveryEmail,
      recoveryPhone,
    };

    try {
      const response = await fetch("/2fa", {
        method: "POST",
        credentials, include,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("2FA recovery details saved successfully.");
      } else {
        setMessage(data.message || "An error occurred.");
      }
    } catch (error) {
      setMessage("Failed to submit recovery info.");
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">2FA Recovery Setup</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Recovery Email</label>
          <input
            type="email"
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block mb-1">Recovery Phone Number</label>
          <input
            type="tel"
            value={recoveryPhone}
            onChange={(e) => setRecoveryPhone(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Save Recovery Info
        </button>
        {message && <p className="mt-2 text-sm text-gray-700">{message}</p>}
      </form>
    </div>
  );
};

export default TwoFactorSetup;