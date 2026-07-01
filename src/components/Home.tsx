import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, RefreshCw, Plus, History, Signal, Gift, Sparkles, ChevronRight, ArrowUpRight, Smartphone, Compass, AlertTriangle, X, Info, Phone, Mail, Check, Wallet as WalletIcon } from 'lucide-react';
import { User, DataOrder, DataPlan, UserFlags } from '../types';
import PullToRefresh from './PullToRefresh';
import { ApiService } from '../api';

interface HomeProps {
  user: User;
  recentOrders: DataOrder[];
  onNavigate: (screen: string, extras?: any) => void;
  onRefreshData: () => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onTriggerInstall?: () => void;
  isStandalone?: boolean;
  unreadNotificationsCount?: number;
  userStreak: number;
  userFlags: UserFlags | null;
  doubleCashbackActive: boolean;
  doubleCashbackExpires: string | null;
  onDismissFlag: (action: 'dismiss_welcome' | 'dismiss_bonus' | 'dismiss_referral') => void;
  onActivateDoubleCashback: () => void;
  onStreakRewardClose: () => void;
  streakReward: { amount: number; day: number } | null;
  streakBroken: boolean;
  recoveryBonus: number;
  onStreakBrokenClose: () => void;
  onRecoveryClose: () => void;
}

