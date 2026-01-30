/**
 * Version Check Hook
 * Detects when the app has been updated and prompts users to reload.
 * Prevents stale code issues after deployments.
 */

import React, { useEffect, useState, useCallback } from 'react';

// Store the initial version when the app loads
let initialVersion: string | null = null;

interface VersionInfo {
  version: string;
  buildTime: string;
}

export function useVersionCheck(checkIntervalMs: number = 60000) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  const checkVersion = useCallback(async () => {
    try {
      // Add cache-busting query param
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) return;

      const data: VersionInfo = await response.json();

      // Store initial version on first check
      if (initialVersion === null) {
        initialVersion = data.version;
        console.log('[VersionCheck] Initial version:', initialVersion);
        return;
      }

      // Compare versions
      if (data.version !== initialVersion) {
        console.log('[VersionCheck] New version detected:', data.version, '(was:', initialVersion, ')');
        setUpdateAvailable(true);
        setNewVersion(data.version);
      }
    } catch {
      // Silently fail - version check is not critical
      // Don't log - this creates too much console noise in development
    }
  }, []);

  const handleReload = useCallback(() => {
    // Clear any cached data that might cause issues
    try {
      // Clear session storage (but keep localStorage for auth)
      sessionStorage.clear();
    } catch (e) {
      // Ignore errors
    }

    // Force a hard reload
    window.location.reload();
  }, []);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  useEffect(() => {
    // Initial check
    checkVersion();

    // Periodic checks
    const interval = setInterval(checkVersion, checkIntervalMs);

    // Also check when tab becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkVersion, checkIntervalMs]);

  return {
    updateAvailable,
    newVersion,
    handleReload,
    dismissUpdate
  };
}

/**
 * Update Banner Component
 * Shows a banner when a new version is available
 */
interface UpdateBannerProps {
  updateAvailable: boolean;
  onReload: () => void;
  onDismiss: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ updateAvailable, onReload, onDismiss }) => {
  if (!updateAvailable) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-blue-600 text-white px-4 py-2 flex items-center justify-center gap-4 shadow-lg animate-slide-down">
      <span className="text-sm">
        A new version of the app is available.
      </span>
      <button
        onClick={onReload}
        className="px-3 py-1 bg-white text-blue-600 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
      >
        Reload Now
      </button>
      <button
        onClick={onDismiss}
        className="text-white/80 hover:text-white text-lg leading-none"
        aria-label="Dismiss"
      >
        &times;
      </button>
      <style>{`
        @keyframes slide-down {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default useVersionCheck;
