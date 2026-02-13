
import React, { useEffect, useState, useMemo } from 'react';
import type { AppNotification, NotificationSeverity } from '../../state/slices/uiSlice';

interface NotificationBannerProps {
  message: AppNotification | string | null;
  onDismiss: () => void;
}

const SEVERITY_STYLES: Record<NotificationSeverity, string> = {
  info:    'bg-blue-900/80 border-blue-700',
  success: 'bg-green-900/80 border-green-700',
  warning: 'bg-yellow-900/80 border-yellow-700',
  error:   'bg-red-900/80 border-red-700',
};

const SEVERITY_DURATIONS: Record<NotificationSeverity, number | null> = {
  info:    5000,
  success: 5000,
  warning: 8000,
  error:   null, // manual dismiss only
};

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ message, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Normalize: string → AppNotification with severity 'info' for backward compatibility
  const notification = useMemo((): AppNotification | null => {
    if (!message) return null;
    if (typeof message === 'string') return { message, severity: 'info' };
    return message;
  }, [message]);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      const duration = notification.duration ?? SEVERITY_DURATIONS[notification.severity];
      if (duration !== null) {
        const timer = setTimeout(() => {
          onDismiss();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [notification, onDismiss]);

  if (!isVisible || !notification) {
    return null;
  }

  const severityClass = SEVERITY_STYLES[notification.severity];

  return (
    <div className={`fixed top-0 left-0 right-0 ${severityClass} backdrop-blur-sm border-b text-white p-3 text-center text-sm z-[100] shadow-lg animate-fade-in-down`}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
        <span className="flex-grow text-left">{notification.message}</span>
        <button onClick={onDismiss} className="text-lg leading-none hover:text-gray-300 flex-shrink-0">&times;</button>
      </div>
       <style>{`
        @keyframes fade-in-down {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
