import { Router } from 'express';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { NoteHistory } from '../models.js';

const router = Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PROMPT = `Analyze the provided study notes and generate, in Markdown:
1. Core Theory & Simple Summary (easy to read).
2. Important 2-Mark Questions & Answers.
3. Important 3-Mark Questions & Answers.
4. Detailed 6-Mark Questions & Answers covering all main topics.

STUDY NOTES:
`;

const validDevice = (id) => typeof id === 'string' && /^[\w-]{16,64}$/.test(id);

function paymentIsValid({ razorpay_order_id: o, razorpay_payment_id: p, razorpay_signature: s }) {
  if (!o || !p || !s) return false;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${o}|${p}`).digest('hex');
  return s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected));
}

router.post('/generate-stream', async (req, res) => {
  const deviceId = req.headers['x-device-id'];
  const { title, uploadedText } = req.body;
  if (!validDevice(deviceId)) return res.status(400).json({ message: 'Reload the page and try again.' });
  if (!title?.trim() || !uploadedText?.trim())
    return res.status(400).json({ message: 'Add a title and some notes first.' });
  if (uploadedText.length > 60000)
    return res.status(413).json({ message: 'Notes are too long. Keep them under 60,000 characters.' });
  if (!paymentIsValid(req.body))
    return res.status(402).json({ message: 'Payment could not be verified. Pay ₹9 to generate.' });

  // Claim the payment first: the unique index blocks reuse, even for simultaneous requests
  let doc;
  try {
    doc = await NoteHistory.create({
      deviceId, paymentId: req.body.razorpay_payment_id, orderId: req.body.razorpay_order_id,
      title: title.trim(), rawInputText: uploadedText,
    });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'This payment was already used for a PDF.' });
    console.error(e);
    return res.status(500).json({ message: 'Server error. Try again.' });
  }

  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  let full = '';
  try {
    const stream = await ai.models.generateContentStream({ model: 'gemini-2.5-flash', contents: PROMPT + uploadedText });
    for await (const chunk of stream) {
      if (!chunk.text) continue;
      full += chunk.text;
      res.write('data: ' + JSON.stringify({ text: chunk.text }) + '\n\n');
    }
    if (!full) throw new Error('Empty output');
    doc.generatedContent = full;
    await doc.save();
    res.write('data: [DONE]\n\n');
  } catch (e) {
    console.error(e);
    await NoteHistory.deleteOne({ _id: doc._id }); // frees the payment so the user can retry without paying again
    res.write('data: ' + JSON.stringify({ error: 'Generation failed. Your payment is kept, so try again.' }) + '\n\n');
  }
  res.end();
});

router.get('/history', async (req, res) => {
  const deviceId = req.headers['x-device-id'];
  if (!validDevice(deviceId)) return res.json({ notes: [] });
  const notes = await NoteHistory.find({ deviceId, generatedContent: { $ne: '' } })
    .select('title generatedContent createdAt').sort({ createdAt: -1 });
  res.json({ notes });
});

export default router;
