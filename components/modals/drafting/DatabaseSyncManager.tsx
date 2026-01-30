// components/modals/drafting/DatabaseSyncManager.tsx
// Handles database sync detection, comparison, and sync operations

import { useCallback, useEffect } from 'react';
import { useDraftingContext, DatabaseJobInfo } from './DraftingContext';
import { getSupabaseClient } from '../../../services/supabaseClient';

export interface DatabaseSyncManagerHook {
  handleSyncFromDatabase: () => Promise<void>;
  checkDatabaseForNewerContent: () => Promise<void>;
}

/**
 * Hook for managing database synchronization
 * Detects newer content in database and offers sync options
 */
export function useDatabaseSyncManager(): DatabaseSyncManagerHook {
  const {
    brief,
    draftContent,
    setDraftContent,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    databaseDraft,
    setDatabaseDraft,
    setDatabaseJobInfo,
    setIsSyncing,
    loadedBriefIdRef,
    loadedDraftLengthRef,
    loadedAtRef,
    businessInfo,
    activeMapId,
    dispatch,
  } = useDraftingContext();

  /**
   * Sync draft from database
   */
  const handleSyncFromDatabase = useCallback(async () => {
    if (!databaseDraft || !brief || !activeMapId) return;

    console.log('[DatabaseSyncManager] Starting sync, databaseDraft length:', databaseDraft.length);
    setIsSyncing(true);
    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
      const newDraft = databaseDraft;

      // Update content_briefs with the assembled draft
      const { data: updateData, error: updateError } = await supabase
        .from('content_briefs')
        .update({ article_draft: newDraft })
        .eq('id', brief.id)
        .select('id, article_draft');

      if (updateError) {
        console.error('[DatabaseSyncManager] Failed to update content_briefs:', updateError);
        dispatch({ type: 'SET_ERROR', payload: `Database error: ${updateError.message}` });
        throw updateError;
      }

      // Verify the update actually happened
      const savedLength = updateData?.[0]?.article_draft?.length || 0;
      console.log('[DatabaseSyncManager] Database updated, verified saved length:', savedLength);

      if (savedLength !== newDraft.length) {
        console.warn('[DatabaseSyncManager] WARNING: Saved length differs!');
        dispatch({ type: 'SET_NOTIFICATION', payload: `Warning: Content may have been truncated. Expected ${newDraft.length} chars, saved ${savedLength} chars.` });
      }

      // Clear the database draft indicator FIRST to prevent re-detection
      setDatabaseDraft(null);
      setDatabaseJobInfo(null);

      // Update local state with the full content
      setDraftContent(newDraft);
      loadedDraftLengthRef.current = newDraft.length;
      loadedBriefIdRef.current = brief.id;
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

      console.log('[DatabaseSyncManager] Sync complete, new draftContent length:', newDraft.length);
      dispatch({ type: 'SET_NOTIFICATION', payload: `Draft synced! ${newDraft.length.toLocaleString()} characters loaded.` });
    } catch (err) {
      console.error('[DatabaseSyncManager] Error syncing from database:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      dispatch({ type: 'SET_ERROR', payload: `Failed to sync draft: ${errorMsg}` });
    } finally {
      setIsSyncing(false);
    }
  }, [
    databaseDraft, brief, activeMapId, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey,
    dispatch, setDraftContent, setHasUnsavedChanges, setDatabaseDraft, setDatabaseJobInfo,
    setIsSyncing, loadedBriefIdRef, loadedDraftLengthRef
  ]);

  /**
   * Check for newer content in database
   */
  const checkDatabaseForNewerContent = useCallback(async () => {
    if (!brief?.id || brief.id.startsWith('transient-') || !draftContent) {
      return;
    }

    // Skip database sync check when user has unsaved local changes
    if (hasUnsavedChanges) {
      console.log('[DatabaseSyncManager] Skipping sync check - user has unsaved changes');
      return;
    }

    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

      // Get the latest job for this brief
      const { data: jobData, error: jobError } = await supabase
        .from('content_generation_jobs')
        .select('id, draft_content, updated_at, final_audit_score, passes_status, status, current_pass, schema_data, structural_snapshots, pass_quality_scores, quality_warning, audit_details, image_placeholders')
        .eq('brief_id', brief.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (jobError || !jobData) {
        setDatabaseDraft(null);
        setDatabaseJobInfo(null);
        return;
      }

      // Get sections to find the most complete content
      let sectionCount = 0;
      let assembledFromSections: string | null = null;

      const { data: sections } = await supabase
        .from('content_generation_sections')
        .select('section_key, section_heading, section_level, section_order, current_content, status')
        .eq('job_id', jobData.id)
        .order('section_order', { ascending: true });

      if (sections && sections.length > 0) {
        const completedSections = sections.filter(s => s.status === 'completed' && s.current_content);
        sectionCount = completedSections.length;

        if (completedSections.length > 0) {
          assembledFromSections = completedSections
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
      }

      // Compare content from different sources
      const jobDraftContent = jobData.draft_content || '';
      const jobDraftLength = jobDraftContent.length;
      const sectionsLength = assembledFromSections?.length || 0;
      const currentLength = draftContent.length;

      // Check if job was updated after we loaded the content
      const jobUpdatedAt = new Date(jobData.updated_at).getTime();
      const loadedAt = loadedAtRef.current ? new Date(loadedAtRef.current).getTime() : 0;
      const isJobNewer = jobUpdatedAt > loadedAt;

      // Determine the best content to offer
      let assembledDraft: string | null = null;
      let sourceType = '';

      if (sectionsLength > currentLength && sectionsLength > jobDraftLength) {
        assembledDraft = assembledFromSections;
        sourceType = 'sections (complete but raw)';
      } else if (jobDraftLength > currentLength) {
        assembledDraft = jobDraftContent;
        sourceType = 'job draft_content (optimized)';
      } else if (isJobNewer && jobDraftContent && jobDraftContent !== draftContent) {
        assembledDraft = jobDraftContent;
        sourceType = 'job draft_content (optimized - newer timestamp)';
      } else if (sectionsLength > currentLength) {
        assembledDraft = assembledFromSections;
        sourceType = 'sections';
      }

      // Always show job info if job exists
      const jobStatus = (jobData.status || 'pending') as DatabaseJobInfo['jobStatus'];
      const currentPass = jobData.current_pass || 1;
      const isIncomplete = jobStatus === 'paused' || jobStatus === 'in_progress' || jobStatus === 'pending';

      // Count completed passes
      const passesStatus = jobData.passes_status as Record<string, string> || {};
      const passKeys = ['pass_1_draft', 'pass_2_headers', 'pass_3_lists', 'pass_4_discourse',
                       'pass_5_microsemantics', 'pass_6_visuals', 'pass_7_intro', 'pass_8_polish', 'pass_9_audit', 'pass_10_schema'];
      const completedPasses = passKeys.filter(key => passesStatus[key] === 'completed').length;

      // Always show job info when a job exists
      setDatabaseJobInfo({
        updatedAt: jobData.updated_at,
        auditScore: jobData.final_audit_score,
        passesCompleted: completedPasses,
        sectionCount: sectionCount,
        jobStatus,
        currentPass,
        jobId: jobData.id,
        passesStatus: passesStatus,
        contentSource: sourceType,
        schemaData: jobData.schema_data,
        structuralSnapshots: (jobData as any).structural_snapshots || {},
        passQualityScores: (jobData as any).pass_quality_scores || {},
        qualityWarning: (jobData as any).quality_warning || null,
        auditDetails: (jobData as any).audit_details || undefined,
        imagePlaceholders: (jobData as any).image_placeholders || [],
      });

      // If no newer/longer content found, don't show sync option
      if (!assembledDraft) {
        setDatabaseDraft(null);
        return;
      }

      // Compare with current draft
      const dbLength = assembledDraft.length;
      const lengthDiff = Math.abs(currentLength - dbLength);

      // Detect corrupted local content (contains large base64 images)
      const isLocalCorrupted = draftContent &&
        draftContent.includes('data:image/') &&
        (draftContent.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{10000,}/g)?.length || 0) > 0;

      // Determine if we should suggest sync
      const dbIsSignificantlyLonger = dbLength > currentLength + 500;
      const dbIsShorter = dbLength < currentLength - 100;
      const localIsSignificantlyShorter = currentLength < dbLength - 100;
      const isSubstantiallyDifferent = dbIsSignificantlyLonger || (isJobNewer && lengthDiff > 500);
      const isDifferent = isSubstantiallyDifferent || assembledDraft !== draftContent;

      // Only set databaseDraft if there's actually better/newer content to sync
      if (isLocalCorrupted || (isDifferent && dbIsSignificantlyLonger && !localIsSignificantlyShorter) || (isIncomplete && !dbIsShorter && !localIsSignificantlyShorter)) {
        setDatabaseDraft(assembledDraft);
        console.log('[DatabaseSyncManager] Found newer/different database content');
      } else {
        setDatabaseDraft(null);
      }
    } catch (err) {
      console.error('[DatabaseSyncManager] Error checking database for newer content:', err);
    }
  }, [
    brief, draftContent, hasUnsavedChanges, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey,
    loadedAtRef, setDatabaseDraft, setDatabaseJobInfo
  ]);

  return {
    handleSyncFromDatabase,
    checkDatabaseForNewerContent,
  };
}

export default useDatabaseSyncManager;
