let ioInstance;

function initSocket(server) {
  const { Server } = require("socket.io");
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });

  ioInstance = io;
}

function getIO() {
  if (!ioInstance) throw new Error("Socket.io not initialized");
  return ioInstance;
}

module.exports = { initSocket, getIO };
