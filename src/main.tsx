// Clear all stale local/mock/sandbox data from old builds
const STALE_KEYS = [
  'gigup_local_users',
  'gigup_local_transactions',
  'gigup_local_orders',
  'gigup_local_notifications',
  'gigup_sandbox_users',
  'gigup_sandbox_transactions',
  'gigup_sandbox_orders',
  'gigup_sandbox_notifications',
  'gigup_mode',
  'gigup_local_mode',
  'gigup_sandbox_mode',
];
STALE_KEYS.forEach(key => localStorage.removeItem(key));

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Analytics} from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);
