/**
 * Hero Image Editor Types Module
 *
 * Contains types for the visual hero image editor including:
 * - Layer configurations (background, central object, text overlay, logo)
 * - Validation rules and results
 * - Image metadata (IPTC, EXIF, Schema.org)
 * - Composition and editor state
 * - Export options
 *
 * Following Koray Tugberk GUBUR's "Pixels, Letters, and Bytes" framework
 *
 * Created: 2026-02-21 - Types refactoring initiative
 *
 * @module types/hero
 */

// ============================================================================
// LAYER TYPES
// ============================================================================

/**
 * Layer types for the hero image editor
 */
export type HeroLayerType = 'background' | 'centralObject' | 'textOverlay' | 'logo';

/**
 * Position and dimensions for a layer (all values are percentages 0-100)
 */
export interface LayerPosition {
  x: number;       // X position as percentage of canvas width
  y: number;       // Y position as percentage of canvas height
  width: number;   // Width as percentage of canvas width
  height: number;  // Height as percentage of canvas height
}

/**
 * Base interface for all layer configurations
 */
export interface LayerBase {
  id: string;
  name: string;         // User-friendly layer name
  type: HeroLayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;      // 0-100
  zIndex: number;
  position: LayerPosition;
}

// ============================================================================
// LAYER CONFIGURATIONS
// ============================================================================

/**
 * Background layer configuration
 * Can be AI-generated, user-uploaded, or solid color
 */
export interface BackgroundLayerConfig extends LayerBase {
  type: 'background';
  source: 'ai-generated' | 'user-upload' | 'color';
  imageUrl?: string;
  backgroundColor?: string;
  aiPrompt?: string;
  aiProvider?: 'gemini' | 'dalle';
  isGenerating?: boolean;
}

/**
 * Central object layer configuration
 * Must be centered and fully visible per semantic SEO rules
 */
export interface CentralObjectLayerConfig extends LayerBase {
  type: 'centralObject';
  imageUrl?: string;
  entityName: string;           // The entity this object represents
  preserveAspectRatio?: boolean;
  centeredEnforced: true;       // Constraint: must be centered
  visibilityEnforced: true;     // Constraint: must be 100% visible
}

/**
 * Text overlay layer configuration
 * Placement restricted to top or bottom per semantic SEO rules
 */
export interface TextOverlayLayerConfig extends LayerBase {
  type: 'textOverlay';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold' | 'bolder' | number; // Supports numeric values (100-900)
  textColor: string;
  textShadow?: string;
  textAlign: 'left' | 'center' | 'right';
  placement: 'top' | 'bottom';  // Constraint: only top or bottom allowed
  padding: number;
  maxWidth?: number;            // Max width as percentage (optional)
  backgroundColor?: string;     // Optional background bar color
  backgroundOpacity?: number;
}

/**
 * Logo layer configuration
 * Position restricted to corners per semantic SEO rules
 */
export interface LogoLayerConfig extends LayerBase {
  type: 'logo';
  imageUrl?: string;
  cornerPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  maxSize?: number;             // Max dimension in pixels (optional)
}

/**
 * Union type for all layer configurations
 */
export type HeroLayerConfig =
  | BackgroundLayerConfig
  | CentralObjectLayerConfig
  | TextOverlayLayerConfig
  | LogoLayerConfig;

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validation severity level
 */
export type HeroValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Check result from a validation rule
 */
export interface HeroCheckResult {
  passed: boolean;
  details?: Record<string, unknown>;  // Flexible details object
}

/**
 * Validation rule for hero images
 */
export interface HeroValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'centerpiece' | 'text' | 'logo' | 'technical' | 'accessibility';
  severity: HeroValidationSeverity;
  checkMessage: string;           // Message shown when check fails
  passMessage: string;            // Message shown when check passes
  autoFixAvailable: boolean;      // Whether auto-fix is available
  autoFixDescription?: string;    // Description of what auto-fix does
  check: (composition: HeroImageComposition) => HeroCheckResult;
  autoFix?: (composition: HeroImageComposition) => HeroImageComposition;
}

