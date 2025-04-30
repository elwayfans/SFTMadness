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
import { FaEye, FaEyeSlash } from "react-icons/fa"; 
import "./Auth.css";

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility

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
      const response = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Welcome!");

        // Navigate based on role
        const userRole = data.role;
        if (userRole === "SFT") {
          navigate("/sft-profile");
        } else if (userRole === "School") {
          navigate("/school-profile");
        } else {
          console.warn("Unknown role. Redirecting to home.");
          navigate("/");
        }
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
        <div className="password-container">
          <input
            required
            name="password"
            type={showPassword ? "text" : "password"} // Toggle input type
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
          />
          <span
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)} // Toggle visibility
            style={{ cursor: "pointer", marginLeft: "10px" }}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>
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