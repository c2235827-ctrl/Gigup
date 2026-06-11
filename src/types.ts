export interface User {
  id: string;
  phone: string;
  full_name: string;
  referral_code: string;
  wallet_balance: number;
  cashback_balance: number;
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
  bonus_balance: number;
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
  status_message?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface UserStreak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  streak_reward_7_claimed: boolean;
  streak_reward_14_claimed: boolean;
  streak_reward_21_claimed: boolean;
  streak_reward_30_claimed: boolean;
}

export interface UserFlags {
  welcome_popup_dismissed: boolean;
  bonus_dropoff_popup_dismissed: boolean;
  referral_nudge_popup_dismissed: boolean;
  double_cashback_active: boolean;
  double_cashback_expires_at: string | null;
  referral_nudge_sent: boolean;
}

export interface MonthlyReport {
  user_name: string;
  month: string;
  total_orders: number;
  total_spent: number;
  total_cashback_earned: number;
  retail_savings: number;
  cashback_balance: number;
  wallet_balance: number;
  to_withdrawal: number;
  last_month_spent: number;
  last_month_cashback: number;
  spending_change: number;
}

export interface CheckinDay {
  day: string;
  date: string;
  is_today: boolean;
  is_friday: boolean;
  checked_in: boolean;
}

export interface UserPoints {
  total_points: number;
  cycle_points: number;
  checkin_count_this_cycle: number;
  last_checkin_date: string | null;
}

export interface Voucher {
  id: string;
  naira_value: number;
  points_spent: number;
  status: string;
  expires_at: string;
}

export interface CheckinStatus {
  points: UserPoints;
  vouchers: Voucher[];
  cycle: {
    days: CheckinDay[];
    cycle_ends_in_days: number;
    checked_in_count: number;
  };
  already_checked_in_today: boolean;
}
