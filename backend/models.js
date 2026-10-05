import mongoose from 'mongoose';

// MongoDB stores history only. paymentId is unique so one payment = one PDF.
export const NoteHistory = mongoose.model('NoteHistory', new mongoose.Schema({
  deviceId: { type: String, required: true, index: true },
  paymentId: { type: String, required: true, unique: true },
  orderId: { type: String, required: true },
  title: { type: String, required: true },
  rawInputText: { type: String, required: true },
  generatedContent: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}));
