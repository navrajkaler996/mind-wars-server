const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const { AppDataSource } = require("./data-source");

const roomRoutes = require("./routes/roomRoutes");
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

const activeQuizzes = {};

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
      delete activeQuizzes[roomId];
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
  socket.on("joinRoom", async ({ id, playerName }) => {
    const roomId = id?.toString()?.trim();

    if (!roomId) {
      socket.emit("error", { message: "Invalid room ID" });
      return;
    }

    socket.join(roomId);

    const playerRepository = AppDataSource.getRepository(Player);

    let player;
    if (playerName) {
      player = await playerRepository.findOne({
        where: { name: playerName, room: { id: roomId } },
        relations: ["room"],
      });
    }

    if (!player && playerName) {
      player = playerRepository.create({
        name: playerName,
        room: { id: roomId },
      });
      await playerRepository.save(player);
      console.log(`👤 Created new player: ${playerName} in room ${roomId}`);
    }

    const playersInRoom = await playerRepository.find({
      where: { room: { id: roomId } },
    });

    let latestPlayer = playerName;
    io.to(roomId).emit("updatePlayers", { playersInRoom, latestPlayer });
    socket.emit("roomJoined", { roomId, playerName });
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

      //Generate quiz only once
      const questions = await generateQuiz(topic, numQuestions);

      console.log(
        `✅ Quiz generated with ${questions.length} questions for room ${roomId}`
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
      //Showing everyone that someone answered correctly
      io.to(roomId).emit("correctAnswer", { playerName });

      clearTimeout(quiz.timer);

      setTimeout(() => {
        sendNextQuestion(roomId);
      }, 3000);
    } else {
      io.to(roomId).emit("wrongAnswer", { playerName, selectedOption });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
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
