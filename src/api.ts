import { User, DataPlan, WalletTransaction, DataOrder, Notification as CustomNotification } from './types';

const API_BASE_URL = 'https://ndcztauwnkycknrbbmix.supabase.co/functions/v1';

const getHeaders = () => {
  const token = localStorage.getItem('gigup_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

let currentSubscribedTopic: string | null = null;

export function subscribeToUserNotifications(ntfyTopic: string) {
  if (!ntfyTopic || !('Notification' in window)) return;
  if (currentSubscribedTopic === ntfyTopic) return;
  if ((window as any)._gigupNtfy) {
    try { (window as any)._gigupNtfy.close(); } catch {}
  }
  currentSubscribedTopic = ntfyTopic;
  Notification.requestPermission().then(permission => {
    if (permission !== 'granted') return;
    try {
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
      (window as any)._gigupNtfy = eventSource;
    } catch (err) {
      console.warn('ntfy SSE connection failed:', err);
    }
  });
}

export function unsubscribeFromNotifications() {
  if ((window as any)._gigupNtfy) {
    try { (window as any)._gigupNtfy.close(); } catch {}
    delete (window as any)._gigupNtfy;
  }
  currentSubscribedTopic = null;
}

async function request(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers || {}) },
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return data;
}

export const ApiService = {

  // 1. Send OTP — returns code for CAPTCHA display
  async sendOtp(phone: string): Promise<{ success: boolean; code: string; message: string }> {
    const data = await request('send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    return {
      success: true,
      code: data.code,
      message: data.message || 'Enter the code displayed on your screen',
    };
  },

  // 2. Verify CAPTCHA code & create account
  async verifyOtpAndCreate(payload: {
    phone: string;
    code: string;
    full_name: string;
    pin: string;
    referral_code?: string;
  }): Promise<{ success: boolean; user: User }> {
    const data = await request('verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    localStorage.setItem('gigup_token', data.token || '');
    localStorage.setItem('gigup_user', JSON.stringify(data.user));
    if (data.user?.ntfy_topic) subscribeToUserNotifications(data.user.ntfy_topic);
    return { success: true, user: data.user };
  },

  // 3. Login
  async login(phone: string, pin: string): Promise<{ success: boolean; token: string; user: User }> {
    const data = await request('login', {
      method: 'POST',
      body: JSON.stringify({ phone, pin }),
    });
    localStorage.setItem('gigup_token', data.token);
    localStorage.setItem('gigup_user', JSON.stringify(data.user));
    if (data.user?.ntfy_topic) subscribeToUserNotifications(data.user.ntfy_topic);
    return { success: true, token: data.token, user: data.user };
  },

  // 4. Get data plans
  async getDataPlans(network?: string): Promise<DataPlan[]> {
    const endpoint = network ? `get-data-plans?network=${network}` : 'get-data-plans';
    const data = await request(endpoint);
    return data.plans || [];
  },

  // 5. Buy data
  async buyData(planId: string, recipientPhone: string): Promise<{
    success: boolean;
    status: string;
    cashback_earned: number;
    cashback_balance: number;
    wallet_balance: number;
    message: string;
  }> {
    const data = await request('buy-data', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, recipient_phone: recipientPhone }),
    });
    // Update local user cache with new balances
    const cachedUser = localStorage.getItem('gigup_user');
    if (cachedUser) {
      const user = JSON.parse(cachedUser);
      user.wallet_balance = data.wallet_balance ?? user.wallet_balance;
      user.cashback_balance = data.cashback_balance ?? user.cashback_balance;
      localStorage.setItem('gigup_user', JSON.stringify(user));
    }
    return data;
  },

  // 6. Initiate wallet top-up
  async initiateTopup(amount: number): Promise<{ success: boolean; payment_link: string; tx_ref: string }> {
    const data = await request('initiate-topup', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    return { success: true, payment_link: data.payment_link, tx_ref: data.tx_ref };
  },

  // 6b. Confirm Flutterwave callback payment
  async confirmCallback(tx_ref: string, amount: number): Promise<{ success: boolean; message?: string }> {
    const data = await request('confirm-callback', {
      method: 'POST',
      body: JSON.stringify({ tx_ref, amount }),
    });
    return { success: data.success ?? true, message: data.message };
  },

  // 7. Get profile
  async getProfile(): Promise<User> {
    const data = await request('get-profile');
    const user = data.user;
    localStorage.setItem('gigup_user', JSON.stringify(user));
    if (user?.ntfy_topic) subscribeToUserNotifications(user.ntfy_topic);
    return user;
  },

  // 8. Get transactions
  async getTransactions(type: 'all' | 'wallet' | 'orders' | 'notifications' = 'all'): Promise<{
    wallet_transactions: WalletTransaction[];
    data_orders: DataOrder[];
    notifications: CustomNotification[];
  }> {
    const data = await request(`get-transactions?type=${type}`);
    return {
      wallet_transactions: data.wallet_transactions || [],
      data_orders: data.data_orders || [],
      notifications: data.notifications || [],
    };
  },

  // 9. Request cashback withdrawal
  async requestWithdrawal(payload: {
    amount: number;
    bank_name: string;
    account_number: string;
    account_name: string;
  }): Promise<{ success: boolean; message: string }> {
    const data = await request('request-withdrawal', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { success: true, message: data.message };
  },

  // 10. Delete account
  async deleteAccount(pin: string): Promise<{ success: boolean; message: string }> {
    const data = await request('delete-account', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    return { success: true, message: data.message };
  },

  // 11. Logout
  logout() {
    localStorage.removeItem('gigup_token');
    localStorage.removeItem('gigup_user');
    unsubscribeFromNotifications();
  },

  // 12. Get cached user (no API call)
  getCachedUser(): User | null {
    try {
      const userStr = localStorage.getItem('gigup_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  // 13. Is logged in
  isLoggedIn(): boolean {
    const token = localStorage.getItem('gigup_token');
    return !!(token && token.length > 0);
  },
};
