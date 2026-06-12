import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home as HomeIcon, Signal, Wallet as WalletIcon, User as UserIcon, AlertCircle, Download, Smartphone, Share, Bell, X, Gift } from 'lucide-react';
import { ApiService, subscribeToUserNotifications, startSession, endSession, BASE_URL, trackStreak, getUserFlags, dismissFlag } from './api';
import { User, WalletTransaction, DataOrder, Notification, UserFlags, UserStreak } from './types';
import { identifyUserInOneSignal, logoutOneSignal, requestPushPermission } from './onesignal';

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
import ReceiptView from './components/ReceiptView';
import CheckinScreen from './components/CheckinScreen';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

const getReadNotificationIds = (): string[] => {
  try {
    const stored = localStorage.getItem('gigup_read_notification_ids');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveReadNotificationIds = (ids: string[]) => {
  try {
    localStorage.setItem('gigup_read_notification_ids', JSON.stringify(ids));
  } catch {}
};

export default function App() {
  // Session states
  const [user, setUser] = useState<User | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  const [userFlags, setUserFlags] = useState<UserFlags | null>(null);
  const [userStreak, setUserStreak] = useState<number>(0);
  const [streakReward, setStreakReward] = useState<{ amount: number; day: number } | null>(null);
  const [doubleCashbackActive, setDoubleCashbackActive] = useState(false);
  const [doubleCashbackExpires, setDoubleCashbackExpires] = useState<string | null>(null);

  const [streakBroken, setStreakBroken] = useState(false);
  const [recoveryBonus, setRecoveryBonus] = useState(0);

  const initEngagement = async () => {
    const token = localStorage.getItem('gigup_token');
    if (!token) return;
    const result = await trackStreak(token);
    if (result) {
      setUserStreak(result.streak ?? 0);
      setUserFlags({
        ...(result.flags || {
          welcome_popup_dismissed: false,
          bonus_dropoff_popup_dismissed: false,
          referral_nudge_popup_dismissed: false,
          double_cashback_active: false,
          double_cashback_expires_at: null,
          referral_nudge_sent: false
        }),
        welcome_popup_dismissed: false // Always reset per session
      });
      setDoubleCashbackActive(result.double_cashback_active);
      setDoubleCashbackExpires(result.double_cashback_expires_at);
      if (result.reward_earned > 0) {
        setStreakReward({ amount: result.reward_earned, day: result.reward_day });
      }
      if (result.streak_broken && !result.recovery_eligible) {
        setStreakBroken(true);
      }
      if (result.recovery_eligible && result.recovery_bonus > 0) {
        setRecoveryBonus(result.recovery_bonus);
        setStreakBroken(false);
      }
    }
  };

  const beginSession = async () => {
    const token = localStorage.getItem('gigup_token');
    if (!token) return;
    const result = await startSession(token);
    if (result) {
      sessionIdRef.current = result.session_id;
      sessionStartRef.current = Date.now();
    }
  };

  const finishSession = async () => {
    const token = localStorage.getItem('gigup_token');
    if (!token || !sessionIdRef.current || !sessionStartRef.current) return;
    const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    await endSession(token, sessionIdRef.current, duration);
    sessionIdRef.current = null;
    sessionStartRef.current = null;
  };
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [recentOrders, setRecentOrders] = useState<DataOrder[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Navigation states
  const [currentScreen, setCurrentScreen] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const txRef = params.get('tx_ref');
    const status = params.get('status');
    const paymentStarted = sessionStorage.getItem('gigup_payment_started') === 'true';
    const currentPath = window.location.pathname;

    if (txRef || currentPath.includes('/topup/callback')) {
      return 'callback';
    }

    if (status === 'cancelled' || status === 'canceled' || paymentStarted) {
      const token = localStorage.getItem('gigup_token');
      return (token && token.length > 0) ? 'home' : 'login';
    }

    return 'splash';
  });
  const [extraNavigationParams, setExtraNavigationParams] = useState<any>(null);
  const [callbackParams, setCallbackParams] = useState<{ txRef: string; amount: string } | null>(null);

  // Verified registration variables passed between Step 1 and Step 2
  const [registrationPhone, setRegistrationPhone] = useState<string>('');
  const [registrationCode, setRegistrationCode] = useState<string>('');

  // Toast dynamic notifications
  const [toast, setToast] = useState<ToastState | null>(null);

  // PWA Install prompt and status management
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  const [showPwaInstallModal, setShowPwaInstallModal] = useState<boolean>(false);
  const [showPwaBanner, setShowPwaBanner] = useState<boolean>(false);



  // 1. Initial boot: Register PWA Service Worker & Verify existing session tokens
  useEffect(() => {
    // Check standalone mode status
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Service worker installation
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then((registration) => {
          console.log('[PWA] Service Worker registered scope:', registration.scope);
        }).catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
      });
    }

    // Capture standard PWA installation trigger
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Only show banner automatically if they are logged in, not standalone, and haven't dismissed it
      const dismissed = localStorage.getItem('gigup_pwa_banner_dismissed') === 'true';
      if (!standalone && !dismissed) {
        // Delay slightly for visual comfort after splashscreen loads
        setTimeout(() => {
          setShowPwaBanner(true);
        }, 3200);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Clear all stale localStorage from old builds
    ['gigup_local_users','gigup_local_transactions','gigup_local_orders',
     'gigup_local_notifications','gigup_sandbox_users','gigup_sandbox_transactions',
     'gigup_sandbox_orders','gigup_sandbox_notifications','gigup_mode',
     'gigup_local_mode','gigup_sandbox_mode'].forEach(k => localStorage.removeItem(k));

    // Capture Flutterwave payment processor callback parameter matches
    const params = new URLSearchParams(window.location.search);
    const txRef = params.get('tx_ref');
    const status = params.get('status');
    const amount = params.get('amount') || '';
    const currentPath = window.location.pathname;

    const paymentStarted = sessionStorage.getItem('gigup_payment_started') === 'true';
    if (paymentStarted) {
      sessionStorage.removeItem('gigup_payment_started');
    }

    if (txRef || currentPath.includes('/topup/callback')) {
      setCallbackParams({
        txRef: txRef || 'gigup-topup-manual',
        amount
      });
      // clear URL cleanly
      window.history.replaceState(null, '', window.location.pathname);
      setCurrentScreen('callback');
    } else {
      // If we returned from a cancelled payment checkout, skip the splash screen
      if (status === 'cancelled' || status === 'canceled') {
        window.history.replaceState(null, '', window.location.pathname);
      }
      
      const shouldSkipSplash = status === 'cancelled' || status === 'canceled' || paymentStarted;
      setCurrentScreen(shouldSkipSplash ? 'home' : 'splash');
      
      if (ApiService.isLoggedIn()) {
        const lastActivity = localStorage.getItem('gigup_last_activity');
        const now = Date.now();
        const inactiveLimit = 180 * 1000; // 3 minutes

        if (lastActivity && (now - parseInt(lastActivity, 10)) > inactiveLimit) {
          // Token or session expired after 3 minutes of closing/inactivity
          ApiService.logout();
          setUser(null);
          localStorage.removeItem('gigup_last_activity');
          setTimeout(() => {
            showToast('Session expired: Auto-logged out after 3 minutes 🔒', 'info');
          }, shouldSkipSplash ? 10 : 20200); // Dispense toast
          setCurrentScreen('login');
        } else {
          const cached = ApiService.getCachedUser();
          if (cached) {
            setUser(cached);
            initEngagement();
            beginSession();

            // Request push for existing users who haven't granted yet
            setTimeout(() => {
              requestPushPermission();
            }, shouldSkipSplash ? 500 : 21000); 
          } else {
            setCurrentScreen('login');
          }
          localStorage.setItem('gigup_last_activity', now.toString());
          // Refresh profile in background
          ApiService.getProfile()
            .then(user => setUser(user))
            .catch(() => {
              // Token expired — logout
              ApiService.logout();
              setUser(null);
              setCurrentScreen('login');
            });
        }
      } else {
        if (shouldSkipSplash) {
             setCurrentScreen('login');
        }
      }
    }
  }, []);

  // Monitor user configuration and automatically subscribe to Push Notifications via backend ntfy
  useEffect(() => {
    if (user && user.ntfy_topic) {
      subscribeToUserNotifications(user.ntfy_topic);
    }
  }, [user?.id, user?.ntfy_topic]);

  // 2. Fetch and synchronize user statement ledgers from backend
  const refreshUserData = async () => {
    try {
      // Reload profile properties
      const profile = await ApiService.getProfile();
      if (profile) {
        setUser(profile);
        localStorage.setItem('gigup_user', JSON.stringify(profile));
      }
      
      // Reload logs arrays
      try {
        const trxs = await ApiService.getTransactions();
        if (trxs) {
          setTransactions(trxs.wallet_transactions);
          setRecentOrders(trxs.data_orders);
          
          const readIds = getReadNotificationIds();
          const mappedNotifications = (trxs.notifications || []).map(n => ({
            ...n,
            is_read: n.is_read || readIds.includes(n.id)
          }));
          setNotifications(mappedNotifications);

          // Compute actual unread notifications count based on our mapped array
          const actualUnreadCount = mappedNotifications.filter(n => !n.is_read).length;

          const updatedProfile = {
            ...(profile || user || {}),
            unread_notifications: actualUnreadCount
          } as User;
          setUser(updatedProfile);
          localStorage.setItem('gigup_user', JSON.stringify(updatedProfile));
        }
      } catch (trxErr) {
        console.warn('Unable to load transactions or notification sub-ledgers.', trxErr);
      }
    } catch (e) {
      console.warn('Unable to coordinate background profile telemetry.', e);
    }
  };

  // Run synchronization telemetry on login active
  useEffect(() => {
    if (user && ['home', 'wallet', 'account'].includes(currentScreen)) {
      refreshUserData();
    }
  }, [user?.id, currentScreen]);

  // Inactivity auto-logout tracker (Logs out user if inactive for 3 minutes = 180,000 ms)
  const autoLogoutRef = useRef<(() => void) | null>(null);

  autoLogoutRef.current = async () => {
    if (!user) return;
    if ((window as any)._gigupNtfy) {
      try {
        (window as any)._gigupNtfy.close();
      } catch {}
      delete (window as any)._gigupNtfy;
    }
    await finishSession();
    logoutOneSignal();
    localStorage.removeItem('gigup_token');
    localStorage.removeItem('gigup_user');
    localStorage.removeItem('gigup_last_activity');
    setUser(null);
    setTransactions([]);
    setRecentOrders([]);
    setNotifications([]);
    setRegistrationPhone('');
    showToast('Inactivity alert: Auto-logged out after 3 minutes of inactivity 🔒', 'info');
    setCurrentScreen('login');
  };

  useEffect(() => {
    if (!user) return;

    let inactivityTimeout: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      
      // Persist the current timestamp as the user's latest active gesture
      localStorage.setItem('gigup_last_activity', Date.now().toString());

      inactivityTimeout = setTimeout(() => {
        if (autoLogoutRef.current) {
          autoLogoutRef.current();
        }
      }, 180 * 1000); // 3 minutes
    };

    // Check visibility state to immediately logout if returning after 3+ minutes
    const handleVisibilityOrFocusChange = () => {
      const now = Date.now();
      const lastActivity = localStorage.getItem('gigup_last_activity');
      const inactiveLimit = 180 * 1000;

      if (document.visibilityState === 'visible' || document.hasFocus()) {
        if (lastActivity && (now - parseInt(lastActivity, 10)) > inactiveLimit) {
          if (autoLogoutRef.current) {
            autoLogoutRef.current();
          }
        } else {
          localStorage.setItem('gigup_last_activity', now.toString());
          resetInactivityTimer();
        }
      } else {
        // App is hidden/backgrounded or blurred - stash current time
        localStorage.setItem('gigup_last_activity', now.toString());
      }
    };

    // Initialize/reset timer
    resetInactivityTimer();

    // Track active mouse and input interface gestures
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const eventHandler = () => resetInactivityTimer();

    activityEvents.forEach((event) => {
      window.addEventListener(event, eventHandler, { passive: true });
    });

    // Listen to focus/blur and tab switching events
    const visibilityEvents = ['visibilitychange', 'focus', 'blur'];
    visibilityEvents.forEach((event) => {
      window.addEventListener(event, handleVisibilityOrFocusChange, { passive: true });
    });

    return () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, eventHandler);
      });
      visibilityEvents.forEach((event) => {
        window.removeEventListener(event, handleVisibilityOrFocusChange);
      });
    };
  }, [user, currentScreen]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery on tab close
      const token = localStorage.getItem('gigup_token');
      const sessionId = sessionIdRef.current;
      const startTime = sessionStartRef.current;
      if (!token || !sessionId || !startTime) return;
      const duration = Math.floor((Date.now() - startTime) / 1000);
      const blob = new Blob([JSON.stringify({
        session_id: sessionId,
        duration_seconds: duration,
        token: token
      })], {
        type: 'application/json'
      });
      navigator.sendBeacon(
        `${BASE_URL}/session-end`,
        blob
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
    localStorage.setItem('gigup_last_activity', Date.now().toString());
    setUser(signedInUser);
    initEngagement();
    beginSession();
    identifyUserInOneSignal({
      id: signedInUser.id,
      full_name: signedInUser.full_name,
      phone: signedInUser.phone,
    });
    setCurrentScreen('home');
    refreshUserData();
    showToast('Logged in successfully! 🔓', 'success');

    // Auto-request push permission on login
    setTimeout(() => {
      requestPushPermission();
    }, 2500); // slight delay so home screen renders first
  };

  const handleRegistrationSuccess = (newlySignedUser: User) => {
    localStorage.setItem('gigup_last_activity', Date.now().toString());
    setUser(newlySignedUser);
    initEngagement();
    beginSession();
    identifyUserInOneSignal({
      id: newlySignedUser.id,
      full_name: newlySignedUser.full_name,
      phone: newlySignedUser.phone,
    });
    setCurrentScreen('home');
    refreshUserData();
    showToast('Account created successfully! 🎉', 'success');

    // Auto-request push permission on registration
    setTimeout(() => {
      requestPushPermission();
    }, 2500); // slight delay so home screen renders first
  };

  const handleLogout = async () => {
    if ((window as any)._gigupNtfy) {
      try {
        (window as any)._gigupNtfy.close();
      } catch {}
      delete (window as any)._gigupNtfy;
    }
    await finishSession();
    logoutOneSignal();
    localStorage.removeItem('gigup_token');
    localStorage.removeItem('gigup_user');
    localStorage.removeItem('gigup_last_activity');
    setUser(null);
    setTransactions([]);
    setRecentOrders([]);
    setNotifications([]);
    setRegistrationPhone('');
    showToast('Signed out of session safely. See you soon! 👋', 'info');
    setCurrentScreen('login');
  };

  const markAllNotificationsAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const readIds = getReadNotificationIds();
    const updatedReadIds = Array.from(new Set([...readIds, ...allIds]));
    saveReadNotificationIds(updatedReadIds);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    if (user) {
      const updatedUser = { ...user, unread_notifications: 0 };
      setUser(updatedUser);
      localStorage.setItem('gigup_user', JSON.stringify(updatedUser));
    }
    showToast('Marked all unread inbox items as read ✅', 'success');
  };

  const handlePwaInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA] Install prompt outcome: ${outcome}`);
        setDeferredPrompt(null);
        setShowPwaBanner(false);
      } catch (err) {
        console.warn('[PWA] Error launching browser install prompt:', err);
        setShowPwaInstallModal(true);
      }
    } else {
      // No standard prompt event in current browser context (e.g. iOS or already stashed)
      setShowPwaInstallModal(true);
    }
  };

  const handleDismissPwaBanner = () => {
    localStorage.setItem('gigup_pwa_banner_dismissed', 'true');
    setShowPwaBanner(false);
    showToast('Add to Home Screen banner dismissed. Manage from Account tab! 📱', 'info');
  };

  const handleOnscreenNavigation = (screenName: string, extras?: any) => {
    setExtraNavigationParams(extras ?? null); // clear if no extras passed
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
              setCurrentScreen(user ? 'home' : 'login');
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
            onNextStep={(phone, code) => {
              setRegistrationPhone(phone);
              setRegistrationCode(code);
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
            code={registrationCode}
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
            onTriggerInstall={handlePwaInstall}
            isStandalone={isStandalone}
            unreadNotificationsCount={notifications.length > 0 ? notifications.filter(n => !n.is_read).length : (user?.unread_notifications || 0)}
            userStreak={userStreak}
            userFlags={userFlags}
            doubleCashbackActive={doubleCashbackActive}
            doubleCashbackExpires={doubleCashbackExpires}
            onDismissFlag={(action) => {
              const token = localStorage.getItem('gigup_token');
              if (token && action !== 'dismiss_welcome') dismissFlag(token, action);
              setUserFlags(prev => prev ? { ...prev,
                welcome_popup_dismissed: action === 'dismiss_welcome' ? true : prev.welcome_popup_dismissed,
                bonus_dropoff_popup_dismissed: action === 'dismiss_bonus' ? true : prev.bonus_dropoff_popup_dismissed,
                referral_nudge_popup_dismissed: action === 'dismiss_referral' ? true : prev.referral_nudge_popup_dismissed,
              } : prev);
            }}
            onActivateDoubleCashback={() => {
              const token = localStorage.getItem('gigup_token');
              if (token) dismissFlag(token, 'activate_double_cashback');
              setDoubleCashbackActive(true);
              const expires = new Date();
              expires.setHours(expires.getHours() + 24);
              setDoubleCashbackExpires(expires.toISOString());
            }}
            onStreakRewardClose={() => setStreakReward(null)}
            streakReward={streakReward}
            streakBroken={streakBroken}
            recoveryBonus={recoveryBonus}
            onStreakBrokenClose={() => setStreakBroken(false)}
            onRecoveryClose={() => setRecoveryBonus(0)}
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
      case 'checkin':
        return user ? <CheckinScreen user={user} showToast={showToast} onNavigate={handleOnscreenNavigation} /> : null;
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
            onRefreshData={refreshUserData}
            onTriggerInstall={handlePwaInstall}
            isStandalone={isStandalone}
            initialScrollTo={extraNavigationParams?.scrollTo}
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
            initialTab="history"
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
      case 'receipt':
        return (
          <ReceiptView 
            onClose={() => setCurrentScreen('home')}
            params={extraNavigationParams}
            showToast={showToast}
            onNavigate={handleOnscreenNavigation}
          />
        );

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
    !!user && 
    ['home', 'buy_data', 'checkin', 'wallet', 'account', 'wallet_history'].includes(currentScreen);

  return (
    <div className="app-container">
      <div id="phone-simulation-frame" className="phone-frame select-none">
        {/* Core dynamic screen viewport container */}
        <div className="flex-1 min-h-0 w-full overflow-hidden relative">
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
            className="h-16 bg-white border-t border-gray-150 flex justify-around items-center px-4 shrink-0 z-40 select-none"
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

            {/* Tab 3: Rewards (Checkin) */}
            <button
              onClick={() => handleOnscreenNavigation('checkin')}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-full cursor-pointer transition ${
                currentScreen === 'checkin' ? 'text-primary-blue bg-primary-blue/5' : 'text-primary-dark/65 hover:text-primary-dark'
              }`}
            >
              <Gift className="w-[21px] h-[21px]" />
              <span className="text-[9px] font-bold mt-0.5">Rewards</span>
            </button>

            {/* Tab 4: Wallet */}
            <button
              onClick={() => handleOnscreenNavigation('wallet')}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-full cursor-pointer transition ${
                currentScreen === 'wallet' || currentScreen === 'wallet_history' ? 'text-primary-blue bg-primary-blue/5' : 'text-primary-dark/65 hover:text-primary-dark'
              }`}
            >
              <WalletIcon className="w-[21px] h-[21px]" />
              <span className="text-[9px] font-bold mt-0.5">Wallet</span>
            </button>

            {/* Tab 5: Account */}
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

        {/* PWA Floating Installation Promotion Banner */}
        {showPwaBanner && !isStandalone && (
          <div 
            id="pwa-floating-promo-banner"
            className="absolute bottom-20 inset-x-4 z-40 bg-slate-900/95 backdrop-blur-md text-white border border-slate-800 rounded-3xl p-4 shadow-2xl flex items-center justify-between gap-3 animate-slide-up"
          >
            <div className="flex items-center gap-3">
              <img 
                src="https://cdn-icons-png.flaticon.com/512/15749/15749415.png" 
                alt="GigUp Logo" 
                className="w-10 h-10 rounded-2xl bg-white p-1 shrink-0" 
                referrerPolicy="no-referrer"
              />
              <div className="space-y-0.5">
                <h5 className="text-[11px] font-extrabold text-[#10B981] tracking-wide uppercase">⚡ Install Mobile App</h5>
                <p className="text-[10px] text-gray-300 leading-tight max-w-[170px]">
                  Add GigUp to your home screen for one-click access and zero-friction data.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button
                onClick={handlePwaInstall}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] rounded-xl transition cursor-pointer text-center"
              >
                Install
              </button>
              <button
                onClick={handleDismissPwaBanner}
                className="px-3 py-1 text-gray-400 hover:text-white font-bold text-[9px] rounded-xl transition cursor-pointer text-center"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* PWA Dual-Mode Installation Guide Modal Overlay */}
        {showPwaInstallModal && (
          <div 
            id="pwa-install-guide-modal"
            className="absolute inset-0 bg-primary-dark/90 backdrop-blur-md z-50 flex items-center justify-center p-5 animate-fade-in"
          >
            <div className="bg-white text-primary-dark rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <img 
                    src="https://cdn-icons-png.flaticon.com/512/15749/15749415.png" 
                    alt="Logo" 
                    className="w-8 h-8 rounded-lg bg-white p-0.5 border border-gray-100"
                    referrerPolicy="no-referrer"
                  />
                  <h5 className="font-extrabold text-xs uppercase text-primary-dark tracking-wide">
                    Install GigUp Application
                  </h5>
                </div>
                <button
                  onClick={() => setShowPwaInstallModal(false)}
                  className="text-xs font-bold text-text-muted hover:text-primary-dark cursor-pointer bg-transparent border-none p-2 rounded-full hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>

              <div className="text-center py-1">
                <span className="text-3xl">📱</span>
                <p className="text-[11px] text-text-muted mt-2 leading-relaxed">
                  GigUp works best as a light installation app on your home screen. Get offline statement receipts, auto-reloads, and up to 10% cashbacks.
                </p>
              </div>

              {/* Detect platform or offer choosing */}
              <div className="space-y-3 pt-2">
                {/* Option A: deferredPrompt event is stashed & valid */}
                {deferredPrompt ? (
                  <div className="space-y-2">
                    <p className="text-[10px] text-emerald-600 bg-emerald-50 py-2 px-3 rounded-xl font-semibold text-center border border-emerald-100">
                      Your browser is fully compatible for automatic setup!
                    </p>
                    <button
                      onClick={handlePwaInstall}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-2xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> START 1-CLICK INSTALL
                    </button>
                  </div>
                ) : (
                  /* Option B: Standard guidelines detailed per OS */
                  <div className="space-y-3.5 border-t border-gray-100 pt-3">
                    {/* iOS Tab Guide */}
                    <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-3.5 space-y-2">
                      <h4 className="text-[11px] font-extrabold text-amber-800 flex items-center gap-1.5 uppercase">
                        <Share className="w-3.5 h-3.5 text-amber-700" /> Apple iOS (Safari instructions)
                      </h4>
                      <ol className="list-decimal list-inside text-[10px] text-amber-900/90 space-y-1 pl-1 leading-normal font-medium">
                        <li>Open the app page inside your <b>Safari</b> browser.</li>
                        <li>Tap the <b>Share icon</b> at the bottom navigation center.</li>
                        <li>Scroll down and select <b>Add to Home Screen</b>.</li>
                        <li>Tap <b>Add</b> at the top right corner.</li>
                      </ol>
                    </div>

                    {/* Google Android & PC Tab Guide */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-3.5 space-y-2">
                      <h4 className="text-[11px] font-extrabold text-blue-800 flex items-center gap-1.5 uppercase">
                        <Smartphone className="w-3.5 h-3.5 text-blue-700" /> Android / Chrome Desktop
                      </h4>
                      <ol className="list-decimal list-inside text-[10px] text-blue-900/90 space-y-1 pl-1 leading-normal font-medium">
                        <li>Tap the <b>three dots</b> on browser top right menu.</li>
                        <li>Choose <b>Install App</b> or <b>Add to Home Screen</b>.</li>
                        <li>Verify & click confirm prompt.</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowPwaInstallModal(false)}
                className="w-full bg-primary-dark/5 hover:bg-primary-dark/10 text-primary-dark font-extrabold text-[10px] py-2.5 rounded-full transition cursor-pointer uppercase tracking-wider"
              >
                Close Installer
              </button>
            </div>
          </div>
        )}

        {/* Global Toast Alerts at bottom */}
        {toast && (
          <div 
            id="global-toast-notification" 
            className="absolute bottom-24 inset-x-5 z-50 flex justify-center animate-bounce"
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
