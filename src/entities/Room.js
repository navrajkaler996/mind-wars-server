const { EntitySchema } = require("typeorm");

const Room = new EntitySchema({
  name: "Room",
  tableName: "rooms",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },
    roomName: {
      type: "varchar",
    },
    topic: {
      type: "varchar",
    },
    numQuestions: {
      type: "int",
    },
    code: {
      type: "varchar",
    },
  },
  relations: {
    players: {
      type: "one-to-many",
      target: "Player",
      inverseSide: "room",
      cascade: true,
    },
  },
});

module.exports = { Room };
