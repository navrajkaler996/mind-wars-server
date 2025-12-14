require("reflect-metadata");
require("dotenv").config();
const { DataSource } = require("typeorm");

const { Room } = require("./entities/Room");
const { Player } = require("./entities/Player");
const { Topic } = require("./entities/Topic");
const { PlayerTopic } = require("./entities/PlayerTopic");

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true, // dev only, use migrations in prod
  logging: false,
  ssl: { rejectUnauthorized: false },
  entities: [Room, Player, Topic, PlayerTopic],
  migrations: [],
  subscribers: [],
});

module.exports = { AppDataSource };
