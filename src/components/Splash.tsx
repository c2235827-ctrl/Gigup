import { useEffect } from 'react';
import { motion } from 'motion/react';

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      id="splash-screen" 
      className="flex flex-col items-center justify-end pb-36 h-full w-full bg-primary-dark text-white select-none relative overflow-hidden"
    >
      {/* Background Image - Anchored to show the top portion where the subject's face is */}
      <img 
        src="https://images.unsplash.com/photo-1642165835095-528b68f00663?q=80&w=770&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8WFyYW5kc3B=ftufbW9y=="
        alt="Splash Background" 
        className="absolute inset-0 w-full h-full object-cover object-[center_15%] select-none pointer-events-none"
        referrerPolicy="no-referrer"
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

      {/* Loading Bar Indicator */}
      <div className="z-10 absolute bottom-16 w-38 h-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-xs">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "0%" }}
          transition={{ duration: 3, ease: "linear" }}
          className="h-full bg-primary-blue"
        />
      </div>

      {/* Skip Button */}
      <button
        onClick={onComplete}
        className="z-10 absolute bottom-8 text-[11px] font-bold text-white/70 hover:text-white uppercase tracking-widest bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-xs transition cursor-pointer select-none"
      >
        Skip Loading →
      </button>

      {/* PWA Credit */}
      <span className="z-10 absolute bottom-2 text-[8px] text-white/40 font-bold tracking-wider drop-shadow-sm">
        LAGOS, NG • SAFE VTU WALLET
      </span>
    </div>
  );
}
