const express = require("express");
const { AppDataSource } = require("../data-source");
const {
  createPlayer,
  loginPlayer,
  getPlayerData,
  updatePlayerScore,
  updatePlayerBattlesWon,
} = require("../controllers/playerController");

const router = express.Router();

//Create a player
router.post("/create", createPlayer);
router.post("/login", loginPlayer);
router.get("/:email", getPlayerData);
router.put("/updatescore", updatePlayerScore);
router.put("/updatebattleswon", updatePlayerBattlesWon);

module.exports = router;
