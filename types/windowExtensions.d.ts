// types/windowExtensions.d.ts
// Global window extensions for development/debugging utilities

declare global {
  interface Window {
    // Debug utilities exposed for troubleshooting
    repairBriefs?: () => Promise<void>;
    debugContentGeneration?: () => void;
    getActiveMap?: () => any;
    getActiveTopic?: () => any;

    // Development helpers
    __REDUX_DEVTOOLS_EXTENSION__?: () => any;
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: any;

    // Analytics (if used)
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];

    // Feature flags (if used)
    __FEATURE_FLAGS__?: Record<string, boolean>;
  }
}

// Ensure this file is treated as a module
export {};
