import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./BotSelector.css";

const BotSelector = () => {
  const [bots, setBots] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:8000/bots")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBots(data);
        } else {
          // TEMP: Add mock bots if none are returned
          setBots([
            {
              name: "neumont",
              logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzh_LFcsVvluiFsqG_iPm07B9tQZJXnPgHng&s",
            },
            { name: "byu", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Brigham_Young_University_medallion.svg/1200px-Brigham_Young_University_medallion.svg.png" },
          ]);
        }
      })
      .catch(() => {
        // TEMP: Add mock bots if fetch fails
        setBots([
          { name: "Test University", logo: "https://via.placeholder.com/100" },
          { name: "Sample College", logo: "https://via.placeholder.com/100" },
        ]);
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
            title={bot.name}
            style={{
              backgroundImage: `url(${bot.logo})`,
              backgroundSize: "100% 100%",
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
