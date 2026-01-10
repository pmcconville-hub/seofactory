/**
 * useSuperAdmin Hook
 *
 * Hook for checking if the current user is a platform super admin.
 * Super admins have access to the Admin Console and can manage
 * all organizations, users, and system-wide settings.
 *
 * Created: 2026-01-10 - Super Admin Implementation
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import { useAppState } from '../state/appState';

interface SuperAdminState {
  isSuperAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useSuperAdmin(): SuperAdminState & { refresh: () => Promise<void> } {
  const { state } = useAppState();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) {
      return null;
    }
    return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  const checkSuperAdmin = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      // Check is_super_admin in user_settings
      const { data, error: queryError } = await supabase
        .from('user_settings')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .single();

      if (queryError) {
        // If no row exists, user is not super admin
        if (queryError.code === 'PGRST116') {
          setIsSuperAdmin(false);
        } else {
          throw queryError;
        }
      } else {
        setIsSuperAdmin(data?.is_super_admin === true);
      }
    } catch (err) {
      console.error('Failed to check super admin status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check admin status');
      setIsSuperAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Check on mount and when supabase client changes
  useEffect(() => {
    checkSuperAdmin();
  }, [checkSuperAdmin]);

  // Also listen for auth state changes
  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSuperAdmin();
    });

    return () => subscription.unsubscribe();
  }, [supabase, checkSuperAdmin]);

  return {
    isSuperAdmin,
    isLoading,
    error,
    refresh: checkSuperAdmin,
  };
}

export default useSuperAdmin;
