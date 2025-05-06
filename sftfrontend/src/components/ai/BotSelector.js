import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./BotSelector.css";

const BotSelector = () => {
  const [bots, setBots] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const savedBots = JSON.parse(localStorage.getItem("bots")) || [];
    setBots(savedBots);
  }, []);

  const handleSelectBot = (bot) => {
    navigate("/chat-ai", { state: { bot } });
  };

  return (
    <div className="bot-selector">
      <h2>Select a School Bot</h2>
      <div className="bot-list">
        {bots.map((bot, index) => (
          <button
            key={index}
            onClick={() => handleSelectBot(bot)}
            className="bot-button"
            title={bot.name} // Add title attribute for hover text
            style={{
              backgroundImage: `url(${bot.logo})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <p>{bot.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BotSelector;