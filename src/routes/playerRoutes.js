const express = require("express");
const { AppDataSource } = require("../data-source");
const { createPlayer } = require("../controllers/playerController");

const router = express.Router();

//Create a player
router.post("/create", createPlayer);

module.exports = router;
