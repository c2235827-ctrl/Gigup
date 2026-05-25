import { useState } from 'react';
import { Bell, RefreshCw, Plus, History, Signal, Gift, Sparkles, ChevronRight, ArrowUpRight, Smartphone, Compass } from 'lucide-react';
import { User, DataOrder } from '../types';
import PullToRefresh from './PullToRefresh';

interface HomeProps {
  user: User;
  recentOrders: DataOrder[];
  onNavigate: (screen: string, extras?: any) => void;
  onRefreshData: () => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onTriggerInstall?: () => void;
  isStandalone?: boolean;
}

export default function Home({ user, recentOrders, onNavigate, onRefreshData, showToast, onTriggerInstall, isStandalone = false }: HomeProps) {
  const [refreshing, setRefreshing] = useState(false);

  // Helper to extract name initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshData();
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
              {user.unread_notifications && user.unread_notifications > 0 ? (
                <span className="absolute -top-1 -right-1 bg-brand-cashback text-primary-dark font-extrabold text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-primary-dark">
                  {user.unread_notifications}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Elevated Wallet Balance Card */}
      <div className="px-5 shrink-0 -mt-7 relative z-20">
        <div id="elevated-home-balance-card" className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100 flex flex-col space-y-3.5">
          
          {/* Wallet Balance Row */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Wallet Balance</span>
              <span className="text-[9px] font-medium text-primary-blue mt-0.5">Available for purchases</span>
            </div>
            <span className="text-xl font-extrabold text-primary-dark font-mono tracking-tight leading-none">
              ₦{(user.wallet_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
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
            onClick={() => onNavigate('account')}
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

          <div className="space-y-1 relative z-10 max-w-[70%]">
            <span className="text-[9px] bg-brand-cashback text-primary-dark font-extrabold px-2 py-0.5 rounded-full uppercase">
              10% Cashback
            </span>
            <h4 className="text-sm font-extrabold">Instant Cashback Promo!</h4>
            <p className="text-[10px] text-white/80 leading-snug">
              Fund Wallet → Buy Data → Earn cashback instantly accumulated separate and withdrawable to bank.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-2 rounded-2xl z-10 border border-white/10 shrink-0 text-center">
            <span className="text-brand-cashback block text-xs font-extrabold">Unlimited</span>
            <span className="text-[8px] text-white uppercase tracking-wider block font-medium">Rewards</span>
          </div>
        </div>
      </div>

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
              Your free 5GB was processed! Get 10% cashback on your next data purchase.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentOrders.slice(0, 3).map((order) => {
              const theme = networkThemes[order.network] || { bg: 'bg-gray-100 text-gray-800 border-gray-300', iconColor: 'text-gray-600', code: 'gray' };
              return (
                <div 
                  key={order.id} 
                  className="bg-white rounded-2xl p-3 border border-gray-100 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${theme.bg} border flex items-center justify-center shrink-0`}>
                      <Signal className={`w-4 h-4 ${theme.iconColor}`} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-primary-dark block leading-none mb-1">
                        {order.plan_name}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        Recipient: {order.recipient_phone}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-primary-dark font-mono block mb-1">
                      ₦{(order.price || 0).toLocaleString('en-US')}
                    </span>
                    <span className={`status-badge text-[8px] px-2 py-0.5 uppercase font-extrabold tracking-wider ${
                      order.status === 'success' 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
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

    </PullToRefresh>
  );
}
