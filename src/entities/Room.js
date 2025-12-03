const { EntitySchema } = require("typeorm");

const Room = new EntitySchema({
  name: "Room", // Entity name
  tableName: "rooms", // Table name in Supabase
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
    playerName: {
      type: "varchar",
      nullable: true,
    },
  },
});

module.exports = { Room };
