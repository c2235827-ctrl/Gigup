import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Plus, Minus, Copy, Share2, CheckCircle, History, Sparkles, X, ChevronRight } from 'lucide-react';
import { User } from '../types';
import PullToRefresh from './PullToRefresh';

interface RechargeCardProps {
  user: User;
  onNavigate: (screen: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
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
  status: 'success' | 'failed';
  date: string;
  cards: CardPINInfo[];
}

// Generate realistic dummy PINs and Serials
const generateDummyCards = (qty: number): CardPINInfo[] => {
  const cards: CardPINInfo[] = [];
  for (let i = 0; i < qty; i++) {
    const pin = Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join('');
    const serial = 'SN' + Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join('');
    cards.push({ pin, serial });
  }
  return cards;
};

// Initial History Dummy Data
const INITIAL_HISTORY: RechargeOrder[] = [
  {
    id: 'RC-8930495-GUP',
    network: 'MTN',
    denomination: 200,
    quantity: 5,
    brandName: 'Umar Ventures',
    totalCost: 1000,
    status: 'success',
    date: '2026-07-01T14:32:00.000Z',
    cards: [
      { pin: '482019385019283', serial: 'SN39401928471029' },
      { pin: '859201928471920', serial: 'SN85920192847101' },
      { pin: '102938475610293', serial: 'SN49102938475610' },
      { pin: '581029384756291', serial: 'SN38102938475620' },
      { pin: '940192847102938', serial: 'SN10293847561028' },
    ]
  },
  {
    id: 'RC-3810294-GUP',
    network: 'Airtel',
    denomination: 500,
    quantity: 2,
    brandName: 'GigUp',
    totalCost: 1000,
    status: 'success',
    date: '2026-06-29T10:15:00.000Z',
    cards: [
      { pin: '582019284758102', serial: 'SN48201928471029' },
      { pin: '930192847102938', serial: 'SN85910293847561' },
    ]
  },
  {
    id: 'RC-2910394-GUP',
    network: '9mobile',
    denomination: 100,
    quantity: 10,
    brandName: 'Alhaji Telecoms',
    totalCost: 1000,
    status: 'failed',
    date: '2026-06-25T18:44:00.000Z',
    cards: []
  }
];

export default function RechargeCard({ user, onNavigate, showToast }: RechargeCardProps) {
  const [activeTab, setActiveTab] = useState<'order' | 'history'>('order');
  
  // Selection State
  const [selectedNetwork, setSelectedNetwork] = useState<string>('MTN');
  const [selectedDenom, setSelectedDenom] = useState<number>(100);
  const [quantity, setQuantity] = useState<number>(1);
  const [brandName, setBrandName] = useState<string>('');
  
  // PIN Confirmation State
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // History states
  const [historyOrders, setHistoryOrders] = useState<RechargeOrder[]>(INITIAL_HISTORY);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'success' | 'failed'>('all');
  
  // Active viewing order details (e.g. for success screen or historic order popup)
  const [activeOrder, setActiveOrder] = useState<RechargeOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);

  const pricePerCard = selectedDenom; // dummy value = face value
  const totalCost = quantity * pricePerCard;

