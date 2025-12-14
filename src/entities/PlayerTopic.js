const { EntitySchema } = require("typeorm");
const { Player } = require("./Player");
const { Topic } = require("./Topic");

const PlayerTopic = new EntitySchema({
  name: "PlayerTopic",
  tableName: "playerTopics",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },

    totalScore: {
      type: "int",

      default: 0,
    },
    totalBattlesWon: {
      type: "int",
      default: 0,
    },
    totalBattles: {
      type: "int",
      default: 0,
    },
  },
  relations: {
    player: {
      type: "many-to-one",
      target: "Player",
      joinColumn: true,
      onDelete: "CASCADE",
    },
    topic: {
      type: "many-to-one",
      target: "Topic",
      joinColumn: true,
      onDelete: "CASCADE",
    },
  },
});

module.exports = { PlayerTopic };
