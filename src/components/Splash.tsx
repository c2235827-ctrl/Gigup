import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing safe handshake...");

  const statuses = [
    "Establishing cloud connection secure nodes...",
    "Querying bulk data pipelines (MTN, GLO, Airtel)...",
    "Initializing 10% instant withdrawable cashback mechanisms...",
    "Securing your free account registration bonuses...",
    "Configuring secure TLS connection protocols...",
    "Preparing your ultimate GigUp workspace experience...",
    "Handshake complete. Launching dashboard!"
  ];

  useEffect(() => {
    const startTime = Date.now();
    const duration = 25000; // 25 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(currentProgress);

      // Select status text based on progress segment
      const statIndex = Math.min(
        Math.floor((currentProgress / 100) * statuses.length),
        statuses.length - 1
      );
      setStatusText(statuses[statIndex]);

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
      className="flex flex-col items-center justify-end pb-36 h-full w-full bg-primary-dark text-white select-none relative overflow-hidden"
    >
      {/* Background Image - Anchored to show the top portion where the subject's face is */}
      <img 
        src="https://images.unsplash.com/photo-1642165835095-528b68f00663?w=800&q=80&auto=format&fit=crop"
        alt="Splash Background" 
        className="absolute inset-0 w-full h-full object-cover object-[center_15%] select-none pointer-events-none"
        referrerPolicy="no-referrer"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      
      {/* 30% Opacity Dark Blue Overlay */}
      <div className="absolute inset-0 bg-[#0c1b33]/30 z-1 pointer-events-none" />

      {/* Top Left Branding Logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute top-10 left-6 z-10"
      >
        <img 
          src="https://cdn-icons-png.flaticon.com/512/15749/15749415.png" 
          alt="GigUp Logo" 
          className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-lg shadow-primary-blue/30"
          referrerPolicy="no-referrer"
        />
      </motion.div>

      {/* Background ambient pulse lights (reduced opacity for subtle touch) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary-blue/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="z-10 flex flex-col items-center">
        {/* Animated Brand Name */}
        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-4xl font-extrabold tracking-wider font-sans mb-2 text-white text-glow text-center"
        >
          Gig<span className="text-primary-blue">Up</span>
        </motion.h1>

        {/* Brand Tagline */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-white text-sm font-extrabold tracking-widest uppercase mb-10 drop-shadow-md text-glow"
        >
          Data. Fast. Free.
        </motion.p>
      </div>

      {/* Impressive Progress System */}
      <div className="z-10 absolute bottom-24 w-[55%] max-w-[190px] bg-black/45 border border-white/10 p-3 rounded-2xl backdrop-blur-md shadow-2xl flex flex-col items-center">
        {/* Progress header with percentage */}
        <div className="w-full flex justify-between items-center mb-1.5">
          <span className="text-[7.5px] text-primary-blue font-black tracking-widest uppercase">
            GIGUP CORE
          </span>
          <span className="text-[9.5px] font-black font-mono text-white tracking-tighter bg-primary-blue/20 border border-primary-blue/30 px-1.5 py-0.5 rounded">
            {Math.round(progress)}%
          </span>
        </div>

        {/* Console-style status feed */}
        <div className="w-full text-[8px] text-white/75 font-mono text-left tracking-tight mb-2 h-8 leading-snug overflow-hidden select-none">
          <span className="text-primary-blue mr-0.5">&gt;</span> {statusText}
        </div>

        {/* Dual-track loading progress track */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative border border-white/5 shadow-inner">
          <div 
            style={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-yellow-400 via-primary-blue to-emerald-400 rounded-full transition-all duration-75 ease-out shadow-[0_0_12px_rgba(59,126,248,0.7)] relative"
          >
            {/* Shifting gloss overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          </div>
        </div>
      </div>

      {/* Skip Button */}
      <button
        onClick={onComplete}
        className="z-10 absolute bottom-10 text-[11px] font-bold text-white/70 hover:text-white uppercase tracking-widest bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-xs transition cursor-pointer select-none"
      >
        Skip Loading →
      </button>

      {/* PWA Credit */}
      <span className="z-10 absolute bottom-3 text-[8px] text-white/40 font-bold tracking-wider drop-shadow-sm">
        LAGOS, NG • SAFE VTU WALLET
      </span>
    </div>
  );
}
