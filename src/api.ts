import { User, DataPlan, WalletTransaction, DataOrder, Notification as CustomNotification } from './types';

const API_BASE_URL = 'https://ndcztauwnkycknrbbmix.supabase.co/functions/v1';

// Common request headers
const getHeaders = () => {
  const token = localStorage.getItem('gigup_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

let currentSubscribedTopic: string | null = null;

// ntfy push notification subscription handler
export function subscribeToUserNotifications(ntfyTopic: string) {
  if (!ntfyTopic || !('Notification' in window)) return;
  if (currentSubscribedTopic === ntfyTopic) return;
  
  if ((window as any)._gigupNtfy) {
    try {
      (window as any)._gigupNtfy.close();
    } catch {}
  }
  
  currentSubscribedTopic = ntfyTopic;
  
  Notification.requestPermission().then(permission => {
    if (permission !== 'granted') return;
    
    try {
      // Subscribe to user's personal ntfy topic via EventSource
      const eventSource = new EventSource(`https://ntfy.sh/${ntfyTopic}/sse`);
      
      eventSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'message') {
            new Notification(data.title || 'GigUp', {
              body: data.message,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
            });
          }
        } catch {}
      });

      // Store in window so it can be closed on logout
      (window as any)._gigupNtfy = eventSource;
    } catch (err) {
      console.warn('Failed to connect to ntfy SSE:', err);
    }
  });
}

export const ApiService = {
  // 1. Send OTP
  async sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/send-otp`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to send OTP');
    }
    return { success: true, message: data.message || 'OTP sent successfully' };
  },

  // 2. Verify OTP & Create Account
  async verifyOtpAndCreate(payload: {
    phone: string;
    code: string;
    full_name: string;
    pin: string;
    referral_code?: string;
  }): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`${API_BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to verify OTP');
    }
    
    // Save authentication details
    const token = data.token || 'live_token_' + Math.random().toString(36).substring(2);
    localStorage.setItem('gigup_token', token);
    localStorage.setItem('gigup_user', JSON.stringify(data.user));
    
    // Subscribe to push notifications
    if (data.user?.ntfy_topic) {
      subscribeToUserNotifications(data.user.ntfy_topic);
    }

    return { success: true, user: data.user };
  },

  // 3. Login
  async login(phone: string, pin: string): Promise<{ success: boolean; token: string; user: User }> {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ phone, pin }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Incorrect PIN or login failure');
    }
    
    localStorage.setItem('gigup_token', data.token);
    localStorage.setItem('gigup_user', JSON.stringify(data.user));
    
    // Subscribe to push notifications
    if (data.user?.ntfy_topic) {
      subscribeToUserNotifications(data.user.ntfy_topic);
    }

    return { success: true, token: data.token, user: data.user };
  },

  // 4. Get Data Plans
  async getDataPlans(network?: 'MTN' | 'GLO' | 'AIRTEL'): Promise<{ success: boolean; plans: DataPlan[] }> {
    const networkParam = network ? `?network=${network}` : '';
    const res = await fetch(`${API_BASE_URL}/get-data-plans${networkParam}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to fetch plans');
    }
    return { success: true, plans: data.plans || [] };
  },

  // 5. Buy Data (Auth required)
  async buyData(planId: string, recipientPhone: string): Promise<{
    success: boolean;
    status: 'success' | 'failed' | 'pending';
    cashback: number;
    cashback_earned?: number;
    cashback_balance?: number;
    wallet_balance?: number;
    message: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/buy-data`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ plan_id: planId, recipient_phone: recipientPhone }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to complete data purchase');
    }
    return {
      success: true,
      status: data.status || 'success',
      cashback: data.cashback || 0,
      cashback_earned: data.cashback_earned !== undefined ? data.cashback_earned : (data.cashback || 0),
      cashback_balance: data.cashback_balance,
      wallet_balance: data.wallet_balance,
      message: data.message || 'Purchased successfully'
    };
  },

  // 6. Initiate Wallet Top-Up (Auth required)
  async initiateTopup(amount: number): Promise<{ success: boolean; payment_link: string; tx_ref: string }> {
    if (amount < 2000) {
      throw new Error('Minimum wallet top-up is ₦2,000');
    }

    const res = await fetch(`${API_BASE_URL}/initiate-topup`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to initiate Top-Up');
    }
    return {
      success: true,
      payment_link: data.payment_link,
      tx_ref: data.tx_ref
    };
  },

  // 7. Get Profile (Auth required)
  async getProfile(): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`${API_BASE_URL}/get-profile`, {
      method: 'GET',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to fetch Profile');
    }
    localStorage.setItem('gigup_user', JSON.stringify(data.user));
    
    // Subscribe to push notifications
    if (data.user?.ntfy_topic) {
      subscribeToUserNotifications(data.user.ntfy_topic);
    }

    return { success: true, user: data.user };
  },

  // 8. Get Transactions (Auth required)
  async getTransactions(): Promise<{
    success: boolean;
    wallet_transactions: WalletTransaction[];
    data_orders: DataOrder[];
    notifications: CustomNotification[];
  }> {
    const res = await fetch(`${API_BASE_URL}/get-transactions?type=all`, {
      method: 'GET',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to fetch transactions');
    }
    return {
      success: true,
      wallet_transactions: data.wallet_transactions || [],
      data_orders: data.data_orders || [],
      notifications: data.notifications || []
    };
  },

  // 9. Process Callback
  async confirmCallback(txRef: string, amountStr: string): Promise<{ success: boolean; amount: number }> {
    const amount = parseFloat(amountStr) || 2000;
    const res = await this.getProfile();
    if (res.success) {
      return { success: true, amount };
    }
    throw new Error('Callback verification failed');
  },

  // 10. Request Withdrawal (Auth required)
  async requestWithdrawal(payload: {
    amount: number;
    bank_name: string;
    account_number: string;
    account_name: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/request-withdrawal`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data.error || data.success === false) {
      throw new Error(data.error || data.message || 'Failed to request withdrawal');
    }
    return {
      success: true,
      message: data.message || 'Withdrawal request submitted!'
    };
  },

  // 11. Delete Account (Auth required)
  async deleteAccount(pin: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/delete-account`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (!res.ok || data.error || data.success === false) {
      throw new Error(data.error || data.message || 'Failed to delete account');
    }
    return {
      success: true,
      message: data.message || 'Your account has been permanently deleted.'
    };
  }
};
