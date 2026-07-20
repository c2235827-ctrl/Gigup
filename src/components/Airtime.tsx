import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Smartphone, Wallet, RefreshCw, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { ApiService } from '../api';
import { User } from '../types';
import { playSuccessSound, playFailureSound } from '../utils/audio';

interface AirtimeProps {
  user: User;
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

export default function Airtime({ user, onNavigate, onRefreshData, showToast }: AirtimeProps) {
  const [activeNetwork, setActiveNetwork] = useState<'MTN' | 'GLO' | 'AIRTEL'>('MTN');
  const [recipient, setRecipient] = useState('');
  const [sendToSelf, setSendToSelf] = useState(false);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [priceReveal, setPriceReveal] = useState<{ estimated_price: number; estimated_savings: number } | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  const totalAvailable = (user.wallet_balance || 0) + (user.bonus_balance || 0);

  // Auto-detect network when recipient changes
  useEffect(() => {
    const detected = detectNetwork(recipient);
    if (detected) {
      setActiveNetwork(detected);
    }
  }, [recipient]);

  // Handle "send to self" toggle
  useEffect(() => {
    if (sendToSelf) {
      setRecipient(user.phone);
    } else {
      setRecipient('');
    }
  }, [sendToSelf, user.phone]);

  const revealRealPrice = async (selectedAmount: number) => {
    if (!selectedAmount || selectedAmount < 50) {
      setPriceReveal(null);
      return;
    }
    setLoadingPrice(true);
    try {
      const res = await ApiService.getPriceEstimate('airtime', activeNetwork.toLowerCase(), selectedAmount);
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

  // Re-fetch price estimate if network changes
  useEffect(() => {
    const num = parseFloat(amount);
    if (num >= 50) {
      revealRealPrice(num);
    } else {
      setPriceReveal(null);
    }
  }, [activeNetwork]);

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    setRecipient(value);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setAmount(value);
    const num = parseFloat(value);
    if (num >= 50) {
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
    if (!recipient || recipient.length < 11) {
      showToast('Please enter a valid 11-digit phone number.', 'error');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 50) {
      showToast('Minimum purchase amount is ₦50.', 'error');
      return;
    }

    const amountToCharge = priceReveal ? priceReveal.estimated_price : numericAmount;

    if (amountToCharge > totalAvailable) {
      playFailureSound();
      const generatedOrderId = 'AT' + Math.random().toString(16).substring(2, 10).toUpperCase();
      const generatedReceiptId = 'REC' + Math.random().toString(16).substring(2, 10).toUpperCase();

      showToast('Insufficient balance for this purchase.', 'error');
      onNavigate('receipt', {
        status: 'failed',
        network: activeNetwork,
        plan_name: 'Airtime Recharge',
        recipient_phone: recipient,
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

    const requestStartTime = new Date().toISOString();
    setSubmitting(true);
    try {
      const res = await ApiService.buyAirtime(activeNetwork, numericAmount, recipient);
      if (res.success) {
        await onRefreshData();
        playSuccessSound();

        showToast('Airtime purchase successful! 🎉', 'success');

        const orderId = (res as any).order_id || (res as any).id || 'AT' + Math.random().toString(16).substring(2, 10).toUpperCase();
        const receiptId = (res as any).receipt_id || 'REC' + Math.random().toString(16).substring(2, 10).toUpperCase();
        const finalAmountCharged = (res as any).amount_charged || amountToCharge;

        onNavigate('receipt', {
          status: 'success',
          network: activeNetwork,
          plan_name: 'Airtime Recharge',
          recipient_phone: recipient,
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
          cashback: 0,
          bonus_used: 0
        });

        // Clear forms
        setRecipient('');
        setSendToSelf(false);
        setAmount('');
        setPriceReveal(null);
      } else {
        throw new Error(res.message || 'VTU provider declined the airtime request.');
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
          const checkRes = await ApiService.checkRecentOrder('airtime', requestStartTime);
          await onRefreshData().catch(() => {});
          setSubmitting(false);

          if (checkRes.found && checkRes.status === 'success') {
            playSuccessSound();
            showToast('Good news — your airtime went through! 🎉', 'success');
            onNavigate('receipt', {
              status: 'success',
              network: activeNetwork,
              plan_name: 'Airtime Recharge',
              recipient_phone: recipient,
              amount: checkRes.order?.amount ?? amountToCharge,
              id: checkRes.order?.id ?? 'AT' + Math.random().toString(16).substring(2, 10).toUpperCase(),
              receiptId: 'REC' + Math.random().toString(16).substring(2, 10).toUpperCase(),
              date: new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              cashback: 0,
              bonus_used: 0
            });
            // Clear forms
            setRecipient('');
            setSendToSelf(false);
            setAmount('');
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
              network: activeNetwork,
              plan_name: 'Airtime Recharge',
              recipient_phone: recipient,
              amount: amountToCharge,
              id: checkRes.order?.id ?? 'AT' + Math.random().toString(16).substring(2, 10).toUpperCase(),
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

      showToast(err.message || 'Airtime purchase failed', 'error');

      const orderId = 'AT' + Math.random().toString(16).substring(2, 10).toUpperCase();
      const receiptId = 'REC' + Math.random().toString(16).substring(2, 10).toUpperCase();

      onNavigate('receipt', {
        status: 'failed',
        network: activeNetwork,
        plan_name: 'Airtime Recharge',
        recipient_phone: recipient,
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
        reason: err.message || 'Transaction was rejected by VTU gateway.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  return (
    <div className="flex flex-col h-full bg-slate-50 relative select-none">
      {/* Upper header */}
      <header className="h-14 bg-white border-b border-gray-150 flex items-center justify-between px-5 shrink-0 z-40">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-900 cursor-pointer font-bold text-xs select-none bg-transparent border-none p-2 rounded-xl transition hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Home</span>
        </button>
        <span className="font-extrabold text-[#111827] text-xs uppercase tracking-widest">Buy Airtime</span>
        <div className="w-16" /> {/* spacer */}
      </header>

      {/* Network Selector Tabs */}
      <div className="bg-primary-dark pt-4 pb-4 px-5 text-white shrink-0 space-y-3 shadow-md">
        <div>
          <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 pl-1">Select Network</h4>
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
                {net}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Form Fields */}
      <form onSubmit={handleSubmit} className="p-5 flex-grow overflow-y-auto space-y-6 pb-[140px]">
        {/* Recipient Input */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recipient Number</h5>
            <div className="flex items-center gap-1.5 cursor-pointer">
              <input
                id="airtime-self-toggle"
                type="checkbox"
                checked={sendToSelf}
                onChange={(e) => setSendToSelf(e.target.checked)}
                className="w-4.5 h-4.5 text-primary-blue rounded border-gray-300 focus:ring-primary-blue accent-primary-blue cursor-pointer"
              />
              <label htmlFor="airtime-self-toggle" className="text-xs font-semibold text-primary-blue cursor-pointer select-none">
                Send to my number
              </label>
            </div>
          </div>

          <div className="relative flex items-center">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
              <Smartphone className="w-5 h-5" />
            </span>
            <input
              id="airtime-phone-input"
              type="tel"
              placeholder="08012345678"
              value={recipient}
              onChange={handleRecipientChange}
              disabled={sendToSelf}
              required
              className="w-full bg-white border border-gray-200 text-primary-dark font-bold rounded-2xl pl-11 pr-24 py-3 text-base placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400"
            />
            {recipient.length >= 4 && (
              <div className="absolute right-3 flex items-center pointer-events-none">
                {detectNetwork(recipient) ? (
                  <span className={`text-[9px] font-extrabold px-2 py-1 rounded-full text-white uppercase tracking-wider shadow-inner ${
                    detectNetwork(recipient) === 'MTN' ? 'bg-yellow-500 text-primary-dark' :
                    detectNetwork(recipient) === 'GLO' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  }`}>
                    {detectNetwork(recipient)}
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

        {/* Divider */}
        <div className="h-px bg-gray-200/80 mx-1" />

        {/* Amount Input */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recharge Amount</h5>
          </div>

          <div className="relative flex items-center">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-primary-dark font-black text-lg">
              ₦
            </span>
            <input
              id="airtime-amount-input"
              type="tel"
              placeholder="0"
              value={amount}
              onChange={handleAmountChange}
              required
              className="w-full bg-white border border-gray-200 text-primary-dark font-black rounded-2xl pl-9 pr-4 py-3.5 text-xl placeholder-gray-350 focus:bg-white focus:border-primary-blue focus:outline-none transition-all"
            />
          </div>

          {/* Quick Amounts Grid */}
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

          <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-xs px-1">
            <span className="text-slate-500 font-semibold">Wallet Balance:</span>
            <span className="font-extrabold text-slate-800">
              ₦{totalAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Confirm and Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-4 rounded-2xl text-xs font-black text-white shadow-md active:scale-[0.98] transition-all cursor-pointer border-none uppercase tracking-wider ${
              submitting ? 'bg-slate-400' : 'bg-[#0F172A] hover:bg-slate-800'
            }`}
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Processing Recharge...</span>
              </div>
            ) : (
              <span>Dispense Airtime Now</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
