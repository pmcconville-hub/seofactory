/**
 * Google GA4 Service
 *
 * Frontend wrapper for reading GA4 data from the `ga4_traffic_data` table
 * (populated by the analytics-sync-worker edge function).
 *
 * Graceful fallback: returns empty arrays on failure.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface Ga4PageMetrics {
  pagePath: string;
  sessions: number;
  totalUsers: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  engagedSessions: number;
  eventCount: number;
  conversions: number;
}

export interface Ga4TrafficSource {
  source: string;
  medium: string;
  sessions: number;
  users: number;
}

/**
 * Fetch aggregated GA4 page metrics from the synced database table.
 */
export async function getGa4PageMetrics(
  propertyId: string,
  supabase: SupabaseClient
): Promise<Ga4PageMetrics[]> {
  if (!propertyId) return [];

  try {
    const { data, error } = await supabase
      .from('ga4_traffic_data')
      .select('page_path, sessions, total_users, pageviews, bounce_rate, avg_session_duration, engaged_sessions, event_count, conversions')
      .eq('property_id', propertyId)
      .order('sessions', { ascending: false })
      .limit(500);

    if (error || !data) {
      console.warn('[Ga4Service] Failed to fetch page metrics:', error?.message);
      return [];
    }

    // Aggregate by page_path (multiple rows per date)
    const pageMap = new Map<string, Ga4PageMetrics>();
    for (const row of data) {
      const existing = pageMap.get(row.page_path);
      if (existing) {
        existing.sessions += row.sessions || 0;
        existing.totalUsers += row.total_users || 0;
        existing.pageviews += row.pageviews || 0;
        existing.engagedSessions += row.engaged_sessions || 0;
        existing.eventCount += row.event_count || 0;
        existing.conversions += row.conversions || 0;
        // Average the rate fields using a running count
        const count = existing.pageviews > 0 ? existing.pageviews : 1;
        existing.bounceRate = (existing.bounceRate * (count - 1) + (row.bounce_rate || 0)) / count;
        existing.avgSessionDuration = (existing.avgSessionDuration * (count - 1) + (row.avg_session_duration || 0)) / count;
      } else {
        pageMap.set(row.page_path, {
          pagePath: row.page_path,
          sessions: row.sessions || 0,
          totalUsers: row.total_users || 0,
          pageviews: row.pageviews || 0,
          bounceRate: row.bounce_rate || 0,
          avgSessionDuration: row.avg_session_duration || 0,
          engagedSessions: row.engaged_sessions || 0,
          eventCount: row.event_count || 0,
          conversions: row.conversions || 0,
        });
      }
    }

    return Array.from(pageMap.values()).sort((a, b) => b.sessions - a.sessions);
  } catch (error) {
    console.warn('[Ga4Service] Failed:', error);
    return [];
  }
}

/**
 * Get summary metrics from GA4 data.
 */
export function getGa4Summary(metrics: Ga4PageMetrics[]): {
  totalSessions: number;
  avgBounceRate: number;
  topPages: string[];
} {
  if (!metrics.length) {
    return { totalSessions: 0, avgBounceRate: 0, topPages: [] };
  }

  const totalSessions = metrics.reduce((sum, m) => sum + m.sessions, 0);
  const avgBounceRate = metrics.reduce((sum, m) => sum + m.bounceRate, 0) / metrics.length;
  const topPages = metrics.slice(0, 5).map(m => m.pagePath);

  return {
    totalSessions: Math.round(totalSessions),
    avgBounceRate: Math.round(avgBounceRate * 100) / 100,
    topPages,
  };
}
