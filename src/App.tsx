import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home as HomeIcon, Signal, Wallet as WalletIcon, User as UserIcon, AlertCircle } from 'lucide-react';
import { ApiService } from './api';
import { User, WalletTransaction, DataOrder, Notification } from './types';

// Screen File imports
import Splash from './components/Splash';
import Login from './components/Login';
import RegisterStep1 from './components/RegisterStep1';
import RegisterStep2 from './components/RegisterStep2';
import Home from './components/Home';
import BuyData from './components/BuyData';
import Wallet from './components/Wallet';
import Account from './components/Account';
import Notifications from './components/Notifications';
import TopupCallback from './components/TopupCallback';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  // Session states
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [recentOrders, setRecentOrders] = useState<DataOrder[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Navigation states
  const [currentScreen, setCurrentScreen] = useState<string>('splash');
  const [extraNavigationParams, setExtraNavigationParams] = useState<any>(null);
  const [callbackParams, setCallbackParams] = useState<{ txRef: string; amount: string } | null>(null);

  // Verified registration variables passed between Step 1 and Step 2
  const [registrationPhone, setRegistrationPhone] = useState<string>('');

  // Toast dynamic notifications
  const [toast, setToast] = useState<ToastState | null>(null);

  // 1. Initial boot: Register PWA Service Worker & Verify existing session tokens
  useEffect(() => {
    // Service worker installation
    if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then((reg) => {
          console.log('[PWA] Service Worker registered scope:', reg.scope);
        }).catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
      });
    }

    // Capture Flutterwave payment processor callback parameter matches
    const params = new URLSearchParams(window.location.search);
    const txRef = params.get('tx_ref');
    const amount = params.get('amount') || '2000';
    const currentPath = window.location.pathname;

    if (txRef || currentPath.includes('/topup/callback')) {
      setCallbackParams({
        txRef: txRef || 'gigup-topup-sandbox-manual',
        amount
      });
      setCurrentScreen('callback');
    } else {
      // Standard local authentication search
      const token = localStorage.getItem('gigup_token');
      const storedUser = localStorage.getItem('gigup_user');
      
      if (token && storedUser) {
        try {
          const parsed = JSON.parse(storedUser) as User;
          setUser(parsed);
          // Wait 2s simulated for splash screen to complete, then navigate home
        } catch {
          localStorage.removeItem('gigup_token');
          localStorage.removeItem('gigup_user');
        }
      }
    }
  }, []);

  // 2. Fetch and synchronize user statement ledgers from backend
  const refreshUserData = async () => {
    try {
      // Reload profile properties
      const profile = await ApiService.getProfile();
      if (profile.success) {
        setUser(profile.user);
      }
      // Reload logs arrays
      const trxs = await ApiService.getTransactions();
      if (trxs.success) {
        setTransactions(trxs.wallet_transactions);
        setRecentOrders(trxs.data_orders);
        setNotifications(trxs.notifications);
      }
    } catch (e) {
      console.warn('Unable to coordinate background profile telemetry.', e);
    }
  };

  // Run synchronization telemetry on login active
  useEffect(() => {
    if (user && currentScreen !== 'splash' && currentScreen !== 'callback') {
      refreshUserData();
    }
  }, [user?.id, currentScreen]);

  // Toast Alert trigger dispatch
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  // Close toast trigger
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleLoginSuccess = (signedInUser: User) => {
    setUser(signedInUser);
    setCurrentScreen('home');
    refreshUserData();
  };

  const handleRegistrationSuccess = (newlySignedUser: User) => {
    setUser(newlySignedUser);
    setCurrentScreen('home');
    refreshUserData();
  };

  const handleLogout = () => {
    localStorage.removeItem('gigup_token');
    localStorage.removeItem('gigup_user');
    setUser(null);
    setTransactions([]);
    setRecentOrders([]);
    setNotifications([]);
    setRegistrationPhone('');
    showToast('Signed out of session safely. See you soon! 👋', 'info');
    setCurrentScreen('login');
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    if (user) {
      const updatedUser = { ...user, unread_notifications: 0 };
      setUser(updatedUser);
      localStorage.setItem('gigup_user', JSON.stringify(updatedUser));
    }
    showToast('Marked all unread inbox items as read ✅', 'success');
  };

  const handleOnscreenNavigation = (screenName: string, extras?: any) => {
    if (extras) {
      setExtraNavigationParams(extras);
    }
    setCurrentScreen(screenName);
  };

  // Handle active routes callbacks
  const handleCallbackFinished = async () => {
    // Clear URL parameters
    window.history.replaceState({}, document.title, "/");
    setCallbackParams(null);
    
    // Reload profile parameters
    await refreshUserData();
    setCurrentScreen('home');
  };

  // Map network themes for color styling
  const getNetworkPillColor = (netName?: string) => {
    if (netName === 'MTN') return 'bg-yellow-500';
    if (netName === 'GLO') return 'bg-green-600';
    return 'bg-red-600';
  };

  // Display active screens
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return (
          <Splash 
            onComplete={() => {
              if (user) {
                setCurrentScreen('home');
              } else {
                setCurrentScreen('login');
              }
            }} 
          />
        );
      case 'login':
        return (
          <Login 
            onLoginSuccess={handleLoginSuccess} 
            onNavigate={handleOnscreenNavigation} 
            showToast={showToast} 
          />
        );
      case 'register_1':
        return (
          <RegisterStep1 
            onNextStep={(phone) => {
              setRegistrationPhone(phone);
              setCurrentScreen('register_2');
            }} 
            onNavigate={handleOnscreenNavigation} 
            showToast={showToast} 
          />
        );
      case 'register_2':
        return (
          <RegisterStep2 
            phone={registrationPhone} 
            onRegisterSuccess={handleRegistrationSuccess} 
            onPrevStep={() => setCurrentScreen('register_1')} 
            showToast={showToast} 
          />
        );

      // Main Logged-In sections
      case 'home':
        return user ? (
          <Home 
            user={user} 
            recentOrders={recentOrders} 
            onNavigate={handleOnscreenNavigation} 
            onRefreshData={refreshUserData} 
            showToast={showToast} 
          />
        ) : null;
      case 'buy_data':
        return user ? (
          <BuyData 
            user={user} 
            initialNetwork={extraNavigationParams?.network || 'MTN'} 
            onNavigate={handleOnscreenNavigation} 
            onRefreshData={refreshUserData} 
            showToast={showToast} 
          />
        ) : null;
      case 'wallet':
        return user ? (
          <Wallet 
            user={user} 
            transactions={transactions} 
            onNavigate={handleOnscreenNavigation} 
            onRefreshData={refreshUserData}
            showToast={showToast} 
          />
        ) : null;
      case 'account':
        return user ? (
          <Account 
            user={user} 
            transactions={transactions}
            onNavigate={handleOnscreenNavigation} 
            onLogout={handleLogout} 
            showToast={showToast} 
          />
        ) : null;

      // Auxiliary routes
      case 'notifications':
        return (
          <Notifications 
            notifications={notifications} 
            onBack={() => setCurrentScreen('home')} 
            onMarkAllAsRead={markAllNotificationsAsRead} 
          />
        );
      case 'wallet_history':
        return user ? (
          <Wallet 
            user={user} 
            transactions={transactions} 
            onNavigate={handleOnscreenNavigation} 
            onRefreshData={refreshUserData}
            showToast={showToast} 
          />
        ) : null;
      case 'callback':
        return callbackParams ? (
          <TopupCallback 
            txRef={callbackParams.txRef} 
            amount={callbackParams.amount} 
            onProcessed={handleCallbackFinished} 
            showToast={showToast} 
          />
        ) : null;

      default:
        return (
          <div className="flex flex-col items-center justify-center p-6 text-center text-primary-dark">
            <AlertCircle className="w-12 h-12 text-brand-danger" />
            <h4 className="font-bold text-lg mt-3">Route Not Found</h4>
            <button 
              onClick={() => setCurrentScreen('login')}
              className="mt-4 bg-primary-blue text-white px-5 py-2 rounded-full font-bold text-xs"
            >
              Go to Home View
            </button>
          </div>
        );
    }
  };

  // Determine if we should show the bottom phone navigation bar
  const shouldShowBottomNavigation = 
    user && 
    ['home', 'buy_data', 'wallet', 'account', 'wallet_history'].includes(currentScreen);

  return (
    <div className="app-container">
      <div id="phone-simulation-frame" className="phone-frame select-none">
        
        {/* Core dynamic screen viewport container */}
        <div className="flex-grow w-full overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="h-full w-full"
            >
              {renderCurrentScreen()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 4. Bottom Tab Bar Navigation (White panel bar) */}
        {shouldShowBottomNavigation && (
          <div 
            id="bottom-tab-navigation-bar" 
            className="h-16 bg-white border-t border-gray-150 flex justify-around items-center px-4 py-2 shrink-0 z-40 select-none pb-safe"
          >
            {/* Tab 1: Home */}
            <button
              onClick={() => handleOnscreenNavigation('home')}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-full cursor-pointer transition ${
                currentScreen === 'home' ? 'text-primary-blue bg-primary-blue/5' : 'text-primary-dark/65 hover:text-primary-dark'
              }`}
            >
              <HomeIcon className="w-[21px] h-[21px]" />
              <span className="text-[9px] font-bold mt-0.5">Home</span>
            </button>

            {/* Tab 2: Buy Data */}
            <button
              onClick={() => handleOnscreenNavigation('buy_data', { network: 'MTN' })}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-full cursor-pointer transition ${
                currentScreen === 'buy_data' ? 'text-primary-blue bg-primary-blue/5' : 'text-primary-dark/65 hover:text-primary-dark'
              }`}
            >
              <Signal className="w-[21px] h-[21px]" />
              <span className="text-[9px] font-bold mt-0.5">Buy Data</span>
            </button>

            {/* Tab 3: Wallet */}
            <button
              onClick={() => handleOnscreenNavigation('wallet')}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-full cursor-pointer transition ${
                currentScreen === 'wallet' || currentScreen === 'wallet_history' ? 'text-primary-blue bg-primary-blue/5' : 'text-primary-dark/65 hover:text-primary-dark'
              }`}
            >
              <WalletIcon className="w-[21px] h-[21px]" />
              <span className="text-[9px] font-bold mt-0.5">Wallet</span>
            </button>

            {/* Tab 4: Account */}
            <button
              onClick={() => handleOnscreenNavigation('account')}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-full cursor-pointer transition ${
                currentScreen === 'account' ? 'text-primary-blue bg-primary-blue/5' : 'text-primary-dark/65 hover:text-primary-dark'
              }`}
            >
              <UserIcon className="w-[21px] h-[21px]" />
              <span className="text-[9px] font-bold mt-0.5">Account</span>
            </button>
          </div>
        )}

        {/* Global Toast Alerts at bottom */}
        {toast && (
          <div 
            id="global-toast-notification" 
            className="absolute bottom-20 inset-x-5 z-50 flex justify-center animate-bounce"
          >
            <div className={`px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 max-w-sm text-xs font-semibold leading-tight text-white border ${
              toast.type === 'success' 
                ? 'bg-emerald-600 border-emerald-500 shadow-emerald-950/20' 
                : toast.type === 'error' 
                  ? 'bg-red-600 border-red-500 shadow-red-950/20' 
                  : 'bg-primary-blue border-primary-blue/70 shadow-blue-950/20'
            }`}>
              {toast.type === 'error' ? '⚠️' : '🎉'}
              <span>{toast.message}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
