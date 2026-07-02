import { useState } from 'react';
import { motion } from 'motion/react';
import { submitAppRating } from '../api';

interface RatingModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RatingModal({ onClose, onSuccess }: RatingModalProps) {
  const [stars, setStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (stars === 0) return;
    setSubmitting(true);
    const token = localStorage.getItem('gigup_token');
    if (token) {
      await submitAppRating(token, stars, comment.trim() || undefined);
    }
    setSubmitting(false);
    setSubmitted(true);
    if (onSuccess) {
      onSuccess();
    }
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center relative"
      >
        {submitted ? (
          <>
            <div className="text-5xl mb-3">🙏</div>
            <h3 className="text-lg font-black text-slate-900">Thanks for your feedback!</h3>
          </>
        ) : (
          <>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg cursor-pointer"
            >
              ✕
            </button>
            <div className="text-4xl mb-2">⭐</div>
            <h3 className="text-lg font-black text-slate-900 mb-1">Rate GigUp This Week</h3>
            <p className="text-xs text-slate-500 mb-5">How has your experience been?</p>

            <div className="flex justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setStars(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="text-3xl cursor-pointer transition-transform hover:scale-110"
                >
                  {star <= (hoveredStar || stars) ? '⭐' : '☆'}
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Any comments? (optional)"
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm resize-none mb-4"
            />

            <button
              onClick={handleSubmit}
              disabled={stars === 0 || submitting}
              className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl text-sm cursor-pointer disabled:opacity-40"
            >
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
