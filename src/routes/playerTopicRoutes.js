const express = require("express");
const { addPlayerTopic } = require("../controllers/playerTopicController");

const router = express.Router();

router.post("/add", addPlayerTopic);

module.exports = router;
