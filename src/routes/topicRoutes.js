const express = require("express");
const {
  searchTopic,
  createTopic,
} = require("../controllers/topicController.js");

const router = express.Router();

router.get("/search", searchTopic);
router.post("/create", createTopic);

module.exports = router;