/**
 * Validation issue returned by a rule
 */
export interface HeroValidationIssue {
  ruleId: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  layerId?: string;
  autoFixAvailable: boolean;
  suggestion: string;
}

/**
 * Individual rule result for UI display
 */
export interface HeroRuleResult {
  ruleId: string;
  ruleName: string;
  category: 'centerpiece' | 'text' | 'logo' | 'technical' | 'accessibility';
  severity: HeroValidationSeverity;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
  autoFixAvailable: boolean;
}

/**
 * Complete validation result for a hero image composition
 */
export interface HeroValidationResult {
  isValid: boolean;
  score?: number;                // 0-100 (optional for simple validation)
  issues?: HeroValidationIssue[];
  passedRules?: string[];
  recommendations?: string[];
  // Extended properties for UI display
  errors: string[];             // Error messages
  warnings: string[];           // Warning messages
  ruleResults: HeroRuleResult[];
}

// ============================================================================
// METADATA
// ============================================================================

/**
 * IPTC metadata for embedding in image
 */
export interface HeroIPTCMetadata {
  creator?: string;
  credit?: string;
  copyright?: string;
  source?: string;
  caption?: string;
  headline?: string;
  keywords?: string[];
  city?: string;
  country?: string;
  dateCreated?: string;
}

/**
 * EXIF metadata for embedding in image
 */
export interface HeroEXIFMetadata {
  artist?: string;
  copyright?: string;
  software?: string;
  imageDescription?: string;
  userComment?: string;
  dateTimeOriginal?: string;
}

/**
 * Schema.org ImageObject for structured data
 */
export interface HeroSchemaOrgMetadata {
  '@type': 'ImageObject';
  name: string;
  description: string;
  contentUrl: string;
  url?: string;              // Public URL of the image
  width?: number;
  height?: number;
  encodingFormat?: string;
  caption?: string;
  author?: {                 // Can be Person or Organization
    '@type': 'Person' | 'Organization';
    name: string;
  };
  creator?: {
    '@type': 'Person' | 'Organization';
    name: string;
  };
  copyrightHolder?: {
    '@type': 'Person' | 'Organization';
    name: string;
  };
  copyrightYear?: number;
  license?: string;
  acquireLicensePage?: string;
  isPartOf?: {               // Reference to containing page
    '@type': 'WebPage';
    url: string;
  };
}

/**
 * Complete metadata for a hero image
 */
export interface HeroImageMetadata {
  iptc: HeroIPTCMetadata;
  exif: HeroEXIFMetadata;
  schemaOrg: HeroSchemaOrgMetadata;
  altText: string;
  fileName: string;
}

// ============================================================================
// COMPOSITION & EDITOR STATE
// ============================================================================

/**
 * Complete hero image composition
 */
export interface HeroImageComposition {
  id: string;
  canvasWidth: number;
  canvasHeight: number;
  aspectRatio?: '16:9' | '4:3' | '1:1' | '3:2';  // Optional
  layers: HeroLayerConfig[];
  validation?: HeroValidationResult;             // Optional for new compositions
  metadata: HeroImageMetadata;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Editor state for the hero image visual editor
 */
export interface HeroEditorState {
  composition: HeroImageComposition;
  selectedLayerId: string | null;
  isDragging: boolean;
  isResizing: boolean;
  history: HeroImageComposition[];
  historyIndex: number;
  zoom: number;
  previewMode: boolean;
  autoSaveEnabled: boolean;
}

/**
 * Export options for hero image
 */
export interface HeroExportOptions {
  format: 'avif' | 'webp' | 'png' | 'jpeg';
  quality: number;              // 0-100
  embedMetadata: boolean;
  generateSchemaJson: boolean;
  uploadToCloudinary: boolean;
}
