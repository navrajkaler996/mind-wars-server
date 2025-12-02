require("reflect-metadata");
require("dotenv").config();
const { DataSource } = require("typeorm");

const { Room } = require("./entities/Room");

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true, // dev only, use migrations in prod
  logging: false,
  ssl: { rejectUnauthorized: false },
  entities: [Room],
  migrations: [],
  subscribers: [],
  extra: {
    // Force IPv4
    family: 4,
  },
});

module.exports = { AppDataSource };
