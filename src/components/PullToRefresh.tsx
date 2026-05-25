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

  // Mirror variables with React Refs so Touch Event Handlers bound once can safely read accurate instant values
  const statusRef = useRef(status);
  statusRef.current = status;

  const pullOffsetRef = useRef(pullOffset);
  pullOffsetRef.current = pullOffset;

  const handleStart = (clientY: number) => {
    // Check if scrolled perfectly to the top (with a 1.5px sub-pixel tolerance for modern retina/high-DPI screens)
    if (containerRef.current && containerRef.current.scrollTop <= 2 && statusRef.current !== 'refreshing') {
      startYRef.current = clientY;
      isDraggingRef.current = true;
      setStatus('pulling');
    }
  };

  const handleMove = (clientY: number) => {
    if (!isDraggingRef.current || startYRef.current === null || statusRef.current === 'refreshing') return;

    const diffY = clientY - startYRef.current;

    if (diffY > 0) {
      // Pulling down gesture
      const calculatedOffset = Math.min(100, diffY * RESISTANCE);
      setPullOffset(calculatedOffset);

      if (calculatedOffset >= THRESHOLD) {
        setStatus('ready');
      } else {
        setStatus('pulling');
      }
    } else {
      // Dragged up past start, ignore/cancel
      setPullOffset(0);
      setStatus('idle');
    }
  };

  const handleEnd = async () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    startYRef.current = null;

    if (statusRef.current === 'ready' || pullOffsetRef.current >= THRESHOLD) {
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

  // Cache latest functions to protect event handler closures from stale state
  const handleStartRef = useRef(handleStart);
  const handleMoveRef = useRef(handleMove);
  const handleEndRef = useRef(handleEnd);

  handleStartRef.current = handleStart;
  handleMoveRef.current = handleMove;
  handleEndRef.current = handleEnd;

  // Bind Raw Touch Events ONCE to protect natural gesture lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStartRaw = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleStartRef.current(e.touches[0].clientY);
      }
    };

    const handleTouchMoveRaw = (e: TouchEvent) => {
      if (!isDraggingRef.current || startYRef.current === null) return;

      const clientY = e.touches[0].clientY;
      const diffY = clientY - startYRef.current;

      // Ensure we are pulling down from the absolute top of layout
      if (diffY > 0 && container.scrollTop <= 2) {
        // Prevent default native browser rubber-banding/bouncing
        if (e.cancelable) {
          e.preventDefault();
        }
        handleMoveRef.current(clientY);
      }
    };

    const handleTouchEndRaw = () => {
      handleEndRef.current();
    };

    // Use passive: false explicitly to guarantee e.preventDefault() behaves on Safari
    container.addEventListener('touchstart', handleTouchStartRaw, { passive: true });
    container.addEventListener('touchmove', handleTouchMoveRaw, { passive: false });
    container.addEventListener('touchend', handleTouchEndRaw, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStartRaw);
      container.removeEventListener('touchmove', handleTouchMoveRaw);
      container.removeEventListener('touchend', handleTouchEndRaw);
    };
  }, []); // Run precisely once. Handlers leverage stable mutable refs.

  // Enable desktop browser mouse pulling fallback
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
      {/* 1. Pull down panel pill */}
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
        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-full shadow-lg border border-gray-150 text-xs text-primary-dark">
          {status === 'refreshing' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-primary-blue animate-spin" />
              <span className="font-extrabold">Refreshing...</span>
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
              <span className="font-bold">
                {status === 'ready' ? 'Release to refresh' : 'Pull down to refresh'}
              </span>
            </>
          )}
        </div>
      </motion.div>

      {/* 2. Visual card offset slider */}
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
