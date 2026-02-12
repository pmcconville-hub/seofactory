// services/styleguide-generator/types.ts
// All types for the Brand Styleguide Generator module.

// ============================================================================
// COLOR SYSTEM
// ============================================================================

/** 10-step color scale from lightest (50) to darkest (900) */
export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;   // ★ The brand color itself
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

/** Semantic/functional colors */
export interface SemanticColors {
  success: string;
  error: string;
  warning: string;
  info: string;
  whatsapp: string;  // #25D366 (fixed)
}

// ============================================================================
// DESIGN TOKEN SET — Single source of truth for all brand consumers
// ============================================================================

export interface TypographySizeSpec {
  size: string;
  weight: number;
  lineHeight: number;
  letterSpacing: string;
}

export interface DesignTokenSet {
  prefix: string;  // e.g., "bm" derived from brand name

  colors: {
    primary: ColorScale;
    secondary?: ColorScale;
    accent?: ColorScale;
    gray: ColorScale;        // brand-warmth-tinted
    semantic: SemanticColors;
  };

  typography: {
    headingFont: string;      // e.g., "'Montserrat', sans-serif"
    bodyFont: string;         // e.g., "'Open Sans', sans-serif"
    googleFontsUrl: string;
    sizes: Record<
      'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'small' | 'label' | 'caption',
      TypographySizeSpec
    >;
  };

  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };

  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    full: string;
  };

  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    colored: string;      // primary-tinted shadow
    coloredLg: string;
    red: string;          // emergency/error shadow
    inner: string;
  };

  transitions: {
    fast: string;
    base: string;
    slow: string;
  };

  containers: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };

  zIndex: {
    base: number;
    dropdown: number;
    sticky: number;
    overlay: number;
    modal: number;
    toast: number;
  };
}

// ============================================================================
// BRAND ANALYSIS — Output of the extraction pipeline
// ============================================================================

export interface ExtractedColor {
  hex: string;
  usage: string;
  frequency: number;
}

export interface ExtractedFont {
  family: string;
  weights: number[];
  googleFontsUrl?: string;
}

export interface ExtractedComponent {
  type: string;       // hero, cards, testimonials, faq, cta, form, pricing, etc.
  variant: string;
  extractedCss?: string;
  screenshotBase64?: string;
}

export interface BrandAnalysis {
  // Identity
  brandName: string;
  domain: string;
  tagline?: string;
  industry?: string;

  // Exact values extracted from CSS / DOM
  colors: {
    primary: string;
    secondary?: string;
    accent?: string;
    textDark: string;
    textBody: string;
    backgroundLight: string;
    backgroundDark: string;
    allExtracted: ExtractedColor[];
  };

  typography: {
    headingFont: ExtractedFont;
    bodyFont: ExtractedFont;
    sizes: Record<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'small', string>;
    lineHeights: { heading: number; body: number };
    letterSpacing: Record<'h1' | 'h2' | 'h3' | 'body', string>;
  };

  spacing: {
    sectionPadding: { desktop: string; mobile: string };
    cardPadding: string;
    containerMaxWidth: string;
    gaps: string[];
  };

  shapes: {
    buttonRadius: string;
    cardRadius: string;
    imageRadius: string;
    inputRadius: string;
    shadows: { card: string; button: string; elevated: string };
  };

  components: ExtractedComponent[];

  personality: {
    overall: string;
    formality: number;
    energy: number;
    warmth: number;
    toneOfVoice: string;
  };

  extractionMethod: 'apify' | 'http-fetch';
  confidence: number;
  screenshotBase64?: string;
  pagesAnalyzed: string[];
}

// ============================================================================
// SECTION GENERATION
// ============================================================================

/** Section category groupings */
export type SectionCategory =
  | 'foundation'      // Sections 1-14
  | 'extension'       // Sections 15-25
  | 'site-wide'       // Sections 26-46
  | 'reference';      // Sections 47-48

/** A rendered section ready for assembly */
export interface RenderedSection {
  id: number;              // Section number (1-48)
  anchorId: string;        // e.g., "section-1"
  title: string;           // e.g., "Color Palette"
  category: SectionCategory;
  html: string;            // Complete section HTML
  classesGenerated: string[];  // CSS class names defined in this section
}

/** Context passed to section generators */
export interface SectionGeneratorContext {
  tokens: DesignTokenSet;
  analysis: BrandAnalysis;
  language: string;         // e.g., "nl", "en"
}

/** Function signature for section generators */
export type SectionGenerator = (ctx: SectionGeneratorContext) => RenderedSection;

// ============================================================================
// DOCUMENT ASSEMBLY
// ============================================================================

/** Navigation item for the sticky nav bar */
export interface NavItem {
  sectionId: number;
  anchorId: string;
  label: string;
  category: SectionCategory;
}

// ============================================================================
// QUALITY VALIDATION
// ============================================================================

export interface QualityReport {
  structural: {
    divBalance: { open: number; close: number; passed: boolean };
    sectionCount: { found: number; expected: number; passed: boolean };
    fileSizeKB: number;
    lineCount: number;
    emptySections: string[];
  };

  content: {
    uniqueClassCount: number;
    prefixConsistency: boolean;
    noCrossContamination: string[];
    brandNameCorrect: boolean;
    colorsMatch: boolean;
  };

  visual: {
    hasColorSwatches: boolean;
    hasButtonDemos: boolean;
    hasCardDemos: boolean;
    hasTypographyHierarchy: boolean;
    hasCodeBlocks: boolean;
    hasNavigationLinks: boolean;
  };

  overallScore: number;
  issues: string[];
}

// ============================================================================
// MAP-LEVEL STORAGE
// ============================================================================

export interface BrandStyleguideData {
  designTokens: DesignTokenSet;
  brandAnalysis: BrandAnalysis;
  htmlStorageKey: string;
  generatedAt: string;
  version: number;
}

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export type StyleguidePhase =
  | 'extracting'
  | 'analyzing'
  | 'generating-tokens'
  | 'generating-sections'
  | 'assembling'
  | 'validating'
  | 'storing'
  | 'complete'
  | 'error';

export interface StyleguideProgress {
  phase: StyleguidePhase;
  phaseLabel: string;
  sectionsCompleted: number;
  sectionsTotal: number;
  currentBatch?: string;
  error?: string;
}
