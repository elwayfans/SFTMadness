import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./ChatBot.css";

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

  // Helper: fallback for bot fields
  const botLogo = selectedBot.modelLogo || selectedBot.logo || "";
  const botName = selectedBot.company || selectedBot.name || "Unknown Bot";
  const botTextColor = selectedBot.botHexTextColor || selectedBot.botTextColor || "#000";
  const botTextboxBackgroundColor = selectedBot.botHexBackgroundColor || selectedBot.botTextboxBackgroundColor || "#fff";
  const companyKey = selectedBot.company || selectedBot.name || "";

  const handleSendMessage = async () => {
    if (input.trim()) {
      const userMessage = { sender: "student", text: input };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput("");

      try {
        // Send user message to backend (history is optional, backend expects prompt and company)
        const response = await fetch("http://localhost:8000/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: input,
            company: companyKey
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
    // Split by sentence-ending punctuation followed by a space or end of string
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
    // Return as an array with <br /> between each chunk
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
    <div className="chat-ai">
      <header>
        <img src={botLogo} alt={`${botName} logo`} />
        <h1>{botName}</h1>
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
        <button onClick={handleSendMessage}>Send</button>
      </footer>
    </div>
  );
};

export default ChatAi;