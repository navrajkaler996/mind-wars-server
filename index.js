import 'dotenv/config';

import express from 'express';
import roomRouter  from './routes/roomRoutes.js';

const app = express();

app.use(express.json());

const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Hello from your Express server using ESM!');
});


//APIs for rooms
app.use('/api/rooms', roomRouter);

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});