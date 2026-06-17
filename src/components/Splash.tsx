import { motion } from 'motion/react';

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  return (
    <div
      id="splash-screen"
      className="flex flex-col items-center justify-end h-full w-full bg-primary-dark text-white select-none relative overflow-hidden"
    >
      {/* Background Video */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-black flex justify-center items-center">
        <iframe
          src="https://www.youtube.com/embed/NvsNQR1OOOI?autoplay=1&mute=1&loop=1&playlist=NvsNQR1OOOI&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&vq=hd1080&end=41"
          title="Splash Video"
          allow="autoplay; encrypted-media"
          className="absolute inset-0 w-[300%] h-[300%] sm:w-[200%] sm:h-[200%] md:w-[150%] md:h-[150%] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ border: 'none' }}
        />
      </div>

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

      {/* Skip Button */}
      <button
        onClick={onComplete}
        className="z-10 text-[11px] font-bold text-white/70 hover:text-white uppercase tracking-widest bg-white/10 hover:bg-white/20 px-5 py-2 rounded-full border border-white/20 backdrop-blur-xs transition cursor-pointer select-none mb-4"
      >
        SKIP VIDEO →
      </button>

      {/* Credit */}
      <span className="z-10 text-[8px] text-white/40 font-bold tracking-wider drop-shadow-sm mb-2">
        LAGOS, NG • SAFE VTU WALLET
      </span>
    </div>
  );
}
