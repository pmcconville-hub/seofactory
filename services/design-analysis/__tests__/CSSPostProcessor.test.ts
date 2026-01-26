// services/design-analysis/__tests__/CSSPostProcessor.test.ts
/**
 * Unit tests for CSSPostProcessor
 *
 * Tests that the post-processor correctly:
 * 1. Strips duplicate :root declarations
 * 2. Normalizes CSS variable names
 * 3. Detects undefined variables
 */

import { describe, it, expect } from 'vitest';
import { CSSPostProcessor, postProcessCSS } from '../CSSPostProcessor';

const SAMPLE_TOKENS: Record<string, string> = {
  '--ctc-primary': '#00637B',
  '--ctc-neutral-darkest': '#000000',
  '--ctc-neutral-dark': '#333333',
  '--ctc-neutral-medium': '#666666',
  '--ctc-neutral-light': '#999999',
  '--ctc-neutral-lightest': '#F0F8FF',
  '--ctc-spacing-xs': '2px',
  '--ctc-spacing-sm': '4px',
  '--ctc-spacing-md': '8px',
  '--ctc-spacing-lg': '12px',
  '--ctc-spacing-xl': '16px',
  '--ctc-radius-sm': '2px',
  '--ctc-radius-md': '4px',
  '--ctc-radius-lg': '6px',
};

