// components/modals/drafting/DraftContentManager.tsx
// Handles draft loading, saving, and version history

import { useCallback } from 'react';
import { useDraftingContext, DraftVersion } from './DraftingContext';
import { getSupabaseClient } from '../../../services/supabaseClient';
import { safeString } from '../../../utils/parsers';

export interface DraftContentManagerHook {
  handleSaveDraft: () => Promise<void>;
  handleRestoreVersion: (version: DraftVersion) => Promise<void>;
  loadDraftFromDatabase: () => Promise<void>;
}

/**
 * Hook for managing draft content operations
 * Handles saving, loading, and version history
 */
export function useDraftContentManager(): DraftContentManagerHook {
  const {
    brief,
    draftContentRef,
    setDraftContent,
    setHasUnsavedChanges,
    setIsSaving,
    setIsLoadingDraft,
    draftHistory,
    setDraftHistory,
    loadedBriefIdRef,
    loadedDraftLengthRef,
    loadedAtRef,
    databaseJobInfo,
    setDatabaseDraft,
    businessInfo,
    activeMapId,
    userId,
    dispatch,
  } = useDraftingContext();

  /**
   * Save draft to database with verification
   */
  const handleSaveDraft = useCallback(async () => {
    if (!brief) return;
    if (!activeMapId) return;

    // CRITICAL: Use ref to get the LATEST draftContent value
    const contentToSave = draftContentRef.current;

    const isTransient = brief.id.startsWith('transient-');

    if (isTransient) {
      // Update in memory only for transient
      const updatedBrief = { ...brief, articleDraft: contentToSave };
      dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });
      setHasUnsavedChanges(false);
      dispatch({ type: 'SET_NOTIFICATION', payload: 'Transient draft updated in memory. Click "Save to Map" to persist.' });
      return;
    }

    setIsSaving(true);
    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
      const expectedLength = contentToSave.length;

      console.log('[DraftContentManager] Starting save - brief.id:', brief.id, 'content length:', expectedLength);

      // Step 1: Perform the update
      const { error: updateError, count: updateCount } = await supabase
        .from('content_briefs')
        .update({ article_draft: contentToSave, updated_at: new Date().toISOString() })
        .eq('id', brief.id);

      if (updateError) {
        console.error('[DraftContentManager] Update error:', updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      console.log('[DraftContentManager] Update completed, rows affected:', updateCount);

      // Step 2: CRITICAL - Verify the data actually persisted
      const { data: verifyData, error: verifyError } = await supabase
        .from('content_briefs')
        .select('id, article_draft, updated_at')
        .eq('id', brief.id)
        .single<{ id: string; article_draft: string | null; updated_at: string }>();

      if (verifyError) {
        console.error('[DraftContentManager] Verification read failed:', verifyError);
        throw new Error(`Save verification failed: ${verifyError.message}. The draft may not have been saved due to permissions.`);
      }

      if (!verifyData) {
        console.error('[DraftContentManager] No data returned from verification read');
        throw new Error('Save verification failed: Could not read back saved data. Check database permissions.');
      }

      const savedLength = verifyData.article_draft?.length || 0;
      console.log('[DraftContentManager] Verification result:', {
        expected: expectedLength,
        saved: savedLength,
        diff: savedLength - expectedLength,
        updated_at: verifyData.updated_at
      });

      // Check if the save actually worked
      if (savedLength === 0 && expectedLength > 0) {
        throw new Error('SAVE FAILED: The draft was not persisted to the database. This is likely a permissions issue.');
      }

      // Check for significant content mismatch
      if (Math.abs(savedLength - expectedLength) > 100) {
        console.warn('[DraftContentManager] Content length mismatch after save!');
        dispatch({ type: 'SET_ERROR', payload: `WARNING: Draft may be corrupted. Expected ${expectedLength.toLocaleString()} chars, but database has ${savedLength.toLocaleString()} chars. Please try saving again.` });
        return;
      }

      // Step 3: Also update the content_generation_job's draft_content if one exists
      if (databaseJobInfo?.jobId) {
        const { error: jobError } = await supabase
          .from('content_generation_jobs')
          .update({ draft_content: contentToSave, updated_at: new Date().toISOString() })
          .eq('id', databaseJobInfo.jobId);

        if (jobError) {
          console.warn('[DraftContentManager] Failed to sync job draft_content:', jobError.message);
        } else {
          console.log('[DraftContentManager] Synced draft to content_generation_jobs');
        }
      }

      // Step 4: Update local state only AFTER database verification succeeded
      const updatedBrief = { ...brief, articleDraft: contentToSave };
      dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });

      // Step 5: Fetch updated version history from database
      const { data: historyData } = await supabase
        .from('content_briefs')
        .select('draft_history')
        .eq('id', brief.id)
        .single();

      if (historyData?.draft_history) {
        setDraftHistory(historyData.draft_history as unknown as DraftVersion[]);
        console.log('[DraftContentManager] Updated version history:', (historyData.draft_history as unknown as any[]).length, 'versions');
      }

      // Show clear success message with actual saved count
      dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Draft saved and verified! ${savedLength.toLocaleString()} characters persisted to database.` });
      setHasUnsavedChanges(false);

      // Update the loaded draft length ref to match saved content
      loadedDraftLengthRef.current = savedLength;

      // Clear the database sync banner since we just saved
      setDatabaseDraft(null);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to save draft.";
      console.error('[DraftContentManager] Save error:', e);
      dispatch({ type: 'SET_ERROR', payload: `❌ SAVE FAILED: ${errorMessage}` });
    } finally {
      setIsSaving(false);
    }
  }, [
    brief, activeMapId, draftContentRef, dispatch, setHasUnsavedChanges, setIsSaving,
    businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, databaseJobInfo?.jobId,
    loadedDraftLengthRef, setDatabaseDraft, setDraftHistory
  ]);

  /**
   * Restore a previous version from history
   */
  const handleRestoreVersion = useCallback(async (version: DraftVersion) => {
    if (!brief || !version.content) return;

    const confirmRestore = window.confirm(
      `Restore draft from ${new Date(version.saved_at).toLocaleString()}?\n\n` +
      `This version has ${version.char_count.toLocaleString()} characters.\n\n` +
      `Your current draft will be saved to version history before restoring.`
    );

    if (!confirmRestore) return;

    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

      // First, save current draft to history
      await handleSaveDraft();

      // Then restore the selected version
      setDraftContent(version.content);
      loadedDraftLengthRef.current = version.content.length;
      setHasUnsavedChanges(true); // Mark as unsaved so user can save the restored version

      dispatch({ type: 'SET_NOTIFICATION', payload: `Restored draft version ${version.version} (${version.char_count.toLocaleString()} chars). Don't forget to save!` });
    } catch (e) {
      console.error('[DraftContentManager] Error restoring version:', e);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to restore version' });
    }
  }, [brief, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, handleSaveDraft, setDraftContent, loadedDraftLengthRef, setHasUnsavedChanges, dispatch]);

  /**
   * Load draft from database (initial load)
   */
  const loadDraftFromDatabase = useCallback(async () => {
    if (!brief?.id || brief.id.startsWith('transient-')) {
      return;
    }

    // If brief changed, reset state immediately
    if (loadedBriefIdRef.current !== null && loadedBriefIdRef.current !== brief.id) {
      console.log('[DraftContentManager] Brief changed - resetting state');
      setDraftContent('');
      setHasUnsavedChanges(false);
      loadedBriefIdRef.current = null;
      loadedDraftLengthRef.current = 0;
    }

    const existingDraft = safeString(brief.articleDraft);

    // Don't re-fetch if we already loaded this brief AND have content
    if (loadedBriefIdRef.current === brief.id && existingDraft) {
      console.log('[DraftContentManager] Already loaded draft for this brief, skipping fetch');
      return;
    }

    // If we have a draft in state/prop already, use it
    if (existingDraft) {
      console.log('[DraftContentManager] Using existing draft from state:', existingDraft.length, 'chars');
      setDraftContent(existingDraft);
      loadedBriefIdRef.current = brief.id;
      loadedDraftLengthRef.current = existingDraft.length;
      loadedAtRef.current = new Date().toISOString();

      // Still fetch version history from DB
      try {
        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
        const { data: historyData } = await supabase
          .from('content_briefs')
          .select('draft_history')
          .eq('id', brief.id)
          .single();

        if (historyData?.draft_history && Array.isArray(historyData.draft_history)) {
          setDraftHistory(historyData.draft_history as unknown as DraftVersion[]);
          console.log('[DraftContentManager] Loaded version history:', historyData.draft_history.length, 'versions');
        }
      } catch (err) {
        console.warn('[DraftContentManager] Failed to load version history:', err);
      }

      return;
    }

    // No draft in state - fetch from database
    console.log('[DraftContentManager] No draft in state, fetching from database');
    setIsLoadingDraft(true);

    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

      // Fetch BOTH sources in parallel and compare timestamps
      const [briefResult, jobResult] = await Promise.all([
        supabase
          .from('content_briefs')
          .select('article_draft, draft_history, updated_at')
          .eq('id', brief.id)
          .single(),
        supabase
          .from('content_generation_jobs')
          .select('draft_content, updated_at')
          .eq('brief_id', brief.id)
          .eq('status', 'completed')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      const briefData = briefResult.data;
      const jobData = jobResult.data;

      console.log('[DraftContentManager] Fetched both sources:', {
        briefDraftLength: briefData?.article_draft?.length || 0,
        briefUpdatedAt: briefData?.updated_at,
        jobDraftLength: jobData?.draft_content?.length || 0,
        jobUpdatedAt: jobData?.updated_at
      });

      // Determine which draft to use based on timestamp (newer wins)
      let selectedDraft: string | null = null;

      if (briefData?.article_draft && jobData?.draft_content) {
        // Both exist - compare timestamps
        const briefTime = new Date(briefData.updated_at || 0).getTime();
        const jobTime = new Date(jobData.updated_at || 0).getTime();

        if (jobTime > briefTime) {
          selectedDraft = jobData.draft_content;
          console.log('[DraftContentManager] Using NEWER draft from job');

          // Sync newer job content to content_briefs
          await supabase
            .from('content_briefs')
            .update({ article_draft: jobData.draft_content, updated_at: new Date().toISOString() })
            .eq('id', brief.id);
        } else {
          selectedDraft = briefData.article_draft;
          console.log('[DraftContentManager] Using draft from content_briefs');
        }
      } else if (briefData?.article_draft) {
        selectedDraft = briefData.article_draft;
      } else if (jobData?.draft_content) {
        selectedDraft = jobData.draft_content;

        // Sync to content_briefs
        await supabase
          .from('content_briefs')
          .update({ article_draft: jobData.draft_content })
          .eq('id', brief.id);
      }

      if (selectedDraft) {
        setDraftContent(selectedDraft);
        loadedBriefIdRef.current = brief.id;
        loadedDraftLengthRef.current = selectedDraft.length;
        loadedAtRef.current = new Date().toISOString();

        // Load version history if available
        if (briefData?.draft_history && Array.isArray(briefData.draft_history)) {
          setDraftHistory(briefData.draft_history as unknown as DraftVersion[]);
        }

        // Update React state
        if (activeMapId && brief.topic_id) {
          dispatch({
            type: 'UPDATE_BRIEF',
            payload: {
              mapId: activeMapId,
              topicId: brief.topic_id,
              updates: { articleDraft: selectedDraft }
            }
          });
        }
        return;
      }

      console.log('[DraftContentManager] No draft found in database');
      loadedBriefIdRef.current = brief.id;

    } catch (err) {
      console.error('[DraftContentManager] Error fetching draft:', err);
    } finally {
      setIsLoadingDraft(false);
    }
  }, [
    brief, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, activeMapId,
    dispatch, setDraftContent, setDraftHistory, setHasUnsavedChanges, setIsLoadingDraft,
    loadedBriefIdRef, loadedDraftLengthRef, loadedAtRef
  ]);

  return {
    handleSaveDraft,
    handleRestoreVersion,
    loadDraftFromDatabase,
  };
}

export default useDraftContentManager;
