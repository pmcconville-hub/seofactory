// services/styleguide-generator/integration/rendererBridge.ts
// Bridges DesignTokenSet into the blueprint renderer's expected formats.
//
// The renderer accepts:
//   1. brandDesignSystem.compiledCss (preferred)
//   2. designTokens: { colors, fonts } (legacy fallback)
//
// This bridge generates compiled CSS from DesignTokenSet, giving the renderer
// richer styling than either path currently provides.

import type { DesignTokenSet } from '../types';

/**
 * Legacy designTokens format that blueprintRenderer already understands.
 */
export interface RendererDesignTokens {
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    surface?: string;
    text?: string;
    textMuted?: string;
    border?: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
  };
}

/**
 * Convert DesignTokenSet to the renderer's legacy designTokens format.
 * Use this when passing tokens to blueprintRenderer.render({ designTokens }).
 */
export function toRendererTokens(tokens: DesignTokenSet): RendererDesignTokens {
  return {
    colors: {
      primary: tokens.colors.primary[400],
      secondary: tokens.colors.secondary?.[400],
      accent: tokens.colors.accent?.[400],
      background: '#ffffff',
      surface: tokens.colors.gray[50],
      text: tokens.colors.gray[900],
      textMuted: tokens.colors.gray[500],
      border: tokens.colors.gray[200],
    },
    fonts: {
      heading: tokens.typography.headingFont,
      body: tokens.typography.bodyFont,
    },
  };
}

/**
 * Generate compiled CSS from DesignTokenSet.
 * This produces a complete CSS stylesheet with custom properties, typography,
 * button styles, card styles, and layout utilities — all using the brand prefix.
 *
 * Use this to create a BrandDesignSystem-compatible compiledCss string.
 */
