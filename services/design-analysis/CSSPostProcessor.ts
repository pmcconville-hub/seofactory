// services/design-analysis/CSSPostProcessor.ts
/**
 * CSS Post-Processor for Brand Design System
 *
 * Fixes common issues with AI-generated CSS:
 * 1. Strips duplicate/rogue :root declarations from component CSS
 * 2. Normalizes CSS variable names to match defined tokens
 * 3. Logs warnings for undefined variables
 * 4. Ensures brand colors are not overwritten
 */

export interface CSSPostProcessorConfig {
  /** The defined CSS tokens from generateTokensFromDNA */
  definedTokens: Record<string, string>;
  /** Log warnings for undefined variables */
  logWarnings?: boolean;
}

export interface PostProcessResult {
  css: string;
  warnings: string[];
  normalizedCount: number;
  strippedRootCount: number;
  deduplicatedCount: number;
}

/**
 * Map of common AI-generated variable names to their correct equivalents
 */
const VARIABLE_NORMALIZATION_MAP: Record<string, string> = {
  // Neutral color scale (numeric to named)
  '--ctc-neutral-0': '--ctc-neutral-lightest',
  '--ctc-neutral-1': '--ctc-neutral-lightest',
  '--ctc-neutral-2': '--ctc-neutral-light',
  '--ctc-neutral-3': '--ctc-neutral-light',
  '--ctc-neutral-4': '--ctc-neutral-medium',
  '--ctc-neutral-5': '--ctc-neutral-medium',
  '--ctc-neutral-6': '--ctc-neutral-dark',
  '--ctc-neutral-7': '--ctc-neutral-darkest',
  '--ctc-neutral-8': '--ctc-neutral-darkest',
  '--ctc-neutral-9': '--ctc-neutral-darkest',
  // Tailwind-style neutral scale
  '--ctc-neutral-50': '--ctc-neutral-lightest',
  '--ctc-neutral-100': '--ctc-neutral-lightest',
  '--ctc-neutral-200': '--ctc-neutral-light',
  '--ctc-neutral-300': '--ctc-neutral-light',
  '--ctc-neutral-400': '--ctc-neutral-medium',
  '--ctc-neutral-500': '--ctc-neutral-medium',
  '--ctc-neutral-600': '--ctc-neutral-dark',
  '--ctc-neutral-700': '--ctc-neutral-dark',
  '--ctc-neutral-800': '--ctc-neutral-darkest',
  '--ctc-neutral-900': '--ctc-neutral-darkest',
  '--ctc-neutral-950': '--ctc-neutral-darkest',
  // Spacing scale (numeric to named)
  '--ctc-spacing-0': '0',
  '--ctc-spacing-1': '--ctc-spacing-xs',
  '--ctc-spacing-2': '--ctc-spacing-sm',
  '--ctc-spacing-3': '--ctc-spacing-md',
  '--ctc-spacing-4': '--ctc-spacing-lg',
  '--ctc-spacing-5': '--ctc-spacing-xl',
  '--ctc-spacing-6': '--ctc-spacing-2xl',
  '--ctc-spacing-7': '--ctc-spacing-2xl',
  '--ctc-spacing-8': '--ctc-spacing-3xl',
  '--ctc-spacing-9': '--ctc-spacing-3xl',
  '--ctc-spacing-10': '--ctc-spacing-3xl',
  '--ctc-spacing-11': '--ctc-spacing-3xl',
  '--ctc-spacing-12': '--ctc-spacing-3xl',
  '--ctc-spacing-14': '--ctc-spacing-3xl',
  '--ctc-spacing-16': '--ctc-spacing-3xl',
  '--ctc-spacing-20': '--ctc-spacing-3xl',
  '--ctc-spacing-24': '--ctc-spacing-3xl',
  // Tailwind-style spacing
  '--ctc-space-0': '0',
  '--ctc-space-1': '--ctc-spacing-xs',
  '--ctc-space-2': '--ctc-spacing-sm',
  '--ctc-space-3': '--ctc-spacing-md',
  '--ctc-space-4': '--ctc-spacing-lg',
  '--ctc-space-5': '--ctc-spacing-xl',
  '--ctc-space-6': '--ctc-spacing-2xl',
  '--ctc-space-8': '--ctc-spacing-3xl',
  // Border radius scale (numeric to named)
  '--ctc-radius-0': '0',
  '--ctc-radius-1': '--ctc-radius-sm',
  '--ctc-radius-2': '--ctc-radius-md',
  '--ctc-radius-3': '--ctc-radius-lg',
  '--ctc-radius-4': '--ctc-radius-full',
  '--ctc-rounded-none': '0',
  '--ctc-rounded-sm': '--ctc-radius-sm',
  '--ctc-rounded': '--ctc-radius-md',
  '--ctc-rounded-md': '--ctc-radius-md',
  '--ctc-rounded-lg': '--ctc-radius-lg',
  '--ctc-rounded-xl': '--ctc-radius-lg',
  '--ctc-rounded-full': '--ctc-radius-full',
  // Shadow scale
  '--ctc-shadow-sm': '--ctc-shadow-button',
  '--ctc-shadow-md': '--ctc-shadow-card',
  '--ctc-shadow-lg': '--ctc-shadow-elevated',
  '--ctc-shadow-xl': '--ctc-shadow-elevated',
  '--ctc-shadow-none': 'none',
  // Font aliases
  '--ctc-font-sans': '--ctc-font-body',
  '--ctc-font-serif': '--ctc-font-heading',
  '--ctc-font-display': '--ctc-font-heading',
  '--ctc-font-mono': 'monospace',
  // Text color aliases
  '--ctc-text': '--ctc-neutral-darkest',
  '--ctc-text-primary': '--ctc-neutral-darkest',
  '--ctc-text-secondary': '--ctc-neutral-dark',
  '--ctc-text-muted': '--ctc-neutral-medium',
  '--ctc-text-light': '--ctc-neutral-light',
  // Background aliases
  '--ctc-bg': '--ctc-neutral-lightest',
  '--ctc-bg-primary': '--ctc-primary',
  '--ctc-bg-secondary': '--ctc-secondary',
  '--ctc-bg-muted': '--ctc-neutral-light',
  // Border aliases
  '--ctc-border': '--ctc-neutral-light',
  '--ctc-border-light': '--ctc-neutral-lightest',
  '--ctc-border-dark': '--ctc-neutral-medium',
};