  // Handle Pin Digits Input
  const handlePinChange = (index: number, val: string) => {
    const rawVal = val.replace(/\D/g, '');
    if (!rawVal) {
      const newDigits = [...pinDigits];
      newDigits[index] = '';
      setPinDigits(newDigits);
      return;
    }

    const digit = rawVal[rawVal.length - 1];
    const newDigits = [...pinDigits];
    newDigits[index] = digit;
    setPinDigits(newDigits);

    // Focus next
    if (index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handleResetForm = () => {
    setSelectedNetwork('MTN');
    setSelectedDenom(100);
    setQuantity(1);
    setBrandName('');
    setPinDigits(['', '', '', '']);
    setActiveOrder(null);
    setShowOrderModal(false);
  };

  // Submit/Purchase Action
  const handlePurchase = () => {
    const enteredPin = pinDigits.join('');
    if (enteredPin.length < 4) {
      showToast('Please enter your 4-digit PIN to confirm purchase.', 'error');
      return;
    }

    // Verify wallet balance
    if (user.wallet_balance < totalCost) {
      showToast('Insufficient wallet balance to generate recharge cards.', 'error');
      return;
    }

    // Generate dummy cards
    const cards = generateDummyCards(quantity);
    const orderId = 'RC-' + Math.floor(1000000 + Math.random() * 9000000) + '-GUP';
    
    const newOrder: RechargeOrder = {
      id: orderId,
      network: selectedNetwork,
      denomination: selectedDenom,
      quantity,
      brandName: brandName.trim() || 'GigUp',
      totalCost,
      status: 'success',
      date: new Date().toISOString(),
      cards
    };

    // Prepend to history orders
    setHistoryOrders(prev => [newOrder, ...prev]);
    setActiveOrder(newOrder);
    setShowOrderModal(true);
    showToast(`Successfully generated ${quantity} recharge cards!`, 'success');

    // Reset PIN entry
    setPinDigits(['', '', '', '']);
  };

  // Copy PINs and Serials to clipboard
  const handleCopyCards = (order: RechargeOrder) => {
    if (!order.cards || order.cards.length === 0) return;

    let text = `⚡ ${order.network} Recharge Cards (₦${order.denomination})\n`;
    text += `Brand: ${order.brandName}\n`;
    text += `Qty: ${order.quantity} · Total: ₦${order.totalCost}\n`;
    text += `Ref: ${order.id}\n`;
    text += `Date: ${new Date(order.date).toLocaleDateString()}\n`;
    text += `=========================\n`;

    order.cards.forEach((card, index) => {
      text += `Card ${index + 1}:\n`;
      text += `PIN:    ${card.pin}\n`;
      text += `Serial: ${card.serial}\n`;
      text += `-------------------------\n`;
    });

    text += `Powered by GigUp`;

    navigator.clipboard.writeText(text);
    showToast('All recharge cards copied to clipboard! 📋', 'success');
  };

  // Share via WhatsApp
  const handleShareWhatsApp = (order: RechargeOrder) => {
    if (!order.cards || order.cards.length === 0) return;

    let text = `⚡ ${order.network} Recharge Cards (₦${order.denomination})\n`;
    text += `Brand: ${order.brandName}\n`;
    text += `Qty: ${order.quantity} · Total: ₦${order.totalCost}\n`;
    text += `Ref: ${order.id}\n`;
    text += `=========================\n`;

    order.cards.forEach((card, index) => {
      text += `PIN: ${card.pin} | SN: ${card.serial}\n`;
    });

    text += `\nPowered by GigUp`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    // Open safely in separate tab or try to copy
    navigator.clipboard.writeText(text);
    showToast('Formatted list copied to clipboard! Ready to share on WhatsApp.', 'success');
  };

  const handleRefresh = async () => {
    // Empty delay to mock pulling to refresh
    await new Promise(resolve => setTimeout(resolve, 800));
    showToast('Recharge card orders list up to date.', 'info');
  };

  const filteredHistory = historyOrders.filter(order => {
    if (historyFilter === 'all') return true;
    return order.status === historyFilter;
  });

  const networks = [
    { name: 'MTN', logo: 'MTN', color: 'bg-yellow-400 text-slate-900 border-yellow-500' },
    { name: 'GLO', logo: 'GLO', color: 'bg-green-600 text-white border-green-700' },
    { name: 'Airtel', logo: 'Airtel', color: 'bg-red-600 text-white border-red-700' },
    { name: '9mobile', logo: '9mobile', color: 'bg-teal-800 text-white border-teal-900' },
  ];

  const denominations = [100, 200, 300, 500];

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
            <h1 className="text-base font-black tracking-tight">Print Recharge Cards</h1>
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
              
              {/* Step 1: Network Selector */}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1">
                    Step 1: Network Operator
                  </span>
                  {selectedNetwork && (
                    <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full">
                      Selected: {selectedNetwork}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {networks.map((net) => {
                    const isSelected = selectedNetwork === net.name;
                    return (
                      <button
                        key={net.name}
                        onClick={() => setSelectedNetwork(net.name)}
                        className={`py-3.5 px-1.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                          isSelected
                            ? `${net.color} shadow-md scale-[1.03] font-extrabold border-2`
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shadow-sm ${
                          isSelected ? 'bg-white/20' : 'bg-slate-100'
                        }`}>
                          {net.logo[0]}
                        </span>
                        <span className="text-[10px] font-bold">{net.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Denomination Selector */}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-3">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1 block">
                  Step 2: Denomination value
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {denominations.map((denom) => {
                    const isSelected = selectedDenom === denom;
                    return (
                      <button
                        key={denom}
                        onClick={() => setSelectedDenom(denom)}
                        className={`p-4 rounded-2xl border transition-all text-left relative overflow-hidden cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/15'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-mono font-extrabold text-lg leading-none">
                          ₦{denom}
                        </div>
                        <div className={`text-[10px] mt-1 font-semibold ${
                          isSelected ? 'text-blue-100' : 'text-slate-500'
                        }`}>
                          Cost: ₦{denom} per pin
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
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-3">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1 block">
                  Step 3: Print Volume / Quantity
                </span>
                
                <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-3 border border-slate-150">
                  <button
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold hover:bg-slate-100 active:scale-95 disabled:opacity-40 cursor-pointer transition shadow-xs"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <div className="text-center">
                    <span className="text-2xl font-mono font-extrabold text-slate-800">
                      {quantity}
                    </span>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase mt-0.5">
                      {quantity === 1 ? 'Recharge card' : 'Recharge cards'}
                    </span>
                  </div>
                  <button
                    disabled={quantity >= 100}
                    onClick={() => setQuantity(prev => Math.min(100, prev + 1))}
                    className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold hover:bg-slate-100 active:scale-95 disabled:opacity-40 cursor-pointer transition shadow-xs"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100/50 rounded-xl p-3 text-xs">
                  <span className="text-slate-600 font-medium">Batch Total:</span>
                  <span className="text-blue-600 font-mono font-black text-sm">
                    ₦{totalCost.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Step 4: Optional Brand Name */}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-3">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1 block">
                  Step 4: Card Customizer Branding
                </span>
                <div>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="e.g. My Shop — leave blank to use GigUp"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-2xl px-4 py-3.5 text-sm placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-2 px-1">
                    This name will be printed directly above the PIN voucher code. Max 20 chars.
                  </p>
                </div>
              </div>

              {/* Step 5: PIN Entry Box */}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-3">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1 block">
                  Step 5: Authorization Security
                </span>
                <p className="text-[11px] text-slate-500 font-medium px-1">
                  Enter your 4-digit PIN to confirm this wallet transaction.
                </p>

                <div className="flex justify-center gap-3.5 py-2">
                  {pinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={pinRefs[idx]}
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(idx, e)}
                      className="w-12 h-12 text-center bg-slate-50 border border-slate-200 text-slate-800 text-xl font-extrabold font-mono rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all shadow-inner"
                    />
                  ))}
                </div>
              </div>

              {/* Step 6: Summary + Action Button */}
              <div className="bg-slate-900 rounded-3xl p-5 text-white border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                  <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                    Transaction Order Summary
                  </span>
                </div>

                <div className="space-y-2 text-xs font-semibold text-slate-300">
                  <div className="flex justify-between">
                    <span>Network Brand:</span>
                    <span className="text-white font-black">{selectedNetwork}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Denomination:</span>
                    <span className="text-white font-black">₦{selectedDenom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quantity Requested:</span>
                    <span className="text-white font-black">{quantity} unit(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Print Label Brand:</span>
                    <span className="text-white font-black">{brandName.trim() || 'GigUp'}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 text-sm">
                    <span className="text-amber-400 font-extrabold">Final Charge:</span>
                    <span className="text-amber-400 font-mono font-black">
                      ₦{totalCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePurchase}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-extrabold tracking-wider shadow-lg shadow-blue-500/15 cursor-pointer active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/15774/15774758.png"
                    alt="POS Terminal Icon"
                    className="w-4 h-4 object-contain brightness-0 invert"
                    referrerPolicy="no-referrer"
                  />
                  <span>PRINT RECHARGE CARDS</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center leading-none">
                  Cards are generated instantly after payment
                </p>
              </div>

            </div>
          ) : (
            /* History Tab */
            <div className="p-4 space-y-4 pb-32">
              
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
              {filteredHistory.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 flex flex-col items-center justify-center min-h-[200px] shadow-sm">
                  <span className="text-4xl mb-3">📭</span>
                  <h6 className="text-xs font-bold text-slate-800 uppercase">No Orders Found</h6>
                  <p className="text-[11px] text-slate-400 max-w-[200px] mt-1 leading-relaxed">
                    No recharge card printing batches recorded under this filter yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map((order) => {
                    const isSuccess = order.status === 'success';
                    return (
                      <div
                        key={order.id}
                        onClick={() => {
                          if (isSuccess) {
                            setActiveOrder(order);
                            setShowOrderModal(true);
                          } else {
                            showToast('This order failed. No pins were generated.', 'error');
                          }
                        }}
                        className={`bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between transition cursor-pointer hover:border-slate-200 hover:shadow-md ${
                          isSuccess ? '' : 'opacity-85'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border ${
                            order.network === 'MTN' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                            order.network === 'GLO' ? 'bg-green-100 text-green-700 border-green-200' :
                            order.network === 'Airtel' ? 'bg-red-100 text-red-700 border-red-200' :
                            'bg-teal-100 text-teal-700 border-teal-200'
                          }`}>
                            {order.network[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-800">{order.network} ₦{order.denomination}</span>
                              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ${
                                isSuccess ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                              }`}>
                                {isSuccess ? 'Success' : 'Failed'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Qty: {order.quantity} cards · Ref: {order.id.slice(3, 10)}
                            </span>
                            <span className="text-[9px] text-slate-400 block font-medium mt-0.5">
                              {new Date(order.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          <div className="text-right">
                            <span className="text-xs font-extrabold font-mono text-slate-800 block">
                              ₦{order.totalCost.toLocaleString()}
                            </span>
                            {isSuccess && (
                              <span className="text-[8px] font-bold text-blue-600">
                                Tap to view PINs
                              </span>
                            )}
                          </div>
                          {isSuccess && <ChevronRight className="w-4 h-4 text-slate-400" />}
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

      {/* Generated Cards Result Modal overlay */}
      {showOrderModal && activeOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl mb-2 max-h-[85vh] flex flex-col border border-slate-100"
          >
            {/* Success checkmark banner */}
            <div className="flex justify-between items-start mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-lg">
                  🎉
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-none">Cards Generated</h3>
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
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm cursor-pointer hover:bg-slate-200 transition"
              >
                ✕
              </button>
            </div>

            {/* Receipt Summary card */}
            <div className="bg-slate-50 rounded-2xl p-3 text-xs font-semibold text-slate-600 mb-4 shrink-0 border border-slate-100 grid grid-cols-2 gap-y-2 gap-x-1.5">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Network operator</span>
                <span className="text-slate-800 font-black">{activeOrder.network}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Denomination</span>
                <span className="text-slate-800 font-black">₦{activeOrder.denomination}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Quantity generated</span>
                <span className="text-slate-800 font-black">{activeOrder.quantity} units</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Total Charged</span>
                <span className="text-emerald-600 font-black font-mono">₦{activeOrder.totalCost.toLocaleString()}</span>
              </div>
              <div className="col-span-2 border-t border-slate-200/60 pt-2 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 uppercase font-bold">Print Tag Name:</span>
                <span className="text-blue-600 font-extrabold">{activeOrder.brandName}</span>
              </div>
            </div>

            {/* Cards Scroller list */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block pl-1">
                PIN & Serial Codes
              </span>
              {activeOrder.cards.map((card, idx) => (
                <div key={idx} className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-3.5 relative overflow-hidden shadow-xs hover:border-slate-300 transition">
                  {/* Decorative cut-outs on sides */}
                  <div className="absolute top-1/2 -left-2.5 w-4 h-4 bg-slate-50 border border-slate-200 rounded-full" />
                  <div className="absolute top-1/2 -right-2.5 w-4 h-4 bg-slate-50 border border-slate-200 rounded-full" />
                  
                  <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Card #{idx + 1}</span>
                    <span className="text-[9px] bg-slate-100 text-slate-600 font-extrabold px-2 py-0.5 rounded-full border border-slate-150 uppercase tracking-wide">
                      {activeOrder.network}
                    </span>
                  </div>

                  <div className="space-y-1.5 font-mono text-xs px-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-semibold text-[11px]">PIN:</span>
                      <span className="text-slate-800 font-extrabold tracking-wide text-[13px] font-mono select-all">
                        {card.pin}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-slate-400 font-semibold">Serial:</span>
                      <span className="text-slate-500 font-medium font-mono">
                        {card.serial}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions Footer */}
            <div className="pt-4 mt-3 border-t border-slate-100 space-y-2 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCopyCards(activeOrder)}
                  className="py-3 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy All</span>
                </button>
                <button
                  onClick={() => handleShareWhatsApp(activeOrder)}
                  className="py-3 bg-green-600 hover:bg-green-500 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
              </div>
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  setActiveOrder(null);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl text-xs cursor-pointer text-center"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
