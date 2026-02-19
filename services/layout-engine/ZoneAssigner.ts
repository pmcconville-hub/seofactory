/**
 * Zone Assigner
 *
 * Maps content sections to semantic zones based on heading patterns,
 * content type, and the active page-type template. Uses regex-based
 * pattern matching on headings and content type strings to determine
 * the most appropriate zone for each section.
 *
 * Zone detection priority:
 * 1. TITLE       - headingLevel === 1
 * 2. CENTERPIECE - First section after H1, or contentType includes 'introduction' or 'hero'
 * 3. TRUST       - Heading matches trust-related patterns
 * 4. CTA         - Heading matches CTA patterns or contentType === 'cta'
 * 5. BRIDGE      - Heading matches bridge/related patterns or contentType === 'bridge'
 * 6. SUPPLEMENTARY - contentType includes 'sidebar', 'related', 'toc', or low-weight H3+
 * 7. BOILERPLATE - headingLevel === 0 (no heading) or last section
 * 8. MAIN        - Default fallback
 */

import { SemanticZone, PageType } from './types';
import { pageTypeTemplateService } from '../pageTypeTemplateService';

// =============================================================================
// PATTERN DEFINITIONS
// =============================================================================

const TRUST_PATTERN =
  /waarom|over ons|about|credentials|testimonials|reviews|team|expertise|certific|accredit|awards|partners|clients/i;

const CTA_PATTERN =
  /contact|offerte|quote|aanvragen|get started|try|request|demo|book|schedule|sign up|register|subscribe/i;

const BRIDGE_PATTERN =
  /hoe .* helpt|how .* helps|ontdek|discover|gerelateerd|related|see also|verder lezen|read more|explore/i;

const SUPPLEMENTARY_CONTENT_TYPES = ['sidebar', 'related', 'toc'];

// =============================================================================
// SECTION INPUT TYPE
// =============================================================================

interface SectionInput {
  heading: string;
  contentType: string;
  headingLevel: number;
  semanticWeight?: number;
}

// =============================================================================
// ZONE ASSIGNMENT RESULT
// =============================================================================

interface ZoneAssignment {
  sectionIndex: number;
  zone: SemanticZone;
  confidence: number;
}

// =============================================================================
// ZONE DETECTION LOGIC
// =============================================================================

/**
 * Assigns a semantic zone to a single section based on its properties and position.
 *
 * @param section     - The section to analyze
 * @param sectionIndex - Zero-based index of the section in the sections array
 * @param totalSections - Total number of sections
 * @param pageType    - The active page type template to validate against
 * @returns Zone assignment with confidence score (0-1)
 */
function assignZone(
  section: SectionInput,
  sectionIndex: number,
  totalSections: number,
  pageType: PageType
): { zone: SemanticZone; confidence: number } {
  const { heading, contentType, headingLevel, semanticWeight } = section;
  const headingLower = heading.toLowerCase();
  const contentTypeLower = contentType.toLowerCase();

  // Validate that the page type exists (side effect: loads template for validation)
  pageTypeTemplateService.getTemplateForPageType(pageType);

  // ── 1. TITLE: H1 headings ──
  if (headingLevel === 1) {
    return { zone: 'TITLE', confidence: 0.95 };
  }

  // ── 2. CENTERPIECE: First content section after H1, or introduction/hero ──
  if (
    contentTypeLower.includes('introduction') ||
    contentTypeLower.includes('hero')
  ) {
    return { zone: 'CENTERPIECE', confidence: 0.9 };
  }
  // First section (index 0) or second section (index 1, common when index 0 is the title)
  if (sectionIndex <= 1 && headingLevel !== 0) {
    return { zone: 'CENTERPIECE', confidence: 0.7 };
  }

  // ── 3. TRUST: Trust-related heading patterns ──
  if (TRUST_PATTERN.test(headingLower)) {
    return { zone: 'TRUST', confidence: 0.85 };
  }

  // ── 4. CTA: CTA heading patterns or contentType ──
  if (CTA_PATTERN.test(headingLower) || contentTypeLower === 'cta') {
    return { zone: 'CTA', confidence: 0.9 };
  }

  // ── 5. BRIDGE: Bridge/related heading patterns or contentType ──
  if (BRIDGE_PATTERN.test(headingLower) || contentTypeLower === 'bridge') {
    return { zone: 'BRIDGE', confidence: 0.8 };
  }

  // ── 6. SUPPLEMENTARY: Sidebar, related, TOC content types, or low-weight H3+ ──
  if (SUPPLEMENTARY_CONTENT_TYPES.some((t) => contentTypeLower.includes(t))) {
    return { zone: 'SUPPLEMENTARY', confidence: 0.85 };
  }
  if (
    headingLevel >= 3 &&
    semanticWeight !== undefined &&
    semanticWeight <= 2
  ) {
    return { zone: 'SUPPLEMENTARY', confidence: 0.6 };
  }

  // ── 7. BOILERPLATE: No heading (level 0) or last section ──
  if (headingLevel === 0) {
    return { zone: 'BOILERPLATE', confidence: 0.7 };
  }
  if (sectionIndex === totalSections - 1) {
    return { zone: 'BOILERPLATE', confidence: 0.5 };
  }

  // ── 8. MAIN: Default fallback ──
  return { zone: 'MAIN', confidence: 0.6 };
}

/**
 * Assigns semantic zones to all sections in a content document.
 *
 * @param sections  - Array of sections to analyze
 * @param pageType  - The active page type template
 * @returns Array of zone assignments with section indices and confidence scores
 */
function assignZones(
  sections: SectionInput[],
  pageType: PageType
): ZoneAssignment[] {
  const totalSections = sections.length;

  return sections.map((section, index) => {
    const { zone, confidence } = assignZone(section, index, totalSections, pageType);
    return {
      sectionIndex: index,
      zone,
      confidence,
    };
  });
}

// =============================================================================
// EXPORT
// =============================================================================

export const zoneAssigner = {
  assignZones,
  assignZone,
};

export default zoneAssigner;
