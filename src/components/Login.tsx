import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Zap, Eye, EyeOff, Lock, Phone, HelpCircle, Scale, Shield } from 'lucide-react';
import { ApiService } from '../api';
import { User } from '../types';
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from '../data/legalData';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  onNavigate: (screen: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function Login({ onLoginSuccess, onNavigate, showToast }: LoginProps) {
  useEffect(() => {
    if (ApiService.isLoggedIn()) {
      const cached = ApiService.getCachedUser();
      if (cached) {
        onLoginSuccess(cached);
      }
    }
  }, []);

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('terms');

  // Phone number state auto-formatter: numeric only, max 11 digits
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (rawVal.length <= 11) {
      setPhone(rawVal);
    }
  };

  // PIN state auto-formatter: numeric only, max 4 digits
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (rawVal.length <= 4) {
      setPin(rawVal);
    }
  };



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 11) {
      showToast('Please enter a valid 11-digit phone number (e.g., 08012345678)', 'error');
      return;
    }
    if (pin.length !== 4) {
      showToast('PIN must be precisely 4 digits', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await ApiService.login(phone, pin);
      showToast(`Welcome back, ${res.user.full_name}! 👋`, 'success');
      onLoginSuccess(res.user);
    } catch (err: any) {
      const msg = err.message || 'Login failed';
      let cleanMsg = msg;
      if (msg.includes('Incorrect PIN')) {
        cleanMsg = 'Wrong PIN. Please try again.';
      } else if (msg.includes('not registered')) {
        cleanMsg = 'Phone number not found. Please create an account.';
      }
      showToast(cleanMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="flex flex-col min-h-full w-full bg-gradient-to-b from-primary-dark via-[#09152b] to-[#050b18] text-white p-6 relative overflow-y-auto"
      style={{ contentVisibility: 'auto' }}
    >
      {/* Background glow lamps */}
      <div className="absolute top-10 right-10 w-44 h-44 bg-primary-blue/20 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute bottom-20 left-10 w-44 h-44 bg-brand-cashback/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Mode pill toggler in top margin */}
      <div className="flex justify-between items-center z-10 pt-2 shrink-0">
        <div className="flex items-center gap-2">
          <img 
            src="https://cdn-icons-png.flaticon.com/512/15749/15749415.png" 
            alt="GigUp Logo" 
            className="w-8 h-8 object-contain bg-white rounded-xl p-1 shadow-md border border-white/20"
            referrerPolicy="no-referrer"
          />
          <span className="font-extrabold text-lg tracking-wide">GigUp</span>
        </div>
      </div>

      <div className="my-auto py-6 z-10 max-w-sm w-full mx-auto flex flex-col shrink-0">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold tracking-tight mb-2">Welcome Back!</h2>
          <p className="text-text-muted text-sm">Enter your phone number and PIN to continue</p>
        </div>

        {/* LoginForm */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label id="phone-label" className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Phone Number
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                <Phone className="w-5 h-5" />
              </span>
              <input
                id="phone-input"
                type="tel"
                placeholder="08012345678"
                autoComplete="tel"
                value={phone}
                onChange={handlePhoneChange}
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-base font-medium placeholder-white/35 focus:bg-white/10 focus:border-primary-blue focus:outline-none transition-all placeholder:font-normal"
              />
            </div>
            <p className="text-[10px] text-text-muted mt-1.5">Standard 11-digit Nigerian format</p>
          </div>

          <div>
            <label id="pin-label" className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Security PIN
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                <Lock className="w-5 h-5" />
              </span>
              <input
                id="login-pin-input"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={handlePinChange}
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-12 py-3.5 text-xl font-bold tracking-widest placeholder-white/20 focus:bg-white/10 focus:border-primary-blue focus:outline-none transition-all"
              />
              <button
                id="toggle-pin-btn"
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-white"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>



          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-primary-blue hover:bg-primary-blue/90 disabled:bg-primary-blue/50 text-white rounded-full py-4 text-base font-semibold transition-all shadow-lg shadow-primary-blue/20 flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            {loading ? <div className="spinner !w-5 !h-5" /> : 'Log In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-[11px] text-text-muted leading-relaxed">
            By logging in, you agree to our{' '}
            <button
              type="button"
              onClick={() => {
                setLegalTab('terms');
                setShowLegalModal(true);
              }}
              className="text-primary-blue hover:underline bg-transparent border-none p-0 cursor-pointer font-bold inline"
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => {
                setLegalTab('privacy');
                setShowLegalModal(true);
              }}
              className="text-primary-blue hover:underline bg-transparent border-none p-0 cursor-pointer font-bold inline"
            >
              Privacy Policy
            </button>
          </p>
        </div>

        {/* Sign Up link — always visible */}
        <div className="mt-6 text-center pt-4 border-t border-white/10">
          <p className="text-sm text-text-muted">
            Don't have an account?{' '}
            <button
              id="go-to-signup-btn"
              type="button"
              onClick={() => onNavigate('register_1')}
              className="text-primary-blue font-bold hover:underline bg-transparent border-none p-0 cursor-pointer"
            >
              Create Account
            </button>
          </p>
        </div>
      </div>

      {/* Legal documents desk modal */}
      {showLegalModal && (
        <div className="absolute inset-0 bg-primary-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-primary-dark rounded-3xl shadow-2xl max-w-md w-full h-[540px] max-h-[80vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-5 pb-3 border-b border-gray-100 shrink-0">
              <div className="flex justify-between items-center mb-4">
                <h5 className="font-extrabold text-xs uppercase text-primary-dark tracking-wide flex items-center gap-1.5">
                  {legalTab === 'terms' ? (
                    <Scale className="w-4 h-4 text-primary-blue" />
                  ) : (
                    <Shield className="w-4 h-4 text-[#10B981]" />
                  )}{' '}
                  {legalTab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                </h5>
                <button
                  type="button"
                  onClick={() => setShowLegalModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-primary-dark w-7 h-7 rounded-full flex items-center justify-center cursor-pointer text-xs font-bold transition font-mono border-none"
                >
                  ✕
                </button>
              </div>

              {/* Beautiful Pill Switcher */}
              <div className="flex gap-1 bg-gray-50 border border-gray-150 rounded-2xl p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setLegalTab('terms')}
                  className={`flex-1 py-1.5 px-2 text-center rounded-xl text-[10px] uppercase font-extrabold tracking-wide transition cursor-pointer border-none ${
                    legalTab === 'terms'
                      ? 'bg-primary-dark text-white'
                      : 'text-text-muted hover:text-primary-dark hover:bg-white/50'
                  }`}
                >
                  Terms of Service
                </button>
                <button
                  type="button"
                  onClick={() => setLegalTab('privacy')}
                  className={`flex-1 py-1.5 px-2 text-center rounded-xl text-[10px] uppercase font-extrabold tracking-wide transition cursor-pointer border-none ${
                    legalTab === 'privacy'
                      ? 'bg-primary-dark text-white'
                      : 'text-text-muted hover:text-primary-dark hover:bg-white/50'
                  }`}
                >
                  Privacy Policy
                </button>
              </div>
            </div>

            {/* Scrollable document body */}
            <div className="flex-1 overflow-y-auto p-5 pt-3 scrollbar-none text-left">
              {legalTab === 'terms' ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-2xl p-3">
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Legal Desk</span>
                    <span className="text-[9px] font-extrabold text-primary-blue uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      Last Updated: {TERMS_OF_SERVICE.lastUpdated}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted leading-relaxed font-semibold italic">
                    Please read these Terms of Service carefully before purchasing or utilizing our reseller data services.
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
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-2xl p-3">
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Policy Desk</span>
                    <span className="text-[9px] font-extrabold text-[#10B981] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      Last Updated: {PRIVACY_POLICY.lastUpdated}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted leading-relaxed font-semibold italic">
                    Your privacy is fully protected in compliance with the Nigeria Data Protection Act (NDPR/NDPA).
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

            {/* Modal Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 text-center shrink-0">
              <span className="text-[9px] text-text-muted block tracking-wider uppercase font-bold">
                🔒 Certificated gigupnigeria.com legal center
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
