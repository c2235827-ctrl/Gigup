export interface User {
  id: string;
  phone: string;
  full_name: string;
  referral_code: string;
  wallet_balance: number;
  unread_notifications?: number;
  total_referrals?: number;
  created_at?: string;
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
