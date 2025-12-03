const express = require("express");
const { AppDataSource } = require("../data-source");
const { Room } = require("../entities/Room");
const { createRoom, joinRoom } = require("../controllers/roomController");

const router = express.Router();
const roomRepository = AppDataSource.getRepository(Room);

// GET all rooms
router.get("/", async (req, res) => {
  try {
    const rooms = await roomRepository.find();

    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Create rooms
router.post("/create", createRoom);

//Join a room
router.post("/join", joinRoom);

module.exports = router;
