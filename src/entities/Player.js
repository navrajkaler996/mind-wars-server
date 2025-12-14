const { EntitySchema } = require("typeorm");

const Player = new EntitySchema({
  name: "Player",
  tableName: "players",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },
    name: {
      type: "varchar",
    },
    email: {
      type: "varchar",
    },
    password: {
      type: "varchar",
    },
    totalScore: {
      type: "int",
      default: 0,
    },
    totalBattles: {
      type: "int",
      default: 0,
    },
    totalBattlesWon: {
      type: "int",
      default: 0,
    },
  },
  relations: {
    room: {
      type: "many-to-one",
      target: "Room",
      joinColumn: true,
      onDelete: "CASCADE",
    },
    playerTopics: {
      type: "one-to-many",
      target: "PlayerTopic",
      inverseSide: "player",
    },
  },
});

module.exports = { Player };
