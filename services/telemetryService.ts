
import { TelemetryLog } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Simplified cost estimation (per 1k tokens)
const COST_TABLE: Record<string, { in: number; out: number }> = {
    'gpt-4o': { in: 0.005, out: 0.015 },
    'gpt-4o-mini': { in: 0.00015, out: 0.0006 },
    'gemini-1.5-flash': { in: 0.000075, out: 0.0003 },
    'gemini-1.5-pro': { in: 0.0035, out: 0.0105 },
    'gemini-2.0-flash': { in: 0.0001, out: 0.0004 }, // Est
    'claude-3-5-sonnet': { in: 0.003, out: 0.015 },
    'claude-3-haiku': { in: 0.00025, out: 0.00125 },
    'default': { in: 0.001, out: 0.002 } // Fallback
};

const STORAGE_KEY = 'app_telemetry_logs';

export const logUsage = (
    provider: string,
    model: string,
    operation: string,
    inputLength: number, // Approx chars
    outputLength: number // Approx chars
) => {
    // Crude token estimation: 4 chars = 1 token
    const tokensIn = Math.ceil(inputLength / 4);
    const tokensOut = Math.ceil(outputLength / 4);
    
    const rates = COST_TABLE[model] || COST_TABLE['default'];
    const cost = (tokensIn / 1000 * rates.in) + (tokensOut / 1000 * rates.out);

    const logEntry: TelemetryLog = {
        id: uuidv4(),
        timestamp: Date.now(),
        provider,
        model,
        operation,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        cost_est: parseFloat(cost.toFixed(6))
    };

    // Persist to local storage for MVP
    try {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const updated = [logEntry, ...existing].slice(0, 1000); // Keep last 1000
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.warn("Failed to save telemetry", e);
    }
};

export const getTelemetryLogs = (): TelemetryLog[] => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
};

export const clearTelemetryLogs = () => {
    localStorage.removeItem(STORAGE_KEY);
};
