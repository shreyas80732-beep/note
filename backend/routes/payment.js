import { Router } from 'express';
import Razorpay from 'razorpay';

export const PRICE_PAISE = 900; // ₹9 per PDF
const router = Router();
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.post('/create-order', async (_req, res) => {
  try {
    const order = await razorpay.orders.create({
      amount: PRICE_PAISE, currency: 'INR', receipt: `pdf_${Date.now()}`,
    });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Could not start payment. Try again.' });
  }
});

export default router;
