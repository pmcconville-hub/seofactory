
import React, { useState, useCallback, useEffect } from 'react';
import { SiteInventoryItem, ActionType, TransitionStatus, BusinessInfo, EnrichedTopic, FreshnessProfile } from '../types';
import { getSupabaseClient } from '../services/supabaseClient';
import { sanitizeInventoryFromDb, sanitizeTopicFromDb } from '../utils/parsers';
import { AppAction } from '../state/appState';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../utils/helpers';
import type { Json } from '../database.types';
import { verifiedUpdate, verifiedInsert } from '../services/verifiedDatabaseService';

export const useInventoryOperations = (
    activeProjectId: string | null,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>,
    activeMapId?: string | null,
    userId?: string
) => {
    const [inventory, setInventory] = useState<SiteInventoryItem[]>([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);

    const refreshInventory = useCallback(async () => {
        if (!activeProjectId) return;
        
        setIsLoadingInventory(true);
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const { data, error } = await supabase
                .from('site_inventory')
                .select('*')
                .eq('project_id', activeProjectId)
                .order('gsc_clicks', { ascending: false });
            
            if (error) throw error;
            
            const sanitized = (data || []).map(sanitizeInventoryFromDb);
            setInventory(sanitized);
        } catch (e) {
            console.error("Failed to fetch inventory:", e);
            dispatch({ type: 'SET_ERROR', payload: "Failed to load inventory." });
        } finally {
            setIsLoadingInventory(false);
        }
    }, [activeProjectId, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, dispatch]);

    // Initial fetch
    useEffect(() => {
        refreshInventory();
    }, [refreshInventory]);

    const updateAction = async (itemId: string, action: ActionType) => {
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // Use verified update with read-back verification
            const result = await verifiedUpdate(
                supabase,
                { table: 'site_inventory', operationDescription: `update action to ${action}` },
                itemId,
                {
                    action: action,
                    status: 'GAP_ANALYSIS',
                    updated_at: new Date().toISOString()
                }
            );

            if (!result.success) {
                throw new Error(result.error || 'Action update verification failed');
            }

            dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Updated action to: ${action}` });
            refreshInventory();
        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: `❌ ${e instanceof Error ? e.message : "Failed to update action."}` });
        }
    };

    const updateStatus = async (itemId: string, newStatus: TransitionStatus) => {
        // Optimistic update
        setInventory(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i));
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // Use verified update with read-back verification
            const result = await verifiedUpdate(
                supabase,
                { table: 'site_inventory', operationDescription: `update status to ${newStatus}` },
                itemId,
                { status: newStatus }
            );

            if (!result.success) {
                throw new Error(result.error || 'Status update verification failed');
            }
        } catch (e) {
            console.error("Status update failed:", e);
            dispatch({ type: 'SET_ERROR', payload: `❌ ${e instanceof Error ? e.message : "Failed to update status."}` });
            refreshInventory(); // Revert on error
        }
    };

    const markOptimized = async (itemId: string) => {
        await updateStatus(itemId, 'OPTIMIZED');
        dispatch({ type: 'SET_NOTIFICATION', payload: "Marked as Optimized." });
    };

    const mapInventoryItem = async (inventoryId: string, topicId: string, action: ActionType) => {
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // Use verified update with read-back verification
            const result = await verifiedUpdate(
                supabase,
                { table: 'site_inventory', operationDescription: `map inventory to topic with ${action}` },
                inventoryId,
                {
                    mapped_topic_id: topicId,
                    action: action,
                    status: 'GAP_ANALYSIS', // Move to next stage
                    updated_at: new Date().toISOString()
                }
            );

            if (!result.success) {
                throw new Error(result.error || 'Inventory mapping verification failed');
            }

            dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Mapped inventory to topic with strategy: ${action}` });
            refreshInventory();

        } catch (e) {
            console.error("Mapping failed:", e);
            dispatch({ type: 'SET_ERROR', payload: `❌ ${e instanceof Error ? e.message : "Failed to map inventory item."}` });
        }
    };

    const promoteToCore = async (inventoryId: string) => {
        if (!activeMapId || !userId) {
            dispatch({ type: 'SET_ERROR', payload: "Cannot promote: No active map or user session." });
            return;
        }

        const item = inventory.find(i => i.id === inventoryId);
        if (!item) return;

        // Derive a clean title from the URL or Title
        // e.g. "https://site.com/blog/ultimate-guide-seo" -> "Ultimate Guide Seo"
        let cleanTitle = item.title || item.url.split('/').pop()?.replace(/-/g, ' ') || 'New Topic';
        // Capitalize first letter
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

            // 2. Map Inventory to new Topic with verification
            const mapResult = await verifiedUpdate(
                supabase,
                { table: 'site_inventory', operationDescription: 'link inventory to promoted topic' },
                inventoryId,
                {
                    mapped_topic_id: newTopic.id,
                    action: 'REWRITE', // Default strategy for promoted content is usually to rewrite/optimize it
                    status: 'GAP_ANALYSIS'
                }
            );

            if (!mapResult.success) {
                throw new Error(mapResult.error || 'Inventory link verification failed');
            }

            // 3. Update State
            dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: sanitizeTopicFromDb(topicResult.data) } });
            dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Promoted "${cleanTitle}" to Core Topic (verified).` });
            refreshInventory();

        } catch (e) {
            console.error("Promotion failed:", e);
            dispatch({ type: 'SET_ERROR', payload: `❌ ${e instanceof Error ? e.message : "Failed to promote topic."}` });
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
        promoteToCore
    };
};
