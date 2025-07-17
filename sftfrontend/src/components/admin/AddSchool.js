import React, { useState } from "react";
import "./Admin.css"; // Reuse styles defined in your Admin.css

export const AddSchool = () => {
  const [form, setForm] = useState({
    name: "",
    logo: null,
    phone: "",
    email: "",
    password: "",
    company: "",
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "logo") {
      setForm({ ...form, logo: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone,
      company: form.company || form.name, 
    };

    try {
      const response = await fetch("http://localhost:8000/admin/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (response.ok) {
        alert("School added successfully!");
        setForm({
          name: "",
          logo: null,
          phone: "",
          email: "",
          password: "",
          company: "",
        });
      } else {
        const errorData = await response.json();
        alert("Failed to add school. " + (errorData.detail || ""));
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-school-form">
      <div>
        <label htmlFor="name">School Name:</label>
        <input
          type="text"
          name="name"
          id="name"
          value={form.name}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="logo">Logo (optional):</label>
        <input
          type="file"
          name="logo"
          id="logo"
          accept="image/*"
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="phone">Admissions Phone:</label>
        <label>Format: +11234567890</label>
        <input
          type="tel"
          name="phone"
          id="phone"
          value={form.phone}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="email">Admissions Email:</label>
        <input
          type="email"
          name="email"
          id="email"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="email">Temporary Password:</label>
        <input
          type="password"
          name="password"
          id="password"
          value={form.password}
          onChange={handleChange}
          required
        />
      </div>
      <button className="addSchool" type="submit">Add School</button>
    </form>
  );
};
