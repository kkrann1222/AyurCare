import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useLocation } from "react-router-dom";

const socket = io("http://localhost:3000");

export  function Doc() {
  const location = useLocation();
  const initialUsername = location.state?.username || "";

  const [username, setUsername] = useState(initialUsername);
  const [loggedIn, setLoggedIn] = useState(false);
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!loggedIn) return;

    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("loadMessages", (history) => {
      setMessages(history);
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("loadMessages");
    };
  }, [loggedIn]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStart = () => {
    if (!username.trim()) {
      alert("Please enter your name");
      return;
    }

    const role = "doctor";
    const docRoom = username + "room";

    socket.emit("login", { username, role });
    socket.emit("joinRoom", docRoom);

    setRoom(docRoom);
    setLoggedIn(true);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && room) {
      socket.emit("sendMessage", { room, content: message });
      setMessage("");
    }
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center text-green-700">Doctor Login</h2>
          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2 mb-4"
          />
          <button
            onClick={handleStart}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Join Chat Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-green-600 text-white py-4 px-6 text-xl font-semibold">
        {username} (doctor)
      </header>
      <main className="flex flex-1 p-4">
        <div className="w-full bg-white rounded-lg shadow flex flex-col">
          <h3 className="text-lg font-semibold p-4 border-b">Chat Room: {room}</h3>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.sender === username
                    ? "bg-green-100 self-end text-right"
                    : "bg-gray-200 self-start"
                }`}
              >
                <div className="text-xs text-gray-600 mb-1 font-medium">
                  {msg.sender}
                </div>
                <p>{msg.message || msg.content}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form
            onSubmit={sendMessage}
            className="flex items-center border-t p-4"
          >
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 border rounded px-3 py-2 mr-2"
            />
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
