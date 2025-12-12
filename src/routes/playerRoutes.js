const express = require("express");
const { AppDataSource } = require("../data-source");
const {
  createPlayer,
  loginPlayer,
} = require("../controllers/playerController");

const router = express.Router();

//Create a player
router.post("/create", createPlayer);
router.post("/login", loginPlayer);

module.exports = router;
