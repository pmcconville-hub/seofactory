// hooks/useContextualEditor.ts
/**
 * useContextualEditor Hook
 *
 * Main orchestrating hook for the contextual content editor.
 * Combines text selection, AI analysis, rewriting, and edit session management.
 */

import { useState, useCallback, useEffect, useRef, Dispatch } from 'react';
import { BusinessInfo, ContentBrief, SemanticTriple } from '../types';
import {
  TextSelection,
  ContextAnalysis,
  RewriteResult,
  ImagePromptResult,
  QuickAction,
  EditorMode,
  PanelTab,
  ContextualEditorState,
  ContentEditorSettings,
  DEFAULT_EDITOR_SETTINGS,
} from '../types/contextualEditor';
import { useTextSelection } from './useTextSelection';
import { useEditSession } from './useEditSession';
import { analyzeContext, rewriteText, generateImagePrompt } from '../services/ai/contextualEditing';

interface UseContextualEditorOptions {
  containerRef: React.RefObject<HTMLElement>;
  fullArticle: string;
  businessInfo: BusinessInfo;
  brief: ContentBrief;
  eavs: SemanticTriple[];
  settings?: ContentEditorSettings;
  onContentChange?: (newContent: string, sectionKey: string) => void;
  dispatch: Dispatch<any>;
}

interface UseContextualEditorReturn {
  state: ContextualEditorState;
  selection: TextSelection | null;
  openMenu: () => void;
  closeMenu: () => void;
  openTextPanel: () => void;
  openImagePanel: () => void;
  closePanel: () => void;
  executeQuickAction: (action: QuickAction, customInstruction?: string) => Promise<void>;
  acceptRewrite: () => void;
  rejectRewrite: () => void;
  retryRewrite: () => Promise<void>;
  generateImage: () => Promise<void>;
  acceptImage: () => void;
  rejectImage: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  editCount: number;
  setActiveTab: (tab: PanelTab) => void;
}

