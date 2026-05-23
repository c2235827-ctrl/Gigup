import React, { useState } from 'react';
import { Wallet as WalletIcon, PlusCircle, History, ArrowDownLeft, ArrowUpRight, CheckCircle, Smartphone, SlidersHorizontal, Sparkles } from 'lucide-react';
import { ApiService } from '../api';
import { User, WalletTransaction } from '../types';

interface WalletProps {
  user: User;
  transactions: WalletTransaction[];
  onNavigate: (screen: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function Wallet({ user, transactions, onNavigate, showToast }: WalletProps) {
  const [activeSubTab, setActiveSubTab] = useState<'topup' | 'history'>('topup');
  const [amount, setAmount] = useState<string>('2000');
  const [loadingTopup, setLoadingTopup] = useState(false);

  // Quick select chip buttons
  const quickChips = [2000, 3000, 5000, 10000];

  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    setAmount(rawVal);
  };

  const handleTopup = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 2000) {
      showToast('Minimum wallet top-up is ₦2,000', 'error');
      return;
    }

    setLoadingTopup(true);
    try {
      const res = await ApiService.initiateTopup(parsedAmount);
      if (res.success && res.payment_link) {
        showToast('Top-Up initiated. Redirecting to payment portal...', 'success');
        // Redirect user to payment_link in same tab
        setTimeout(() => {
          window.location.href = res.payment_link;
        }, 800);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to initiate Top-Up', 'error');
    } finally {
      setLoadingTopup(false);
    }
  };

  const formatTxDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full bg-bg-light overflow-y-auto select-none pb-24">
      {/* Navy Header Panel */}
      <div className="bg-primary-dark pt-5 pb-7 px-5 text-white shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-blue/10 rounded-full blur-xl pointer-events-none"></div>

        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-bold text-white/50 uppercase tracking-widest pl-1">My Wallet Dashboard</h4>
          <span className="text-[10px] bg-brand-cashback/10 text-brand-cashback border border-brand-cashback/10 font-bold px-2 py-0.5 rounded-full uppercase">
            Secured Deposit
          </span>
        </div>

        {/* Central Wallet Balance details */}
        <div className="text-center py-2 space-y-1">
          <span className="text-xs text-white/50 inline-block">Active Wallet Balance</span>
          <h3 className="text-3xl font-extrabold tracking-tight text-white font-mono leading-none">
            ₦{user.wallet_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-brand-success font-medium pt-1">
            ✓ Connected securely to Flutterwave Node IP
          </p>
        </div>

        {/* Sub-Tabs: Top Up / Transaction History */}
        <div className="grid grid-cols-2 gap-2 mt-5 bg-white/5 p-1 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveSubTab('topup')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeSubTab === 'topup'
                ? 'bg-white text-primary-dark shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" /> Fund Wallet
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeSubTab === 'history'
                ? 'bg-white text-primary-dark shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" /> Transactions
          </button>
        </div>
      </div>

      {/* Main Body Containers depend on active tabs */}
      <div className="p-5 flex-grow">
        {activeSubTab === 'topup' ? (
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-5">
            <div className="space-y-1.5 px-1">
              <h5 className="text-xs font-bold text-primary-dark uppercase">Fund Ledger Balance</h5>
              <p className="text-[11px] text-text-muted leading-tight">
                Deposit minimum ₦2,000 using Nigerian Debit Cards, USSD strings, or Bank Transfers.
              </p>
            </div>

            {/* Input Box Amount */}
            <div className="space-y-2">
              <label id="amt-label" className="text-[11px] font-bold text-text-muted uppercase tracking-wider block px-1">
                Amount to Deposit (₦)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-primary-blue font-extrabold text-base">
                  ₦
                </span>
                <input
                  id="topup-amount-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="2,000"
                  value={amount}
                  onChange={handleAmountInput}
                  className="w-full bg-bg-light border border-gray-200 text-primary-dark font-mono font-extrabold rounded-2xl pl-9 pr-4 py-3.5 text-lg placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all"
                />
              </div>
              {amount !== '' && parseFloat(amount) < 2000 && (
                <p className="text-[10px] text-brand-danger font-semibold px-1">
                  ⚠️ Minimum wallet funding amount is ₦2,000
                </p>
              )}
            </div>

            {/* Quick Amount Chips */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block px-1">
                Quick Deposits Preset
              </span>
              <div className="grid grid-cols-4 gap-2">
                {quickChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setAmount(chip.toString())}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      amount === chip.toString()
                        ? 'bg-primary-blue text-white border-primary-blue shadow-sm'
                        : 'bg-white hover:bg-bg-light text-primary-dark border-gray-200'
                    }`}
                  >
                    ₦{chip.toLocaleString('en-US')}
                  </button>
                ))}
              </div>
            </div>

            {/* Safety parameters label banner */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 flex items-start gap-2.5 text-emerald-800 text-xs">
              <CheckCircle className="w-5 h-5 text-brand-success shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Protected by Flutterwave API</span>
                <p className="text-[10px] text-emerald-700 leading-snug">
                  Zero commission charges on wallet deposits. Instant processing within 15 seconds.
                </p>
              </div>
            </div>

            <button
              id="wallet-top-up-submit"
              onClick={handleTopup}
              disabled={loadingTopup || amount === '' || parseFloat(amount) < 2000}
              className="w-full bg-primary-blue hover:bg-primary-blue/90 disabled:bg-primary-blue/40 text-white rounded-full py-4 text-xs font-bold tracking-wider shadow-lg shadow-primary-blue/15 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loadingTopup ? (
                <>
                  <div className="spinner !w-5 !h-5 border-white/20 !border-left-white" />
                  <span>Contacting Secure Gateway...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-white" />
                  <span>TOP UP WALLET NOW</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h5 className="text-xs font-bold text-text-dark/40 uppercase tracking-widest">Transaction History</h5>
              <span className="text-[10px] text-text-muted font-bold">
                {transactions.length} items logged
              </span>
            </div>

            {transactions.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 flex flex-col items-center justify-center min-h-[180px] shadow-sm">
                <span className="text-3xl mb-2">📥</span>
                <h6 className="text-xs font-bold text-primary-dark uppercase">Clear Ledger Statement</h6>
                <p className="text-[10px] text-text-muted max-w-[200px] mt-1.5 leading-relaxed">
                  No billing changes received yet. Complete your first deposit to get your 10% cashback voucher reward!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {transactions.map((tx) => {
                  const isCredit = tx.type === 'credit';
                  return (
                    <div 
                      key={tx.id} 
                      className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                          isCredit 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-red-50 text-red-500 border-red-100'
                        }`}>
                          {isCredit ? (
                            <ArrowDownLeft className="w-4.5 h-4.5" />
                          ) : (
                            <ArrowUpRight className="w-4.5 h-4.5" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-primary-dark block leading-tight">
                            {tx.description}
                          </span>
                          <span className="text-[9px] text-text-muted block mt-0.5">
                            {formatTxDate(tx.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-1">
                        <span className={`text-xs font-extrabold font-mono block ${
                          isCredit ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          {isCredit ? '+' : '-'}₦{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[8px] uppercase tracking-wider bg-bg-light text-primary-dark px-1.5 py-0.5 rounded-full border border-gray-100 mt-1 inline-block">
                          Settled
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
