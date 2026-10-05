import { API } from './useStream.js';

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the payment window. Check your connection.'));
    document.body.appendChild(s);
  });
}

// Opens Razorpay for ₹9. Resolves with the payment proof, rejects if cancelled or failed.
export async function payForPdf() {
  await loadRazorpay();
  const res = await fetch(`${API}/api/payment/create-order`, { method: 'POST' });
  const order = await res.json();
  if (!res.ok) throw new Error(order.message);
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      order_id: order.orderId, amount: order.amount, currency: order.currency,
      name: 'NoteCraft AI', description: 'Study guide PDF',
      theme: { color: '#16213e' },
      handler: (r) => resolve(r),
      modal: { ondismiss: () => reject(new Error('Payment cancelled.')) },
    });
    rzp.on('payment.failed', () => reject(new Error('Payment failed. Try again.')));
    rzp.open();
  });
}
