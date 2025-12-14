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

    // let player = await playerRepository.findOne({
    //   where: { name: playerName, room: { id: savedRoom.id } },
    //   relations: ["room"],
    // });
    let player = await playerRepository.findOne({
      where: { name: playerName },
      relations: ["room"],
    });

    if (!player) {
      // If not exists, create a new player
      console.log("here", playerName);
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

    res.status(201).json({ roomWithPlayers });
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
    const { code, playerName, email } = req.body;

    if (!code || !playerName) {
      return res
        .status(400)
        .json({ error: "Room code and player name are required" });
    }

    // Check for the room
    const room = await roomRepository.findOne({
      where: { code },
      relations: ["players"],
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    let player;

    // If email is provided, it's a registered user
    if (email) {
      // Find the registered player by email
      player = await playerRepository.findOne({
        where: { email },
      });

      if (!player) {
        return res.status(404).json({
          error: "Registered player not found. Please create an account first.",
        });
      }

      // Check if this registered player is already in the room
      // const playerInRoom = room.players.some((p) => p.email === email);
      // if (playerInRoom) {
      //   return res.status(400).json({
      //     error: "You have already joined this room",
      //   });
      // }

      // Associate the registered player with this room
      await playerRepository.update({ email }, { room: { id: room.id } });

      console.log(
        `Registered player ${player.name} (${email}) joined room ${room.code}`
      );
    } else {
      // Guest player logic (no email)

      // Check if guest player name already exists in this room
      const existingGuest = await playerRepository.findOne({
        where: { name: playerName, room: { id: room.id }, email: null },
        relations: ["room"],
      });

      if (existingGuest) {
        return res.status(400).json({
          error: "Player name already exists in this room",
        });
      }

      // Create a new guest player
      player = playerRepository.create({
        name: playerName,
        room,
        email: null,
      });
      await playerRepository.save(player);

      console.log(`Guest player ${playerName} joined room ${room.code}`);
    }

    console.log("------", room.roomName);

    res.status(200).json({
      message: `${playerName} joined room ${room.code}`,
      playerName: playerName,
      isRegistered: !!email,
      room: {
        id: room.id,
        code: room.code,
        roomName: room.roomName,
        topic: room.topic,
      },
    });
  } catch (err) {
    console.error("Error in joinRoom:", err);
    res.status(500).json({ error: "Failed to join room" });
  }
};
