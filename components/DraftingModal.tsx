
// components/DraftingModal.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ContentBrief, BusinessInfo, EnrichedTopic, FreshnessProfile } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAppState } from '../state/appState';
import { Loader } from './ui/Loader';
import { safeString } from '../utils/parsers';
import { Textarea } from './ui/Textarea';
import { getSupabaseClient } from '../services/supabaseClient';
import { SimpleMarkdown } from './ui/SimpleMarkdown';
import * as aiService from '../services/ai/index';
import { AIModelSelector } from './ui/AIModelSelector';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../utils/helpers';
import { RequirementsRail } from './drafting/RequirementsRail';

interface DraftingModalProps {
  isOpen: boolean;
  onClose: () => void;
  brief: ContentBrief | null;
  onAudit: (brief: ContentBrief, draft: string) => void;
  onGenerateSchema: (brief: ContentBrief) => void;
  isLoading: boolean;
  businessInfo: BusinessInfo;
  onAnalyzeFlow: (draft: string) => void;
}

const DraftingModal: React.FC<DraftingModalProps> = ({ isOpen, onClose, brief: briefProp, onAudit, onGenerateSchema, isLoading, businessInfo, onAnalyzeFlow }) => {
  const { state, dispatch } = useAppState();

  // Read brief from state for UI display
  const { activeBriefTopic, topicalMaps, activeMapId } = state;
  const activeMap = topicalMaps.find(m => m.id === activeMapId);
  const briefFromState = activeBriefTopic ? activeMap?.briefs?.[activeBriefTopic.id] : null;
  const brief = briefFromState || briefProp;

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [draftContent, setDraftContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showRail, setShowRail] = useState(true); // Toggle for Requirements Rail
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  // Database sync detection state
  const [databaseDraft, setDatabaseDraft] = useState<string | null>(null);
  const [databaseJobInfo, setDatabaseJobInfo] = useState<{
    updatedAt: string;
    auditScore: number | null;
    passesCompleted: number;
    sectionCount: number;
    jobStatus: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';
    currentPass: number;
    jobId: string;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDiffPreview, setShowDiffPreview] = useState(false);

  // Dynamic Model Selection State
  const [overrideSettings, setOverrideSettings] = useState<{ provider: string, model: string } | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);

  // Track which brief/draft we've loaded to avoid re-fetching
  const loadedBriefIdRef = useRef<string | null>(null);
  const loadedDraftLengthRef = useRef<number>(0); // Track draft length to detect regeneration

  // ROBUST FIX: Fetch draft directly from database when modal opens
  // This bypasses React state timing issues entirely
  useEffect(() => {
    const fetchDraftFromDatabase = async () => {
      if (!isOpen || !brief?.id || brief.id.startsWith('transient-')) {
        return;
      }

      // Check if we have a draft in state/prop
      const existingDraft = safeString(brief.articleDraft);

      // Detect regeneration: same brief ID but different draft length
      const isDraftRegenerated = loadedBriefIdRef.current === brief.id &&
                                  existingDraft &&
                                  existingDraft.length !== loadedDraftLengthRef.current;

      // Don't re-fetch if we already loaded this brief AND have content AND draft hasn't changed
      if (loadedBriefIdRef.current === brief.id && draftContent && !isDraftRegenerated) {
        console.log('[DraftingModal] Already loaded draft for this brief, skipping fetch');
        return;
      }

      // If draft was regenerated, update with new draft
      if (isDraftRegenerated) {
        console.log('[DraftingModal] Draft regenerated! Updating from', loadedDraftLengthRef.current, 'to', existingDraft.length, 'chars');
        setDraftContent(existingDraft);
        loadedDraftLengthRef.current = existingDraft.length;
        setHasUnsavedChanges(false);
        return;
      }

      // If we have a draft in state/prop already, use it
      if (existingDraft) {
        console.log('[DraftingModal] Using existing draft from state:', existingDraft.length, 'chars');
        setDraftContent(existingDraft);
        loadedBriefIdRef.current = brief.id;
        loadedDraftLengthRef.current = existingDraft.length;
        return;
      }

      // No draft in state - fetch from database (handles race condition)
      console.log('[DraftingModal] No draft in state, fetching from database for brief:', brief.id);
      setIsLoadingDraft(true);

      try {
        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

        // First try content_briefs table (primary storage)
        const { data: briefData, error: briefError } = await supabase
          .from('content_briefs')
          .select('article_draft')
          .eq('id', brief.id)
          .single();

        if (!briefError && briefData?.article_draft) {
          console.log('[DraftingModal] Loaded draft from content_briefs:', briefData.article_draft.length, 'chars');
          setDraftContent(briefData.article_draft);
          loadedBriefIdRef.current = brief.id;
          loadedDraftLengthRef.current = briefData.article_draft.length;

          // Also update React state so it stays in sync
          if (activeMapId && brief.topic_id) {
            dispatch({
              type: 'UPDATE_BRIEF',
              payload: {
                mapId: activeMapId,
                topicId: brief.topic_id,
                updates: { articleDraft: briefData.article_draft }
              }
            });
          }
          return;
        }

        // Fallback: try content_generation_jobs table
        const { data: jobData, error: jobError } = await supabase
          .from('content_generation_jobs')
          .select('draft_content')
          .eq('brief_id', brief.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!jobError && jobData?.draft_content) {
          console.log('[DraftingModal] Loaded draft from content_generation_jobs:', jobData.draft_content.length, 'chars');
          setDraftContent(jobData.draft_content);
          loadedBriefIdRef.current = brief.id;
          loadedDraftLengthRef.current = jobData.draft_content.length;

          // Sync to content_briefs and React state
          await supabase
            .from('content_briefs')
            .update({ article_draft: jobData.draft_content })
            .eq('id', brief.id);

          if (activeMapId && brief.topic_id) {
            dispatch({
              type: 'UPDATE_BRIEF',
              payload: {
                mapId: activeMapId,
                topicId: brief.topic_id,
                updates: { articleDraft: jobData.draft_content }
              }
            });
          }
          return;
        }

        console.log('[DraftingModal] No draft found in database');
        loadedBriefIdRef.current = brief.id;

      } catch (err) {
        console.error('[DraftingModal] Error fetching draft:', err);
      } finally {
        setIsLoadingDraft(false);
      }
    };

    fetchDraftFromDatabase();
  }, [isOpen, brief?.id, brief?.articleDraft, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, activeMapId, brief?.topic_id, dispatch]);

  // Reset loaded ref when brief changes
  useEffect(() => {
    if (brief?.id && loadedBriefIdRef.current !== brief.id) {
      loadedBriefIdRef.current = null;
    }
  }, [brief?.id]);

  // Also watch for state updates (in case UPDATE_BRIEF fires after initial load)
  useEffect(() => {
    const stateDraft = safeString(brief?.articleDraft);
    if (stateDraft && stateDraft !== draftContent && !hasUnsavedChanges) {
      console.log('[DraftingModal] State updated with new draft:', stateDraft.length, 'chars');
      setDraftContent(stateDraft);
      loadedDraftLengthRef.current = stateDraft.length;
    }
  }, [brief?.articleDraft, draftContent, hasUnsavedChanges]);

  // Check for newer content in database (from completed multi-pass generation)
  useEffect(() => {
    const checkDatabaseForNewerContent = async () => {
      if (!isOpen || !brief?.id || brief.id.startsWith('transient-') || !draftContent) {
        return;
      }

      try {
        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

        // Get the latest job for this brief (any status - to detect incomplete jobs that can be resumed)
        const { data: jobData, error: jobError } = await supabase
          .from('content_generation_jobs')
          .select('id, draft_content, updated_at, final_audit_score, passes_status, status, current_pass')
          .eq('brief_id', brief.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (jobError || !jobData) {
          setDatabaseDraft(null);
          setDatabaseJobInfo(null);
          return;
        }

        // IMPORTANT: draft_content contains the FINAL optimized content after all 9 passes
        // content_generation_sections only has Pass 1 raw content
        // Use draft_content as primary source, sections as fallback
        let assembledDraft: string | null = null;
        let sectionCount = 0;

        // Primary: Use optimized draft_content from job (has Pass 2-9 optimizations)
        if (jobData.draft_content) {
          assembledDraft = jobData.draft_content;
          console.log('[DraftingModal] Using optimized draft_content from job:', assembledDraft.length, 'chars');
        }

        // Fallback: Assemble from sections if draft_content is empty (job incomplete or Pass 1 only)
        if (!assembledDraft) {
          const { data: sections } = await supabase
            .from('content_generation_sections')
            .select('section_key, section_heading, section_level, section_order, current_content, status')
            .eq('job_id', jobData.id)
            .order('section_order', { ascending: true });

          if (sections && sections.length > 0) {
            const completedSections = sections.filter(s => s.status === 'completed' && s.current_content);
            sectionCount = completedSections.length;

            if (completedSections.length > 0) {
              assembledDraft = completedSections
                .map(s => {
                  const heading = s.section_level === 2 ? `## ${s.section_heading}` : `### ${s.section_heading}`;
                  return `${heading}\n\n${s.current_content || ''}`;
                })
                .join('\n\n');

              console.log('[DraftingModal] Fallback: Assembled from', completedSections.length, 'sections:', assembledDraft?.length, 'chars (Pass 1 content only)');
            }
          }
        }

        // Get section count for display (even if using draft_content)
        if (sectionCount === 0) {
          const { data: sections } = await supabase
            .from('content_generation_sections')
            .select('id')
            .eq('job_id', jobData.id)
            .eq('status', 'completed');
          sectionCount = sections?.length || 0;
        }

        if (!assembledDraft) {
          setDatabaseDraft(null);
          setDatabaseJobInfo(null);
          return;
        }

        // Compare with current draft - check if significantly different
        const currentLength = draftContent.length;
        const dbLength = assembledDraft.length;
        const lengthDiff = Math.abs(currentLength - dbLength);
        const isDifferent = lengthDiff > 100 || assembledDraft !== draftContent;

        // Always show job info if job exists (completed OR incomplete)
        const jobStatus = (jobData.status || 'pending') as 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';
        const currentPass = jobData.current_pass || 1;
        const isIncomplete = jobStatus === 'paused' || jobStatus === 'in_progress' || jobStatus === 'pending';

        if (isDifferent || isIncomplete) {
          // Count completed passes from passes_status object
          const passesStatus = jobData.passes_status as Record<string, string> || {};
          const passKeys = ['pass_1_draft', 'pass_2_headers', 'pass_3_lists', 'pass_4_visuals',
                           'pass_5_microsemantics', 'pass_6_discourse', 'pass_7_intro', 'pass_8_audit', 'pass_9_schema'];
          const completedPasses = passKeys.filter(key => passesStatus[key] === 'completed').length;

          // Debug: log the actual passes_status
          console.log('[DraftingModal] passes_status from DB:', JSON.stringify(passesStatus, null, 2));
          console.log('[DraftingModal] Completed passes count:', completedPasses, 'from keys:', passKeys.map(k => `${k}=${passesStatus[k]}`));
          console.log('[DraftingModal] Job status:', jobStatus, 'current_pass:', currentPass);

          setDatabaseDraft(assembledDraft);
          setDatabaseJobInfo({
            updatedAt: jobData.updated_at,
            auditScore: jobData.final_audit_score,
            passesCompleted: completedPasses,
            sectionCount: sectionCount,
            jobStatus,
            currentPass,
            jobId: jobData.id
          });
          console.log('[DraftingModal] Found database job:', {
            currentLength,
            dbLength,
            diff: lengthDiff,
            auditScore: jobData.final_audit_score,
            sectionCount,
            jobStatus,
            currentPass
          });
        } else {
          setDatabaseDraft(null);
          setDatabaseJobInfo(null);
        }
      } catch (err) {
        console.error('[DraftingModal] Error checking database for newer content:', err);
      }
    };

    // Check after a short delay to avoid race conditions
    const timeoutId = setTimeout(checkDatabaseForNewerContent, 500);
    return () => clearTimeout(timeoutId);
  }, [isOpen, brief?.id, draftContent, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

  // Sync draft from database
  const handleSyncFromDatabase = async () => {
    if (!databaseDraft || !brief || !activeMapId) return;

    console.log('[DraftingModal] Starting sync, databaseDraft length:', databaseDraft.length);
    setIsSyncing(true);
    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

      // Update content_briefs with the assembled draft
      const { error: updateError } = await supabase
        .from('content_briefs')
        .update({ article_draft: databaseDraft })
        .eq('id', brief.id);

      if (updateError) {
        console.error('[DraftingModal] Failed to update content_briefs:', updateError);
        throw updateError;
      }

      console.log('[DraftingModal] Database updated, now updating local state');

      // Store the draft locally before clearing databaseDraft
      const newDraft = databaseDraft;

      // Clear the database draft indicator FIRST to prevent re-detection
      setDatabaseDraft(null);
      setDatabaseJobInfo(null);
      setShowDiffPreview(false);

      // Update local state
      setDraftContent(newDraft);
      loadedDraftLengthRef.current = newDraft.length;
      setHasUnsavedChanges(false);

      // Update app state
      dispatch({
        type: 'UPDATE_BRIEF',
        payload: {
          mapId: activeMapId,
          topicId: brief.topic_id,
          updates: { articleDraft: newDraft }
        }
      });

      console.log('[DraftingModal] Sync complete, new draft length:', newDraft.length);
      dispatch({ type: 'SET_NOTIFICATION', payload: 'Draft synced from latest generation!' });
    } catch (err) {
      console.error('[DraftingModal] Error syncing from database:', err);
      dispatch({ type: 'SET_NOTIFICATION', payload: 'Failed to sync draft from database.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDraftContent(e.target.value);
      setHasUnsavedChanges(true);
  };

  const handleConfigChange = useCallback((provider: string | null, model: string | null) => {
      if (provider && model) {
          setOverrideSettings({ provider, model });
      } else {
          setOverrideSettings(null);
      }
  }, []);

  // Handlers declared BEFORE guard clause
  const handleSaveDraft = async () => {
    if (!brief) return;
    if (!state.activeMapId) return;

    const isTransient = brief.id.startsWith('transient-');

    if (isTransient) {
        // Update in memory only for transient
        const updatedBrief = { ...brief, articleDraft: draftContent };
        dispatch({ type: 'ADD_BRIEF', payload: { mapId: state.activeMapId, topicId: brief.topic_id, brief: updatedBrief } });
        setHasUnsavedChanges(false);
        dispatch({ type: 'SET_NOTIFICATION', payload: 'Transient draft updated in memory. Click "Save to Map" to persist.' });
        return;
    }

    setIsSaving(true);
    try {
        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
        const { error } = await supabase
            .from('content_briefs')
            .update({ article_draft: draftContent })
            .eq('id', brief.id);

        if (error) throw error;

        // Update state
        const updatedBrief = { ...brief, articleDraft: draftContent };
        dispatch({ type: 'ADD_BRIEF', payload: { mapId: state.activeMapId, topicId: brief.topic_id, brief: updatedBrief } });
        dispatch({ type: 'SET_NOTIFICATION', payload: 'Draft saved successfully.' });
        setHasUnsavedChanges(false);

    } catch (e) {
        dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to save draft." });
    } finally {
        setIsSaving(false);
    }
  };

  const handleSaveTransient = async () => {
    if (!brief || !state.activeMapId || !state.user) return;

    setIsSaving(true);
    try {
        const newTopicId = uuidv4();
        const newBriefId = uuidv4();

        // Use title for slug, or fallback to a generic name
        const topicSlug = slugify(brief.title || 'imported-topic');

        // 1. Create Topic
        const newTopic: EnrichedTopic = {
            id: newTopicId,
            map_id: state.activeMapId,
            title: brief.title || 'Imported Topic',
            slug: topicSlug,
            description: `Imported from ${brief.slug}`, // brief.slug holds the URL in transient briefs
            type: 'outer',
            freshness: FreshnessProfile.EVERGREEN,
            parent_topic_id: null,
            metadata: {
                topic_class: 'informational',
                source: 'import'
            }
        };

        // 2. Create Brief
        const newBrief: ContentBrief = {
            ...brief,
            id: newBriefId,
            topic_id: newTopic.id,
            articleDraft: draftContent // Ensure current editor content is saved
        };

        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

        // Insert Topic
        const { error: topicError } = await supabase.from('topics').insert({
            ...newTopic,
            user_id: state.user.id
        });
        if (topicError) throw topicError;

        // Insert Brief
         const { error: briefError } = await supabase.from('content_briefs').insert({
            id: newBrief.id,
            topic_id: newTopic.id,
            user_id: state.user.id,
            title: newBrief.title,
            meta_description: newBrief.metaDescription,
            key_takeaways: newBrief.keyTakeaways as any,
            outline: newBrief.outline,
            article_draft: newBrief.articleDraft,
            serp_analysis: newBrief.serpAnalysis as any,
            contextual_vectors: newBrief.contextualVectors as any,
            created_at: new Date().toISOString()
         });

         if (briefError) throw briefError;

        // Update Global State
        dispatch({ type: 'ADD_TOPIC', payload: { mapId: state.activeMapId, topic: newTopic } });
        dispatch({ type: 'ADD_BRIEF', payload: { mapId: state.activeMapId, topicId: newTopicId, brief: newBrief } });
        dispatch({ type: 'SET_ACTIVE_BRIEF_TOPIC', payload: newTopic });

        dispatch({ type: 'SET_NOTIFICATION', payload: 'Imported page saved to map successfully.' });
        setHasUnsavedChanges(false);

    } catch (e) {
         dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to save to map." });
    } finally {
        setIsSaving(false);
    }
  };

  const handlePolishDraft = async () => {
      if (!brief) return;
      if (!draftContent.trim()) return;
      setIsPolishing(true);

      const configToUse = overrideSettings
          ? { ...businessInfo, aiProvider: overrideSettings.provider as any, aiModel: overrideSettings.model }
          : businessInfo;

      try {
          const polishedText = await aiService.polishDraft(draftContent, brief, configToUse, dispatch);
          setDraftContent(polishedText);
          setHasUnsavedChanges(true);
          setActiveTab('preview'); // Switch to preview to show the formatted result
          dispatch({ type: 'SET_NOTIFICATION', payload: 'Draft polished! Introduction rewritten and formatting improved.' });
      } catch (e) {
          dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to polish draft." });
      } finally {
          setIsPolishing(false);
      }
  };

  const handleCloseModal = () => {
      if (hasUnsavedChanges) {
          if (window.confirm("You have unsaved changes. Are you sure you want to close?")) {
              onClose();
          }
      } else {
          onClose();
      }
  };

  // Validated Logic: 'brief' availability is checked before return or inside handlers.
  if (!isOpen || !brief) return null;

  const isTransient = brief.id.startsWith('transient-');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={handleCloseModal}>
      <Card className="w-full max-w-[98vw] h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">
                {isTransient ? 'Audit Live Page' : 'Article Draft Workspace'}
            </h2>
            <p className="text-sm text-gray-400 flex items-center gap-2">
                {safeString(brief.title) || 'Untitled Topic'}
                {isTransient && <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded border border-yellow-700">Transient Mode</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
             {hasUnsavedChanges && <span className="text-xs text-yellow-400 animate-pulse">Unsaved Changes</span>}

             {/* Toggle Requirements Rail */}
             <button
                onClick={() => setShowRail(!showRail)}
                className={`px-3 py-1 text-xs rounded border ${showRail ? 'bg-blue-900/50 border-blue-600 text-blue-200' : 'bg-gray-700 border-gray-600 text-gray-300'}`}
             >
                {showRail ? 'Hide Requirements' : 'Show Requirements'}
             </button>

             {/* AI Config Toggle */}
             <div className="relative">
                 <Button variant="secondary" className="!py-1 !px-3 text-xs flex items-center gap-2" onClick={() => setShowModelSelector(!showModelSelector)}>
                     <span>AI</span> {overrideSettings ? `${overrideSettings.provider}` : 'Config'}
                 </Button>
                 {showModelSelector && (
                     <div className="absolute top-full right-0 mt-2 w-80 z-50 shadow-xl">
                         <AIModelSelector
                             currentConfig={businessInfo}
                             onConfigChange={handleConfigChange}
                             className="bg-gray-800"
                         />
                     </div>
                 )}
             </div>

             {/* View Toggles */}
             <div className="flex bg-gray-700 rounded p-1 mr-2">
                 <button
                    onClick={() => setActiveTab('edit')}
                    className={`px-3 py-1 text-sm rounded ${activeTab === 'edit' ? 'bg-gray-600 text-white font-medium' : 'text-gray-400 hover:text-gray-200'}`}
                 >
                    Editor
                 </button>
                 <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1 text-sm rounded ${activeTab === 'preview' ? 'bg-gray-600 text-white font-medium' : 'text-gray-400 hover:text-gray-200'}`}
                 >
                    HTML Preview
                 </button>
             </div>

             {isTransient ? (
                 <Button
                    onClick={handleSaveTransient}
                    className="!py-1 !px-4 text-sm bg-green-700 hover:bg-green-600"
                    disabled={isSaving || isPolishing}
                 >
                    {isSaving ? <Loader className="w-4 h-4"/> : 'Save to Map'}
                 </Button>
             ) : (
                 <Button
                    onClick={handleSaveDraft}
                    className="!py-1 !px-4 text-sm"
                    disabled={isSaving || isPolishing}
                 >
                    {isSaving ? <Loader className="w-4 h-4"/> : 'Save Draft'}
                 </Button>
             )}

             <button onClick={handleCloseModal} className="text-gray-400 text-2xl leading-none hover:text-white ml-2">&times;</button>
          </div>
        </header>

        <div className={`flex-grow overflow-hidden bg-gray-900 flex`}>

            {/* Left Sidebar (Structure Guide) */}
            {brief?.structured_outline && brief.structured_outline.length > 0 && activeTab === 'edit' && (
                <div className="hidden xl:flex flex-col w-64 bg-gray-800 border-r border-gray-700 h-full overflow-hidden flex-shrink-0">
                    <div className="p-3 border-b border-gray-700 bg-gray-800/50">
                        <h4 className="text-sm font-bold text-white">Structure Guide</h4>
                        <p className="text-xs text-gray-400">Semantic vector.</p>
                    </div>
                    <div className="overflow-y-auto p-3 space-y-4 flex-grow">
                        {brief.structured_outline.map((section, idx) => (
                            <div key={idx} className="border-l-2 border-gray-600 pl-2">
                                <p className={`text-xs font-semibold text-gray-200 mb-1 ${section.level > 2 ? 'ml-2' : ''}`}>
                                    {safeString(section.heading)}
                                </p>
                                {section.subordinate_text_hint && (
                                    <div className="bg-black/30 p-2 rounded text-[10px] text-gray-300 italic mb-1">
                                        <span className="text-yellow-500 font-bold not-italic">Hint: </span>
                                        {safeString(section.subordinate_text_hint)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col h-full overflow-hidden relative`}>
                {/* Database Sync Banner - show for completed jobs with different content OR incomplete jobs */}
                {databaseJobInfo && (databaseDraft || databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending') && (
                    <div className={`${
                        databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending'
                            ? 'bg-amber-900/40 border-amber-600/50'
                            : 'bg-blue-900/40 border-blue-600/50'
                    } border-b p-3 flex-shrink-0`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending'
                                        ? 'bg-amber-600/30'
                                        : 'bg-blue-600/30'
                                }`}>
                                    {databaseJobInfo.jobStatus === 'paused' ? (
                                        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ) : databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending' ? (
                                        <svg className="w-4 h-4 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${
                                        databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending'
                                            ? 'text-amber-200'
                                            : 'text-blue-200'
                                    }`}>
                                        {databaseJobInfo.jobStatus === 'paused' ? (
                                            <>Generation paused at Pass {databaseJobInfo.currentPass} - can be resumed</>
                                        ) : databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending' ? (
                                            <>Generation in progress at Pass {databaseJobInfo.currentPass}</>
                                        ) : (
                                            <>Newer draft available from multi-pass generation</>
                                        )}
                                    </p>
                                    <p className={`text-xs ${
                                        databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending'
                                            ? 'text-amber-300/70'
                                            : 'text-blue-300/70'
                                    }`}>
                                        {databaseJobInfo.sectionCount} sections • {databaseJobInfo.passesCompleted}/9 passes completed
                                        {databaseJobInfo.auditScore && ` • Audit score: ${databaseJobInfo.auditScore}%`}
                                        {databaseDraft && (
                                            <>
                                                {' • '}
                                                {databaseDraft.length.toLocaleString()} chars
                                                {draftContent && ` (${databaseDraft.length > draftContent.length ? '+' : ''}${(databaseDraft.length - draftContent.length).toLocaleString()} diff)`}
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {databaseDraft && (
                                    <button
                                        onClick={() => setShowDiffPreview(!showDiffPreview)}
                                        className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                                            databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending'
                                                ? 'border-amber-600/50 text-amber-300 hover:bg-amber-800/30'
                                                : 'border-blue-600/50 text-blue-300 hover:bg-blue-800/30'
                                        }`}
                                    >
                                        {showDiffPreview ? 'Hide Preview' : 'Compare'}
                                    </button>
                                )}
                                {databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'pending' ? (
                                    <button
                                        onClick={() => {
                                            // Clear the banner and let ContentBriefModal handle resume
                                            setDatabaseDraft(null);
                                            setDatabaseJobInfo(null);
                                            onClose();
                                            // The ContentBriefModal's "Generate Draft" will detect and resume the paused job
                                        }}
                                        className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
                                    >
                                        Resume in Brief Modal
                                    </button>
                                ) : databaseJobInfo.jobStatus === 'in_progress' ? (
                                    <span className="text-xs px-3 py-1.5 rounded bg-amber-600/50 text-amber-200">
                                        Generation Active
                                    </span>
                                ) : (
                                    <button
                                        onClick={handleSyncFromDatabase}
                                        disabled={isSyncing}
                                        className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
                                    >
                                        {isSyncing ? 'Syncing...' : 'Use Newer Draft'}
                                    </button>
                                )}
                                <button
                                    onClick={() => { setDatabaseDraft(null); setDatabaseJobInfo(null); }}
                                    className={`text-xs px-2 py-1.5 transition-colors ${
                                        databaseJobInfo.jobStatus === 'paused' || databaseJobInfo.jobStatus === 'in_progress' || databaseJobInfo.jobStatus === 'pending'
                                            ? 'text-amber-400 hover:text-amber-200'
                                            : 'text-blue-400 hover:text-blue-200'
                                    }`}
                                    title="Dismiss"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        {/* Diff Preview Panel */}
                        {showDiffPreview && databaseDraft && (
                            <div className="mt-3 grid grid-cols-2 gap-4 max-h-64 overflow-hidden">
                                <div className="bg-gray-900/50 rounded p-3 overflow-y-auto">
                                    <p className="text-xs font-semibold text-gray-400 mb-2">Current Draft ({draftContent.length.toLocaleString()} chars)</p>
                                    <div className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                                        {draftContent.slice(0, 1000)}...
                                    </div>
                                </div>
                                <div className="bg-blue-900/30 rounded p-3 overflow-y-auto">
                                    <p className="text-xs font-semibold text-blue-300 mb-2">Database Draft ({databaseDraft.length.toLocaleString()} chars)</p>
                                    <div className="text-xs text-blue-200 whitespace-pre-wrap font-mono">
                                        {databaseDraft.slice(0, 1000)}...
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {isLoadingDraft ? (
                    <div className="flex-1 flex items-center justify-center bg-gray-900">
                        <div className="text-center">
                            <Loader className="w-8 h-8 mx-auto mb-4 text-blue-500" />
                            <p className="text-gray-400">Loading draft from database...</p>
                        </div>
                    </div>
                ) : activeTab === 'edit' ? (
                    <Textarea
                        value={draftContent}
                        onChange={handleContentChange}
                        className="w-full h-full font-mono text-sm text-gray-300 bg-gray-900 border-none focus:ring-0 resize-none p-6 leading-relaxed overflow-y-auto"
                        placeholder="Start writing your article draft here..."
                        disabled={isPolishing}
                    />
                ) : (
                    <div className="h-full overflow-y-auto p-8 bg-gray-950 text-gray-100">
                        <div className="max-w-3xl mx-auto">
                            {draftContent ? (
                                <SimpleMarkdown content={safeString(draftContent)} />
                            ) : (
                                <div className="text-center text-gray-400 py-20">
                                    <p>No content to preview.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Sidebar (Requirements Rail) */}
            {showRail && activeTab === 'edit' && (
                 <RequirementsRail brief={brief} draftContent={draftContent} />
            )}

        </div>

        <footer className="p-2 bg-gray-800 border-t border-gray-700 flex-shrink-0">
            <div className="flex justify-between items-center">
                {/* Left: Stats and Resources */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                        {draftContent.length.toLocaleString()} chars
                    </span>
                    <Button
                        onClick={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'topicResources', visible: true } })}
                        variant="secondary"
                        className="text-xs py-0.5 px-2 !bg-transparent !text-gray-400 hover:!text-white"
                        title="View all generated resources"
                    >
                        📦
                    </Button>
                </div>

                {/* Center: Main Actions */}
                <div className="flex items-center gap-1">
                    <Button
                        onClick={handlePolishDraft}
                        disabled={isPolishing || !draftContent || activeTab === 'preview'}
                        className="text-xs py-1 px-3 bg-purple-600 hover:bg-purple-700"
                        title="AI polish and finalize"
                    >
                        {isPolishing ? <Loader className="w-3 h-3"/> : 'Polish'}
                    </Button>
                    <Button
                        onClick={() => onAnalyzeFlow(draftContent)}
                        variant="secondary"
                        disabled={isLoading || !draftContent || activeTab === 'preview' || isPolishing}
                        className="text-xs py-1 px-2"
                        title="Flow audit"
                    >
                        Flow
                    </Button>
                    <Button
                        onClick={() => onAudit(brief, draftContent)}
                        variant="secondary"
                        disabled={isLoading || !draftContent || activeTab === 'preview' || isPolishing}
                        className="text-xs py-1 px-2"
                        title="Content audit"
                    >
                        Audit
                    </Button>
                    <Button
                        onClick={() => onGenerateSchema(brief)}
                        disabled={isLoading || !draftContent || activeTab === 'preview' || isPolishing}
                        variant="secondary"
                        className="text-xs py-1 px-2"
                        title="Generate schema"
                    >
                        Schema
                    </Button>
                </div>

                {/* Right: Close */}
                <Button onClick={handleCloseModal} variant="secondary" className="text-xs py-1 px-2 !bg-transparent !text-gray-400 hover:!text-white">
                    Close
                </Button>
            </div>
        </footer>
      </Card>
    </div>
  );
};

export default DraftingModal;
