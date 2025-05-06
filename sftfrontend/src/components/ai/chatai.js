import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./ChatAi.css"; 

const ChatAi = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedBot = location.state?.bot;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  if (!selectedBot) {
    // Redirect back to bot selector if no bot is selected
    navigate("/bot-selector");
    return null;
  }

  const handleSendMessage = () => {
    if (input.trim()) {
      setMessages((prev) => [...prev, { sender: "student", text: input }]);
      setInput("");
      // Simulate bot response (replace with actual bot logic)
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "This is a bot response." },
        ]);
      }, 1000);
    }
  };

  return (
    <div className="chat-ai">
      <header>
        <img src={selectedBot.logo} alt={`${selectedBot.name} logo`} />
        <h1>{selectedBot.name}</h1>
      </header>
      <div className="chat-window">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.sender === "student" ? "student" : "bot"}`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <footer>
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button onClick={handleSendMessage}>Send</button>
      </footer>
    </div>
  );
};

export default ChatAi;