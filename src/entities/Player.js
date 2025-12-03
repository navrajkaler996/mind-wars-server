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
  },
  relations: {
    room: {
      type: "many-to-one",
      target: "Room",
      joinColumn: true,
      onDelete: "CASCADE",
    },
  },
});

module.exports = { Player };
