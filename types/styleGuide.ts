/**
 * Style Guide Types
 *
 * Types for the Visual Style Guide Extraction system.
 * Extracted from actual DOM elements of target websites — real data, not AI guessing.
 */

export type StyleGuideCategory =
  | 'typography' | 'buttons' | 'cards' | 'navigation'
  | 'accordions' | 'section-breaks' | 'backgrounds'
  | 'images' | 'tables' | 'forms' | 'icons' | 'colors';

export type PageRegion = 'header' | 'hero' | 'main' | 'sidebar' | 'footer' | 'unknown';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface StyleGuideElement {
  id: string;
  category: StyleGuideCategory;
  subcategory: string;                // "h1", "primary-button", "article-card"
  label: string;                      // "Primary Heading (Inter Bold 48px)"
  pageRegion: PageRegion;
  outerHtml: string;                  // Cleaned outer HTML
  computedCss: Record<string, string>; // Relevant computed CSS properties
  selfContainedHtml: string;          // Standalone HTML with inline styles
  selector: string;                   // CSS selector used to find element
  elementTag: string;
  classNames: string[];
  approvalStatus: ApprovalStatus;
  userComment?: string;
  referenceImageBase64?: string;
  referenceUrl?: string;
  qualityScore?: number;              // AI validation score 0-100
  elementScreenshotBase64?: string;   // Playwright element screenshot
  elementScreenshotUrl?: string;      // Public URL from Supabase Storage (replaces base64)
  sourcePageUrl?: string;             // Which page this element was found on
  aiValidated?: boolean;              // Whether AI has validated this element
  aiGenerated?: boolean;              // Whether AI created this element (fallback)
  hoverCss?: Record<string, string>;  // Captured :hover pseudo-class styles
  ancestorBackground?: { backgroundColor: string; backgroundImage: string };
  visualIssues?: string[];            // Issues detected during visual validation
  aiRepaired?: boolean;               // Whether AI regenerated the HTML
  suggestedBackground?: string;       // AI-suggested background color
  validationReason?: string;          // AI explanation for quality score
  refinementHistory?: Array<{
    timestamp: string;
    comment: string;
    previousHtml: string;
  }>;
}

export interface StyleGuideColor {
  hex: string;
  rgb: string;
  usage: string;
  source: string;
  frequency: number;
  approvalStatus: ApprovalStatus;
}

export interface PageSectionInfo {
  name: string;                   // "Hero", "Features Grid", "Testimonials"
  description: string;
  layoutPattern: string;          // "full-width with centered CTA"
}

export interface BrandOverview {
  brandPersonality: string;       // "Professional, modern, trustworthy"
  colorMood: 'warm' | 'cool' | 'neutral' | 'mixed';
  overallFeel: string;            // AI-generated 2-3 sentence description
  pageSections: PageSectionInfo[];
  heroDescription?: string;
}

export interface StyleGuide {
  id: string;
  hostname: string;
  sourceUrl: string;
  screenshotBase64?: string;
  screenshotUrl?: string;             // Public URL from Supabase Storage
  extractedAt: string;
  elements: StyleGuideElement[];
  colors: StyleGuideColor[];
  googleFontsUrls: string[];
  googleFontFamilies: string[];
  isApproved: boolean;
  approvedAt?: string;
  extractionDurationMs: number;
  elementCount: number;
  version: number;
  pageScreenshots?: { url: string; base64: string }[];  // Screenshots per crawled page
  pagesScanned?: number;              // Number of pages crawled
  brandOverview?: BrandOverview;
}

export interface SavedStyleGuide {
  id: string;
  user_id: string;
  hostname: string;
  source_url: string;
  style_guide: StyleGuide;
  version: number;
  created_at: string;
  updated_at: string;
  screenshot_storage_paths?: Record<string, string>;
}
