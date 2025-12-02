const express = require("express");
const { AppDataSource } = require("./data-source");

const roomRoutes = require("./routes/roomRoutes");

const app = express();
app.use(express.json());

app.use("/api/rooms", roomRoutes);

// Initialize DB and start server
AppDataSource.initialize()
  .then(() => {
    console.log("Supabase Data Source has been initialized!");
    app.listen(3000, () => {
      console.log("Server is running on http://localhost:3000");
    });
  })
  .catch((err) => {
    console.error("Error during Data Source initialization:", err);
  });
