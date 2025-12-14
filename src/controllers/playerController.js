// src/controllers/playerController.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source.js";
import { Player } from "../entities/Player.js";
import { Room } from "../entities/Room.js";

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
      where: { email },
    });

    if (!loggedInPlayer) {
      return res
        .status(401)
        .json({ message: "Email or password does not match" });
    }

    const isPasswordMatch = await bcrypt.compare(
      password,
      loggedInPlayer?.password
    );

    if (!isPasswordMatch) {
      return res
        .status(401)
        .json({ message: "Email or password does not match" });
    }

    const token = jwt.sign(
      {
        id: loggedInPlayer.id,
        name: loggedInPlayer.name,
        email: loggedInPlayer.email,
      },
      process.env.JWT_KEY,
      { expiresIn: "2m" }
    );

    return res.status(200).json({
      message: `${loggedInPlayer.name} logged in successfully`,
      token,
      player: {
        name: loggedInPlayer.name,
        email: loggedInPlayer.email,
        totalScore: loggedInPlayer.totalScore,
        totalBattlesWon: loggedInPlayer.totalBattlesWon,
      },
    });
  } catch (error) {
    console.error("Error logging in player:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//Update player total score
export const updatePlayerScore = async (req, res) => {
  try {
    const { newScore, email } = req.body;

    if (typeof newScore !== "number" || !email) {
      return res.status(400).json({
        message: "Email and numeric newScore are required",
      });
    }

    const playerData = await playerRepository.findOne({
      where: { email },
    });

    if (!playerData) {
      return res.status(404).json({
        message: `No player exists with this email: ${email}`,
      });
    }

    const updatedScore = playerData.totalScore + newScore;

    await playerRepository.update({ email }, { totalScore: updatedScore });

    return res.status(200).json({
      message: "Player score updated successfully",
      player: {
        name: playerData.name,
        email: playerData.email,
        totalScore: updatedScore,
      },
    });
  } catch (error) {
    console.error("Error updating player score:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

//Update player total battles won
export const updatePlayerBattlesWon = async (req, res) => {
  try {
    const { battlesWon, email } = req.body;

    if (typeof battlesWon !== "number" || !email) {
      return res.status(400).json({
        message: "Email and numeric battlesWon are required",
      });
    }

    const playerData = await playerRepository.findOne({
      where: { email },
    });

    if (!playerData) {
      return res.status(404).json({
        message: `No player exists with this email: ${email}`,
      });
    }

    const updatedBattlesWon = playerData.totalBattlesWon + battlesWon;

    await playerRepository.update(
      { email },
      { totalBattlesWon: updatedBattlesWon }
    );

    return res.status(200).json({
      message: "Player battles won updated successfully",
      player: {
        name: playerData.name,
        email: playerData.email,
        totalBattlesWon: updatedBattlesWon,
      },
    });
  } catch (error) {
    console.error("Error updating player battles won:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

//Get player data
export const getPlayerData = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const playerData = await playerRepository.findOne({
      where: { email },
    });

    if (!playerData) {
      return res.status(404).json({
        message: `No player exists with this email: ${email}`,
      });
    }

    return res.status(200).json({
      player: {
        name: playerData.name,
        email: playerData.email,
        totalScore: playerData.totalScore,
        totalBattlesWon: playerData.totalBattlesWon,
      },
    });
  } catch (error) {
    console.error("Error fetching player data:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
