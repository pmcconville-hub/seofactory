// =============================================================================
// Design Persistence — Save/load premium designs to Supabase
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SavedPremiumDesign, PremiumDesignSession, ValidationResult, CrawledCssTokens } from './types';

/**
 * Save a completed design session to the database.
 * Creates a new version if a design already exists for this topic.
 */
export async function savePremiumDesign(
  supabase: SupabaseClient,
  userId: string,
  topicId: string,
  session: PremiumDesignSession,
  options?: { briefId?: string; mapId?: string }
): Promise<SavedPremiumDesign | null> {
  // Get current max version for this topic
  const { data: existing } = await supabase
    .from('premium_designs')
    .select('version')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = (existing?.[0]?.version ?? 0) + 1;
  const lastIteration = session.iterations[session.iterations.length - 1];

  const record = {
    user_id: userId,
    topic_id: topicId,
    brief_id: options?.briefId || null,
    map_id: options?.mapId || null,
    version: nextVersion,
    target_url: session.targetUrl,
    final_css: session.finalCss,
    final_html: session.finalHtml,
    final_score: session.finalScore,
    target_screenshot: session.targetScreenshot?.substring(0, 500000) || null, // cap size
    output_screenshot: lastIteration?.screenshotBase64?.substring(0, 500000) || null,
    validation_result: lastIteration?.validationResult || null,
    crawled_tokens: session.crawledCssTokens || null,
    iterations_count: session.iterations.length,
    status: session.status === 'complete' ? 'complete' : 'error',
  };

  const { data, error } = await supabase
    .from('premium_designs')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('[designPersistence] Failed to save design:', error);
    return null;
  }

  return data as unknown as SavedPremiumDesign;
}

/**
 * Load the latest design for a topic.
 */
export async function loadLatestDesign(
  supabase: SupabaseClient,
  userId: string,
  topicId: string
): Promise<SavedPremiumDesign | null> {
  const { data, error } = await supabase
    .from('premium_designs')
    .select('*')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as unknown as SavedPremiumDesign;
}

/**
 * Load all design versions for a topic (lightweight — excludes large fields).
 */
export async function loadDesignHistory(
  supabase: SupabaseClient,
  userId: string,
  topicId: string
): Promise<Pick<SavedPremiumDesign, 'id' | 'version' | 'final_score' | 'target_url' | 'iterations_count' | 'created_at' | 'status'>[]> {
  const { data, error } = await supabase
    .from('premium_designs')
    .select('id, version, final_score, target_url, iterations_count, created_at, status')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .order('version', { ascending: false });

  if (error || !data) return [];
  return data as any[];
}

/**
 * Load a specific design version by ID.
 */
export async function loadDesignById(
  supabase: SupabaseClient,
  designId: string
): Promise<SavedPremiumDesign | null> {
  const { data, error } = await supabase
    .from('premium_designs')
    .select('*')
    .eq('id', designId)
    .single();

  if (error || !data) return null;
  return data as unknown as SavedPremiumDesign;
}

/**
 * Delete a specific design version.
 */
export async function deleteDesign(
  supabase: SupabaseClient,
  designId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('premium_designs')
    .delete()
    .eq('id', designId);

  return !error;
}
