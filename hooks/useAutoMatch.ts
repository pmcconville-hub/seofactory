import { useState, useCallback, useEffect, useRef } from 'react';
import { AutoMatchService, AutoMatchResult, MatchResult, GapTopic } from '../services/migration/AutoMatchService';
import type { SiteInventoryItem, EnrichedTopic } from '../types';
import { getSupabaseClient } from '../services/supabaseClient';
import { useAppState } from '../state/appState';

/**
 * Hook for managing auto-matching between site inventory URLs and topical map topics.
 *
 * Uses AutoMatchService (Jaccard-based text similarity) with optional GSC query signals
 * to produce match results, then allows confirming/rejecting individual or batch matches.
 *
 * All match results are persisted to site_inventory immediately on run, so they
 * survive page refresh. On mount, the hook reconstructs the AutoMatchResult from
 * the persisted data if any items have match_category set.
 */
export function useAutoMatch(projectId: string, mapId: string) {
  const { state } = useAppState();
  const { businessInfo } = state;

  const [isMatching, setIsMatching] = useState(false);
  const [result, setResult] = useState<AutoMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadedFromDb = useRef(false);

  /**
   * Fetch top GSC queries per page from gsc_search_analytics.
   * Groups by page URL, ordered by clicks DESC, limit 10 queries per page.
   * Returns a Map<pageUrl, topQueries[]> for use by AutoMatchService.
   */
  const fetchGscQueries = useCallback(async (): Promise<Map<string, string[]>> => {
    const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey) as any;
    const gscQueriesMap = new Map<string, string[]>();

    // 1. Find the GSC analytics_property for this project
    const { data: property, error: propError } = await supabase
      .from('analytics_properties')
      .select('id')
      .eq('project_id', projectId)
      .eq('service', 'gsc')
      .eq('is_primary', true)
      .maybeSingle();

    if (propError || !property) {
      // No GSC property linked — not an error, just no GSC signal available
      return gscQueriesMap;
    }

    // 2. Fetch all GSC rows for this property, ordered by clicks DESC
    const { data: rows, error: queryError } = await supabase
      .from('gsc_search_analytics')
      .select('page, query, clicks')
      .eq('property_id', property.id)
      .order('clicks', { ascending: false });

    if (queryError || !rows) {
      return gscQueriesMap;
    }

    // 3. Group by page URL, keeping top 10 queries per page
    for (const row of rows as { page: string; query: string; clicks: number }[]) {
      const existing = gscQueriesMap.get(row.page);
      if (!existing) {
        gscQueriesMap.set(row.page, [row.query]);
      } else if (existing.length < 10) {
        existing.push(row.query);
      }
    }

    return gscQueriesMap;
  }, [projectId, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

  /**
   * Persist all match results to site_inventory immediately.
   * Sets match_category, match_confidence, mapped_topic_id (tentative), and match_source='auto'.
   */
  const persistMatchResults = useCallback(async (
    matchResult: AutoMatchResult,
  ): Promise<void> => {
    const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey) as any;

    const updatePromises = matchResult.matches.map((match: MatchResult) => {
      const updateData: Record<string, unknown> = {
        match_category: match.category,
        match_confidence: match.confidence,
        match_source: 'auto',
        updated_at: new Date().toISOString(),
      };

      // For matched items, set tentative mapped_topic_id
      if (match.category === 'matched' && match.topicId) {
        updateData.mapped_topic_id = match.topicId;
      }
      // For orphans, clear mapped_topic_id
      if (match.category === 'orphan') {
        updateData.mapped_topic_id = null;
      }
      // For cannibalization, set the best match topic
      if (match.category === 'cannibalization' && match.topicId) {
        updateData.mapped_topic_id = match.topicId;
      }

      return supabase
        .from('site_inventory')
        .update(updateData)
        .eq('id', match.inventoryId);
    });

    const results = await Promise.all(updatePromises);
    const failures = results.filter((r: { error: unknown }) => r.error);
    if (failures.length > 0) {
      console.warn(`[useAutoMatch] ${failures.length} match persistence updates failed`);
    }
  }, [businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

  /**
   * Reconstruct an AutoMatchResult from persisted site_inventory data.
   * Called on mount to restore previous match results without re-running.
   */
  const loadPersistedResults = useCallback((
    inventory: SiteInventoryItem[],
    topics: EnrichedTopic[],
  ): AutoMatchResult | null => {
    // Check if any items have match data
    const itemsWithMatchData = inventory.filter(item => item.match_category);
    if (itemsWithMatchData.length === 0) return null;

    const matches: MatchResult[] = itemsWithMatchData.map(item => ({
      inventoryId: item.id,
      topicId: item.mapped_topic_id ?? null,
      confidence: item.match_confidence ?? 0,
      matchSignals: [], // Signals are not persisted (diagnostic detail)
      category: item.match_category as 'matched' | 'orphan' | 'cannibalization',
    }));

    // Reconstruct gaps: topics not mapped to any inventory item
    const matchedTopicIds = new Set(
      inventory.filter(i => i.mapped_topic_id).map(i => i.mapped_topic_id!)
    );
    const gaps: GapTopic[] = topics
      .filter(t => !matchedTopicIds.has(t.id))
      .map(t => ({
        topicId: t.id,
        topicTitle: t.title,
        importance: (t.type === 'core' ? 'pillar' : 'supporting') as 'pillar' | 'supporting',
      }));

    // Compute stats
    const stats = {
      matched: matches.filter(m => m.category === 'matched').length,
      orphans: matches.filter(m => m.category === 'orphan').length,
      gaps: gaps.length,
      cannibalization: matches.filter(m => m.category === 'cannibalization').length,
    };

    return { matches, gaps, stats };
  }, []);

  /**
   * Run the auto-match algorithm against the given inventory and topics.
   * Fetches GSC queries from the database to enrich match signals.
   * Persists all results immediately so they survive page refresh.
   */
  const runMatch = useCallback(async (
    inventory: SiteInventoryItem[],
    topics: EnrichedTopic[],
  ): Promise<void> => {
    setIsMatching(true);
    setError(null);
    setResult(null);

    try {
      // Fetch GSC queries for additional signal
      const gscQueries = await fetchGscQueries();

      // Run the matching algorithm
      const service = new AutoMatchService();
      const matchResult = service.match(inventory, topics, gscQueries);

      // Persist ALL results to database immediately
      await persistMatchResults(matchResult);

      setResult(matchResult);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Auto-match failed';
      setError(message);
      console.error('[useAutoMatch] runMatch error:', e);
    } finally {
      setIsMatching(false);
    }
  }, [fetchGscQueries, persistMatchResults]);

  /**
   * Try to load persisted match results from inventory data.
   * Called when inventory or topics change and we haven't loaded yet.
   */
  const tryLoadFromDb = useCallback((
    inventory: SiteInventoryItem[],
    topics: EnrichedTopic[],
  ) => {
    if (loadedFromDb.current || result) return;
    const persisted = loadPersistedResults(inventory, topics);
    if (persisted) {
      setResult(persisted);
      loadedFromDb.current = true;
    }
  }, [loadPersistedResults, result]);

  /**
   * Confirm a single auto-match: sets the inventory item's mapped_topic_id,
   * match_confidence, and match_source in the database.
   */
  const confirmMatch = useCallback(async (
    inventoryId: string,
    topicId: string,
  ): Promise<void> => {
    setError(null);

    try {
      // Find the confidence from the current result
      const matchEntry = result?.matches.find(
        (m: MatchResult) => m.inventoryId === inventoryId && m.topicId === topicId
      );
      const confidence = matchEntry?.confidence ?? null;

      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey) as any;
      const { error: updateError } = await supabase
        .from('site_inventory')
        .update({
          mapped_topic_id: topicId,
          match_confidence: confidence,
          match_source: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', inventoryId);

      if (updateError) {
        throw new Error(`Failed to confirm match: ${updateError.message}`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to confirm match';
      setError(message);
      console.error('[useAutoMatch] confirmMatch error:', e);
    }
  }, [result, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

  /**
   * Reject a match: clears match_confidence and match_source, keeps mapped_topic_id null.
   */
  const rejectMatch = useCallback(async (
    inventoryId: string,
  ): Promise<void> => {
    setError(null);

    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey) as any;
      const { error: updateError } = await supabase
        .from('site_inventory')
        .update({
          mapped_topic_id: null,
          match_confidence: null,
          match_source: null,
          match_category: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inventoryId);

      if (updateError) {
        throw new Error(`Failed to reject match: ${updateError.message}`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to reject match';
      setError(message);
      console.error('[useAutoMatch] rejectMatch error:', e);
    }
  }, [businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

  /**
   * Batch-confirm all matches from the current result where confidence >= minConfidence
   * and category is 'matched' (excludes orphans and cannibalization).
   */
  const confirmAll = useCallback(async (
    minConfidence: number,
  ): Promise<void> => {
    setError(null);

    if (!result) {
      setError('No match result available. Run auto-match first.');
      return;
    }

    const eligibleMatches = result.matches.filter(
      (m: MatchResult) =>
        m.category === 'matched' &&
        m.confidence >= minConfidence &&
        m.topicId !== null
    );

    if (eligibleMatches.length === 0) {
      return;
    }

    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey) as any;

      // Batch update all eligible matches
      const updatePromises = eligibleMatches.map((match: MatchResult) =>
        supabase
          .from('site_inventory')
          .update({
            mapped_topic_id: match.topicId,
            match_confidence: match.confidence,
            match_source: 'confirmed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', match.inventoryId)
      );

      const results = await Promise.all(updatePromises);

      // Check for any failures
      const failures = results.filter((r: { error: unknown }) => r.error);
      if (failures.length > 0) {
        throw new Error(`${failures.length} of ${eligibleMatches.length} batch confirmations failed`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Batch confirm failed';
      setError(message);
      console.error('[useAutoMatch] confirmAll error:', e);
    }
  }, [result, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

  return {
    isMatching,
    result,
    runMatch,
    confirmMatch,
    rejectMatch,
    confirmAll,
    tryLoadFromDb,
    error,
  };
}
