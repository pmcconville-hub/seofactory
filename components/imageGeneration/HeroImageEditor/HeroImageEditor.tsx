/**
 * Hero Image Editor Component
 *
 * Main visual editor for creating semantically optimized hero images.
 * Combines all sub-components for a complete editing experience.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  HeroImageComposition,
  HeroLayerConfig,
  HeroLayerType,
  HeroImageMetadata,
  LayerPosition,
  BusinessInfo
} from '../../../types';
import {
  createBlankComposition,
  createStandardComposition,
  compositionTemplates,
  canvasPresets
} from '../../../config/heroImageDefaults';

// Hooks
import { useHeroEditorState, loadAutoSavedComposition, hasAutoSavedComposition, clearAutoSavedComposition } from '../../../hooks/useHeroEditorState';
import { useLayerManagement } from '../../../hooks/useLayerManagement';
import { useSemanticValidation } from '../../../hooks/useSemanticValidation';

// Components
import { EditorCanvas } from './EditorCanvas';
import { LayerPanel } from './LayerPanel';
import { LayerControls } from './LayerControls';
import { SemanticValidationPanel } from './SemanticValidationPanel';
import { MetadataPanel } from './MetadataPanel';
import { PreviewExport } from './PreviewExport';

// ============================================
// TYPES
// ============================================

interface HeroImageEditorProps {
  /**
   * Initial composition to edit (optional)
   */
  initialComposition?: HeroImageComposition;

  /**
   * Business info for auto-filling metadata
   */
  businessInfo?: BusinessInfo;

  /**
   * H1 text for the page (used for text overlay)
   */
  h1Text?: string;

  /**
   * Entity name for the central object
   */
  entityName?: string;

  /**
   * Callback when export is complete
   */
  onExport?: (blob: Blob, format: string, metadata: HeroImageMetadata) => void;

  /**
   * Callback to close the editor
   */
  onClose?: () => void;

  /**
   * Additional class name
   */
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const HeroImageEditor: React.FC<HeroImageEditorProps> = ({
  initialComposition,
  businessInfo,
  h1Text,
  entityName,
  onExport,
  onClose,
  className = ''
}) => {
  // Check for auto-saved composition
  const [showRecovery, setShowRecovery] = useState(hasAutoSavedComposition() && !initialComposition);

  // Determine initial composition
  const startingComposition = useMemo(() => {
    if (initialComposition) return initialComposition;
    if (h1Text && entityName && businessInfo?.projectName) {
      return createStandardComposition(h1Text, entityName, businessInfo.projectName);
    }
    return createBlankComposition();
  }, [initialComposition, h1Text, entityName, businessInfo?.projectName]);

  // State management
  const [editorState, editorActions] = useHeroEditorState(startingComposition, {
    autoSave: true,
    autoValidate: true
  });

  // Layer management
  const layerManagement = useLayerManagement();

  // Validation
  const [validationState, validationActions] = useSemanticValidation(editorState.composition);

  // UI State
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCanvasSettings, setShowCanvasSettings] = useState(false);

  // ============================================
  // HANDLERS
  // ============================================

  // Layer handlers
  const handleSelectLayer = useCallback((layerId: string | null) => {
    editorActions.selectLayer(layerId);
  }, [editorActions]);

  const handleUpdateLayerPosition = useCallback((layerId: string, position: Partial<LayerPosition>) => {
    const layer = editorState.composition.layers.find(l => l.id === layerId);
    if (layer) {
      editorActions.updateLayer(layerId, {
        position: { ...layer.position, ...position }
      });
    }
  }, [editorState.composition.layers, editorActions]);

  const handleToggleVisibility = useCallback((layerId: string) => {
    const layer = editorState.composition.layers.find(l => l.id === layerId);
    if (layer) {
      editorActions.updateLayer(layerId, { visible: !layer.visible });
    }
  }, [editorState.composition.layers, editorActions]);

  const handleToggleLock = useCallback((layerId: string) => {
    const layer = editorState.composition.layers.find(l => l.id === layerId);
    if (layer) {
      editorActions.updateLayer(layerId, { locked: !layer.locked });
    }
  }, [editorState.composition.layers, editorActions]);

  const handleAddLayer = useCallback((type: HeroLayerType) => {
    const newLayer = layerManagement.createLayer(type, {
      entityName: entityName || 'Entity',
      text: h1Text || 'Your Text Here'
    });
    editorActions.addLayer(newLayer);
  }, [layerManagement, entityName, h1Text, editorActions]);

  const handleDeleteLayer = useCallback((layerId: string) => {
    editorActions.removeLayer(layerId);
  }, [editorActions]);

  const handleDuplicateLayer = useCallback((layerId: string) => {
    editorActions.duplicateLayer(layerId);
  }, [editorActions]);

  // Layer update handler
  const handleUpdateLayer = useCallback((updates: Partial<HeroLayerConfig>) => {
    if (editorState.selectedLayerId) {
      editorActions.updateLayer(editorState.selectedLayerId, updates);
    }
  }, [editorState.selectedLayerId, editorActions]);

  // Position update handler
  const handleUpdatePosition = useCallback((position: Partial<LayerPosition>) => {
    if (editorState.selectedLayerId) {
      handleUpdateLayerPosition(editorState.selectedLayerId, position);
    }
  }, [editorState.selectedLayerId, handleUpdateLayerPosition]);

  // Validation handlers
  const handleApplyFix = useCallback((ruleId: string) => {
    const fixed = validationActions.applyFix(ruleId);
    if (fixed) {
      editorActions.setComposition(fixed);
    }
  }, [validationActions, editorActions]);

  const handleApplyAllFixes = useCallback(() => {
    const result = validationActions.applyAllFixes();
    editorActions.setComposition(result.composition);
  }, [validationActions, editorActions]);

  // Export handler
  const handleExport = useCallback((blob: Blob, format: string, metadata: HeroImageMetadata) => {
    onExport?.(blob, format, metadata);
    setShowPreview(false);
  }, [onExport]);

  // Template handler
  const handleApplyTemplate = useCallback((templateId: string) => {
    const template = compositionTemplates[templateId as keyof typeof compositionTemplates];
    if (template) {
      const newComposition = template.create(
        h1Text || 'Your Title',
        entityName || 'Entity',
        businessInfo?.projectName || 'Company'
      );
      editorActions.setComposition(newComposition);
      setShowTemplates(false);
    }
  }, [h1Text, entityName, businessInfo?.projectName, editorActions]);

  // Recovery handler
  const handleRecoverAutoSave = useCallback(() => {
    const saved = loadAutoSavedComposition();
    if (saved) {
      editorActions.loadComposition(saved);
    }
    setShowRecovery(false);
  }, [editorActions]);

  const handleDismissRecovery = useCallback(() => {
    clearAutoSavedComposition();
    setShowRecovery(false);
  }, []);

  // Canvas preset handler
  const handleApplyCanvasPreset = useCallback((presetId: keyof typeof canvasPresets) => {
    editorActions.applyCanvasPreset(presetId);
    setShowCanvasSettings(false);
  }, [editorActions]);

  // Get selected layer
  const selectedLayer = useMemo(() => {
    return editorState.composition.layers.find(l => l.id === editorState.selectedLayerId) || null;
  }, [editorState.composition.layers, editorState.selectedLayerId]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className={`fixed inset-0 z-50 bg-white flex flex-col ${className}`}>
      {/* Recovery Modal */}
      {showRecovery && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Recover Previous Work?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              We found an auto-saved composition. Would you like to continue where you left off?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRecoverAutoSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Recover
              </button>
              <button
                onClick={handleDismissRecovery}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">Hero Image Editor</h1>
          {editorState.isDirty && (
            <span className="text-xs text-gray-500">Unsaved changes</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Templates Button */}
          <button
            onClick={() => setShowTemplates(true)}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            Templates
          </button>

          {/* Canvas Settings */}
          <button
            onClick={() => setShowCanvasSettings(true)}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            Canvas
          </button>

          {/* Undo/Redo */}
          <div className="flex items-center border-l border-gray-200 pl-2 ml-2">
            <button
              onClick={editorActions.undo}
              disabled={!editorActions.canUndo}
              className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              title="Undo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={editorActions.redo}
              disabled={!editorActions.canRedo}
              className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              title="Redo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>

          {/* Preview Button */}
          <button
            onClick={() => setShowPreview(true)}
            className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Preview & Export
          </button>

          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Layers */}
        <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50">
          <LayerPanel
            layers={editorState.composition.layers}
            selectedLayerId={editorState.selectedLayerId}
            onSelectLayer={handleSelectLayer}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onDeleteLayer={handleDeleteLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onReorderLayers={editorActions.reorderLayers}
            onAddLayer={handleAddLayer}
            className="flex-1"
          />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col bg-gray-100">
          <EditorCanvas
            composition={editorState.composition}
            selectedLayerId={editorState.selectedLayerId}
            onSelectLayer={handleSelectLayer}
            onUpdateLayerPosition={handleUpdateLayerPosition}
            showGrid={false}
            showGuides={true}
            className="flex-1"
          />
        </div>

        {/* Right Panel - Controls & Validation */}
        <div className="w-80 border-l border-gray-200 flex flex-col bg-gray-50 overflow-y-auto">
          {/* Layer Controls */}
          <LayerControls
            layer={selectedLayer}
            onUpdateLayer={handleUpdateLayer}
            onUpdatePosition={handleUpdatePosition}
            className="m-3"
          />

          {/* Validation Panel */}
          <SemanticValidationPanel
            validation={validationState.result}
            isValidating={validationState.isValidating}
            onApplyFix={handleApplyFix}
            onApplyAllFixes={handleApplyAllFixes}
            className="m-3"
          />

          {/* Metadata Panel */}
          <MetadataPanel
            metadata={editorState.composition.metadata}
            onUpdateMetadata={editorActions.updateMetadata}
            businessName={businessInfo?.projectName}
            className="m-3"
          />
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewExport
          composition={editorState.composition}
          canExport={validationState.canExport}
          onExport={handleExport}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <TemplatesModal
          onApply={handleApplyTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Canvas Settings Modal */}
      {showCanvasSettings && (
        <CanvasSettingsModal
          currentWidth={editorState.composition.canvasWidth}
          currentHeight={editorState.composition.canvasHeight}
          onApplyPreset={handleApplyCanvasPreset}
          onSetSize={editorActions.setCanvasSize}
          onClose={() => setShowCanvasSettings(false)}
        />
      )}
    </div>
  );
};

// ============================================
// TEMPLATES MODAL
// ============================================

interface TemplatesModalProps {
  onApply: (templateId: string) => void;
  onClose: () => void;
}

const TemplatesModal: React.FC<TemplatesModalProps> = ({ onApply, onClose }) => {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Choose a Template</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4 overflow-y-auto max-h-96">
          {Object.entries(compositionTemplates).map(([id, template]) => (
            <button
              key={id}
              onClick={() => onApply(id)}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-colors"
            >
              <div className="h-24 bg-gray-100 rounded mb-2 flex items-center justify-center text-gray-400">
                Preview
              </div>
              <h3 className="font-medium text-gray-900">{template.name}</h3>
              <p className="text-xs text-gray-500">{template.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// CANVAS SETTINGS MODAL
// ============================================

interface CanvasSettingsModalProps {
  currentWidth: number;
  currentHeight: number;
  onApplyPreset: (presetId: keyof typeof canvasPresets) => void;
  onSetSize: (width: number, height: number) => void;
  onClose: () => void;
}

const CanvasSettingsModal: React.FC<CanvasSettingsModalProps> = ({
  currentWidth,
  currentHeight,
  onApplyPreset,
  onSetSize,
  onClose
}) => {
  const [width, setWidth] = useState(currentWidth);
  const [height, setHeight] = useState(currentHeight);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Canvas Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Presets */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Presets</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(canvasPresets).map(([id, preset]) => (
                <button
                  key={id}
                  onClick={() => { onApplyPreset(id as keyof typeof canvasPresets); onClose(); }}
                  className="p-2 text-xs border border-gray-200 rounded hover:border-blue-500 hover:bg-blue-50 text-left"
                >
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-gray-500">{preset.width}x{preset.height}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Size */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Custom Size</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Width (px)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Height (px)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded"
                />
              </div>
            </div>
            <button
              onClick={() => { onSetSize(width, height); onClose(); }}
              className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Apply Custom Size
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroImageEditor;
