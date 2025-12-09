const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const { AppDataSource } = require("./data-source");

const roomRoutes = require("./routes/roomRoutes");
const { Player } = require("./entities/Player");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL_PROD],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type"],
  },
});

app.use(
  cors({
    origin: process.env.CLIENT_URL_PROD,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// app.options("*", cors());

app.use(express.json());

app.use("/api/rooms", roomRoutes);

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Player joins a room
  socket.on("joinRoom", async ({ id, playerName }) => {
    const roomId = id?.toString()?.trim();

    //roomId is what that is connecting this socket
    if (!roomId) {
      console.warn(`joinRoom called without roomId by socket ${socket.id}`);
      socket.emit("error", { message: "Invalid room ID" });
      return;
    }

    socket.join(roomId);

    const playerRepository = AppDataSource.getRepository(Player);

    // Check if player already exists
    let player;
    if (playerName) {
      player = await playerRepository.findOne({
        where: { name: playerName, room: { id: roomId } },
        relations: ["room"],
      });
    }

    if (!player && playerName) {
      player = playerRepository.create({
        name: playerName,
        room: { id: roomId },
      });
      await playerRepository.save(player);
    }

    // Get all players in room
    const playersInRoom = await playerRepository.find({
      where: { room: { id: roomId } },
    });
    let latestPlayer = playerName;
    io.to(roomId).emit("updatePlayers", { playersInRoom, latestPlayer });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
AppDataSource.initialize()
  .then(() => {
    console.log("Data Source has been initialized!");
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error during Data Source initialization:", err);
  });

// Export io if needed in controllers
module.exports = { io };
