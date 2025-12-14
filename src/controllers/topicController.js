import { AppDataSource } from "../data-source.js";
import { Topic } from "../entities/Topic.js";
import { searchMasterTopic } from "../geminiAPIs/searchMasterTopic.js";

const topicRepository = AppDataSource.getRepository(Topic);

export const searchTopic = async (req, res) => {
  try {
    const { topicName } = req.query;

    if (!topicName || typeof topicName !== "string") {
      return res.status(400).json({
        success: false,
        message: "topicName is required",
      });
    }

    // fetch all existing master topics
    const existingTopics = await topicRepository.find();

    const masterTopicsList = existingTopics?.length
      ? existingTopics.map((topic) => topic.topicName)
      : [];

    // semantic matching via Gemini
    const equivalentTopicsList = await searchMasterTopic(
      topicName,
      masterTopicsList
    );

    return res.status(200).json({
      success: true,
      inputTopic: topicName,
      matches: equivalentTopicsList,
    });
  } catch (error) {
    console.error("searchTopic error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to search topic",
    });
  }
};

export const createTopic = async (req, res) => {
  try {
    const { topicName } = req.body;

    if (!topicName || typeof topicName !== "string") {
      return res.status(400).json({
        success: false,
        message: "topicName is required and must be a string",
      });
    }

    topicName = topicName?.toLowerCase();

    const existingTopic = await topicRepository.findOneBy({ topicName });
    if (existingTopic) {
      return res.status(409).json({
        success: false,
        message: "Topic already exists",
      });
    }

    // Create and save new topic
    const newTopic = topicRepository.create({ topicName });
    await topicRepository.save(newTopic);

    return res.status(201).json({
      success: true,
      message: "Topic created successfully",
      topic: newTopic,
    });
  } catch (error) {
    console.error("createTopic error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create topic",
    });
  }
};
