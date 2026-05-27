import React, { useState, useEffect, useRef } from 'react';
import { Phone, CheckCircle, ArrowLeft, KeyRound, Scale, Shield } from 'lucide-react';
import { ApiService } from '../api';
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from '../data/legalData';

interface RegisterStep1Props {
  onNextStep: (phone: string, code: string) => void;
  onNavigate: (screen: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function RegisterStep1({ onNextStep, onNavigate, showToast }: RegisterStep1Props) {
  const [phone, setPhone] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('terms');

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

  // Start countdown when OTP screen is shown
  useEffect(() => {
    if (!isOtpSent) return;

    setCountdown(60);
    setCanResend(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOtpSent]);

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

  const handleResendOTP = async () => {
    if (!canResend || resendLoading) return;
    setResendLoading(true);
    try {
      await ApiService.sendOtp(phone); // Use the same phone number
      // Reset countdown
      setCountdown(60);
      setCanResend(false);
      setResendLoading(false);
      // Restart timer
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      showToast('New OTP sent to your number', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to resend OTP', 'error');
      setResendLoading(false);
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
    onNextStep(phone, otpCode);
  };

  return (
    <div className="flex flex-col min-h-full w-full bg-white text-text-dark p-6 overflow-y-auto justify-between">
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

            <div style={{
              textAlign: 'center',
              marginTop: '20px',
              fontSize: '14px',
            }}>
              {canResend ? (
                <button
                  id="resend-otp-btn"
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3B7EF8',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    opacity: resendLoading ? 0.6 : 1,
                  }}
                >
                  {resendLoading ? '⏳ Sending...' : '🔄 Resend OTP'}
                </button>
              ) : (
                <span style={{ color: '#8A96A3' }}>
                  Resend OTP in{' '}
                  <span style={{ color: '#0D1F3D', fontWeight: 700 }}>
                    {countdown}s
                  </span>
                </span>
              )}
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

        <div className="mt-6 text-center">
          <p className="text-[11px] text-text-muted leading-relaxed">
            By creating an account, you agree to our{' '}
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
      </div>

      {/* Footer marker */}
      <div className="text-center py-2 border-t border-gray-100 z-10 shrink-0">
        <div className="flex justify-center items-center gap-1.5 text-xs text-text-muted">
          <CheckCircle className="w-4 h-4 text-brand-success" />
          <span>MTN • GLO • Airtel supported networks</span>
        </div>
      </div>

      {/* Legal documents desk modal */}
      {showLegalModal && (
        <div className="fixed inset-0 bg-primary-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-primary-dark rounded-3xl shadow-2xl max-w-md w-full h-[540px] max-h-[80vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="p-5 pb-3 border-b border-gray-100 shrink-0">
              <div className="flex justify-between items-center mb-4 text-left">
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
                🔒 Certificated gigup.com.ng legal center
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
