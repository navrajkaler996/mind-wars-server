// src/controllers/playerController.js
import bcrypt from "bcrypt";
import { AppDataSource } from "../data-source.js";
import { Player } from "../entities/Player.js";
import { Room } from "../entities/Room.js";

const roomRepository = AppDataSource.getRepository(Room);
const playerRepository = AppDataSource.getRepository(Player);

export const createPlayer = async (req, res) => {
  try {
    const { name, email, password } = req?.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const playerExists = await playerRepository.findOne({ where: { email } });
    if (playerExists) {
      return res
        .status(409)
        .json({ message: "Player with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const player = playerRepository.create({
      name,
      email,
      password: hashedPassword,
    });

    const savedPlayer = await playerRepository.save(player);

    return res.status(201).json({
      message: "Player created successfully",
      player: {
        id: savedPlayer.id,
        name: savedPlayer.name,
        email: savedPlayer.email,
      },
    });
  } catch (error) {
    console.error("Error creating player:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const loginPlayer = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const loggedInPlayer = await playerRepository.findOne({
      where: { email, password },
    });

    if (!loggedInPlayer) {
      return res
        .status(401)
        .json({ message: "Email or password does not match" });
    }

    return res.status(200).json({
      message: `${loggedInPlayer.name} logged in successfully`,
      player: {
        name: loggedInPlayer.name,
        email: loggedInPlayer.email,
      },
    });
  } catch (error) {
    console.error("Error logging in player:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
