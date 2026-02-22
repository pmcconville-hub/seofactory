/**
 * Google Cloud NLP Service
 *
 * Frontend wrapper for the cloud-nlp-entity edge function.
 * Analyzes entity salience to measure Central Entity prominence.
 *
 * Graceful fallback: returns empty array on failure.
 */

export interface EntitySalienceResult {
  name: string;
  type: string;
  salience: number;
  mentions: Array<{
    text: string;
    type: string;
    beginOffset?: number;
  }>;
  metadata?: Record<string, string>;
}

export interface CentralEntityProminence {
  salience: number;
  rank: number;
  totalEntities: number;
  isMostSalient: boolean;
}

/**
 * Analyze entity salience in a given text.
 */
export async function analyzeEntitySalience(
  text: string,
  language: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
  apiKey?: string
): Promise<EntitySalienceResult[]> {
  if (!text) return [];

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/cloud-nlp-entity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ text, language, apiKey }),
    });

    if (!response.ok) {
      console.warn('[CloudNlpService] Edge function error:', response.status);
      return [];
    }

    const data = await response.json();
    if (!data.ok || !data.entities) {
      console.warn('[CloudNlpService] Unexpected response:', data);
      return [];
    }

    return data.entities;
  } catch (error) {
    console.warn('[CloudNlpService] Failed:', error);
    return [];
  }
}

/**
 * Measure how prominently the Central Entity appears in a text.
 * Returns salience score, rank among all entities, and whether it's the most salient.
 */
export async function measureCentralEntityProminence(
  text: string,
  centralEntity: string,
  language: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
  apiKey?: string
): Promise<CentralEntityProminence | null> {
  const entities = await analyzeEntitySalience(text, language, supabaseUrl, supabaseAnonKey, apiKey);
  if (!entities.length) return null;

  const ceLower = centralEntity.toLowerCase();

  // Find the Central Entity in the results
  const ceIndex = entities.findIndex(e =>
    e.name.toLowerCase() === ceLower ||
    e.name.toLowerCase().includes(ceLower) ||
    ceLower.includes(e.name.toLowerCase())
  );

  if (ceIndex === -1) {
    // CE not found at all — that's a significant signal
    return {
      salience: 0,
      rank: entities.length + 1,
      totalEntities: entities.length,
      isMostSalient: false,
    };
  }

  return {
    salience: entities[ceIndex].salience,
    rank: ceIndex + 1, // entities are sorted by salience desc
    totalEntities: entities.length,
    isMostSalient: ceIndex === 0,
  };
}
