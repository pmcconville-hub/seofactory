// hooks/useTextSelection.ts
/**
 * useTextSelection Hook
 *
 * Tracks text selection within the article preview area.
 * Provides selection text, position, and section context.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { TextSelection } from '../types/contextualEditor';

interface UseTextSelectionOptions {
  containerRef: React.RefObject<HTMLElement>;
  debounceMs?: number;
  minSelectionLength?: number;
}

interface UseTextSelectionReturn {
  selection: TextSelection | null;
  clearSelection: () => void;
  isSelecting: boolean;
}

export function useTextSelection(options: UseTextSelectionOptions): UseTextSelectionReturn {
  const { containerRef, debounceMs = 300, minSelectionLength = 3 } = options;

  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  const handleSelectionChange = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setIsSelecting(true);

    debounceRef.current = setTimeout(() => {
      setIsSelecting(false);

      const windowSelection = window.getSelection();
      if (!windowSelection || windowSelection.isCollapsed) {
        setSelection(null);
        return;
      }

      const text = windowSelection.toString().trim();
      if (text.length < minSelectionLength) {
        setSelection(null);
        return;
      }

      const container = containerRef.current;
      if (!container) {
        setSelection(null);
        return;
      }

      const range = windowSelection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;

      if (!container.contains(commonAncestor)) {
        setSelection(null);
        return;
      }

      const rect = range.getBoundingClientRect();

      let sectionKey = 'unknown';
      let element: HTMLElement | null = commonAncestor as HTMLElement;
      while (element && element !== container) {
        if (element.dataset?.sectionKey) {
          sectionKey = element.dataset.sectionKey;
          break;
        }
        element = element.parentElement;
      }

      setSelection({
        text,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        sectionKey,
        rect,
      });
    }, debounceMs);
  }, [containerRef, debounceMs, minSelectionLength]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [handleSelectionChange]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const container = containerRef.current;
      const target = e.target as HTMLElement;

      // Don't clear selection if clicking inside the content container
      if (container && container.contains(target)) {
        return;
      }

      // Don't clear selection if clicking inside contextual editor UI
      // (EditorPanel, ImageGenerationPanel, ContextMenu, InlineDiff)
      const isContextualEditorUI = target.closest('[data-contextual-editor]') !== null;
      if (isContextualEditorUI) {
        return;
      }

      clearSelection();
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [containerRef, clearSelection]);

  return {
    selection,
    clearSelection,
    isSelecting,
  };
}
