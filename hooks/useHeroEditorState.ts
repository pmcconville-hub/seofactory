/**
 * Hero Image Editor State Management Hook
 *
 * Central state management for the Hero Image Visual Editor.
 * Handles composition state, undo/redo, auto-save, and state persistence.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  HeroImageComposition,
  HeroLayerConfig,
  HeroImageMetadata,
  HeroValidationResult
} from '../types';
import {
  createBlankComposition,
  createStandardComposition,
  canvasPresets
} from '../config/heroImageDefaults';
import { validateComposition } from '../services/ai/imageGeneration/semanticValidator';

// ============================================
// TYPES
// ============================================

export interface HeroEditorState {
  composition: HeroImageComposition;
  selectedLayerId: string | null;
  isDirty: boolean;
  isValid: boolean;
  undoStack: HeroImageComposition[];
  redoStack: HeroImageComposition[];
  lastSaved: Date | null;
}

export interface HeroEditorActions {
  // Composition actions
  setComposition: (composition: HeroImageComposition) => void;
  resetComposition: () => void;
  loadComposition: (composition: HeroImageComposition) => void;

  // Canvas actions
  setCanvasSize: (width: number, height: number) => void;
  applyCanvasPreset: (presetId: keyof typeof canvasPresets) => void;

  // Layer selection
  selectLayer: (layerId: string | null) => void;

  // Layer updates
  updateLayer: (layerId: string, updates: Partial<HeroLayerConfig>) => void;
  addLayer: (layer: HeroLayerConfig) => void;
  removeLayer: (layerId: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  duplicateLayer: (layerId: string) => void;

  // Metadata
  updateMetadata: (metadata: Partial<HeroImageMetadata>) => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Validation
  validate: () => HeroValidationResult;
  refreshValidation: () => void;

  // State
  markSaved: () => void;
  markDirty: () => void;
}

export type UseHeroEditorStateReturn = [HeroEditorState, HeroEditorActions];

// ============================================
// CONSTANTS
// ============================================

const MAX_UNDO_STACK = 50;
const AUTO_SAVE_KEY = 'hero-editor-autosave';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useHeroEditorState(
  initialComposition?: HeroImageComposition,
  options?: {
    autoSave?: boolean;
    autoValidate?: boolean;
    onStateChange?: (state: HeroEditorState) => void;
  }
): UseHeroEditorStateReturn {
  const { autoSave = true, autoValidate = true, onStateChange } = options || {};

  // ============================================
  // STATE
  // ============================================

  const [composition, setCompositionState] = useState<HeroImageComposition>(
    initialComposition || createBlankComposition()
  );

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const undoStackRef = useRef<HeroImageComposition[]>([]);
  const redoStackRef = useRef<HeroImageComposition[]>([]);

  // ============================================
  // HISTORY MANAGEMENT
  // ============================================

  const pushToUndoStack = useCallback((comp: HeroImageComposition) => {
    undoStackRef.current = [
      ...undoStackRef.current.slice(-MAX_UNDO_STACK + 1),
      comp
    ];
    // Clear redo stack when new action is performed
    redoStackRef.current = [];
  }, []);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;

    const previousState = undoStackRef.current.pop()!;
    redoStackRef.current.push({ ...composition });

    setCompositionState(previousState);
    setIsDirty(true);
  }, [composition]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;

    const nextState = redoStackRef.current.pop()!;
    undoStackRef.current.push({ ...composition });

    setCompositionState(nextState);
    setIsDirty(true);
  }, [composition]);

  // ============================================
  // COMPOSITION ACTIONS
  // ============================================

  const setComposition = useCallback((newComposition: HeroImageComposition) => {
    pushToUndoStack({ ...composition });
    setCompositionState(newComposition);
    setIsDirty(true);
  }, [composition, pushToUndoStack]);

  const resetComposition = useCallback(() => {
    pushToUndoStack({ ...composition });
    setCompositionState(createBlankComposition());
    setSelectedLayerId(null);
    setIsDirty(true);
  }, [composition, pushToUndoStack]);

  const loadComposition = useCallback((newComposition: HeroImageComposition) => {
    // Don't push to undo stack when loading
    setCompositionState(newComposition);
    setSelectedLayerId(null);
    setIsDirty(false);
    undoStackRef.current = [];
    redoStackRef.current = [];
  }, []);

  // ============================================
  // CANVAS ACTIONS
  // ============================================

  const setCanvasSize = useCallback((width: number, height: number) => {
    pushToUndoStack({ ...composition });
    setCompositionState(prev => ({
      ...prev,
      canvasWidth: width,
      canvasHeight: height
    }));
    setIsDirty(true);
  }, [composition, pushToUndoStack]);

  const applyCanvasPreset = useCallback((presetId: keyof typeof canvasPresets) => {
    const preset = canvasPresets[presetId];
    if (preset) {
      setCanvasSize(preset.width, preset.height);
    }
  }, [setCanvasSize]);

  // ============================================
  // LAYER SELECTION
  // ============================================

  const selectLayer = useCallback((layerId: string | null) => {
    setSelectedLayerId(layerId);
  }, []);

  // ============================================
  // LAYER UPDATES
  // ============================================

  const updateLayer = useCallback((layerId: string, updates: Partial<HeroLayerConfig>) => {
    pushToUndoStack({ ...composition });

    setCompositionState(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === layerId
          ? { ...layer, ...updates } as HeroLayerConfig
          : layer
      )
    }));
    setIsDirty(true);
  }, [composition, pushToUndoStack]);

  const addLayer = useCallback((layer: HeroLayerConfig) => {
    pushToUndoStack({ ...composition });

    setCompositionState(prev => ({
      ...prev,
      layers: [...prev.layers, layer]
    }));
    setSelectedLayerId(layer.id);
    setIsDirty(true);
  }, [composition, pushToUndoStack]);

  const removeLayer = useCallback((layerId: string) => {
    pushToUndoStack({ ...composition });

    setCompositionState(prev => ({
      ...prev,
      layers: prev.layers.filter(layer => layer.id !== layerId)
    }));

    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
    setIsDirty(true);
  }, [composition, pushToUndoStack, selectedLayerId]);

  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    pushToUndoStack({ ...composition });

    setCompositionState(prev => {
      const newLayers = [...prev.layers];
      const [removed] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, removed);

      // Update zIndex values
      const updatedLayers = newLayers.map((layer, index) => ({
        ...layer,
        zIndex: index
      }));

      return { ...prev, layers: updatedLayers };
    });
    setIsDirty(true);
  }, [composition, pushToUndoStack]);

  const duplicateLayer = useCallback((layerId: string) => {
    const layer = composition.layers.find(l => l.id === layerId);
    if (!layer) return;

    const newLayer: HeroLayerConfig = {
      ...layer,
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${layer.name} (Copy)`,
      position: {
        ...layer.position,
        x: layer.position.x + 5,
        y: layer.position.y + 5
      }
    } as HeroLayerConfig;

    addLayer(newLayer);
  }, [composition.layers, addLayer]);

  // ============================================
  // METADATA
  // ============================================

  const updateMetadata = useCallback((metadataUpdates: Partial<HeroImageMetadata>) => {
    pushToUndoStack({ ...composition });

    setCompositionState(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        ...metadataUpdates,
        iptc: {
          ...prev.metadata?.iptc,
          ...metadataUpdates.iptc
        },
        exif: {
          ...prev.metadata?.exif,
          ...metadataUpdates.exif
        },
        schemaOrg: {
          ...prev.metadata?.schemaOrg,
          ...metadataUpdates.schemaOrg
        }
      }
    }));
    setIsDirty(true);
  }, [composition, pushToUndoStack]);

  // ============================================
  // VALIDATION
  // ============================================

  const validate = useCallback((): HeroValidationResult => {
    const result = validateComposition(composition);

    // Update composition with validation result
    setCompositionState(prev => ({
      ...prev,
      validation: result
    }));

    return result;
  }, [composition]);

  const refreshValidation = useCallback(() => {
    if (autoValidate) {
      validate();
    }
  }, [autoValidate, validate]);

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const markSaved = useCallback(() => {
    setIsDirty(false);
    setLastSaved(new Date());
  }, []);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  // ============================================
  // AUTO-SAVE
  // ============================================

  useEffect(() => {
    if (!autoSave || !isDirty) return;

    const saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify({
          composition,
          savedAt: new Date().toISOString()
        }));
        console.log('[HeroEditor] Auto-saved composition');
      } catch (error) {
        console.warn('[HeroEditor] Auto-save failed:', error);
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearTimeout(saveTimer);
  }, [autoSave, isDirty, composition]);

  // ============================================
  // AUTO-VALIDATE
  // ============================================

  useEffect(() => {
    if (!autoValidate) return;

    // Debounce validation
    const validateTimer = setTimeout(() => {
      const result = validateComposition(composition);
      setCompositionState(prev => ({
        ...prev,
        validation: result
      }));
    }, 300);

    return () => clearTimeout(validateTimer);
  }, [autoValidate, composition.layers, composition.metadata, composition.canvasWidth, composition.canvasHeight]);

  // ============================================
  // STATE CHANGE CALLBACK
  // ============================================

  const state: HeroEditorState = useMemo(() => ({
    composition,
    selectedLayerId,
    isDirty,
    isValid: composition.validation?.isValid ?? true,
    undoStack: undoStackRef.current,
    redoStack: redoStackRef.current,
    lastSaved
  }), [composition, selectedLayerId, isDirty, lastSaved]);

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // ============================================
  // RETURN
  // ============================================

  const actions: HeroEditorActions = useMemo(() => ({
    setComposition,
    resetComposition,
    loadComposition,
    setCanvasSize,
    applyCanvasPreset,
    selectLayer,
    updateLayer,
    addLayer,
    removeLayer,
    reorderLayers,
    duplicateLayer,
    updateMetadata,
    undo,
    redo,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
    validate,
    refreshValidation,
    markSaved,
    markDirty
  }), [
    setComposition, resetComposition, loadComposition, setCanvasSize,
    applyCanvasPreset, selectLayer, updateLayer, addLayer, removeLayer,
    reorderLayers, duplicateLayer, updateMetadata, undo, redo,
    validate, refreshValidation, markSaved, markDirty
  ]);

  return [state, actions];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Load auto-saved composition from localStorage
 */
export function loadAutoSavedComposition(): HeroImageComposition | null {
  try {
    const saved = localStorage.getItem(AUTO_SAVE_KEY);
    if (!saved) return null;

    const { composition, savedAt } = JSON.parse(saved);

    // Check if auto-save is recent (within 24 hours)
    const savedDate = new Date(savedAt);
    const hoursSinceSave = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSave > 24) {
      localStorage.removeItem(AUTO_SAVE_KEY);
      return null;
    }

    return composition;
  } catch {
    return null;
  }
}

/**
 * Clear auto-saved composition
 */
export function clearAutoSavedComposition(): void {
  localStorage.removeItem(AUTO_SAVE_KEY);
}

/**
 * Check if there's an auto-saved composition
 */
export function hasAutoSavedComposition(): boolean {
  return loadAutoSavedComposition() !== null;
}

export default useHeroEditorState;
