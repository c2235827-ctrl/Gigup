import React, { useState, useEffect, useRef } from 'react';
import { Phone, CheckCircle, ArrowLeft, KeyRound, Scale, Shield } from 'lucide-react';
import { ApiService } from '../api';
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from '../data/legalData';

interface RegisterStep1Props {
  onNextStep: (phone: string, code: string) => void;
  onNavigate: (screen: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface CaptchaDisplayProps {
  code: string;
  onRefresh: () => void;
}

export function CaptchaDisplay({ code, onRefresh }: CaptchaDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !code) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#0D1F3D';
    ctx.fillRect(0, 0, width, height);

    // Noise lines
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(59,126,248,${Math.random() * 0.4 + 0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    // Noise dots
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw each character with variation
    const colors = ['#3B7EF8', '#60A5FA', '#FFFFFF', '#93C5FD', '#3B7EF8', '#BFDBFE'];
    const charWidth = width / (code.length + 1);

    code.split('').forEach((char, i) => {
      ctx.save();
      const x = charWidth * (i + 0.9);
      const y = height / 2 + (Math.random() * 8 - 4);
      ctx.translate(x, y);
      ctx.rotate((Math.random() - 0.5) * 0.4);
      ctx.font = `bold ${24 + Math.random() * 6}px monospace`;
      ctx.fillStyle = colors[i % colors.length];
      ctx.shadowColor = colors[i % colors.length];
      ctx.shadowBlur = 4;
      ctx.fillText(char, 0, 0);
      ctx.restore();
    });

  }, [code]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }} className="my-4">
      <p style={{ fontSize: '13px', color: '#8A96A3', textAlign: 'center' }} className="font-semibold text-text-muted">
        Enter the code shown in the box below
      </p>
      <div style={{
        borderRadius: '12px',
        overflow: 'hidden',
        border: '2px solid rgba(59,126,248,0.3)',
        boxShadow: '0 0 20px rgba(59,126,248,0.2)',
      }}>
        <canvas
          ref={canvasRef}
          width={220}
          height={64}
          style={{ display: 'block' }}
        />
      </div>
      <button
        onClick={onRefresh}
        type="button"
        style={{
          background: 'none',
          border: 'none',
          color: '#3B7EF8',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
        }}
        className="hover:underline"
      >
        🔄 Can't read it? Get a new code
      </button>
    </div>
  );
}

export default function RegisterStep1({ onNextStep, onNavigate, showToast }: RegisterStep1Props) {
  const [phone, setPhone] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('terms');

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the OTP input field
  useEffect(() => {
    if (isOtpSent && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [isOtpSent]);

  // Auto-format standard Nigerian phone: numbers only, max 11 digits
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (rawVal.length <= 11) {
      setPhone(rawVal);
    }
  };

  // Trigger verification and navigate to next step
  const triggerVerification = async (userInput: string) => {
    if (userInput.length !== 6) return;
    showToast('Verification code entered! Let\'s setup your card profile.', 'success');
    onNextStep(phone, userInput);
  };

  // Limit OTP input to 6 digits and auto-submit
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (rawVal.length <= 6) {
      setOtpCode(rawVal);
      if (rawVal.length === 6) {
        triggerVerification(rawVal);
      }
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 11) {
      showToast('Please enter a valid 11-digit phone number (e.g., 08012345678)', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await ApiService.sendOtp(phone);
      setCaptchaCode(res.code || '');
      setIsOtpSent(true);
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
    if (resendLoading) return;
    setResendLoading(true);
    try {
      const res = await ApiService.sendOtp(phone); // Use the same phone number
      setCaptchaCode(res.code || '');
      setOtpCode(''); // reset typed buffer
      showToast('New verification code generated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate new code', 'error');
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      showToast('Security verification code must be exactly 6 digits', 'error');
      return;
    }
    triggerVerification(otpCode);
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
            <h2 className="text-2xl font-extrabold text-primary-dark">
              {isOtpSent ? 'Verify Your Number' : 'Create Account'}
            </h2>
            <span className="text-xs bg-bg-light text-primary-blue px-2.5 py-1 rounded-full font-bold">
              Step 1 of 3
            </span>
          </div>
          <p className="text-text-muted text-sm">
            {isOtpSent ? 'Enter the code displayed in the box below' : 'Let\'s get started. Enter your mobile phone number.'}
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
                We will display a security verification code on your screen.
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
              <CaptchaDisplay code={captchaCode} onRefresh={handleResendOTP} />
              
              <div className="relative mt-4">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                  <KeyRound className="w-5 h-5" />
                </span>
                <input
                  id="otp-input"
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Type 6-digit code"
                  autoFocus
                  value={otpCode}
                  onChange={handleOtpChange}
                  required
                  className="w-full bg-bg-light border border-gray-200 text-primary-dark font-bold tracking-widest text-center rounded-2xl pl-11 pr-4 py-3.5 text-xl placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              id="verify-otp-btn"
              type="submit"
              disabled={loading || resendLoading}
              className="w-full bg-primary-blue hover:bg-primary-blue/90 disabled:bg-primary-blue/50 text-white rounded-full py-4 text-base font-semibold transition-all shadow-md mt-4 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading || resendLoading ? <div className="spinner !w-5 !h-5 border-white/20 !border-left-white" /> : 'Verify'}
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
                🔒 Certificated gigupnigeria.com legal center
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
