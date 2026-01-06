
// components/ProjectWorkspace.tsx
import React from 'react';
import { useAppState } from '../state/appState';
import { AppStep, SEOPillars, SemanticTriple, TopicalMap, BusinessInfo, EnrichedTopic, FreshnessProfile, NAPData } from '../types';
import BusinessInfoForm from './BusinessInfoForm';
import {
  PillarDefinitionWizard,
  EavDiscoveryWizard,
  CompetitorRefinementWizard,
  WebsiteBlueprintWizard,
  type BlueprintConfig,
} from './wizards';
import ProjectDashboardContainer from './ProjectDashboardContainer';
import { getSupabaseClient } from '../services/supabaseClient';
import { verifiedBulkInsert, verifiedDelete, verifiedBulkDelete } from '../services/verifiedDatabaseService';
import * as aiService from '../services/aiService';
import * as foundationPagesService from '../services/ai/foundationPages';
import { v4 as uuidv4 } from 'uuid';
import { slugify, cleanSlug } from '../utils/helpers';
import { sanitizeTopicFromDb } from '../utils/parsers';

const ProjectWorkspace: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { appStep, activeMapId, businessInfo } = state;

    const handleBackToDashboard = () => dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_DASHBOARD });
    const handleBackToProjectSelection = () => {
        dispatch({ type: 'SET_ACTIVE_PROJECT', payload: null });
        dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION });
    };

    const handleSaveBusinessInfo = async (formData: Partial<BusinessInfo>) => {
        if (!activeMapId) return;

        // Whitelist strategic fields to be saved with the map.
        // This prevents sensitive data like API keys from being saved in the map's JSON.
        // Include brandKit and authorProfile for content generation context.
        const strategicInfo: Partial<BusinessInfo> = {
            // Core business context
            seedKeyword: formData.seedKeyword,
            industry: formData.industry,
            valueProp: formData.valueProp,
            audience: formData.audience,
            language: formData.language,
            targetMarket: formData.targetMarket,
            // AI provider settings
            aiProvider: formData.aiProvider,
            aiModel: formData.aiModel,
            // Brand kit for content/image generation
            brandKit: formData.brandKit,
            // Author profile for E-E-A-T signals
            authorProfile: formData.authorProfile,
            // Domain info
            domain: formData.domain,
            projectName: formData.projectName,
        };

        dispatch({ type: 'UPDATE_MAP_DATA', payload: { mapId: activeMapId, data: { business_info: strategicInfo } } });
        dispatch({ type: 'SET_STEP', payload: AppStep.PILLAR_WIZARD });
    };

    const handleFinalizePillars = (pillars: SEOPillars) => {
        if (!activeMapId) return;
        dispatch({ type: 'SET_PILLARS', payload: { mapId: activeMapId, pillars } });
        dispatch({ type: 'SET_STEP', payload: AppStep.EAV_WIZARD });
    };

    const handleFinalizeEavs = (eavs: SemanticTriple[]) => {
        if (!activeMapId) return;
        dispatch({ type: 'SET_EAVS', payload: { mapId: activeMapId, eavs } });
        dispatch({ type: 'SET_STEP', payload: AppStep.COMPETITOR_WIZARD });
    };
    
    const handleFinalizeCompetitors = async (competitors: string[]) => {
        if (!activeMapId) return;
        dispatch({ type: 'SET_COMPETITORS', payload: { mapId: activeMapId, competitors } });
        // Move to Blueprint Wizard instead of directly generating map
        dispatch({ type: 'SET_STEP', payload: AppStep.BLUEPRINT_WIZARD });
    };

    // Blueprint wizard completion - generates the map with blueprint config
    const handleFinalizeBlueprint = async (blueprintConfig: BlueprintConfig) => {
        console.log('=== handleFinalizeBlueprint START ===');
        console.log('blueprintConfig:', blueprintConfig);
        console.log('activeMapId:', activeMapId);
        console.log('state.user:', state.user);

        if (!activeMapId) {
            console.error('No activeMapId - cannot proceed');
            dispatch({ type: 'SET_ERROR', payload: "No active map selected." });
            return;
        }
        const user = state.user;

        if (!user) {
             console.error('No user - cannot proceed');
             dispatch({ type: 'SET_ERROR', payload: "User not authenticated. Cannot save map." });
             return;
        }

        console.log('Dispatching SET_NAP_DATA...');
        // Store blueprint config in state for later use
        dispatch({ type: 'SET_NAP_DATA', payload: blueprintConfig.napData });

        // Continue with map generation
        console.log('Calling generateMapWithBlueprint...');
        try {
            await generateMapWithBlueprint(blueprintConfig);
            console.log('=== handleFinalizeBlueprint SUCCESS ===');
        } catch (e) {
            console.error('Error in generateMapWithBlueprint:', e);
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to generate map.' });
        }
    };

    // Skip blueprint - generate map without blueprint config
    const handleSkipBlueprint = async () => {
        await generateMapWithBlueprint(undefined);
    };

    // Shared map generation logic
    const generateMapWithBlueprint = async (blueprintConfig?: BlueprintConfig) => {
        console.log('=== generateMapWithBlueprint START ===');
        console.log('activeMapId:', activeMapId);

        if (!activeMapId) {
            console.error('No activeMapId in generateMapWithBlueprint');
            return;
        }
        const user = state.user;

        if (!user) {
             console.error('No user in generateMapWithBlueprint');
             dispatch({ type: 'SET_ERROR', payload: "User not authenticated. Cannot save map." });
             return;
        }

        console.log('Setting loading state...');
        dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true } });
        try {
            console.log('Getting supabase client...');
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            console.log('Finding current map in state.topicalMaps:', state.topicalMaps.length, 'maps');
            const currentMap = state.topicalMaps.find(m => m.id === activeMapId);
            console.log('Found currentMap:', currentMap ? 'yes' : 'no');
            if (!currentMap) throw new Error("Active map not found in state");

            console.log('currentMap.pillars:', currentMap.pillars);
            console.log('currentMap.eavs:', currentMap.eavs);
            console.log('currentMap.competitors:', currentMap.competitors);

            // 1. Save Wizard Data
            console.log('Step 1: Saving wizard data to DB...');

            // Verify auth session before making the request
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData?.session) {
                console.error('Auth session error:', sessionError || 'No active session');
                throw new Error('Authentication session expired. Please refresh the page and try again.');
            }
            console.log('Step 1a: Auth session verified, user:', sessionData.session.user?.id);

            // Log data sizes for debugging
            const eavCount = currentMap.eavs?.length || 0;
            const competitorCount = currentMap.competitors?.length || 0;
            console.log(`Step 1b: Data sizes - EAVs: ${eavCount}, Competitors: ${competitorCount}`);

            // Add timeout to prevent hanging indefinitely
            const updatePromise = supabase
                .from('topical_maps')
                .update({
                    business_info: currentMap.business_info as any,
                    pillars: currentMap.pillars as any,
                    eavs: currentMap.eavs as any,
                    competitors: currentMap.competitors,
                })
                .eq('id', activeMapId);

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Database update timed out after 30 seconds')), 30000)
            );

            console.log('Step 1c: Executing update...');
            const { error: updateError } = await Promise.race([updatePromise, timeoutPromise]) as any;

            if (updateError) {
                console.error('DB update error:', updateError);
                throw updateError;
            }
            console.log('Step 1 complete: Wizard data saved');

            // 2. Generate Initial Topics with AI
            // Use effective business info (global keys + map strategy)
            // AI settings ALWAYS from global user_settings, not map's business_info
            const mapBusinessInfo = currentMap.business_info as Partial<BusinessInfo> || {};
            const { aiProvider: _ap, aiModel: _am, geminiApiKey: _g, openAiApiKey: _o, anthropicApiKey: _a, perplexityApiKey: _p, openRouterApiKey: _or, ...mapBusinessContext } = mapBusinessInfo;
            const effectiveBusinessInfo = {
                ...state.businessInfo,
                ...mapBusinessContext,
                // AI settings ALWAYS from global
                aiProvider: state.businessInfo.aiProvider,
                aiModel: state.businessInfo.aiModel,
            };
            console.log('effectiveBusinessInfo.aiProvider:', effectiveBusinessInfo.aiProvider);

            // NOTE: If pillars are missing here (shouldn't happen if flow is followed), we might want to throw.
            if (!currentMap.pillars || !currentMap.eavs) {
                console.error('Missing pillars or eavs:', { pillars: currentMap.pillars, eavs: currentMap.eavs });
                throw new Error("Missing pillars or EAVs for generation.");
            }

            console.log('Step 2: Generating initial topical map with AI...');

            const { coreTopics, outerTopics } = await aiService.generateInitialTopicalMap(
                effectiveBusinessInfo,
                currentMap.pillars,
                currentMap.eavs,
                currentMap.competitors || [],
                dispatch
            );

            // 3. Process and ID assignment
            const topicMap = new Map<string, string>(); // Maps temp ID (e.g. "core_1") to real UUID
            const finalTopics: EnrichedTopic[] = [];

            // Helper to validate topic has required fields
            const isValidTopic = (t: any): boolean => t && t.title && typeof t.title === 'string' && t.title.trim().length > 0;

            // Process Core Topics first (filter out invalid ones)
            coreTopics.filter(isValidTopic).forEach(core => {
                const realId = uuidv4();
                topicMap.set(core.id, realId); // Store mapping

                finalTopics.push({
                    ...core,
                    id: realId,
                    map_id: activeMapId,
                    slug: slugify(core.title),
                    parent_topic_id: null,
                    type: 'core',
                    freshness: core.freshness || FreshnessProfile.EVERGREEN
                } as EnrichedTopic);
            });

            // Process Outer Topics (filter out invalid ones)
            outerTopics.filter(isValidTopic).forEach(outer => {
                const parentRealId = outer.parent_topic_id ? topicMap.get(outer.parent_topic_id) : null;
                const parentTopic = finalTopics.find(t => t.id === parentRealId);
                const parentSlug = parentTopic ? parentTopic.slug : '';

                finalTopics.push({
                    ...outer,
                    id: uuidv4(),
                    map_id: activeMapId,
                    slug: `${parentSlug}/${cleanSlug(parentSlug, outer.title)}`.replace(/^\//, ''), // Use Clean Slug Logic
                    parent_topic_id: parentRealId || null,
                    type: 'outer',
                    freshness: outer.freshness || FreshnessProfile.STANDARD
                } as EnrichedTopic);
            });

            // 4. Save Topics to DB
            // Filter out any malformed topics (missing title) to prevent DB constraint violations
            const validTopics = finalTopics.filter(t => t.title && typeof t.title === 'string' && t.title.trim().length > 0);

            if (validTopics.length < finalTopics.length) {
                const skippedCount = finalTopics.length - validTopics.length;
                console.warn(`[MapGeneration] Filtered out ${skippedCount} malformed topics (missing title)`);
                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'MapGeneration',
                    message: `Warning: ${skippedCount} topics were skipped due to missing titles`,
                    status: 'warning',
                    timestamp: Date.now()
                }});
            }

            const dbTopics = validTopics.map(t => ({
                id: t.id,
                map_id: t.map_id,
                user_id: user.id,
                parent_topic_id: t.parent_topic_id,
                title: t.title,
                slug: t.slug,
                description: t.description,
                type: t.type,
                freshness: t.freshness,
                // New metadata field for Holistic SEO attributes
                metadata: {
                    topic_class: t.topic_class || 'informational',
                    cluster_role: t.cluster_role,
                    attribute_focus: t.attribute_focus,
                    canonical_query: t.canonical_query,
                    decay_score: t.decay_score
                }
            }));

            if (dbTopics.length > 0) {
                // Log topic_class distribution for debugging
                const monetizationCount = finalTopics.filter(t => t.topic_class === 'monetization').length;
                const informationalCount = finalTopics.filter(t => t.topic_class === 'informational').length;
                const undefinedCount = finalTopics.filter(t => !t.topic_class).length;
                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'MapGeneration',
                    message: `Saving ${dbTopics.length} topics to DB. topic_class distribution: monetization=${monetizationCount}, informational=${informationalCount}, undefined=${undefinedCount}`,
                    status: 'info',
                    timestamp: Date.now()
                }});

                const insertResult = await verifiedBulkInsert(
                    supabase,
                    { table: 'topics', operationDescription: `insert ${dbTopics.length} generated topics` },
                    dbTopics,
                    'id'
                );

                if (!insertResult.success) {
                    throw new Error(insertResult.error || 'Topics insert verification failed');
                }

                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'MapGeneration',
                    message: `✓ Verified ${insertResult.data?.length || 0} topics saved to database`,
                    status: 'success',
                    timestamp: Date.now()
                }});
            }

            // 5. Update State
            // NOTE: We use validTopics (filtered) to ensure state matches what was saved to DB.
            // Using sanitizeTopicFromDb might accidentally strip the 'metadata' properties.
            dispatch({ type: 'SET_TOPICS_FOR_MAP', payload: { mapId: activeMapId, topics: validTopics } });

            // 6. Generate Foundation Pages (non-blocking)
            try {
                // Get selected pages from blueprint config, default to standard 5 pages
                const selectedPages = blueprintConfig?.selectedPages || ['homepage', 'about', 'contact', 'privacy', 'terms'];
                const napData = blueprintConfig?.napData;

                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'FoundationPages',
                    message: `Generating ${selectedPages.length} foundation pages...`,
                    status: 'info',
                    timestamp: Date.now()
                }});

                const foundationResult = await foundationPagesService.generateFoundationPages(
                    effectiveBusinessInfo,
                    currentMap.pillars,
                    dispatch,
                    selectedPages // Pass selected pages to filter generation
                );

                const pagesToSave = foundationPagesService.prepareFoundationPagesForSave(
                    foundationResult,
                    activeMapId,
                    user.id,
                    napData // Pass NAP data from blueprint wizard
                );

                const savedPages = await foundationPagesService.saveFoundationPages(
                    activeMapId,
                    user.id,
                    pagesToSave,
                    effectiveBusinessInfo.supabaseUrl,
                    effectiveBusinessInfo.supabaseAnonKey
                );

                // Generate navigation structure based on foundation pages and core topics
                const coreTopicsForNav = finalTopics.filter(t => t.type === 'core');
                const navigation = await foundationPagesService.generateDefaultNavigation(
                    savedPages,
                    coreTopicsForNav,
                    effectiveBusinessInfo,
                    dispatch
                );

                const savedNavigation = await foundationPagesService.saveNavigationStructure(
                    activeMapId,
                    user.id,
                    { ...navigation, map_id: activeMapId }
                );

                // Update state with foundation pages and navigation
                dispatch({ type: 'SET_FOUNDATION_PAGES', payload: savedPages });
                dispatch({ type: 'SET_NAVIGATION', payload: savedNavigation });

                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'FoundationPages',
                    message: `Generated ${savedPages.length} foundation pages and navigation structure`,
                    status: 'success',
                    timestamp: Date.now()
                }});
            } catch (foundationError) {
                // Foundation page generation is non-blocking - log error but continue
                console.error('Foundation page generation failed:', foundationError);
                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'FoundationPages',
                    message: `Foundation page generation failed: ${foundationError instanceof Error ? foundationError.message : 'Unknown error'}`,
                    status: 'failure',
                    timestamp: Date.now()
                }});
            }

            // 7. Redirect
            dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_DASHBOARD });

        } catch (e) {
            console.error("Map Generation Error:", e);
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to save map settings or generate topics."});
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: false } });
        }
    };

    const handleInitiateDeleteMap = (map: TopicalMap) => {
        dispatch({
            type: 'SHOW_CONFIRMATION',
            payload: {
                title: 'Delete Topical Map?',
                message: `Are you sure you want to permanently delete the map "${map.name}"? This action cannot be undone.`,
                onConfirm: async () => {
                    try {
                        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

                        // Delete in order: briefs (by topic_id), topics, foundation_pages, navigation, then map
                        // Get topic IDs first - content_briefs uses topic_id, not map_id
                        const { data: topics } = await supabase.from('topics').select('id').eq('map_id', map.id);
                        const topicIds = (topics || []).map(t => t.id);

                        // Delete content_briefs by topic_id (cascade)
                        if (topicIds.length > 0) {
                            const briefsResult = await verifiedBulkDelete(
                                supabase,
                                { table: 'content_briefs', operationDescription: `delete briefs for map ${map.id}` },
                                { column: 'topic_id', operator: 'in', value: topicIds }
                            );
                            if (!briefsResult.success) {
                                console.warn(`[DeleteMap] Content briefs deletion issue:`, briefsResult.error);
                            }
                        }

                        // Delete topics - verified
                        if (topicIds.length > 0) {
                            const topicsResult = await verifiedBulkDelete(
                                supabase,
                                { table: 'topics', operationDescription: `delete topics for map ${map.id}` },
                                { column: 'map_id', operator: 'eq', value: map.id },
                                topicIds.length
                            );
                            if (!topicsResult.success) {
                                console.warn(`[DeleteMap] Topics deletion issue:`, topicsResult.error);
                            }
                        }

                        // Delete foundation pages and navigation (optional - may not exist)
                        const foundationResult = await verifiedBulkDelete(
                            supabase,
                            { table: 'foundation_pages', operationDescription: `delete foundation pages for map ${map.id}` },
                            { column: 'map_id', operator: 'eq', value: map.id }
                        );
                        if (!foundationResult.success && foundationResult.error && !foundationResult.error.includes('0 records')) {
                            console.warn(`[DeleteMap] Foundation pages deletion issue:`, foundationResult.error);
                        }

                        const navStructResult = await verifiedBulkDelete(
                            supabase,
                            { table: 'navigation_structures', operationDescription: `delete navigation structures for map ${map.id}` },
                            { column: 'map_id', operator: 'eq', value: map.id }
                        );
                        if (!navStructResult.success && navStructResult.error && !navStructResult.error.includes('0 records')) {
                            console.warn(`[DeleteMap] Navigation structures deletion issue:`, navStructResult.error);
                        }

                        const navSyncResult = await verifiedBulkDelete(
                            supabase,
                            { table: 'navigation_sync_status', operationDescription: `delete navigation sync status for map ${map.id}` },
                            { column: 'map_id', operator: 'eq', value: map.id }
                        );
                        if (!navSyncResult.success && navSyncResult.error && !navSyncResult.error.includes('0 records')) {
                            console.warn(`[DeleteMap] Navigation sync status deletion issue:`, navSyncResult.error);
                        }

                        // Delete the map itself - verified
                        const mapResult = await verifiedDelete(
                            supabase,
                            { table: 'topical_maps', operationDescription: `delete map "${map.name}"` },
                            { column: 'id', value: map.id }
                        );
                        if (!mapResult.success) {
                            throw new Error(mapResult.error || 'Map deletion verification failed');
                        }

                        dispatch({ type: 'DELETE_TOPICAL_MAP', payload: { mapId: map.id } });
                        dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Map "${map.name}" deleted (verified).` });
                    } catch (e) {
                        console.error('Delete map error:', e);
                        dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to delete map.' });
                    } finally {
                        dispatch({ type: 'HIDE_CONFIRMATION' });
                    }
                }
            }
        });
    };

    switch (appStep) {
        case AppStep.BUSINESS_INFO:
            return <BusinessInfoForm 
                        onSave={handleSaveBusinessInfo} 
                        onBack={handleBackToDashboard} 
                        isLoading={!!state.isLoading.map} 
                   />;
        case AppStep.PILLAR_WIZARD:
            return <PillarDefinitionWizard 
                        onFinalize={handleFinalizePillars} 
                        onBack={() => dispatch({ type: 'SET_STEP', payload: AppStep.BUSINESS_INFO })} 
                   />;
        case AppStep.EAV_WIZARD:
            return <EavDiscoveryWizard 
                        onFinalize={handleFinalizeEavs} 
                        onBack={() => dispatch({ type: 'SET_STEP', payload: AppStep.PILLAR_WIZARD })} 
                   />;
        case AppStep.COMPETITOR_WIZARD:
            return <CompetitorRefinementWizard
                        onFinalize={handleFinalizeCompetitors}
                        onBack={() => dispatch({ type: 'SET_STEP', payload: AppStep.EAV_WIZARD })}
                    />;
        case AppStep.BLUEPRINT_WIZARD: {
            const currentMap = state.topicalMaps.find(m => m.id === activeMapId);
            // AI settings ALWAYS from global user_settings, not map's business_info
            const mapBusinessInfo = currentMap?.business_info as Partial<BusinessInfo> || {};
            const { aiProvider: _ap, aiModel: _am, geminiApiKey: _g, openAiApiKey: _o, anthropicApiKey: _a, perplexityApiKey: _p, openRouterApiKey: _or, ...mapBusinessContext } = mapBusinessInfo;
            const effectiveBusinessInfo = {
                ...state.businessInfo,
                ...mapBusinessContext,
                // AI settings ALWAYS from global
                aiProvider: state.businessInfo.aiProvider,
                aiModel: state.businessInfo.aiModel,
            };
            return <WebsiteBlueprintWizard
                        businessInfo={effectiveBusinessInfo}
                        pillars={currentMap?.pillars}
                        existingNAPData={state.websiteStructure?.napData}
                        isLoading={!!state.isLoading.map}
                        onComplete={handleFinalizeBlueprint}
                        onSkip={handleSkipBlueprint}
                        onBack={() => dispatch({ type: 'SET_STEP', payload: AppStep.COMPETITOR_WIZARD })}
                    />;
        }
        case AppStep.PROJECT_DASHBOARD:
        case AppStep.PROJECT_WORKSPACE: // Default to dashboard
        default:
            return <ProjectDashboardContainer 
                        onInitiateDeleteMap={handleInitiateDeleteMap}
                        onBackToProjects={handleBackToProjectSelection}
                    />;
    }
};

export default ProjectWorkspace;
