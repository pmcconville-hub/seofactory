// services/styleguide-generator/integration/auditBridge.ts
// Bridges DesignTokenSet into audit-consumable format.
//
// The audit system currently doesn't consume brand tokens directly,
// but this bridge provides utility functions for audit phases that
// want to check visual consistency against the brand design system.

import type { DesignTokenSet, ColorScale } from '../types';

/**
 * Brand color expectations for visual consistency checks.
 * Can be used by audit rules to flag off-brand colors.
 */
export interface BrandColorExpectations {
  /** Primary brand hex (the 400 step) */
  primaryHex: string;
  /** All valid primary shades */
  primaryShades: string[];
  /** Secondary brand hex (if exists) */
  secondaryHex?: string;
  /** Semantic colors */
  successHex: string;
  errorHex: string;
  warningHex: string;
  infoHex: string;
}

/**
 * Brand typography expectations for consistency checks.
 */
export interface BrandTypographyExpectations {
  headingFontFamily: string;
  bodyFontFamily: string;
  /** Expected Google Fonts URL (for checking it's included) */
  googleFontsUrl: string;
}

/**
 * Extract color expectations from DesignTokenSet for audit rules.
 */
export function getColorExpectations(tokens: DesignTokenSet): BrandColorExpectations {
  return {
    primaryHex: tokens.colors.primary[400],
    primaryShades: Object.values(tokens.colors.primary),
    secondaryHex: tokens.colors.secondary?.[400],
    successHex: tokens.colors.semantic.success,
    errorHex: tokens.colors.semantic.error,
    warningHex: tokens.colors.semantic.warning,
    infoHex: tokens.colors.semantic.info,
  };
}

/**
 * Extract typography expectations from DesignTokenSet for audit rules.
 */
export function getTypographyExpectations(tokens: DesignTokenSet): BrandTypographyExpectations {
  return {
    headingFontFamily: tokens.typography.headingFont,
    bodyFontFamily: tokens.typography.bodyFont,
    googleFontsUrl: tokens.typography.googleFontsUrl,
  };
}

/**
 * Check if a given hex color is within the brand's color palette.
 * Useful for audit rules that detect off-brand colors in published content.
 */
export function isOnBrandColor(hex: string, tokens: DesignTokenSet): boolean {
  const normalizedHex = hex.toLowerCase();

  // Check all color scales
  const scales: (ColorScale | undefined)[] = [
    tokens.colors.primary,
    tokens.colors.secondary,
    tokens.colors.accent,
    tokens.colors.gray,
  ];

  for (const scale of scales) {
    if (!scale) continue;
    for (const value of Object.values(scale)) {
      if (value.toLowerCase() === normalizedHex) return true;
    }
  }

  // Check semantic colors
  for (const value of Object.values(tokens.colors.semantic)) {
    if (value.toLowerCase() === normalizedHex) return true;
  }

  // Common neutral colors are always on-brand
  const neutrals = ['#ffffff', '#000000', '#fff', '#000', 'transparent'];
  if (neutrals.includes(normalizedHex)) return true;

  return false;
}

/**
 * Check if a given font family matches the brand's typography.
 */
export function isOnBrandFont(fontFamily: string, tokens: DesignTokenSet): boolean {
  const normalizedFont = fontFamily.toLowerCase().replace(/['"]/g, '');
  const headingFont = tokens.typography.headingFont.toLowerCase();
  const bodyFont = tokens.typography.bodyFont.toLowerCase();

  // Check if the font family appears in either heading or body font stack
  return headingFont.includes(normalizedFont) || bodyFont.includes(normalizedFont)
    || normalizedFont.includes('system-ui') || normalizedFont.includes('sans-serif')
    || normalizedFont.includes('serif');
}
