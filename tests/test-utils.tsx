// tests/test-utils.tsx
import React, { ReactElement, useReducer } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppStateContext, appReducer, initialState, AppState, AppAction } from '../state/appState';

// Custom render that wraps with AppStateContext
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: Partial<AppState>;
}

function createTestState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...initialState,
    ...overrides,
  };
}

function TestProviders({
  children,
  initialTestState
}: {
  children: React.ReactNode;
  initialTestState: AppState;
}) {
  const [state, dispatch] = useReducer(appReducer, initialTestState);
  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { initialState: stateOverrides, ...renderOptions } = options;
  const testState = createTestState(stateOverrides);

  return {
    user: userEvent.setup(),
    ...render(ui, {
      wrapper: ({ children }) => (
        <TestProviders initialTestState={testState}>
          {children}
        </TestProviders>
      ),
      ...renderOptions,
    }),
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent };
