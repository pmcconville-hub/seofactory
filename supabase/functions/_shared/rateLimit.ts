// supabase/functions/_shared/rateLimit.ts
// Simple rate limiter using Supabase ai_usage_logs table
// Counts requests in a rolling time window per user
//
// deno-lint-ignore-file no-explicit-any

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
}

/**
 * Check whether a user has exceeded the rate limit for an endpoint.
 *
 * Uses the existing ai_usage_logs table to count requests within a rolling
 * time window.  "Fails open" — if the count query errors for any reason the
 * request is allowed through so we don't block legitimate traffic.
 *
 * @param supabase  - SupabaseClient (service-role so the query bypasses RLS)
 * @param userId    - The authenticated user's UUID
 * @param endpoint  - A label for the endpoint (e.g. 'anthropic-proxy')
 * @param maxRequests   - Maximum requests allowed in the window (default 60)
 * @param windowMinutes - Length of the rolling window in minutes (default 1)
 */
export async function checkRateLimit(
  supabase: any, // SupabaseClient passed from caller
  userId: string,
  endpoint: string,
  maxRequests: number = 60,
  windowMinutes: number = 1
): Promise<RateLimitResult> {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', windowStart);

    if (error) {
      // If rate limit check fails, allow the request (fail open)
      console.warn('[RateLimit] Check failed, allowing request:', error.message);
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: new Date(Date.now() + windowMinutes * 60 * 1000).toISOString(),
      };
    }

    const currentCount = count || 0;
    return {
      allowed: currentCount < maxRequests,
      remaining: Math.max(0, maxRequests - currentCount),
      resetAt: new Date(Date.now() + windowMinutes * 60 * 1000).toISOString(),
    };
  } catch (err) {
    // Fail open on unexpected errors
    console.warn('[RateLimit] Unexpected error, allowing request:', (err as Error)?.message);
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: new Date(Date.now() + windowMinutes * 60 * 1000).toISOString(),
    };
  }
}
