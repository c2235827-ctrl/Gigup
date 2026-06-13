import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Signal, Smartphone, Wallet, RefreshCw, ShoppingBag, CheckCircle, Gift, Sparkles, X, AlertCircle } from 'lucide-react';
import { ApiService } from '../api';
import { User, DataPlan } from '../types';
import { playSuccessSound, playFailureSound } from '../utils/audio';
import { updateOneSignalTag } from '../onesignal';

interface BuyDataProps {
  user: User;
  initialNetwork?: 'MTN' | 'GLO' | 'AIRTEL';
  onNavigate: (screen: string, extras?: any) => void;
  onRefreshData: () => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

function detectNetwork(phoneNumber: string): 'MTN' | 'GLO' | 'AIRTEL' | null {
  if (!phoneNumber) return null;
  let digits = phoneNumber.replace(/\D/g, '');
  if (digits.startsWith('234')) {
    digits = '0' + digits.slice(3);
  }
  if (digits.length < 4) return null;
  const prefix = digits.slice(0, 4);

  const mtnPrefixes = [
    '0803', '0806', '0810', '0813', '0814', '0816', '0703', '0706', '0903', '0906', '0913', '0916', '0702', '0704'
  ];
  const gloPrefixes = [
    '0805', '0807', '0811', '0815', '0705', '0905', '0915'
  ];
  const airtelPrefixes = [
    '0802', '0808', '0812', '0701', '0708', '0902', '0907', '0901', '0904', '0912'
  ];

  if (mtnPrefixes.includes(prefix)) return 'MTN';
  if (gloPrefixes.includes(prefix)) return 'GLO';
  if (airtelPrefixes.includes(prefix)) return 'AIRTEL';

  return null;
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
  const [lastPurchaseInfo, setLastPurchaseInfo] = useState<{ plan: DataPlan; recipient: string; cashback: number; orderId: string; receiptId: string; date: string } | null>(null);

  // Failure Modal State
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [lastFailureInfo, setLastFailureInfo] = useState<{ plan: DataPlan; recipient: string; reason: string; orderId: string; receiptId: string; date: string } | null>(null);

  // Auto-detect mobile network from recipient number
  useEffect(() => {
    const detected = detectNetwork(recipient);
    if (detected && detected !== activeNetwork) {
      setActiveNetwork(detected);
    }
  }, [recipient, activeNetwork]);

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
        const plans = await ApiService.getDataPlans(activeNetwork);
        if (active && plans) {
          setPlans(plans);
          // Auto select first plan as default
          if (plans.length > 0) {
            setSelectedPlan(plans[0]);
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
    const totalAvailable = user.wallet_balance + (user.bonus_balance ?? 0);
    if (totalAvailable < selectedPlan.price) {
      playFailureSound();
      const generatedOrderId = 'DA' + Math.random().toString(16).substring(2, 10).toUpperCase();
      const generatedReceiptId = 'REC' + Math.random().toString(16).substring(2, 10).toUpperCase();
      
      showToast('Transaction failed: Insufficient wallet balance', 'error');
      
      onNavigate('receipt', {
        status: 'failed',
        network: selectedPlan.network,
        plan_name: selectedPlan.plan_name || selectedPlan.size_label,
        recipient_phone: recipient,
        amount: selectedPlan.price,
        id: generatedOrderId,
        receiptId: generatedReceiptId,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        reason: 'Insufficient balance. Please fund your wallet with ₦' + (selectedPlan.price - totalAvailable).toLocaleString('en-US') + ' more to complete this purchase.'
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiService.buyData(selectedPlan.id, recipient);
      if (res.success) {
        const generatedOrderId = (res as any).order_id || (res as any).id || 'DA' + Math.random().toString(16).substring(2, 10).toUpperCase();
        const generatedReceiptId = (res as any).receipt_id || 'REC' + Math.random().toString(16).substring(2, 10).toUpperCase();
        
        // Reload global layout profile data (wallet, orders, notifications)
        await onRefreshData();

        // OneSignal tags synchronization
        updateOneSignalTag('last_purchase', new Date().toISOString());
        updateOneSignalTag('total_orders', String(((user as any).total_orders || 0) + 1));

        playSuccessSound();
        const bonusUsed = res.bonus_used || 0;
        const msg = bonusUsed > 0 
          ? `Data purchase completed successfully! 🎉\n🎁 ₦${bonusUsed} welcome bonus used`
          : 'Data purchase completed successfully! 🎉';
        showToast(msg, 'success');

        onNavigate('receipt', {
          status: 'success',
          network: selectedPlan.network,
          plan_name: selectedPlan.plan_name || selectedPlan.size_label,
          recipient_phone: recipient,
          amount: selectedPlan.price,
          id: generatedOrderId,
          receiptId: generatedReceiptId,
          date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          cashback: res.cashback_earned || 0,
          bonus_used: res.bonus_used || 0
        });

        setSendToSelf(false);
        setRecipient('');
      } else {
        throw new Error(res.message || 'Transaction was rejected or declined by the payment/VTU gateway.');
      }
    } catch (err: any) {
      playFailureSound();
      const errData = err.data || {};
      const generatedOrderId = errData.order_id || errData.id || 'DA' + Math.random().toString(16).substring(2, 10).toUpperCase();
      const generatedReceiptId = errData.receipt_id || 'REC' + Math.random().toString(16).substring(2, 10).toUpperCase();
      
      showToast(err.message || 'Data top-up order failed', 'error');

      onNavigate('receipt', {
        status: 'failed',
        network: selectedPlan.network,
        plan_name: selectedPlan.plan_name || selectedPlan.size_label,
        recipient_phone: recipient,
        amount: selectedPlan.price,
        id: generatedOrderId,
        receiptId: generatedReceiptId,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        reason: err.message || 'Transaction was rejected or declined by the payment/VTU gateway.'
      });
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

  const handleFailureFinished = () => {
    setShowFailureModal(false);
    setLastFailureInfo(null);
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

  const hasBalance = selectedPlan ? (user.wallet_balance + (user.bonus_balance ?? 0)) >= selectedPlan.price : true;

  const showWelcomeVoucher = (user.bonus_balance && user.bonus_balance > 0) || (user.welcome_voucher_activated_at && !user.welcome_voucher_expired);

  return (
    <div className="flex flex-col h-full bg-bg-light relative select-none">
      
      {showWelcomeVoucher && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 px-5 py-4 border-b border-amber-200 text-amber-900 shadow-sm shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-sm mb-0.5">🎟️ Welcome Voucher Active</p>
              <p className="text-[10px] text-amber-700 font-medium">Enjoy up to ₦{(user.bonus_balance || 0).toLocaleString()} discount on data purchases.</p>
            </div>
            <div className="bg-amber-400 text-white font-black text-xs px-2 py-1 rounded-lg shadow-sm">
              60% OFF
            </div>
          </div>
        </div>
      )}

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
      <div className="p-5 flex-grow overflow-y-auto space-y-5 pb-[140px]">
        
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

          <div className="relative flex items-center">
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
              className="w-full bg-bg-light border border-gray-200 text-primary-dark font-bold rounded-2xl pl-11 pr-28 py-3 text-base placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
            />
            {recipient.length >= 4 && (
              <div className="absolute right-3 flex items-center pointer-events-none">
                {detectNetwork(recipient) ? (
                  <span className={`text-[9px] font-extrabold px-2 py-1 rounded-full text-white uppercase tracking-wider shadow-inner ${
                    detectNetwork(recipient) === 'MTN' ? 'bg-yellow-500 text-primary-dark' :
                    detectNetwork(recipient) === 'GLO' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  }`}>
                    ⚡ {detectNetwork(recipient)}
                  </span>
                ) : (
                  <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-400 uppercase tracking-wider">
                    Unknown
                  </span>
                )}
              </div>
            )}
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
              <Sparkles className="w-3.5 h-3.5" /> {user.double_cashback_active ? '20%' : '10%'} Cash Reward on Checked Plan
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
                const cashbackMultiplier = user.double_cashback_active ? 0.20 : 0.10;
                const cashbackVal = Math.round(plan.price * cashbackMultiplier);
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
                        ₦{(plan.price || 0).toLocaleString('en-US')}
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
      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-gray-150 px-5 py-4 shadow-2xl flex items-center justify-between gap-3 z-30">
        {/* Left: wallet icon + Balance: ₦X,XXX.XX */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Wallet className="w-5 h-5 text-primary-blue shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{(user.bonus_balance ?? 0) > 0 ? 'Total Available' : 'Balance'}</span>
            <span className="font-extrabold text-primary-dark font-mono text-sm leading-tight text-left">₦{(user.wallet_balance + (user.bonus_balance ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Right: button */}
        {selectedPlan ? (
          <button
            id="order-buy-now-btn"
            onClick={handleBuyData}
            disabled={submitting || recipient.length !== 11}
            className={`px-5 py-3 text-xs font-bold rounded-full shadow-lg active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap min-w-0 ${
              hasBalance 
                ? 'bg-primary-blue text-white shadow-primary-blue/10 disabled:bg-primary-blue/60' 
                : 'bg-brand-cashback text-primary-dark font-extrabold shadow-brand-cashback/10'
            }`}
          >
            {submitting ? (
              <>
                <div className="progress-spinner !w-3.5 !h-3.5 border-white/20 !border-left-white animate-spin rounded-full border-2" />
                <span>Buying...</span>
              </>
            ) : hasBalance ? (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span className="truncate">Buy Now — ₦{(selectedPlan?.price || 0).toLocaleString('en-US')}</span>
              </>
            ) : (
              <>
                <Wallet className="w-3.5 h-3.5" />
                <span className="truncate">Load Wallet</span>
              </>
            )}
          </button>
        ) : (
          <button
            disabled
            className="px-5 py-3 bg-gray-100 text-gray-400 text-xs font-semibold rounded-full cursor-not-allowed select-none text-center whitespace-nowrap"
          >
            Select a Plan
          </button>
        )}
      </div>

    </div>
  );
}
