import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, RefreshCw, ChevronRight, Building, AlertCircle } from 'lucide-react';
import { ApiService } from '../api';
import { playSuccessSound, playFailureSound } from '../utils/audio';

interface TopupCallbackProps {
  txRef: string;
  amount: string;
  onProcessed: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function TopupCallback({ txRef, amount, onProcessed, showToast }: TopupCallbackProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'pending'>('loading');
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<number>(0);

  // Retrieve baseline balance (pre-topup balance)
  const getPreTopupBalance = (): number => {
    const saved = localStorage.getItem('gigup_pre_topup_balance');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) return parsed;
    }
    const cached = ApiService.getCachedUser();
    return cached ? cached.wallet_balance : 0;
  };

  const checkDepositStatus = async (isManual = false) => {
    if (isManual) {
      setStatus('loading');
      showToast('Re-verifying with payment network...', 'info');
    }

    try {
      const profile = await ApiService.getProfile();
      const baseline = getPreTopupBalance();

      // If wallet balance is higher than our baseline, the payment was credited!
      if (profile.wallet_balance > baseline) {
        setNewBalance(profile.wallet_balance);
        setStatus('success');
        localStorage.removeItem('gigup_pre_topup_balance');
        playSuccessSound();
        showToast('Wallet funded successfully! ⚡', 'success');
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Profile refresh check encountered an error:', err);
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let pollTimeout: NodeJS.Timeout | null = null;
    let currentAttempt = 0;
    const maxPolls = 12; // Check 12 times (36 seconds)

    const poll = async () => {
      if (!isMounted) return;
      const success = await checkDepositStatus();
      if (success) return;

      if (isMounted && currentAttempt < maxPolls) {
        currentAttempt++;
        setAttempts(currentAttempt);
        pollTimeout = setTimeout(poll, 3000);
      } else if (isMounted) {
        setStatus('pending');
        playFailureSound();
      }
    };

    // First initial delay of 3 seconds for standard bank/card settlement webhook delivery
    pollTimeout = setTimeout(poll, 3000);

    return () => {
      isMounted = false;
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, []);

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
        
        {status === 'loading' && (
          <div className="space-y-6 text-center">
            {/* Spinning verification indicator */}
            <div className="relative w-20 h-20 mx-auto bg-white/5 rounded-full border border-white/10 flex items-center justify-center">
              <RefreshCw className="w-10 h-10 text-primary-blue animate-spin" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold tracking-tight">Confirming your payment...</h3>
              <p className="text-xs text-text-muted px-4 leading-normal">
                Verifying transaction reference <span className="font-mono text-white text-[11px] block select-text mt-1 bg-white/5 p-1 rounded border border-white/5">{txRef}</span> 
                with the centralized Flutterwave payment node. Wait a few moments...
              </p>
            </div>
          </div>
        )}

        {status === 'success' && (
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
              <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-brand-success font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest inline-block">
                + Ledger Credited
              </span>
              <h3 className="text-2xl font-black text-white px-2">✅ Wallet funded! New balance: {newBalance !== null ? `₦${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '₦---'}</h3>
              <p className="text-xs text-text-muted max-w-[270px] mx-auto leading-relaxed">
                Payment confirmed — wallet updated successfully.
              </p>
            </div>

            {/* Receipt metrics */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 text-left text-xs space-y-2 font-light">
              <div className="flex justify-between pb-1 border-b border-white/5">
                <span className="text-text-muted">Settlement Ref</span>
                <span className="font-bold font-mono text-[10px] truncate max-w-[140px]" title={txRef}>{txRef}</span>
              </div>
              
              {newBalance !== null && (
                <div className="flex justify-between py-1">
                  <span className="text-text-muted">New Balance</span>
                  <span className="font-black text-white font-mono text-xs">₦{newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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

        {status === 'pending' && (
          <div className="space-y-6 text-center animate-fade-in">
            {/* Delay/Pending caution Indicator */}
            <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 relative animate-pulse">
              <AlertCircle className="w-10 h-10 text-primary-dark" />
            </div>

            <div className="space-y-2">
              <span className="text-[9px] bg-brand-cashback/10 border border-brand-cashback/20 text-brand-cashback font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest inline-block mb-1">
                ⏳ Processing
              </span>
              <h3 className="text-xl font-extrabold text-white leading-tight">Confirmation is taking a moment...</h3>
              <p className="text-xs text-[#8A96A3] max-w-[280px] mx-auto leading-relaxed">
                Your bank is taking slightly longer than usual to settle this transaction on the ledger. Don't worry! Your money is safe. You can check again manually or return to home.
              </p>
            </div>

            <button
              onClick={async () => {
                const updated = await checkDepositStatus(true);
                if (!updated) {
                  setStatus('pending');
                  showToast('Deposit is still pending. Try again in a few seconds or contact support.', 'info');
                }
              }}
              className="bg-white/10 hover:bg-white/15 text-white text-xs font-bold py-2.5 px-5 rounded-full border border-white/10 transition-all flex items-center justify-center gap-1.5 mx-auto active:scale-95 cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Verify Settlement Now</span>
            </button>
          </div>
        )}

      </div>

      {/* Button footer actions */}
      <div className="space-y-3 shrink-0">
        <button
          id="callback-redirect-home"
          onClick={onProcessed}
          disabled={status === 'loading'}
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
