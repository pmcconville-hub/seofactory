
// components/ProjectDashboardContainer.tsx
import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useAppState } from '../state/appState';
import { AppStep, SEOPillars, EnrichedTopic, ContentBrief, BusinessInfo, TopicalMap, TopicRecommendation, ResponseCode, SemanticTriple, ExpansionMode, EnhancedSchemaResult } from '../types';
import { ContentGenerationOrchestrator } from '../services/ai/contentGeneration/orchestrator';
import { executePass9 } from '../services/ai/contentGeneration/passes/pass9SchemaGeneration';
import * as aiService from '../services/aiService';
import { getSupabaseClient } from '../services/supabaseClient';
import type { Json } from '../database.types';
import { v4 as uuidv4 } from 'uuid';
import { slugify, cleanSlug } from '../utils/helpers';
import { KnowledgeGraph } from '../lib/knowledgeGraph';
import { BatchProcessor } from '../services/batchProcessor';
import { useMapData } from '../hooks/useMapData';
import { useKnowledgeGraph } from '../hooks/useKnowledgeGraph';
import { useTopicEnrichment } from '../hooks/useTopicEnrichment';
import { useMapOperations } from '../hooks/useMapOperations';
import { useAnalysisOperations } from '../hooks/useAnalysisOperations';
import { useFoundationPageOperations } from '../hooks/useFoundationPageOperations';
import { sanitizeTopicFromDb } from '../utils/parsers';
import { generateMasterExport } from '../utils/exportUtils';
import { generateEnhancedExport, EnhancedExportInput } from '../utils/enhancedExportUtils';
import { verifiedInsert, verifiedBulkInsert, verifiedUpdate } from '../services/verifiedDatabaseService';

// Import Screens
import { MapSelectionScreen } from './screens';
import ProjectDashboard from './ProjectDashboard';
import MigrationDashboardContainer from './migration/MigrationDashboardContainer';
import { Loader } from './ui/Loader';
import { Button } from './ui/Button';
import DebugStatePanel from './ui/DebugStatePanel';
import AuditDashboard from './AuditDashboard';
import BulkGenerationSummary from './BulkGenerationSummary';
import BulkBriefProgress from './BulkBriefProgress';

// Modals
import {
  ExportSettingsModal,
  type ExportSettings,
  NewMapModal,
  BriefReviewModal,
  FlowAuditModal,
  ImprovementConfirmationModal,
} from './modals';
// UnifiedAudit and auditFixes imports moved to useAnalysisOperations hook

interface ProjectDashboardContainerProps {
  onInitiateDeleteMap: (map: TopicalMap) => void;
  onBackToProjects: () => void;
}

