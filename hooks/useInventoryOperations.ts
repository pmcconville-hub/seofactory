
import React, { useState, useCallback, useEffect } from 'react';
import { SiteInventoryItem, ActionType, TransitionStatus, BusinessInfo, EnrichedTopic, FreshnessProfile } from '../types';
import { getSupabaseClient } from '../services/supabaseClient';
import { sanitizeInventoryFromDb, sanitizeTopicFromDb } from '../utils/parsers';
import { AppAction } from '../state/appState';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../utils/helpers';
import type { Json } from '../database.types';
import { verifiedInsert } from '../services/verifiedDatabaseService';

export const useInventoryOperations = (
    activeProjectId: string | null,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>,
    activeMapId?: string | null,
    userId?: string
) => {
    const [inventory, setInventory] = useState<SiteInventoryItem[]>([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);

    // Upsert strategy fields to map_page_strategy table
    const upsertStrategy = useCallback(async (
        inventoryId: string,
        fields: Record<string, unknown>
    ): Promise<{ success: boolean; error?: string }> => {
        if (!activeMapId) return { success: false, error: 'No active map' };
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const { error } = await (supabase as any)
                .from('map_page_strategy')
                .upsert({
                    map_id: activeMapId,
                    inventory_id: inventoryId,
                    ...fields,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'map_id,inventory_id' });
            if (error) throw error;
            return { success: true };
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Strategy upsert failed';
            console.error('[useInventoryOperations] upsertStrategy failed:', msg);
            return { success: false, error: msg };
        }
    }, [activeMapId, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

    const refreshInventory = useCallback(async () => {
        if (!activeProjectId) return;

        setIsLoadingInventory(true);
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // Query 1: Page-level facts
            const { data: pages, error: pageError } = await supabase
                .from('site_inventory')
                .select('*')
                .eq('project_id', activeProjectId)
                .order('gsc_clicks', { ascending: false });
            if (pageError) throw pageError;

            // Query 2: Strategy overlay for current map
            let strategyMap = new Map<string, Record<string, unknown>>();
            if (activeMapId) {
                const { data: strategies, error: stratError } = await (supabase as any)
                    .from('map_page_strategy')
                    .select('*')
                    .eq('map_id', activeMapId);
                if (stratError) console.warn('[useInventoryOperations] Strategy fetch failed:', stratError);
                if (strategies) {
                    strategyMap = new Map(strategies.map((s: any) => [s.inventory_id, s]));
                }
            }

            // Merge: strategy fields override page defaults
            const merged = (pages || []).map((page: any) => {
                const strategy = strategyMap.get(page.id);
                if (!strategy) return page;
                return {
                    ...page,
                    mapped_topic_id: strategy.mapped_topic_id ?? page.mapped_topic_id,
                    match_category: strategy.match_category,
                    match_confidence: strategy.match_confidence,
                    match_source: strategy.match_source,
                    action: strategy.action ?? page.action,
                    recommended_action: strategy.recommended_action,
                    action_reasoning: strategy.action_reasoning,
                    action_priority: strategy.action_priority,
                    action_effort: strategy.action_effort,
                    action_data_points: strategy.action_data_points,
                    status: strategy.status ?? page.status,
                    section: strategy.section ?? page.section,
                    ce_alignment: strategy.ce_alignment,
                    sc_alignment: strategy.sc_alignment,
                    csi_alignment: strategy.csi_alignment,
                    semantic_overall_score: strategy.semantic_overall_score,
                    overlay_status: strategy.overlay_status,
                };
            });

            const sanitized = merged.map(sanitizeInventoryFromDb);
            setInventory(sanitized);
        } catch (e) {
            console.error("Failed to fetch inventory:", e);
            dispatch({ type: 'SET_ERROR', payload: "Failed to load inventory." });
        } finally {
            setIsLoadingInventory(false);
        }
    }, [activeProjectId, activeMapId, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, dispatch]);

    // Initial fetch
    useEffect(() => {
        refreshInventory();
    }, [refreshInventory]);

    const updateAction = async (itemId: string, action: ActionType) => {
        const result = await upsertStrategy(itemId, {
            action: action,
            status: 'GAP_ANALYSIS',
        });
        if (!result.success) {
            dispatch({ type: 'SET_ERROR', payload: `Failed to update action: ${result.error}` });
            return;
        }
        dispatch({ type: 'SET_NOTIFICATION', payload: `Updated action to: ${action}` });
        refreshInventory();
    };

    const updateStatus = async (itemId: string, newStatus: TransitionStatus) => {
        // Optimistic update
        setInventory(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i));
        const result = await upsertStrategy(itemId, { status: newStatus });
        if (!result.success) {
            dispatch({ type: 'SET_ERROR', payload: `Failed to update status: ${result.error}` });
            refreshInventory(); // Revert on error
        }
    };

    const markOptimized = async (itemId: string) => {
        const result = await upsertStrategy(itemId, { status: 'OPTIMIZED' });
        if (!result.success) {
            dispatch({ type: 'SET_ERROR', payload: `Failed to mark optimized: ${result.error}` });
            return;
        }
        dispatch({ type: 'SET_NOTIFICATION', payload: "Marked as Optimized." });
        refreshInventory();
    };

    const mapInventoryItem = async (inventoryId: string, topicId: string, action: ActionType) => {
        const result = await upsertStrategy(inventoryId, {
            mapped_topic_id: topicId,
            action: action,
            status: 'GAP_ANALYSIS',
        });
        if (!result.success) {
            dispatch({ type: 'SET_ERROR', payload: `Failed to map inventory: ${result.error}` });
            return;
        }
        dispatch({ type: 'SET_NOTIFICATION', payload: `Mapped inventory to topic with strategy: ${action}` });
        refreshInventory();
    };

    const promoteToCore = async (inventoryId: string) => {
        if (!activeMapId || !userId) {
            dispatch({ type: 'SET_ERROR', payload: "Cannot promote: No active map or user session." });
            return;
        }

        const item = inventory.find(i => i.id === inventoryId);
        if (!item) return;

        // Derive a clean title from the URL or Title
        let cleanTitle = item.title || item.url.split('/').pop()?.replace(/-/g, ' ') || 'New Topic';
        cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

        const newTopic: EnrichedTopic = {
            id: uuidv4(),
            map_id: activeMapId,
            title: cleanTitle,
            slug: slugify(cleanTitle),
            description: `Promoted from inventory: ${item.url}`,
            type: 'core',
            parent_topic_id: null,
            freshness: FreshnessProfile.EVERGREEN,
            metadata: {
                source: 'inventory_promotion',
                original_url: item.url
            }
        };

        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // 1. Create Topic with verification
            const topicResult = await verifiedInsert(
                supabase,
                { table: 'topics', operationDescription: `promote "${cleanTitle}" to core topic` },
                {
                    id: newTopic.id,
                    map_id: newTopic.map_id,
                    title: newTopic.title,
                    slug: newTopic.slug,
                    description: newTopic.description,
                    type: newTopic.type,
                    parent_topic_id: newTopic.parent_topic_id,
                    freshness: newTopic.freshness,
                    metadata: newTopic.metadata as Json,
                    user_id: userId
                }
            );

            if (!topicResult.success || !topicResult.data) {
                throw new Error(topicResult.error || 'Topic creation verification failed');
            }

            // 2. Map Inventory to new Topic via strategy table
            const stratResult = await upsertStrategy(inventoryId, {
                mapped_topic_id: newTopic.id,
                action: 'REWRITE',
                status: 'GAP_ANALYSIS',
            });

            if (!stratResult.success) {
                throw new Error(stratResult.error || 'Inventory link to strategy failed');
            }

            // 3. Update State
            dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: sanitizeTopicFromDb(topicResult.data) } });
            dispatch({ type: 'SET_NOTIFICATION', payload: `Promoted "${cleanTitle}" to Core Topic.` });
            refreshInventory();

        } catch (e) {
            console.error("Promotion failed:", e);
            dispatch({ type: 'SET_ERROR', payload: `${e instanceof Error ? e.message : "Failed to promote topic."}` });
        }
    };

    return {
        inventory,
        isLoadingInventory,
        refreshInventory,
        updateAction,
        updateStatus,
        markOptimized,
        mapInventoryItem,
        promoteToCore,
        upsertStrategy,
    };
};
