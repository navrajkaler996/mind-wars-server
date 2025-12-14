const { EntitySchema } = require("typeorm");

const Topic = new EntitySchema({
  name: "Topic",
  tableName: "masterTopics",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },
    topicName: {
      type: "varchar",
    },
  },
});

module.exports = { Topic };
