import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, RefreshCw, ChevronRight, Building, AlertCircle } from 'lucide-react';
import { ApiService } from '../api';

interface TopupCallbackProps {
  txRef: string;
  amount: string;
  onProcessed: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function TopupCallback({ txRef, amount, onProcessed, showToast }: TopupCallbackProps) {
  const [statusState, setStatusState] = useState<'verifying' | 'success' | 'delay'>('verifying');
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [updatedBalance, setUpdatedBalance] = useState<number | null>(null);

  useEffect(() => {
    // 1. Simulate progress indicator
    const interval = setInterval(() => {
      setLoadingPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 25);

    // 2. Main 3-second verification delay
    const timer = setTimeout(async () => {
      try {
        const res = await ApiService.confirmCallback(txRef, amount);
        if (res.success) {
          try {
            const profileRes = await ApiService.getProfile();
            if (profileRes.success) {
              setUpdatedBalance(profileRes.user.wallet_balance);
            }
          } catch (profileErr) {
            console.warn('Post-funding profile synchronization failed', profileErr);
          }
          setStatusState('success');
          showToast(`Wallet credited successfully! ⚡`, 'success');
        } else {
          setStatusState('delay');
        }
      } catch (err) {
        console.warn('Callback validation failed, transitioning to fallback status', err);
        setStatusState('delay');
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [txRef, amount]);

  return (
    <div className="flex flex-col h-full w-full bg-primary-dark text-white p-6 justify-between select-none relative overflow-hidden">
      
      {/* Decorative pulse glow lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary-blue/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Margin */}
      <div className="flex items-center gap-1.5 pt-3 shrink-0 justify-center">
        <Building className="w-5 h-5 text-primary-blue" />
        <span className="text-xs font-extrabold tracking-widest text-[#8A96A3] uppercase">VTU Escrow Settlement Node</span>
      </div>

      {/* Logic Split UI status */}
      <div className="my-auto space-y-6 max-w-sm w-full mx-auto">
        
        {statusState === 'verifying' && (
          <div className="space-y-6 text-center">
            {/* Spinning verification indicator */}
            <div className="relative w-20 h-20 mx-auto bg-white/5 rounded-full border border-white/10 flex items-center justify-center">
              <RefreshCw className="w-10 h-10 text-primary-blue animate-spin" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold tracking-tight">Confirming payment...</h3>
              <p className="text-xs text-text-muted px-4 leading-normal">
                Verifying transaction reference <span className="font-mono text-white text-[11px] block select-text mt-1 bg-white/5 p-1 rounded border border-white/5">{txRef}</span> 
                with the centralized Flutterwave payment node. Wait a few moments...
              </p>
            </div>

            {/* Custom load state bar */}
            <div className="max-w-[200px] mx-auto space-y-1">
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-blue transition-all duration-75"
                  style={{ width: `${loadingPercent}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-text-muted font-mono">{loadingPercent}% synced</span>
            </div>
          </div>
        )}

        {statusState === 'success' && (
          <div className="space-y-6 text-center">
            {/* Success Animation Check */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 bg-brand-success rounded-full flex items-center justify-center mx-auto shadow-lg shadow-brand-success/20 relative"
            >
              <CheckCircle2 className="w-10 h-10 text-primary-dark" />
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-brand-success"></span>
              </span>
            </motion.div>

            <div className="space-y-2">
              <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-brand-success font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest inline-block animate-bounce">
                + Ledger Credited
              </span>
              <h3 className="text-2xl font-black text-white px-2">Payment confirmed! Your wallet has been updated. ✅</h3>
              <p className="text-xs text-text-muted max-w-[270px] mx-auto leading-relaxed">
                Payment confirmed — wallet updated.
              </p>
            </div>

            {/* Receipt metrics */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 text-left text-xs space-y-2 font-light">
              <div className="flex justify-between pb-1 border-b border-white/5">
                <span className="text-text-muted">Settlement Ref</span>
                <span className="font-bold font-mono text-[10px] truncate max-w-[140px]" title={txRef}>{txRef}</span>
              </div>
              
              {updatedBalance !== null && (
                <div className="flex justify-between py-1">
                  <span className="text-text-muted">New Balance</span>
                  <span className="font-black text-white font-mono text-xs">₦{updatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex justify-between py-1">
                <span className="text-text-muted">Gateway Cost</span>
                <span className="font-bold text-brand-success">Free ₦0.00</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                <span className="text-text-muted font-bold uppercase text-[10px] text-primary-blue">Deposit Status</span>
                <span className="font-extrabold text-brand-success font-mono text-xs uppercase">Settled</span>
              </div>
            </div>
          </div>
        )}

        {statusState === 'delay' && (
          <div className="space-y-6 text-center">
            {/* Delay/Pending caution Indicator */}
            <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 relative">
              <AlertCircle className="w-10 h-10 text-primary-dark" />
            </div>

            <div className="space-y-2">
              <span className="text-[9px] bg-brand-cashback/10 border border-brand-cashback/20 text-brand-cashback font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest inline-block">
                ⏳ Processing
              </span>
              <h3 className="text-2xl font-black text-white">Pending Confirmation...</h3>
              <p className="text-xs text-text-muted max-w-[270px] mx-auto leading-relaxed">
                Payment is being confirmed by the bank. Check back shortly. Your wallet balance will update automatically in the background.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Button footer actions */}
      <div className="space-y-3 shrink-0">
        <button
          id="callback-redirect-home"
          onClick={onProcessed}
          disabled={statusState === 'verifying'}
          className="w-full bg-primary-blue hover:bg-primary-blue/90 disabled:bg-primary-blue/40 text-white rounded-full py-4 text-sm font-bold tracking-wider shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>GO TO HOME WALLET</span>
          <ChevronRight className="w-4 h-4" />
        </button>
        <p className="text-[10px] text-white/20 text-center font-normal">
          LICENSED VTU PROVIDER ID: #FLW-HOK-721
        </p>
      </div>

    </div>
  );
}
