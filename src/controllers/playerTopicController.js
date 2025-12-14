import { AppDataSource } from "../data-source.js";
import { PlayerTopic } from "../entities/PlayerTopic.js";
import { Player } from "../entities/Player.js";
import { Topic } from "../entities/Topic.js";

const playerTopicRepository = AppDataSource.getRepository(PlayerTopic);
const playerRepository = AppDataSource.getRepository(Player);
const topicRepository = AppDataSource.getRepository(Topic);

export const addPlayerTopic = async (req, res) => {
  try {
    const { email, topicName, score = 0, battleWon = false } = req.body;

    if (!email || !topicName) {
      return res.status(400).json({
        message: "Email and topicName are required",
      });
    }

    // Find the player
    const player = await playerRepository.findOne({ where: { email } });
    if (!player) {
      return res.status(404).json({
        message: `No player found with email: ${email}`,
      });
    }

    // Find the topic
    let topic = await topicRepository.findOne({ where: { topicName } });
    if (!topic) {
      // If topic doesn't exist, create it
      topic = topicRepository.create({ topicName });
      await topicRepository.save(topic);
    }

    // Check if player already has this topic recorded
    let playerTopic = await playerTopicRepository.findOne({
      where: { player: { id: player.id }, topic: { id: topic.id } },
      relations: ["player", "topic"],
    });

    console.log("---", score, battleWon);

    //If player has already player in that topic, update
    if (playerTopic) {
      const currentScore = Number(playerTopic.totalScore || 0);
      const currentBattles = Number(playerTopic.totalBattles || 0);
      const currentBattlesWon = Number(playerTopic.totalBattlesWon || 0);
      const newScore = Number(score || 0);

      const battleWonBool = !!battleWon;

      playerTopic.totalScore = currentScore + newScore;
      playerTopic.totalBattles = currentBattles + 1;
      playerTopic.totalBattlesWon = battleWonBool
        ? currentBattlesWon + 1
        : currentBattlesWon;
      await playerTopicRepository.save(playerTopic);
    } else {
      // Create new record
      playerTopic = playerTopicRepository.create({
        player,
        topic,
        totalScore: score,
        totalBattles: 1,
        totalBattlesWon: battleWon ? 1 : 0,
      });
      await playerTopicRepository.save(playerTopic);
    }

    return res.status(200).json({
      message: "Player topic recorded successfully",
      playerTopic: {
        player: { name: player.name, email: player.email },
        topic: { topicName: topic.topicName },
        score: playerTopic.score,
        battles: playerTopic.battles,
        playedAt: playerTopic.playedAt,
      },
    });
  } catch (error) {
    console.error("Error adding player topic:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getPlayerTopics = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const player = await playerRepository.findOne({ where: { email } });
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    const playerTopics = await playerTopicRepository.find({
      where: { player: { id: player.id } },
      relations: ["topic"],
    });

    return res.status(200).json({
      player: { name: player.name, email: player.email },
      topics: playerTopics.map((pt) => ({
        topicName: pt.topic.topicName,
        score: pt.score,
        battles: pt.battles,
        playedAt: pt.playedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching player topics:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
