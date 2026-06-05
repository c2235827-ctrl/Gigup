import { Check, X, RefreshCw, ArrowLeft, Share2, Copy, AlertCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface ReceiptViewProps {
  onClose: () => void;
  params: any;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNavigate?: (screenName: string, extras?: any) => void;
}

export default function ReceiptView({ onClose, params, showToast, onNavigate }: ReceiptViewProps) {
  const [copiedId, setCopiedId] = useState<'order' | 'receipt' | null>(null);

  if (!params) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-primary-dark">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <h4 className="font-extrabold text-lg">Receipt Data Error</h4>
        <p className="text-text-muted text-xs mt-1">Unable to load the transaction receipt details.</p>
        <button
          onClick={onClose}
          className="mt-6 bg-primary-blue text-white font-bold text-xs px-6 py-3 rounded-full cursor-pointer select-none border-none"
        >
          Close & Return Home
        </button>
      </div>
    );
  }

  const {
    status = 'success',
    network = 'MTN',
    plan_name = 'Data Bundle',
    recipient_phone = '08000000000',
    amount = 0,
    id = 'N/A',
    receiptId = 'N/A',
    date = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    reason = '',
    cashback = 0,
    bonus_used = 0,
  } = params;

  const handleCopy = (text: string, type: 'order' | 'receipt') => {
    navigator.clipboard.writeText(text);
    setCopiedId(type);
    showToast(`${type === 'order' ? 'Order ID' : 'Receipt ID'} copied to clipboard 📋`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Theme support for different mobile networks
  const getNetworkColor = (net: string) => {
    const n = net.toUpperCase();
    if (n.includes('MTN')) return { dot: 'bg-amber-400', border: 'border-amber-100', text: 'text-amber-700', bg: 'bg-amber-50' };
    if (n.includes('GLO')) return { dot: 'bg-emerald-500', border: 'border-emerald-100', text: 'text-emerald-700', bg: 'bg-emerald-50' };
    return { dot: 'bg-rose-500', border: 'border-rose-100', text: 'text-rose-700', bg: 'bg-rose-50' };
  };

  const netTheme = getNetworkColor(network);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-primary-dark select-none pb-safe">
      {/* Pristine Full Page Header */}
      <header className="h-14 bg-white border-b border-gray-150/80 flex items-center justify-between px-5 shrink-0 z-40">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-slate-500 hover:text-primary-dark cursor-pointer font-bold text-xs select-none bg-transparent border-none p-2 rounded-xl transition hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Home</span>
        </button>
        <span className="font-extrabold text-[#111827] text-xs uppercase tracking-widest">Transaction Statement</span>
        <button
          onClick={() => {
            const shareText = `GigUp Statement: ${network} ${plan_name} (${recipient_phone}) - Amount: ₦${amount.toLocaleString()} - Status: ${status.toUpperCase()} - Order ID: ${id}`;
            if (navigator.share) {
              navigator.share({ title: 'GigUp Receipt', text: shareText }).catch(() => {});
            } else {
              navigator.clipboard.writeText(shareText);
              showToast('Receipt description copied to clipboard! 📄', 'success');
            }
          }}
          className="p-2 rounded-xl text-slate-500 hover:text-primary-dark cursor-pointer transition hover:bg-slate-50 bg-transparent border-none"
          title="Share Receipt"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-grow overflow-y-auto px-5 py-6 flex flex-col items-center">
        {/* Full Viewport Receipt Card */}
        <div className="bg-white rounded-[28px] border border-slate-150 shadow-[0_4px_24px_rgba(0,0,0,0.03)] w-full max-w-sm p-6 flex flex-col space-y-6 relative overflow-hidden">
          
          {/* Subtle Decorative Arch */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary-blue via-violet-500 to-indigo-600 opacity-20" />

          {/* Large Centered Visual Status */}
          <div className="flex flex-col items-center pt-2">
            {status === 'success' ? (
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-4 border-emerald-400/20 flex items-center justify-center text-emerald-500 shadow-sm mb-3 animate-fade-in">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>
            ) : status === 'failed' ? (
              <div className="w-16 h-16 rounded-full bg-red-50 border-4 border-red-400/20 flex items-center justify-center text-red-500 shadow-sm mb-3 animate-fade-in">
                <X className="w-7 h-7 stroke-[3]" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-amber-50 border-4 border-amber-400/20 flex items-center justify-center text-amber-500 shadow-sm mb-3 animate-spin">
                <RefreshCw className="w-7 h-7 stroke-[3]" />
              </div>
            )}

            <div className={`text-[10px] px-3.5 py-1.5 uppercase font-black tracking-wider rounded-full ${
              status === 'success'
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/80'
                : status === 'failed'
                  ? 'bg-red-50 text-red-600 border border-red-100/80'
                  : 'bg-amber-50 text-amber-600 border border-amber-100/80'
            }`}>
              Transaction {status}
            </div>

            {/* Display Price */}
            <h1 className="text-3xl font-black text-slate-900 mt-4 font-mono tracking-tight">
              {amount === 0 ? (
                <span className="text-emerald-500">FREE BONUS</span>
              ) : (
                <span className={status === 'failed' ? 'text-gray-400 line-through' : 'text-slate-900'}>
                  ₦{amount.toLocaleString('en-US')}
                </span>
              )}
            </h1>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              {status === 'success' ? 'Successful VTU Dispersion' : status === 'failed' ? 'Failed VTU Dispersion' : 'Pending Dispersion'}
            </p>
          </div>

          {/* Receipt Items Display Panel */}
          <div className="relative bg-slate-50 rounded-2xl p-5 border border-slate-100 text-xs text-left space-y-4">
            
            {/* Notch Perforations */}
            <div className="absolute -left-3.5 top-[45%] w-5 h-5 bg-white border border-slate-100 rounded-full z-10" />
            <div className="absolute -right-3.5 top-[45%] w-5 h-5 bg-white border border-slate-100 rounded-full z-10" />
            <div className="absolute left-3 right-3 top-[45%] h-[1px] border-t border-dashed border-slate-200 pointer-events-none mt-2.5" />

            {/* Upper Section */}
            <div className="space-y-3 pb-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Mobile Network</span>
                <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${netTheme.dot}`} />
                  {network} Dynamic
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Data Bundle Type</span>
                <span className="font-black text-slate-800">{plan_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Recipient Number</span>
                <span className="font-bold text-slate-800 font-mono bg-white px-2 py-0.5 rounded border border-slate-150">
                  {recipient_phone}
                </span>
              </div>
            </div>

            {/* Lower Section */}
            <div className="space-y-3 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Actual Charges</span>
                <span className={`font-black font-mono ${status === 'failed' ? 'text-gray-400 line-through' : 'text-slate-800'}`}>
                  {amount === 0 ? '₦0 (Bonus Promotion)' : `₦${amount.toLocaleString('en-US')}`}
                </span>
              </div>

              {/* Welcome Bonus Used if Success */}
              {status === 'success' && bonus_used > 0 && (
                <div className="flex justify-between items-center p-2 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-amber-850 font-extrabold flex items-center gap-1.5 select-none">
                    🎁 Welcome Bonus Used
                  </span>
                  <span className="font-extrabold text-[#D97706] font-mono text-[11.5px]">
                    ₦{bonus_used.toLocaleString('en-US')}
                  </span>
                </div>
              )}

              {/* Failure Reason if Failed */}
              {status === 'failed' && (
                <div className="flex flex-col gap-1.5 pt-1 pb-1">
                  <span className="text-slate-500 font-medium">Reason for Decline</span>
                  <div className="font-bold text-red-600 bg-red-50/70 border border-red-100 rounded-xl p-3 leading-relaxed text-[11px] flex gap-1.5 items-start">
                    <span className="text-red-500 select-none mt-0.5">⚠️</span>
                    <span>
                      {reason || 'Payment rejected or declined by the vtu gateway due to lack of provider response or limit controls.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Earned Cashback if Success */}
              {status === 'success' && cashback > 0 && (
                <div className="flex justify-between items-center p-2 bg-[#FEF3C7] border border-amber-200 rounded-xl">
                  <span className="text-amber-800 font-extrabold flex items-center gap-1 select-none">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-300" />
                    Instant Cashback
                  </span>
                  <span className="font-black text-[#D97706] font-mono text-sm">
                    +₦{cashback.toLocaleString('en-US')}
                  </span>
                </div>
              )}

              {/* Ref Details */}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Order ID</span>
                <button
                  onClick={() => handleCopy(id, 'order')}
                  className="font-bold text-slate-700 hover:text-primary-blue font-mono text-[10.5px] bg-white hover:bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition select-none"
                >
                  <span>{id}</span>
                  <Copy className="w-2.5 h-2.5 opacity-60" />
                </button>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Receipt ID</span>
                <button
                  onClick={() => handleCopy(receiptId, 'receipt')}
                  className="font-bold text-slate-700 hover:text-primary-blue font-mono text-[10.5px] bg-white hover:bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition select-none"
                >
                  <span>{receiptId}</span>
                  <Copy className="w-2.5 h-2.5 opacity-60" />
                </button>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Dispatch Date</span>
                <span className="font-bold text-slate-700 font-mono text-[11px]">
                  {date}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-[9.5px] text-slate-400 text-center leading-normal">
              For queries contact our live helpdesk.<br />
              <b>Support line: 09064704370</b>
            </p>
          </div>
        </div>

        {/* Full Viewport Action Buttons */}
        <div className="w-full max-w-sm mt-5 space-y-2.5">
          {status === 'failed' && (
            reason.toLowerCase().includes('insufficient') ||
            reason.toLowerCase().includes('please fund') ? (
              <button
                id="receipt-fund-wallet-btn"
                onClick={() => {
                  onClose();
                  if (onNavigate) onNavigate('wallet');
                }}
                className="w-full bg-[#F59E0B] hover:bg-[#F59E0B]/95 text-primary-dark font-extrabold rounded-2xl py-4 text-xs shadow-md cursor-pointer select-none text-center active:scale-[0.98] transition border-none"
              >
                Go to Wallet Top-up 💳
              </button>
            ) : (
              <button
                id="receipt-retry-vtu-btn"
                onClick={() => {
                  onClose();
                  if (onNavigate) onNavigate('buy_data', { network });
                }}
                className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white font-extrabold rounded-2xl py-4 text-xs shadow-md cursor-pointer select-none text-center active:scale-[0.98] transition border-none"
              >
                Retry Purchase 🔄
              </button>
            )
          )}

          <button
            id="receipt-home-done-btn"
            onClick={onClose}
            className="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-black rounded-2xl py-4 text-xs shadow-md cursor-pointer select-none text-center active:scale-[0.98] transition border-none"
          >
            Done — Back to Feed
          </button>
        </div>
      </div>
    </div>
  );
}