const ProjectDashboardContainer: React.FC<ProjectDashboardContainerProps> = ({ onInitiateDeleteMap, onBackToProjects }) => {
    const { state, dispatch } = useAppState();
    const {
        activeProjectId,
        activeMapId,
        topicalMaps,
        knowledgeGraph,
        businessInfo,
        modals,
        isLoading,
        viewMode,
        briefGenerationCurrent,
        briefGenerationTotal,
        briefGenerationStatus
    } = state;

    // Use a ref to track the latest state for long-running processes like batch generation
    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // Save operation locks to prevent concurrent saves that can hang
    // Using refs because we don't want to trigger re-renders on lock state changes
    const saveLocks = useRef<{ [key: string]: boolean }>({});

    // Export settings modal state
    const [showExportSettings, setShowExportSettings] = useState(false);

    // Bulk generation summary modal state
    const [showBulkSummary, setShowBulkSummary] = useState(false);

    // Improvement confirmation modal state
    const [showImprovementConfirmation, setShowImprovementConfirmation] = useState(false);
    const [pendingImprovementOptions, setPendingImprovementOptions] = useState<{ includeTypeReclassifications: boolean }>({ includeTypeReclassifications: true });
    const [isApplyingImprovement, setIsApplyingImprovement] = useState(false);

    const activeProject = useMemo(() => state.projects.find(p => p.id === activeProjectId), [state.projects, activeProjectId]);
    const activeMap = useMemo(() => topicalMaps.find(m => m.id === activeMapId), [topicalMaps, activeMapId]);
    
    const allTopics = useMemo(() => activeMap?.topics || [], [activeMap]);
    const briefs = useMemo(() => activeMap?.briefs || {}, [activeMap]);

    // REFACTOR 02: Use custom hook for data fetching
    useMapData(activeMapId, activeMap, businessInfo, dispatch);

    // REFACTOR 03: Use custom hook for KG hydration
    useKnowledgeGraph(activeMap, knowledgeGraph, dispatch);

    // Build effective business info: global settings + project domain + map overrides
    // Priority:
    //   - AI settings (provider, model, API keys): Always from global businessInfo
    //   - Domain/project: map.business_info > project > global
    //   - Business context: map.business_info > global
    const effectiveBusinessInfo = useMemo<BusinessInfo>(() => {
        const mapBusinessInfo = activeMap?.business_info as Partial<BusinessInfo> || {};

        // Extract map business context fields (NOT AI settings - those come from global)
        // This prevents stale map business_info.aiProvider from overriding user's current global settings
        const {
            aiProvider: _mapAiProvider,
            aiModel: _mapAiModel,
            geminiApiKey: _gk,
            openAiApiKey: _ok,
            anthropicApiKey: _ak,
            perplexityApiKey: _pk,
            openRouterApiKey: _ork,
            ...mapBusinessContext
        } = mapBusinessInfo;

        return {
            ...businessInfo,
            // Use project domain if map doesn't have one set
            domain: mapBusinessContext.domain || activeProject?.domain || businessInfo.domain,
            projectName: mapBusinessContext.projectName || activeProject?.project_name || businessInfo.projectName,
            // Spread map-specific business context (NOT AI settings)
            ...mapBusinessContext,
            // But ensure domain is always from project if map didn't override it
            ...(mapBusinessContext.domain ? {} : { domain: activeProject?.domain || businessInfo.domain }),
            // AI settings ALWAYS from global (user_settings), not from map's business_info
            aiProvider: businessInfo.aiProvider,
            aiModel: businessInfo.aiModel,
            geminiApiKey: businessInfo.geminiApiKey,
            openAiApiKey: businessInfo.openAiApiKey,
            anthropicApiKey: businessInfo.anthropicApiKey,
            perplexityApiKey: businessInfo.perplexityApiKey,
            openRouterApiKey: businessInfo.openRouterApiKey,
        };
    }, [businessInfo, activeMap, activeProject]);
    
    // REFACTOR 04: Use custom hook for map operations
    const {
        handleSelectMap,
        handleCreateNewMap,
        handleGenerateInitialMap,
        onSavePillars,
        onConfirmPillarChange,
        handleRegenerateMap,
        handleUpdateEavs,
        handleUpdateCompetitors,
    } = useMapOperations({
        activeProjectId,
        activeMapId,
        activeMap,
        effectiveBusinessInfo,
        businessInfo,
        user: state.user,
        dispatch,
        saveLocks,
    });

    // REFACTOR 03 & Task 05: Use custom hook for Enrichment & Blueprints
    const { handleEnrichData, isEnriching, handleGenerateBlueprints, isGeneratingBlueprints } = useTopicEnrichment(
        activeMapId,
        effectiveBusinessInfo,
        allTopics,
        activeMap?.pillars as SEOPillars | undefined,
        dispatch,
        activeMap?.eavs as SemanticTriple[] | undefined // Pass EAVs for semantic matching
    );

    const canGenerateBriefs = useMemo(() => {
        const hasPillars = !!activeMap?.pillars;
        const hasKg = !!knowledgeGraph;
        return hasPillars && hasKg;
    }, [activeMap?.pillars, knowledgeGraph]);

    const canExpandTopics = useMemo(() => !!(activeMap?.pillars && knowledgeGraph), [activeMap, knowledgeGraph]);

    // REFACTOR 04.2: Use custom hook for analysis operations
    const {
        saveAnalysisState,
        onAnalyzeKnowledgeDomain,
        handleExpandKnowledgeDomain,
        onValidateMap,
        onFindMergeOpportunities,
        onAnalyzeSemanticRelationships,
        onAnalyzeContextualCoverage,
        onAuditInternalLinking,
        onCalculateTopicalAuthority,
        onGeneratePublicationPlan,
        onRunUnifiedAudit,
        handleApplyUnifiedFix,
        handleApplyAllUnifiedFixes,
        onImproveMap,
        onApplyImprovement,
        onExecuteMerge,
        handleAnalyzeGsc,
        onAuditDraft,
        handleAutoFix,
        handleAnalyzeFlow,
        handleFlowAutoFix,
        handleBatchFlowAutoFix,
    } = useAnalysisOperations({
        activeMapId,
        activeMap,
        effectiveBusinessInfo,
        businessInfo,
        knowledgeGraph,
        allTopics,
        briefs,
        dispatch,
        user: state.user,
        websiteStructure: state.websiteStructure,
        unifiedAudit: state.unifiedAudit,
        activeBriefTopic: state.activeBriefTopic,
        improvementLog: state.improvementLog,
        topicalMaps: state.topicalMaps,
        setShowImprovementConfirmation,
        setIsApplyingImprovement,
        pendingImprovementOptions,
        setPendingImprovementOptions,
    });

    // REFACTOR 04.3: Use custom hook for foundation page operations
    const {
        foundationPages,
        napData,
        navigation,
        handleSaveNAPData,
        handleUpdateFoundationPage,
        handleDeleteFoundationPage,
        handleRestoreFoundationPage,
        handleSaveNavigation,
        handleSaveBusinessInfo,
        handleSaveBrandKit,
        handleGenerateMissingFoundationPages,
        handleRepairFoundation,
        handleRepairNavigation,
        handleRepairBriefs,
    } = useFoundationPageOperations({
        activeMapId,
        activeMap,
        effectiveBusinessInfo,
        businessInfo,
        user: state.user,
        dispatch,
        allTopics,
        websiteStructure: state.websiteStructure,
    });


    const handleStartAnalysis = async () => {
        if (!activeProjectId) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'analysis', value: true } });
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const { error } = await supabase.functions.invoke('start-website-analysis', {
                body: { project_id: activeProjectId },
            });
            if (error) throw error;
            dispatch({ type: 'SET_STEP', payload: AppStep.ANALYSIS_STATUS });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to start analysis.';
            dispatch({ type: 'SET_ERROR', payload: message });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'analysis', value: false } });
        }
    };

    // onAnalyzeKnowledgeDomain and handleExpandKnowledgeDomain moved to useAnalysisOperations

    const onGenerateBrief = useCallback(async (topic: EnrichedTopic, responseCode: ResponseCode, overrideSettings?: { provider: string, model: string }) => {
        const safeKG = knowledgeGraph || new KnowledgeGraph();

        if (!topic || !activeMap || !activeMap.pillars) {
            dispatch({ type: 'SET_ERROR', payload: "Cannot generate brief: critical context is missing." });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'briefs', value: true } });
        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'responseCode', visible: false } });
        // Set status for pulsing indicator on topic
        dispatch({ type: 'SET_BRIEF_GENERATION_STATUS', payload: `Generating brief: "${topic.title}"` });

        const configToUse = overrideSettings
            ? { ...effectiveBusinessInfo, aiProvider: overrideSettings.provider as any, aiModel: overrideSettings.model }
            : effectiveBusinessInfo;

        try {
            const briefData = await aiService.generateContentBrief(configToUse, topic, allTopics, activeMap.pillars, safeKG, responseCode, dispatch, undefined, activeMap.eavs || []);

            // MERGE STRATEGY: Fix "Untitled Topic" Bug
            const newBrief: ContentBrief = {
                ...briefData,
                id: uuidv4(),
                topic_id: topic.id,
                title: topic.title // FORCE the known title from the topic object
            };

            // Decoupled workflow: Set result in temp state and open review modal
            dispatch({ type: 'SET_BRIEF_GENERATION_RESULT', payload: newBrief });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'briefReview', visible: true } });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to generate brief.';
            dispatch({ type: 'SET_ERROR', payload: message });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'briefs', value: false } });
            dispatch({ type: 'SET_BRIEF_GENERATION_STATUS', payload: null }); // Clear status
        }
    }, [activeMap, knowledgeGraph, dispatch, effectiveBusinessInfo, allTopics]);

    const onGenerateAllBriefs = useCallback(async () => {
        const processor = new BatchProcessor(dispatch, () => stateRef.current);
        await processor.generateAllBriefs(allTopics);
        // Show bulk generation summary modal after completion
        setShowBulkSummary(true);
    }, [dispatch, allTopics]);

    const onCancelBriefGeneration = useCallback(() => {
        dispatch({ type: 'CANCEL_BRIEF_GENERATION' });
    }, [dispatch]);

    const onAddTopic = useCallback(async (topicData: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>, placement: 'ai' | 'root' | string, overrideSettings?: { provider: string, model: string }) => {
        if (!activeMapId) return;
        const user = state.user;
        if (!user) {
             dispatch({ type: 'SET_ERROR', payload: 'User session required.' });
             return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'addTopic', value: true } });
        const configToUse = overrideSettings 
            ? { ...effectiveBusinessInfo, aiProvider: overrideSettings.provider as any, aiModel: overrideSettings.model }
            : effectiveBusinessInfo;

        try {
            let parentId = null;
            let type = topicData.type;

            if (placement === 'ai') {
                const result = await aiService.addTopicIntelligently(topicData.title, topicData.description || '', allTopics, configToUse, dispatch);
                parentId = result.parentTopicId;
                type = result.type;
            } else if (placement !== 'root') {
                parentId = placement;
            }
            
            const parentSlug = allTopics.find(t => t.id === parentId)?.slug || '';
            const newTopic: EnrichedTopic = {
                ...topicData,
                id: uuidv4(),
                map_id: activeMapId,
                slug: `${parentSlug}/${cleanSlug(parentSlug, topicData.title)}`.replace(/^\//, ''), // Use Clean Slug
                parent_topic_id: parentId,
                type: type,
            };
            
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // Use verified insert to ensure topic is saved
            const insertResult = await verifiedInsert(
                supabase,
                { table: 'topics', operationDescription: `add topic "${newTopic.title}"` },
                {
                    id: newTopic.id,
                    map_id: newTopic.map_id,
                    title: newTopic.title,
                    slug: newTopic.slug,
                    description: newTopic.description,
                    type: newTopic.type,
                    parent_topic_id: newTopic.parent_topic_id,
                    freshness: newTopic.freshness,
                    metadata: (newTopic.metadata || {}) as Json,
                    user_id: user.id
                }
            );

            if (!insertResult.success || !insertResult.data) {
                throw new Error(insertResult.error || 'Topic insert verification failed');
            }

            const safeTopic = sanitizeTopicFromDb(insertResult.data);
            dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: safeTopic } });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'addTopic', visible: false } });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to add topic.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'addTopic', value: false } });
        }
    }, [activeMapId, allTopics, effectiveBusinessInfo, dispatch, businessInfo, state.user]);

    // Batch add handler for AI-Assisted topic creation
    const onBulkAddTopics = useCallback(async (topics: {data: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>, placement: 'ai' | 'root' | string}[]) => {
        if (!activeMapId) return;
        const user = state.user;
        if (!user) {
             dispatch({ type: 'SET_ERROR', payload: 'User session required.' });
             return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'addTopic', value: true } });
        
        try {
            // Separate inputs into Core, Outer, and Child types
            const coreInputs = topics.filter(t => t.data.type === 'core');
            const outerInputs = topics.filter(t => t.data.type === 'outer');
            const childInputs = topics.filter(t => t.data.type === 'child');

            // Temp store for new topic IDs: Title -> UUID
            const newCoreIdMap = new Map<string, string>();
            const newOuterIdMap = new Map<string, string>();
            
            const coreTopicsToInsert: any[] = [];

            // --- PASS 1: Process & Insert Core Topics ---
            for (const input of coreInputs) {
                const newId = uuidv4();
                newCoreIdMap.set(input.data.title, newId);
                
                coreTopicsToInsert.push({
                    id: newId,
                    map_id: activeMapId,
                    title: input.data.title,
                    slug: slugify(input.data.title),
                    description: input.data.description || '',
                    parent_topic_id: null,
                    type: 'core',
                    freshness: input.data.freshness || 'EVERGREEN',
                    metadata: (input.data.metadata || {}) as Json,
                    user_id: user.id
                });
            }

            // Insert Core Topics First (to satisfy FK constraints for children)
            if (coreTopicsToInsert.length > 0) {
                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

                // Use verified bulk insert
                const coreResult = await verifiedBulkInsert(
                    supabase,
                    { table: 'topics', operationDescription: `save ${coreTopicsToInsert.length} core topics` },
                    coreTopicsToInsert,
                    'id'
                );

                if (!coreResult.success) {
                    throw new Error(coreResult.error || 'Core topic insert verification failed');
                }

                // Dispatch Core Topics immediately
                coreTopicsToInsert.forEach(topic => {
                    const safeTopic = sanitizeTopicFromDb(topic);
                    dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: safeTopic } });
                });
            }

            // --- PASS 2: Process & Insert Outer Topics ---
            const outerTopicsToInsert = await Promise.all(outerInputs.map(async ({ data: topicData, placement }) => {
                let parentId: string | null = null;
                let type = topicData.type;

                // Resolve Parent ID
                if (placement === 'ai') {
                    // Fallback to AI placement if no parent specified
                    const result = await aiService.addTopicIntelligently(topicData.title, topicData.description || '', allTopics, effectiveBusinessInfo, dispatch);
                    parentId = result.parentTopicId;
                    type = result.type;
                } else if (placement === 'root') {
                    parentId = null;
                } else if (newCoreIdMap.has(placement)) {
                    // It's a newly created Core topic from Pass 1
                    parentId = newCoreIdMap.get(placement) || null;
                } else {
                    // Check if it's an existing topic ID or Title
                    const existingTopic = allTopics.find(t => t.id === placement || t.title === placement);
                    if (existingTopic) {
                        parentId = existingTopic.id;
                    } else {
                        parentId = null;
                    }
                }
                
                // Resolve Slug
                let parentSlug = '';
                if (parentId) {
                    // Check new topics first
                    const newParent = coreTopicsToInsert.find(t => t.id === parentId);
                    if (newParent) {
                        parentSlug = newParent.slug;
                    } else {
                        // Check existing topics
                        const existingParent = allTopics.find(t => t.id === parentId);
                        if (existingParent) parentSlug = existingParent.slug;
                    }
                }

                return {
                    id: uuidv4(),
                    map_id: activeMapId,
                    title: topicData.title,
                    slug: `${parentSlug}/${cleanSlug(parentSlug, topicData.title)}`.replace(/^\//, ''),
                    description: topicData.description || '',
                    parent_topic_id: parentId,
                    type: type,
                    freshness: topicData.freshness || 'EVERGREEN',
                    metadata: (topicData.metadata || {}) as Json,
                    user_id: user.id
                };
            }));

            // Insert Outer Topics
            if (outerTopicsToInsert.length > 0) {
                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

                // Use verified bulk insert
                const outerResult = await verifiedBulkInsert(
                    supabase,
                    { table: 'topics', operationDescription: `save ${outerTopicsToInsert.length} outer topics` },
                    outerTopicsToInsert as any,
                    'id'
                );

                if (!outerResult.success) {
                    throw new Error(outerResult.error || 'Outer topic insert verification failed');
                }

                // Track outer topic IDs for child topic resolution & Dispatch Outer Topics
                outerTopicsToInsert.forEach(topic => {
                    newOuterIdMap.set(topic.title, topic.id);
                    const safeTopic = sanitizeTopicFromDb(topic);
                    dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: safeTopic } });
                });
            }

            // --- PASS 3: Process & Insert Child Topics ---
            const childTopicsToInsert = childInputs.map(({ data: topicData, placement }) => {
                let parentId: string | null = null;

                // Resolve Parent ID (should be an outer topic)
                if (placement && placement !== 'ai' && placement !== 'root') {
                    // Check if it's a newly created outer topic from Pass 2
                    if (newOuterIdMap.has(placement)) {
                        parentId = newOuterIdMap.get(placement) || null;
                    } else {
                        // Check if it's an existing topic ID or Title
                        const existingTopic = [...allTopics, ...outerTopicsToInsert].find(t => t.id === placement || t.title === placement);
                        if (existingTopic) {
                            parentId = existingTopic.id;
                        }
                    }
                }

                // Resolve Slug
                let parentSlug = '';
                if (parentId) {
                    const newParent = outerTopicsToInsert.find(t => t.id === parentId);
                    if (newParent) {
                        parentSlug = newParent.slug;
                    } else {
                        const existingParent = allTopics.find(t => t.id === parentId);
                        if (existingParent) parentSlug = existingParent.slug;
                    }
                }

                return {
                    id: uuidv4(),
                    map_id: activeMapId,
                    title: topicData.title,
                    slug: `${parentSlug}/${cleanSlug(parentSlug, topicData.title)}`.replace(/^\//, ''),
                    description: topicData.description || '',
                    parent_topic_id: parentId,
                    type: 'child' as const,
                    freshness: topicData.freshness || 'EVERGREEN',
                    metadata: (topicData.metadata || {}) as Json,
                    user_id: user.id
                };
            });

            // Insert Child Topics
            if (childTopicsToInsert.length > 0) {
                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

                // Use verified bulk insert
                const childResult = await verifiedBulkInsert(
                    supabase,
                    { table: 'topics', operationDescription: `save ${childTopicsToInsert.length} child topics` },
                    childTopicsToInsert as any,
                    'id'
                );

                if (!childResult.success) {
                    throw new Error(childResult.error || 'Child topic insert verification failed');
                }

                // Dispatch Child Topics
                childTopicsToInsert.forEach(topic => {
                    const safeTopic = sanitizeTopicFromDb(topic);
                    dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: safeTopic } });
                });
            }

            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'addTopic', visible: false } });
            dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Successfully added and verified ${coreTopicsToInsert.length + outerTopicsToInsert.length + childTopicsToInsert.length} new topics.` });

        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to add topics.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'addTopic', value: false } });
        }
    }, [activeMapId, allTopics, effectiveBusinessInfo, dispatch, businessInfo, state.user]);

    const handleOpenExpansionModal = useCallback((coreTopic: EnrichedTopic, mode: ExpansionMode) => {
        dispatch({ type: 'SET_ACTIVE_EXPANSION_TOPIC', payload: coreTopic });
        dispatch({ type: 'SET_ACTIVE_EXPANSION_MODE', payload: mode });
        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'topicExpansion', visible: true } });
    }, [dispatch]);

    const handleExpandCoreTopic = useCallback(async (coreTopic: EnrichedTopic, mode: ExpansionMode, userContext?: string, overrideSettings?: { provider: string, model: string }) => {
        const safeKG = knowledgeGraph || new KnowledgeGraph();
        if (!activeMapId || !activeMap?.pillars) return;
        const user = state.user;
        if (!user) return;
        
        const loadingKey = `expand_${coreTopic.id}`;
        dispatch({ type: 'SET_LOADING', payload: { key: loadingKey, value: true } });
        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'topicExpansion', visible: false } }); // Close modal immediately
        
        const configToUse = overrideSettings 
            ? { ...effectiveBusinessInfo, aiProvider: overrideSettings.provider as any, aiModel: overrideSettings.model }
            : effectiveBusinessInfo;

        try {
            const newTopicSuggestions = await aiService.expandCoreTopic(configToUse, activeMap.pillars, coreTopic, allTopics, safeKG, dispatch, mode, userContext);

            if (!newTopicSuggestions || newTopicSuggestions.length === 0) {
                dispatch({ type: 'SET_NOTIFICATION', payload: `No new topics generated for "${coreTopic.title}". The AI may not have found relevant expansions.` });
                return;
            }

            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const topicsToAdd = newTopicSuggestions.map(suggestion => ({
                id: uuidv4(),
                map_id: activeMapId,
                user_id: user.id,
                parent_topic_id: coreTopic.id,
                title: suggestion.title,
                slug: `${coreTopic.slug}/${cleanSlug(coreTopic.slug, suggestion.title)}`, // Use Clean Slug
                description: suggestion.description,
                type: 'outer' as 'core' | 'outer',
                freshness: 'STANDARD'
            }));

            // Use verified bulk insert
            const insertResult = await verifiedBulkInsert(
                supabase,
                { table: 'topics', operationDescription: `expand "${coreTopic.title}" with ${topicsToAdd.length} new topics` },
                topicsToAdd,
                '*'
            );

            if (!insertResult.success || !insertResult.data) {
                throw new Error(insertResult.error || 'Topic expansion insert verification failed');
            }

            // Batch add all topics at once to prevent HMR-related state issues
            const safeTopics = (insertResult.data || []).map(dbTopic => sanitizeTopicFromDb(dbTopic));
            dispatch({ type: 'ADD_TOPICS', payload: { mapId: activeMapId, topics: safeTopics }});
            dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Successfully expanded "${coreTopic.title}" with ${topicsToAdd.length} new topics (verified).` });
        } catch(e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to expand topic.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: loadingKey, value: false } });
            dispatch({ type: 'SET_ACTIVE_EXPANSION_TOPIC', payload: null });
        }
    }, [activeMap, activeMapId, knowledgeGraph, allTopics, effectiveBusinessInfo, dispatch, businessInfo, state.user]);

    const onGenerateDraft = useCallback(async (brief: ContentBrief, overrideSettings?: { provider: string, model: string }) => {
        if (!activeMapId) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: true } }); // Using generic loading key for drafting
        
        const configToUse = overrideSettings 
            ? { ...effectiveBusinessInfo, aiProvider: overrideSettings.provider as any, aiModel: overrideSettings.model }
            : effectiveBusinessInfo;

        try {
            const draft = await aiService.generateArticleDraft(brief, configToUse, dispatch);

            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // Verified update for article draft
            const updateResult = await verifiedUpdate(
                supabase,
                { table: 'content_briefs', operationDescription: `save article draft for "${brief.title}"` },
                brief.id,
                { article_draft: draft },
                'id, article_draft'
            );

            if (!updateResult.success) {
                throw new Error(updateResult.error || 'Article draft save verification failed');
            }

            // Update the brief in the state with the new draft
            const updatedBrief = { ...brief, articleDraft: draft };
            dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });

            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'drafting', visible: true } });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'contentBrief', visible: false } });

        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to generate draft.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: false } });
        }
    }, [activeMapId, effectiveBusinessInfo, businessInfo, dispatch, state.activeBriefTopic]);


    const onGenerateSchema = useCallback(async (brief: ContentBrief) => {
        dispatch({ type: 'SET_LOADING', payload: { key: 'schema', value: true } });
        try {
            // First, check if there's an existing Pass 9 schema from content generation
            if (brief.id && effectiveBusinessInfo.supabaseUrl && effectiveBusinessInfo.supabaseAnonKey) {
                const orchestrator = new ContentGenerationOrchestrator(
                    effectiveBusinessInfo.supabaseUrl,
                    effectiveBusinessInfo.supabaseAnonKey,
                    {
                        onPassStart: () => {},
                        onPassComplete: () => {},
                        onSectionStart: () => {},
                        onSectionComplete: () => {},
                        onError: () => {},
                        onJobComplete: () => {}
                    }
                );

                const latestJob = await orchestrator.getLatestJob(brief.id);

                // Case 1: Job has schema - display it
                if (latestJob?.schema_data) {
                    const schemaResult = latestJob.schema_data as EnhancedSchemaResult;
                    console.log('[onGenerateSchema] Using existing Pass 9 schema:', schemaResult.pageType);
                    dispatch({ type: 'SET_SCHEMA_RESULT', payload: schemaResult });
                    dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'schema', visible: true } });
                    dispatch({ type: 'SET_LOADING', payload: { key: 'schema', value: false } });
                    return;
                }

                // Case 2: Job exists with draft but no schema - run Pass 9
                if (latestJob?.draft_content && latestJob.status === 'completed') {
                    console.log('[onGenerateSchema] Running Pass 9 for job without schema');
                    dispatch({ type: 'SET_NOTIFICATION', payload: 'Running Pass 9 schema generation...' });

                    // Build SEO pillars from active map or defaults
                    const safePillars: SEOPillars = {
                        centralEntity: brief.targetKeyword || '',
                        sourceContext: effectiveBusinessInfo.industry || '',
                        centralSearchIntent: brief.searchIntent || 'informational'
                    };

                    // Get topic from state if available
                    const topic = state.activeBriefTopic;

                    const pass9Result = await executePass9(
                        latestJob.id,
                        brief,
                        effectiveBusinessInfo,
                        safePillars,
                        latestJob.draft_content,
                        topic || undefined,
                        latestJob.progressive_schema_data,
                        effectiveBusinessInfo.supabaseUrl,
                        effectiveBusinessInfo.supabaseAnonKey,
                        state.user?.id || '',
                        undefined,
                        (msg) => console.log('[Pass9]', msg)
                    );

                    if (pass9Result.success && pass9Result.schemaResult) {
                        console.log('[onGenerateSchema] Pass 9 completed:', pass9Result.schemaResult.pageType);
                        dispatch({ type: 'SET_SCHEMA_RESULT', payload: pass9Result.schemaResult });
                        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'schema', visible: true } });
                        dispatch({ type: 'SET_NOTIFICATION', payload: `Schema generated: ${pass9Result.schemaResult.pageType}` });
                    } else {
                        throw new Error(pass9Result.error || 'Schema generation failed');
                    }
                    dispatch({ type: 'SET_LOADING', payload: { key: 'schema', value: false } });
                    return;
                }
            }

            // No job or no draft - fall back to legacy schema generation
            console.log('[onGenerateSchema] No completed job found, using legacy generation');
            const result = await aiService.generateSchema(brief, effectiveBusinessInfo, dispatch);
            dispatch({ type: 'SET_SCHEMA_RESULT', payload: result });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'schema', visible: true } });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Schema generation failed.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'schema', value: false } });
        }
    }, [effectiveBusinessInfo, dispatch, state.activeBriefTopic, state.user?.id]);

    const handleUpdateTopic = useCallback(async (topicId: string, updates: Partial<EnrichedTopic>) => {
        console.log('[handleUpdateTopic] Called with:', { topicId, updates });

        if (!activeMapId) {
            console.warn('[handleUpdateTopic] No activeMapId, returning early');
            return;
        }
        const user = state.user;
        if (!user) {
            console.warn('[handleUpdateTopic] No user, returning early');
            return;
        }

        const loadingKey = `update_${topicId}`;
        dispatch({ type: 'SET_LOADING', payload: { key: loadingKey, value: true } });

        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // Note: Skip getSession() verification - it can hang indefinitely.
            // RLS policies will reject if not authenticated anyway.
            console.log('[handleUpdateTopic] Updating topic via RLS...');

            // List of fields that live in the `metadata` JSONB column, NOT as root columns
            // IMPORTANT: search_intent is stored in metadata, not as a direct column
            const metaFields = [
                'topic_class', 'cluster_role', 'attribute_focus', 'canonical_query', 'decay_score',
                'query_network', 'topical_border_note', 'planned_publication_date', 'url_slug_hint',
                'blueprint', 'query_type', 'search_intent'
            ];

            // Separate root-level DB columns from metadata fields
            const dbUpdates: any = {};
            const metadataUpdates: Record<string, any> = {};

            Object.entries(updates).forEach(([key, value]) => {
                if (metaFields.includes(key)) {
                    // This field belongs in metadata JSONB
                    metadataUpdates[key] = value;
                } else if (key === 'metadata') {
                    // Caller provided a full metadata object - merge it
                    Object.assign(metadataUpdates, value);
                } else {
                    // Root-level column (title, slug, description, type, etc.)
                    dbUpdates[key] = value;
                }
            });

            // If we have metadata updates, we need to fetch existing metadata and merge
            if (Object.keys(metadataUpdates).length > 0) {
                // Fetch current metadata to merge
                const { data: currentTopic, error: fetchError } = await supabase
                    .from('topics')
                    .select('metadata')
                    .eq('id', topicId)
                    .single();

                if (fetchError) throw fetchError;

                const existingMetadata = (currentTopic?.metadata as Record<string, any>) || {};
                const mergedMetadata = { ...existingMetadata, ...metadataUpdates };
                dbUpdates.metadata = mergedMetadata;

                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'TopicUpdate',
                    message: `Updating metadata for topic ${topicId}: ${JSON.stringify(metadataUpdates)}`,
                    status: 'info',
                    timestamp: Date.now()
                }});
            }

            // Only perform update if we have something to update
            if (Object.keys(dbUpdates).length > 0) {
                // Always set updated_at for tracking
                dbUpdates.updated_at = new Date().toISOString();

                console.log('[handleUpdateTopic] Sending to Supabase:', { topicId, dbUpdates });

                const updateResult = await verifiedUpdate(
                    supabase,
                    { table: 'topics', operationDescription: `update topic ${topicId}` },
                    { column: 'id', value: topicId },
                    dbUpdates,
                    '*'
                );

                console.log('[handleUpdateTopic] Verified response:', { success: updateResult.success, data: updateResult.data });

                if (!updateResult.success) {
                    console.error('[handleUpdateTopic] Update verification failed:', updateResult.error);
                    throw new Error(updateResult.error || 'Topic update verification failed. Please try refreshing the page.');
                }

                // CASCADE TYPE CHANGES TO CHILDREN
                // When a topic's type changes, its children need to be updated too
                if (updates.type) {
                    const activeMap = state.topicalMaps.find(m => m.id === activeMapId);
                    const oldTopic = activeMap?.topics?.find(t => t.id === topicId);
                    const oldType = oldTopic?.type;
                    const newType = updates.type;

                    if (oldType && oldType !== newType) {
                        console.log('[handleUpdateTopic] Type change detected:', oldType, '->', newType);

                        // Get all direct children of this topic
                        const { data: children } = await supabase
                            .from('topics')
                            .select('id, title, type')
                            .eq('parent_topic_id', topicId)
                            .eq('map_id', activeMapId);

                        if (children && children.length > 0) {
                            console.log('[handleUpdateTopic] Found', children.length, 'children to cascade');

                            // Determine new child type based on parent's new type
                            let newChildType: 'core' | 'outer' | 'child' | null = null;

                            if (newType === 'outer') {
                                // Parent became outer -> children become child
                                newChildType = 'child';
                            } else if (newType === 'core') {
                                // Parent became core -> children become outer
                                newChildType = 'outer';
                            }
                            // Note: If parent becomes 'child', children can't exist (max 3 levels)

                            if (newChildType) {
                                let successCount = 0;
                                for (const child of children) {
                                    if (child.type !== newChildType) {
                                        console.log('[handleUpdateTopic] Cascading type change for child:', child.title, '->', newChildType);
                                        const childResult = await verifiedUpdate(
                                            supabase,
                                            { table: 'topics', operationDescription: `cascade type to child "${child.title}"` },
                                            child.id,
                                            { type: newChildType, updated_at: new Date().toISOString() },
                                            'id, type'
                                        );

                                        if (!childResult.success) {
                                            console.error('[handleUpdateTopic] Failed to cascade to child:', child.title, childResult.error);
                                        } else {
                                            successCount++;
                                            // Update local state for this child too
                                            dispatch({
                                                type: 'UPDATE_TOPIC',
                                                payload: {
                                                    mapId: activeMapId,
                                                    topicId: child.id,
                                                    updates: { type: newChildType }
                                                }
                                            });
                                        }
                                    }
                                }
                                if (successCount > 0) {
                                    dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Updated ${successCount} child topic(s) to type "${newChildType}" (verified)` });
                                }
                            }
                        }
                    }
                }
            } else {
                console.warn('[handleUpdateTopic] No dbUpdates to send');
            }

            // Update local state
            console.log('[handleUpdateTopic] Updating local state');
            dispatch({
                type: 'UPDATE_TOPIC',
                payload: {
                    mapId: activeMapId,
                    topicId: topicId,
                    updates: updates
                }
            });

        } catch (e) {
            console.error('[handleUpdateTopic] Error:', e);
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to update topic.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: loadingKey, value: false } });
        }
    }, [activeMapId, businessInfo, dispatch, state.user, state.topicalMaps]);


    const handleExportData = async (format: 'csv' | 'xlsx' | 'zip') => {
        if (!activeMap) return;

        if (format === 'csv') {
            // Quick CSV export - use simple export
            dispatch({ type: 'SET_LOADING', payload: { key: 'export', value: true } });
            try {
                const filename = `${activeProject?.project_name || 'Project'}_${activeMap.name}_HolisticMap`;
                generateMasterExport({
                    topics: allTopics,
                    briefs: briefs,
                    pillars: activeMap.pillars as SEOPillars,
                    metrics: state.validationResult
                }, 'csv', filename);
                dispatch({ type: 'SET_NOTIFICATION', payload: 'Export generated successfully.' });
            } catch (e) {
                dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Export failed.' });
            } finally {
                dispatch({ type: 'SET_LOADING', payload: { key: 'export', value: false } });
            }
        } else {
            // For xlsx/zip, show settings modal for enhanced export
            setShowExportSettings(true);
        }
    };

    const handleEnhancedExport = async (settings: ExportSettings) => {
        if (!activeMap) return;
        setShowExportSettings(false);

        dispatch({ type: 'SET_LOADING', payload: { key: 'export', value: true } });
        try {
            // Get foundation pages, NAP data, navigation, and brand kit for comprehensive export
            const currentFoundationPages = state.websiteStructure?.foundationPages || [];
            const currentNapData = currentFoundationPages.find(p => p.nap_data)?.nap_data || undefined;
            const currentNavigation = state.websiteStructure?.navigation || null;
            const currentBrandKit = (activeMap.business_info as any)?.brandKit || undefined;

            const input: EnhancedExportInput = {
                topics: allTopics,
                briefs: briefs,
                pillars: activeMap.pillars,
                eavs: activeMap.eavs,
                competitors: activeMap.competitors,
                metrics: state.validationResult,
                businessInfo: effectiveBusinessInfo,
                mapName: activeMap.name,
                projectName: activeProject?.project_name,
                // NEW: Additional data for comprehensive export
                foundationPages: currentFoundationPages,
                napData: currentNapData,
                navigation: currentNavigation,
                brandKit: currentBrandKit
            };

            const filename = `${activeProject?.project_name || 'project'}_${activeMap.name || 'map'}_${new Date().toISOString().split('T')[0]}`;

            await generateEnhancedExport(input, settings, filename);

            dispatch({ type: 'SET_NOTIFICATION', payload: 'Enhanced export generated successfully.' });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Export failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'export', value: false } });
        }
    };

    // --- MIGRATION MODE HANDLERS ---
    const handleSwitchToMigration = useCallback(() => {
        dispatch({ type: 'SET_VIEW_MODE', payload: 'MIGRATION' });
    }, [dispatch]);

    const handleSwitchToCreation = useCallback(() => {
        dispatch({ type: 'SET_VIEW_MODE', payload: 'CREATION' });
    }, [dispatch]);

    const handleQuickAudit = useCallback(async (url: string) => {
        if (!activeMapId) return;

        const apiKey = effectiveBusinessInfo.firecrawlApiKey;
        if (!apiKey) {
            dispatch({ type: 'SET_ERROR', payload: 'Firecrawl API key is required for Quick Audit. Please configure it in Settings.' });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'quickAudit', value: true } });
        try {
            // Scrape the URL content using Firecrawl
            const scrapeResult = await aiService.scrapeUrl(url, apiKey);
            if (!scrapeResult || !scrapeResult.markdown) {
                throw new Error('Failed to scrape URL content.');
            }

            // Create a transient brief from the scraped content
            const transientBrief: Partial<ContentBrief> & { id: string; topic_id: string; title: string; articleDraft: string } = {
                id: `transient_${uuidv4()}`,
                topic_id: 'transient',
                title: scrapeResult.title || 'Quick Audit',
                slug: '',
                metaDescription: '',
                keyTakeaways: [],
                outline: '',
                serpAnalysis: { peopleAlsoAsk: [], competitorHeadings: [] },
                visuals: { featuredImagePrompt: '', imageAltText: '' },
                contextualVectors: [],
                contextualBridge: [],
                articleDraft: scrapeResult.markdown
            };

            // Set the result in state and open the content brief modal
            dispatch({ type: 'SET_ACTIVE_BRIEF_TOPIC', payload: { id: 'transient', title: 'Quick Audit' } as EnrichedTopic });
            dispatch({ type: 'SET_BRIEF_GENERATION_RESULT', payload: transientBrief as ContentBrief });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'contentBrief', visible: true } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Quick audit content loaded. You can now run audits on this content.' });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Quick audit failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'quickAudit', value: false } });
        }
    }, [activeMapId, effectiveBusinessInfo.firecrawlApiKey, dispatch]);

    // Foundation page handlers moved to useFoundationPageOperations hook

    const stateSnapshot = {
        'Active Map Found': !!activeMap,
        'Map Has Pillars': !!activeMap?.pillars,
        'Knowledge Graph Ready': !!knowledgeGraph,
        'Can Generate Briefs (Final Check)': canGenerateBriefs,
        'Effective Business Info': { seedKeyword: effectiveBusinessInfo.seedKeyword, aiProvider: effectiveBusinessInfo.aiProvider, aiModel: effectiveBusinessInfo.aiModel, hasGeminiKey: !!effectiveBusinessInfo.geminiApiKey }
    };

    if (!activeProject) {
        return <div className="flex flex-col items-center justify-center h-screen"><Loader /><p className="mt-4">Loading Project...</p></div>;
    }
    
    if (isLoading.mapDetails) {
        return <div className="flex flex-col items-center justify-center h-screen"><Loader /><p className="mt-4">Loading Map Details...</p></div>;
    }
    
    if (!activeMap) {
        return (
            <>
                <MapSelectionScreen 
                    projectName={activeProject.project_name}
                    topicalMaps={topicalMaps}
                    onSelectMap={handleSelectMap}
                    onCreateNewMap={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'newMap', visible: true } })}
                    onStartAnalysis={handleStartAnalysis}
                    onBackToProjects={onBackToProjects}
                    onInitiateDeleteMap={onInitiateDeleteMap}
                />
                <NewMapModal 
                    isOpen={!!modals.newMap}
                    onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'newMap', visible: false } })}
                    onCreateMap={handleCreateNewMap}
                />
            </>
        );
    }

    // Render based on view mode
    if (viewMode === 'MIGRATION') {
        return (
            <>
                <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700">
                    <Button onClick={handleSwitchToCreation} variant="secondary" className="text-xs">
                        ← Back to Creation Mode
                    </Button>
                    <Button onClick={onBackToProjects} variant="secondary" className="text-xs">
                        Back to Projects
                    </Button>
                </div>
                <MigrationDashboardContainer />
                <DebugStatePanel stateSnapshot={stateSnapshot} />
            </>
        );
    }

    return (
        <>
            <ProjectDashboard
                projectName={activeProject.project_name}
                topicalMap={activeMap}
                knowledgeGraph={knowledgeGraph}
                allTopics={allTopics}
                canExpandTopics={canExpandTopics}
                canGenerateBriefs={canGenerateBriefs}
                effectiveBusinessInfo={effectiveBusinessInfo}
                onAnalyzeKnowledgeDomain={onAnalyzeKnowledgeDomain}
                onAddTopicManually={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'addTopic', visible: true } })}
                onViewInternalLinking={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'internalLinking', visible: true } })}
                onUploadGsc={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'gsc', visible: true } })}
                onGenerateAllBriefs={onGenerateAllBriefs}
                onExportData={handleExportData}
                onValidateMap={onValidateMap}
                onFindMergeOpportunities={onFindMergeOpportunities}
                onAnalyzeSemanticRelationships={onAnalyzeSemanticRelationships}
                onAnalyzeContextualCoverage={onAnalyzeContextualCoverage}
                onAuditInternalLinking={onAuditInternalLinking}
                onCalculateTopicalAuthority={onCalculateTopicalAuthority}
                onGeneratePublicationPlan={onGeneratePublicationPlan}
                onRunUnifiedAudit={onRunUnifiedAudit}
                onRepairBriefs={handleRepairBriefs}
                onExpandCoreTopic={handleOpenExpansionModal}
                expandingCoreTopicId={Object.entries(isLoading).find(([k, v]) => k.startsWith('expand_') && v === true)?.[0].split('_')[1] || null}
                onSavePillars={onSavePillars}
                onBackToProjects={onBackToProjects}
                onAddTopic={onAddTopic}
                onBulkAddTopics={onBulkAddTopics}
                onAddTopicFromRecommendation={async (rec: TopicRecommendation) => { await onAddTopic({ title: rec.title, description: rec.description, type: 'outer', parent_topic_id: null, freshness: 'STANDARD' as any }, 'ai') }}
                onAnalyzeGsc={handleAnalyzeGsc}
                onAddTopicFromGsc={async (title, desc) => { await onAddTopic({ title, description: desc, type: 'outer', parent_topic_id: null, freshness: 'STANDARD' as any }, 'ai') }}
                onImproveMap={onImproveMap}
                onExecuteMerge={onExecuteMerge}
                onAddTopicFromContextualGap={async (title, desc) => { await onAddTopic({ title, description: desc || '', type: 'outer', parent_topic_id: null, freshness: 'STANDARD' as any }, 'ai') }}
                onGenerateBrief={onGenerateBrief}
                onGenerateDraft={onGenerateDraft}
                onAuditDraft={onAuditDraft}
                onGenerateSchema={onGenerateSchema}
                onConfirmPillarChange={onConfirmPillarChange}
                onExpandKnowledgeDomain={handleExpandKnowledgeDomain}
                onFindAndAddMissingKnowledgeTerms={handleExpandKnowledgeDomain}
                onGenerateInitialMap={handleGenerateInitialMap}
                // New Context Management Props
                onUpdateEavs={handleUpdateEavs}
                onUpdateCompetitors={handleUpdateCompetitors}
                onRegenerateMap={handleRegenerateMap}
                onExpandWithContext={handleExpandCoreTopic}
                // REFACTOR 03: Pass new props to dashboard
                onEnrichData={handleEnrichData}
                isEnriching={isEnriching}
                // Task 05: Blueprint Props
                onGenerateBlueprints={handleGenerateBlueprints}
                isGeneratingBlueprints={isGeneratingBlueprints}
                // Authorship Refinement
                onAutoFix={handleAutoFix}
                // Topic Update Handler
                onUpdateTopic={handleUpdateTopic}
                // Flow Audit
                onAnalyzeFlow={handleAnalyzeFlow}
                // Migration Mode Props
                onQuickAudit={handleQuickAudit}
                onSwitchToMigration={handleSwitchToMigration}
                // Foundation Pages Props
                foundationPages={foundationPages}
                napData={napData}
                isLoadingFoundationPages={!!isLoading.foundationPages}
                onSaveNAPData={handleSaveNAPData}
                onUpdateFoundationPage={handleUpdateFoundationPage}
                onDeleteFoundationPage={handleDeleteFoundationPage}
                onRestoreFoundationPage={handleRestoreFoundationPage}
                onGenerateMissingFoundationPages={handleGenerateMissingFoundationPages}
                onRepairFoundation={handleRepairFoundation}
                isRepairingFoundation={!!isLoading.repairFoundation}
                onRepairNavigation={handleRepairNavigation}
                isRepairingNavigation={!!isLoading.repairNavigation}
                // Navigation
                navigation={navigation}
                onSaveNavigation={handleSaveNavigation}
                // Brand Kit
                onSaveBrandKit={handleSaveBrandKit}
                // Business Info / Map Settings
                onSaveBusinessInfo={handleSaveBusinessInfo}
            />
            <BriefReviewModal
                isOpen={!!modals.briefReview}
            />
            <DebugStatePanel stateSnapshot={stateSnapshot} />
            <FlowAuditModal
                isOpen={!!modals.flowAudit}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'flowAudit', visible: false }})}
                result={state.flowAuditResult}
                onAutoFix={handleFlowAutoFix}
                onBatchAutoFix={handleBatchFlowAutoFix}
                onRefreshAnalysis={async () => {
                    const brief = state.activeBriefTopic ? briefs[state.activeBriefTopic.id] : null;
                    if (brief?.articleDraft) {
                        await handleAnalyzeFlow(brief.articleDraft);
                    }
                }}
                isRefreshing={!!state.isLoading?.flowAudit}
            />

            {/* Unified Audit Dashboard (Phase 6) */}
            <AuditDashboard
                isOpen={!!modals.unifiedAudit}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'unifiedAudit', visible: false }})}
                result={state.unifiedAudit.result}
                isLoading={state.unifiedAudit.isRunning}
                onRunAudit={onRunUnifiedAudit}
                onApplyFix={handleApplyUnifiedFix}
                onApplyAllFixes={handleApplyAllUnifiedFixes}
                isApplyingFix={!!isLoading.applyingFix}
                historyEntries={state.unifiedAudit.fixHistory}
            />

            {/* Export Settings Modal */}
            <ExportSettingsModal
                isOpen={showExportSettings}
                onClose={() => setShowExportSettings(false)}
                onExport={handleEnhancedExport}
                hasSchemas={false}
                hasAuditResults={!!state.validationResult}
            />

            {/* Bulk Generation Progress Modal */}
            <BulkBriefProgress
                isOpen={briefGenerationTotal > 0}
                current={briefGenerationCurrent}
                total={briefGenerationTotal}
                currentTopicTitle={briefGenerationStatus}
                onCancel={onCancelBriefGeneration}
            />

            {/* Bulk Generation Summary Modal */}
            <BulkGenerationSummary
                isOpen={showBulkSummary}
                onClose={() => setShowBulkSummary(false)}
                topics={allTopics}
                briefs={briefs}
                onRegenerateFailed={(topicIds) => {
                    // Filter to topics that need regeneration and trigger batch
                    const topicsToRegenerate = allTopics.filter(t => topicIds.includes(t.id));
                    if (topicsToRegenerate.length > 0) {
                        const processor = new BatchProcessor(dispatch, () => stateRef.current);
                        processor.generateAllBriefs(topicsToRegenerate).then(() => {
                            setShowBulkSummary(true);
                        });
                    }
                }}
            />

            {/* Improvement Confirmation Modal */}
            <ImprovementConfirmationModal
                isOpen={showImprovementConfirmation}
                onClose={() => {
                    setShowImprovementConfirmation(false);
                    dispatch({ type: 'SET_IMPROVEMENT_LOG', payload: null });
                }}
                suggestion={state.improvementLog}
                onConfirm={onApplyImprovement}
                isApplying={isApplyingImprovement}
            />
        </>
    );
};

export default ProjectDashboardContainer;
