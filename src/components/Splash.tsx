import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 20000; // 20 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(currentProgress);

      if (elapsed >= duration) {
        clearInterval(interval);
        onComplete();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      id="splash-screen"
      className="flex flex-col items-center justify-end h-full w-full bg-primary-dark text-white select-none relative overflow-hidden"
    >
      {/* Background Image */}
      <img
        src="https://images.unsplash.com/photo-1642165835095-528b68f00663?w=800&q=80&auto=format&fit=crop"
        alt="Splash Background"
        className="absolute inset-0 w-full h-full object-cover object-[center_15%] select-none pointer-events-none"
        referrerPolicy="no-referrer"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#0c1b33]/30 z-1 pointer-events-none" />

      {/* Top Left Logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="absolute top-10 left-6 z-10"
      >
        <img
          src="https://cdn-icons-png.flaticon.com/512/15749/15749415.png"
          alt="GigUp Logo"
          className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-lg shadow-primary-blue/30"
          referrerPolicy="no-referrer"
        />
      </motion.div>

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary-blue/5 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Name + Tagline */}
      <div className="z-10 flex flex-col items-center mb-8">
        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-4xl font-extrabold tracking-wider font-sans mb-2 text-white text-center drop-shadow-lg"
        >
          Gig<span className="text-primary-blue">Up</span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-white text-sm font-extrabold tracking-widest uppercase drop-shadow-md"
        >
          Data. Fast. Free.
        </motion.p>
      </div>

      {/* Satellite Progress Track */}
      <div className="z-10 w-[80%] max-w-[320px] mb-6">
        {/* Percentage */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] text-white/50 font-mono tracking-widest uppercase">Loading</span>
          <span className="text-[10px] font-black font-mono text-primary-blue">
            {Math.round(progress)}%
          </span>
        </div>

        {/* Track */}
        <div className="w-full relative h-8 flex items-center">
          {/* Background track line */}
          <div className="absolute left-0 right-0 h-px bg-white/15 rounded-full" />

          {/* Progress fill line */}
          <div
            className="absolute left-0 h-px bg-primary-blue/60 rounded-full transition-all duration-75 ease-out"
            style={{ width: `${progress}%` }}
          />

          {/* 🛰️ Satellite — travels left to right */}
          <motion.div
            className="absolute text-2xl select-none"
            style={{
              left: `calc(${Math.min(progress, 95)}% - 14px)`,
              transition: 'left 0.1s ease-out',
            }}
            animate={{
              rotate: [0, 12, -12, 8, -8, 0],
            }}
            transition={{
              rotate: {
                duration: 1.4,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
          >
            🛰️
          </motion.div>
        </div>
      </div>

      {/* Skip Button */}
      <button
        onClick={onComplete}
        className="z-10 text-[11px] font-bold text-white/70 hover:text-white uppercase tracking-widest bg-white/10 hover:bg-white/20 px-5 py-2 rounded-full border border-white/20 backdrop-blur-xs transition cursor-pointer select-none mb-3"
      >
        SKIP LOADING →
      </button>

      {/* Credit */}
      <span className="z-10 text-[8px] text-white/40 font-bold tracking-wider drop-shadow-sm mb-2">
        LAGOS, NG • SAFE VTU WALLET
      </span>
    </div>
  );
}
