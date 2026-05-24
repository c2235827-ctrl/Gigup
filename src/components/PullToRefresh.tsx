import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export default function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullOffset, setPullOffset] = useState(0);
  const [status, setStatus] = useState<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle');
  const startYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  // Constants
  const THRESHOLD = 65;
  const RESISTANCE = 0.40;
  const REFRESH_HEIGHT = 45;

  const handleStart = (clientY: number) => {
    if (containerRef.current && containerRef.current.scrollTop === 0 && status !== 'refreshing') {
      startYRef.current = clientY;
      isDraggingRef.current = true;
      setStatus('pulling');
    }
  };

  const handleMove = (clientY: number) => {
    if (!isDraggingRef.current || startYRef.current === null || status === 'refreshing') return;

    const diffY = clientY - startYRef.current;

    if (diffY > 0) {
      // Pulling down
      const calculatedOffset = Math.min(100, diffY * RESISTANCE);
      setPullOffset(calculatedOffset);

      if (calculatedOffset >= THRESHOLD) {
        setStatus('ready');
      } else {
        setStatus('pulling');
      }
    } else {
      // Dragging up, ignore/cancel pull
      setPullOffset(0);
      setStatus('idle');
    }
  };

  const handleEnd = async () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    startYRef.current = null;

    if (status === 'ready' || pullOffset >= THRESHOLD) {
      setStatus('refreshing');
      setPullOffset(REFRESH_HEIGHT);
      try {
        await onRefresh();
      } catch (err) {
        console.warn('Pull-to-refresh action failed:', err);
      } finally {
        setStatus('idle');
        setPullOffset(0);
      }
    } else {
      setStatus('idle');
      setPullOffset(0);
    }
  };

  // Bind Raw Touch Events with explicit passive:false to stop native bouncing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStartRaw = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleStart(e.touches[0].clientY);
      }
    };

    const handleTouchMoveRaw = (e: TouchEvent) => {
      if (!isDraggingRef.current || startYRef.current === null) return;

      const clientY = e.touches[0].clientY;
      const diffY = clientY - startYRef.current;

      if (diffY > 0 && container.scrollTop === 0) {
        // Prevent browser overscroll bounce
        if (e.cancelable) {
          e.preventDefault();
        }
        handleMove(clientY);
      }
    };

    const handleTouchEndRaw = () => {
      handleEnd();
    };

    container.addEventListener('touchstart', handleTouchStartRaw, { passive: true });
    container.addEventListener('touchmove', handleTouchMoveRaw, { passive: false });
    container.addEventListener('touchend', handleTouchEndRaw, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStartRaw);
      container.removeEventListener('touchmove', handleTouchMoveRaw);
      container.removeEventListener('touchend', handleTouchEndRaw);
    };
  }, [status, pullOffset]);

  // Support Mouse Dragging Simulation for Desktop IFrame testing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      handleStart(e.clientY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleMouseLeave = () => {
    if (isDraggingRef.current) {
      handleEnd();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-y-auto h-full w-full select-none ${className}`}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {/* 1. Pull Down Pill Indicator */}
      <motion.div
        className="absolute left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
        style={{
          height: THRESHOLD,
          top: -THRESHOLD,
        }}
        animate={{
          y: pullOffset,
        }}
        transition={isDraggingRef.current ? { type: 'just' } : { type: 'spring', stiffness: 220, damping: 25 }}
      >
        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-full shadow-lg border border-gray-150 text-xs">
          {status === 'refreshing' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-primary-blue animate-spin" />
              <span className="font-extrabold text-primary-dark">Updating ledger...</span>
            </>
          ) : (
            <>
              <motion.div
                animate={{ rotate: status === 'ready' ? 180 : 0 }}
                transition={{ duration: 0.15 }}
                className="text-primary-blue"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </motion.div>
              <span className="font-bold text-text-muted">
                {status === 'ready' ? 'Release to refresh' : 'Pull down to refresh'}
              </span>
            </>
          )}
        </div>
      </motion.div>

      {/* 2. Page Content push visual translation */}
      <motion.div
        className="w-full h-full flex flex-col"
        animate={{
          y: pullOffset,
        }}
        transition={isDraggingRef.current ? { type: 'just' } : { type: 'spring', stiffness: 220, damping: 25 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
