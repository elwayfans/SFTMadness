import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./BotSelector.css";

const BotSelector = () => {
  const [bots, setBots] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:8000/customs/all")
      .then((res) => res.json())
      .then((data) => {
        console.log(data.bots); // <-- Add this
        setBots(data.bots || []);
      });
  }, []);

  const handleSelectBot = (bot) => {
    navigate("/chat-ai", { state: { bot } });
  };

  return (
    <div className="bot-selector">
      <h2>Select a School to Start Chatting</h2>
      <div className="bot-list">
        {bots.map((bot, index) => (
          <button
            key={index}
            onClick={() => handleSelectBot(bot)}
            className="bot-button"
            title={bot.company || ""}
            style={{
              backgroundImage: `url(${bot.modelLogo})`,
              backgroundSize: "100% 100%",
              backgroundPosition: "center",
            }}
          >
            <p>{bot.company || "Unknown"}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BotSelector;
