export interface User {
  id: string;
  phone: string;
  full_name: string;
  referral_code: string;
  wallet_balance: number;
  cashback_balance?: number;
  can_withdraw?: boolean;
  cashback_to_withdrawal?: number;
  pending_withdrawal?: {
    amount: number;
    bank_name: string;
    account_number: string;
    account_name: string;
    created_at?: string;
  } | null;
  unread_notifications?: number;
  total_referrals?: number;
  signup_bonus_claimed?: boolean;
  created_at?: string;
  ntfy_topic?: string;
}

export interface DataPlan {
  id: string;
  network: 'MTN' | 'GLO' | 'AIRTEL';
  plan_name: string;
  size_label: string;
  price: number;
  validity: string;
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
}

export interface DataOrder {
  id: string;
  network: 'MTN' | 'GLO' | 'AIRTEL';
  plan_name: string;
  recipient_phone: string;
  price: number;
  amount?: number;
  smedata_ref?: string | null;
  status: 'success' | 'failed' | 'pending';
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
