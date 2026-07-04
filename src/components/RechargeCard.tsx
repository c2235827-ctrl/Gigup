import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Plus, Minus, Copy, Share2, CheckCircle, History, Sparkles, X, ChevronRight } from 'lucide-react';
import jsPDF from 'jspdf';
import { User } from '../types';
import PullToRefresh from './PullToRefresh';
import { ApiService } from '../api';
import RechargeCardTicket from './RechargeCardTicket';

interface RechargeCardProps {
  user: User;
  onNavigate: (screen: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshData?: () => Promise<void>;
}

interface CardPINInfo {
  pin: string;
  serial: string;
}

interface RechargeOrder {
  id: string;
  network: string;
  denomination: number;
  quantity: number;
  brandName: string;
  totalCost: number;
  status: string;
  date: string;
  cards: CardPINInfo[];
}

const NETWORK_META: Record<string, { logo: string; color: string; bg: string }> = {
  MTN: { logo: 'MTN', color: 'bg-yellow-400 text-slate-900 border-yellow-500', bg: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  GLO: { logo: 'GLO', color: 'bg-green-600 text-white border-green-700', bg: 'bg-green-100 text-green-700 border-green-200' },
  AIRTEL: { logo: 'Airtel', color: 'bg-red-600 text-white border-red-700', bg: 'bg-red-100 text-red-700 border-red-200' },
  '9MOBILE': { logo: '9mobile', color: 'bg-purple-600 text-white border-purple-700', bg: 'bg-purple-100 text-purple-700 border-purple-200' }
};

// Shorten any long reference/UUID to a readable short code (e.g. first 8 chars, uppercased)
function shortenReference(ref: string): string {
  if (!ref) return '';
  // If it looks like a UUID (has dashes and is long), take only the first segment
  const cleaned = ref.replace(/^RC-/, '');
  const short = cleaned.split('-')[0];
  return short.slice(0, 8).toUpperCase();
}

// Simple visual PinInput helper component
function LocalPinInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const pinDigits = value.split('').concat(Array(4).fill('')).slice(0, 4);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  const handleDigitChange = (index: number, val: string) => {
    const rawVal = val.replace(/\D/g, '');
    if (!rawVal) {
      const nextDigits = [...pinDigits];
      nextDigits[index] = '';
      onChange(nextDigits.filter(x => x !== '').join(''));
      return;
    }

    const digit = rawVal[rawVal.length - 1];
    const nextDigits = [...pinDigits];
    nextDigits[index] = digit;
    const combined = nextDigits.slice(0, 4).join('');
    onChange(combined);

    if (index < 3 && digit) {
      refs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-3.5 py-2">
      {pinDigits.map((digit, idx) => (
        <input
          key={idx}
          ref={refs[idx]}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={(e) => handleDigitChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          className="w-12 h-12 text-center bg-slate-50 border-2 border-slate-200 text-slate-800 text-xl font-extrabold font-mono rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all shadow-inner"
        />
      ))}
    </div>
  );
}

export default function RechargeCard({ user, onNavigate, showToast, onRefreshData }: RechargeCardProps) {
  const [activeTab, setActiveTab] = useState<'order' | 'history'>('order');
  
  // Subscription status state
  const [subStatus, setSubStatus] = useState<{
    loading: boolean;
    error: string | null;
    eligible: boolean;
    subscription_id?: string;
    plan_type?: 'weekly' | 'monthly';
    batches_used_today?: number;
    daily_batch_limit?: number;
    batches_remaining_today?: number;
    max_cards_per_batch?: number;
    expires_at?: string;
    reason?: string;
    message?: string;
  }>({
    loading: true,
    error: null,
    eligible: false,
  });

  const [subscribing, setSubscribing] = useState<boolean>(false);

  // Available options
  const [options, setOptions] = useState<{
    networks: {
      network: string;
      network_label: string;
      denominations: {
        face_value: number;
        price_per_card: number;
      }[];
    }[];
    limits: {
      max_quantity_per_order: number;
    };
  } | null>(null);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false);

  // Selection State
  const [selectedNetwork, setSelectedNetwork] = useState<string>('MTN');
  const [selectedDenom, setSelectedDenom] = useState<number>(100);
  const [quantity, setQuantity] = useState<number>(1);
  const [brandName, setBrandName] = useState<string>('');
  
  // Quote State
  const [quote, setQuote] = useState<{
    price_per_card: number;
    total_cost: number;
    loading: boolean;
  } | null>(null);

  // PIN Confirmation Modal state
  const [showPinConfirmModal, setShowPinConfirmModal] = useState<boolean>(false);
  const [pin, setPin] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // History states
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'success' | 'failed'>('all');
  
  // Active viewing order details (e.g. for success screen or historic order popup)
  const [activeOrder, setActiveOrder] = useState<RechargeOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);

  // Purchase/Shortfall states
  const [shortfallAmount, setShortfallAmount] = useState<number | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  // Fetch status and options
  const fetchStatusAndData = async () => {
    setSubStatus(prev => ({ ...prev, loading: true, error: null }));
    try {
      const statusRes = await ApiService.getRechargeCardSubscriptionStatus();
      setSubStatus({
        loading: false,
        error: null,
        ...statusRes,
      });

      if (statusRes.eligible) {
        setLoadingOptions(true);
        const optionsRes = await ApiService.getRechargeCardOptions();
        setOptions(optionsRes);
        setLoadingOptions(false);

        // Pre-fill selection from response
        if (optionsRes.networks && optionsRes.networks.length > 0) {
          const firstNet = optionsRes.networks[0];
          setSelectedNetwork(firstNet.network);
          if (firstNet.denominations && firstNet.denominations.length > 0) {
            setSelectedDenom(firstNet.denominations[0].face_value);
          }
        }
      }
    } catch (err: any) {
      setSubStatus({
        loading: false,
        error: err.message || 'Failed to verify subscription status',
        eligible: false,
      });
    }
  };

  useEffect(() => {
    fetchStatusAndData();
  }, []);

  // Fetch live price quote when network, denomination, or quantity changes
  useEffect(() => {
    if (!subStatus.eligible || !selectedNetwork || !selectedDenom || quantity <= 0) return;

    let active = true;
    const fetchQuote = async () => {
      setQuote(prev => ({
        price_per_card: prev?.price_per_card || selectedDenom,
        total_cost: prev?.total_cost || (selectedDenom * quantity),
        loading: true
      }));

      try {
        const quoteRes = await ApiService.getRechargeCardQuote(selectedNetwork, selectedDenom, quantity);
        if (active) {
          setQuote({
            price_per_card: quoteRes.price_per_card,
            total_cost: quoteRes.total_cost,
            loading: false
          });
        }
      } catch (err) {
        if (active) {
          // Fallback to option-based cost calculation
          const selectedNetObj = options?.networks.find(n => n.network.toUpperCase() === selectedNetwork.toUpperCase());
          const denomObj = selectedNetObj?.denominations.find(d => d.face_value === selectedDenom);
          const perCard = denomObj?.price_per_card || selectedDenom;
          setQuote({
            price_per_card: perCard,
            total_cost: perCard * quantity,
            loading: false
          });
        }
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchQuote();
    }, 300);

    return () => {
      active = false;
      clearTimeout(delayDebounce);
    };
  }, [selectedNetwork, selectedDenom, quantity, subStatus.eligible, options]);

  // Fetch history list when history tab is selected
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await ApiService.getRechargeCardHistory();
      if (res.success) {
        setHistoryOrders(res.orders || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load order history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  // Handle plan subscription
  const handleSubscribe = async (planType: 'weekly' | 'monthly') => {
    setSubscribing(true);
    try {
      const res = await ApiService.subscribeToRechargeCardPlan(planType);
      if (res.success) {
        showToast(`Successfully subscribed to the ${planType} plan! 🎉`, 'success');
        if (onRefreshData) {
          await onRefreshData();
        }
        await fetchStatusAndData();
      } else {
        showToast('Subscription failed. Please try again.', 'error');
      }
    } catch (err: any) {
      if (err.required && err.current_balance !== undefined) {
        const calculatedShortfall = Math.max(0, err.required - err.current_balance);
        setShortfallAmount(calculatedShortfall);
      }
      showToast(err.message || 'Subscription failed', 'error');
    } finally {
      setSubscribing(false);
    }
  };

  // Helper values for current calculations
  const selectedNetObj = options?.networks.find(n => n.network.toUpperCase() === selectedNetwork.toUpperCase());
  const activeDenominations = selectedNetObj?.denominations || [];
  const maxQty = options?.limits?.max_quantity_per_order || 100;

  const currentPricePerCard = quote ? quote.price_per_card : (activeDenominations.find(d => d.face_value === selectedDenom)?.price_per_card || selectedDenom);
  const currentTotalCost = quote ? quote.total_cost : (currentPricePerCard * quantity);

  // Handle network changing (makes sure denom remains valid)
  const handleNetworkSelect = (netName: string) => {
    setSelectedNetwork(netName);
    const netObj = options?.networks.find(n => n.network.toUpperCase() === netName.toUpperCase());
    if (netObj && netObj.denominations && netObj.denominations.length > 0) {
      const hasCurrent = netObj.denominations.some(d => d.face_value === selectedDenom);
      if (!hasCurrent) {
        setSelectedDenom(netObj.denominations[0].face_value);
      }
    }
  };

  // Submit/Purchase Action inside Modal
  const handleConfirmPurchase = async () => {
    if (pin.length < 4) {
      showToast('Please enter your 4-digit PIN to confirm purchase.', 'error');
      return;
    }

    setIsSubmitting(true);
    setShortfallAmount(null);
    try {
      const res = await ApiService.purchaseRechargeCards({
        network: selectedNetwork,
        amount: selectedDenom,
        quantity,
        brand_name: brandName.trim() || undefined,
        transaction_pin: pin
      });

      if (res.success) {
        setShowPinConfirmModal(false);
        setPin('');

        if (res.status === 'success' || res.status === 'partial') {
          const formattedOrder: RechargeOrder = {
            id: res.order_id || res.reference,
            network: selectedNetwork,
            denomination: selectedDenom,
            quantity: res.quantity_delivered || quantity,
            brandName: brandName.trim() || 'GigUp',
            totalCost: res.total_charged,
            status: 'success',
            date: new Date().toISOString(),
            cards: res.cards || []
          };

          // Show success modal
          setActiveOrder(formattedOrder);
          setShowOrderModal(true);
          showToast(`Successfully generated ${res.quantity_delivered} recharge cards!`, 'success');

          // Refresh balance
          if (onRefreshData) {
            await onRefreshData();
          }

          // Refresh daily limits state
          const newStatus = await ApiService.getRechargeCardSubscriptionStatus();
          setSubStatus(prev => ({ ...prev, ...newStatus }));

          // Refresh history list
          fetchHistory();
        } else if (res.status === 'failed_refunded') {
          showToast('Order failed and was fully refunded to your wallet.', 'error');
          if (onRefreshData) await onRefreshData();
          fetchHistory();
        }
      }
    } catch (err: any) {
      setShowPinConfirmModal(false);
      setPin('');
      const errMsg = err.message || '';
      if (errMsg.toLowerCase().includes('insufficient wallet balance') || errMsg.toLowerCase().includes('shortfall') || errMsg.toLowerCase().includes('need')) {
        const calculatedShortfall = Math.max(0, currentTotalCost - user.wallet_balance);
        setShortfallAmount(calculatedShortfall);
      }
      showToast(errMsg || 'Purchase failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch single batch card details
  const handleViewBatchDetail = async (order: any) => {
    setLoadingDetailId(order.id);
    try {
      const res = await ApiService.getRechargeCardBatchDetail(order.id);
      if (res.success) {
        const formattedOrder: RechargeOrder = {
          id: order.id,
          network: order.network,
          denomination: order.face_value || order.denomination || 100,
          quantity: order.quantity_ordered || order.quantity || 1,
          brandName: order.brand_name || 'GigUp',
          totalCost: order.total_charged || order.totalCost || 100,
          status: order.status,
          date: order.created_at || order.date,
          cards: res.cards || []
        };
        setActiveOrder(formattedOrder);
        setShowOrderModal(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load batch details', 'error');
    } finally {
      setLoadingDetailId(null);
    }
  };

  // Copy PINs and Serials to clipboard matching physical format
  const handleCopyAll = (order: RechargeOrder) => {
    if (!order.cards || order.cards.length === 0) return;

    const shortRef = shortenReference(order.id);
    const text = order.cards.map((card) =>
      `${order.brandName || 'GigUp'}${shortRef ? `; ${shortRef}` : ''}\n` +
      `S/N: ${card.serial}\n` +
      `${card.pin.replace(/(.{4})/g, '$1-').replace(/-$/, '')}\n` +
      `Dial *311*${card.pin}#\n` +
      `Date: ${new Date(order.date).toLocaleString('en-NG')}`
    ).join('\n\n---\n\n');

    navigator.clipboard.writeText(text);
    showToast('All cards copied to clipboard 📋', 'success');
  };

  // PDF Download matching format
  const handleDownloadPDF = (order: RechargeOrder) => {
    if (!order.cards || order.cards.length === 0) return;
    
    const doc = new jsPDF();
    let y = 20;
    const shortRef = shortenReference(order.id);

    order.cards.forEach((card) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      // Brand + shortened reference
      doc.setFontSize(10);
      doc.setFont('times', 'bold');
      doc.text(`${order.brandName || 'GigUp'}${shortRef ? `; ${shortRef}` : ''}`, 15, y);

      // Face value
      doc.text(`N${order.denomination}`, 155, y);

      // Black network badge rectangle with network name in white
      const badgeWidth = order.network.length > 5 ? 22 : 17;
      const badgeX = 195 - badgeWidth;
      doc.setFillColor(0, 0, 0);
      doc.rect(badgeX, y - 4.5, badgeWidth, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(order.network, badgeX + 1.5, y);
      doc.setTextColor(0, 0, 0); // reset text color for rest of card

      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.text(`S/N: ${card.serial}`, 15, y + 8);

      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      const formattedPin = card.pin.replace(/(.{4})/g, '$1-').replace(/-$/, '');
      doc.text(formattedPin, 15, y + 16);

      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.text(`Dial *311*${card.pin}#`, 15, y + 23);

      doc.setFont('times', 'normal');
      doc.text(`Date: ${new Date(order.date).toLocaleString('en-NG')}`, 15, y + 29);

      doc.setDrawColor(200, 200, 200);
      doc.line(15, y + 34, 195, y + 34);

      y += 42;
    });

    doc.save(`GigUp-RechargeCards-${shortRef || order.id}.pdf`);
    showToast('PDF exported successfully! 📄', 'success');
  };

  const handleRefresh = async () => {
    if (activeTab === 'order') {
      await fetchStatusAndData();
    } else {
      await fetchHistory();
    }
  };

  // Filter history log orders
  const filteredHistory = historyOrders.filter(order => {
    if (historyFilter === 'all') return true;
    if (historyFilter === 'success') {
      return order.status === 'success' || order.status === 'partial' || order.status === 'pending_review' || order.status === 'processing';
    }
    if (historyFilter === 'failed') {
      return order.status === 'failed' || order.status === 'failed_refunded';
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return { label: 'Success', style: 'bg-emerald-50 text-emerald-600 border border-emerald-100' };
      case 'partial':
        return { label: 'Partial Success', style: 'bg-amber-50 text-amber-600 border border-amber-100' };
      case 'failed':
      case 'failed_refunded':
        return { label: 'Failed & Refunded', style: 'bg-red-50 text-red-600 border border-red-100' };
      case 'processing':
        return { label: 'Processing', style: 'bg-blue-50 text-blue-600 border border-blue-100 animate-pulse' };
      case 'pending_review':
        return { label: 'Under Review', style: 'bg-indigo-50 text-indigo-600 border border-indigo-100' };
      default:
        return { label: status, style: 'bg-slate-50 text-slate-600 border border-slate-100' };
    }
  };

  // ---------------- RENDERING DECISIONS ----------------

  // Standard Spinner
  if (subStatus.loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-6 text-center select-none animate-fade-in">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest leading-none">Verifying Account</h3>
        <p className="text-[11px] text-slate-400 mt-2 leading-none">Please wait while we fetch your printing subscription status</p>
      </div>
    );
  }

  // Connection Error layout
  if (subStatus.error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-6 text-center select-none">
        <span className="text-4xl mb-3">⚠️</span>
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest leading-none">Connection Error</h3>
        <p className="text-xs text-slate-500 max-w-[240px] mt-2.5 leading-relaxed">{subStatus.error}</p>
        <button
          onClick={fetchStatusAndData}
          className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-md cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Paywall Layout
  if (!subStatus.eligible && subStatus.reason === 'no_active_subscription') {
    return (
      <div className="flex flex-col h-full bg-slate-50 select-none overflow-y-auto">
        {/* Header */}
        <div className="bg-slate-900 pt-6 pb-5 px-5 text-white shrink-0 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="https://cdn-icons-png.flaticon.com/512/15774/15774758.png"
                alt="POS Terminal Icon"
                className="w-5 h-5 object-contain filter brightness-110 saturate-100"
                referrerPolicy="no-referrer"
              />
              <h1 className="text-base font-black tracking-tight text-left">Print Recharge Cards</h1>
            </div>
            <button
              onClick={() => onNavigate('home')}
              className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm cursor-pointer hover:bg-slate-700 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-grow flex flex-col justify-between max-w-md mx-auto w-full space-y-6 pb-12 animate-fade-in text-left">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-sm border border-blue-100">
              🖨️
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-black text-slate-900 leading-tight">Choose a Plan to Start Printing</h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto text-center">
                GigUp recharge card printing is a premium service. Activate a plan below to instantly generate, brand, and print PINs.
              </p>
            </div>

            {/* Plans List */}
            <div className="space-y-4 pt-2">
              {/* Weekly Plan */}
              <div className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm space-y-4 relative overflow-hidden hover:border-blue-300 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Weekly Pass</span>
                    <h3 className="text-2xl font-black text-slate-800 mt-2 font-mono">₦5,500<span className="text-xs text-slate-400 font-bold"> /wk</span></h3>
                  </div>
                  <span className="text-2xl">⚡</span>
                </div>
                <div className="space-y-2 text-xs text-slate-600 font-semibold border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-black">✓</span>
                    <span>5 batch orders per day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-black">✓</span>
                    <span>Up to {subStatus.max_cards_per_batch || 100} cards per batch</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-black">✓</span>
                    <span>Custom merchant name branding</span>
                  </div>
                </div>
                <button
                  disabled={subscribing}
                  onClick={() => handleSubscribe('weekly')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white font-extrabold rounded-2xl text-xs cursor-pointer shadow-lg shadow-blue-500/10 transition active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {subscribing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Subscribe Weekly</span>
                  )}
                </button>
              </div>

              {/* Monthly Plan */}
              <div className="bg-white rounded-3xl p-5 border-2 border-blue-300 shadow-sm space-y-4 relative overflow-hidden hover:border-blue-400 transition">
                <div className="absolute top-0 right-0 bg-gradient-to-l from-green-500 to-emerald-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-sm">
                  SAVE 24%
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Monthly Pass</span>
                    <h3 className="text-2xl font-black text-slate-800 mt-2 font-mono">₦18,000<span className="text-xs text-slate-400 font-bold"> /mo</span></h3>
                  </div>
                  <span className="text-2xl">🏆</span>
                </div>
                <div className="space-y-2 text-xs text-slate-600 font-semibold border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-black">✓</span>
                    <span>20 batch orders per day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-black">✓</span>
                    <span>Up to {subStatus.max_cards_per_batch || 100} cards per batch</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-black">✓</span>
                    <span>Custom merchant name branding</span>
                  </div>
                </div>
                <button
                  disabled={subscribing}
                  onClick={() => handleSubscribe('monthly')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white font-extrabold rounded-2xl text-xs cursor-pointer shadow-lg shadow-blue-500/10 transition active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {subscribing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Subscribe Monthly</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Skeletal template when loading options inside eligible state
  if (loadingOptions) {
    return (
      <div className="flex flex-col h-full bg-slate-50 select-none">
        {/* Header */}
        <div className="bg-slate-900 pt-5 pb-4 px-5 text-white shrink-0 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img
                src="https://cdn-icons-png.flaticon.com/512/15774/15774758.png"
                alt="POS Terminal Icon"
                className="w-5 h-5 object-contain filter brightness-110 saturate-100"
                referrerPolicy="no-referrer"
              />
              <h1 className="text-base font-black tracking-tight text-left">Print Recharge Cards</h1>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-full px-3 py-1">
              <span className="text-[10px] text-amber-400 font-black font-mono">₦{(user.wallet_balance || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-4 animate-pulse">
          <div className="bg-white rounded-3xl p-6 h-32 border border-slate-100" />
          <div className="bg-white rounded-3xl p-6 h-48 border border-slate-100" />
          <div className="bg-white rounded-3xl p-6 h-24 border border-slate-100" />
        </div>
      </div>
    );
  }

  const isDailyLimitReached = !subStatus.eligible && subStatus.reason === 'daily_limit_reached';

  return (
    <div className="flex flex-col h-full bg-slate-50 relative select-none">
      {/* Header */}
      <div className="bg-slate-900 pt-5 pb-4 px-5 text-white shrink-0 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img
              src="https://cdn-icons-png.flaticon.com/512/15774/15774758.png"
              alt="POS Terminal Icon"
              className="w-5 h-5 object-contain filter brightness-110 saturate-100"
              referrerPolicy="no-referrer"
            />
            <h1 className="text-base font-black tracking-tight text-left">Print Recharge Cards</h1>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-full px-3 py-1 flex items-center gap-1.5">
            <span className="text-[9px] text-slate-400 font-bold uppercase">Balance</span>
            <span className="text-xs font-black text-amber-400 font-mono">
              ₦{(user.wallet_balance || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 gap-1 bg-slate-800 p-1 rounded-2xl border border-slate-700">
          <button
            onClick={() => setActiveTab('order')}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'order' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            New Order
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            History Log
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-grow overflow-hidden relative">
        <PullToRefresh onRefresh={handleRefresh}>
          {activeTab === 'order' ? (
            <div className="p-4 space-y-4 pb-32">
              
              {/* Daily limit / Subscription info banner */}
              {isDailyLimitReached ? (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-4 text-left">
                  <p className="text-xs font-bold text-amber-700">
                    Daily limit reached ({subStatus.batches_used_today}/{subStatus.daily_batch_limit}). Resets tomorrow.
                  </p>
                </div>
              ) : subStatus.eligible ? (
                <div className="flex items-center gap-2 mb-3 text-left">
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                    {subStatus.plan_type} plan · {subStatus.batches_remaining_today}/{subStatus.daily_batch_limit} batches left today
                  </span>
                </div>
              ) : null}

              {/* Step 1: Network Selector */}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1">
                    Step 1: Network Operator
                  </span>
                  {selectedNetwork && (
                    <span className="text-[10px] font-black uppercase text-blue-500 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                      Selected: {selectedNetwork}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(options?.networks || []).map((net) => {
                    const isSelected = selectedNetwork.toUpperCase() === net.network.toUpperCase();
                    const netKey = net.network.toUpperCase();
                    const meta = NETWORK_META[netKey] || { logo: net.network_label, color: 'bg-indigo-600 text-white border-indigo-700', bg: 'bg-indigo-100 text-indigo-700 border-indigo-200' };

                    return (
                      <button
                        key={net.network}
                        onClick={() => handleNetworkSelect(net.network)}
                        className={`py-3.5 px-1.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                          isSelected
                            ? `${meta.color} shadow-md scale-[1.03] font-extrabold border-2`
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shadow-sm ${
                          isSelected ? 'bg-white/20' : 'bg-slate-100'
                        }`}>
                          {meta.logo[0]}
                        </span>
                        <span className="text-[10px] font-bold">{net.network_label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Denomination Selector */}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-3 text-left">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1 block">
                  Step 2: Denomination value
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {activeDenominations.map((denom) => {
                    const isSelected = selectedDenom === denom.face_value;
                    return (
                      <button
                        key={denom.face_value}
                        onClick={() => setSelectedDenom(denom.face_value)}
                        className={`p-4 rounded-2xl border transition-all text-left relative overflow-hidden cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/15'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-mono font-extrabold text-lg leading-none">
                          ₦{denom.face_value}
                        </div>
                        <div className={`text-[10px] mt-1.5 font-semibold ${
                          isSelected ? 'text-blue-100' : 'text-slate-500'
                        }`}>
                          Cost: ₦{denom.price_per_card} per pin
                        </div>
                        <div className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full absolute top-2.5 right-2.5 ${
                          isSelected ? 'bg-blue-500/50 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          Face Value
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Quantity Stepper */}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-3 text-left">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1 block">
                  Step 3: Print Volume / Quantity
                </span>
                
                <div className="flex items-center gap-4 justify-center bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <button
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-11 h-11 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-black text-lg cursor-pointer transition active:scale-95 disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="text-2xl font-mono font-black w-14 text-center text-slate-800">
                    {quantity}
                  </span>
                  <button
                    disabled={quantity >= maxQty}
                    onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                    className="w-11 h-11 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-black text-lg cursor-pointer transition active:scale-95 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 mt-3 text-left">
                  <p className="text-sm font-black text-blue-700 flex items-center gap-1.5 justify-between">
                    <span>Summary quote:</span>
                    <span className="font-mono">
                      {quantity} cards × ₦{currentPricePerCard} = ₦{currentTotalCost.toLocaleString()}
                    </span>
                  </p>
                </div>
              </div>

              {/* Step 4: Brand Name (optional) */}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-3 text-left">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1 block">
                  Step 4: Card Customizer Branding
                </span>
                <div>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="Brand name to print on cards (optional)"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-2 px-1">
                    Leave blank to use "GigUp". This name will print directly above the PIN voucher.
                  </p>
                </div>
              </div>

              {/* Step 5: Review & Print Button */}
              <button
                disabled={isDailyLimitReached}
                onClick={() => {
                  setPin('');
                  setShowPinConfirmModal(true);
                }}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-black rounded-2xl text-sm cursor-pointer disabled:opacity-50 transition active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <img
                  src="https://cdn-icons-png.flaticon.com/512/15774/15774758.png"
                  alt="POS Terminal Icon"
                  className="w-4 h-4 object-contain brightness-0 invert"
                  referrerPolicy="no-referrer"
                />
                <span>Review & Print</span>
              </button>

            </div>
          ) : (
            /* History Tab */
            <div className="p-4 space-y-4 pb-32 text-left">
              
              {/* Filters */}
              <div className="flex gap-2 pb-1 overflow-x-auto scrollbar-none">
                {(['all', 'success', 'failed'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setHistoryFilter(filter)}
                    className={`px-4 py-2 rounded-full text-[10px] font-extrabold uppercase transition cursor-pointer border ${
                      historyFilter === filter
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Order Rows */}
              {loadingHistory ? (
                <div className="space-y-3 animate-pulse">
                  <div className="bg-white rounded-2xl h-20 border border-slate-100" />
                  <div className="bg-white rounded-2xl h-20 border border-slate-100" />
                  <div className="bg-white rounded-2xl h-20 border border-slate-100" />
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 flex flex-col items-center justify-center min-h-[200px] shadow-sm">
                  <span className="text-4xl mb-3">📭</span>
                  <h6 className="text-xs font-bold text-slate-800 uppercase">No Orders Found</h6>
                  <p className="text-[11px] text-slate-400 max-w-[200px] mt-1 leading-relaxed">
                    No recharge card printing batches recorded under this filter yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  {filteredHistory.map((order) => {
                    const statusInfo = getStatusBadge(order.status);
                    const netKey = order.network.toUpperCase();
                    const meta = NETWORK_META[netKey] || { logo: order.network[0], bg: 'bg-slate-100 text-slate-700 border-slate-200' };

                    return (
                      <div
                        key={order.id}
                        onClick={() => handleViewBatchDetail(order)}
                        className={`bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between transition cursor-pointer hover:border-slate-200 hover:shadow-md ${
                          loadingDetailId === order.id ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border uppercase ${meta.bg}`}>
                            {meta.logo[0]}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-800">{order.network} ₦{order.face_value || order.denomination || 100}</span>
                              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ${statusInfo.style}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Qty: {order.quantity_ordered || order.quantity || 1} cards · Ref: {order.id.slice(0, 8)}
                            </span>
                            <span className="text-[9px] text-slate-400 block font-medium mt-0.5">
                              {new Date(order.created_at || order.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          <div className="text-right">
                            <span className="text-xs font-extrabold font-mono text-slate-800 block">
                              ₦{(order.total_charged || order.totalCost || 0).toLocaleString()}
                            </span>
                            {loadingDetailId === order.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin ml-auto mt-1" />
                            ) : (
                              <span className="text-[8px] font-bold text-blue-600">
                                Tap to view PINs
                              </span>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}
        </PullToRefresh>
      </div>

      {/* Review & PIN Confirmation Modal */}
      {showPinConfirmModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 text-slate-800 select-none text-left"
          >
            <h3 className="text-lg font-black text-slate-900 mb-3 text-left">Confirm Your Order</h3>
            <div className="bg-slate-50 rounded-2xl p-4 mb-4 space-y-2 border border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-bold">Network</span>
                <span className="font-extrabold text-slate-800">{selectedNetwork}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-bold">Denomination</span>
                <span className="font-extrabold text-slate-800">₦{selectedDenom} x {quantity}</span>
              </div>
              {brandName.trim() && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-bold">Branding</span>
                  <span className="font-extrabold text-blue-600">{brandName}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                <span className="text-slate-500 font-bold">Total Cost</span>
                <span className="font-black text-blue-600 text-base font-mono">₦{currentTotalCost.toLocaleString()}</span>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 mb-2 text-center font-bold">Enter your 4-digit PIN to confirm</p>
            <LocalPinInput value={pin} onChange={setPin} />
            
            <button
              onClick={handleConfirmPurchase}
              disabled={pin.length !== 4 || isSubmitting}
              className="w-full py-3.5 bg-blue-600 text-white font-extrabold rounded-2xl text-sm mt-4 cursor-pointer disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Confirm & Print</span>
              )}
            </button>
            <button
              onClick={() => {
                setShowPinConfirmModal(false);
                setPin('');
              }}
              className="w-full py-2 text-slate-400 text-xs font-semibold mt-2 cursor-pointer text-center hover:text-slate-600"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}

      {/* Generated Cards Result Modal overlay */}
      {showOrderModal && activeOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl mb-2 max-h-[85vh] flex flex-col border border-slate-100 text-left"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-lg">
                  🎉
                </div>
                <div className="text-left">
                  <h3 className="text-base font-black text-slate-900 leading-none">Cards Ready!</h3>
                  <span className="text-[9px] font-bold text-slate-400 tracking-wide block mt-1 font-mono">
                    Ref: {activeOrder.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  setActiveOrder(null);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs cursor-pointer hover:bg-slate-200 transition"
              >
                ✕
              </button>
            </div>

            {/* Quick summary stats row */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-2xl p-3 mb-3 border border-slate-100 text-xs text-left shrink-0">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Denomination</span>
                <span className="text-slate-800 font-black">₦{activeOrder.denomination}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Quantity</span>
                <span className="text-slate-800 font-black">{activeOrder.quantity} card{activeOrder.quantity > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Ticket Scroller List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
              {activeOrder.cards.map((card, i) => (
                <RechargeCardTicket
                  key={i}
                  brandName={activeOrder.brandName || 'GigUp'}
                  network={activeOrder.network}
                  faceValue={activeOrder.denomination}
                  serial={card.serial}
                  pin={card.pin}
                  reference={activeOrder.id}
                  createdAt={activeOrder.date}
                />
              ))}
            </div>

            {/* Actions Side-by-Side buttons */}
            <div className="pt-3 border-t border-slate-100 mt-3 space-y-2 shrink-0 text-center">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCopyAll(activeOrder)}
                  className="py-3 bg-slate-100 text-slate-700 font-extrabold rounded-2xl text-xs cursor-pointer transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  📋 Copy All
                </button>
                <button
                  onClick={() => handleDownloadPDF(activeOrder)}
                  className="py-3 bg-blue-600 text-white font-extrabold rounded-2xl text-xs cursor-pointer transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  📄 Download PDF
                </button>
              </div>
              
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  setActiveOrder(null);
                }}
                className="w-full py-2.5 text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>

          </motion.div>
        </div>
      )}

      {/* Insufficient Balance / Shortfall Modal */}
      {shortfallAmount !== null && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4 text-left">
            <div className="text-center space-y-2">
              <span className="text-4xl">💰</span>
              <h3 className="text-base font-black text-slate-900">Insufficient Balance</h3>
              <p className="text-xs text-slate-500 leading-relaxed text-center">
                You need an additional <span className="font-mono font-bold text-red-500">₦{shortfallAmount.toLocaleString()}</span> to complete this order.
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-1.5 border border-slate-100">
              <div className="flex justify-between">
                <span>Wallet Balance:</span>
                <span className="font-mono text-slate-800">₦{(user.wallet_balance || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-red-500 font-bold">
                <span>Shortfall:</span>
                <span className="font-mono">₦{shortfallAmount.toLocaleString()}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2 text-center">
              <button
                onClick={() => setShortfallAmount(null)}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShortfallAmount(null);
                  onNavigate('wallet');
                }}
                className="py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl text-xs cursor-pointer text-center"
              >
                Fund Wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
