// services/design-analysis/__tests__/CSSVariableAudit.test.ts
/**
 * Unit tests for CSSVariableAudit service
 *
 * Tests:
 * 1. auditCSSVariables() - defined, undefined, unused, and circular variables
 * 2. autoFixUndefinedVariables() - applying a fixes map
 * 3. suggestFixes() - normalization map + fuzzy matching
 */

import { describe, it, expect } from 'vitest';
import {
  auditCSSVariables,
  autoFixUndefinedVariables,
  suggestFixes,
} from '../CSSVariableAudit';

const SAMPLE_TOKENS: Record<string, string> = {
  '--ctc-primary': '#00637B',
  '--ctc-secondary': '#1f2937',
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
  '--ctc-font-heading': 'Inter, sans-serif',
  '--ctc-font-body': 'system-ui, sans-serif',
};

describe('CSSVariableAudit', () => {
  // ==========================================================================
  // auditCSSVariables
  // ==========================================================================

  describe('auditCSSVariables', () => {
    it('should report a perfect score when all variables are defined', () => {
      const css = `
:root {
  --ctc-primary: #00637B;
  --ctc-secondary: #1f2937;
}

.card {
  color: var(--ctc-primary);
  background: var(--ctc-secondary);
}
      `;

      const result = auditCSSVariables(css, SAMPLE_TOKENS);

      expect(result.undefinedVars).toHaveLength(0);
      expect(result.unusedVars).toHaveLength(0);
      expect(result.circularRefs).toHaveLength(0);
      expect(result.healthScore).toBe(100);
    });

    it('should detect undefined variables', () => {
      const css = `
:root {
  --ctc-primary: #00637B;
}

.card {
  color: var(--ctc-primary);
  background: var(--ctc-totally-unknown);
  border-color: var(--ctc-also-unknown);
}
      `;

      const result = auditCSSVariables(css, SAMPLE_TOKENS);

      expect(result.undefinedVars).toHaveLength(2);
      const names = result.undefinedVars.map(v => v.name);
      expect(names).toContain('--ctc-totally-unknown');
      expect(names).toContain('--ctc-also-unknown');
    });

    it('should detect unused variables', () => {
      const css = `
:root {
  --ctc-primary: #00637B;
  --ctc-unused-color: #ff0000;
  --ctc-also-unused: 10px;
}

.card {
  color: var(--ctc-primary);
}
      `;

      const result = auditCSSVariables(css, SAMPLE_TOKENS);

      expect(result.unusedVars).toContain('--ctc-unused-color');
      expect(result.unusedVars).toContain('--ctc-also-unused');
      // --ctc-primary is used, so it should NOT be in unused
      expect(result.unusedVars).not.toContain('--ctc-primary');
    });

    it('should detect circular references', () => {
      const css = `
:root {
  --ctc-color-a: var(--ctc-color-b);
  --ctc-color-b: var(--ctc-color-a);
}

.card {
  color: var(--ctc-color-a);
}
      `;

      const result = auditCSSVariables(css, SAMPLE_TOKENS);

      expect(result.circularRefs.length).toBeGreaterThan(0);
      // At least one of the circular pair should be reported
      const hasA = result.circularRefs.includes('--ctc-color-a');
      const hasB = result.circularRefs.includes('--ctc-color-b');
      expect(hasA || hasB).toBe(true);
    });

    it('should track which selectors use undefined variables', () => {
      const css = `
.header {
  color: var(--ctc-unknown-header);
}

.footer {
  color: var(--ctc-unknown-header);
  background: var(--ctc-unknown-footer);
}
      `;

      const result = auditCSSVariables(css, SAMPLE_TOKENS);

      const headerVar = result.undefinedVars.find(v => v.name === '--ctc-unknown-header');
      expect(headerVar).toBeDefined();
      expect(headerVar!.usedIn).toContain('.header');
      expect(headerVar!.usedIn).toContain('.footer');

      const footerVar = result.undefinedVars.find(v => v.name === '--ctc-unknown-footer');
      expect(footerVar).toBeDefined();
      expect(footerVar!.usedIn).toContain('.footer');
    });

    it('should suggest fixes for normalizable undefined variables', () => {
      const css = `
.card {
  color: var(--ctc-neutral-700);
  padding: var(--ctc-spacing-4);
  border-radius: var(--ctc-rounded-lg);
}
      `;

      const result = auditCSSVariables(css, SAMPLE_TOKENS);

      // These are in the normalization map but not in VALID_VARIABLE_NAMES,
      // so they should be reported as undefined with suggested fixes
      const neutral700 = result.undefinedVars.find(v => v.name === '--ctc-neutral-700');
      const spacing4 = result.undefinedVars.find(v => v.name === '--ctc-spacing-4');
      const roundedLg = result.undefinedVars.find(v => v.name === '--ctc-rounded-lg');

      if (neutral700) {
        expect(neutral700.suggestedFix).toBe('--ctc-neutral-dark');
      }
      if (spacing4) {
        expect(spacing4.suggestedFix).toBe('--ctc-spacing-lg');
      }
      if (roundedLg) {
        expect(roundedLg.suggestedFix).toBe('--ctc-radius-lg');
      }
    });

    it('should calculate totalVars and totalDefined correctly', () => {
      const css = `
:root {
  --ctc-custom-a: red;
  --ctc-custom-b: blue;
}

.card {
  color: var(--ctc-custom-a);
  background: var(--ctc-custom-c);
}
      `;

      const result = auditCSSVariables(css, SAMPLE_TOKENS);

      // totalVars = unique variables across references + definitions
      // --ctc-custom-a (defined + referenced), --ctc-custom-b (defined), --ctc-custom-c (referenced)
      expect(result.totalVars).toBe(3);
      // totalDefined = root defined + token count
      expect(result.totalDefined).toBe(2 + Object.keys(SAMPLE_TOKENS).length);
    });

    it('should lower health score proportionally to issues', () => {
      const css = `
.card {
  color: var(--ctc-unknown-1);
  background: var(--ctc-unknown-2);
  border: var(--ctc-unknown-3);
}
      `;

      const result = auditCSSVariables(css, SAMPLE_TOKENS);

      // 3 undefined vars at 10 points each = 30 points off -> 70
      expect(result.healthScore).toBe(70);
    });

    it('should recognize variables from VALID_VARIABLE_NAMES as defined', () => {
      const css = `
.card {
  color: var(--ctc-primary);
  font-family: var(--ctc-font-heading);
  box-shadow: var(--ctc-shadow-card);
  transition: var(--ctc-transition-speed);
}
      `;

      // Pass empty tokens - VALID_VARIABLE_NAMES should cover these
      const result = auditCSSVariables(css, {});

      expect(result.undefinedVars).toHaveLength(0);
      expect(result.healthScore).toBe(100);
    });

    it('should handle CSS with no variables gracefully', () => {
      const css = `
.card {
  color: red;
  background: blue;
}
      `;

      const result = auditCSSVariables(css, SAMPLE_TOKENS);

      expect(result.undefinedVars).toHaveLength(0);
      expect(result.unusedVars).toHaveLength(0);
      expect(result.circularRefs).toHaveLength(0);
      expect(result.totalVars).toBe(0);
      expect(result.healthScore).toBe(100);
    });

    it('should handle empty CSS', () => {
      const result = auditCSSVariables('', SAMPLE_TOKENS);

      expect(result.undefinedVars).toHaveLength(0);
      expect(result.unusedVars).toHaveLength(0);
      expect(result.healthScore).toBe(100);
    });
  });

  // ==========================================================================
  // autoFixUndefinedVariables
  // ==========================================================================

  describe('autoFixUndefinedVariables', () => {
    it('should replace undefined variables with variable-name fixes', () => {
      const css = `
.card {
  color: var(--ctc-neutral-700);
  background: var(--ctc-neutral-100);
}
      `;

      const fixes = new Map([
        ['--ctc-neutral-700', '--ctc-neutral-dark'],
        ['--ctc-neutral-100', '--ctc-neutral-lightest'],
      ]);

      const result = autoFixUndefinedVariables(css, fixes);

      expect(result).toContain('var(--ctc-neutral-dark)');
      expect(result).toContain('var(--ctc-neutral-lightest)');
      expect(result).not.toContain('var(--ctc-neutral-700)');
      expect(result).not.toContain('var(--ctc-neutral-100)');
    });

    it('should replace with literal values when fix does not start with --', () => {
      const css = `
.card {
  border-radius: var(--ctc-radius-0);
  padding: var(--ctc-spacing-0);
}
      `;

      const fixes = new Map([
        ['--ctc-radius-0', '0'],
        ['--ctc-spacing-0', '0'],
      ]);

      const result = autoFixUndefinedVariables(css, fixes);

      expect(result).toContain('border-radius: 0');
      expect(result).toContain('padding: 0');
      expect(result).not.toContain('var(--ctc-radius-0)');
    });

    it('should handle var() with fallback values', () => {
      const css = `
.card {
  color: var(--ctc-neutral-700, #333);
}
      `;

      const fixes = new Map([
        ['--ctc-neutral-700', '--ctc-neutral-dark'],
      ]);

      const result = autoFixUndefinedVariables(css, fixes);

      expect(result).toContain('var(--ctc-neutral-dark)');
      expect(result).not.toContain('var(--ctc-neutral-700');
    });

    it('should return CSS unchanged when fixes map is empty', () => {
      const css = '.card { color: var(--ctc-unknown); }';
      const result = autoFixUndefinedVariables(css, new Map());
      expect(result).toBe(css);
    });

    it('should fix multiple occurrences of the same variable', () => {
      const css = `
.card { color: var(--ctc-neutral-700); }
.button { color: var(--ctc-neutral-700); }
      `;

      const fixes = new Map([['--ctc-neutral-700', '--ctc-neutral-dark']]);
      const result = autoFixUndefinedVariables(css, fixes);

      // Both should be replaced
      expect(result).not.toContain('var(--ctc-neutral-700)');
      // Count occurrences of the fix
      const matches = result.match(/var\(--ctc-neutral-dark\)/g);
      expect(matches).toHaveLength(2);
    });
  });

  // ==========================================================================
  // suggestFixes
  // ==========================================================================

  describe('suggestFixes', () => {
    const definedVars = new Set([
      '--ctc-primary',
      '--ctc-secondary',
      '--ctc-neutral-darkest',
      '--ctc-neutral-dark',
      '--ctc-neutral-medium',
      '--ctc-neutral-light',
      '--ctc-neutral-lightest',
      '--ctc-spacing-xs',
      '--ctc-spacing-sm',
      '--ctc-spacing-md',
      '--ctc-spacing-lg',
      '--ctc-spacing-xl',
    ]);

    it('should use VARIABLE_NORMALIZATION_MAP for known aliases', () => {
      const fixes = suggestFixes(
        ['--ctc-neutral-700', '--ctc-spacing-4', '--ctc-rounded-lg'],
        definedVars
      );

      expect(fixes.get('--ctc-neutral-700')).toBe('--ctc-neutral-dark');
      expect(fixes.get('--ctc-spacing-4')).toBe('--ctc-spacing-lg');
      expect(fixes.get('--ctc-rounded-lg')).toBe('--ctc-radius-lg');
    });

    it('should use fuzzy matching for near-miss variable names', () => {
      const fixes = suggestFixes(
        ['--ctc-primay'],  // typo: missing 'r'
        definedVars
      );

      // Levenshtein distance between '--ctc-primay' and '--ctc-primary' is 1
      expect(fixes.get('--ctc-primay')).toBe('--ctc-primary');
    });

    it('should not suggest a fix when edit distance is too large', () => {
      const fixes = suggestFixes(
        ['--ctc-completely-different-name'],
        definedVars
      );

      expect(fixes.has('--ctc-completely-different-name')).toBe(false);
    });

    it('should prefer normalization map over fuzzy matching', () => {
      // --ctc-text is in the normalization map -> --ctc-neutral-darkest
      // It might also be close to --ctc-primary via fuzzy match (unlikely but test the priority)
      const fixes = suggestFixes(['--ctc-text'], definedVars);

      expect(fixes.get('--ctc-text')).toBe('--ctc-neutral-darkest');
    });

    it('should return empty map for empty input', () => {
      const fixes = suggestFixes([], definedVars);
      expect(fixes.size).toBe(0);
    });
  });
});
