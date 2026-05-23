import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Zap } from 'lucide-react';

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 15000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      id="splash-screen" 
      className="flex flex-col items-center justify-center h-full w-full bg-primary-dark text-white select-none relative overflow-hidden"
    >
      {/* Background ambient pulse lights */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary-blue/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-brand-cashback/10 rounded-full blur-3xl animate-pulse delay-700"></div>

      <div className="z-10 flex flex-col items-center">
        {/* Animated Icon and Brand Name */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [0.5, 1.1, 1], opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <div className="w-20 h-20 bg-primary-blue rounded-3xl flex items-center justify-center shadow-lg shadow-primary-blue/30 mb-5 relative">
            <Zap className="w-10 h-10 text-white fill-white animate-bounce" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cashback opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-cashback"></span>
            </span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-wider font-sans mb-2 text-white relative">
            Gig<span className="text-primary-blue text-glow">Up</span>
          </h1>
        </motion.div>

        {/* Brand Tagline */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-text-muted text-sm font-medium tracking-widest uppercase mb-10"
        >
          Data. Fast. Free.
        </motion.p>
      </div>

      {/* Loading Bar Indicator */}
      <div className="absolute bottom-16 w-38 h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "0%" }}
          transition={{ duration: 15, ease: "linear" }}
          className="h-full bg-primary-blue"
        />
      </div>

      {/* Skip Button */}
      <button
        onClick={onComplete}
        className="absolute bottom-8 text-[11px] font-bold text-white/50 hover:text-white uppercase tracking-widest bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-full border border-white/10 transition cursor-pointer select-none"
      >
        Skip Loading →
      </button>

      {/* PWA Credit */}
      <span className="absolute bottom-2 text-[8px] text-white/20 tracking-wider">
        LAGOS, NG • SAFE VTU WALLET
      </span>
    </div>
  );
}
