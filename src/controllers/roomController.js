// src/controllers/roomControllers.js
import { AppDataSource } from "../data-source.js";
import { Player } from "../entities/Player.js";
import { Room } from "../entities/Room.js";

const roomRepository = AppDataSource.getRepository(Room);
const playerRepository = AppDataSource.getRepository(Player);

const generateCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

//Create room

export const createRoom = async (req, res) => {
  try {
    const { roomName, playerName, topic, numQuestions, code } = req.body;

    // Validations
    if (!roomName || typeof roomName !== "string" || roomName.trim() === "") {
      return res
        .status(400)
        .json({ error: "roomName is required and must be a non-empty string" });
    }

    if (
      !playerName ||
      typeof playerName !== "string" ||
      playerName.trim() === ""
    ) {
      return res.status(400).json({
        error: "playerName is required and must be a non-empty string",
      });
    }

    if (!topic || typeof topic !== "string" || topic.trim() === "") {
      return res
        .status(400)
        .json({ error: "topic is required and must be a non-empty string" });
    }

    if (
      numQuestions === undefined ||
      typeof numQuestions !== "number" ||
      numQuestions < 1
    ) {
      return res.status(400).json({
        error: "numQuestions is required and must be a positive number",
      });
    }

    const roomCode = code && typeof code === "string" ? code : generateCode();

    // Create Room
    const room = roomRepository.create({
      roomName,
      topic,
      numQuestions,
      code: roomCode,
    });
    const savedRoom = await roomRepository.save(room);

    //If player exists
    let player = await playerRepository.findOne({
      where: { name: playerName, room: { id: savedRoom.id } },
      relations: ["room"],
    });

    if (!player) {
      // If not exists, create a new player
      player = playerRepository.create({
        name: playerName,
        room: savedRoom,
      });
      await playerRepository.save(player);
    }

    // Return the room with its players
    const roomWithPlayers = await roomRepository.findOne({
      where: { id: savedRoom.id },
      relations: ["players"],
    });

    res.status(201).json(roomWithPlayers);
  } catch (error) {
    console.error("Error creating room:", error);
    res
      .status(500)
      .json({ error: "Failed to create room", details: error.message });
  }
};
//Join room
export const joinRoom = async (req, res) => {
  try {
    const { code, playerName } = req.body;

    if (!code || !playerName) {
      return res
        .status(400)
        .json({ error: "Room code and player name are required" });
    }

    //Check for the room
    const room = await roomRepository.findOne({
      where: { code },
      relations: ["players"],
    });

    if (!room) return res.status(404).json({ error: "Room not found" });

    // Check if player already exists in this room
    const existingPlayer = await playerRepository.findOne({
      where: { name: playerName, room: { id: room.id } },
      relations: ["room"],
    });

    if (existingPlayer) {
      return res
        .status(400)
        .json({ error: "Player name already exists in this room" });
    }

    // Create a new player
    const player = playerRepository.create({
      name: playerName,
      room,
    });
    await playerRepository.save(player);

    res.status(200).json({
      message: `${playerName} joined room ${room.code}`,
      room,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to join room" });
  }
};
