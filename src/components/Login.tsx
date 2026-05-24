import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Zap, Eye, EyeOff, Lock, Phone, HelpCircle } from 'lucide-react';
import { ApiService } from '../api';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  onNavigate: (screen: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function Login({ onLoginSuccess, onNavigate, showToast }: LoginProps) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

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
        cleanMsg = 'Phone number is not registered on this environment.';
      }
      showToast(cleanMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="flex flex-col h-full w-full justify-between bg-gradient-to-b from-primary-dark via-[#09152b] to-[#050b18] text-white p-6 relative overflow-y-auto"
      style={{ contentVisibility: 'auto' }}
    >
      {/* Background glow lamps */}
      <div className="absolute top-10 right-10 w-44 h-44 bg-primary-blue/20 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute bottom-20 left-10 w-44 h-44 bg-brand-cashback/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Mode pill toggler in top margin */}
      <div className="flex justify-between items-center z-10 pt-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Zap className="w-5 h-5 text-primary-blue fill-primary-blue" />
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
      </div>

      {/* Footnote with Signup redirect button */}
      <div className="z-10 text-center pt-4 border-t border-white/5 max-w-xs w-full mx-auto shrink-0">
        <p className="text-sm text-text-muted">
          Don't have an account?{' '}
          <button
            id="go-to-signup-btn"
            onClick={() => onNavigate('register_1')}
            className="text-primary-blue font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}
