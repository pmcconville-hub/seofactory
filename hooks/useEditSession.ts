// hooks/useEditSession.ts
/**
 * useEditSession Hook
 *
 * Manages the session edit stack for granular undo/redo.
 * Edits are consolidated into version_history on save.
 */

import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SessionEdit, EditSession } from '../types/contextualEditor';

interface UseEditSessionReturn {
  session: EditSession;
  addEdit: (edit: Omit<SessionEdit, 'id' | 'timestamp' | 'undone'>) => void;
  undo: () => SessionEdit | null;
  redo: () => SessionEdit | null;
  canUndo: boolean;
  canRedo: boolean;
  clearSession: () => void;
  getActiveEdits: () => SessionEdit[];
  getEditCount: () => number;
}

export function useEditSession(): UseEditSessionReturn {
  const [session, setSession] = useState<EditSession>({
    edits: [],
    currentIndex: -1,
  });

  const addEdit = useCallback((edit: Omit<SessionEdit, 'id' | 'timestamp' | 'undone'>) => {
    setSession(prev => {
      const activeEdits = prev.edits.slice(0, prev.currentIndex + 1);

      const newEdit: SessionEdit = {
        ...edit,
        id: uuidv4(),
        timestamp: new Date(),
        undone: false,
      };

      return {
        edits: [...activeEdits, newEdit],
        currentIndex: activeEdits.length,
      };
    });
  }, []);

  const undo = useCallback((): SessionEdit | null => {
    let undoneEdit: SessionEdit | null = null;

    setSession(prev => {
      if (prev.currentIndex < 0) return prev;

      const editToUndo = prev.edits[prev.currentIndex];
      undoneEdit = editToUndo;

      const updatedEdits = [...prev.edits];
      updatedEdits[prev.currentIndex] = { ...editToUndo, undone: true };

      return {
        edits: updatedEdits,
        currentIndex: prev.currentIndex - 1,
      };
    });

    return undoneEdit;
  }, []);

  const redo = useCallback((): SessionEdit | null => {
    let redoneEdit: SessionEdit | null = null;

    setSession(prev => {
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= prev.edits.length) return prev;

      const editToRedo = prev.edits[nextIndex];
      redoneEdit = editToRedo;

      const updatedEdits = [...prev.edits];
      updatedEdits[nextIndex] = { ...editToRedo, undone: false };

      return {
        edits: updatedEdits,
        currentIndex: nextIndex,
      };
    });

    return redoneEdit;
  }, []);

  const clearSession = useCallback(() => {
    setSession({
      edits: [],
      currentIndex: -1,
    });
  }, []);

  const getActiveEdits = useCallback((): SessionEdit[] => {
    return session.edits.filter(e => !e.undone);
  }, [session.edits]);

  const getEditCount = useCallback((): number => {
    return session.edits.filter(e => !e.undone).length;
  }, [session.edits]);

  const canUndo = useMemo(() => session.currentIndex >= 0, [session.currentIndex]);
  const canRedo = useMemo(() => session.currentIndex < session.edits.length - 1, [session.currentIndex, session.edits.length]);

  return {
    session,
    addEdit,
    undo,
    redo,
    canUndo,
    canRedo,
    clearSession,
    getActiveEdits,
    getEditCount,
  };
}
