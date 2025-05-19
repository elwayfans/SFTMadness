import React, { useState } from "react";

export const AddSchool = () => {
  const [form, setForm] = useState({
    name: "",
    logo: null,
    phone: "",
    email: "",
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
    const formData = new FormData();
    formData.append("name", form.name);
    if (form.logo) formData.append("logo", form.logo);
    formData.append("phone", form.phone);
    formData.append("email", form.email);

    try {
      const response = await fetch("/api/schools", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        alert("School added successfully!");
        setForm({ name: "", logo: null, phone: "", email: "" });
      } else {
        alert("Failed to add school.");
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>School Name:</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Logo (optional):</label>
        <input
          type="file"
          name="logo"
          accept="image/*"
          onChange={handleChange}
        />
      </div>
      <div>
        <label>Admissions Phone:</label>
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Admissions Email:</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>
      <button type="submit">Add School</button>
    </form>
  );
};