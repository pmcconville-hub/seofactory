/**
 * LayoutPlanner
 *
 * Determines layout parameters for content sections based on semantic weight,
 * content type, and brand Design DNA. This includes width, columns, spacing,
 * image position, and visual breaks.
 */

import { DesignDNA } from '../../types/designDna';
import {
  BreakType,
  ColumnLayout,
  ILayoutPlanner,
  ImagePosition,
  LayoutParameters,
  LayoutWidth,
  SectionAnalysis,
  VerticalSpacing,
} from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const WIDTH_ORDER: LayoutWidth[] = ['narrow', 'medium', 'wide', 'full'];
const SPACING_ORDER: VerticalSpacing[] = ['tight', 'normal', 'generous', 'dramatic'];

// Map density to base spacing
const DENSITY_TO_SPACING: Record<string, VerticalSpacing> = {
  compact: 'tight',
  comfortable: 'normal',
  spacious: 'generous',
  airy: 'dramatic',
};

// Map semantic weight to base width
const WEIGHT_TO_WIDTH: Record<number, LayoutWidth> = {
  1: 'narrow',
  2: 'narrow',
  3: 'medium',
  4: 'wide',
  5: 'full',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Clamp a value to be between min and max
 */
function clampIndex(index: number, max: number): number {
  return Math.max(0, Math.min(max, index));
}

/**
 * Bump up an item in an ordered array
 */
function bumpUp<T>(value: T, order: T[]): T {
  const index = order.indexOf(value);
  if (index === -1) return value;
  const newIndex = clampIndex(index + 1, order.length - 1);
  return order[newIndex];
}

/**
 * Bump down an item in an ordered array
 */
function bumpDown<T>(value: T, order: T[]): T {
  const index = order.indexOf(value);
  if (index === -1) return value;
  const newIndex = clampIndex(index - 1, order.length - 1);
  return order[newIndex];
}

/**
 * Round semantic weight to nearest integer for width mapping
 */
function normalizeWeight(weight: number): number {
  const rounded = Math.round(weight);
  return Math.max(1, Math.min(5, rounded));
}

// =============================================================================
// LAYOUT PLANNER CLASS
// =============================================================================

export class LayoutPlanner implements ILayoutPlanner {
  /**
   * Determine width based on semantic weight and brand density
   */
  private static determineWidth(analysis: SectionAnalysis, dna?: DesignDNA): LayoutWidth {
    // Tables always need wide width to display properly
    if (analysis.hasTable) {
      return 'wide';
    }

    // Get base width from semantic weight
    const normalizedWeight = normalizeWeight(analysis.semanticWeight);
    let width = WEIGHT_TO_WIDTH[normalizedWeight] || 'medium';

    // Adjust based on brand density preference
    if (dna?.spacing?.density) {
      const density = dna.spacing.density;
      if (density === 'spacious' || density === 'airy') {
        width = bumpUp(width, WIDTH_ORDER);
      } else if (density === 'compact') {
        width = bumpDown(width, WIDTH_ORDER);
      }
    }

    return width;
  }

  /**
   * Determine column layout based on content type and brand preferences
   */
  private static determineColumns(analysis: SectionAnalysis, dna?: DesignDNA): ColumnLayout {
    // FS-protected sections must always be single column
    if (analysis.formatCode === 'FS' || analysis.constraints?.fsTarget) {
      return '1-column';
    }

    // Tables need full width - single column
    if (analysis.hasTable) {
      return '1-column';
    }

    // Comparison content -> 2 columns
    if (analysis.contentType === 'comparison') {
      return '2-column';
    }

    // Supporting evidence with asymmetric brand -> main-sidebar layout
    if (
      analysis.contentZone === 'SUPPLEMENTARY' &&
      analysis.semanticWeight <= 2 &&
      dna?.layout?.gridStyle === 'asymmetric'
    ) {
      return 'asymmetric-right';
    }

    // FAQ with weight >= 3 -> 2 columns
    if (analysis.contentType === 'faq' && analysis.semanticWeight >= 3) {
      return '2-column';
    }

    // Default to single column
    return '1-column';
  }

  /**
   * Determine vertical spacing based on brand density and semantic weight
   */
  private static determineSpacing(analysis: SectionAnalysis, dna?: DesignDNA): VerticalSpacing {
    // Get base spacing from brand density
    let spacing: VerticalSpacing = 'normal';

    if (dna?.spacing?.density) {
      spacing = DENSITY_TO_SPACING[dna.spacing.density] || 'normal';
    }

    // Upgrade spacing for hero sections (weight 5)
    if (analysis.semanticWeight >= 5) {
      spacing = bumpUp(spacing, SPACING_ORDER);
    }

    // Downgrade spacing for minimal sections (weight <= 2)
    if (analysis.semanticWeight <= 2) {
      spacing = bumpDown(spacing, SPACING_ORDER);
    }

    return spacing;
  }

  /**
   * Determine visual breaks before/after section
   */
  private static determineBreaks(
    analysis: SectionAnalysis,
    _dna?: DesignDNA
  ): { breakBefore: BreakType; breakAfter: BreakType } {
    let breakBefore: BreakType = 'none';
    let breakAfter: BreakType = 'none';

    // Add hard break after hero sections (weight 5)
    if (analysis.semanticWeight >= 5) {
      breakAfter = 'hard';
    }

    // Add soft break before high-importance CTA-style sections
    if (analysis.semanticWeight >= 4 && analysis.contentType === 'summary') {
      breakBefore = 'soft';
    }

    return { breakBefore, breakAfter };
  }

  /**
   * Determine image position based on content and brand preferences
   */
  private static determineImagePosition(analysis: SectionAnalysis, dna?: DesignDNA): ImagePosition {
    // No image in section
    if (!analysis.hasImage) {
      return 'none';
    }

    // Hero sections with images
    if (analysis.semanticWeight >= 5) {
      // Check if brand uses background images/overlays
      if (dna?.effects?.backgrounds?.usesOverlays) {
        return 'background';
      }
      return 'above';
    }

    // Lists with images - inline to avoid breaking list flow
    if (analysis.hasList) {
      return 'inline';
    }

    // Standard sections - left float
    return 'left';
  }

  /**
   * Determine text alignment based on brand and section type
   */
  private static determineTextAlignment(
    analysis: SectionAnalysis,
    dna?: DesignDNA
  ): 'left' | 'center' | 'justify' {
    // Hero sections are centered
    if (analysis.semanticWeight >= 5) {
      return 'center';
    }

    // Respect brand alignment preference
    if (dna?.layout?.alignment === 'center') {
      return 'center';
    }

    // Default to left
    return 'left';
  }

  /**
   * Plan layout for a single section
   */
  static planLayout(analysis: SectionAnalysis, dna?: DesignDNA): LayoutParameters {
    const width = LayoutPlanner.determineWidth(analysis, dna);
    const columns = LayoutPlanner.determineColumns(analysis, dna);
    const spacing = LayoutPlanner.determineSpacing(analysis, dna);
    const { breakBefore, breakAfter } = LayoutPlanner.determineBreaks(analysis, dna);
    const imagePosition = LayoutPlanner.determineImagePosition(analysis, dna);
    const alignText = LayoutPlanner.determineTextAlignment(analysis, dna);

    return {
      width,
      columns,
      imagePosition,
      verticalSpacingBefore: spacing,
      verticalSpacingAfter: spacing,
      breakBefore,
      breakAfter,
      alignText,
    };
  }

  /**
   * Plan layouts for all sections
   */
  static planAllLayouts(analyses: SectionAnalysis[], dna?: DesignDNA): LayoutParameters[] {
    return analyses.map((analysis) => LayoutPlanner.planLayout(analysis, dna));
  }

  // Instance methods that delegate to static methods
  planLayout(analysis: SectionAnalysis, dna?: DesignDNA): LayoutParameters {
    return LayoutPlanner.planLayout(analysis, dna);
  }

  planAllLayouts(analyses: SectionAnalysis[], dna?: DesignDNA): LayoutParameters[] {
    return LayoutPlanner.planAllLayouts(analyses, dna);
  }
}

export default LayoutPlanner;
