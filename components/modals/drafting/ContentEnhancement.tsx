// components/modals/drafting/ContentEnhancement.tsx
// Handles content polish, audit, and quality enhancement operations

import { useCallback, useState } from 'react';
import { useDraftingContext } from './DraftingContext';
import { getSupabaseClient } from '../../../services/supabaseClient';
import * as aiService from '../../../services/aiService';
import { runAlgorithmicAudit, convertToAuditIssues } from '../../../services/ai/contentGeneration/passes/auditChecks';
import { ContentBrief, StreamingProgress, AuditIssue } from '../../../types';

export interface ContentEnhancementHook {
  // Polish
  handlePolishDraft: () => Promise<void>;
  isPolishing: boolean;

  // Audit
  handleRunAudit: () => Promise<void>;
  isRunningAudit: boolean;
  auditIssues: AuditIssue[];
  setAuditIssues: (issues: AuditIssue[]) => void;
  showAuditPanel: boolean;
  setShowAuditPanel: (show: boolean) => void;

  // Re-run passes
  handleRerunPasses: (selectedPasses: number[]) => Promise<void>;
  isRerunning: boolean;
}

/**
 * Hook for content enhancement operations
 * Handles polish, audit, and re-running optimization passes
 */
export function useContentEnhancement(): ContentEnhancementHook {
  const {
    brief,
    draftContent,
    setDraftContent,
    draftContentRef,
    setHasUnsavedChanges,
    loadedDraftLengthRef,
    databaseJobInfo,
    setDatabaseDraft,
    businessInfo,
    activeMapId,
    overrideSettings,
    setActiveTab,
    canGenerateContent,
    dispatch,
  } = useDraftingContext();

  // Local state for enhancement operations
  const [isPolishing, setIsPolishing] = useState(false);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [auditIssues, setAuditIssues] = useState<AuditIssue[]>([]);
  const [showAuditPanel, setShowAuditPanel] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);

  /**
   * Polish draft with AI assistance
   */
  const handlePolishDraft = useCallback(async () => {
    if (!brief) return;
    if (!draftContent.trim()) return;
    if (!canGenerateContent) {
      dispatch({ type: 'SET_ERROR', payload: 'Content generation requires a subscription upgrade' });
      return;
    }

    setIsPolishing(true);

    const configToUse = overrideSettings
      ? { ...businessInfo, aiProvider: overrideSettings.provider as any, aiModel: overrideSettings.model }
      : businessInfo;

    // Strip base64 images to reduce token count
    let strippedImageCount = 0;
    const contentForPolish = draftContent
      .replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+\)/g, (_, altText) => {
        strippedImageCount++;
        return `![${altText || 'image'}](placeholder://base64-image-${strippedImageCount})`;
      })
      .replace(/<img([^>]*)src="data:image\/[^;]+;base64,[A-Za-z0-9+/=]+"([^>]*)>/g, (_, before, after) => {
        strippedImageCount++;
        return `<img${before}src="placeholder://base64-image-${strippedImageCount}"${after}>`;
      });

    if (strippedImageCount > 0) {
      console.log(`[ContentEnhancement] Stripped ${strippedImageCount} base64 images`);
      dispatch({
        type: 'SET_NOTIFICATION',
        payload: `Note: ${strippedImageCount} embedded image(s) were replaced with placeholders for processing.`
      });
    }

    // Create a slimmed-down brief for polish
    const briefForPolish: Partial<ContentBrief> = {
      id: brief.id,
      topic_id: brief.topic_id,
      title: brief.title,
      slug: brief.slug,
      metaDescription: brief.metaDescription,
      keyTakeaways: brief.keyTakeaways?.slice(0, 5),
      targetKeyword: brief.targetKeyword,
      searchIntent: brief.searchIntent,
      visual_semantics: brief.visual_semantics?.slice(0, 5),
      serpAnalysis: {
        peopleAlsoAsk: brief.serpAnalysis?.peopleAlsoAsk?.slice(0, 3) || [],
        competitorHeadings: [],
        query_type: brief.serpAnalysis?.query_type
      },
      cta: brief.cta,
      query_type_format: brief.query_type_format,
      featured_snippet_target: brief.featured_snippet_target
    };

    const briefJson = JSON.stringify(briefForPolish);

    // Check if content is too large
    const estimatedTokens = Math.ceil((contentForPolish.length + briefJson.length) / 4);
    if (estimatedTokens > 150000) {
      setIsPolishing(false);
      dispatch({
        type: 'SET_ERROR',
        payload: `Article is too large to polish (estimated ${estimatedTokens.toLocaleString()} tokens). Maximum is ~150,000 tokens.`
      });
      return;
    }

    // Activity-based timeout
    const INACTIVITY_TIMEOUT_MS = 90000;
    let activityTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastActivityTime = Date.now();

    const resetActivityTimeout = () => {
      if (activityTimeoutId) clearTimeout(activityTimeoutId);
      lastActivityTime = Date.now();
      activityTimeoutId = setTimeout(() => {
        const inactivityDuration = Date.now() - lastActivityTime;
        console.warn(`[ContentEnhancement] Polish operation inactive for ${inactivityDuration}ms - timing out`);
        setIsPolishing(false);
        dispatch({
          type: 'SET_ERROR',
          payload: `Polish operation timed out after ${Math.round(inactivityDuration/1000)}s of inactivity.`
        });
      }, INACTIVITY_TIMEOUT_MS);
    };

    resetActivityTimeout();

    const handleProgress = (progress: StreamingProgress) => {
      console.log(`[ContentEnhancement] Polish progress: ${progress.charsReceived} chars`);
      resetActivityTimeout();
    };

    try {
      const polishedText = await aiService.polishDraftSmart(contentForPolish, briefForPolish as ContentBrief, configToUse, dispatch, handleProgress);
      if (activityTimeoutId) clearTimeout(activityTimeoutId);

      setDraftContent(polishedText);
      setActiveTab('preview');

      // Update loadedDraftLengthRef to prevent state sync from reverting
      loadedDraftLengthRef.current = polishedText.length;

      // AUTO-SAVE: Immediately persist polished content
      if (brief && activeMapId) {
        try {
          const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
          const { error: saveError } = await supabase
            .from('content_briefs')
            .update({ article_draft: polishedText, updated_at: new Date().toISOString() })
            .eq('id', brief.id);

          if (saveError) {
            console.error('[ContentEnhancement] Auto-save after polish failed:', saveError);
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Draft polished! ⚠️ Auto-save failed - please save manually.' });
            setHasUnsavedChanges(true);
          } else {
            // Verification
            const { data: verifyData, error: verifyError } = await supabase
              .from('content_briefs')
              .select('article_draft')
              .eq('id', brief.id)
              .single();

            const savedLength = verifyData?.article_draft?.length || 0;
            const expectedLength = polishedText.length;

            if (verifyError || Math.abs(savedLength - expectedLength) > 100) {
              dispatch({ type: 'SET_NOTIFICATION', payload: 'Draft polished! ⚠️ Save verification failed - please save manually.' });
              setHasUnsavedChanges(true);
            } else {
              // Also update the job's draft_content if exists
              if (databaseJobInfo?.jobId) {
                await supabase
                  .from('content_generation_jobs')
                  .update({ draft_content: polishedText, updated_at: new Date().toISOString() })
                  .eq('id', databaseJobInfo.jobId);
              }

              const updatedBrief = { ...brief, articleDraft: polishedText };
              dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });
              setHasUnsavedChanges(false);
              setDatabaseDraft(null);
              dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Draft polished and saved! (${savedLength.toLocaleString()} chars verified)` });
            }
          }
        } catch (autoSaveError) {
          console.error('[ContentEnhancement] Auto-save exception:', autoSaveError);
          dispatch({ type: 'SET_NOTIFICATION', payload: 'Draft polished! ⚠️ Auto-save failed - please save manually.' });
          setHasUnsavedChanges(true);
        }
      } else {
        dispatch({ type: 'SET_NOTIFICATION', payload: 'Draft polished! Click Save to persist your changes.' });
        setHasUnsavedChanges(true);
      }
    } catch (e) {
      if (activityTimeoutId) clearTimeout(activityTimeoutId);
      console.error('[ContentEnhancement] Polish error:', e);
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to polish draft." });
    } finally {
      if (activityTimeoutId) clearTimeout(activityTimeoutId);
      setIsPolishing(false);
    }
  }, [
    brief, draftContent, canGenerateContent, overrideSettings, businessInfo, activeMapId,
    databaseJobInfo?.jobId, dispatch, setDraftContent, setActiveTab, setHasUnsavedChanges,
    loadedDraftLengthRef, setDatabaseDraft
  ]);

  /**
   * Run algorithmic audit
   */
  const handleRunAudit = useCallback(async () => {
    if (!brief || !draftContent) return;
    setIsRunningAudit(true);
    try {
      const results = await runAlgorithmicAudit(draftContent, brief, businessInfo);
      const issues = convertToAuditIssues(results);
      setAuditIssues(issues);
      setShowAuditPanel(true);
      dispatch({ type: 'SET_NOTIFICATION', payload: `Audit complete: ${issues.filter(i => !i.fixApplied).length} issues found` });
    } catch (e) {
      console.error('[ContentEnhancement] Audit error:', e);
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Audit failed' });
    } finally {
      setIsRunningAudit(false);
    }
  }, [brief, draftContent, dispatch]);

  /**
   * Re-run specific optimization passes
   */
  const handleRerunPasses = useCallback(async (selectedPasses: number[]) => {
    if (!brief || !databaseJobInfo || selectedPasses.length === 0) return;

    setIsRerunning(true);
    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

      // Get the job
      const { data: job, error: jobError } = await supabase
        .from('content_generation_jobs')
        .select('*')
        .eq('id', databaseJobInfo.jobId)
        .single();

      if (jobError || !job) throw new Error('Failed to get job');

      // Determine the lowest pass number to re-run from
      const lowestPass = Math.min(...selectedPasses);

      // Reset passes_status for selected passes and all passes after them
      const existingStatus = (job.passes_status && typeof job.passes_status === 'object')
        ? job.passes_status as Record<string, string>
        : {};
      const newPassesStatus: Record<string, string> = { ...existingStatus };
      const passKeyNames = ['draft', 'headers', 'lists', 'discourse', 'microsemantics', 'visuals', 'intro', 'polish', 'audit', 'schema'];
      for (let i = lowestPass; i <= 10; i++) {
        const passKey = `pass_${i}_${passKeyNames[i - 1]}`;
        if (selectedPasses.includes(i) || i > lowestPass) {
          newPassesStatus[passKey] = 'pending';
        }
      }

      // Get the BEST available content for re-running
      const jobDraftContent = job.draft_content || '';

      // Fetch and assemble sections
      const { data: sections } = await supabase
        .from('content_generation_sections')
        .select('section_key, section_heading, section_level, section_order, current_content, status')
        .eq('job_id', databaseJobInfo.jobId)
        .eq('status', 'completed')
        .order('section_order', { ascending: true });

      let assembledSections = '';
      if (sections && sections.length > 0) {
        assembledSections = sections
          .map(s => {
            const content = (s.current_content || '').trim();
            const expectedHeading = s.section_level === 2 ? `## ${s.section_heading}` : `### ${s.section_heading}`;
            const headingPattern = /^#{2,3}\s+/;
            if (headingPattern.test(content)) {
              return content;
            }
            return `${expectedHeading}\n\n${content}`;
          })
          .join('\n\n');
      }

      // Detect corrupted editor content
      const isEditorCorrupted = draftContent &&
        draftContent.includes('data:image/') &&
        (draftContent.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{10000,}/g)?.length || 0) > 0;

      // Use the LONGEST NON-CORRUPTED content available
      const contentOptions = isEditorCorrupted ? [
        { source: 'job.draft_content', content: jobDraftContent, length: jobDraftContent.length },
        { source: 'assembled_sections', content: assembledSections, length: assembledSections.length }
      ] : [
        { source: 'editor', content: draftContent, length: draftContent.length },
        { source: 'job.draft_content', content: jobDraftContent, length: jobDraftContent.length },
        { source: 'assembled_sections', content: assembledSections, length: assembledSections.length }
      ];
      const best = contentOptions.reduce((a, b) => a.length >= b.length ? a : b);
      const startingContent = best.content;

      // Update the job
      const { error: updateError } = await supabase
        .from('content_generation_jobs')
        .update({
          draft_content: startingContent,
          current_pass: lowestPass,
          status: 'pending',
          passes_status: newPassesStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', databaseJobInfo.jobId);

      if (updateError) throw new Error(`Failed to update job: ${updateError.message}`);

      // Trigger job refresh
      dispatch({ type: 'TRIGGER_JOB_REFRESH' });
      dispatch({ type: 'SET_NOTIFICATION', payload: `Re-running passes ${selectedPasses.join(', ')}. Generation will start automatically.` });

    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to configure re-run' });
    } finally {
      setIsRerunning(false);
    }
  }, [brief, draftContent, databaseJobInfo, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, dispatch]);

  return {
    handlePolishDraft,
    isPolishing,
    handleRunAudit,
    isRunningAudit,
    auditIssues,
    setAuditIssues,
    showAuditPanel,
    setShowAuditPanel,
    handleRerunPasses,
    isRerunning,
  };
}

export default useContentEnhancement;
