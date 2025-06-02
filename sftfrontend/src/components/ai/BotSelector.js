import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./BotSelector.css";

const BotSelector = () => {
  const [bots] = useState([
    {
      name: "neumont",
      logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzh_LFcsVvluiFsqG_iPm07B9tQZJXnPgHng&s",
      botTextColor: "#000000",
      botTextboxBackgroundColor: "#FCDD09",
    },
    {
      name: "byu",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Brigham_Young_University_medallion.svg/1200px-Brigham_Young_University_medallion.svg.png",
      botTextColor: "#ffffff",
      botTextboxBackgroundColor: "#002E5D",
    },
    {
      name: "SFT",
      logo: "https://static.wixstatic.com/media/56690b_526e611e737c48f78a0008080df040aa~mv2.png/v1/fill/w_309,h_140,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/SFT2023.png",
      botTextColor: "#ffffff",
      botTextboxBackgroundColor: "#000000",
    },
  ]);
  const navigate = useNavigate();

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
            <p>{bot.name.toUpperCase()}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BotSelector;
