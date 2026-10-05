export const LEGAL = {
  'Terms & Conditions': [
    'NoteCraft AI turns the notes you paste into an easy summary and 2, 3 and 6-mark questions with answers.',
    'Each study guide PDF costs ₹9, paid by UPI through Razorpay before it is generated.',
    'AI output can contain mistakes. Check it against your textbook before an exam.',
    'Upload only notes you have the right to use. We may block misuse of the service.',
  ],
  'Privacy Policy': [
    'There are no accounts. We save your notes and the guides we generate under a random ID stored in your browser, so you can see your history.',
    'Payments are handled by Razorpay. We never see or store your UPI ID or card details.',
    'Your notes are processed by a third-party AI service to produce your guide.',
    'We do not sell your data. Email us to delete your saved history.',
  ],
  'Refund & Cancellation Policy': [
    'Each PDF is a single prepaid purchase of ₹9, so there is nothing to cancel.',
    'If you were charged but no study guide was produced, email us within 7 days with your payment ID. We will regenerate it or refund you.',
    'Approved refunds go back to the original payment method within 5–7 working days.',
  ],
  'Contact Us': [
    'Email: support@your-domain.com',
    'Business address: [Add your registered address here]',
    'We reply within 2 working days.',
  ],
};

export default function LegalModal({ page, onClose }) {
  if (!page) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-2xl font-extrabold">{page}</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed">
          {LEGAL[page].map((p) => <p key={p}>{p}</p>)}
        </div>
        <button onClick={onClose} className="mt-5 rounded bg-ink px-4 py-2 text-white">Close</button>
      </div>
    </div>
  );
}
