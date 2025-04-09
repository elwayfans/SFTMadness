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
    fname: "",
    lname: "",
    email: "",
    password: "",
    confirmPassword: "",
    number: "",
    role: "",
    school: "",
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = formValidate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
    } else {
      setErrors({});
      console.log("Form submitted", formData);
      alert("Welcome!")
      //navigate("/profile");
    }
  };

  return (
    <div className="login">
      <h1 className="loginTitle">Login</h1>

      <form onSubmit={handleSubmit} className="loginForm">

        <label>Email:</label>
        <input
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
          <button className="forgotpassbtn" onClick={() => navigate("/forgotpassword")}>Forgot Password?</button>
    </div>
  );
};

export default Login;