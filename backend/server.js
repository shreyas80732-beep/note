import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import paymentRoutes from './routes/payment.js';
import noteRoutes from './routes/notes.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json({ limit: '2mb' }));
app.use('/api/payment', paymentRoutes);
app.use('/api/notes', noteRoutes);

let uri = process.env.MONGO_URI;
if (!uri || uri === 'memory') {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  uri = (await MongoMemoryServer.create()).getUri('notecraft');
  console.log('Using a temporary database: history is lost when the server restarts');
}
await mongoose.connect(uri);
await mongoose.model('NoteHistory').init(); // make sure the unique index exists
app.listen(process.env.PORT || 5000, () => console.log('NoteCraft API running'));
