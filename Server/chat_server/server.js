const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

mongoose.connect("mongodb+srv://admin:Ktuktuk%404321@cluster0.xh8tk.mongodb.net/user_app", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Message schema
const messageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  time: { type: Date, default: Date.now },
});

// Chat schema
function arrayLimit(val) {
  return val.length === 2;
}

const chatSchema = new mongoose.Schema({
  participants: {
    type: [String],
    required: true,
    validate: [arrayLimit, '{PATH} must have exactly 2 participants'],
  },
  conversation: [messageSchema],
});

const Chat = mongoose.model("Chat", chatSchema);

const doctors = ["Dr. Smith", "Dr. Jones", "Dr. Brown"];

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("login", ({ username, role }) => {
    socket.username = username;
    socket.role = role;

    if (doctors.includes(username)) {
      socket.join(username + "room");
    } else {
      socket.emit("doctorList", doctors);
    }
  });

  socket.on("joinRoom", async (roomName) => {
    socket.join(roomName);
    socket.currentRoom = roomName;

    const doctorName = doctors.find((doc) => roomName === doc + "room");
    const patientName = socket.username;

    let participants = [doctorName, patientName].sort();

    try {
      const chat = await Chat.findOne({
        participants: { $all: participants, $size: 2 }
      });

      if (chat) {
        socket.emit("loadMessages", chat.conversation);
      } else {
        socket.emit("loadMessages", []);
      }

      console.log(`${socket.username} joined room ${roomName}`);
    } catch (err) {
      console.error("Error loading chat history:", err);
    }
  });

  socket.on("sendMessage", async ({ room, content }) => {
    const doctorName = doctors.find((doc) => room === doc + "room");
    const patientName = socket.username;

    if (!doctorName) return;

    const participants = [doctorName, patientName].sort();

    const message = {
      sender: socket.username,
      message: content,
      time: new Date(),
    };

    try {
      let chat = await Chat.findOne({
        participants: { $all: participants, $size: 2 }
      });

      if (!chat) {
        chat = new Chat({
          participants,
          conversation: [message],
        });
      } else {
        chat.conversation.push(message);
      }

      await chat.save();

      io.to(room).emit("receiveMessage", {
        sender: socket.username,
        content,
      });
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
