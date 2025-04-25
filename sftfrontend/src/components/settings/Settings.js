/*
Add functionality for the password
Add functionality for the 2FA
Hook up the update password with the backend
Hook up the 2FA with the backend
*/
import React, {useState, useEffect} from 'react'
import { useNavigate } from "react-router-dom"
import './Settings.css'

const Settings = () => {
    const [darkMode, setDarkMode] = useState(false);
    const navigate = useNavigate();

    // Toggle class on body for global dark/light mode
    useEffect(() => {
        if (darkMode) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    }, [darkMode]);

    const toggleTheme = () => {
        setDarkMode(prev => !prev);
    };

    return (
        <div className="settings-container">
            <h1 className="settings-title">Settings</h1>
            <div className="settings-card">
                <div className="theme-toggle">
                    <label>Dark</label>
                    <label className="switch">
                        <input type="checkbox" checked={!darkMode} onChange={toggleTheme} />
                        <span className="slider round"></span>
                    </label>
                    <label>Light</label>
                </div>

                <button className="twofa-button">2 Factor Authentication</button>
                <button className="password-button"onClick={() => navigate('/login')}>Forgot Password</button>
            </div>
        </div>
    );
};

export default Settings