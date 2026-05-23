import { useState } from 'react';
import { ArrowLeft, Bell, BellOff, Info, Clock, Check } from 'lucide-react';
import { Notification } from '../types';

interface NotificationsProps {
  notifications: Notification[];
  onBack: () => void;
  onMarkAllAsRead: () => void;
}

export default function Notifications({ notifications, onBack, onMarkAllAsRead }: NotificationsProps) {
  const formatTimeAgo = (isoStr: string) => {
    const past = new Date(isoStr).getTime();
    const now = Date.now();
    const diffMs = now - past;
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex flex-col h-full bg-bg-light overflow-y-auto select-none">
      
      {/* Dark Navy Header Section */}
      <div className="bg-primary-dark pt-5 pb-5 px-5 text-white shrink-0 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1 rounded-full hover:bg-white/10 text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-grow">
          <h4 className="font-extrabold text-sm uppercase tracking-wider leading-none">Notifications Inbox</h4>
          <span className="text-[10px] text-white/50 block mt-1">SMS, Cash releases and referral alerts</span>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button
            onClick={onMarkAllAsRead}
            className="text-[11px] bg-white/10 hover:bg-white/15 text-white text-glow px-2.5 py-1 rounded-full font-bold cursor-pointer transition select-none flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" /> Mark read
          </button>
        )}
      </div>

      {/* Main Core View Area */}
      <div className="p-5 flex-grow">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 flex flex-col items-center justify-center min-h-[220px] shadow-sm my-auto">
            <span className="text-4xl mb-3">🔔</span>
            <h5 className="text-sm font-extrabold text-primary-dark uppercase">No Notifications Yet</h5>
            <p className="text-[11px] text-text-muted mt-2 max-w-[220px] leading-relaxed">
              Your inbox is clear. When you buy data or refer your associates, billing changes will populate here instantly!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((msg) => (
              <div
                key={msg.id}
                className={`bg-white rounded-3xl p-4 shadow-sm border relative transition-all ${
                  !msg.is_read 
                    ? 'border-l-[4px] border-l-[#3B7EF8] border-gray-100' 
                    : 'border-gray-105 border-l-gray-105'
                }`}
              >
                {/* Visual Unread dot */}
                {!msg.is_read && (
                  <span className="absolute top-4 right-4 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-blue opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-blue"></span>
                  </span>
                )}

                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    !msg.is_read 
                      ? 'bg-blue-50 text-primary-blue border-blue-100' 
                      : 'bg-gray-50 text-text-muted border-gray-150'
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>

                  <div className="space-y-1 pr-4">
                    <h5 className={`text-xs block leading-tight ${!msg.is_read ? 'font-bold text-primary-dark' : 'font-semibold text-gray-700'}`}>
                      {msg.title}
                    </h5>
                    <p className="text-[10.5px] text-gray-500 leading-normal font-normal">
                      {msg.message}
                    </p>
                    <div className="flex items-center gap-1 text-[9px] text-text-muted pt-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(msg.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
