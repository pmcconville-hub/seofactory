/**
 * Hero Image Editor Components
 *
 * A layer-based visual editor for creating semantically optimized hero images
 * following Koray Tugberk GUBUR's "Pixels, Letters, and Bytes" framework.
 */

// Main editor component
export { HeroImageEditor } from './HeroImageEditor';
export type { default as HeroImageEditorDefault } from './HeroImageEditor';

// Sub-components
export { EditorCanvas } from './EditorCanvas';
export { LayerPanel } from './LayerPanel';
export { LayerControls } from './LayerControls';
export { SemanticValidationPanel } from './SemanticValidationPanel';
export { MetadataPanel } from './MetadataPanel';
export { PreviewExport } from './PreviewExport';

// Re-export hooks for convenience
export { useHeroEditorState, loadAutoSavedComposition, hasAutoSavedComposition, clearAutoSavedComposition } from '../../../hooks/useHeroEditorState';
export { useLayerManagement } from '../../../hooks/useLayerManagement';
export { useSemanticValidation, useRuleValidation, useCategoryValidation, useAllCategoriesValidation } from '../../../hooks/useSemanticValidation';
export { useImageComposition, useCanvasRenderer } from '../../../hooks/useImageComposition';

// Re-export config for external customization
export { canvasPresets, compositionTemplates, createBlankComposition, createStandardComposition } from '../../../config/heroImageDefaults';
export { allHeroImageRules, ruleCategories } from '../../../config/heroImageRules';

// Re-export services
export { validateComposition, applyAutoFix, applyAllAutoFixes, canExport } from '../../../services/ai/imageGeneration/semanticValidator';
export { embedMetadataInJpeg, embedMetadataInBlob, extractMetadata, generateImageObjectSchema, generateJsonLdScript, generateAltText } from '../../../services/ai/imageGeneration/metadataEmbedder';
