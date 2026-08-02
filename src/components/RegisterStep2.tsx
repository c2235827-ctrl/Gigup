import React, { useState, useEffect } from 'react';
import { Lock, User as UserIcon, Eye, EyeOff, ArrowLeft, Heart, Sparkles } from 'lucide-react';
import { ApiService } from '../api';
import { User } from '../types';

interface RegisterStep2Props {
  phone: string;
  code: string;
  onRegisterSuccess: (user: User) => void;
  onPrevStep: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function RegisterStep2({ phone, code, onRegisterSuccess, onPrevStep, showToast }: RegisterStep2Props) {
  const [fullName, setFullName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [showRefField, setShowRefField] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  const [autoAppliedRef, setAutoAppliedRef] = useState(false);

  useEffect(() => {
    const pending = localStorage.getItem('gigup_pending_referral_code');
    if (pending) {
      setReferralCode(pending);
      setShowRefField(true);
      setAutoAppliedRef(true);
    }
  }, []);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (rawVal.length <= 4) {
      setPin(rawVal);
    }
  };

  const handleConfirmPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (rawVal.length <= 4) {
      setConfirmPin(rawVal);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      showToast('Please enter your full first name and last name', 'error');
      return;
    }
    if (pin.length !== 4) {
      showToast('PIN must be precisely 4 digits', 'error');
      return;
    }
    if (pin !== confirmPin) {
      showToast('Confirm PIN does not match. Please verify.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await ApiService.verifyOtpAndCreate({
        phone,
        code,
        full_name: fullName.trim(),
        pin,
        referral_code: referralCode ? referralCode.toUpperCase().trim() : undefined
      });

      if (res.success) {
        localStorage.removeItem('gigup_pending_referral_code');
        setCreatedUser(res.user);
        setShowSuccessOverlay(true);
        showToast('Account created successfully!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Registration failed. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishOnboarding = () => {
    if (createdUser) {
      onRegisterSuccess(createdUser);
    }
  };

  return (
    <div className="flex flex-col min-h-full w-full bg-white text-text-dark p-6 overflow-y-auto justify-between relative">
      <div>
        {/* Top return arrow */}
        <div className="flex items-center gap-1.5 pt-2 shrink-0">
          <button
            id="back-to-step1-btn"
            onClick={onPrevStep}
            className="p-1 rounded-full hover:bg-bg-light text-primary-dark transition cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="text-sm font-semibold text-text-muted">Return to phone step</span>
        </div>

        {/* Create account header */}
        <div className="mt-6 mb-8">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-2xl font-extrabold text-primary-dark">Personal Details</h2>
            <span className="text-xs bg-bg-light text-primary-blue px-2.5 py-1 rounded-full font-bold">
              Step 2 of 3
            </span>
          </div>
          <p className="text-text-muted text-sm">
            Setup your full name and confidential login PIN code
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone (read-only verification) */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Verified Phone Number
            </label>
            <input
              type="text"
              readOnly
              value={phone}
              className="w-full bg-bg-light border border-gray-100 text-gray-400 font-bold rounded-2xl px-4 py-3 text-base outline-none cursor-not-allowed"
            />
          </div>

          {/* Full Name */}
          <div>
            <label id="fullname-label" className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                <UserIcon className="w-5 h-5" />
              </span>
              <input
                id="fullname-input"
                type="text"
                placeholder="John Doe"
                autoFocus
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full bg-bg-light border border-gray-200 text-primary-dark font-medium rounded-2xl pl-11 pr-4 py-3 text-base placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all"
              />
            </div>
            <p className="text-[10px] text-text-muted mt-1.5">First name and Last name</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* PIN */}
            <div>
              <label id="pin-label-2" className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                4-Digit PIN
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="reg-pin-input"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={handlePinChange}
                  required
                  className="w-full bg-bg-light border border-gray-200 text-primary-dark font-bold tracking-widest text-center rounded-2xl pl-8 pr-8 py-3 text-base placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all"
                />
                <button
                  id="toggle-pin-btn-2"
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted hover:text-primary-dark cursor-pointer bg-transparent border-none"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm PIN */}
            <div>
              <label id="confirm-pin-label" className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                Confirm PIN
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="reg-confirm-pin"
                  type={showConfirmPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={handleConfirmPinChange}
                  required
                  className="w-full bg-bg-light border border-gray-200 text-primary-dark font-bold tracking-widest text-center rounded-2xl pl-8 pr-8 py-3 text-base placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all"
                />
                <button
                  id="toggle-confirm-pin-btn"
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted hover:text-primary-dark cursor-pointer bg-transparent border-none"
                >
                  {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Referral Option - Collapsible */}
          <div className="pt-2">
            {!showRefField ? (
              <button
                id="toggle-ref-btn"
                type="button"
                onClick={() => setShowRefField(true)}
                className="text-xs text-primary-blue font-bold hover:underline bg-transparent border-none p-0 cursor-pointer flex items-center gap-1"
              >
                + Have a referral code?
              </button>
            ) : (
              <div className="bg-bg-light rounded-2xl p-4 border border-dashed border-gray-200">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-primary-blue uppercase tracking-wider flex items-center gap-2">
                    Referral Code
                    {autoAppliedRef && (
                      <span className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded flex items-center">
                        ✓ AUTO-APPLIED
                      </span>
                    )}
                  </label>
                  {!autoAppliedRef && (
                    <button
                      type="button"
                      onClick={() => { setShowRefField(false); setReferralCode(''); }}
                      className="text-[10px] text-text-muted hover:text-primary-dark font-bold uppercase hover:underline cursor-pointer bg-transparent border-none"
                    >
                      Hide
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. ABC123"
                  maxLength={10}
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value);
                    if (e.target.value !== localStorage.getItem('gigup_pending_referral_code')) {
                      setAutoAppliedRef(false);
                    }
                  }}
                  className="w-full bg-white border border-gray-200 text-primary-dark font-mono font-bold uppercase rounded-xl px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:border-primary-blue"
                />
                <p className="text-[10px] text-text-muted mt-1">
                  You and your referrer earn 1GB each when you complete first topup.
                </p>
              </div>
            )}
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-primary-blue hover:bg-primary-blue/90 disabled:bg-primary-blue/50 text-white rounded-full py-4 text-base font-semibold transition-all shadow-md mt-6 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? <div className="spinner !w-5 !h-5 border-white/20 !border-left-white" /> : 'Create Account'}
          </button>
        </form>
      </div>

      {/* Footer support notice */}
      <div className="text-center py-2 border-t border-gray-100 shrink-0">
        <p className="text-[11px] text-text-muted">
          By signing up, you agree to secure VTU terms & SLA parameters.
        </p>
      </div>

      {/* Onboarding Success Screen Full Overlay (Step 3 of 3 Onboarding Completed!) */}
      {showSuccessOverlay && (
        <div className="absolute inset-0 bg-primary-dark text-white z-50 flex flex-col p-6 text-center justify-between">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-blue/30 rounded-full blur-3xl pointer-events-none"></div>

          <div></div>

          <div className="my-auto space-y-6">
            <div className="w-24 h-24 bg-brand-cashback rounded-full flex items-center justify-center mx-auto shadow-xl shadow-brand-cashback/30 relative">
              <Sparkles className="w-12 h-12 text-primary-dark" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-brand-cashback tracking-widest font-extrabold uppercase bg-brand-cashback/10 px-3 py-1 rounded-full border border-brand-cashback/10">
                One-time welcome bonus for new users
              </span>
              <h3 className="text-2xl font-extrabold tracking-tight pt-2">🎉 Account created successfully!</h3>
              <p className="text-text-muted text-sm max-w-xs mx-auto">
                Fund your wallet to claim your FREE 1GB welcome data.
              </p>
              <p className="text-amber-400 text-xs font-bold max-w-xs mx-auto mt-2 animate-bounce">
                🎁 ₦500 welcome bonus added to your account — buy data now!
              </p>
            </div>

            {/* Checklist Box */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 text-left max-w-sm mx-auto space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-success/20 flex items-center justify-center text-brand-success font-bold text-xs">
                  ✓
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-white">1GB Welcome Data</h4>
                  <p className="text-[11px] text-text-muted">Fund your wallet with ₦2,000 or more to claim your FREE 1GB welcome data!</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-success/20 flex items-center justify-center text-brand-success font-bold text-xs">
                  ✓
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-white">10% Instant Cashback</h4>
                  <p className="text-[11px] text-text-muted">Instantly earned on wallet top-up and purchase orders</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-success/20 flex items-center justify-center text-brand-success font-bold text-xs">
                  ✓
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-white">Referral Code Verified</h4>
                  <p className="text-[11px] text-text-muted">Invite link: {createdUser?.referral_code} active</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 shrink-0">
            <button
              id="finish-onboarding-btn"
              onClick={handleFinishOnboarding}
              className="w-full bg-primary-blue hover:bg-primary-blue/90 text-white rounded-full py-4 text-base font-semibold shadow-lg shadow-primary-blue/30 cursor-pointer flex items-center justify-center gap-2"
            >
              Enter Home Wallet <Heart className="w-4 h-4 fill-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
