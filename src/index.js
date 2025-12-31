const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const { AppDataSource } = require("./data-source");

const roomRoutes = require("./routes/roomRoutes");
const playerRoutes = require("./routes/playerRoutes");
const topicRoutes = require("./routes/topicRoutes");
const playerTopicRoutes = require("./routes/playerTopicRoutes");
const { Player } = require("./entities/Player");
const { Room } = require("./entities/Room");
const { quizData } = require("./data");
const { generateQuiz } = require("./generateQuiz");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL_PROD],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type"],
  },
});

app.use(
  cors({
    origin: process.env.CLIENT_URL_PROD,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// app.options("*", cors());

app.use(express.json());

app.use("/api/rooms", roomRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/playertopics", playerTopicRoutes);

const activeQuizzes = {};

// Store player scores for leaderboard
const playerScores = {}; // { roomId: { playerName: score } }

// Helper function to calculate and emit leaderboard
function updateLeaderboard(roomId) {
  if (!playerScores[roomId]) {
    return;
  }

  // Convert scores object to sorted array
  const leaderboard = Object.entries(playerScores[roomId])
    .map(([name, score]) => ({
      id: name, // Using name as id for simplicity
      name,
      score,
    }))
    .sort((a, b) => b.score - a.score); // Sort by score descending

  // Emit to all players in the room
  io.to(roomId).emit("leaderboardUpdate", leaderboard);
}

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  function sendNextQuestion(roomId) {
    const quiz = activeQuizzes[roomId];
    //No quiz found
    if (!quiz) {
      return;
    }

    //Clearing any existing timer
    if (quiz.timer) {
      clearTimeout(quiz.timer);
    }

    quiz.currentQuestionIndex++;

    if (quiz.currentQuestionIndex >= quiz.questions.length) {
      //Quiz ended
      io.to(roomId).emit("quizEnded");

      // Clean up scores when quiz ends
      // delete playerScores[roomId];
      // delete activeQuizzes[roomId];
      return;
    }

    sendQuestionToRoom(roomId);
  }

  //Function to send questions to the room
  function sendQuestionToRoom(roomId) {
    const quiz = activeQuizzes[roomId];
    if (!quiz) {
      return;
    }

    const question = quiz.questions[quiz.currentQuestionIndex];

    //Show a single question to all players
    io.to(roomId).emit("newQuestion", {
      question,
      questionIndex: quiz.currentQuestionIndex + 1,
      totalQuestions: quiz.questions.length,
    });

    quiz.timer = setTimeout(() => {
      sendNextQuestion(roomId);
    }, 10000); // 10 seconds per question
  }

  // Player joins a room
  socket.on("joinRoom", async ({ id, playerName, email }) => {
    console.log("joinRoom called with:", { id, playerName, email });
    socket.email = email;
    socket.roomId = id;
    socket.playerName = playerName;
    const roomId = id?.toString()?.trim();

    if (!roomId) {
      console.log("Invalid room ID");
      socket.emit("error", { message: "Invalid room ID" });
      return;
    }

    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);

    const playerRepository = AppDataSource.getRepository(Player);

    let player;

    // If email is provided, it's a registered user
    if (email) {
      console.log(`Looking for registered player with email: ${email}`);
      // Find the registered player by email
      player = await playerRepository.findOne({
        where: { email },
      });

      if (!player) {
        console.log(`Registered player not found for email: ${email}`);
        socket.emit("error", { message: "Registered player not found" });
        return;
      }

      // Associate the player with this room
      await playerRepository.update({ email }, { room: { id: roomId } });

      console.log(
        `Registered player ${player.name} (${email}) joined room ${roomId}`
      );
    } else {
      console.log(`Guest player logic for: ${playerName}`);
      // Guest player logic (no email)
      if (playerName) {
        player = await playerRepository.findOne({
          where: { name: playerName, room: { id: roomId }, email: null },
          relations: ["room"],
        });
      }

      if (!player && playerName) {
        // Create guest player (without email)
        player = playerRepository.create({
          name: playerName,
          room: { id: roomId },
          email: null,
        });
        await playerRepository.save(player);
        console.log(`Created guest player: ${playerName} in room ${roomId}`);
      }
    }

    // Initialize player score if not exists
    if (!playerScores[roomId]) {
      playerScores[roomId] = {};
    }
    if (!playerScores[roomId][playerName]) {
      playerScores[roomId][playerName] = 0;
    }

    const playersInRoom = await playerRepository.find({
      where: { room: { id: roomId } },
    });

    console.log(`Players in room ${roomId}:`, playersInRoom.length);

    let latestPlayer = playerName;
    io.to(roomId).emit("updatePlayers", { playersInRoom, latestPlayer });
    socket.emit("roomJoined", { roomId, playerName, isRegistered: !!email });
    console.log(`Emitted roomJoined for ${playerName}`);

    // Send current leaderboard to the player who just joined
    updateLeaderboard(roomId);
  });

  //Start quiz
  socket.on("startQuiz", async ({ roomId, roomCode, topic, numQuestions }) => {
    if (!roomId) {
      return;
    }

    //If quiz already exists for this room, don't regenerate
    if (activeQuizzes[roomId]?.questions?.length > 0) {
      console.log(
        `Quiz already exists for room ${roomId}, using existing quiz`
      );

      io.to(roomId).emit("quizStarted", {
        questions: activeQuizzes[roomId].questions,
        topic: topic,
        roomCode: roomCode,
        id: roomId,
      });

      setTimeout(() => {
        sendQuestionToRoom(roomId);
      }, 500);

      return; //returning early to prevent more quiz generation
    }

    //If already generating, ignore duplicate requests
    if (activeQuizzes[roomId]?.generating) {
      console.log(
        `Quiz already being generated for room ${roomId}, ignoring duplicate request`
      );
      return;
    }

    //Marking as generating to prevent duplicates
    activeQuizzes[roomId] = {
      generating: true,
      questions: [],
      currentQuestionIndex: 0,
      timer: null,
    };

    // Initialize scores for this room
    if (!playerScores[roomId]) {
      playerScores[roomId] = {};
    }

    try {
      const roomRepository = AppDataSource.getRepository(Room);

      const room = await roomRepository.findOne({
        where: { id: roomId },
        relations: ["players"],
      });

      if (!room) {
        socket.emit("error", { message: "Room not found" });
        delete activeQuizzes[roomId];
        return;
      }

      // Initialize all players with 0 score
      const playerRepository = AppDataSource.getRepository(Player);
      const playersInRoom = await playerRepository.find({
        where: { room: { id: roomId } },
      });

      playersInRoom.forEach((player) => {
        if (!playerScores[roomId][player.name]) {
          playerScores[roomId][player.name] = 0;
        }
      });

      //Generate quiz only once
      //  const questions = await generateQuiz(topic, numQuestions);
      const questions = quizData;

      console.log(
        `Quiz generated with ${questions.length} questions for room ${roomId}`
      );

      //Update with actual questions
      activeQuizzes[roomId] = {
        currentQuestionIndex: 0,
        questions,
        timer: null,
        generating: false,
      };

      //Quiz starting for everyone
      io.to(roomId).emit("quizStarted", {
        questions,
        topic: room.topic,
        roomCode: roomCode,
        id: roomId,
      });

      // Send initial leaderboard
      updateLeaderboard(roomId);

      setTimeout(() => {
        sendQuestionToRoom(roomId);
      }, 500);
    } catch (error) {
      console.error(`Error generating quiz for room ${roomId}:`, error);
      socket.emit("error", {
        message: "Failed to generate quiz. Please try again.",
      });
      delete activeQuizzes[roomId];
    }
  });

  socket.on("answerQuestion", ({ roomId, playerName, selectedOption }) => {
    const quiz = activeQuizzes[roomId];
    if (!quiz) {
      socket.emit("error", { message: "No quiz for this room" });
      return;
    }

    const currentQuestion = quiz.questions[quiz.currentQuestionIndex];

    //Check if answer is correct
    if (selectedOption === currentQuestion.answer) {
      // Calculate points based on time (assuming 10 seconds per question)
      // Points formula: 100 base + (timeLeft * 3)
      // Since we don't track individual time, we'll use a default bonus
      const points = 100 + Math.floor(Math.random() * 30); // 100-130 points

      // Update player score
      if (!playerScores[roomId]) {
        playerScores[roomId] = {};
      }
      if (!playerScores[roomId][playerName]) {
        playerScores[roomId][playerName] = 0;
      }
      playerScores[roomId][playerName] += points;

      console.log(`${playerName} scored ${points} points in room ${roomId}`);

      //Showing everyone that someone answered correctly with notification
      io.to(roomId).emit("correctAnswer", {
        playerName,
        points,
        totalScore: playerScores[roomId][playerName],
      });

      // Update and broadcast leaderboard
      updateLeaderboard(roomId);

      clearTimeout(quiz.timer);

      setTimeout(() => {
        sendNextQuestion(roomId);
      }, 3000);
    } else {
      io.to(roomId).emit("wrongAnswer", { playerName, selectedOption });
    }
  });

  socket.on("submitPlayerScore", async ({ roomId, playerName, score }) => {
    const quiz = activeQuizzes[roomId];

    if (!quiz) return;

    if (!quiz.players) {
      quiz.players = {};
    }

    // Save player's score
    quiz.players[playerName] = score;

    // Getting total number of players from db
    const playerRepository = AppDataSource.getRepository(Player);
    const playersInRoom = await playerRepository.find({
      where: { room: { id: roomId } },
    });

    const totalPlayers = playersInRoom.length;
    const submittedPlayers = Object.keys(quiz.players).length;

    //  if (submittedPlayers < totalPlayers) return;
    //When all players submitted, send final results to client
    io.to(roomId).emit("finalScores", quiz.players);

    // Cleanup
    delete activeQuizzes[roomId];
    delete playerScores[roomId];
  });

  socket.on("disconnect", async () => {
    console.log("Client disconnected:", socket.id, socket.email);
    const email = socket.email;
    const roomId = socket.roomId;
    const playerName = socket.playerName;
    if (roomId && email) {
      // console.log(`${currentPlayerName} left room ${currentRoomId}`);

      const playerRepository = AppDataSource.getRepository(Player);

      try {
        // If it's a guest player (no email), delete from database
        if (!email) {
          // const guestPlayer = await playerRepository.findOne({
          //   where: {
          //     email: currentPlayerName,
          //     room: { id: currentRoomId },
          //     email: null,
          //   },
          //   relations: ["room"],
          // });
          // if (guestPlayer) {
          //   await playerRepository.remove(guestPlayer);
          //   console.log(
          //     `Removed guest player ${currentPlayerName} from database`
          //   );
          // }
        } else {
          // For registered players, just remove room association
          await playerRepository.update({ email: email }, { room: null });
          console.log(
            `🔓 Removed room association for registered player ${email}`
          );
        }

        // Remove from leaderboard scores
        // if (
        //   playerScores[currentRoomId] &&
        //   playerScores[currentRoomId][currentPlayerName]
        // ) {
        //   delete playerScores[currentRoomId][currentPlayerName];
        //   console.log(`Removed ${currentPlayerName} from leaderboard`);
        // }

        // Get updated player list
        const playersInRoom = await playerRepository.find({
          where: { room: { id: roomId } },
        });

        // Notify remaining players
        io.to(roomId).emit("updatePlayers", {
          playersInRoom,
          latestPlayer: null,
        });
        io.to(roomId).emit("playerLeft", {
          roomId,
          email,
          playerName,
        });

        // Update leaderboard for remaining players
        // updateLeaderboard(currentRoomId);

        console.log(`Cleanup complete for ${email}`);
      } catch (error) {
        console.error("Error during disconnect cleanup:", error);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
AppDataSource.initialize()
  .then(() => {
    console.log("Data Source has been initialized!");
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error during Data Source initialization:", err);
  });

module.exports = { io };
