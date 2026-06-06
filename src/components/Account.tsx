import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Copy, Check, Share2, HelpCircle, LogOut, Trash2, Bell, History, KeyRound, ChevronRight, CheckCircle, Mail, MessageSquare, Sparkles, ArrowDownLeft, ArrowUpRight, Smartphone, Download } from 'lucide-react';
import { ApiService } from '../api';
import { User, WalletTransaction } from '../types';
import PullToRefresh from './PullToRefresh';
import { FAQ_DATA, TERMS_OF_SERVICE, PRIVACY_POLICY } from '../data/legalData';
import { requestPushPermission, isPushPermissionGranted } from '../onesignal';

interface AccountProps {
  user: User;
  transactions: WalletTransaction[];
  onNavigate: (screen: string) => void;
  onLogout: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshData?: () => Promise<void>;
  onTriggerInstall?: () => void;
  isStandalone?: boolean;
  initialScrollTo?: string;
}

export default function Account({ user, transactions = [], onNavigate, onLogout, showToast, onRefreshData, onTriggerInstall, isStandalone = false, initialScrollTo }: AccountProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  
  const [pushEnabled, setPushEnabled] = useState(false);

  const referralSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isPushPermissionGranted().then(setPushEnabled);
  }, []);

  useEffect(() => {
    if (initialScrollTo === 'referral' && referralSectionRef.current) {
      setTimeout(() => {
        referralSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [initialScrollTo]);

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    setPushEnabled(granted);
    if (granted) {
      showToast('🔔 Push notifications enabled!', 'success');
    }
  };
  
  // Cashback history modal overlay
  const [showCashbackHistoryModal, setShowCashbackHistoryModal] = useState(false);
  
  // Security Change PIN States
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [updatingPin, setUpdatingPin] = useState(false);

  // Help support overlay
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [activeSupportTab, setActiveSupportTab] = useState<'contact' | 'faq' | 'terms' | 'privacy'>('contact');
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Delete Account States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePin, setDeletePin] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    // 1. Try modern clipboard API
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('Modern Clipboard API failed, attempting legacy input fallback...', err);
      }
    }

    // 2. Fallback to hidden textarea copy command
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Position offscreen securely
      textArea.style.position = 'fixed';
      textArea.style.left = '-99999px';
      textArea.style.top = '0';
      textArea.style.opacity = '0';
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Core fallback clipboard copy failed:', err);
      return false;
    }
  };

  const handleCopyCode = () => {
    const inviteLink = `${window.location.origin}/signup?ref=${user.referral_code}`;
    copyToClipboard(user.referral_code).then((success) => {
      setCopiedCode(true);
      if (success) {
        showToast(`Referral code ${user.referral_code} copied! 🎁`, 'success');
      } else {
        showToast(`Referral code is ${user.referral_code}`, 'info');
      }
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const handleShareCode = () => {
    const shareText = `Get 1GB free data + 10% cashback on airtime and data on GigUp! Sign up with my code: ${user.referral_code}`;
    if (navigator.share) {
      navigator.share({
        title: 'GigUp PWA Invite',
        text: shareText,
        url: window.location.origin,
      }).catch(() => {
        // Fallback
        handleCopyShare(shareText);
      });
    } else {
      handleCopyShare(shareText);
    }
  };

  const handleCopyShare = (text: string) => {
    copyToClipboard(text).then((success) => {
      if (success) {
        showToast('Referral invite link copied to clipboard. Share with friends! 🚀', 'success');
      } else {
        showToast('Invite text created. Copy and share with associates! 🎁', 'info');
      }
    });
  };

  const handlePinUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPin || !newPin || !confirmNewPin) {
      showToast('All fields are required', 'error');
      return;
    }
    if (newPin !== confirmNewPin) {
      showToast('New PINs do not match', 'error');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      showToast('PIN must be exactly 4 digits', 'error');
      return;
    }

    setUpdatingPin(true);
    try {
      const res = await ApiService.changePin(currentPin, newPin);
      if (res.success) {
        showToast('PIN changed successfully! ✅', 'success');
        setCurrentPin('');
        setNewPin('');
        setConfirmNewPin('');
        setShowPinModal(false);
      }
    } catch (err: any) {
      if (err.message?.includes('Unauthorized') || err.message?.includes('Invalid token')) {
        ApiService.logout();
        onLogout();
        return;
      }
      showToast(err.message || 'Failed to change PIN', 'error');
    } finally {
      setUpdatingPin(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deletePin.length !== 4) {
      showToast('Please enter your 4-digit PIN', 'error');
      return;
    }

    setDeletingAccount(true);
    try {
      const res = await ApiService.deleteAccount(deletePin);
      if (res.success) {
        showToast('Account deleted. Goodbye 👋', 'success');
        setShowDeleteModal(false);
        setDeletePin('');
        
        setTimeout(() => {
          onLogout();
        }, 2000);
      }
    } catch (err: any) {
      showToast(err.message || 'Verification PIN error. Account not deleted.', 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <PullToRefresh
      onRefresh={async () => {
        if (onRefreshData) {
          await onRefreshData();
          showToast('Account balances synced successfully ⚡', 'success');
        }
      }}
      className="bg-bg-light pb-8"
    >
      
      {/* Profile Header section */}
      <div className="bg-primary-dark pt-6 pb-6 px-5 text-center text-white shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-24 h-24 bg-primary-blue/10 rounded-full blur-lg pointer-events-none"></div>

        <div className="w-16 h-16 bg-primary-blue rounded-full flex items-center justify-center text-xl font-extrabold border-2 border-white/20 shadow-lg mx-auto mb-3">
          {getInitials(user.full_name)}
        </div>

        <h3 className="text-lg font-bold">{user.full_name}</h3>
        <p className="text-xs text-white/50">{user.phone}</p>

        <div className="mt-2.5 inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-0.5 rounded-full text-[10px] text-brand-success font-bold uppercase tracking-wider">
          <CheckCircle className="w-3.5 h-3.5 fill-emerald-500/15" /> Verified User
        </div>
      </div>

      {/* Referral Gradient Card */}
      <div ref={referralSectionRef} id="referral-section" className="p-5 shrink-0">
        <div className="bg-gradient-to-br from-primary-blue to-[#1d4ed8] rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-lg pointer-events-none"></div>
          
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[9px] bg-brand-cashback text-primary-dark font-extrabold px-2 py-0.5 rounded-full uppercase">
                REFERRAL PERKS
              </span>
              <h4 className="text-sm font-extrabold">Invite Friends, Earn Data 🎁</h4>
              <p className="text-[10px] text-white/80 max-w-[210px] leading-snug">
                You and your friend both receive free 1GB when they join and fund ₦2,000!
              </p>
            </div>

            <div className="bg-white/10 p-2.5 rounded-2xl text-center shrink-0 border border-white/10">
              <span className="text-brand-cashback block text-sm font-black font-mono">
                {user.total_referrals || 0}
              </span>
              <span className="text-[8px] text-white/80 block font-bold uppercase">Referred</span>
            </div>
          </div>

          {/* Referral Code Copy block */}
          <div className="flex gap-2.5 mt-4 pt-4 border-t border-white/10 items-center">
            <div className="flex-grow bg-white/5 border border-white/10 rounded-2xl px-4 py-2 flex justify-between items-center text-xs font-mono font-bold tracking-wider">
              <span className="text-white/60 text-[10px]">MY CODE:</span>
              <span className="text-brand-cashback font-black text-sm">{user.referral_code}</span>
            </div>

            <button
              id="copy-ref-btn"
              onClick={handleCopyCode}
              className="p-3 bg-white/10 hover:bg-white/15 rounded-2xl text-white outline-none active:scale-95 transition-all scroll-none cursor-pointer"
              title="Copy code"
            >
              {copiedCode ? <Check className="w-4 h-4 text-brand-success" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              id="share-ref-btn"
              onClick={handleShareCode}
              className="p-3 bg-brand-cashback text-primary-dark rounded-2xl font-bold hover:bg-brand-cashback/90 outline-none active:scale-95 transition-all scroll-none cursor-pointer"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Account Navigation Menus list */}
      <div className="px-5 space-y-2.5">
        
        {/* Row 1: Transaction History */}
        <button
          onClick={() => onNavigate('wallet_history')}
          className="w-full bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between text-left shadow-sm active:bg-gray-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted shrink-0">
              <History className="w-4 h-4 text-primary-dark" />
            </div>
            <div>
              <span className="text-xs font-bold text-primary-dark block leading-none">Billing Ledger History</span>
              <span className="text-[10px] text-text-muted mt-1 block">Inspect card statement, cashback and credit lines</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
        </button>

        {/* Row 1.5: Cashback History */}
        <button
          id="cashback-history-trigger-btn"
          onClick={() => setShowCashbackHistoryModal(true)}
          className="w-full bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between text-left shadow-sm active:bg-gray-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F59E0B]/5 flex items-center justify-center text-[#F59E0B] shrink-0 border border-amber-100">
              <Sparkles className="w-4 h-4 text-[#F59E0B] fill-amber-300/10" />
            </div>
            <div>
              <span className="text-xs font-bold text-primary-dark block leading-none">Cashback History Ledger</span>
              <span className="text-[10px] text-text-muted mt-1 block">Verify all 10% instant refunds and rewards stats</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
        </button>

        {/* Row 2: Notifications */}
        <button
          onClick={() => onNavigate('notifications')}
          className="w-full bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between text-left shadow-sm active:bg-gray-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted shrink-0">
              <Bell className="w-4 h-4 text-primary-dark" />
            </div>
            <div>
              <span className="text-xs font-bold text-primary-dark block leading-none">Inbox Notifications</span>
              <span className="text-[10px] text-text-muted mt-1 block">Check cash releases, SMS alerts, system bonuses</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
        </button>

        {/* Row 3: Security PIN update */}
        <button
          onClick={() => setShowPinModal(true)}
          className="w-full bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between text-left shadow-sm active:bg-gray-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted shrink-0">
              <KeyRound className="w-4 h-4 text-primary-dark" />
            </div>
            <div>
              <span className="text-xs font-bold text-primary-dark block leading-none">Update Login PIN</span>
              <span className="text-[10px] text-text-muted mt-1 block">Adjust security PIN for rapid account validations</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
        </button>

        {/* Row 3.5: Install App (PWA option) */}
        {!isStandalone && onTriggerInstall && (
          <button
            id="pwa-install-row-btn"
            onClick={onTriggerInstall}
            className="w-full bg-emerald-50/60 text-emerald-700 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between text-left shadow-sm hover:bg-emerald-100/30 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block leading-none text-emerald-800">Install GigUp Mobile App</span>
                <span className="text-[10px] text-emerald-600/95 mt-1 block font-medium">Get 10x faster startup speed, offline access & PWA benefits</span>
              </div>
            </div>
            <Download className="w-4 h-4 text-emerald-600 shrink-0" />
          </button>
        )}

        {/* OneSignal Push Notifications Opt-in Section */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-xs font-bold text-primary-dark uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>🔔</span> Push Notifications
          </h3>
          <p className="text-[11px] text-text-muted mb-4 leading-normal">
            Get notified instantly when your data is delivered, cashback is earned, or we have a special offer for you.
          </p>
          {pushEnabled ? (
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold select-none">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Push Notifications Enabled
            </div>
          ) : (
            <button
              onClick={handleEnablePush}
              className="w-full py-2.5 bg-primary-blue text-white font-bold rounded-xl text-xs hover:bg-primary-blue/90 active:scale-[0.98] transition cursor-pointer"
            >
              Enable Push Notifications
            </button>
          )}
        </div>

        {/* Row 4: Support center */}
        <button
          onClick={() => setShowSupportModal(true)}
          className="w-full bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between text-left shadow-sm active:bg-gray-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-muted shrink-0">
              <HelpCircle className="w-4 h-4 text-primary-dark" />
            </div>
            <div>
              <span className="text-xs font-bold text-primary-dark block leading-none">Contact Support Care</span>
              <span className="text-[10px] text-text-muted mt-1 block font-normal text-glow">24/7 client dispatch, whatsapp and email channels</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
        </button>

        {/* Row 5: Logout */}
        <button
          onClick={onLogout}
          className="w-full bg-red-50 text-brand-danger rounded-2xl p-4 border border-red-100/50 flex items-center justify-between text-left shadow-sm hover:bg-red-100/[0.15] transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-brand-danger shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold block leading-none">Sign Out of Session</span>
              <span className="text-[10px] text-brand-danger/70 mt-1 block">Safely clear cache tokens from active viewport</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-brand-danger/40 shrink-0" />
        </button>

        {/* Row 6: Delete Account */}
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full bg-red-50 text-red-600 rounded-2xl p-4 border border-red-100/40 flex items-center justify-between text-left shadow-sm hover:bg-red-100/[0.12] transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100/85 flex items-center justify-center text-red-600 shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-red-600 block leading-none">Delete Account</span>
              <span className="text-[10px] text-red-500/80 mt-1 block">Permanently erase auth records and cash registers</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-red-400 shrink-0" />
        </button>

      </div>

      {/* Change PIN Modal Dialog */}
      {showPinModal && (
        <div className="fixed inset-0 bg-primary-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-white text-primary-dark rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h5 className="font-extrabold text-sm uppercase text-primary-dark tracking-wide flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-primary-blue" /> Change Security PIN
              </h5>
              <button
                onClick={() => setShowPinModal(false)}
                className="text-xs font-bold text-text-muted hover:text-primary-dark cursor-pointer bg-transparent border-none p-0"
              >
                Close
              </button>
            </div>

            <form onSubmit={handlePinUpdate} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                  Current 4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-bg-light border border-gray-200 text-center text-base py-2.5 rounded-xl text-primary-dark font-extrabold tracking-widest focus:outline-none focus:border-primary-blue"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                  New 4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-bg-light border border-gray-200 text-center text-base py-2.5 rounded-xl text-primary-dark font-extrabold tracking-widest focus:outline-none focus:border-primary-blue"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                  Confirm New PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-bg-light border border-gray-200 text-center text-base py-2.5 rounded-xl text-primary-dark font-extrabold tracking-widest focus:outline-none focus:border-primary-blue"
                />
              </div>

              <button
                type="submit"
                disabled={updatingPin}
                className="w-full bg-primary-blue text-white py-3 rounded-full text-xs font-bold shadow transition hover:bg-primary-blue/95 cursor-pointer mt-2"
              >
                {updatingPin ? 'Updating PIN cache...' : 'CONFIRM PIN CHANGE'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Technical Support & Legal Documents Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-primary-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-primary-dark rounded-3xl shadow-2xl max-w-md w-full h-[580px] max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header - Fixed */}
            <div className="p-5 pb-3 border-b border-gray-100 shrink-0">
              <div className="flex justify-between items-center mb-4">
                <h5 className="font-extrabold text-sm uppercase text-primary-dark tracking-wide flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-primary-blue" /> Help & Support Hub
                </h5>
                <button
                  onClick={() => {
                    setShowSupportModal(false);
                    setActiveSupportTab('contact');
                    setFaqSearchQuery('');
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-primary-dark w-7 h-7 rounded-full flex items-center justify-center cursor-pointer text-xs font-bold transition font-mono border-none"
                >
                  ✕
                </button>
              </div>

              {/* Beautiful Tab Selection Pills */}
              <div className="flex gap-1 bg-gray-50 border border-gray-150 rounded-2xl p-1 shadow-xs overflow-x-auto scrollbar-none">
                {[
                  { key: 'contact', label: 'Support' },
                  { key: 'faq', label: 'FAQs' },
                  { key: 'terms', label: 'Terms' },
                  { key: 'privacy', label: 'Privacy' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveSupportTab(tab.key as any);
                    }}
                    className={`flex-1 py-1.5 px-2 text-center rounded-xl text-[10px] uppercase font-extrabold tracking-wide transition whitespace-nowrap cursor-pointer border-none ${
                      activeSupportTab === tab.key
                        ? 'bg-primary-dark text-white shadow-xs'
                        : 'text-text-muted hover:text-primary-dark hover:bg-white/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-5 pt-3 scrollbar-none space-y-4">
              {activeSupportTab === 'contact' && (
                <div className="space-y-4 text-center animate-fade-in">
                  <span className="text-4xl block my-1">📞</span>
                  <h6 className="font-extrabold text-base text-primary-dark leading-tight">How can we help you today, {user?.full_name?.split(' ')[0]}?</h6>
                  <p className="text-xs text-text-muted leading-relaxed px-2">
                    Our support agents are active 24/7. Instantly escalate failed topups, wallet queries, accounts, or card settings.
                  </p>

                  <div className="space-y-2.5 pt-3">
                    <a
                      href="mailto:hello@gigupnigeria.com"
                      onClick={() => { showToast('Email dispatch opened ✉️', 'info'); }}
                      className="flex items-center gap-3 bg-bg-light border border-gray-200 hover:border-gray-300 rounded-2xl p-4 text-left transition text-xs font-bold text-primary-dark"
                    >
                      <Mail className="w-5 h-5 text-primary-blue shrink-0" />
                      <div>
                        <span className="block leading-none text-xs font-extrabold">Email Support Team</span>
                        <span className="text-[10px] font-normal text-text-muted mt-1.5 block">hello@gigupnigeria.com • 5m SLA</span>
                      </div>
                    </a>

                    <a
                      href="https://wa.me/2349064704370"
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => { showToast('WhatsApp router opened 💬', 'info'); }}
                      className="flex items-center gap-3 bg-bg-light border border-gray-200 hover:border-gray-300 rounded-2xl p-4 text-left transition text-xs font-bold text-primary-dark"
                    >
                      <MessageSquare className="w-5 h-5 text-green-500 shrink-0" />
                      <div>
                        <span className="block leading-none text-xs font-extrabold">WhatsApp Secure Chat</span>
                        <span className="text-[10px] font-normal text-text-muted mt-1.5 block">+234 906 470 4370 • Live Admin</span>
                      </div>
                    </a>
                  </div>

                  <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 mt-4 text-left">
                    <h6 className="text-[11px] font-extrabold text-[#1E3A8A] uppercase tracking-wide">💡 Average Resolution Time</h6>
                    <p className="text-[10px] text-blue-700/80 mt-1 leading-relaxed">
                      94% of our client disputes are completely resolved within 5 minutes. Feel free to ping us!
                    </p>
                  </div>
                </div>
              )}

              {activeSupportTab === 'faq' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Search Box */}
                  <div className="relative shrink-0">
                    <input
                      type="text"
                      placeholder="Search frequently asked questions..."
                      value={faqSearchQuery}
                      onChange={(e) => setFaqSearchQuery(e.target.value)}
                      className="w-full bg-bg-light border border-gray-200 text-xs font-bold rounded-2xl pl-4 pr-10 py-2.5 placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all"
                    />
                    {faqSearchQuery && (
                      <button
                        onClick={() => setFaqSearchQuery('')}
                        className="absolute right-3.5 top-2.5 text-[11px] text-text-muted hover:text-primary-dark font-extrabold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* FAQ Categories & List */}
                  <div className="space-y-5 flex-col flex text-left">
                    {(() => {
                      const query = faqSearchQuery.toLowerCase().trim();
                      let hasResults = false;

                      const rendered = FAQ_DATA.map((category) => {
                        const filteredItems = category.items.filter(
                          (item) =>
                            item.question.toLowerCase().includes(query) ||
                            item.answer.toLowerCase().includes(query)
                        );

                        if (filteredItems.length === 0) return null;
                        hasResults = true;

                        return (
                          <div key={category.title} className="space-y-2.5">
                            <h6 className="text-[10px] font-extrabold text-text-dark/40 uppercase tracking-widest pl-1">
                              {category.title}
                            </h6>
                            <div className="space-y-2">
                              {filteredItems.map((item) => {
                                const isExpanded = expandedFaq === item.question;
                                return (
                                  <div
                                    key={item.question}
                                    className="bg-bg-light border border-gray-200/50 rounded-2xl overflow-hidden transition-all duration-200"
                                  >
                                    <button
                                      onClick={() =>
                                        setExpandedFaq(isExpanded ? null : item.question)
                                      }
                                      className="w-full px-4 py-3 text-left flex justify-between items-center gap-2 border-none bg-transparent"
                                    >
                                      <span className="text-[11px] font-bold text-primary-dark leading-snug">
                                        {item.question}
                                      </span>
                                      <span className={`text-[11px] font-extrabold shrink-0 text-primary-blue transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                        ❯
                                      </span>
                                    </button>
                                    {isExpanded && (
                                      <div className="px-4 pb-3 pt-1 border-t border-gray-100 text-[10px] text-text-muted leading-relaxed whitespace-pre-line">
                                        {item.answer}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });

                      if (!hasResults) {
                        return (
                          <div className="text-center py-8">
                            <span className="text-3xl">🔍</span>
                            <h6 className="text-xs font-bold text-primary-dark uppercase mt-2">No Matching Answers</h6>
                            <p className="text-[10px] text-text-muted max-w-[200px] mx-auto mt-1 leading-relaxed">
                              Try searching for general topics such as "cashback", "wallet", "MTN", or "accounts".
                            </p>
                          </div>
                        );
                      }

                      return rendered;
                    })()}
                  </div>
                </div>
              )}

              {activeSupportTab === 'terms' && (
                <div className="space-y-4 animate-fade-in text-left">
                  <div className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-2xl p-3 mb-2">
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Terms of Service</span>
                    <span className="text-[9px] font-extrabold text-primary-blue uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      Updated: {TERMS_OF_SERVICE.lastUpdated}
                    </span>
                  </div>

                  <p className="text-[10px] text-text-muted leading-relaxed font-semibold italic">
                    Please read these Terms of Service carefuly before using the GigUp application. By registering and using GigUp, you agree to be bound by these Terms of Service.
                  </p>

                  <div className="space-y-4 pt-1 divide-y divide-gray-100">
                    {TERMS_OF_SERVICE.sections.map((sect) => (
                      <div key={sect.title} className="pt-3 first:pt-0">
                        <h6 className="text-[11px] font-extrabold text-primary-dark uppercase tracking-wide mb-1.5 mt-1.5 block">
                          {sect.title}
                        </h6>
                        <p className="text-[10px] text-text-muted leading-relaxed whitespace-pre-line">
                          {sect.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSupportTab === 'privacy' && (
                <div className="space-y-4 animate-fade-in text-left">
                  <div className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-2xl p-3 mb-2">
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Privacy & Policy</span>
                    <span className="text-[9px] font-extrabold text-[#10B981] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      Updated: {PRIVACY_POLICY.lastUpdated}
                    </span>
                  </div>

                  <p className="text-[10px] text-text-muted leading-relaxed font-semibold italic">
                    GigUp is committed to protecting your personal information in compliance with the Nigeria Data Protection Regulation (NDPR) 2019 and the Nigeria Data Protection Act (NDPA) 2023.
                  </p>

                  <div className="space-y-4 pt-1 divide-y divide-gray-100">
                    {PRIVACY_POLICY.sections.map((sect) => (
                      <div key={sect.title} className="pt-3 first:pt-0">
                        <h6 className="text-[11px] font-extrabold text-primary-dark uppercase tracking-wide mb-1.5 mt-1.5 block">
                          {sect.title}
                        </h6>
                        <p className="text-[10px] text-text-muted leading-relaxed whitespace-pre-line">
                          {sect.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer - Fixed */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 text-center shrink-0">
              <span className="text-[9px] text-text-muted block tracking-wider uppercase font-bold">
                🔒 Protected by Supabase RSA-256 Auth Node
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal Dialog */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-primary-dark/85 backdrop-blur-sm z-50 flex items-center justify-center p-5 select-none animate-fade-in">
          <div className="bg-white text-primary-dark rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h5 className="font-extrabold text-sm uppercase text-red-600 tracking-wide flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-red-600" /> Delete Account
              </h5>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePin('');
                }}
                className="text-white hover:text-white/80 bg-red-600 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer text-xs font-bold font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-text-muted text-left leading-relaxed">
                This action is permanent and cannot be undone. All your data, wallet balance, and cashback will be lost.
              </p>

              {user?.cashback_balance && user.cashback_balance > 0 ? (
                <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-xl p-3 text-[11px] font-bold flex items-center gap-2">
                  <span>⚠️ You have ₦{user.cashback_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} cashback that will be lost.</span>
                </div>
              ) : null}
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div className="text-left">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                  Enter your PIN to confirm
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={deletePin}
                  onChange={(e) => setDeletePin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-bg-light border border-gray-200 text-center text-base py-2.5 rounded-xl text-primary-dark font-extrabold tracking-widest focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePin('');
                  }}
                  className="flex-1 border border-gray-200 hover:border-gray-300 text-primary-dark py-3 rounded-full text-xs font-bold transition cursor-pointer text-center bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deletingAccount || deletePin.length !== 4}
                  className="flex-1 bg-red-600 border border-red-600 hover:bg-red-700 text-white py-3 rounded-full text-xs font-bold shadow-md transition disabled:bg-red-300 disabled:border-red-300 cursor-pointer text-center"
                >
                  {deletingAccount ? 'Erasing...' : 'Delete Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Cashback History Modal Overlay */}
      {showCashbackHistoryModal && (
        <div className="fixed inset-0 bg-primary-dark/80 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-[32px] w-full max-w-sm p-6 space-y-4 shadow-2xl pb-10 border-t border-gray-100 text-primary-dark select-none animate-slide-up">
            
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h5 className="font-extrabold text-sm uppercase text-primary-dark tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4.5 h-4.5 text-[#F59E0B] fill-amber-300/20" /> Cashback Rewards Statement
              </h5>
              <button
                onClick={() => setShowCashbackHistoryModal(false)}
                className="text-xs font-bold text-text-muted hover:text-primary-dark cursor-pointer bg-transparent border-none p-0"
              >
                Close
              </button>
            </div>

            <div className="bg-[#F59E0B]/5 border border-amber-200/50 rounded-2xl p-4 flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-text-muted block text-[9px] uppercase">Cashback Wallet Balance</span>
                <span className="text-lg font-black font-mono text-[#F59E0B]">
                  ₦{(user.cashback_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase text-text-muted block">Withdrawer State</span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-[9px] uppercase border inline-block ${
                  user.pending_withdrawal 
                    ? 'bg-amber-100 text-[#F59E0B] border-amber-200' 
                    : user.cashback_balance >= 2000 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}>
                  {user.pending_withdrawal 
                    ? 'Pending Payout' 
                    : user.cashback_balance >= 2000 
                      ? 'Ready to Pay' 
                      : 'Accumulating'
                  }
                </span>
              </div>
            </div>

            {/* List transactions where description contains "cashback" (case insensitive) */}
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {(() => {
                const cbTrxs = transactions.filter(tx => 
                  tx.description.toLowerCase().includes('cashback')
                );

                if (cbTrxs.length === 0) {
                  return (
                    <div className="py-8 text-center flex flex-col items-center justify-center space-y-2">
                      <span className="text-3xl text-gray-300">🎟️</span>
                      <p className="text-[10px] text-text-muted leading-relaxed max-w-[200px] font-medium">
                        No cashback rewards logged yet. Every data bundle purchase gives 10% instant refund!
                      </p>
                    </div>
                  );
                }

                return cbTrxs.map((tx) => {
                  const isCredit = tx.type === 'credit';
                  return (
                    <div 
                      key={tx.id} 
                      className="bg-bg-light rounded-xl p-3 border border-gray-100 flex items-center justify-between text-xs animate-fade-in"
                    >
                      <div className="flex items-center gap-2 max-w-[190px]">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                          isCredit 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-red-50 text-red-500 border-red-100'
                        }`}>
                          {isCredit ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0 text-left">
                          <span className="font-bold text-primary-dark block leading-none truncate mb-1">
                            {tx.description}
                          </span>
                          <span className="text-[8px] text-text-muted block">
                            {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`font-black font-mono text-[11px] block ${
                          isCredit ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          {isCredit ? '+' : '-'}₦{(tx.amount || 0).toLocaleString()}
                        </span>
                        <span className="text-[7.5px] text-emerald-600 font-bold uppercase tracking-wider block mt-0.5">
                          Approved
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <button
               onClick={() => setShowCashbackHistoryModal(false)}
               className="w-full bg-primary-dark text-white py-3.5 rounded-full text-xs font-bold shadow-md cursor-pointer transition hover:bg-black uppercase"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

    </PullToRefresh>
  );
}