export default function Home({ 
  user, 
  recentOrders, 
  onNavigate, 
  onRefreshData, 
  showToast, 
  onTriggerInstall, 
  isStandalone = false,
  unreadNotificationsCount,
  userStreak,
  userFlags,
  doubleCashbackActive,
  doubleCashbackExpires,
  onDismissFlag,
  onActivateDoubleCashback,
  onStreakRewardClose,
  streakReward,
  streakBroken,
  recoveryBonus,
  onStreakBrokenClose,
  onRecoveryClose
}: HomeProps) {
  const bonusBalance = user.bonus_balance ?? 0;
  const totalAvailable = (user.wallet_balance || 0) + bonusBalance;
  const showLowBalanceWarning = totalAvailable < 200; // less than ₦200 combined

  const [refreshing, setRefreshing] = useState(false);
  const [backendPlans, setBackendPlans] = useState<DataPlan[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<DataOrder | null>(null);
  const [requerying, setRequerying] = useState(false);

  // Fetch all plans from backend to map prices dynamically
  const fetchBackendPlans = async () => {
    try {
      const plans = await ApiService.getDataPlans();
      if (plans && plans.length > 0) {
        setBackendPlans(plans);
      }
    } catch (e) {
      console.warn('Unable to retrieve backend plans for price mapping.', e);
    }
  };

  useEffect(() => {
    fetchBackendPlans();
  }, []);

  // Helper to extract name initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Helper to fallback order pricing when 0 or falsy (standard market valuation matching the plans)
  const getOrderDisplayPrice = (order: DataOrder) => {
    // 1. Check if order price is already populated properly directly from database/API
    if (order.price && order.price > 0) {
      return order.price;
    }
    // Check key aliasing as fail-safe fallback (like order.amount or plan_price)
    const anyOrder = order as any;
    if (anyOrder.amount && anyOrder.amount > 0) {
      return anyOrder.amount;
    }
    if (anyOrder.plan_price && anyOrder.plan_price > 0) {
      return anyOrder.plan_price;
    }

    // 2. Query dynamically fetched real-time plans from database to fetch the exact price from backend
    if (backendPlans.length > 0) {
      const matched = backendPlans.find(p => 
        p.network === order.network && 
        (p.plan_name.toLowerCase() === order.plan_name.toLowerCase() ||
         p.size_label.toLowerCase() === order.plan_name.toLowerCase() ||
         p.plan_name.toLowerCase().includes(order.plan_name.toLowerCase()) ||
         order.plan_name.toLowerCase().includes(p.plan_name.toLowerCase()))
      );
      if (matched && matched.price > 0) {
        return matched.price;
      }
    }

    // 3. Complete static fallback if both options fail so we match standard market rates
    const nameStr = (order.plan_name || '').toLowerCase();
    if (nameStr.includes('230mb')) return 150;
    if (nameStr.includes('1gb')) return 300;
    if (nameStr.includes('2gb') || nameStr.includes('2.5gb')) return 600;
    if (nameStr.includes('500mb')) return 220;
    if (nameStr.includes('5gb')) return 1100;
    if (nameStr.includes('10gb')) return 2100;
    return 300; // default standard plan pricing
  };

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([onRefreshData(), fetchBackendPlans()]);
      showToast('Wallet balance & orders refreshed ⚡', 'success');
    } catch {
      showToast('Refresh failed. Check your network.', 'error');
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  // Networks maps for styling
  const networkThemes = {
    MTN: { bg: 'bg-yellow-100 text-yellow-800 border-yellow-300', iconColor: 'text-yellow-600', code: 'yellow' },
    GLO: { bg: 'bg-green-100 text-green-800 border-green-300', iconColor: 'text-green-600', code: 'green' },
    AIRTEL: { bg: 'bg-red-100 text-red-800 border-red-300', iconColor: 'text-red-500', code: 'red' }
  };

  return (
    <PullToRefresh onRefresh={handlePullToRefresh} className="bg-bg-light">
      
      {/* 1. Header (Deep Navy) */}
      <div className="bg-primary-dark pt-5 pb-10 px-5 text-white shrink-0 relative overflow-hidden">
        {/* Decorative background flare */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-primary-blue/15 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex justify-between items-center relative z-10">
          {/* User Profile Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-blue text-white rounded-full flex items-center justify-center font-bold border-2 border-white/25 shadow">
              {getInitials(user.full_name)}
            </div>
            <div>
              <span className="text-[11px] text-white/50 block font-light leading-none">Welcome back</span>
              <span className="font-semibold text-sm block">Hi, {user.full_name.split(' ')[0]} 👋</span>
            </div>
          </div>

          {/* Action Icons right side */}
          <div className="flex items-center gap-2.5">
            {/* Safe Refresh spinner button */}
            <button
              onClick={handlePullToRefresh}
              disabled={refreshing}
              className={`p-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-white transition active:scale-95 cursor-pointer`}
              title="Refresh wallet status"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary-blue' : ''}`} />
            </button>
            
            {/* Notification trigger button */}
            <button
              id="bell-notification-btn"
              onClick={() => onNavigate('notifications')}
              className="p-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 relative text-white transition active:scale-95 cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {((unreadNotificationsCount !== undefined ? unreadNotificationsCount : user.unread_notifications) || 0) > 0 ? (
                <span className="absolute -top-1 -right-1 bg-brand-cashback text-primary-dark font-extrabold text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-primary-dark">
                  {unreadNotificationsCount !== undefined ? unreadNotificationsCount : user.unread_notifications}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Elevated Wallet Balance Card */}
      <div className="px-5 shrink-0 -mt-7 relative z-20">
        <div id="elevated-home-balance-card" className={`bg-white rounded-3xl p-5 shadow-lg border flex flex-col space-y-3.5 transition-all duration-300 ${showLowBalanceWarning ? 'border-red-500/30' : 'border-gray-100'}`}>
          
          {/* Wallet Balance Row */}
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className={`text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${showLowBalanceWarning ? 'text-red-500' : 'text-text-muted'}`}>
                  {bonusBalance > 0 ? 'Total Available' : 'Wallet Balance'}
                </span>
                <span className="text-[9px] font-medium text-primary-blue mt-0.5">Available for purchases</span>
              </div>
              <span className={`text-xl font-extrabold font-mono tracking-tight leading-none transition-all duration-300 ${showLowBalanceWarning ? 'text-red-600 animate-pulse' : 'text-primary-dark'}`}>
                ₦{totalAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {bonusBalance > 0 && (
              <div className="flex justify-end pt-0.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-full select-none">
                  🎁 Includes ₦{bonusBalance.toLocaleString('en-US', { minimumFractionDigits: 0 })} welcome bonus
                </span>
              </div>
            )}
            
            {userStreak > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-lg">🔥</span>
                <span className="text-xs font-bold text-orange-500">{userStreak}-Day Streak</span>
                {userStreak >= 7 && (
                  <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">
                    Earning rewards!
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Separator Line */}
          <div className="border-t border-gray-100"></div>

          {/* Cashback Earned Row */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[#F59E0B] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]/10 animate-pulse" /> Cashback Earned
                </span>
              </div>
              <span className="text-[9px] text-text-muted mt-0.5">Withdrawable directly to bank</span>
            </div>
            <span className="text-xl font-extrabold text-[#F59E0B] font-mono tracking-tight leading-none">
              ₦{(user.cashback_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Cashback progress bar */}
          <div className="space-y-1.5">
            {(() => {
              const cb = user.cashback_balance || 0;
              const target = 2000;
              const progressPercent = Math.min(100, (cb / target) * 100);
              const isReady = cb >= target;
              const moreNeeded = Math.max(0, target - cb);

              return (
                <>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-[#F59E0B]'}`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    {isReady ? (
                      <span className="text-emerald-600 font-extrabold flex items-center gap-1 animate-pulse">
                        Ready to withdraw! 🎉
                      </span>
                    ) : (
                      <span className="text-text-muted font-medium">
                        ₦{moreNeeded.toLocaleString('en-US')} more to withdraw
                      </span>
                    )}
                    <span className="font-bold text-gray-500 font-mono">
                      ₦{cb.toLocaleString('en-US')} / ₦2,000
                    </span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Actions button grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Wallet topup button */}
            <button
              id="quick-topup-btn"
              onClick={() => onNavigate('wallet')}
              className="flex items-center justify-center gap-2 bg-primary-blue hover:bg-primary-blue/95 text-white rounded-2xl py-3 text-xs font-semibold active:scale-98 transition shadow px-3 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3px]" /> Fund Wallet
            </button>

            {/* Wallet transaction list redirect */}
            <button
              id="quick-history-btn"
              onClick={() => onNavigate('wallet_history')}
              className="flex items-center justify-center gap-2 bg-white border border-primary-blue/20 hover:bg-primary-blue/5 text-primary-blue rounded-2xl py-3 text-xs font-semibold active:scale-98 transition px-3 cursor-pointer"
            >
              <History className="w-4 h-4" /> History
            </button>
          </div>
        </div>
      </div>

      {/* Low Wallet Balance Warning Banner */}
      {showLowBalanceWarning && (
        <div className="px-5 mt-4 shrink-0 transition-all duration-300">
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex items-start gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-amber-900 leading-none">Low Wallet Balance!</h5>
              <p className="text-[11px] text-amber-700 mt-1 leading-normal">
                Your wallet balance is <strong>₦{totalAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>. Top up now to enjoy uninterrupted data purchases.
              </p>
            </div>
            <button
              id="low-balance-topup-btn"
              onClick={() => onNavigate('wallet')}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-full shadow-sm transition shrink-0 active:scale-95 cursor-pointer"
            >
              Top Up
            </button>
          </div>
        </div>
      )}

      {/* 3. Pull-To-Refresh Simulation Banner */}
      {refreshing && (
        <div className="w-full text-center py-1 text-xs text-primary-blue flex justify-center items-center gap-1 bg-primary-blue/5 animate-pulse">
          <RefreshCw className="w-3 h-3 animate-spin" /> Synchronizing VTU Nodes...
        </div>
      )}

      {/* 4. Quick Network Action Icons Grid (MTN, GLO, Airtel, Referral) */}

      <div className="px-5 mt-6 shrink-0">
        <h4 className="text-xs font-bold text-text-dark/40 uppercase tracking-widest mb-3 pl-1">Buy Cheap Data</h4>
        <div className="grid grid-cols-4 gap-3">
          {/* MTN */}
          <button
            onClick={() => onNavigate('buy_data', { network: 'MTN' })}
            className="bg-white rounded-2xl p-3 border border-gray-100 flex flex-col items-center justify-center shadow-sm cursor-pointer hover:border-yellow-200 transition text-center"
          >
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mb-1.5">
              <Signal className="w-5 h-5 text-yellow-600 font-bold" />
            </div>
            <span className="text-[10px] font-bold text-gray-700">MTN Data</span>
          </button>

          {/* GLO */}
          <button
            onClick={() => onNavigate('buy_data', { network: 'GLO' })}
            className="bg-white rounded-2xl p-3 border border-gray-100 flex flex-col items-center justify-center shadow-sm cursor-pointer hover:border-green-200 transition text-center"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-1.5">
              <Signal className="w-5 h-5 text-green-600 font-bold" />
            </div>
            <span className="text-[10px] font-bold text-gray-700">GLO Data</span>
          </button>

          {/* Airtel */}
          <button
            onClick={() => onNavigate('buy_data', { network: 'AIRTEL' })}
            className="bg-white rounded-2xl p-3 border border-gray-100 flex flex-col items-center justify-center shadow-sm cursor-pointer hover:border-red-200 transition text-center"
          >
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-1.5">
              <Signal className="w-5 h-5 text-red-500 font-bold" />
            </div>
            <span className="text-[10px] font-bold text-gray-700">Airtel Data</span>
          </button>

          {/* Referral Option */}
          <button
            onClick={() => onNavigate('account', { scrollTo: 'referral' })}
            className="bg-white rounded-2xl p-3 border border-gray-100 flex flex-col items-center justify-center shadow-sm cursor-pointer hover:border-amber-200 transition text-center"
          >
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-1.5">
              <Gift className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-[10px] font-bold text-gray-700">Referral</span>
          </button>
        </div>
      </div>

      {/* PWA App Install Booster Prompt Card */}
      {!isStandalone && onTriggerInstall && (
        <div className="px-5 mt-5 shrink-0">
          <div className="bg-emerald-50 border border-emerald-100/80 rounded-3xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-[11px] font-extrabold text-[#065F46] uppercase tracking-wide">Install GigUp App! 📲</h5>
                <p className="text-[10px] text-[#047857] max-w-[190px] leading-tight font-medium">
                  Launch instantly from your home screen. Uses zero store data & runs 2x faster.
                </p>
              </div>
            </div>
            <button
              id="home-install-trigger-btn"
              onClick={onTriggerInstall}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-2xl transition shadow-xs cursor-pointer select-none"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {/* 5. Cashback Promo Banner */}
      <div className="px-5 mt-5 shrink-0">
        <div className="bg-gradient-to-r from-primary-blue via-[#2563EB] to-[#1E40AF] rounded-3xl p-4 text-white shadow-md relative overflow-hidden flex items-center justify-between">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute top-2 left-1/3 w-8 h-8 bg-brand-cashback/20 rounded-full blur-md pointer-events-none"></div>

          <div className="space-y-1 relative z-10 max-w-[75%]">
            <span className="text-[9px] bg-brand-cashback text-primary-dark font-extrabold px-2 py-0.5 rounded-full uppercase">
              Welcome Bonus Active
            </span>
            <h4 className="text-xs sm:text-sm font-extrabold leading-tight">🎁 New here? Fund your wallet to get FREE 1GB data!</h4>
            <p className="text-[10px] text-white/80 leading-snug">
              {doubleCashbackActive ? "Plus earn 20% double cashback on every purchase." : "Plus earn 10% cashback on every purchase."}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-2 rounded-2xl z-10 border border-white/10 shrink-0 text-center">
            <span className="text-brand-cashback block text-xs font-extrabold">Unlimited</span>
            <span className="text-[8px] text-white uppercase tracking-wider block font-medium">Rewards</span>
          </div>
        </div>
      </div>

      {doubleCashbackActive && doubleCashbackExpires && (
        <div className="px-5 mt-4 shrink-0 transition-all duration-300">
          <div className="mx-4 bg-gradient-to-r from-orange-500 to-amber-400 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-black text-sm">⚡ Double Cashback Active!</p>
              <p className="text-orange-100 text-xs mt-0.5">
                20% cashback until {new Date(doubleCashbackExpires).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span className="text-3xl">🔥</span>
          </div>
        </div>
      )}



      {/* Helper notice if pull refresh can be triggered manually */}
      <div className="px-5 mt-4 text-center">
        <button
          onClick={handlePullToRefresh}
          className="text-[10px] text-text-muted hover:text-primary-blue transition cursor-pointer flex items-center gap-1 mx-auto bg-transparent border-none p-0"
        >
          <RefreshCw className="w-2.5 h-2.5" /> Pull down or click to synchronize balances & status
        </button>
      </div>

      {/* 6. Recent Orders Panel */}
      <div className="px-5 mt-5 pb-8 flex-grow">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-bold text-text-dark/40 uppercase tracking-widest pl-1">Recent VTU Orders</h4>
          <button
            onClick={() => onNavigate('wallet_history')}
            className="text-xs text-primary-blue font-semibold hover:underline flex items-center cursor-pointer bg-transparent border-none p-0"
          >
            View All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 text-center flex flex-col items-center justify-center min-h-[140px] shadow-sm">
            <span className="text-3xl mb-2">🎁</span>
            <h5 className="text-xs font-bold text-primary-dark uppercase">No Orders Yet</h5>
            <p className="text-[10px] text-text-muted max-w-[200px] mt-1">
              Fund your wallet with ₦2,000 or more to claim your FREE 1GB welcome data!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentOrders.slice(0, 3).map((order) => {
              const theme = networkThemes[order.network] || { bg: 'bg-gray-100 text-gray-800 border-gray-300', iconColor: 'text-gray-600', code: 'gray' };
              const isBonusOrder = order.amount === 0;
              return (
                <div 
                  key={order.id} 
                  onClick={() => onNavigate('receipt', {
                    status: order.status,
                    network: order.network,
                    plan_name: order.plan_name,
                    recipient_phone: order.recipient_phone,
                    amount: order.amount !== undefined ? order.amount : getOrderDisplayPrice(order),
                    id: order.id,
                    receiptId: order.smedata_ref || ('REC' + order.id.substring(0, 8).toUpperCase()),
                    date: new Date(order.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }),
                    reason: order.status_message,
                    cashback: order.status === 'success' && order.amount && order.amount > 0 ? Math.ceil(order.amount * 0.01) : 0
                  })}
                  className="bg-white rounded-2xl p-3 border border-gray-100 flex items-center justify-between shadow-sm cursor-pointer hover:bg-slate-50 transition active:scale-[0.99] select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${theme.bg} border flex items-center justify-center shrink-0`}>
                      <Signal className={`w-4 h-4 ${theme.iconColor}`} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-primary-dark block leading-none mb-1">
                        {order.plan_name}
                        {isBonusOrder && (
                          <span style={{
                            background: '#F0FDF4', color: '#22C55E',
                            fontSize: '10px', fontWeight: 700,
                            padding: '2px 6px', borderRadius: '4px',
                            marginLeft: '6px'
                          }}>🎁 FREE BONUS</span>
                        )}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        Recipient: {order.recipient_phone}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-primary-dark font-mono block mb-1">
                      {isBonusOrder ? (
                        <span style={{ color: '#22C55E', fontWeight: 700, fontSize: '13px' }}>FREE</span>
                      ) : (
                        <span>₦{Number(typeof order.amount !== 'undefined' ? order.amount : getOrderDisplayPrice(order)).toLocaleString()}</span>
                      )}
                    </span>
                    <span className={`status-badge text-[8px] px-2 py-0.5 uppercase font-extrabold tracking-wider ${
                      order.status === 'success'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : order.status === 'pending'
                          ? 'bg-amber-50 text-amber-600 border border-amber-100'
                          : 'bg-red-50 text-red-500 border border-red-100'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ POPUP 1: STREAK REWARD ═══ */}
      {streakReward !== null && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl"
          >
            <div className="text-6xl mb-4">🔥</div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">{streakReward.day}-Day Streak!</h2>
            <p className="text-slate-600 mb-4">You've been on GigUp for {streakReward.day} days in a row!</p>
            <div className="bg-green-50 rounded-2xl p-4 mb-6">
              <p className="text-3xl font-black text-green-600">+₦{streakReward.amount.toLocaleString()}</p>
              <p className="text-sm text-green-600 font-medium">Added to your wallet 🎉</p>
            </div>
            <button
              onClick={onStreakRewardClose}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl text-sm cursor-pointer"
            >
              Amazing! Keep Going 🚀
            </button>
          </motion.div>
        </div>
      )}

      {/* ═══ POPUP 2: STREAK BROKEN ═══ */}
      {streakBroken === true && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl"
          >
            <div className="text-6xl mb-4">😢</div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Streak Broken!</h2>
            <p className="text-slate-600 mb-4">You missed a day and your streak reset. Come back tomorrow!</p>
            <div className="bg-amber-50 rounded-2xl p-4 mb-6 border border-amber-200">
              <p className="text-sm font-bold text-amber-700">
                💡 Come back within <strong>48 hours</strong> and earn a ₦50 recovery bonus!
              </p>
            </div>
            <button
              onClick={onStreakBrokenClose}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl text-sm cursor-pointer"
            >
              Start New Streak 🔥
            </button>
          </motion.div>
        </div>
      )}

      {/* ═══ POPUP 3: RECOVERY BONUS ═══ */}
      {recoveryBonus > 0 && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl"
          >
            <div className="text-6xl mb-4">💪</div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">You Came Back!</h2>
            <p className="text-slate-600 mb-4">You returned within 48 hours. Here's your recovery bonus!</p>
            <div className="bg-green-50 rounded-2xl p-4 mb-6">
              <p className="text-3xl font-black text-green-600">+₦{recoveryBonus}</p>
              <p className="text-sm text-green-600 font-medium">Added to your wallet 🎉</p>
            </div>
            <button
              onClick={onRecoveryClose}
              className="w-full py-4 bg-green-500 text-white font-bold rounded-2xl text-sm cursor-pointer"
            >
              Let's Go! 🔥
            </button>
          </motion.div>
        </div>
      )}

      {/* ═══ POPUP 4: WELCOME (only if wallet_balance is <= 500) ═══ */}
      {userFlags !== null &&
       !userFlags.welcome_popup_dismissed &&
       Number(user.wallet_balance || 0) <= 500 && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl mb-2"
          >
            <div className="flex justify-between items-start mb-4">
              <Gift className="w-8 h-8 text-blue-600" />
              <button
                onClick={() => onDismissFlag('dismiss_welcome')}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Welcome to GigUp!</h3>
            <p className="text-sm text-slate-600 mb-3">
              You have <strong className="text-blue-600">₦{Number(user.bonus_balance || 0).toLocaleString()} bonus</strong> ready to use!
              Fund with <strong>₦2,000</strong> and get <strong>1GB FREE data</strong> on top.
            </p>
            <div className="bg-amber-50 rounded-xl p-3 mb-4 border border-amber-200">
              <p className="text-xs font-bold text-amber-700">
                ⚡ Fund ₦1,000 first and get <span className="text-orange-600">20% double cashback</span> for 24 hours!
              </p>
            </div>
            <button
              onClick={() => { onDismissFlag('dismiss_welcome'); onNavigate('wallet'); }}
              className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 mb-2 cursor-pointer"
            >
              <WalletIcon className="w-4 h-4" /> Fund Wallet Now
            </button>
            <button
              onClick={() => onDismissFlag('dismiss_welcome')}
              className="w-full py-2 text-slate-400 text-xs font-medium cursor-pointer"
            >
              Maybe later
            </button>
          </motion.div>
        </div>
      )}

      {/* ═══ POPUP 5: BONUS DROP-OFF (when bonus < ₦100 and > 0) ═══ */}
      {userFlags !== null &&
       !userFlags.bonus_dropoff_popup_dismissed &&
       Number(user.bonus_balance || 0) > 0 &&
       Number(user.bonus_balance || 0) < 100 && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl mb-2"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-3xl">⚠️</span>
              <button
                onClick={() => onDismissFlag('dismiss_bonus')}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Bonus almost finished!</h3>
            <p className="text-sm text-slate-600 mb-3">
              You've earned <strong className="text-green-600">₦{Number(user.cashback_balance || 0).toLocaleString()} cashback</strong> already — that's yours!
            </p>
            <div className="bg-blue-50 rounded-xl p-3 mb-4 border border-blue-200">
              <p className="text-xs font-bold text-blue-700">
                💡 Fund ₦1,000 now → get <span className="text-orange-500">20% double cashback</span> for 24 hours!
              </p>
            </div>
            <button
              onClick={() => { onActivateDoubleCashback(); onNavigate('wallet'); }}
              className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl text-sm mb-2 cursor-pointer"
            >
              Fund ₦1,000 — Get Double Cashback ⚡
            </button>
            <button
              onClick={() => onDismissFlag('dismiss_bonus')}
              className="w-full py-2 text-slate-400 text-xs font-medium cursor-pointer"
            >
              Not now
            </button>
          </motion.div>
        </div>
      )}

      {/* ═══ POPUP 6: REFERRAL NUDGE ═══ */}
      {userFlags !== null &&
       userFlags.referral_nudge_sent &&
       !userFlags.referral_nudge_popup_dismissed && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl mb-2"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-3xl">🎁</span>
              <button
                onClick={() => onDismissFlag('dismiss_referral')}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Earn ₦5,000 for 30 referrals!</h3>
            <p className="text-sm text-slate-600 mb-3">
              Refer <strong>30 friends</strong> who each buy data on GigUp and earn <strong className="text-green-600">₦5,000 cash</strong> plus <strong>1GB free data daily for 30 days!</strong>
            </p>
            <div className="bg-green-50 rounded-xl p-3 mb-4 border border-green-200">
              <p className="text-xs text-green-700 font-bold">
                📈 How it works:<br/>
                → Friends must sign up with your code<br/>
                → They must buy data at least once<br/>
                → Hit 30 qualified referrals = ₦5,000 + 1GB/day for 30 days 🔥
              </p>
            </div>
            <button
              onClick={() => { onDismissFlag('dismiss_referral'); onNavigate('account'); }}
              className="w-full py-3.5 bg-green-500 text-white font-bold rounded-2xl text-sm mb-2 cursor-pointer"
            >
              Get My Referral Link 🔗
            </button>
            <button
              onClick={() => onDismissFlag('dismiss_referral')}
              className="w-full py-2 text-slate-400 text-xs font-medium cursor-pointer"
            >
              Maybe later
            </button>
          </motion.div>
        </div>
      )}

    </PullToRefresh>
  );
}
