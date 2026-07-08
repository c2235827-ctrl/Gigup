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

// Static Helper Functions for Provider-Separated Plan Display
function cleanPlanName(name: string): string {
  if (!name) return '';
  return name
    .replace(/smedata/gi, '')
    .replace(/peyflex/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDaily(validity: string): boolean {
  const v = (validity || '').trim().toLowerCase();
  return ['1 day', '2 days', '3 days'].includes(v);
}

function isWeekly(validity: string): boolean {
  const v = (validity || '').trim().toLowerCase();
  return ['7 days', '14 days', '14 days (night)'].includes(v);
}

function isMonthly(validity: string): boolean {
  const v = (validity || '').trim().toLowerCase();
  return v === '30 days';
}

function isExclusive(validity: string): boolean {
  const v = (validity || '').trim().toLowerCase();
  return ['2 months', '1 year'].includes(v);
}

function checkIsNightOnly(plan: DataPlan): boolean {
  const name = (plan.plan_name || '').toUpperCase();
  const val = (plan.validity || '').toUpperCase();
  return name.includes('NIGHT ONLY') || name.includes('NIGHT PLAN') || val.includes('(NIGHT)');
}

function parseSizeInGB(sizeLabel: string): number {
  const clean = (sizeLabel || '').toUpperCase().trim();
  const numMatch = clean.match(/^([\d.]+)\s*(GB|MB|TB)/);
  if (!numMatch) {
    const num = parseFloat(clean);
    if (!isNaN(num)) return num;
    return 1;
  }
  const value = parseFloat(numMatch[1]);
  const unit = numMatch[2];
  if (unit === 'MB') {
    return value / 1024;
  }
  if (unit === 'TB') {
    return value * 1024;
  }
  return value; // GB
}

export default function BuyData({ user, initialNetwork = 'MTN', onNavigate, onRefreshData, showToast }: BuyDataProps) {
  const [activeNetwork, setActiveNetwork] = useState<'MTN' | 'GLO' | 'AIRTEL'>(initialNetwork);
  const [recipient, setRecipient] = useState('');
  const [sendToSelf, setSendToSelf] = useState(false);
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Category Tab State (Hot is the default tab)
  const [activeTab, setActiveTab] = useState<'hot' | 'daily' | 'weekly' | 'monthly' | 'exclusive'>('hot');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastPurchaseInfo, setLastPurchaseInfo] = useState<{ plan: DataPlan; recipient: string; cashback: number; orderId: string; receiptId: string; date: string } | null>(null);

  // Failure Modal State
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [lastFailureInfo, setLastFailureInfo] = useState<{ plan: DataPlan; recipient: string; reason: string; orderId: string; receiptId: string; date: string } | null>(null);

  // Find best value plan (lowest price-per-GB) among all active plans for current network
  const bestValuePlanId = React.useMemo(() => {
    if (plans.length === 0) return null;
    
    let bestId: string | null = null;
    let minPricePerGB = Infinity;
    
    plans.forEach((plan) => {
      const sizeGB = parseSizeInGB(plan.size_label || plan.plan_name);
      if (sizeGB > 0) {
        const pricePerGB = plan.price / sizeGB;
        if (pricePerGB < minPricePerGB) {
          minPricePerGB = pricePerGB;
          bestId = plan.id;
        }
      }
    });
    
    return bestId;
  }, [plans]);

  // Derive available tabs based on current plans
  const availableTabs = React.useMemo(() => {
    if (plans.length === 0) return ['hot'];
    
    const tabs: ('hot' | 'daily' | 'weekly' | 'monthly' | 'exclusive')[] = ['hot'];
    
    if (plans.some(p => isDaily(p.validity))) tabs.push('daily');
    if (plans.some(p => isWeekly(p.validity))) tabs.push('weekly');
    if (plans.some(p => isMonthly(p.validity))) tabs.push('monthly');
    if (plans.some(p => isExclusive(p.validity))) tabs.push('exclusive');
    
    return tabs;
  }, [plans]);

  // Auto-switch to first available tab if activeTab is not available
  useEffect(() => {
    if (plans.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] ?? 'hot');
    }
  }, [plans, availableTabs, activeTab]);

  // Derive filtered and sorted plans based on activeTab
  const filteredPlans = React.useMemo(() => {
    if (plans.length === 0) return [];

    if (activeTab === 'hot') {
      // 1. Calculate price threshold for cheapest 30%
      const sortedByPrice = [...plans].sort((a, b) => a.price - b.price);
      const priceThresholdIndex = Math.max(0, Math.floor(sortedByPrice.length * 0.3) - 1);
      const priceThreshold = sortedByPrice[priceThresholdIndex]?.price || Infinity;

      // 2. Calculate price-per-GB threshold for cheapest 30%
      const plansWithPricePerGB = plans.map(p => {
        const sizeGB = parseSizeInGB(p.size_label || p.plan_name);
        const pricePerGB = sizeGB > 0 ? p.price / sizeGB : Infinity;
        return { plan: p, pricePerGB };
      });
      const sortedByPricePerGB = [...plansWithPricePerGB].sort((a, b) => a.pricePerGB - b.pricePerGB);
      const pricePerGBThresholdIndex = Math.max(0, Math.floor(sortedByPricePerGB.length * 0.3) - 1);
      const pricePerGBThreshold = sortedByPricePerGB[pricePerGBThresholdIndex]?.pricePerGB || Infinity;

      const hotPlans = plans.filter(p => {
        // Condition 1: cheapest 30% by absolute price
        if (p.price <= priceThreshold) return true;

        // Condition 2: price-per-GB is in cheapest 30%
        const sizeGB = parseSizeInGB(p.size_label || p.plan_name);
        const pricePerGB = sizeGB > 0 ? p.price / sizeGB : Infinity;
        if (pricePerGB <= pricePerGBThreshold) return true;

        // Condition 3: NIGHT ONLY plan under ₦2,000
        const isNight = checkIsNightOnly(p);
        if (isNight && p.price < 2000) return true;

        // Condition 4: short-validity (1-3 days) plan under ₦1,000
        const isShortVal = isDaily(p.validity);
        if (isShortVal && p.price < 1000) return true;

        return false;
      });

      // Sort Hot tab by price ascending
      return [...hotPlans].sort((a, b) => a.price - b.price);
    } else if (activeTab === 'daily') {
      return plans.filter(p => isDaily(p.validity)).sort((a, b) => a.price - b.price);
    } else if (activeTab === 'weekly') {
      return plans.filter(p => isWeekly(p.validity)).sort((a, b) => a.price - b.price);
    } else if (activeTab === 'monthly') {
      return plans.filter(p => isMonthly(p.validity)).sort((a, b) => a.price - b.price);
    } else if (activeTab === 'exclusive') {
      return plans.filter(p => isExclusive(p.validity)).sort((a, b) => a.price - b.price);
    }
    return [];
  }, [plans, activeTab]);

  // Auto-select the first filtered plan whenever current network or filter options change
  useEffect(() => {
    if (filteredPlans.length > 0) {
      const stillVisible = filteredPlans.some(p => p.id === selectedPlan?.id);
      if (!stillVisible) {
        setSelectedPlan(filteredPlans[0]);
      }
    } else {
      setSelectedPlan(null);
    }
  }, [filteredPlans, selectedPlan]);

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
      const errMsg = err.message || '';
      if (
        errMsg.toLowerCase().includes('currently unavailable') || 
        errMsg.toLowerCase().includes('disabled') || 
        errMsg.toLowerCase().includes('unavailable')
      ) {
        playFailureSound();
        showToast(errMsg || 'This plan is currently unavailable. Please choose another plan.', 'error');
        setSubmitting(false);
        return; // Do not navigate to receipt page!
      }

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

      {/* Network & Plan Category Tabs */}
      <div className="bg-primary-dark pt-4 pb-4 px-5 text-white shrink-0 space-y-3.5 shadow-md">
        <div>
          <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 pl-1">Network Selector</h4>
          <div className="grid grid-cols-3 gap-1.5 bg-white/5 p-1 rounded-full border border-white/5">
            {(['MTN', 'GLO', 'AIRTEL'] as const).map((net) => (
              <button
                key={net}
                onClick={() => setActiveNetwork(net)}
                className={`py-1.5 rounded-full font-bold text-xs cursor-pointer transition-all ${
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

        <div>
          <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 pl-1">Data Category</h4>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2">
            {([
              { id: 'hot', label: 'Hot 🔥' },
              { id: 'daily', label: 'Daily' },
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'exclusive', label: 'Exclusive' }
            ] as const)
              .filter(tab => availableTabs.includes(tab.id))
              .map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1.5 px-4 rounded-full font-bold text-xs cursor-pointer transition-all whitespace-nowrap border ${
                    activeTab === tab.id 
                      ? 'bg-white text-primary-dark border-white shadow font-extrabold' 
                      : 'text-white/70 border-white/10 bg-white/5 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Recipient Details & Plan Selector */}
      <div className="p-5 flex-grow overflow-y-auto space-y-5 pb-[140px]">
        
        {/* Recipient Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-150 space-y-4">
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
            <div className="grid grid-cols-4 gap-x-2 gap-y-4">
              {filteredPlans.length === 0 ? (
                <div className="col-span-4 py-10 text-center bg-white rounded-3xl border border-gray-150 p-6">
                  <p className="text-sm font-semibold text-text-muted">
                    {activeTab === 'hot' && `No hot deals available for ${activeNetwork} right now — check back soon.`}
                    {activeTab === 'daily' && `No daily plans available for ${activeNetwork} right now — check back soon.`}
                    {activeTab === 'weekly' && `No weekly plans available for ${activeNetwork} right now — check back soon.`}
                    {activeTab === 'monthly' && `No monthly plans available for ${activeNetwork} right now — check back soon.`}
                    {activeTab === 'exclusive' && `No exclusive plans available for ${activeNetwork} right now — check back soon.`}
                  </p>
                  <p className="text-xs text-text-muted/70 mt-1">Try switching categories or networks.</p>
                </div>
              ) : (
                filteredPlans.map((plan) => {
                  const isSelected = selectedPlan?.id === plan.id;
                  const isNightOnly = checkIsNightOnly(plan);
                  const isBestValue = plan.id === bestValuePlanId;
                  const cashbackMultiplier = user.double_cashback_active ? 0.20 : 0.10;
                  const cashbackVal = Math.round(plan.price * cashbackMultiplier);

                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`bg-white rounded-xl p-2.5 flex flex-col items-center justify-between text-center gap-1 shadow-sm border active:scale-[0.96] transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-primary-blue ring-2 ring-primary-blue/10 bg-primary-blue/[0.02]'
                          : 'border-slate-150 hover:border-slate-300'
                      }`}
                    >
                      {/* Night Only Indicator */}
                      {isNightOnly && (
                        <span className="absolute top-1 right-1 text-[8px] bg-slate-800 text-white px-1 py-0.5 rounded-full font-bold shadow-sm leading-none" title="Night Only">
                          🌙
                        </span>
                      )}

                      {/* Best Value Star Indicator */}
                      {isBestValue && (
                        <span className="absolute top-1 left-1 text-[8px] bg-amber-500 text-white px-1 py-0.5 rounded-full font-bold shadow-sm leading-none" title="Best Value">
                          ⭐
                        </span>
                      )}

                      <div className="w-full flex flex-col items-center gap-0.5 mt-2">
                        <p className={`text-xs font-black tracking-tight ${isSelected ? 'text-primary-blue' : 'text-slate-900'}`}>
                          {plan.size_label}
                        </p>
                        <p className="text-xs font-bold text-primary-blue font-mono">
                          ₦{plan.price.toLocaleString('en-US')}
                        </p>
                        <p className="text-[9px] font-bold text-emerald-600 leading-none">
                          +₦{cashbackVal} back
                        </p>
                      </div>

                      <span className="text-[8px] font-bold text-text-muted bg-slate-50 border border-slate-100/50 px-1 py-0.5 rounded-md uppercase tracking-wider w-full truncate leading-none mt-1.5">
                        {plan.validity}
                      </span>
                    </button>
                  );
                })
              )}
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
            onClick={() => {
              if (hasBalance) {
                setShowConfirmModal(true);
              } else {
                handleBuyData();
              }
            }}
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

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && selectedPlan && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-3xl w-full max-w-md p-6 space-y-5 shadow-2xl relative border-t border-gray-150"
            >
              <button
                onClick={() => setShowConfirmModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>

              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-primary-dark">Confirm Data Purchase</h3>
                <p className="text-xs text-text-muted font-medium">Please review the details below before confirming</p>
              </div>

              <div className="bg-bg-light rounded-2xl p-4.5 space-y-3.5 border border-gray-100">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted font-semibold">Network</span>
                  <span className="font-extrabold text-primary-dark uppercase tracking-wider">{selectedPlan.network} Bundle</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted font-semibold">Plan Size</span>
                  <span className="font-extrabold text-primary-dark">{selectedPlan.size_label}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted font-semibold">Recipient Line</span>
                  <span className="font-mono font-bold text-primary-dark">{recipient}</span>
                </div>
                <div className="border-t border-gray-200/60 my-2.5"></div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted font-bold">Total Cost</span>
                  <span className="font-black text-primary-blue font-mono">₦{selectedPlan.price.toLocaleString('en-US')}</span>
                </div>
              </div>

              {/* Night Only Alert inside Confirmation */}
              {checkIsNightOnly(selectedPlan) && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex gap-2.5 text-amber-900 shadow-sm">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-left">
                    <p className="text-xs font-bold">Night Plan Warning</p>
                    <p className="text-[11px] text-amber-700 font-semibold leading-relaxed">This plan works at night hours only.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold text-xs rounded-full transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    handleBuyData();
                  }}
                  disabled={submitting}
                  className="py-3 px-4 bg-primary-blue hover:bg-primary-blue/90 text-white font-extrabold text-xs rounded-full transition-all shadow-md shadow-primary-blue/10 cursor-pointer text-center"
                >
                  {submitting ? 'Processing...' : 'Confirm Purchase'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
