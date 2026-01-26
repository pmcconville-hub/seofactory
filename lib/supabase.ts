/**
 * Supabase client instance for database operations.
 * Re-exports the useSupabase function from services/supabaseClient.
 */

import { useSupabase } from '../services/supabaseClient';

// Export the supabase client getter
export const supabase = {
  from: (table: string) => useSupabase().from(table)
};
