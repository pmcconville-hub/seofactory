import type { Dispatch } from 'react';
import type { AppAction } from '../state/appState';

/**
 * Centralized error handler for operations.
 *
 * - Always logs to console.error and dispatches LOG_EVENT
 * - Dispatches SET_ERROR unless silent: true
 * - Returns the extracted error message string
 */
export function handleOperationError(
    error: unknown,
    dispatch: Dispatch<AppAction>,
    context: string,
    options?: { silent?: boolean }
): string {
    const message = error instanceof Error ? error.message : String(error);
    const fullMessage = `[${context}] ${message}`;

    console.error(fullMessage, error);

    dispatch({
        type: 'LOG_EVENT',
        payload: {
            service: context,
            message,
            status: 'failure',
            timestamp: Date.now(),
        },
    });

    if (!options?.silent) {
        dispatch({ type: 'SET_ERROR', payload: fullMessage });
    }

    return message;
}