/**
 * Valid CSS variable names that should exist in the design system
 */
const VALID_VARIABLE_NAMES = new Set([
  // Colors
  '--ctc-primary', '--ctc-primary-light', '--ctc-primary-dark',
  '--ctc-secondary', '--ctc-accent',
  '--ctc-neutral-darkest', '--ctc-neutral-dark', '--ctc-neutral-medium',
  '--ctc-neutral-light', '--ctc-neutral-lightest',
  '--ctc-success', '--ctc-warning', '--ctc-error', '--ctc-info',
  // Typography
  '--ctc-font-heading', '--ctc-font-body',
  '--ctc-font-size-base', '--ctc-font-scale-ratio',
  '--ctc-heading-weight', '--ctc-body-weight', '--ctc-body-line-height',
  '--ctc-font-size-xs', '--ctc-font-size-sm', '--ctc-font-size-md',
  '--ctc-font-size-lg', '--ctc-font-size-xl', '--ctc-font-size-2xl', '--ctc-font-size-3xl',
  // Spacing
  '--ctc-spacing-unit',
  '--ctc-spacing-xs', '--ctc-spacing-sm', '--ctc-spacing-md',
  '--ctc-spacing-lg', '--ctc-spacing-xl', '--ctc-spacing-2xl', '--ctc-spacing-3xl',
  // Border radius
  '--ctc-radius-sm', '--ctc-radius-md', '--ctc-radius-lg', '--ctc-radius-full',
  // Shadows
  '--ctc-shadow-card', '--ctc-shadow-button', '--ctc-shadow-elevated',
  // Motion
  '--ctc-transition-speed', '--ctc-easing',
]);

export class CSSPostProcessor {
  private config: CSSPostProcessorConfig;
  private warnings: string[] = [];

  constructor(config: CSSPostProcessorConfig) {
    this.config = config;
  }

  /**
   * Process CSS to fix common AI-generated issues
   */
  process(css: string): PostProcessResult {
    this.warnings = [];
    let normalizedCount = 0;
    let strippedRootCount = 0;
    let deduplicatedCount = 0;

    // Step 1: Strip rogue :root declarations (keep only the first one)
    const rootStrippedResult = this.stripExtraRootDeclarations(css);
    css = rootStrippedResult.css;
    strippedRootCount = rootStrippedResult.strippedCount;

    // Step 2: Normalize CSS variable names
    const normalizeResult = this.normalizeVariableNames(css);
    css = normalizeResult.css;
    normalizedCount = normalizeResult.normalizedCount;

    // Step 3: Deduplicate CSS selectors (merge identical selectors)
    const dedupeResult = this.deduplicateSelectors(css);
    css = dedupeResult.css;
    deduplicatedCount = dedupeResult.deduplicatedCount;

    // Step 4: Find and warn about undefined variables
    this.findUndefinedVariables(css);

    return {
      css,
      warnings: this.warnings,
      normalizedCount,
      strippedRootCount,
      deduplicatedCount,
    };
  }

