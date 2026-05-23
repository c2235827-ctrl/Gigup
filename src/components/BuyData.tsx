import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Signal, Smartphone, Wallet, RefreshCw, ShoppingBag, CheckCircle, Gift, Sparkles } from 'lucide-react';
import { ApiService } from '../api';
import { User, DataPlan } from '../types';

interface BuyDataProps {
  user: User;
  initialNetwork?: 'MTN' | 'GLO' | 'AIRTEL';
  onNavigate: (screen: string) => void;
  onRefreshData: () => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function BuyData({ user, initialNetwork = 'MTN', onNavigate, onRefreshData, showToast }: BuyDataProps) {
  const [activeNetwork, setActiveNetwork] = useState<'MTN' | 'GLO' | 'AIRTEL'>(initialNetwork);
  const [recipient, setRecipient] = useState('');
  const [sendToSelf, setSendToSelf] = useState(false);
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastPurchaseInfo, setLastPurchaseInfo] = useState<{ plan: DataPlan; recipient: string; cashback: number } | null>(null);

  // Auto-fill recipient number when 'Send to my number' is toggled
  useEffect(() => {
    if (sendToSelf) {
      setRecipient(user.phone);
    } else {
      setRecipient('');
    }
  }, [sendToSelf, user.phone]);

  // Load plans whenever network selector changes
  useEffect(() => {
    let active = true;
    async function fetchPlans() {
      setLoadingPlans(true);
      setSelectedPlan(null);
      try {
        const res = await ApiService.getDataPlans(activeNetwork);
        if (active && res.success) {
          setPlans(res.plans);
          // Auto select first plan as default
          if (res.plans.length > 0) {
            setSelectedPlan(res.plans[0]);
          }
        }
      } catch (err: any) {
        showToast(err.message || 'Error occurred loading plans', 'error');
      } finally {
        if (active) setLoadingPlans(false);
      }
    }

    fetchPlans();
    return () => {
      active = false;
    };
  }, [activeNetwork]);

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (rawVal.length <= 11) {
      setRecipient(rawVal);
      // Turn off sendToSelf if user manually types another digit
      if (rawVal !== user.phone) {
        setSendToSelf(false);
      }
    }
  };

  const handleBuyData = async () => {
    if (!selectedPlan) {
      showToast('Please select a data bundle plan', 'error');
      return;
    }
    if (recipient.length !== 11) {
      showToast('Recipient phone number must be 11 digits (e.g. 08012345678)', 'error');
      return;
    }

    // Check balance
    if (user.wallet_balance < selectedPlan.price) {
      showToast('Insufficient wallet balance. Redirecting to top-up.', 'info');
      onNavigate('wallet');
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiService.buyData(selectedPlan.id, recipient);
      if (res.success) {
        setLastPurchaseInfo({
          plan: selectedPlan,
          recipient,
          cashback: res.cashback
        });
        
        // Reload global layout profile data (wallet, orders, notifications)
        await onRefreshData();
        
        // Show success splash modal
        setShowSuccessModal(true);
        showToast('Data purchase completed successfully! 🎉', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Data top-up order failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessFinished = () => {
    setShowSuccessModal(false);
    setLastPurchaseInfo(null);
    setSendToSelf(false);
    setRecipient('');
    // Go to Home
    onNavigate('home');
  };

  const networkLogoColors = {
    MTN: 'bg-yellow-500 border-yellow-600',
    GLO: 'bg-green-600 border-green-700',
    AIRTEL: 'bg-red-600 border-red-700'
  };

  const hasBalance = selectedPlan ? user.wallet_balance >= selectedPlan.price : true;

  return (
    <div className="flex flex-col h-full bg-bg-light relative select-none">
      
      {/* Network Select Tabs */}
      <div className="bg-primary-dark pt-5 pb-5 px-5 text-white shrink-0">
        <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3 pl-1">Network Selector</h4>
        <div className="grid grid-cols-3 gap-2 bg-white/5 p-1 rounded-full border border-white/5">
          {(['MTN', 'GLO', 'AIRTEL'] as const).map((net) => (
            <button
              key={net}
              onClick={() => setActiveNetwork(net)}
              className={`py-2 rounded-full font-bold text-xs cursor-pointer transition-all ${
                activeNetwork === net 
                  ? 'bg-white text-primary-dark shadow font-extrabold' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {net} Bundle
            </button>
          ))}
        </div>
      </div>

      {/* Recipient Details & Plan Selector */}
      <div className="p-5 flex-grow overflow-y-auto space-y-5 pb-36">
        
        {/* Recipient Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h5 className="text-xs font-bold text-primary-dark uppercase">Recipient Numbers</h5>
            <div className="flex items-center gap-1.5 cursor-pointer">
              <input
                id="self-toggle-input"
                type="checkbox"
                checked={sendToSelf}
                onChange={(e) => setSendToSelf(e.target.checked)}
                className="w-4.5 h-4.5 text-primary-blue rounded border-gray-300 focus:ring-primary-blue accent-primary-blue cursor-pointer"
              />
              <label htmlFor="self-toggle-input" className="text-xs font-semibold text-primary-blue cursor-pointer select-none">
                Send to my number
              </label>
            </div>
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
              <Smartphone className="w-5 h-5" />
            </span>
            <input
              id="recipient-phone-input"
              type="tel"
              placeholder="08012345678"
              value={recipient}
              onChange={handleRecipientChange}
              disabled={sendToSelf}
              required
              className="w-full bg-bg-light border border-gray-200 text-primary-dark font-bold rounded-2xl pl-11 pr-4 py-3 text-base placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <p className="text-[10px] text-text-muted px-1">
            Format: Standard 11-digit mobile line index (e.g. 080 for MTN/GLO, 090/070)
          </p>
        </div>

        {/* Data Plans Header & Loader */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h5 className="text-xs font-bold text-text-dark/40 uppercase tracking-widest">Select {activeNetwork} Plan</h5>
            <span className="text-[11px] text-brand-cashback font-bold flex items-center gap-1 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" /> 10% Cash Reward on Checked Plan
            </span>
          </div>

          {loadingPlans ? (
            <div className="py-12 flex flex-col justify-center items-center text-primary-blue gap-2 bg-white rounded-3xl shadow-sm border border-gray-150">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xs font-medium">Fetching real-time plans...</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {plans.map((plan) => {
                const isSelected = selectedPlan?.id === plan.id;
                const cashbackVal = Math.round(plan.price * 0.10);
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-sm relative flex justify-between items-center ${
                      isSelected 
                        ? 'border-primary-blue ring-2 ring-primary-blue/10 bg-primary-blue/[0.01]' 
                        : 'border-gray-150 hover:border-gray-300'
                    }`}
                  >
                    {/* Selected Badge accent */}
                    {isSelected && (
                      <span className="absolute -top-1.5 -left-1.5 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-blue opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-blue"></span>
                      </span>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-primary-dark">{plan.size_label}</span>
                        <span className="text-[9px] bg-brand-cashback/15 text-brand-cashback font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          🎁 ₦{cashbackVal} cashback
                        </span>
                      </div>
                      <h6 className="text-[11px] font-bold text-text-muted">{plan.plan_name} • {plan.validity}</h6>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-primary-blue font-mono">
                        ₦{plan.price.toLocaleString('en-US')}
                      </span>
                      <span className="text-[9px] text-text-muted block">Duration: {plan.validity}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Summary Checkouts */}
      <div className="absolute bottom-16 inset-x-0 bg-white border-t border-gray-150 px-5 py-4 shadow-2xl flex flex-col gap-3 shrink-0 z-30">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5 text-text-muted">
            <Wallet className="w-4 h-4 text-primary-blue" />
            <span>My Wallet Balance: <span className="font-bold text-primary-dark font-mono">₦{user.wallet_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></span>
          </div>
          {selectedPlan && (
            <span className="text-text-muted font-medium">
              Vat inclusion: <span className="font-bold text-emerald-600">Free ₦0.00</span>
            </span>
          )}
        </div>

        {selectedPlan ? (
          <button
            id="order-buy-now-btn"
            onClick={handleBuyData}
            disabled={submitting || recipient.length !== 11}
            className={`w-full py-4 text-sm font-semibold rounded-full shadow-lg active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer ${
              hasBalance 
                ? 'bg-primary-blue text-white shadow-primary-blue/10 disabled:bg-primary-blue/60' 
                : 'bg-brand-cashback text-primary-dark font-extrabold shadow-brand-cashback/10'
            }`}
          >
            {submitting ? (
              <>
                <div className="spinner !w-5 !h-5 border-white/20 !border-left-white" />
                <span>Injecting secure VTU packets...</span>
              </>
            ) : hasBalance ? (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>Buy Now — ₦{selectedPlan.price.toLocaleString('en-US')}</span>
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                <span>Load Wallet (Needed: ₦{(selectedPlan.price - user.wallet_balance).toLocaleString('en-US')})</span>
              </>
            )}
          </button>
        ) : (
          <button
            disabled
            className="w-full bg-gray-100 text-gray-400 py-4 text-xs font-semibold rounded-full cursor-not-allowed select-none text-center"
          >
            Please choose a data plan bundle to checkout
          </button>
        )}
      </div>

      {/* Success Modal Overlay Sheet */}
      {showSuccessModal && lastPurchaseInfo && (
        <div className="absolute inset-0 bg-primary-dark/95 backdrop-blur-sm z-50 flex items-center justify-center p-6 text-white text-center">
          <div className="bg-white text-primary-dark rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-6 relative overflow-hidden">
            {/* Background cash flow sparkles */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-brand-cashback/10 rounded-full blur-xl pointer-events-none"></div>

            <div className="space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-10 h-10 text-emerald-500 fill-emerald-50/10" />
              </div>

              <div>
                <span className="text-[10px] bg-amber-100 text-[#F59E0B] font-bold px-2.5 py-1 rounded-full border border-amber-200 inline-block uppercase animate-pulse">
                  🎁 Cashback Earned: +₦{lastPurchaseInfo.cashback}
                </span>
                <h4 className="text-xl font-extrabold tracking-tight text-primary-dark mt-2">Data Purchase Sent!</h4>
                <p className="text-xs text-text-muted mt-1.5 px-3">
                  {lastPurchaseInfo.plan.size_label} bundle sent to <span className="font-bold text-primary-dark">{lastPurchaseInfo.recipient}</span>.
                </p>
              </div>
            </div>

            {/* Receipt Summary details */}
            <div className="bg-bg-light rounded-2xl p-4 border border-gray-100 text-left text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-text-muted">Mobile Network</span>
                <span className="font-bold text-primary-dark">{lastPurchaseInfo.plan.network} VTU Network</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Plan Bundle</span>
                <span className="font-bold text-primary-dark">{lastPurchaseInfo.plan.plan_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Debit Charge</span>
                <span className="font-bold text-primary-dark font-mono">₦{lastPurchaseInfo.plan.price.toLocaleString('en-US')}</span>
              </div>
              <div className="border-t border-dashed border-gray-200 my-1"></div>
              <div className="flex justify-between">
                <span className="text-text-muted font-medium">Earned Cashback (10%)</span>
                <span className="font-extrabold text-[#F59E0B] font-mono">+₦{lastPurchaseInfo.cashback.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Updated Wallet Balance</span>
                <span className="font-bold text-primary-dark font-mono">₦{user.wallet_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Updated Cashback Balance</span>
                <span className="font-bold text-[#F59E0B] font-mono">₦{(user.cashback_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button
              id="confirm-success-modal-btn"
              onClick={handleSuccessFinished}
              className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white rounded-full py-4 text-xs font-bold shadow-md cursor-pointer select-none text-center"
            >
              Done — Check Wallet Balance ⚡
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