export function generateCompiledCss(tokens: DesignTokenSet): string {
  const p = tokens.prefix;
  const parts: string[] = [];

  // ─── CSS Custom Properties ────────────────────────────────────────
  parts.push(`:root {
  /* Primary Colors */
  --${p}-primary-50: ${tokens.colors.primary[50]};
  --${p}-primary-100: ${tokens.colors.primary[100]};
  --${p}-primary-200: ${tokens.colors.primary[200]};
  --${p}-primary-300: ${tokens.colors.primary[300]};
  --${p}-primary-400: ${tokens.colors.primary[400]};
  --${p}-primary-500: ${tokens.colors.primary[500]};
  --${p}-primary-600: ${tokens.colors.primary[600]};
  --${p}-primary-700: ${tokens.colors.primary[700]};
  --${p}-primary-800: ${tokens.colors.primary[800]};
  --${p}-primary-900: ${tokens.colors.primary[900]};

  /* Gray */
  --${p}-gray-50: ${tokens.colors.gray[50]};
  --${p}-gray-100: ${tokens.colors.gray[100]};
  --${p}-gray-200: ${tokens.colors.gray[200]};
  --${p}-gray-300: ${tokens.colors.gray[300]};
  --${p}-gray-400: ${tokens.colors.gray[400]};
  --${p}-gray-500: ${tokens.colors.gray[500]};
  --${p}-gray-600: ${tokens.colors.gray[600]};
  --${p}-gray-700: ${tokens.colors.gray[700]};
  --${p}-gray-800: ${tokens.colors.gray[800]};
  --${p}-gray-900: ${tokens.colors.gray[900]};

  /* Semantic */
  --${p}-success: ${tokens.colors.semantic.success};
  --${p}-error: ${tokens.colors.semantic.error};
  --${p}-warning: ${tokens.colors.semantic.warning};
  --${p}-info: ${tokens.colors.semantic.info};

  /* Typography */
  --${p}-font-heading: ${tokens.typography.headingFont};
  --${p}-font-body: ${tokens.typography.bodyFont};

  /* Spacing */
  --${p}-space-xs: ${tokens.spacing.xs};
  --${p}-space-sm: ${tokens.spacing.sm};
  --${p}-space-md: ${tokens.spacing.md};
  --${p}-space-lg: ${tokens.spacing.lg};
  --${p}-space-xl: ${tokens.spacing.xl};
  --${p}-space-2xl: ${tokens.spacing['2xl']};
  --${p}-space-3xl: ${tokens.spacing['3xl']};
  --${p}-space-4xl: ${tokens.spacing['4xl']};

  /* Radius */
  --${p}-radius-sm: ${tokens.radius.sm};
  --${p}-radius-md: ${tokens.radius.md};
  --${p}-radius-lg: ${tokens.radius.lg};

  /* Shadows */
  --${p}-shadow-sm: ${tokens.shadows.sm};
  --${p}-shadow-md: ${tokens.shadows.md};
  --${p}-shadow-lg: ${tokens.shadows.lg};
  --${p}-shadow-colored: ${tokens.shadows.colored};

  /* Transitions */
  --${p}-transition-fast: ${tokens.transitions.fast};
  --${p}-transition-base: ${tokens.transitions.base};
}`);

  // ─── Typography ───────────────────────────────────────────────────
  parts.push(`
/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--${p}-font-heading);
  line-height: 1.25;
}
body, p, li, td {
  font-family: var(--${p}-font-body);
  line-height: 1.6;
  color: var(--${p}-gray-800);
}
h1 { font-size: ${tokens.typography.sizes.h1.size}; font-weight: ${tokens.typography.sizes.h1.weight}; letter-spacing: ${tokens.typography.sizes.h1.letterSpacing}; }
h2 { font-size: ${tokens.typography.sizes.h2.size}; font-weight: ${tokens.typography.sizes.h2.weight}; letter-spacing: ${tokens.typography.sizes.h2.letterSpacing}; }
h3 { font-size: ${tokens.typography.sizes.h3.size}; font-weight: ${tokens.typography.sizes.h3.weight}; }
h4 { font-size: ${tokens.typography.sizes.h4.size}; font-weight: ${tokens.typography.sizes.h4.weight}; }
h5 { font-size: ${tokens.typography.sizes.h5.size}; font-weight: ${tokens.typography.sizes.h5.weight}; }
h6 { font-size: ${tokens.typography.sizes.h6.size}; font-weight: ${tokens.typography.sizes.h6.weight}; }`);

  // ─── Buttons ──────────────────────────────────────────────────────
  parts.push(`
/* Buttons */
.${p}-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--${p}-space-sm);
  padding: var(--${p}-space-sm) var(--${p}-space-lg);
  border-radius: var(--${p}-radius-md);
  font-family: var(--${p}-font-body);
  font-weight: 600;
  font-size: 0.875rem;
  line-height: 1.5;
  cursor: pointer;
  transition: all var(--${p}-transition-fast);
  border: 2px solid transparent;
}
.${p}-btn-primary {
  background: var(--${p}-primary-400);
  color: #fff;
}
.${p}-btn-primary:hover {
  background: var(--${p}-primary-500);
  box-shadow: var(--${p}-shadow-colored);
}
.${p}-btn-secondary {
  background: var(--${p}-gray-100);
  color: var(--${p}-gray-800);
  border-color: var(--${p}-gray-200);
}
.${p}-btn-secondary:hover {
  background: var(--${p}-gray-200);
}
.${p}-btn-outline {
  background: transparent;
  color: var(--${p}-primary-400);
  border-color: var(--${p}-primary-400);
}
.${p}-btn-outline:hover {
  background: var(--${p}-primary-50);
}`);

  // ─── Cards ────────────────────────────────────────────────────────
  parts.push(`
/* Cards */
.${p}-card {
  background: #fff;
  border-radius: var(--${p}-radius-lg);
  box-shadow: var(--${p}-shadow-md);
  overflow: hidden;
  transition: box-shadow var(--${p}-transition-base);
}
.${p}-card:hover {
  box-shadow: var(--${p}-shadow-lg);
}
.${p}-card-body {
  padding: var(--${p}-space-lg);
}`);

  // ─── Alerts ───────────────────────────────────────────────────────
  parts.push(`
/* Alerts */
.${p}-alert {
  padding: var(--${p}-space-md) var(--${p}-space-lg);
  border-radius: var(--${p}-radius-md);
  border-left: 4px solid;
  margin-bottom: var(--${p}-space-md);
}
.${p}-alert-success { border-color: var(--${p}-success); background: color-mix(in srgb, var(--${p}-success) 10%, #fff); }
.${p}-alert-error { border-color: var(--${p}-error); background: color-mix(in srgb, var(--${p}-error) 10%, #fff); }
.${p}-alert-warning { border-color: var(--${p}-warning); background: color-mix(in srgb, var(--${p}-warning) 10%, #fff); }
.${p}-alert-info { border-color: var(--${p}-info); background: color-mix(in srgb, var(--${p}-info) 10%, #fff); }`);

  return parts.join('\n');
}

/**
 * Create a BrandDesignSystem-compatible object from DesignTokenSet.
 * This can be passed directly to blueprintRenderer as options.brandDesignSystem.
 */
export function toBrandDesignSystem(
  tokens: DesignTokenSet,
  brandName: string,
  domain: string,
): {
  compiledCss: string;
  brandName: string;
  sourceUrl: string;
  generatedAt: string;
} {
  return {
    compiledCss: generateCompiledCss(tokens),
    brandName,
    sourceUrl: domain,
    generatedAt: new Date().toISOString(),
  };
}
