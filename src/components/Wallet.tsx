import React, { useState } from 'react';
import { Wallet as WalletIcon, PlusCircle, History, ArrowDownLeft, ArrowUpRight, CheckCircle, Smartphone, SlidersHorizontal, Sparkles } from 'lucide-react';
import { ApiService } from '../api';
import { User, WalletTransaction } from '../types';
import PullToRefresh from './PullToRefresh';
import { playSuccessSound, playFailureSound } from '../utils/audio';

interface WalletProps {
  user: User;
  transactions: WalletTransaction[];
  onNavigate: (screen: string) => void;
  onRefreshData: () => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function Wallet({ user, transactions, onNavigate, onRefreshData, showToast }: WalletProps) {
  const [activeSubTab, setActiveSubTab] = useState<'topup' | 'history'>('topup');
  const [amount, setAmount] = useState<string>('2000');
  const [loadingTopup, setLoadingTopup] = useState(false);
  
  // Transaction Filter State
  const [filterType, setFilterType] = useState<'all' | 'cashback' | 'topups' | 'purchases' | 'withdrawals'>('all');
  
  // Withdrawal States
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  // Quick select chip buttons
  const quickChips = [2000, 3000, 5000, 10000];

  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    setAmount(rawVal);
  };

  const handleTopup = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 2000) {
      showToast('Minimum wallet top-up is ₦2,000', 'error');
      return;
    }

    setLoadingTopup(true);
    try {
      // Store baseline user balance to verify deposit credit later
      localStorage.setItem('gigup_pre_topup_balance', (user.wallet_balance || 0).toString());
      
      const res = await ApiService.initiateTopup(parsedAmount);
      if (res.success && res.payment_link) {
        playSuccessSound();
        
        // Escape iframe sandbox if inside an iframe to prevent X-Frame-Options: SAMEORIGIN block
        const isIframe = window.self !== window.top;
        if (isIframe) {
          showToast('Top-Up initiated. Opening secure payment portal in a new tab...', 'success');
          const newTab = window.open(res.payment_link, '_blank');
          if (!newTab) {
            // Popup blocker prevented, do top fallback
            showToast('Pop-up blocked! Redirecting you directly...', 'info');
            setTimeout(() => {
              window.location.href = res.payment_link;
            }, 1000);
          }
        } else {
          showToast('Top-Up initiated. Redirecting to payment portal...', 'success');
          setTimeout(() => {
            window.location.href = res.payment_link;
          }, 800);
        }
      }
    } catch (err: any) {
      playFailureSound();
      showToast(err.message || 'Failed to initiate Top-Up', 'error');
    } finally {
      setLoadingTopup(false);
    }
  };

  const formatTxDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <PullToRefresh onRefresh={onRefreshData} className="bg-bg-light pb-24">
      {!user.signup_bonus_claimed && (
        <div className="px-5 pt-5">
          <div style={{
            background: 'linear-gradient(135deg, #0D1F3D, #1a3a6e)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '4px',
            border: '1px solid rgba(59,126,248,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }} className="text-left select-none">
            <span style={{ fontSize: '32px' }}>🎁</span>
            <div>
              <p style={{ color: 'white', fontWeight: 700, fontSize: '15px', margin: 0 }}>
                Claim Your FREE 1GB Data!
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', margin: '4px 0 0' }}>
                Fund your wallet with ₦2,000 or more and we'll send 1GB data to your number instantly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navy Header Panel */}
      <div className="bg-primary-dark pt-5 pb-7 px-5 text-white shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-blue/10 rounded-full blur-xl pointer-events-none"></div>

        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-bold text-white/50 uppercase tracking-widest pl-1">My Wallet Dashboard</h4>
          <span className="text-[10px] bg-brand-cashback/10 text-brand-cashback border border-brand-cashback/10 font-bold px-2 py-0.5 rounded-full uppercase">
            Secured Deposit
          </span>
        </div>

        {/* Central Wallet Balance details */}
        <div className="text-center py-2 space-y-1">
          <span className="text-xs text-white/50 inline-block">Active Wallet Balance</span>
          <h3 className="text-3xl font-extrabold tracking-tight text-white font-mono leading-none">
            ₦{(user.wallet_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-brand-success font-medium pt-1">
            ✓ Connected securely to Flutterwave Node IP
          </p>
        </div>

        {/* Sub-Tabs: Top Up / Transaction History */}
        <div className="grid grid-cols-2 gap-2 mt-5 bg-white/5 p-1 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveSubTab('topup')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeSubTab === 'topup'
                ? 'bg-white text-primary-dark shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" /> Fund Wallet
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeSubTab === 'history'
                ? 'bg-white text-primary-dark shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" /> Transactions
          </button>
        </div>
      </div>

      {/* Main Body Containers depend on active tabs */}
      <div className="p-5 flex-grow">
        {activeSubTab === 'topup' ? (
          <div className="space-y-4">
            
            {/* Balance Breakdown Section */}
            <div className="bg-white rounded-3xl p-5 border border-gray-150/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                <WalletIcon className="w-4 h-4 text-primary-blue" />
                <h5 className="text-xs font-bold text-primary-dark uppercase tracking-wider">Balance Breakdown</h5>
              </div>
              
              <div className="space-y-3.5 text-xs">
                {/* Wallet Balance Row */}
                <div className="flex justify-between items-center">
                  <span className="text-text-muted font-bold">Wallet Balance</span>
                  <span className="font-extrabold text-primary-blue font-mono text-sm">
                    ₦{(user.wallet_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Welcome Bonus Row */}
                {(user.bonus_balance ?? 0) > 0 ? (
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted font-bold flex items-center gap-1">Welcome Bonus</span>
                    <span className="font-extrabold text-amber-500 font-mono text-sm">
                      ₦{user.bonus_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : null}

                {/* Cashback Balance Row */}
                <div className="flex justify-between items-center">
                  <span className="text-text-muted font-bold">Cashback Balance</span>
                  <span className="font-extrabold text-[#10B981] font-mono text-sm">
                    ₦{(user.cashback_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Bonus Usage Note */}
              {(user.bonus_balance ?? 0) > 0 && (
                <div className="pt-2.5 border-t border-gray-100 flex items-center gap-1.5 text-[10.5px] text-text-muted">
                  <span>🎁</span>
                  <span>Bonus can only be used for data purchases</span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-5">
            <div className="space-y-1.5 px-1">
              <h5 className="text-xs font-bold text-primary-dark uppercase">Fund Ledger Balance</h5>
              <p className="text-[11px] text-text-muted leading-tight">
                Deposit minimum ₦2,000 using Nigerian Debit Cards, USSD strings, or Bank Transfers.
              </p>
            </div>

            {/* Input Box Amount */}
            <div className="space-y-2">
              <label id="amt-label" className="text-[11px] font-bold text-text-muted uppercase tracking-wider block px-1">
                Amount to Deposit (₦)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-primary-blue font-extrabold text-base">
                  ₦
                </span>
                <input
                  id="topup-amount-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="2,000"
                  value={amount}
                  onChange={handleAmountInput}
                  className="w-full bg-bg-light border border-gray-200 text-primary-dark font-mono font-extrabold rounded-2xl pl-9 pr-4 py-3.5 text-lg placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all"
                />
              </div>
              {amount !== '' && parseFloat(amount) < 2000 && (
                <p className="text-[10px] text-brand-danger font-semibold px-1">
                  ⚠️ Minimum wallet funding amount is ₦2,000
                </p>
              )}
            </div>

            {/* Quick Amount Chips */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block px-1">
                Quick Deposits Preset
              </span>
              <div className="grid grid-cols-4 gap-2">
                {quickChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setAmount(chip.toString())}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      amount === chip.toString()
                        ? 'bg-primary-blue text-white border-primary-blue shadow-sm'
                        : 'bg-white hover:bg-bg-light text-primary-dark border-gray-200'
                    }`}
                  >
                    ₦{chip.toLocaleString('en-US')}
                  </button>
                ))}
              </div>
            </div>

            {/* Safety parameters label banner */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 flex items-start gap-2.5 text-emerald-800 text-xs">
              <CheckCircle className="w-5 h-5 text-brand-success shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Protected by Flutterwave API</span>
                <p className="text-[10px] text-emerald-700 leading-snug">
                  Zero commission charges on wallet deposits. Instant processing within 15 seconds.
                </p>
              </div>
            </div>

            <button
              id="wallet-top-up-submit"
              onClick={handleTopup}
              disabled={loadingTopup || amount === '' || parseFloat(amount) < 2000}
              className="w-full bg-primary-blue hover:bg-primary-blue/90 disabled:bg-primary-blue/40 text-white rounded-full py-4 text-xs font-bold tracking-wider shadow-lg shadow-primary-blue/15 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loadingTopup ? (
                <>
                  <div className="spinner !w-5 !h-5 border-white/20 !border-left-white" />
                  <span>Contacting Secure Gateway...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-white" />
                  <span>TOP UP WALLET NOW</span>
                </>
              )}
            </button>
          </div>

          {/* Visually-isolated Cashback Wallet section */}
          <div className="bg-white rounded-3xl p-5 border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/10 space-y-4">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#F59E0B] fill-amber-100" />
                <h5 className="text-xs font-bold text-primary-dark uppercase">Cashback Balance</h5>
              </div>
              <span className="text-[10px] bg-amber-50 text-[#F59E0B] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-100">
                10% Payouts
              </span>
            </div>

            <div className="bg-[#F59E0B]/5 border border-amber-200/50 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-text-muted uppercase font-semibold block leading-none mb-1">Withdrawable Balance</span>
                <span className="text-xl font-extrabold text-[#F59E0B] font-mono leading-none">
                  ₦{(user.cashback_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {user.pending_withdrawal ? (
                <span className="text-[9px] bg-amber-100 text-[#F59E0B] font-extrabold px-2.5 py-1 rounded-full border border-amber-200 uppercase tracking-wide">
                  ⏳ Pending: ₦{((typeof user.pending_withdrawal === 'object' && user.pending_withdrawal && 'amount' in user.pending_withdrawal) ? user.pending_withdrawal.amount : (user.cashback_balance || 2000)).toLocaleString()}
                </span>
              ) : (
                <span className="text-[9.5px] text-text-muted font-bold">
                  Target: ₦2,000.00
                </span>
              )}
            </div>

            {(() => {
              const cb = user.cashback_balance || 0;
              const hasPending = !!user.pending_withdrawal;
              const canWithdraw = cb >= 2000;

              if (hasPending) {
                return (
                  <div className="space-y-2">
                    <button
                      disabled
                      className="w-full bg-gray-100 text-gray-400 rounded-full py-4 text-xs font-bold uppercase cursor-not-allowed border border-gray-150 flex items-center justify-center gap-2"
                    >
                      ⏳ Withdrawal in Progress
                    </button>
                    <p className="text-[10px] text-[#F59E0B] font-medium text-center leading-snug">
                      Your payout of ₦{((typeof user.pending_withdrawal === 'object' && user.pending_withdrawal && 'amount' in user.pending_withdrawal) ? user.pending_withdrawal.amount : (user.cashback_balance || 2000)).toLocaleString()} is being processed. Only one pending request is permitted at a time.
                    </p>
                  </div>
                );
              }

              if (canWithdraw) {
                return (
                  <div className="space-y-2">
                    <button
                      id="withdraw-cashback-btn"
                      onClick={() => {
                        setAccountNumber('');
                        setAccountName('');
                        setBankName('');
                        setShowWithdrawModal(true);
                      }}
                      className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-full py-4 text-xs font-bold uppercase shadow-md shadow-amber-500/10 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ArrowUpRight className="w-4.5 h-4.5" />
                      Withdraw Cashback to Bank
                    </button>
                    <p className="text-[10.5px] text-emerald-600 font-semibold text-center leading-snug animate-pulse">
                      🎉 Congratulations! You have reached the ₦2,000 threshold. Click above to withdraw.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  <button
                    disabled
                    className="w-full bg-gray-100 text-gray-400 rounded-full py-4 text-xs font-bold uppercase cursor-not-allowed border border-gray-150 flex items-center justify-center gap-1.5"
                  >
                    Withdraw Cashback to Bank
                  </button>
                  <p className="text-[10px] text-text-muted text-center leading-snug">
                    ⚠️ You need ₦{Math.max(0, 2000 - cb).toLocaleString()} more to reach the minimum ₦2,000 withdrawal milestone.
                  </p>
                </div>
              );
            })()}
          </div>
          </div>
        ) : (
          <div className="space-y-3">
            {(() => {
              const filteredTransactions = transactions.filter(tx => {
                const desc = tx.description.toLowerCase();
                if (filterType === 'cashback') {
                  return desc.includes('cashback');
                }
                if (filterType === 'topups') {
                  return tx.type === 'credit' && !desc.includes('cashback');
                }
                if (filterType === 'purchases') {
                  return tx.type === 'debit' && (desc.includes('data') || desc.includes('purchase') || desc.includes('bundle') || desc.includes('vtu') || desc.includes('mtn') || desc.includes('glo') || desc.includes('airtel'));
                }
                if (filterType === 'withdrawals') {
                  return desc.includes('withdraw') || desc.includes('payout');
                }
                return true;
              });

              return (
                <div className="space-y-3">
                  <div className="flex-col gap-2 px-1 text-left">
                    <h5 className="text-xs font-bold text-text-dark/40 uppercase tracking-widest text-left">Transaction History Ledger</h5>
                    
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-none w-full py-1.5 mt-1.5">
                      {[
                        { key: 'all', label: 'All', color: 'bg-primary-dark text-white' },
                        { key: 'topups', label: 'Top-ups', color: 'bg-green-600 text-white' },
                        { key: 'purchases', label: 'Purchases', color: 'bg-blue-600 text-white' },
                        { key: 'withdrawals', label: 'Withdrawals', color: 'bg-red-600 text-white' },
                        { key: 'cashback', label: 'Cashbacks', color: 'bg-amber-500 text-white' },
                      ].map((item) => (
                        <button
                          key={item.key}
                          onClick={() => setFilterType(item.key as any)}
                          className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase whitespace-nowrap transition cursor-pointer ${
                            filterType === item.key
                              ? `${item.color} shadow-xs`
                              : 'bg-white text-text-muted border border-gray-200 hover:text-primary-dark hover:border-gray-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredTransactions.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 flex flex-col items-center justify-center min-h-[180px] shadow-sm animate-fade-in">
                      <span className="text-3xl mb-2">📥</span>
                      <h6 className="text-xs font-bold text-primary-dark uppercase">Clear Ledger Statement</h6>
                      <p className="text-[10px] text-text-muted max-w-[200px] mt-1.5 leading-relaxed">
                        {filterType === 'cashback' && "No cashback rewards earned yet. Purchase dynamic data bundles to receive 10% instant refunds!"}
                        {filterType === 'topups' && "No top-up deposits found. Fund your wallet to complete data orders!"}
                        {filterType === 'purchases' && "No bundle purchases found. Purchase MTN/GLO/Airtel plans to see them here!"}
                        {filterType === 'withdrawals' && "No withdrawal payout records found."}
                        {filterType === 'all' && "No billing changes received yet. Complete your first deposit to earn a 10% cashback reward!"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredTransactions.map((tx) => {
                        const isCredit = tx.type === 'credit';
                        return (
                          <div 
                            key={tx.id} 
                            className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm flex-row flex items-center justify-between animate-fade-in"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                                isCredit 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                  : 'bg-red-50 text-red-500 border-red-100'
                              }`}>
                                {isCredit ? (
                                  <ArrowDownLeft className="w-4.5 h-4.5" />
                                ) : (
                                  <ArrowUpRight className="w-4.5 h-4.5" />
                                )}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-primary-dark block leading-tight">
                                  {tx.description}
                                </span>
                                <span className="text-[9px] text-text-muted block mt-0.5">
                                  {formatTxDate(tx.created_at)}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0 pl-1">
                              <span className={`text-xs font-extrabold font-mono block ${
                                isCredit ? 'text-emerald-600' : 'text-red-500'
                              }`}>
                                {isCredit ? '+' : '-'}₦{(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[8px] uppercase tracking-wider bg-bg-light text-primary-dark px-1.5 py-0.5 rounded-full border border-gray-100 mt-1 inline-block">
                                Settled
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

    {/* 4. Withdrawal Modal Overlay */}
    {showWithdrawModal && (
      <div className="fixed inset-0 bg-primary-dark/80 backdrop-blur-xs z-50 flex items-end justify-center p-0">
        <div className="bg-white rounded-t-[32px] w-full max-w-md p-6 space-y-5 animate-slide-up shadow-2xl pb-10 border-t border-gray-100 text-primary-dark select-none modal-card-element">
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F59E0B] fill-amber-100" />
              <h4 className="text-base font-extrabold text-primary-dark uppercase">Transfer Cashback</h4>
            </div>
            <button
              onClick={() => setShowWithdrawModal(false)}
              className="text-text-muted hover:text-primary-dark font-semibold text-sm bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-100 text-amber-900 rounded-2xl p-4 text-xs opacity-95">
            <span className="font-extrabold block text-[#D97706]">All-or-Nothing Payout</span>
            <p className="text-[10px] leading-snug text-amber-800 mt-1">
              You are about to withdraw your entire cashback balance of <span className="font-mono font-bold">₦{(user.cashback_balance || 0).toLocaleString()}</span> to your bank.
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 text-left">
            
            {/* Bank Picker Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold text-text-muted uppercase tracking-wider block px-1">
                Select Destination Bank
              </label>
              <select
                id="withdraw-bank-select"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-bg-light border border-gray-200 text-primary-dark font-bold rounded-2xl px-4 py-3 text-sm focus:bg-white focus:border-primary-blue focus:outline-none transition-all cursor-pointer"
              >
                <option value="">-- Choose destination bank --</option>
                <option value="Access Bank">Access Bank</option>
                <option value="GTBank">Guaranty Trust Bank (GTBank)</option>
                <option value="Zenith Bank">Zenith Bank</option>
                <option value="United Bank for Africa (UBA)">United Bank for Africa (UBA)</option>
                <option value="First Bank">First Bank of Nigeria</option>
                <option value="Kuda Bank">Kuda Microfinance Bank</option>
              </select>
            </div>

            {/* Account Number Input */}
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold text-text-muted uppercase tracking-wider block px-1">
                Bank Account Number (10 digits)
              </label>
              <input
                id="withdraw-account-input"
                type="text"
                inputMode="numeric"
                placeholder="0123456789"
                maxLength={10}
                value={accountNumber}
                onChange={(e) => {
                  const rawVal = e.target.value.replace(/\D/g, '').substring(0, 10);
                  setAccountNumber(rawVal);
                  if (rawVal.length === 10) {
                    setAccountName(user.full_name);
                  } else {
                    setAccountName('');
                  }
                }}
                className="w-full bg-bg-light border border-gray-200 text-primary-dark font-mono font-bold rounded-2xl px-4 py-3 text-base placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all"
              />
            </div>

            {/* Green status label when 10 digits completed */}
            {accountNumber.length === 10 && accountName && (
              <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-3 flex items-center gap-2 text-emerald-800 text-xs animate-pulse">
                <CheckCircle className="w-4.5 h-4.5 text-brand-success shrink-0" />
                <span className="font-semibold text-[11px] leading-tight">
                  Account resolved: <span className="font-extrabold uppercase text-primary-dark">{accountName}</span>
                </span>
              </div>
            )}
          </div>

          <button
            id="confirm-withdrawal-btn"
            onClick={async () => {
              if (!bankName) {
                showToast('Please select your destination bank', 'error');
                return;
              }
              if (accountNumber.length !== 10) {
                showToast('Account number must be exactly 10 digits', 'error');
                return;
              }
              
              setWithdrawing(true);
              try {
                const res = await ApiService.requestWithdrawal({
                  amount: user.cashback_balance || 0,
                  bank_name: bankName,
                  account_number: accountNumber,
                  account_name: accountName || user.full_name
                });
                if (res.success) {
                  playSuccessSound();
                  showToast(res.message, 'success');
                  setShowWithdrawModal(false);
                  await onRefreshData(); // refresh parent balances in App.tsx
                }
              } catch (err: any) {
                playFailureSound();
                showToast(err.message || 'Withdrawal transaction failed', 'error');
              } finally {
                setWithdrawing(false);
              }
            }}
            disabled={withdrawing || !bankName || accountNumber.length !== 10}
            className="w-full bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-full py-4 text-xs font-bold tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {withdrawing ? (
              <>
                <div className="spinner !w-5 !h-5 border-white/20 !border-left-emerald-400" />
                <span>Processing secure transfer...</span>
              </>
            ) : (
              <span>CONFIRM INSTANT PAYOUT</span>
            )}
          </button>
        </div>
      </div>
    )}
    </PullToRefresh>
  );
}
