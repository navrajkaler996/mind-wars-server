require("reflect-metadata");
require("dotenv").config();
const { DataSource } = require("typeorm");

const { Room } = require("./entities/Room");
const { Player } = require("./entities/Player");
const { Topic } = require("./entities/Topic");

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true, // dev only, use migrations in prod
  logging: false,
  ssl: { rejectUnauthorized: false },
  entities: [Room, Player, Topic],
  migrations: [],
  subscribers: [],
});

module.exports = { AppDataSource };
