/**
 * CSS Generation Engine — Thin Orchestrator
 *
 * Generates production-quality CSS from design tokens with:
 * - CSS custom properties from design personalities
 * - Component styles with proper cascade
 * - Dark mode support
 * - Responsive adjustments
 * - Animations and transitions
 *
 * Implementation is split into phase-based modules under ./css/
 *
 * @module services/publishing/cssGenerator
 */

import { resolvePersonalityToTokens, type ResolvedTokens } from './tokenResolver';
import { generateComponentStyles as generateAgencyComponentStyles } from './renderer/ComponentStyles';
import {
  generateTokenVariables,
  generateScopedReset,
  generateTypographyStyles,
  generateLayoutUtilities,
  generateComponentStyles,
  generateDarkModeStyles,
  generateResponsiveStyles,
  generateAnimations,
  generateInteractiveStyles,
  minifyCss,
} from './css';

// ============================================================================
// TYPES
// ============================================================================

export interface CssGenerationOptions {
  personalityId: string;
  darkMode?: boolean;
  minify?: boolean;
  includeReset?: boolean;
  includeAnimations?: boolean;
  customOverrides?: Partial<ResolvedTokens>;
}

export interface GeneratedCss {
  css: string;
  tokens: ResolvedTokens;
  size: number;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate complete design system CSS from personality
 */
export function generateDesignSystemCss(options: CssGenerationOptions): GeneratedCss {
  const {
    personalityId,
    darkMode = true,
    minify = false,
    includeReset = true,
    includeAnimations = true,
    customOverrides,
  } = options;

  const tokens = resolvePersonalityToTokens(personalityId);

  // Apply custom overrides
  const finalTokens = customOverrides
    ? { ...tokens, ...customOverrides }
    : tokens;

  const cssBlocks: string[] = [];

  // 1. CSS Custom Properties
  cssBlocks.push(generateTokenVariables(finalTokens));

  // 2. Scoped reset
  if (includeReset) {
    cssBlocks.push(generateScopedReset());
  }

  // 3. Typography system
  cssBlocks.push(generateTypographyStyles());

  // 4. Layout utilities
  cssBlocks.push(generateLayoutUtilities());

  // 5. Component styles
  cssBlocks.push(generateComponentStyles());

  // 6. Dark mode support
  if (darkMode) {
    cssBlocks.push(generateDarkModeStyles());
  }

  // 7. Responsive styles
  cssBlocks.push(generateResponsiveStyles());

  // 8. Animations
  if (includeAnimations) {
    cssBlocks.push(generateAnimations());
  }

  // 9. Interactive elements (FAQ, ToC)
  cssBlocks.push(generateInteractiveStyles());

  // 10. Agency-quality component styles (.card, .feature-grid, .timeline, etc.)
  // These complement the ctc-* prefixed styles with non-prefixed component CSS
  cssBlocks.push(generateAgencyComponentStyles());

  const css = cssBlocks.join('\n\n');
  const finalCss = minify ? minifyCss(css) : css;

  return {
    css: finalCss,
    tokens: finalTokens,
    size: finalCss.length,
  };
}

// Re-export utilities for backward compatibility
export { generateComponentCss } from './css/utilities';
