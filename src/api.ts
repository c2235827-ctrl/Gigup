import { User, DataPlan, WalletTransaction, DataOrder, Notification as CustomNotification, UserStreak, UserFlags, MonthlyReport, CheckinStatus, SurveyData } from './types';

const API_BASE_URL = 'https://ndcztauwnkycknrbbmix.supabase.co/functions/v1';
export const BASE_URL = API_BASE_URL;

const getHeaders = () => {
  const token = localStorage.getItem('gigup_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

let currentSubscribedTopic: string | null = null;

export function triggerNativeNotification(title: string, message: string) {
  // Notifications disabled as requested
}

export function subscribeToUserNotifications(ntfyTopic: string) {
  // Notifications disabled as requested
}

export function unsubscribeFromNotifications() {
  // Notifications disabled as requested
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

  async sendOtp(phone: string): Promise<{ success: boolean; code: string; message: string }> {
    const data = await request('send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    return { success: true, code: data.code, message: data.message };
  },

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
    if (data.token) localStorage.setItem('gigup_token', data.token);
    localStorage.setItem('gigup_user', JSON.stringify(data.user));
    if (data.user?.ntfy_topic) subscribeToUserNotifications(data.user.ntfy_topic);
    return { success: true, user: data.user };
  },

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

  async getDataPlans(network?: string): Promise<DataPlan[]> {
    const endpoint = network ? `get-data-plans?network=${network}` : 'get-data-plans';
    const data = await request(endpoint);
    return data.plans || [];
  },

  async buyData(planId: string, recipientPhone: string): Promise<{
    success: boolean;
    status: string;
    cashback_earned: number;
    cashback_balance: number;
    wallet_balance: number;
    message: string;
    bonus_balance?: number;
    bonus_used?: number;
  }> {
    const data = await request('buy-data', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, recipient_phone: recipientPhone }),
    });
    const cachedUser = localStorage.getItem('gigup_user');
    if (cachedUser) {
      const user = JSON.parse(cachedUser);
      user.wallet_balance = data.wallet_balance ?? user.wallet_balance;
      user.cashback_balance = data.cashback_balance ?? user.cashback_balance;
      user.bonus_balance = data.bonus_balance ?? user.bonus_balance;
      localStorage.setItem('gigup_user', JSON.stringify(user));
    }
    return data;
  },

  async buyAirtime(network: string, amount: number, recipientPhone: string): Promise<{
    success: boolean;
    status: string;
    face_value?: number;
    amount_charged?: number;
    wallet_balance?: number;
    cashback_balance?: number;
    message: string;
  }> {
    const data = await request('buy-airtime', {
      method: 'POST',
      body: JSON.stringify({ network, amount, recipient_phone: recipientPhone }),
    });
    const cachedUser = localStorage.getItem('gigup_user');
    if (cachedUser) {
      const user = JSON.parse(cachedUser);
      user.wallet_balance = data.wallet_balance ?? user.wallet_balance;
      user.cashback_balance = data.cashback_balance ?? user.cashback_balance;
      localStorage.setItem('gigup_user', JSON.stringify(user));
    }
    return data;
  },

  async getCableProviders(): Promise<{ success: boolean; providers: { identifier: string; name: string }[] }> {
    return await request('get-cable-plans?action=providers', { method: 'GET' });
  },

  async getCablePlans(identifier: string): Promise<{ success: boolean; plans: { plan_code: string; display: string; description: string; face_value: number; price: number }[] }> {
    return await request(`get-cable-plans?action=plans&identifier=${identifier}`, { method: 'GET' });
  },

  async verifyCableIuc(iuc: string, identifier: string): Promise<{ success: boolean; customer_name?: string; error?: string }> {
    return await request('get-cable-plans?action=verify', {
      method: 'POST',
      body: JSON.stringify({ iuc, identifier }),
    });
  },

  async buyCable(identifier: string, planCode: string, iuc: string, phone: string): Promise<{
    success: boolean;
    status: string;
    face_value?: number;
    amount_charged?: number;
    wallet_balance?: number;
    message: string;
  }> {
    const data = await request('buy-cable', {
      method: 'POST',
      body: JSON.stringify({ identifier, plan_code: planCode, iuc, phone }),
    });
    const cachedUser = localStorage.getItem('gigup_user');
    if (cachedUser) {
      const user = JSON.parse(cachedUser);
      user.wallet_balance = data.wallet_balance ?? user.wallet_balance;
      localStorage.setItem('gigup_user', JSON.stringify(user));
    }
    return data;
  },

  async getElectricityDiscos(): Promise<{ success: boolean; discos: { plan_id: string; plan_code: string; plan_name: string; min_amount: number; max_amount: number }[] }> {
    return await request('get-electricity-discos?action=discos', { method: 'GET' });
  },

  async verifyElectricityMeter(meter: string, plan: string, type: string): Promise<{ success: boolean; customer_name?: string; error?: string }> {
    return await request(`get-electricity-discos?action=verify&meter=${meter}&plan=${plan}&type=${type}`, { method: 'GET' });
  },

  async buyElectricity(disco: string, meter: string, meterType: string, amount: number, phone: string): Promise<{
    success: boolean;
    status: string;
    face_value?: number;
    amount_charged?: number;
    token?: string;
    wallet_balance?: number;
    message: string;
  }> {
    const data = await request('buy-electricity', {
      method: 'POST',
      body: JSON.stringify({ disco, meter, meter_type: meterType, amount, phone }),
    });
    const cachedUser = localStorage.getItem('gigup_user');
    if (cachedUser) {
      const user = JSON.parse(cachedUser);
      user.wallet_balance = data.wallet_balance ?? user.wallet_balance;
      localStorage.setItem('gigup_user', JSON.stringify(user));
    }
    return data;
  },

  async initiateTopup(amount: number): Promise<{ success: boolean; payment_link: string; tx_ref: string }> {
    const data = await request('initiate-topup', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    return { success: true, payment_link: data.payment_link, tx_ref: data.tx_ref };
  },

  async getProfile(): Promise<User> {
    const data = await request('get-profile');
    localStorage.setItem('gigup_user', JSON.stringify(data.user));
    if (data.user?.ntfy_topic) subscribeToUserNotifications(data.user.ntfy_topic);
    return data.user;
  },

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

  async changePin(currentPin: string, newPin: string): Promise<{ success: boolean; message: string }> {
    const data = await request('change-pin', {
      method: 'POST',
      body: JSON.stringify({ current_pin: currentPin, new_pin: newPin }),
    });
    return { success: true, message: data.message };
  },

  async deleteAccount(pin: string): Promise<{ success: boolean; message: string }> {
    const data = await request('delete-account', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    return { success: true, message: data.message };
  },

  async getRechargeCardSubscriptionStatus(): Promise<{
    success: boolean;
    eligible: boolean;
    subscription_id?: string;
    plan_type?: 'weekly' | 'monthly';
    batches_used_today?: number;
    daily_batch_limit?: number;
    batches_remaining_today?: number;
    max_cards_per_batch?: number;
    expires_at?: string;
    reason?: string;
    message?: string;
  }> {
    return await request('recharge-card-subscription', {
      method: 'POST',
      body: JSON.stringify({ action: 'status' }),
    });
  },

  async subscribeToRechargeCardPlan(planType: 'weekly' | 'monthly'): Promise<{
    success: boolean;
    subscription_id: string;
    plan_type: 'weekly' | 'monthly';
    price_paid: number;
    daily_batch_limit: number;
    expires_at: string;
  }> {
    return await request('recharge-card-subscription', {
      method: 'POST',
      body: JSON.stringify({ action: 'subscribe', plan_type: planType }),
    });
  },

  async getRechargeCardOptions(): Promise<{
    success: boolean;
    networks: {
      network: string;
      network_label: string;
      denominations: {
        face_value: number;
        price_per_card: number;
      }[];
    }[];
    limits: {
      max_quantity_per_order: number;
    };
  }> {
    return await request('recharge-card-purchase', {
      method: 'POST',
      body: JSON.stringify({ action: 'options' }),
    });
  },

  async getRechargeCardQuote(network: string, amount: number, quantity: number): Promise<{
    success: boolean;
    peyflex_cost_per_card: number;
    markup_per_card: number;
    price_per_card: number;
    quantity: number;
    total_cost: number;
    gigup_profit_per_card: number;
    gigup_total_profit: number;
  }> {
    return await request('recharge-card-purchase', {
      method: 'POST',
      body: JSON.stringify({ action: 'quote', network, amount, quantity }),
    });
  },

  async purchaseRechargeCards(payload: {
    network: string;
    amount: number;
    quantity: number;
    brand_name?: string;
    transaction_pin: string;
  }): Promise<{
    success: boolean;
    status: string;
    order_id: string;
    reference: string;
    quantity_delivered: number;
    cards: { pin: string; serial: string }[];
    total_charged: number;
    batches_remaining_today: number;
  }> {
    return await request('recharge-card-purchase', {
      method: 'POST',
      body: JSON.stringify({
        action: 'purchase',
        ...payload
      }),
    });
  },

  async getRechargeCardHistory(): Promise<{
    success: boolean;
    orders: {
      id: string;
      network: string;
      face_value: number;
      quantity_ordered: number;
      quantity_delivered: number;
      total_charged: number;
      gigup_profit: number;
      status: 'processing' | 'success' | 'partial' | 'failed' | 'pending_review';
      brand_name?: string;
      created_at: string;
    }[];
  }> {
    return await request('recharge-card-purchase', {
      method: 'POST',
      body: JSON.stringify({ action: 'history' }),
    });
  },

  async getRechargeCardBatchDetail(orderId: string): Promise<{
    success: boolean;
    order: any;
    cards: { id: string; pin: string; serial: string; revealed: boolean }[];
  }> {
    return await request('recharge-card-purchase', {
      method: 'POST',
      body: JSON.stringify({ action: 'batch_detail', order_id: orderId }),
    });
  },

  async getPriceEstimate(type: 'airtime' | 'electricity', provider: string | null, amount: number): Promise<{
    success: boolean;
    estimated_price: number;
    estimated_savings: number;
  }> {
    return await request('get-price-estimate', {
      method: 'POST',
      body: JSON.stringify({ type, provider, amount }),
    });
  },

  logout() {
    localStorage.removeItem('gigup_token');
    localStorage.removeItem('gigup_user');
    unsubscribeFromNotifications();
  },

  getCachedUser(): User | null {
    try {
      const userStr = localStorage.getItem('gigup_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch { return null; }
  },

  isLoggedIn(): boolean {
    const token = localStorage.getItem('gigup_token');
    return !!(token && token.length > 0);
  },
};

export async function startSession(token: string): Promise<{ session_id: string } | null> {
  try {
    const res = await fetch(`${BASE_URL}/session-start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return data.session_id ? { session_id: data.session_id } : null;
  } catch { return null; }
}

export async function endSession(token: string, session_id: string, duration_seconds: number): Promise<void> {
  try {
    await fetch(`${BASE_URL}/session-end`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id, duration_seconds }),
    });
  } catch { /* silent */ }
}

export async function trackStreak(token: string): Promise<{
  streak: number;
  reward_earned: number;
  reward_day: number;
  streak_broken: boolean;
  recovery_eligible: boolean;
  recovery_bonus: number;
  streak_record: UserStreak;
  double_cashback_active: boolean;
  double_cashback_expires_at: string | null;
  flags: UserFlags;
} | null> {
  try {
    const res = await fetch(`${BASE_URL}/track-streak`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return data.success ? data : null;
  } catch { return null; }
}

export async function getUserFlags(token: string): Promise<UserFlags | null> {
  try {
    const res = await fetch(`${BASE_URL}/user-flags`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get' }),
    });
    const data = await res.json();
    return data.flags ?? null;
  } catch { return null; }
}

export async function dismissFlag(token: string, action: 'dismiss_welcome' | 'dismiss_bonus' | 'dismiss_referral' | 'activate_double_cashback'): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/user-flags`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`dismissFlag error: POST /user-flags returned status ${res.status}. Response: ${errText}`);
      throw new Error(`Failed to dismiss flag ${action} on server: status ${res.status}`);
    }
  } catch (error) {
    console.error(`Network or API failure in dismissFlag for action '${action}':`, error);
    throw error;
  }
}

export async function getMonthlyReport(token: string): Promise<MonthlyReport | null> {
  try {
    const res = await fetch(`${BASE_URL}/get-monthly-report`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return data.report ?? null;
  } catch { return null; }
}

export async function getCheckinStatus(token: string): Promise<CheckinStatus | null> {
  try {
    const res = await fetch(`${BASE_URL}/checkin`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_status' }),
    });
    const data = await res.json();
    return data.success ? data : null;
  } catch { return null; }
}

export async function doCheckin(token: string): Promise<any | null> {
  try {
    const res = await fetch(`${BASE_URL}/checkin`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkin' }),
    });
    return await res.json();
  } catch { return null; }
}

export async function redeemVoucher(token: string, points: number): Promise<any | null> {
  try {
    const res = await fetch(`${BASE_URL}/checkin`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'redeem', points }),
    });
    return await res.json();
  } catch { return null; }
}

export async function getWeeklySurvey(token: string): Promise<SurveyData | null> {
  try {
    const res = await fetch(`${BASE_URL}/weekly-survey`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get' }),
    });
    const data = await res.json();
    return data.success ? data : null;
  } catch { return null; }
}

export async function submitSurveyAnswers(
  token: string,
  surveyPromptId: string,
  answers: { question_id: string; answer_text: string }[]
): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/weekly-survey`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit', survey_prompt_id: surveyPromptId, answers }),
    });
    const data = await res.json();
    return !!data.success;
  } catch { return false; }
}

export async function dismissSurvey(token: string, surveyPromptId: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/weekly-survey`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss', survey_prompt_id: surveyPromptId }),
    });
  } catch { /* silent */ }
}

export async function submitAppRating(token: string, stars: number, comment?: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/weekly-survey`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rate', stars, comment: comment ?? null }),
    });
    const data = await res.json();
    return !!data.success;
  } catch { return false; }
}



