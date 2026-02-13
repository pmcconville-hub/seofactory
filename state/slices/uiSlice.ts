/**
 * UI Slice - Handles UI-related state
 *
 * Manages:
 * - Loading states
 * - Errors and notifications
 * - Modal visibility
 * - Confirmation dialogs
 * - Strategist panel toggle
 */

import React from 'react';

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  message: string;
  severity: NotificationSeverity;
  duration?: number;
}

// ============================================================================
// STATE TYPES
// ============================================================================

export interface UIState {
  isLoading: Record<string, boolean | undefined>;
  loadingContext: Record<string, string | undefined>;
  error: string | null;
  notification: AppNotification | string | null;
  isStrategistOpen: boolean;
  modals: Record<string, boolean>;
  confirmation: { title: string; message: React.ReactNode; onConfirm: () => void } | null;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialUIState: UIState = {
  isLoading: {},
  loadingContext: {},
  error: null,
  notification: null,
  isStrategistOpen: false,
  modals: {},
  confirmation: null,
};

// ============================================================================
// ACTION TYPES
// ============================================================================

export type UIAction =
  | { type: 'SET_LOADING'; payload: { key: string; value: boolean; context?: string } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_NOTIFICATION'; payload: AppNotification | string | null }
  | { type: 'TOGGLE_STRATEGIST'; payload?: boolean }
  | { type: 'SET_MODAL_VISIBILITY'; payload: { modal: string; visible: boolean } }
  | { type: 'SHOW_CONFIRMATION'; payload: { title: string; message: React.ReactNode; onConfirm: () => void } }
  | { type: 'HIDE_CONFIRMATION' };

// ============================================================================
// REDUCER
// ============================================================================

export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_LOADING': {
      const newLoadingContext = { ...state.loadingContext };
      if (action.payload.value && action.payload.context) {
        newLoadingContext[action.payload.key] = action.payload.context;
      } else if (!action.payload.value) {
        delete newLoadingContext[action.payload.key];
      }
      return {
        ...state,
        isLoading: { ...state.isLoading, [action.payload.key]: action.payload.value },
        loadingContext: newLoadingContext,
      };
    }

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload };

    case 'TOGGLE_STRATEGIST':
      return {
        ...state,
        isStrategistOpen: action.payload !== undefined ? action.payload : !state.isStrategistOpen
      };

    case 'SET_MODAL_VISIBILITY':
      return {
        ...state,
        modals: { ...state.modals, [action.payload.modal]: action.payload.visible }
      };

    case 'SHOW_CONFIRMATION':
      return { ...state, confirmation: action.payload };

    case 'HIDE_CONFIRMATION':
      return { ...state, confirmation: null };

    default:
      return state;
  }
}

// ============================================================================
// ACTION CREATORS (Optional - for convenience)
// ============================================================================

export const uiActions = {
  setLoading: (key: string, value: boolean, context?: string): UIAction => ({
    type: 'SET_LOADING',
    payload: { key, value, context }
  }),

  setError: (error: string | null): UIAction => ({
    type: 'SET_ERROR',
    payload: error
  }),

  setNotification: (notification: AppNotification | string | null): UIAction => ({
    type: 'SET_NOTIFICATION',
    payload: notification
  }),

  toggleStrategist: (open?: boolean): UIAction => ({
    type: 'TOGGLE_STRATEGIST',
    payload: open
  }),

  showModal: (modal: string): UIAction => ({
    type: 'SET_MODAL_VISIBILITY',
    payload: { modal, visible: true }
  }),

  hideModal: (modal: string): UIAction => ({
    type: 'SET_MODAL_VISIBILITY',
    payload: { modal, visible: false }
  }),

  showConfirmation: (title: string, message: React.ReactNode, onConfirm: () => void): UIAction => ({
    type: 'SHOW_CONFIRMATION',
    payload: { title, message, onConfirm }
  }),

  hideConfirmation: (): UIAction => ({
    type: 'HIDE_CONFIRMATION'
  }),
};
