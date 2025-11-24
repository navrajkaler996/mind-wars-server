// roomController.js
import { PrismaClient } from "../generated/prisma/client.ts";
let prisma;

const getPrisma = () => {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
};

// Create room controller
export const createRoom = async (req, res) => {
  const { roomName, topic, numQuestions, code } = req.body;

  if (!roomName || !topic || !numQuestions || !code) {
    return res.status(400).json({
      error: 'Missing required fields in the request body.',
    });
  }

  try {
    const prismaClient = getPrisma();



    const newRoom = await prismaClient.room.create({
      data: {
        roomName,
        topic,
        numQuestions,
        code,
      },
    });

    res.status(201).json({
      message: `Room "${newRoom.roomName}" successfully created in DB!`,
      details: newRoom,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: `Room name "${roomName}" already exists.`,
      });
    }

    console.error('Prisma Error:', error);
    return res.status(500).json({ error: 'Database operation failed.' });
  }
};