  /**
   * Deduplicate CSS selectors by merging blocks with the same selector.
   * AI often generates multiple blocks for .section, .card, etc. across component styles.
   * Later properties override earlier ones (CSS cascade preserved).
   */
  private deduplicateSelectors(css: string): { css: string; deduplicatedCount: number } {
    // Parse CSS into blocks: { selector, properties, comment }
    // Handles comments before blocks and @media queries (kept as-is)
    const blocks: Array<{ selector: string; properties: string; raw: string; isAtRule: boolean; comment?: string }> = [];

    // Split into rule blocks - handles nested braces for @media
    let remaining = css;
    let deduplicatedCount = 0;

    while (remaining.trim()) {
      remaining = remaining.trim();

      // Preserve comments
      if (remaining.startsWith('/*')) {
        const endComment = remaining.indexOf('*/');
        if (endComment === -1) break;
        const comment = remaining.substring(0, endComment + 2);
        remaining = remaining.substring(endComment + 2).trim();
        blocks.push({ selector: '', properties: '', raw: comment, isAtRule: false, comment });
        continue;
      }

      // Find the opening brace
      const braceIdx = remaining.indexOf('{');
      if (braceIdx === -1) {
        // No more blocks, preserve remaining text
        if (remaining.trim()) {
          blocks.push({ selector: '', properties: '', raw: remaining.trim(), isAtRule: false });
        }
        break;
      }

      const selector = remaining.substring(0, braceIdx).trim();

      // Handle @media and other at-rules (don't deduplicate these)
      if (selector.startsWith('@')) {
        // Find matching closing brace (handle nesting)
        let depth = 0;
        let endIdx = braceIdx;
        for (let i = braceIdx; i < remaining.length; i++) {
          if (remaining[i] === '{') depth++;
          else if (remaining[i] === '}') {
            depth--;
            if (depth === 0) {
              endIdx = i;
              break;
            }
          }
        }
        const raw = remaining.substring(0, endIdx + 1);
        blocks.push({ selector, properties: '', raw, isAtRule: true });
        remaining = remaining.substring(endIdx + 1);
        continue;
      }

      // Regular selector - find closing brace
      const closeIdx = remaining.indexOf('}', braceIdx);
      if (closeIdx === -1) break;

      const properties = remaining.substring(braceIdx + 1, closeIdx).trim();
      const raw = remaining.substring(0, closeIdx + 1);
      blocks.push({ selector, properties, raw, isAtRule: false });
      remaining = remaining.substring(closeIdx + 1);
    }

    // Group non-at-rule blocks by selector and merge
    const selectorMap = new Map<string, { properties: Map<string, string>; firstIndex: number }>();
    const output: string[] = [];
    const merged = new Set<number>();

    // First pass: identify duplicates
    blocks.forEach((block, idx) => {
      if (block.isAtRule || block.comment || !block.selector) return;

      const normalizedSelector = block.selector.replace(/\s+/g, ' ');
      if (selectorMap.has(normalizedSelector)) {
        // Merge properties into existing entry
        const existing = selectorMap.get(normalizedSelector)!;
        this.parseProperties(block.properties).forEach((value, prop) => {
          existing.properties.set(prop, value);
        });
        merged.add(idx);
        deduplicatedCount++;
      } else {
        selectorMap.set(normalizedSelector, {
          properties: this.parseProperties(block.properties),
          firstIndex: idx,
        });
      }
    });

    if (deduplicatedCount === 0) {
      return { css, deduplicatedCount: 0 };
    }

    // Second pass: output blocks in order, with merged properties at first occurrence
    blocks.forEach((block, idx) => {
      if (merged.has(idx)) return; // Skip duplicate blocks

      if (block.isAtRule || block.comment || !block.selector) {
        output.push(block.raw);
        return;
      }

      const normalizedSelector = block.selector.replace(/\s+/g, ' ');
      const entry = selectorMap.get(normalizedSelector);
      if (entry && entry.firstIndex === idx) {
        // Output merged properties
        const propsStr = Array.from(entry.properties.entries())
          .map(([prop, val]) => `  ${prop}: ${val};`)
          .join('\n');
        output.push(`${block.selector} {\n${propsStr}\n}`);
      } else {
        output.push(block.raw);
      }
    });

    if (deduplicatedCount > 0 && this.config.logWarnings) {
      this.warnings.push(`Deduplicated ${deduplicatedCount} CSS selector blocks`);
    }

    return {
      css: output.join('\n\n'),
      deduplicatedCount,
    };
  }

