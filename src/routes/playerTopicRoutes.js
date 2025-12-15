const express = require("express");
const {
  addPlayerTopic,
  getPlayerTopics,
} = require("../controllers/playerTopicController");

const router = express.Router();

router.post("/add", addPlayerTopic);
router.get("/getplayertopic", getPlayerTopics);

module.exports = router;
