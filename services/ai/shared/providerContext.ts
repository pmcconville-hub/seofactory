// services/ai/shared/providerContext.ts

/**
 * Shared provider context module.
 * Encapsulates the usage context + operation tracking pattern
 * that was previously duplicated across all AI provider services.
 */

import type { AIUsageContext } from '../../telemetryService';

export interface ProviderContext {
  setUsageContext(context: AIUsageContext, operation?: string): void;
  getUsageContext(): AIUsageContext;
  getOperation(): string;
  getProviderName(): string;
}

/**
 * Creates an isolated context instance for a specific AI provider.
 * Each provider gets its own independent state for usage context and operation tracking.
 */
export function createProviderContext(providerName: string): ProviderContext {
  let currentUsageContext: AIUsageContext = {};
  let currentOperation = 'unknown';

  return {
    setUsageContext(context: AIUsageContext, operation?: string) {
      currentUsageContext = context;
      if (operation) currentOperation = operation;
    },
    getUsageContext: () => currentUsageContext,
    getOperation: () => currentOperation,
    getProviderName: () => providerName,
  };
}