  /**
   * Parse CSS properties from a block body into a Map
   */
  private parseProperties(propertiesStr: string): Map<string, string> {
    const props = new Map<string, string>();
    if (!propertiesStr) return props;

    // Split by semicolons, handling multi-line values
    const declarations = propertiesStr.split(';').filter(d => d.trim());
    for (const decl of declarations) {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) continue;
      const prop = decl.substring(0, colonIdx).trim();
      const value = decl.substring(colonIdx + 1).trim();
      if (prop && value) {
        props.set(prop, value);
      }
    }
    return props;
  }

  /**
   * Strip extra :root declarations, keeping only the first one
   * This prevents AI-generated component CSS from overwriting brand tokens
   */
  private stripExtraRootDeclarations(css: string): { css: string; strippedCount: number } {
    // Match all :root blocks
    const rootPattern = /:root\s*\{[^}]*\}/g;
    const matches = css.match(rootPattern);

    if (!matches || matches.length <= 1) {
      return { css, strippedCount: 0 };
    }

    // Keep the first :root, remove the rest
    let firstRootFound = false;
    const processedCss = css.replace(rootPattern, (match) => {
      if (!firstRootFound) {
        firstRootFound = true;
        return match;
      }
      this.warnings.push(`Stripped duplicate :root declaration that would overwrite brand tokens`);
      return '/* [CSSPostProcessor] Stripped duplicate :root declaration */';
    });

    return {
      css: processedCss,
      strippedCount: matches.length - 1,
    };
  }

  /**
   * Normalize CSS variable names to match defined tokens
   */
  private normalizeVariableNames(css: string): { css: string; normalizedCount: number } {
    let normalizedCount = 0;

    // Find all var() usages
    const varPattern = /var\(\s*(--ctc-[a-zA-Z0-9-]+)\s*(?:,\s*([^)]+))?\s*\)/g;

    const processedCss = css.replace(varPattern, (match, varName, fallback) => {
      // Check if this variable needs normalization
      const normalized = VARIABLE_NORMALIZATION_MAP[varName];

      if (normalized) {
        normalizedCount++;
        // If the normalized value is a literal (not a variable), use it directly
        if (!normalized.startsWith('--')) {
          return normalized;
        }
        // Otherwise, use the normalized variable name
        if (fallback) {
          return `var(${normalized}, ${fallback})`;
        }
        return `var(${normalized})`;
      }

      return match;
    });

    if (normalizedCount > 0 && this.config.logWarnings) {
      this.warnings.push(`Normalized ${normalizedCount} CSS variable names to match design tokens`);
    }

    return { css: processedCss, normalizedCount };
  }

  /**
   * Find and log warnings for undefined CSS variables
   */
  private findUndefinedVariables(css: string): void {
    const varPattern = /var\(\s*(--ctc-[a-zA-Z0-9-]+)\s*(?:,\s*[^)]+)?\s*\)/g;
    const undefinedVars = new Set<string>();

    let match;
    while ((match = varPattern.exec(css)) !== null) {
      const varName = match[1];
      // Skip if it's a valid variable or has been normalized
      if (!VALID_VARIABLE_NAMES.has(varName) && !VARIABLE_NORMALIZATION_MAP[varName]) {
        undefinedVars.add(varName);
      }
    }

    if (undefinedVars.size > 0 && this.config.logWarnings) {
      this.warnings.push(`Found ${undefinedVars.size} undefined CSS variables: ${Array.from(undefinedVars).join(', ')}`);
    }
  }

  /**
   * Validate that critical brand colors are preserved
   */
  validateBrandColors(css: string, expectedPrimary: string): boolean {
    // Check if the first :root contains the expected primary color
    const rootMatch = css.match(/:root\s*\{([^}]*)\}/);
    if (!rootMatch) return false;

    const rootContent = rootMatch[1];
    const primaryMatch = rootContent.match(/--ctc-primary:\s*([^;]+)/);

    if (!primaryMatch) return false;

    const actualPrimary = primaryMatch[1].trim().toLowerCase();
    const expected = expectedPrimary.toLowerCase();

    return actualPrimary === expected;
  }
}

/**
 * Quick function to post-process CSS
 */
export function postProcessCSS(
  css: string,
  definedTokens: Record<string, string>,
  logWarnings = true
): PostProcessResult {
  const processor = new CSSPostProcessor({ definedTokens, logWarnings });
  return processor.process(css);
}
