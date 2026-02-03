import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const LAST_URL_KEY = 'app_last_url';

/**
 * useLastUrl - Persists and restores the last visited URL in localStorage.
 * This enables the app to redirect back to the user's last position
 * after page reload or login.
 *
 * Only saves authenticated route URLs (not /login).
 */
export function useLastUrl() {
    const location = useLocation();

    // Save current URL to localStorage on navigation
    useEffect(() => {
        // Don't save auth-related paths
        if (location.pathname === '/login' || location.pathname === '/') return;

        try {
            localStorage.setItem(LAST_URL_KEY, location.pathname + location.search);
        } catch {
            // localStorage unavailable
        }
    }, [location.pathname, location.search]);
}

/**
 * getLastUrl - Retrieves the last saved URL for post-login redirect.
 * Returns null if no URL is saved or if it's an invalid redirect target.
 */
export function getLastUrl(): string | null {
    try {
        const url = localStorage.getItem(LAST_URL_KEY);
        if (!url || url === '/login' || url === '/') return null;
        return url;
    } catch {
        return null;
    }
}

/**
 * clearLastUrl - Removes the saved URL after it's been used for redirect.
 */
export function clearLastUrl(): void {
    try {
        localStorage.removeItem(LAST_URL_KEY);
    } catch {
        // localStorage unavailable
    }
}
