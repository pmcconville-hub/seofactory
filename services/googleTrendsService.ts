/**
 * Google Trends Service
 *
 * Frontend wrapper for the google-trends edge function (SerpAPI proxy).
 * Provides seasonal patterns and rising query data.
 *
 * Graceful fallback: returns null on failure.
 */

export interface TrendsDataPoint {
  date: string;
  value: number;
}

export interface TrendsRelatedQuery {
  query: string;
  value: number;
}

export interface TrendsRisingQuery {
  query: string;
  value: number;
  link?: string;
}

export interface TrendsData {
  query: string;
  geo: string;
  interestOverTime: TrendsDataPoint[];
  relatedQueries: TrendsRelatedQuery[];
  risingQueries: TrendsRisingQuery[];
}

export interface SeasonalityPattern {
  peakMonths: number[];
  troughMonths: number[];
  seasonalityStrength: number; // 0-1, how seasonal is the query
}

/**
 * Fetch Google Trends data for a query.
 */
export async function getTrendsData(
  query: string,
  geo: string | undefined,
  timeRange: string | undefined,
  supabaseUrl: string,
  supabaseAnonKey: string,
  apiKey?: string
): Promise<TrendsData | null> {
  if (!query) return null;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/google-trends`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ query, geo, timeRange, apiKey }),
    });

    if (!response.ok) {
      console.warn('[TrendsService] Edge function error:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data.ok) {
      console.warn('[TrendsService] Unexpected response:', data);
      return null;
    }

    return {
      query: data.query,
      geo: data.geo || 'worldwide',
      interestOverTime: data.interestOverTime || [],
      relatedQueries: data.relatedQueries || [],
      risingQueries: data.risingQueries || [],
    };
  } catch (error) {
    console.warn('[TrendsService] Failed:', error);
    return null;
  }
}

/**
 * Analyze trends data to identify seasonal patterns.
 */
export function getSeasonalityPattern(trendsData: TrendsData): SeasonalityPattern {
  if (!trendsData.interestOverTime.length) {
    return { peakMonths: [], troughMonths: [], seasonalityStrength: 0 };
  }

  // Group by month and average values
  const monthlyAverages: Record<number, number[]> = {};
  for (const point of trendsData.interestOverTime) {
    const date = new Date(point.date);
    if (isNaN(date.getTime())) continue;
    const month = date.getMonth() + 1; // 1-12
    if (!monthlyAverages[month]) monthlyAverages[month] = [];
    monthlyAverages[month].push(point.value);
  }

  const monthAvg: Array<{ month: number; avg: number }> = [];
  for (const [month, values] of Object.entries(monthlyAverages)) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    monthAvg.push({ month: parseInt(month), avg });
  }

  if (monthAvg.length < 3) {
    return { peakMonths: [], troughMonths: [], seasonalityStrength: 0 };
  }

  // Sort by average value
  monthAvg.sort((a, b) => b.avg - a.avg);
  const overallAvg = monthAvg.reduce((sum, m) => sum + m.avg, 0) / monthAvg.length;

  // Peak months: above average by significant amount
  const peakMonths = monthAvg
    .filter(m => m.avg > overallAvg * 1.2)
    .map(m => m.month);

  // Trough months: below average by significant amount
  const troughMonths = monthAvg
    .filter(m => m.avg < overallAvg * 0.8)
    .map(m => m.month);

  // Seasonality strength: coefficient of variation
  const maxAvg = monthAvg[0]?.avg || 1;
  const minAvg = monthAvg[monthAvg.length - 1]?.avg || 0;
  const range = maxAvg - minAvg;
  const seasonalityStrength = overallAvg > 0
    ? Math.min(1, range / overallAvg)
    : 0;

  return { peakMonths, troughMonths, seasonalityStrength };
}
