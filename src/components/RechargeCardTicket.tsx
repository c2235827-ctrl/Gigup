import React from 'react';

interface RechargeCardTicketProps {
  brandName: string;
  network: string;
  faceValue: number;
  serial: string;
  pin: string;
  reference: string;
  createdAt: string;
}

const NETWORK_STYLES: Record<string, { bg: string; logoColor: string; logoText: string }> = {
  MTN: { bg: 'bg-yellow-50', logoColor: 'bg-yellow-400', logoText: 'MTN' },
  GLO: { bg: 'bg-green-50', logoColor: 'bg-green-500', logoText: 'glo' },
  AIRTEL: { bg: 'bg-red-50', logoColor: 'bg-red-500', logoText: 'airtel' },
  '9MOBILE': { bg: 'bg-purple-50', logoColor: 'bg-emerald-600', logoText: '9' },
};

export const RechargeCardTicket: React.FC<RechargeCardTicketProps> = ({ brandName, network, faceValue, serial, pin, reference, createdAt }) => {
  const formattedPin = pin.replace(/(.{4})/g, '$1-').replace(/-$/, '');
  const dialCode = `*311*${pin}#`;
  const formattedDate = new Date(createdAt).toLocaleString('en-NG', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const style = NETWORK_STYLES[network] ?? NETWORK_STYLES.MTN;

  return (
    <div className={`${style.bg} rounded-md px-4 py-3 font-serif border border-slate-200 shadow-sm text-left`}>
      {/* Brand + Ref combined on one line (matches real card format) + price/logo top right */}
      <div className="flex justify-between items-start">
        <p className="text-sm font-bold text-slate-800">
          {brandName}{reference ? `; ${reference}` : ''}
        </p>
        <div className="flex items-center gap-1.5 -mt-1 shrink-0">
          <span className="text-xl font-black text-slate-800">₦{faceValue}</span>
          <div className={`${style.logoColor} w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-xs`}>
            <span className="text-white text-[9px] font-black lowercase leading-none">{style.logoText}</span>
          </div>
        </div>
      </div>

      {/* S/N, PIN, Dial, Date - stacked exactly like the physical strip */}
      <div className="mt-1.5 space-y-0.5 text-[13px] text-slate-700 leading-snug">
        <p>S/N: {serial}</p>
        <p className="text-lg font-black text-slate-900 tracking-wide py-0.5">{formattedPin}</p>
        <p className="italic text-slate-600">Dial {dialCode}</p>
        <p className="text-slate-500 text-[10px] italic mt-1">Date: {formattedDate}</p>
      </div>
    </div>
  );
};

export default RechargeCardTicket;
