const express = require("express");
const { generateQuiz } = require("../generateQuiz");

const router = express.Router();

// GET all rooms
router.post("/get-questions", async (req, res) => {
  try {
    const { topic, numQuestions } = req.body;

    const questions = await generateQuiz(topic, numQuestions);

    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
