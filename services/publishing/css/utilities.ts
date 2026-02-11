/**
 * CSS Utility Functions
 *
 * Provides CSS minification and component-specific CSS generation.
 *
 * @module services/publishing/css/utilities
 */

/**
 * Minify CSS by removing comments and excess whitespace
 */
export function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/\s*([{}:;,])\s*/g, '$1') // Remove space around delimiters
    .replace(/;}/g, '}') // Remove last semicolon
    .trim();
}

/**
 * Generate CSS for a specific component only
 */
export function generateComponentCss(componentName: string): string {
  const componentMap: Record<string, () => string> = {
    button: () => `
.ctc-btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--ctc-space-2); font-weight: 600; transition: all var(--ctc-duration-fast) var(--ctc-ease-default); cursor: pointer; text-decoration: none; border: none; }
.ctc-btn--primary { background: var(--ctc-primary); color: var(--ctc-text-inverse); }
.ctc-btn--primary:hover { background: var(--ctc-primary-dark); }
`,
    hero: () => `
.ctc-hero { position: relative; overflow: hidden; }
.ctc-hero--gradient { background: var(--ctc-gradient-hero); color: var(--ctc-text-inverse); }
`,
    card: () => `
.ctc-card { background: var(--ctc-surface); border-radius: var(--ctc-radius-xl); transition: all var(--ctc-duration-fast) var(--ctc-ease-default); }
.ctc-card--raised { box-shadow: var(--ctc-shadow-md); }
`,
  };

  return componentMap[componentName]?.() || '';
}
