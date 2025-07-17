import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./ChatBot.css";

const ChatAi = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedBot = location.state?.bot;
  const fromPath = location.state?.from || "/"; // Default fallback if no previous path found

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  if (!selectedBot) {
    navigate("/bot-selector");
    return null;
  }

  const botLogo = selectedBot.modelLogo || selectedBot.logo || "";
  const botName = selectedBot.company || selectedBot.name || "Unknown Bot";
  const botTextColor =
    selectedBot.botHexTextColor || selectedBot.botTextColor || "#000";
  const botTextboxBackgroundColor =
    selectedBot.botHexBackgroundColor ||
    selectedBot.botTextboxBackgroundColor ||
    "#fff";
  const companyKey = selectedBot.company || selectedBot.name || "";
  const backgroundHexColor = selectedBot.backgroundHexColor;
  const buttonHexTextColor = selectedBot.buttonHexTextColor || "#000";
  const buttonHexBackgroundColor =
    selectedBot.buttonHexBackgroundColor || "#fff";

  function isDarkColor(hex) {
    if (!hex || typeof hex !== "string" || !hex.startsWith("#")) return false;
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance < 128;
  }

  const handleSendMessage = async () => {
    if (input.trim()) {
      const userMessage = { sender: "student", text: input };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput("");

      try {
        const response = await fetch("http://localhost:8000/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: input,
            company: companyKey,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response from bot.");
        }

        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: data.response },
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: "Sorry, there was an error getting a response.",
          },
        ]);
      }
    }
  };

  function formatMessageWithBreaks(text) {
    const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
    const chunks = [];
    for (let i = 0; i < sentences.length; i += 5) {
      chunks.push(
        sentences
          .slice(i, i + 5)
          .join("")
          .trim()
      );
    }
    return chunks.map((chunk, idx) =>
      idx < chunks.length - 1 ? (
        <React.Fragment key={idx}>
          {chunk}
          <br />
          <br />
        </React.Fragment>
      ) : (
        chunk
      )
    );
  }

  return (
    <div className="chat-ai" style={{ backgroundColor: backgroundHexColor }}>
      <header
        style={{
          backgroundColor: backgroundHexColor,
          color: isDarkColor(backgroundHexColor) ? "#fff" : "#000",
        }}
      >
        <img src={botLogo} alt={`${botName} logo`} />
        <h1>{botName}</h1>
        <button
          type="button"
          onClick={() => navigate(fromPath)}
          style={{
            backgroundColor: buttonHexBackgroundColor,
            color: buttonHexTextColor,
          }}
        >
          Go Back
        </button>
      </header>

      <div className="chat-window">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${
              msg.sender === "student" ? "student" : "bot"
            }`}
            style={
              msg.sender === "bot"
                ? {
                    backgroundColor: botTextboxBackgroundColor,
                    color: botTextColor,
                  }
                : {}
            }
          >
            {formatMessageWithBreaks(msg.text)}
          </div>
        ))}
      </div>

      <footer>
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSendMessage();
            }
          }}
        />
        <button
          onClick={handleSendMessage}
          style={{
            backgroundColor: buttonHexBackgroundColor,
            color: buttonHexTextColor,
          }}
        >
          Send
        </button>
      </footer>
    </div>
  );
};

export default ChatAi;