describe('CSSPostProcessor', () => {
  describe('stripExtraRootDeclarations', () => {
    it('should keep single :root declaration unchanged', () => {
      const css = `
:root {
  --ctc-primary: #00637B;
}

.test { color: var(--ctc-primary); }
      `;

      const result = postProcessCSS(css, SAMPLE_TOKENS, false);

      expect(result.strippedRootCount).toBe(0);
      expect(result.css).toContain(':root');
      expect(result.css).toContain('--ctc-primary: #00637B');
    });

    it('should strip duplicate :root declarations', () => {
      const css = `
:root {
  --ctc-primary: #00637B;
}

.component { color: blue; }

:root {
  --ctc-primary: #0047AB;
}

.other { background: red; }
      `;

      const result = postProcessCSS(css, SAMPLE_TOKENS, false);

      expect(result.strippedRootCount).toBe(1);
      // First :root should be kept
      expect(result.css).toContain('--ctc-primary: #00637B');
      // Second :root should be replaced with comment
      expect(result.css).toContain('/* [CSSPostProcessor] Stripped duplicate :root declaration */');
      // The overwritten value should NOT be present
      expect(result.css).not.toContain('--ctc-primary: #0047AB');
    });

    it('should strip multiple duplicate :root declarations', () => {
      const css = `
:root { --ctc-primary: #111; }
:root { --ctc-primary: #222; }
:root { --ctc-primary: #333; }
      `;

      const result = postProcessCSS(css, SAMPLE_TOKENS, false);

      expect(result.strippedRootCount).toBe(2);
      expect(result.css).toContain('--ctc-primary: #111');
    });
  });

  describe('normalizeVariableNames', () => {
    it('should normalize numeric neutral variables', () => {
      const css = `
.test {
  color: var(--ctc-neutral-7);
  background: var(--ctc-neutral-1);
}
      `;

      const result = postProcessCSS(css, SAMPLE_TOKENS, false);

      expect(result.normalizedCount).toBeGreaterThan(0);
      expect(result.css).toContain('var(--ctc-neutral-darkest)');
      expect(result.css).toContain('var(--ctc-neutral-lightest)');
      expect(result.css).not.toContain('var(--ctc-neutral-7)');
      expect(result.css).not.toContain('var(--ctc-neutral-1)');
    });

    it('should normalize Tailwind-style neutral variables', () => {
      const css = `
.test {
  color: var(--ctc-neutral-900);
  background: var(--ctc-neutral-100);
  border-color: var(--ctc-neutral-400);
}
      `;

      const result = postProcessCSS(css, SAMPLE_TOKENS, false);

      expect(result.normalizedCount).toBe(3);
      expect(result.css).toContain('var(--ctc-neutral-darkest)');
      expect(result.css).toContain('var(--ctc-neutral-lightest)');
      expect(result.css).toContain('var(--ctc-neutral-medium)');
    });

    it('should normalize numeric spacing variables', () => {
      const css = `
.test {
  padding: var(--ctc-spacing-2) var(--ctc-spacing-4);
  margin: var(--ctc-spacing-1);
}
      `;

      const result = postProcessCSS(css, SAMPLE_TOKENS, false);

      expect(result.normalizedCount).toBe(3);
      expect(result.css).toContain('var(--ctc-spacing-sm)');
      expect(result.css).toContain('var(--ctc-spacing-lg)');
      expect(result.css).toContain('var(--ctc-spacing-xs)');
    });

    it('should normalize space alias variables', () => {
      const css = `
.test {
  gap: var(--ctc-space-4);
}
      `;

      const result = postProcessCSS(css, SAMPLE_TOKENS, false);

      expect(result.normalizedCount).toBe(1);
      expect(result.css).toContain('var(--ctc-spacing-lg)');
    });

    it('should normalize radius variables', () => {
      const css = `
.test {
  border-radius: var(--ctc-radius-0);
}
      `;

      const result = postProcessCSS(css, SAMPLE_TOKENS, false);

      expect(result.normalizedCount).toBe(1);
      // --ctc-radius-0 should become literal 0
      expect(result.css).toContain('border-radius: 0;');
    });

    it('should normalize text alias variables', () => {
      const css = `
.test {
  color: var(--ctc-text);
  opacity: var(--ctc-text-secondary);
}
      `;

      const result = postProcessCSS(css, SAMPLE_TOKENS, false);

      expect(result.normalizedCount).toBe(2);
      expect(result.css).toContain('var(--ctc-neutral-darkest)');
      expect(result.css).toContain('var(--ctc-neutral-dark)');
    });

    it('should preserve valid variables unchanged', () => {
      const css = `
.test {
  color: var(--ctc-primary);
  background: var(--ctc-neutral-lightest);
  padding: var(--ctc-spacing-md);
}
      `;

      const result = postProcessCSS(css, SAMPLE_TOKENS, false);

      expect(result.normalizedCount).toBe(0);
      expect(result.css).toContain('var(--ctc-primary)');
      expect(result.css).toContain('var(--ctc-neutral-lightest)');
      expect(result.css).toContain('var(--ctc-spacing-md)');
    });

    it('should preserve fallback values', () => {
      const css = `
.test {
  color: var(--ctc-neutral-7, #333);
}
      `;

      const result = postProcessCSS(css, SAMPLE_TOKENS, false);

      expect(result.normalizedCount).toBe(1);
      expect(result.css).toContain('var(--ctc-neutral-darkest, #333)');
    });
  });

  describe('findUndefinedVariables', () => {
    it('should warn about completely unknown variables', () => {
      const css = `
.test {
  color: var(--ctc-unknown-variable);
}
      `;

      const result = postProcessCSS(css, SAMPLE_TOKENS, true);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('undefined'))).toBe(true);
    });
  });

  describe('integration', () => {
    it('should process complex CSS with multiple issues', () => {
      const css = `
:root {
  --ctc-primary: #00637B;
  --ctc-neutral-darkest: #000;
}

/* Button Component */
.ctc-button {
  color: var(--ctc-neutral-7);
  background-color: var(--ctc-neutral-1);
  border: 1px solid var(--ctc-neutral-4);
  border-radius: var(--ctc-radius-0);
  padding: var(--ctc-spacing-2) var(--ctc-spacing-4);
}

/* Timeline with rogue :root */
:root {
  --ctc-primary: #0047AB;
  --ctc-neutral-100: #F5F5F5;
}

.ctc-timeline {
  color: var(--ctc-neutral-700);
  background: var(--ctc-neutral-100);
}
      `;

      const result = postProcessCSS(css, SAMPLE_TOKENS, true);

      // Should strip the duplicate :root
      expect(result.strippedRootCount).toBe(1);
      expect(result.css).not.toContain('--ctc-primary: #0047AB');

      // Should normalize variables
      expect(result.normalizedCount).toBeGreaterThan(0);
      expect(result.css).toContain('var(--ctc-neutral-darkest)');
      expect(result.css).toContain('var(--ctc-neutral-lightest)');
      expect(result.css).toContain('var(--ctc-neutral-medium)');
      expect(result.css).toContain('var(--ctc-spacing-sm)');
      expect(result.css).toContain('var(--ctc-spacing-lg)');
      expect(result.css).toContain('border-radius: 0;');

      // Should have warnings
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should preserve original brand colors', () => {
      const css = `
:root {
  --ctc-primary: #00637B;
}

:root {
  --ctc-primary: #DIFFERENT;
}
      `;

      const result = postProcessCSS(css, SAMPLE_TOKENS, false);
      const processor = new CSSPostProcessor({ definedTokens: SAMPLE_TOKENS });

      // The first primary color should be preserved
      expect(processor.validateBrandColors(result.css, '#00637B')).toBe(true);
    });
  });
});
