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

const Register = () => {
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
    if (!formData.fname) newErrors.fname = "First name is required.";
    if (!formData.lname) newErrors.lname = "Last name is required.";
    if (!formData.email) newErrors.email = "Email is required.";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match. ";
    if (!formData.number) newErrors.number = "Phone number is required.";
    if (!formData.role) newErrors.role = "Please select a role.";
    if (formData.role === "School staff" && !formData.school)
      newErrors.school = "School Name is required";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = formValidate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
    } else {
      setErrors({});
      try {
        const response = await fetch("http://localhost:3001/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
  
        const data = await response.json();
        if (response.ok) {
          alert(data.message);
          navigate("/login");
        } else {
          alert(data.error);
        }
      } catch (error) {
        console.error("Error during registration:", error);
      }
    }
  };

  return (
    <div className="signUp">
      <h1 className="signUpTitle">Sign Up</h1>

      <p className="required">* = required</p>
      <form onSubmit={handleSubmit} className="signUpForm">
        <label>*First Name:</label>
        <input
          required
          name="fname"
          placeholder="First Name"
          value={formData.fname}
          onChange={handleChange}
        />
        {errors.fname && (
          <span style={{ color: "red", fontSize: "0.875rem" }}>
            {errors.fname}
          </span>
        )}

        <label>*Last Name:</label>
        <input
          required
          name="lname"
          placeholder="Last Name"
          value={formData.lname}
          onChange={handleChange}
        />
        {errors.lname && (
          <span style={{ color: "red", fontSize: "0.875rem" }}>
            {errors.lname}
          </span>
        )}

        <label>*Email:</label>
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
        
        <label>*Phone Number:</label>
        <input
          required
          name="number"
          placeholder="Phone Number"
          value={formData.number}
          onChange={handleChange}
        />
        {errors.number && (
          <span style={{ color: "red", fontSize: "0.875rem" }}>
            {errors.number}
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

        <label>Confirm Password:</label>
        <input
          required
          name="confirmPassword"
          type="password"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
        />
        {errors.confirmPassword && (
          <span style={{ color: "red", fontSize: "0.875rem" }}>
            {errors.confirmPassword}
          </span>
        )}


        <label>*Role:</label>
        <select required name="role" value={formData.role} onChange={handleChange}>
          <option value="">Select Role</option>
          <option value="SFT staff">SFT staff</option>
          <option value="School staff">School staff</option>
          <option value="Future student">Future student</option>
        </select>
        {errors.role && (
          <span style={{ color: "red", fontSize: "0.875rem" }}>
            {errors.role}
          </span>
        )}

        {formData.role === "School staff" && (
          <>
            <label>School Name:</label>
            <input
              name="school"
              placeholder="School"
              value={formData.school}
              onChange={handleChange}
            />
            {errors.school && (
              <span style={{ color: "red", fontSize: "0.875rem" }}>
                {errors.school}
              </span>
            )}
          </>
        )}
        <button className="registerbtn" type="submit">
          Register
        </button>
      </form>
    </div>
  );
};

export default Register;