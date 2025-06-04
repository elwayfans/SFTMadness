import React, {useState, useEffect} from 'react'
import { useNavigate } from 'react-router-dom';
import './Settings.css';

const Settings = () => {
    // Initialize from localStorage, default to false (light mode)
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        return saved === null ? false : JSON.parse(saved);
    });
    const navigate = useNavigate();

    // Toggle class on body for global dark/light mode
    useEffect(() => {
        if (darkMode) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
        // Save preference
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
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

                <button className="confirm-button" onClick={() => navigate('/forgotpassword')}>
                    Update Password
                </button>

                <hr />

                <button className="twofa-button">2 Factor Authentication</button>
            </div>
        </div>
    );
};

export default Settings