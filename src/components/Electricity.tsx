import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Smartphone, Wallet, RefreshCw, Sparkles, AlertCircle, CheckCircle, CreditCard, ChevronDown } from 'lucide-react';
import { ApiService } from '../api';
import { User } from '../types';
import { playSuccessSound, playFailureSound } from '../utils/audio';

interface ElectricityProps {
  user: User;
  onNavigate: (screen: string, extras?: any) => void;
  onRefreshData: () => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface Disco {
  plan_id: string;
  plan_code: string;
  plan_name: string;
  min_amount: number;
  max_amount: number;
}

export default function Electricity({ user, onNavigate, onRefreshData, showToast }: ElectricityProps) {
  const [discos, setDiscos] = useState<Disco[]>([]);
  const [loadingDiscos, setLoadingDiscos] = useState(false);
  const [selectedDisco, setSelectedDisco] = useState<Disco | null>(null);

  const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [meterNumber, setMeterNumber] = useState('');
  
  const [verifyingMeter, setVerifyingMeter] = useState(false);
  const [verifiedCustomer, setVerifiedCustomer] = useState<{ name: string } | null>(null);

  const [amount, setAmount] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [priceReveal, setPriceReveal] = useState<{ estimated_price: number; estimated_savings: number } | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  const totalAvailable = (user.wallet_balance || 0) + (user.bonus_balance || 0);

  // Fetch Discos on Mount
  useEffect(() => {
    const fetchDiscos = async () => {
      setLoadingDiscos(true);
      try {
        const res = await ApiService.getElectricityDiscos();
        if (res.success && res.discos) {
          setDiscos(res.discos);
          if (res.discos.length > 0) {
            setSelectedDisco(res.discos[0]);
          }
        } else {
          showToast('Failed to load electricity distribution companies.', 'error');
        }
      } catch (err) {
        showToast('Error loading electricity discos.', 'error');
      } finally {
        setLoadingDiscos(false);
      }
    };
    fetchDiscos();
  }, []);

  // Reset verification when inputs change
  useEffect(() => {
    setVerifiedCustomer(null);
  }, [meterNumber, selectedDisco, meterType]);

  const revealRealPrice = async (selectedAmount: number) => {
    if (!selectedAmount || !selectedDisco || selectedAmount < (selectedDisco.min_amount || 100)) {
      setPriceReveal(null);
      return;
    }
    setLoadingPrice(true);
    try {
      const res = await ApiService.getPriceEstimate('electricity', null, selectedAmount);
      if (res.success) {
        setPriceReveal({ estimated_price: res.estimated_price, estimated_savings: res.estimated_savings });
      } else {
        setPriceReveal(null);
      }
    } catch {
      setPriceReveal(null);
    } finally {
      setLoadingPrice(false);
    }
  };

  // Re-fetch price estimate if selectedDisco changes
  useEffect(() => {
    const num = parseFloat(amount);
    if (num && selectedDisco && num >= (selectedDisco.min_amount || 100)) {
      revealRealPrice(num);
    } else {
      setPriceReveal(null);
    }
  }, [selectedDisco]);

  const handleVerifyMeter = async () => {
    if (!meterNumber) {
      showToast('Please enter a meter number first.', 'info');
      return;
    }
    if (!selectedDisco) {
      showToast('Please select a distribution company.', 'info');
      return;
    }

    setVerifyingMeter(true);
    setVerifiedCustomer(null);
    try {
      // API expects: meter: string, plan: string (e.g. plan_code), type: string (e.g. prepaid/postpaid)
      const res = await ApiService.verifyElectricityMeter(
        meterNumber,
        selectedDisco.plan_code,
        meterType
      );
      if (res.success && res.customer_name) {
        setVerifiedCustomer({ name: res.customer_name });
        showToast('Meter number verified successfully! ✅', 'success');
      } else {
        showToast(res.error || 'Unable to verify meter. Check details and retry.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Meter verification failed.', 'error');
    } finally {
      setVerifyingMeter(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    setRecipientPhone(value);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setAmount(value);
    const num = parseFloat(value);
    if (selectedDisco && num >= (selectedDisco.min_amount || 100)) {
      revealRealPrice(num);
    } else {
      setPriceReveal(null);
    }
  };

  const selectQuickAmount = (val: number) => {
    setAmount(String(val));
    revealRealPrice(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisco) {
      showToast('Please select a distribution company.', 'error');
      return;
    }
    if (!meterNumber) {
      showToast('Please enter a meter number.', 'error');
      return;
    }
    if (!verifiedCustomer) {
      showToast('Please verify your meter number first.', 'error');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < (selectedDisco.min_amount || 100)) {
      showToast(`Minimum purchase amount is ₦${(selectedDisco.min_amount || 100).toLocaleString()}.`, 'error');
      return;
    }

    if (selectedDisco.max_amount && numericAmount > selectedDisco.max_amount) {
      showToast(`Maximum purchase amount is ₦${selectedDisco.max_amount.toLocaleString()}.`, 'error');
      return;
    }

    const amountToCharge = priceReveal ? priceReveal.estimated_price : numericAmount;

    if (amountToCharge > totalAvailable) {
      playFailureSound();
      const generatedOrderId = 'EL' + Math.random().toString(16).substring(2, 10).toUpperCase();
      const generatedReceiptId = 'REC' + Math.random().toString(16).substring(2, 10).toUpperCase();

      showToast('Insufficient balance for this purchase.', 'error');
      onNavigate('receipt', {
        status: 'failed',
        network: selectedDisco.plan_name,
        plan_name: `Electricity Token (${meterType.toUpperCase()})`,
        recipient_phone: meterNumber,
        amount: amountToCharge,
        id: generatedOrderId,
        receiptId: generatedReceiptId,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        reason: 'Insufficient wallet balance. Please fund your wallet.'
      });
      return;
    }

    if (!recipientPhone || recipientPhone.length < 11) {
      showToast('Please enter a valid 11-digit notification phone number.', 'error');
      return;
    }

    const requestStartTime = new Date().toISOString();
    setSubmitting(true);
    try {
      // API expects: disco (plan_code), meter, meterType, amount, phone
      const res = await ApiService.buyElectricity(
        selectedDisco.plan_code,
        meterNumber,
        meterType,
        numericAmount,
        recipientPhone
      );

      if (res.success) {
        await onRefreshData();
        playSuccessSound();

        showToast('Electricity purchase completed! 🎉', 'success');

        const orderId = (res as any).order_id || (res as any).id || 'EL' + Math.random().toString(16).substring(2, 10).toUpperCase();
        const receiptId = (res as any).receipt_id || 'REC' + Math.random().toString(16).substring(2, 10).toUpperCase();
        const finalAmountCharged = (res as any).amount_charged || amountToCharge;

        // If prepaid token is generated, display it prominently on the receipt page's plan name area
        const displayPlanName = res.token 
          ? `TOKEN: ${res.token} (${meterType.toUpperCase()})`
          : `Electricity Token (${meterType.toUpperCase()})`;

        onNavigate('receipt', {
          status: 'success',
          network: selectedDisco.plan_name,
          plan_name: displayPlanName,
          recipient_phone: meterNumber,
          amount: finalAmountCharged,
          id: orderId,
          receiptId: receiptId,
          date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          cashback: (res as any).cashback_earned || (res as any).cashback || 0,
          cashback_earned: (res as any).cashback_earned || (res as any).cashback || 0,
          bonus_used: 0
        });

        // Reset
        setMeterNumber('');
        setVerifiedCustomer(null);
        setAmount('');
        setRecipientPhone('');
        setPriceReveal(null);
      } else {
        throw new Error(res.message || 'Dispersion rejected by VTU electricity provider.');
      }
    } catch (err: any) {
      playFailureSound();

      const isNetworkError = err instanceof TypeError ||
        (err.message && (
          err.message.toLowerCase().includes('failed to fetch') ||
          err.message.toLowerCase().includes('network') ||
          err.message.toLowerCase().includes('load failed')
        ));

      if (isNetworkError) {
        showToast('Connection issue — checking your order status...', 'info');
        try {
          const checkRes = await ApiService.checkRecentOrder('electricity', requestStartTime);
          await onRefreshData().catch(() => {});
          setSubmitting(false);

          if (checkRes.found && checkRes.status === 'success') {
            playSuccessSound();
            showToast('Good news — your electricity went through! 🎉', 'success');

            const displayPlanName = checkRes.order?.token 
              ? `TOKEN: ${checkRes.order.token} (${meterType.toUpperCase()})`
              : `Electricity Token (${meterType.toUpperCase()})`;

            onNavigate('receipt', {
              status: 'success',
              network: selectedDisco.plan_name,
              plan_name: displayPlanName,
              recipient_phone: meterNumber,
              amount: checkRes.order?.amount ?? amountToCharge,
              id: checkRes.order?.id ?? 'EL' + Math.random().toString(16).substring(2, 10).toUpperCase(),
              receiptId: 'REC' + Math.random().toString(16).substring(2, 10).toUpperCase(),
              date: new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              cashback: checkRes.order?.cashback_earned || checkRes.order?.cashback || 0,
              cashback_earned: checkRes.order?.cashback_earned || checkRes.order?.cashback || 0,
              bonus_used: 0
            });
            // Reset
            setMeterNumber('');
            setVerifiedCustomer(null);
            setAmount('');
            setRecipientPhone('');
            setPriceReveal(null);
            return;
          }

          if (checkRes.found && checkRes.status === 'pending') {
            showToast('Your order is still processing — check back shortly.', 'info');
            return;
          }

          if (checkRes.found && checkRes.status === 'failed') {
            onNavigate('receipt', {
              status: 'failed',
              network: selectedDisco.plan_name,
              plan_name: `Electricity Token (${meterType.toUpperCase()})`,
              recipient_phone: meterNumber,
              amount: amountToCharge,
              id: checkRes.order?.id ?? 'EL' + Math.random().toString(16).substring(2, 10).toUpperCase(),
              receiptId: 'REC' + Math.random().toString(16).substring(2, 10).toUpperCase(),
              date: new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              reason: checkRes.order?.failure_reason || 'Transaction failed.'
            });
            return;
          }

          showToast('Your order was not received. Please try again.', 'error');
        } catch (checkErr) {
          showToast('Could not confirm order status. Please check your order history.', 'error');
        }
        return;
      }

      showToast(err.message || 'Electricity purchase failed', 'error');

      const orderId = 'EL' + Math.random().toString(16).substring(2, 10).toUpperCase();
      const receiptId = 'REC' + Math.random().toString(16).substring(2, 10).toUpperCase();

      onNavigate('receipt', {
        status: 'failed',
        network: selectedDisco.plan_name,
        plan_name: `Electricity Token (${meterType.toUpperCase()})`,
        recipient_phone: meterNumber,
        amount: amountToCharge,
        id: orderId,
        receiptId: receiptId,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        reason: err.message || 'VTU provider declined electricity activation.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const quickAmounts = [1000, 2000, 5000, 10000, 15000, 20000];

  return (
    <div className="flex flex-col h-full bg-slate-50 relative select-none">
      {/* Header */}
      <header className="h-14 bg-white border-b border-gray-150 flex items-center justify-between px-5 shrink-0 z-40">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-900 cursor-pointer font-bold text-xs select-none bg-transparent border-none p-2 rounded-xl transition hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Home</span>
        </button>
        <span className="font-extrabold text-[#111827] text-xs uppercase tracking-widest">Buy Power</span>
        <div className="w-16" />
      </header>

      {/* Discos select area */}
      <div className="bg-primary-dark pt-4 pb-4 px-5 text-white shrink-0 space-y-3.5 shadow-md">
        <div>
          <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 pl-1">Distribution Company (Disco)</h4>
          {loadingDiscos ? (
            <div className="flex justify-center py-2">
              <RefreshCw className="w-4 h-4 animate-spin text-white/70" />
            </div>
          ) : (
            <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
              <select
                id="disco-selector"
                value={selectedDisco?.plan_code || ''}
                onChange={(e) => {
                  const found = discos.find(d => d.plan_code === e.target.value);
                  if (found) setSelectedDisco(found);
                }}
                className="w-full bg-transparent text-white font-bold text-xs focus:outline-none appearance-none cursor-pointer pr-8"
              >
                {discos.map(d => (
                  <option key={d.plan_code} value={d.plan_code} className="text-primary-dark font-semibold">
                    {d.plan_name}
                  </option>
                ))}
              </select>
              <span className="absolute right-4 pointer-events-none text-white/60">
                <ChevronDown className="w-4 h-4" />
              </span>
            </div>
          )}
        </div>

        {/* Meter Type prepaid/postpaid */}
        <div>
          <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 pl-1">Meter Type</h4>
          <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-full border border-white/5">
            <button
              type="button"
              onClick={() => setMeterType('prepaid')}
              className={`py-1 rounded-full font-bold text-xs cursor-pointer transition-all ${
                meterType === 'prepaid' 
                  ? 'bg-white text-primary-dark shadow font-extrabold' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Prepaid
            </button>
            <button
              type="button"
              onClick={() => setMeterType('postpaid')}
              className={`py-1 rounded-full font-bold text-xs cursor-pointer transition-all ${
                meterType === 'postpaid' 
                  ? 'bg-white text-primary-dark shadow font-extrabold' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Postpaid
            </button>
          </div>
        </div>
      </div>

      {/* Inputs Form */}
      <form onSubmit={handleSubmit} className="p-5 flex-grow overflow-y-auto space-y-6 pb-[140px]">
        {/* Meter input and verify */}
        <div className="space-y-4">
          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Meter Number</h5>
          <div className="flex gap-2">
            <div className="relative flex-1 flex items-center">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                <CreditCard className="w-5 h-5" />
              </span>
              <input
                id="meter-no-input"
                type="tel"
                placeholder="Enter Meter ID"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full bg-white border border-gray-200 text-primary-dark font-bold rounded-2xl pl-11 pr-3 py-3 text-sm placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all"
              />
            </div>
            <button
              type="button"
              onClick={handleVerifyMeter}
              disabled={verifyingMeter || !meterNumber}
              className="px-4 bg-primary-blue hover:bg-primary-blue/95 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-2xl transition-all active:scale-95 flex items-center gap-1 cursor-pointer border-none"
            >
              {verifyingMeter ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : 'Verify'}
            </button>
          </div>

          {verifiedCustomer && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 animate-fade-in">
              <div className="flex items-start gap-2 text-emerald-800">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-emerald-600">Verified Consumer</span>
                  <span className="text-xs font-black block mt-0.5">{verifiedCustomer.name}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200/80 mx-1" />

        {/* Purchase Amount */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</h5>
            <span className="text-[10px] text-text-muted font-bold">
              Min: ₦{selectedDisco ? (selectedDisco.min_amount || 100).toLocaleString() : '100'}
            </span>
          </div>

          <div className="relative flex items-center">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-primary-dark font-black text-lg">
              ₦
            </span>
            <input
              id="electricity-amount-input"
              type="tel"
              placeholder="0"
              value={amount}
              onChange={handleAmountChange}
              required
              className="w-full bg-white border border-gray-200 text-primary-dark font-black rounded-2xl pl-9 pr-4 py-3.5 text-xl placeholder-gray-350 focus:bg-white focus:border-primary-blue focus:outline-none transition-all"
            />
          </div>

          {/* Quick grid */}
          <div className="grid grid-cols-3 gap-2">
            {quickAmounts.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => selectQuickAmount(val)}
                className="bg-white hover:bg-slate-50 text-primary-dark border border-gray-200 rounded-2xl py-2.5 text-xs font-bold transition-all active:scale-[0.97]"
              >
                ₦{val.toLocaleString()}
              </button>
            ))}
          </div>

          {loadingPrice && <p className="text-xs text-gray-400 mt-2 pl-1 animate-pulse">Checking real price...</p>}
          {priceReveal && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 mt-2 animate-fade-in">
              <p className="text-xs font-bold text-emerald-800">
                You'll actually pay: <span className="font-black text-sm">₦{priceReveal.estimated_price.toLocaleString()}</span>
              </p>
              <p className="text-[10px] text-emerald-600 mt-0.5">You save ₦{priceReveal.estimated_savings.toLocaleString()} — no markup, ever.</p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200/80 mx-1" />

        {/* Notification Phone */}
        <div className="space-y-4">
          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Token Delivery Phone</h5>
          <div className="relative flex items-center">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
              <Smartphone className="w-5 h-5" />
            </span>
            <input
              id="electricity-phone-input"
              type="tel"
              placeholder="08012345678"
              value={recipientPhone}
              onChange={handlePhoneChange}
              required
              className="w-full bg-white border border-gray-200 text-primary-dark font-bold rounded-2xl pl-11 pr-3 py-3 text-sm placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all"
            />
          </div>

          <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-xs px-1">
            <span className="text-slate-500 font-semibold">Wallet Balance:</span>
            <span className="font-extrabold text-slate-800">
              ₦{totalAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Purchase button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || !verifiedCustomer}
            className={`w-full py-4 rounded-2xl text-xs font-black text-white shadow-md active:scale-[0.98] transition-all cursor-pointer border-none uppercase tracking-wider ${
              submitting || !verifiedCustomer ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#0F172A] hover:bg-slate-800'
            }`}
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Generating Token...</span>
              </div>
            ) : !verifiedCustomer ? (
              <span>Verify Meter to unlock purchase</span>
            ) : (
              <span>Dispense Power Now</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
