/*
✖have user input fields for the following so that a user can register
    first and last name
    email
    phone number
    school name
    password
    verify password
✖add register button at bottom
*/
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const formValidate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = "Email is required.";
    if (!formData.password) newErrors.password = "Password is required";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = formValidate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      // Check for NEW_PASSWORD_REQUIRED before response.ok
      if (
        data.challenge === "NEW_PASSWORD_REQUIRED" &&
        data.session
      ) {
        // User must set a new password, redirect with session
        navigate("/forgotpassword", {
          state: { email: formData.email, session: data.session },
        });
      } else if (response.ok) {
        alert("Welcome!");
        navigate("/profile");
      } else if (data.message && data.message.toLowerCase().includes("not found")) {
        // User not found, send reset code and redirect
        await fetch("http://localhost:8000/complete-new-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email }),
        });
        alert("Account not found. A code has been sent to your email to set your password.");
        navigate("/forgotpassword", { state: { email: formData.email } });
      } else {
        alert(data.message || "Login failed.");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Something went wrong.");
    }
  };

  return (
    <div className="login">
      <h1 className="loginTitle">Login</h1>

      <form onSubmit={handleSubmit} className="loginForm">
        <label>Email:</label>
        <input
          required
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
        />
        {errors.email && (
          <span style={{ color: "red", fontSize: "0.875rem" }}>
            {errors.email}
          </span>
        )}

        <label>Password:</label>
        <input
          required
          name="password"
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
        />
        {errors.password && (
          <span style={{ color: "red", fontSize: "0.875rem" }}>
            {errors.password}
          </span>
        )}

        <button className="loginbtn" type="submit">
          Login
        </button>
      </form>
      <button
        className="forgotpassbtn"
        onClick={() => navigate("/forgotpassword")}
      >
        Forgot Password?
      </button>
    </div>
  );
};

export default Login;