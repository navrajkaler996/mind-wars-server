
import express from 'express';

import { createRoom } from '../controllers/roomController.js';

const roomRouter = express.Router();

//POST - Create room
roomRouter.post('/create', createRoom);


export default roomRouter;
