// src/controllers/roomControllers.js
import { AppDataSource } from "../data-source.js";
import { Room } from "../entities/Room.js";

const roomRepository = AppDataSource.getRepository(Room);

const generateCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

export const createRoom = async (req, res) => {
  try {
    const { roomName, playerName, topic, numQuestions, code } = req.body;
    console.log(req.body);
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

    const room = roomRepository.create({
      roomName,
      playerName,
      topic,
      numQuestions,
      code: roomCode,
    });

    const savedRoom = await roomRepository.save(room);

    res.status(201).json(savedRoom);
  } catch (error) {
    console.error("Error creating room:", error);
    res
      .status(500)
      .json({ error: "Failed to create room", details: error.message });
  }
};
