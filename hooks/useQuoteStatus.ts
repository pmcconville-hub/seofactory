/**
 * useQuoteStatus Hook
 *
 * Manages quote status changes and activity logging.
 */

import { useState, useCallback } from 'react';
import {
  Quote,
  QuoteStatus,
  QuoteActivity,
  QuoteActivityType,
} from '../types/quotation';

export interface UseQuoteStatusReturn {
  // Status management
  updateStatus: (quoteId: string, newStatus: QuoteStatus) => Promise<void>;
  isUpdating: boolean;

  // Activity logging
  logActivity: (quoteId: string, activityType: QuoteActivityType, details?: Record<string, unknown>) => Promise<void>;

  // Validation
  canTransitionTo: (currentStatus: QuoteStatus, targetStatus: QuoteStatus) => boolean;
  getValidTransitions: (currentStatus: QuoteStatus) => QuoteStatus[];

  // Expiration
  isExpired: (quote: Quote) => boolean;
  daysUntilExpiry: (quote: Quote) => number | null;
}

// Valid status transitions
const STATUS_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['viewed', 'accepted', 'rejected', 'expired'],
  viewed: ['accepted', 'rejected', 'expired'],
  accepted: [], // Terminal state
  rejected: ['draft'], // Can revise and try again
  expired: ['draft'], // Can revise and try again
};

export function useQuoteStatus(): UseQuoteStatusReturn {
  const [isUpdating, setIsUpdating] = useState(false);

  /**
   * Check if a status transition is valid
   */
  const canTransitionTo = useCallback(
    (currentStatus: QuoteStatus, targetStatus: QuoteStatus): boolean => {
      const validTransitions = STATUS_TRANSITIONS[currentStatus] || [];
      return validTransitions.includes(targetStatus);
    },
    []
  );

  /**
   * Get all valid transitions from current status
   */
  const getValidTransitions = useCallback((currentStatus: QuoteStatus): QuoteStatus[] => {
    return STATUS_TRANSITIONS[currentStatus] || [];
  }, []);

  /**
   * Update quote status
   */
  const updateStatus = useCallback(
    async (quoteId: string, newStatus: QuoteStatus): Promise<void> => {
      setIsUpdating(true);
      try {
        // TODO: Implement Supabase update
        // const { error } = await supabase
        //   .from('quotes')
        //   .update({
        //     status: newStatus,
        //     ...(newStatus === 'sent' ? { sent_at: new Date().toISOString() } : {}),
        //     ...(newStatus === 'viewed' ? { viewed_at: new Date().toISOString() } : {}),
        //     ...(newStatus === 'accepted' || newStatus === 'rejected'
        //       ? { responded_at: new Date().toISOString() }
        //       : {}),
        //   })
        //   .eq('id', quoteId);

        // Log the activity
        await logActivity(quoteId, 'status_changed', {
          newStatus,
          timestamp: new Date().toISOString(),
        });

        console.log(`[useQuoteStatus] Updated quote ${quoteId} to status: ${newStatus}`);
      } catch (error) {
        console.error('[useQuoteStatus] Failed to update status:', error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  /**
   * Log activity for a quote
   */
  const logActivity = useCallback(
    async (
      quoteId: string,
      activityType: QuoteActivityType,
      details?: Record<string, unknown>
    ): Promise<void> => {
      try {
        // TODO: Implement Supabase insert
        // const { error } = await supabase
        //   .from('quote_activities')
        //   .insert({
        //     quote_id: quoteId,
        //     activity_type: activityType,
        //     details,
        //     created_by: user?.id,
        //   });

        console.log(`[useQuoteStatus] Logged activity for quote ${quoteId}: ${activityType}`);
      } catch (error) {
        console.error('[useQuoteStatus] Failed to log activity:', error);
        // Don't throw - activity logging shouldn't break the main flow
      }
    },
    []
  );

  /**
   * Check if a quote is expired
   */
  const isExpired = useCallback((quote: Quote): boolean => {
    if (!quote.validUntil) return false;
    return new Date(quote.validUntil) < new Date();
  }, []);

  /**
   * Get days until quote expires
   */
  const daysUntilExpiry = useCallback((quote: Quote): number | null => {
    if (!quote.validUntil) return null;
    const expiryDate = new Date(quote.validUntil);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  return {
    updateStatus,
    isUpdating,
    logActivity,
    canTransitionTo,
    getValidTransitions,
    isExpired,
    daysUntilExpiry,
  };
}

export default useQuoteStatus;
