import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, Gift, RefreshCw } from 'lucide-react';
import { getCheckinStatus, doCheckin, redeemVoucher } from '../api';
import { CheckinStatus, CheckinDay } from '../types';

interface CheckinScreenProps {
  user: any;
  showToast: (msg: string, type: string) => void;
  onNavigate: (screen: string) => void;
}

const VOUCHER_TIERS = [
  { points: 100, value: 50 },
  { points: 200, value: 100 },
  { points: 300, value: 200 },
  { points: 400, value: 350 },
  { points: 500, value: 500 },
];

export default function CheckinScreen({ user, showToast, onNavigate }: CheckinScreenProps) {
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState(false);

  const load = async () => {
    const token = localStorage.getItem('gigup_token');
    if (!token) return;
    setIsLoading(true);
    const result = await getCheckinStatus(token);
    if (result) setStatus(result);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCheckin = async () => {
    const token = localStorage.getItem('gigup_token');
    if (!token) return;
    setIsCheckingIn(true);
    const result = await doCheckin(token);
    if (result?.checkin_result?.success) {
      setCheckinSuccess(true);
      showToast('✅ Checked in! +10 points earned', 'success');
      await load();
      setTimeout(() => setCheckinSuccess(false), 3000);
    } else if (result?.checkin_result?.already_checked_in) {
      showToast('Already checked in today! Come back tomorrow 😊', 'info');
    }
    setIsCheckingIn(false);
  };

  const handleRedeem = async (points: number) => {
    const token = localStorage.getItem('gigup_token');
    if (!token) return;
    setIsRedeeming(true);
    const result = await redeemVoucher(token, points);
    if (result?.success) {
      showToast(`🎁 Voucher claimed! ₦${result.voucher_value} discount ready`, 'success');
      setShowRedeemModal(false);
      await load();
    } else {
      showToast(result?.message || 'Failed to redeem', 'error');
    }
    setIsRedeeming(false);
  };

  const totalPoints = status?.points?.total_points ?? 0;
  const cycleEnds = status?.cycle?.cycle_ends_in_days ?? 0;
  const checkedInCount = status?.cycle?.checked_in_count ?? 0;
  const alreadyCheckedIn = status?.already_checked_in_today ?? false;
  const activeVouchers = status?.vouchers ?? [];
  const days = status?.cycle?.days ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-[#F0F4FF] items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F0F4FF] overflow-y-auto pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-400 to-teal-500 px-5 pt-12 pb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <h1 className="text-white font-black text-xl mb-1">🎁 Daily Rewards</h1>
        <p className="text-emerald-100 text-sm">Check in every day, earn points, get discounts!</p>
        <div className="mt-4 bg-white/20 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Total Points</p>
            <p className="text-white font-black text-3xl">{totalPoints.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Cycle ends in</p>
            <p className="text-white font-black text-2xl">{cycleEnds} days</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">

        {/* Check-in success flash */}
        {checkinSuccess && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center"
          >
            <p className="text-2xl mb-1">✅</p>
            <p className="font-black text-green-700">Checked in! +10 points</p>
          </motion.div>
        )}

        {/* Calendar Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-black text-slate-900">Check-in Calendar</h2>
            <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg">
              {checkedInCount}/7 days
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            This cycle ends in {cycleEnds} day{cycleEnds !== 1 ? 's' : ''}
          </p>

          {/* Progress bar */}
          <div className="h-2 bg-slate-100 rounded-full mb-5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${(checkedInCount / 7) * 100}%` }}
            />
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {days.slice(0, 4).map((day: CheckinDay) => (
              <div key={day.date}
                className={`rounded-xl p-2 text-center border ${
                  day.checked_in ? 'bg-teal-50 border-teal-200' :
                  day.is_today ? 'bg-blue-50 border-blue-200' :
                  'bg-slate-50 border-slate-100'
                }`}
              >
                <p className={`text-[10px] font-bold mb-1.5 ${day.is_today ? 'text-primary-blue' : 'text-slate-500'}`}>
                  {day.day}
                </p>
                <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                  day.checked_in ? 'bg-teal-400' : 'bg-slate-200'
                }`}>
                  <Star className={`w-4 h-4 ${day.checked_in ? 'text-white fill-white' : 'text-slate-400'}`} />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {days.slice(4, 6).map((day: CheckinDay) => (
              <div key={day.date}
                className={`rounded-xl p-2 text-center border ${
                  day.checked_in ? 'bg-teal-50 border-teal-200' :
                  day.is_today ? 'bg-blue-50 border-blue-200' :
                  'bg-slate-50 border-slate-100'
                }`}
              >
                <p className={`text-[10px] font-bold mb-1.5 ${day.is_today ? 'text-primary-blue' : 'text-slate-500'}`}>
                  {day.day}
                </p>
                <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                  day.checked_in ? 'bg-teal-400' : 'bg-slate-200'
                }`}>
                  <Star className={`w-4 h-4 ${day.checked_in ? 'text-white fill-white' : 'text-slate-400'}`} />
                </div>
              </div>
            ))}
            {/* Friday Freebie */}
            {days[6] && (
              <div className={`rounded-xl p-2 text-center border relative ${
                days[6].checked_in ? 'bg-teal-50 border-teal-200' : 'bg-amber-50 border-amber-200'
              }`}>
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black bg-amber-400 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  Friday Freebie!
                </span>
                <p className="text-[10px] font-bold mb-1.5 text-amber-600 mt-1">Fri</p>
                <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                  days[6].checked_in ? 'bg-teal-400' : 'bg-amber-200'
                }`}>
                  <Star className={`w-4 h-4 ${days[6].checked_in ? 'text-white fill-white' : 'text-amber-500'}`} />
                </div>
              </div>
            )}
          </div>

          {/* Check-in button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleCheckin}
            disabled={isCheckingIn || alreadyCheckedIn}
            className={`w-full mt-5 py-4 font-black text-base rounded-2xl transition-all cursor-pointer ${
              alreadyCheckedIn
                ? 'bg-slate-100 text-slate-400'
                : 'bg-gradient-to-r from-teal-400 to-emerald-500 text-white shadow-lg shadow-teal-200'
            }`}
          >
            {isCheckingIn ? '⏳ Checking in...' : alreadyCheckedIn ? '✅ Checked in today!' : '✅ Check-in Now'}
          </motion.button>

          {/* How to earn more */}
          <div className="mt-4 bg-slate-50 rounded-xl p-3 space-y-1.5">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-2">How to earn points</p>
            {[
              { action: 'Open app daily', points: '+10 pts' },
              { action: 'Buy any data plan', points: '+25 pts' },
              { action: 'Refer a friend', points: '+50 pts' },
            ].map(item => (
              <div key={item.action} className="flex justify-between items-center">
                <span className="text-xs text-slate-600">{item.action}</span>
                <span className="text-xs font-black text-teal-600">{item.points}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Vouchers */}
        {activeVouchers.length > 0 && (
          <div>
            <h3 className="text-sm font-black text-slate-900 mb-3">🎟️ Your Vouchers</h3>
            <div className="space-y-3">
              {activeVouchers.map((v: any) => (
                <div key={v.id} className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center">
                      <p className="text-white font-black text-xs">₦{v.naira_value}</p>
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">₦{v.naira_value} Discount</p>
                      <p className="text-[10px] text-slate-500">60% off data markup • Expires {new Date(v.expires_at).toLocaleDateString('en-NG')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('buy_data')}
                    className="px-3 py-2 bg-amber-400 text-white text-xs font-black rounded-xl cursor-pointer"
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Redeem Points */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-900">🎁 Redeem Points</h3>
            <span className="text-sm font-black text-teal-600">{totalPoints} pts available</span>
          </div>
          <div className="space-y-2">
            {VOUCHER_TIERS.map(tier => (
              <div key={tier.points} className={`flex items-center justify-between p-3 rounded-xl border ${
                totalPoints >= tier.points ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-100 opacity-50'
              }`}>
                <div>
                  <p className="text-sm font-black text-slate-900">{tier.points} points</p>
                  <p className="text-xs text-slate-500">= ₦{tier.value} data discount</p>
                </div>
                <button
                  onClick={() => handleRedeem(tier.points)}
                  disabled={totalPoints < tier.points || isRedeeming}
                  className={`px-4 py-2 text-xs font-black rounded-xl cursor-pointer ${
                    totalPoints >= tier.points
                      ? 'bg-teal-400 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isRedeeming ? '...' : 'Claim'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Points history note */}
        <div className="bg-primary-dark rounded-2xl p-4 text-center">
          <p className="text-white/80 text-xs leading-relaxed">
            💡 Complete 7-day check-in cycle to earn a <strong className="text-amber-400">Friday Freebie bonus</strong>!
            Buy data daily for extra points. Refer friends for 50 pts each! 🔥
          </p>
        </div>

      </div>
    </div>
  );
}
