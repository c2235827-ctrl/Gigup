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

// Black/dark badge style matching real physical recharge cards (MTN card reference)
const NETWORK_LOGOS: Record<string, { bg: string; text: string; label: string }> = {
  MTN: { bg: 'bg-black', text: 'text-yellow-400', label: 'MTN' },
  GLO: { bg: 'bg-black', text: 'text-green-500', label: 'glo' },
  AIRTEL: { bg: 'bg-black', text: 'text-red-500', label: 'airtel' },
  '9MOBILE': { bg: 'bg-black', text: 'text-white', label: '9mobile' },
};

// Shorten any long reference/UUID to a readable short code (e.g. first 8 chars, uppercased)
function shortenReference(ref: string): string {
  if (!ref) return '';
  // If it looks like a UUID (has dashes and is long), take only the first segment
  const cleaned = ref.replace(/^RC-/, '');
  const short = cleaned.split('-')[0];
  return short.slice(0, 8).toUpperCase();
}

export const RechargeCardTicket: React.FC<RechargeCardTicketProps> = ({ brandName, network, faceValue, serial, pin, reference, createdAt }) => {
  const formattedPin = pin.replace(/(.{4})/g, '$1-').replace(/-$/, '');
  const dialCode = `*311*${pin}#`;
  const formattedDate = new Date(createdAt).toLocaleString('en-NG', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const logo = NETWORK_LOGOS[network] ?? NETWORK_LOGOS.MTN;
  const shortRef = shortenReference(reference);

  return (
    <div className="bg-slate-50 rounded-md px-4 py-3 font-serif border border-slate-200 shadow-sm text-left">
      <div className="flex justify-between items-start">
        <p className="text-sm font-bold text-slate-800">
          {brandName}{shortRef ? `; ${shortRef}` : ''}
        </p>
        <div className="flex items-center gap-1.5 -mt-1 shrink-0">
          <span className="text-xl font-black text-slate-800">₦{faceValue}</span>
          {/* Black badge logo, matching real physical card style */}
          <div className={`${logo.bg} px-1.5 py-0.5 rounded inline-flex items-center justify-center shrink-0`}>
            <span className={`${logo.text} text-[8px] font-black leading-none whitespace-nowrap`}>{logo.label}</span>
          </div>
        </div>
      </div>
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
