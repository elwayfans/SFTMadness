import React, {useState, useEffect} from 'react'
import { useNavigate } from 'react-router-dom';
import './Settings.css';

const Settings = () => {
    const navigate = useNavigate();

    return (
        <div className="settings-container">
            <h1 className="settings-title">Settings</h1>
            <div className="settings-card">
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