export function useContextualEditor(options: UseContextualEditorOptions): UseContextualEditorReturn {
  const {
    containerRef,
    fullArticle,
    businessInfo,
    brief,
    eavs,
    settings = DEFAULT_EDITOR_SETTINGS,
    onContentChange,
    dispatch,
  } = options;

  const { selection, clearSelection, isSelecting } = useTextSelection({ containerRef });
  const editSession = useEditSession();

  const [state, setState] = useState<ContextualEditorState>({
    mode: 'idle',
    selection: null,
    analysis: null,
    rewriteResult: null,
    imagePromptResult: null,
    activeTab: 'corrections',
    isProcessing: false,
    error: null,
  });

  const lastActionRef = useRef<{ action: QuickAction; instruction?: string } | null>(null);

  useEffect(() => {
    setState(prev => ({ ...prev, selection }));
  }, [selection]);

  useEffect(() => {
    if (!selection || settings.showAiAnalysisSuggestions === 'never') return;
    if (settings.showAiAnalysisSuggestions === 'on_request') return;

    const timer = setTimeout(async () => {
      try {
        const analysis = await analyzeContext({
          selectedText: selection.text,
          fullArticle,
          businessInfo,
          brief,
          eavs,
        });
        setState(prev => ({ ...prev, analysis }));
      } catch (error) {
        console.error('Context analysis failed:', error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [selection, fullArticle, businessInfo, brief, eavs, settings.showAiAnalysisSuggestions]);

  const openMenu = useCallback(() => {
    if (selection) {
      setState(prev => ({ ...prev, mode: 'menu' }));
    }
  }, [selection]);

  const closeMenu = useCallback(() => {
    setState(prev => ({ ...prev, mode: 'idle', rewriteResult: null, imagePromptResult: null }));
    clearSelection();
  }, [clearSelection]);

  const openTextPanel = useCallback(() => {
    setState(prev => ({ ...prev, mode: 'panel_text' }));
  }, []);

  const openImagePanel = useCallback(() => {
    setState(prev => ({ ...prev, mode: 'panel_image' }));
  }, []);

  const closePanel = useCallback(() => {
    setState(prev => ({ ...prev, mode: selection ? 'menu' : 'idle' }));
  }, [selection]);

  const setActiveTab = useCallback((tab: PanelTab) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const executeQuickAction = useCallback(async (action: QuickAction, customInstruction?: string) => {
    if (!selection) return;

    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    lastActionRef.current = { action, instruction: customInstruction };

    try {
      const result = await rewriteText({
        request: {
          selectedText: selection.text,
          surroundingContext: '',
          sectionKey: selection.sectionKey,
          action,
          customInstruction,
        },
        fullArticle,
        businessInfo,
        brief,
        eavs,
        dispatch,
      });

      setState(prev => ({
        ...prev,
        rewriteResult: result,
        mode: 'preview',
        isProcessing: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Rewrite failed',
        isProcessing: false,
      }));
    }
  }, [selection, fullArticle, businessInfo, brief, eavs, dispatch]);

  const acceptRewrite = useCallback(() => {
    if (!state.rewriteResult || !selection) return;

    editSession.addEdit({
      type: 'text_rewrite',
      sectionKey: selection.sectionKey,
      originalText: state.rewriteResult.originalText,
      newText: state.rewriteResult.rewrittenText,
      selectionStart: selection.startOffset,
      selectionEnd: selection.endOffset,
      instruction: lastActionRef.current?.action,
    });

    if (onContentChange) {
      onContentChange(state.rewriteResult.rewrittenText, selection.sectionKey);
    }

    setState(prev => ({
      ...prev,
      mode: 'idle',
      rewriteResult: null,
    }));
    clearSelection();
  }, [state.rewriteResult, selection, editSession, onContentChange, clearSelection]);

  const rejectRewrite = useCallback(() => {
    setState(prev => ({
      ...prev,
      mode: selection ? 'menu' : 'idle',
      rewriteResult: null,
    }));
  }, [selection]);

  const retryRewrite = useCallback(async () => {
    if (!lastActionRef.current) return;
    await executeQuickAction(lastActionRef.current.action, lastActionRef.current.instruction);
  }, [executeQuickAction]);

  const generateImage = useCallback(async () => {
    if (!selection) return;

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const result = await generateImagePrompt({
        request: {
          contextText: selection.text,
          sectionHeading: '',
          articleTitle: brief?.title || '',
        },
        businessInfo,
        dispatch,
      });

      setState(prev => ({
        ...prev,
        imagePromptResult: result,
        isProcessing: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Image prompt generation failed',
        isProcessing: false,
      }));
    }
  }, [selection, brief, businessInfo, dispatch]);

  const acceptImage = useCallback(() => {
    if (state.imagePromptResult && selection) {
      editSession.addEdit({
        type: 'image_insert',
        sectionKey: selection.sectionKey,
      });
    }

    setState(prev => ({
      ...prev,
      mode: 'idle',
      imagePromptResult: null,
    }));
    clearSelection();
  }, [state.imagePromptResult, selection, editSession, clearSelection]);

  const rejectImage = useCallback(() => {
    setState(prev => ({
      ...prev,
      imagePromptResult: null,
    }));
  }, []);

  const undo = useCallback(() => {
    const edit = editSession.undo();
    if (edit && edit.type === 'text_rewrite' && edit.originalText && onContentChange) {
      onContentChange(edit.originalText, edit.sectionKey);
    }
  }, [editSession, onContentChange]);

  const redo = useCallback(() => {
    const edit = editSession.redo();
    if (edit && edit.type === 'text_rewrite' && edit.newText && onContentChange) {
      onContentChange(edit.newText, edit.sectionKey);
    }
  }, [editSession, onContentChange]);

  return {
    state,
    selection,
    openMenu,
    closeMenu,
    openTextPanel,
    openImagePanel,
    closePanel,
    executeQuickAction,
    acceptRewrite,
    rejectRewrite,
    retryRewrite,
    generateImage,
    acceptImage,
    rejectImage,
    undo,
    redo,
    canUndo: editSession.canUndo,
    canRedo: editSession.canRedo,
    editCount: editSession.getEditCount(),
    setActiveTab,
  };
}
