// components/organization/OrganizationProvider.tsx
/**
 * OrganizationProvider
 *
 * Wraps the app to provide organization context globally.
 * Uses useOrganization hook and exposes via React Context.
 *
 * Created: 2026-01-10 - Multi-tenancy Phase 1
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useOrganization } from '../../hooks/useOrganization';
import { useAppState } from '../../state/appState';

type OrganizationContextType = ReturnType<typeof useOrganization>;

const OrganizationContext = createContext<OrganizationContextType | null>(null);

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganizationContext must be used within OrganizationProvider');
  }
  return context;
}

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { state } = useAppState();
  const organizationState = useOrganization(state.businessInfo);

  return (
    <OrganizationContext.Provider value={organizationState}>
      {children}
    </OrganizationContext.Provider>
  );
}
