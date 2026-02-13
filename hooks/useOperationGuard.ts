import { useRef, useState, useCallback } from 'react';
import type { Dispatch } from 'react';
import type { AppAction } from '../state/appState';
import { handleOperationError } from '../utils/errorHandling';

interface UseOperationGuardOptions {
    loadingKey: string;
    dispatch: Dispatch<AppAction>;
    operationName: string;
}

/**
 * Reusable re-entrance guard hook for one-shot async operations.
 *
 * - Uses useRef for synchronous double-click protection (immune to React batching)
 * - Sets SET_LOADING with context on entry, clears on exit
 * - Catches errors and dispatches SET_ERROR via handleOperationError
 * - Returns undefined if guarded (already running) or on error
 */
export function useOperationGuard({ loadingKey, dispatch, operationName }: UseOperationGuardOptions) {
    const isRunningRef = useRef(false);
    const [isRunning, setIsRunning] = useState(false);

    const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
        if (isRunningRef.current) {
            dispatch({
                type: 'SET_NOTIFICATION',
                payload: { message: `${operationName} already in progress.`, severity: 'warning' },
            });
            return undefined;
        }

        isRunningRef.current = true;
        setIsRunning(true);
        dispatch({ type: 'SET_LOADING', payload: { key: loadingKey, value: true, context: operationName } });

        try {
            const result = await fn();
            return result;
        } catch (error) {
            handleOperationError(error, dispatch, operationName);
            return undefined;
        } finally {
            isRunningRef.current = false;
            setIsRunning(false);
            dispatch({ type: 'SET_LOADING', payload: { key: loadingKey, value: false } });
        }
    }, [loadingKey, dispatch, operationName]);

    return { run, isRunning };
}
