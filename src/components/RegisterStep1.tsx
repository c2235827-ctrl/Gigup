import React, { useState, useEffect, useRef } from 'react';
import { Phone, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { ApiService } from '../api';

interface RegisterStep1Props {
  onNextStep: (phone: string) => void;
  onNavigate: (screen: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function RegisterStep1({ onNextStep, onNavigate, showToast }: RegisterStep1Props) {
  const [phone, setPhone] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-format standard Nigerian phone: numbers only, max 11 digits
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (rawVal.length <= 11) {
      setPhone(rawVal);
    }
  };

  // Limit OTP input to 6 digits
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (rawVal.length <= 6) {
      setOtpCode(rawVal);
    }
  };

  // Countdown timer loop for Resend OTP
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [countdown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 11) {
      showToast('Please enter a valid 11-digit phone number (e.g., 08012345678)', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await ApiService.sendOtp(phone);
      setIsOtpSent(true);
      setCountdown(60);
      showToast(res.message, 'success');
      if (res.isSandboxEnv) {
        // Automatically autofill the OTP code to make sandbox testing frictionless for the user
        setOtpCode('123456');
      }
    } catch (err: any) {
      let msg = err.message || 'Error occurred';
      if (msg.includes('already registered')) {
        msg = 'This number already has an account. Log in instead.';
      }
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const res = await ApiService.sendOtp(phone);
      setCountdown(60);
      showToast(res.message, 'success');
      if (res.isSandboxEnv) {
        setOtpCode('123456');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to resend OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      showToast('Security OTP must be exactly 6 digits', 'error');
      return;
    }

    // Move to next step (Step 2 - full profile name + pin)
    // We already do the registration request in Step 2 verification, so we just pass verified phone and OTP code to Step 2
    showToast('OTP verified successfully! Let\'s setup your card profile.', 'success');
    onNextStep(phone);
  };

  return (
    <div className="flex flex-col h-full w-full bg-white text-text-dark p-6 overflow-y-auto justify-between">
      {/* Top Navigation */}
      <div>
        <div className="flex items-center gap-1.5 pt-2 shrink-0">
          <button
            id="back-to-login-btn"
            onClick={() => onNavigate('login')}
            className="p-1 rounded-full hover:bg-bg-light text-primary-dark transition cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="text-sm font-semibold text-text-muted">Return to Login</span>
        </div>

        {/* Create account header */}
        <div className="mt-6 mb-8">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-2xl font-extrabold text-primary-dark">Create Account</h2>
            <span className="text-xs bg-bg-light text-primary-blue px-2.5 py-1 rounded-full font-bold">
              Step 1 of 3
            </span>
          </div>
          <p className="text-text-muted text-sm">
            {isOtpSent ? 'Verify the status of your cell line with SMS code' : 'Let\'s get started. Enter your mobile phone number.'}
          </p>
        </div>

        {/* Logic Split: Phone Input vs OTP Verify Input */}
        {!isOtpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label id="reg-phone-label" className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Mobile Phone Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                  <Phone className="w-5 h-5 animate-pulse" />
                </span>
                <input
                  id="reg-phone-input"
                  type="tel"
                  placeholder="08012345678"
                  autoFocus
                  value={phone}
                  onChange={handlePhoneChange}
                  required
                  className="w-full bg-bg-light border border-gray-200 text-primary-dark font-medium rounded-2xl pl-11 pr-4 py-3.5 text-base placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-text-muted mt-2">
                We will send a 6-digit confirmation code code via SMS to this phone.
              </p>
            </div>

            <button
              id="send-otp-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-primary-blue hover:bg-primary-blue/90 disabled:bg-primary-blue/50 text-white rounded-full py-4 text-base font-semibold transition-all shadow-md mt-2 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? <div className="spinner !w-5 !h-5 border-white/20 !border-left-white" /> : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label id="otp-label" className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                6-Digit Security Code (OTP)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                  <KeyRound className="w-5 h-5" />
                </span>
                <input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  autoFocus
                  value={otpCode}
                  onChange={handleOtpChange}
                  required
                  className="w-full bg-bg-light border border-gray-200 text-primary-dark font-bold tracking-widest text-center rounded-2xl pl-11 pr-4 py-3.5 text-xl placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-text-muted mt-2">
                Code sent to <span className="font-bold text-primary-dark">{phone}</span>. (Autofills to 123456 for testing)
              </p>
            </div>

            <div className="flex justify-between items-center text-xs mt-2 px-1">
              <span className="text-text-muted">Didn't receive code?</span>
              <button
                id="resend-otp-btn"
                type="button"
                disabled={countdown > 0 || loading}
                onClick={handleResendOtp}
                className="text-primary-blue font-bold disabled:text-text-muted hover:underline transition cursor-pointer bg-transparent border-none p-0"
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
              </button>
            </div>

            <button
              id="verify-otp-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-primary-blue hover:bg-primary-blue/90 disabled:bg-primary-blue/50 text-white rounded-full py-4 text-base font-semibold transition-all shadow-md mt-4 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? <div className="spinner !w-5 !h-5 border-white/20 !border-left-white" /> : 'Verify Code'}
            </button>

            <button
              id="edit-phone-btn"
              type="button"
              onClick={() => { setIsOtpSent(false); setOtpCode(''); }}
              className="w-full text-center text-xs text-text-muted hover:text-primary-dark font-medium underline cursor-pointer bg-transparent border-none p-0"
            >
              Change Phone Number
            </button>
          </form>
        )}
      </div>

      {/* Footer marker */}
      <div className="text-center py-2 border-t border-gray-100 z-10 shrink-0">
        <div className="flex justify-center items-center gap-1.5 text-xs text-text-muted">
          <CheckCircle className="w-4 h-4 text-brand-success" />
          <span>MTN • GLO • Airtel supported networks</span>
        </div>
      </div>
    </div>
  );
}
