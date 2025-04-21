/*
Add functionality for the password
Add functionality for the 2FA
Hook up the update password with the backend
Hook up the 2FA with the backend
*/
import React, {useState, useEffect} from 'react'
import './Settings.css';

const Settings = () => {
    const [darkMode, setDarkMode] = useState(false);

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

                <hr />

                <div className="password-section">
                    <label htmlfpr="password">Current Password:</label>
                    <input type="password" id="password" required/>
                    <label htmlFor="password">Updated Password:</label>
                    <input type="password" id="password" required/>
                    <button className="confirm-button">Confirm</button>
                </div>

                <hr />

                <button className="twofa-button">2 Factor Authentication</button>
            </div>
        </div>
    );
};

export default Settings