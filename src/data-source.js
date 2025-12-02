require("reflect-metadata");
const { DataSource } = require("typeorm");
const { Room } = require("./entities/Room");

const AppDataSource = new DataSource({
  type: "postgres",
  url: "postgresql://postgres:Bitchplease1996*@db.akdpajnwzfpmucbokpxa.supabase.co:5432/postgres",
  synchronize: true, // set to false in production
  logging: false,
  ssl: {
    rejectUnauthorized: false,
  },
  entities: [Room],
  migrations: [],
  subscribers: [],
});

module.exports = { AppDataSource };
