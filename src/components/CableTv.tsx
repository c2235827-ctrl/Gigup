import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Smartphone, Wallet, RefreshCw, Sparkles, AlertCircle, CheckCircle, Search, CreditCard, ChevronDown } from 'lucide-react';
import { ApiService } from '../api';
import { User } from '../types';
import { playSuccessSound, playFailureSound } from '../utils/audio';

interface CableTvProps {
  user: User;
  onNavigate: (screen: string, extras?: any) => void;
  onRefreshData: () => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface Provider {
  identifier: string;
  name: string;
}

interface CablePlan {
  plan_code: string;
  display: string;
  description: string;
  face_value: number;
  price: number;
}

export default function CableTv({ user, onNavigate, onRefreshData, showToast }: CableTvProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const [plans, setPlans] = useState<CablePlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<CablePlan | null>(null);

  const [iucNumber, setIucNumber] = useState('');
  const [verifyingIuc, setVerifyingIuc] = useState(false);
  const [verifiedCustomer, setVerifiedCustomer] = useState<string | null>(null);

  const [recipientPhone, setRecipientPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalAvailable = (user.wallet_balance || 0) + (user.bonus_balance || 0);

  // Fetch Cable Providers on Mount
  useEffect(() => {
    const fetchProviders = async () => {
      setLoadingProviders(true);
      try {
        const res = await ApiService.getCableProviders();
        if (res.success && res.providers) {
          setProviders(res.providers);
          if (res.providers.length > 0) {
            setSelectedProvider(res.providers[0]);
          }
        } else {
          showToast('Failed to load cable providers.', 'error');
        }
      } catch (err) {
        showToast('Error loading cable providers.', 'error');
      } finally {
        setLoadingProviders(false);
      }
    };
    fetchProviders();
  }, []);

  // Fetch plans when selectedProvider changes
  useEffect(() => {
    if (!selectedProvider) return;

    const fetchPlans = async () => {
      setLoadingPlans(true);
      setSelectedPlan(null);
      setVerifiedCustomer(null);
      try {
        const res = await ApiService.getCablePlans(selectedProvider.identifier);
        if (res.success && res.plans) {
          setPlans(res.plans);
          if (res.plans.length > 0) {
            setSelectedPlan(res.plans[0]);
          }
        } else {
          showToast('Failed to load cable plans.', 'error');
        }
      } catch (err) {
        showToast('Error loading cable plans.', 'error');
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, [selectedProvider]);

  // Reset verification when IUC changes
  useEffect(() => {
    setVerifiedCustomer(null);
  }, [iucNumber]);

  const handleVerifyIuc = async () => {
    if (!iucNumber) {
      showToast('Please enter an IUC or SmartCard number first.', 'info');
      return;
    }
    if (!selectedProvider) {
      showToast('Please select a cable provider.', 'info');
      return;
    }

    setVerifyingIuc(true);
    setVerifiedCustomer(null);
    try {
      const res = await ApiService.verifyCableIuc(iucNumber, selectedProvider.identifier);
      if (res.success && res.customer_name) {
        setVerifiedCustomer(res.customer_name);
        showToast('IUC verified successfully! ✅', 'success');
      } else {
        showToast(res.error || 'Unable to verify this IUC. Check the number and retry.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'IUC verification failed.', 'error');
    } finally {
      setVerifyingIuc(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    setRecipientPhone(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) {
      showToast('Please select a cable provider.', 'error');
      return;
    }
    if (!selectedPlan) {
      showToast('Please select a cable plan.', 'error');
      return;
    }
    if (!iucNumber) {
      showToast('Please enter an IUC/SmartCard number.', 'error');
      return;
    }
    if (!verifiedCustomer) {
      showToast('Please verify your IUC number before proceeding.', 'error');
      return;
    }
    if (!recipientPhone || recipientPhone.length < 11) {
      showToast('Please enter a valid 11-digit notification phone number.', 'error');
      return;
    }

    const price = selectedPlan.price;
    if (price > totalAvailable) {
      playFailureSound();
      const generatedOrderId = 'CB' + Math.random().toString(16).substring(2, 10).toUpperCase();
      const generatedReceiptId = 'REC' + Math.random().toString(16).substring(2, 10).toUpperCase();

      showToast('Insufficient balance for this purchase.', 'error');
      onNavigate('receipt', {
        status: 'failed',
        network: selectedProvider.name,
        plan_name: selectedPlan.display,
        recipient_phone: iucNumber,
        amount: price,
        id: generatedOrderId,
        receiptId: generatedReceiptId,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        reason: 'Insufficient wallet balance. Please fund your wallet.'
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiService.buyCable(selectedProvider.identifier, selectedPlan.plan_code, iucNumber, recipientPhone);
      if (res.success) {
        await onRefreshData();
        playSuccessSound();

        showToast('Cable TV subscription active! 🎉', 'success');

        const orderId = (res as any).order_id || (res as any).id || 'CB' + Math.random().toString(16).substring(2, 10).toUpperCase();
        const receiptId = (res as any).receipt_id || 'REC' + Math.random().toString(16).substring(2, 10).toUpperCase();

        onNavigate('receipt', {
          status: 'success',
          network: selectedProvider.name,
          plan_name: selectedPlan.display,
          recipient_phone: iucNumber,
          amount: price,
          id: orderId,
          receiptId: receiptId,
          date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          cashback: 0,
          bonus_used: 0
        });

        // Reset
        setIucNumber('');
        setVerifiedCustomer(null);
        setRecipientPhone('');
      } else {
        throw new Error(res.message || 'VTU gateway declined the request.');
      }
    } catch (err: any) {
      playFailureSound();
      showToast(err.message || 'Cable purchase failed', 'error');

      const orderId = 'CB' + Math.random().toString(16).substring(2, 10).toUpperCase();
      const receiptId = 'REC' + Math.random().toString(16).substring(2, 10).toUpperCase();

      onNavigate('receipt', {
        status: 'failed',
        network: selectedProvider.name,
        plan_name: selectedPlan.display,
        recipient_phone: iucNumber,
        amount: price,
        id: orderId,
        receiptId: receiptId,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        reason: err.message || 'VTU gateway declined cable activation.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative select-none">
      {/* Header */}
      <header className="h-14 bg-white border-b border-gray-150 flex items-center justify-between px-5 shrink-0 z-40">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-900 cursor-pointer font-bold text-xs select-none bg-transparent border-none p-2 rounded-xl transition hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Home</span>
        </button>
        <span className="font-extrabold text-[#111827] text-xs uppercase tracking-widest">Cable TV</span>
        <div className="w-16" />
      </header>

      {/* Provider Selector Cards */}
      <div className="bg-primary-dark pt-4 pb-4 px-5 text-white shrink-0 space-y-3 shadow-md">
        <div>
          <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 pl-1">Cable Provider</h4>
          {loadingProviders ? (
            <div className="flex justify-center py-2">
              <RefreshCw className="w-4 h-4 animate-spin text-white/70" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 bg-white/5 p-1 rounded-full border border-white/5">
              {providers.map((prov) => (
                <button
                  key={prov.identifier}
                  type="button"
                  onClick={() => setSelectedProvider(prov)}
                  className={`py-1.5 rounded-full font-bold text-xs cursor-pointer transition-all whitespace-nowrap overflow-hidden text-ellipsis ${
                    selectedProvider?.identifier === prov.identifier
                      ? 'bg-white text-primary-dark shadow font-extrabold'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {prov.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form Area */}
      <form onSubmit={handleSubmit} className="p-5 flex-grow overflow-y-auto space-y-5 pb-[140px]">
        {/* IUC Input & Verification */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-150 space-y-4">
          <h5 className="text-xs font-bold text-primary-dark uppercase px-1">IUC / SmartCard Number</h5>
          <div className="flex gap-2">
            <div className="relative flex-1 flex items-center">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                <CreditCard className="w-5 h-5" />
              </span>
              <input
                id="cable-iuc-input"
                type="tel"
                placeholder="Enter SmartCard/IUC"
                value={iucNumber}
                onChange={(e) => setIucNumber(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full bg-slate-50 border border-gray-200 text-primary-dark font-bold rounded-2xl pl-11 pr-3 py-3 text-sm placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all"
              />
            </div>
            <button
              type="button"
              onClick={handleVerifyIuc}
              disabled={verifyingIuc || !iucNumber}
              className="px-4 bg-primary-blue hover:bg-primary-blue/95 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-2xl transition-all active:scale-95 flex items-center gap-1 cursor-pointer border-none"
            >
              {verifyingIuc ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : 'Verify'}
            </button>
          </div>

          {verifiedCustomer && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 animate-fade-in">
              <div className="flex items-start gap-2 text-emerald-800">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-emerald-600">Verified Customer</span>
                  <span className="text-xs font-black block mt-0.5">{verifiedCustomer}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cable Plans Dropdown List */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-150 space-y-4">
          <h5 className="text-xs font-bold text-primary-dark uppercase px-1">Choose Package</h5>
          
          {loadingPlans ? (
            <div className="py-6 flex flex-col justify-center items-center text-primary-blue gap-1 bg-slate-50 rounded-2xl border border-dashed border-gray-200">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-[11px] font-medium">Fetching packages...</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
              {plans.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-4">No packages found for this provider.</p>
              ) : (
                plans.map((plan) => {
                  const isSelected = selectedPlan?.plan_code === plan.plan_code;
                  return (
                    <button
                      key={plan.plan_code}
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full text-left bg-slate-50 rounded-2xl p-3.5 border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'border-primary-blue bg-primary-blue/[0.02] ring-2 ring-primary-blue/10'
                          : 'border-gray-150 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="font-extrabold text-xs block text-slate-800 leading-tight">{plan.display}</span>
                        {plan.description && (
                          <span className="text-[10px] text-slate-500 block mt-1 leading-normal font-medium">{plan.description}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end shrink-0 pl-2">
                        {plan.face_value && plan.face_value > plan.price && (
                          <span className="text-[10px] text-gray-400 line-through font-mono leading-none mb-0.5">
                            ₦{plan.face_value.toLocaleString()}
                          </span>
                        )}
                        <span className="font-mono font-black text-xs text-emerald-600 leading-none">
                          ₦{plan.price.toLocaleString()}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Notification Phone Field */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-150 space-y-4">
          <h5 className="text-xs font-bold text-primary-dark uppercase px-1">Notification Line</h5>
          <div className="relative flex items-center">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
              <Smartphone className="w-5 h-5" />
            </span>
            <input
              id="cable-phone-input"
              type="tel"
              placeholder="08012345678"
              value={recipientPhone}
              onChange={handlePhoneChange}
              required
              className="w-full bg-slate-50 border border-gray-200 text-primary-dark font-bold rounded-2xl pl-11 pr-3 py-3 text-sm placeholder-gray-400 focus:bg-white focus:border-primary-blue focus:outline-none transition-all"
            />
          </div>
          
          <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-xs px-1">
            <span className="text-slate-500 font-semibold">Wallet Balance:</span>
            <span className="font-extrabold text-slate-800">
              ₦{totalAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || !verifiedCustomer}
            className={`w-full py-4 rounded-2xl text-xs font-black text-white shadow-md active:scale-[0.98] transition-all cursor-pointer border-none uppercase tracking-wider ${
              submitting || !verifiedCustomer ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#0F172A] hover:bg-slate-800'
            }`}
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Activating Package...</span>
              </div>
            ) : !verifiedCustomer ? (
              <span>Verify IUC to unlock purchase</span>
            ) : (
              <span>Activate Cable TV</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
