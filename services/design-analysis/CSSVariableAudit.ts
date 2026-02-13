// services/design-analysis/CSSVariableAudit.ts
/**
 * CSS Variable Audit Service
 *
 * Analyzes CSS for undefined variables, unused variables, and circular references.
 * Provides auto-fix capabilities using the normalization map from CSSPostProcessor
 * and fuzzy matching against defined variables.
 */

import { VALID_VARIABLE_NAMES, VARIABLE_NORMALIZATION_MAP } from './CSSPostProcessor';

// Re-export for consumers that need direct access
export { VALID_VARIABLE_NAMES, VARIABLE_NORMALIZATION_MAP };

// ============================================================================
// Types
// ============================================================================

export interface UndefinedVariable {
  /** The undefined CSS variable name (e.g., --ctc-unknown-color) */
  name: string;
  /** CSS selectors where this variable is used */
  usedIn: string[];
  /** Suggested replacement value or variable name */
  suggestedFix?: string;
}

export interface CSSVariableAuditResult {
  /** Variables referenced via var() but not defined in :root or definedTokens */
  undefinedVars: UndefinedVariable[];
  /** Variables defined in :root but never referenced via var() */
  unusedVars: string[];
  /** Variables that form circular reference chains */
  circularRefs: string[];
  /** Total unique CSS variables found (referenced + defined) */
  totalVars: number;
  /** Total variables defined in :root blocks */
  totalDefined: number;
  /** Health score 0-100: higher is better */
  healthScore: number;
}

// ============================================================================
// Core Audit Function
// ============================================================================

/**
 * Audit CSS variables against defined tokens.
 *
 * Scans the CSS for:
 * 1. All var() references
 * 2. All variable definitions in :root blocks
 * 3. Cross-references to find undefined, unused, and circular references
 * 4. Suggests fixes for undefined variables using the normalization map + fuzzy matching
 * 5. Calculates a health score based on issues found
 */
export function auditCSSVariables(
  css: string,
  definedTokens: Record<string, string>
): CSSVariableAuditResult {
  // 1. Find all var() references and track which selector they appear in
  const referencedVars = new Map<string, Set<string>>();
  collectVarReferences(css, referencedVars);

  // 2. Find all variable definitions in :root blocks
  const rootDefinedVars = new Map<string, string>();
  collectRootDefinitions(css, rootDefinedVars);

  // 3. Build the complete set of "known" variables (root-defined + passed-in tokens + valid names)
  const allDefined = new Set<string>([
    ...rootDefinedVars.keys(),
    ...Object.keys(definedTokens),
    ...VALID_VARIABLE_NAMES,
  ]);

  // 4. Find undefined variables (referenced but not defined anywhere)
  const undefinedVars: UndefinedVariable[] = [];
  const fixes = suggestFixes(
    Array.from(referencedVars.keys()).filter(v => !allDefined.has(v)),
    allDefined
  );

  for (const [varName, selectors] of referencedVars) {
    if (!allDefined.has(varName)) {
      undefinedVars.push({
        name: varName,
        usedIn: Array.from(selectors),
        suggestedFix: fixes.get(varName),
      });
    }
  }

  // 5. Find unused variables (defined in :root but never referenced)
  const unusedVars: string[] = [];
  for (const varName of rootDefinedVars.keys()) {
    if (!referencedVars.has(varName)) {
      unusedVars.push(varName);
    }
  }

  // 6. Detect circular references among :root definitions
  const circularRefs = detectCircularReferences(rootDefinedVars);

  // 7. Calculate totals
  const allVarNames = new Set<string>([
    ...referencedVars.keys(),
    ...rootDefinedVars.keys(),
  ]);
  const totalVars = allVarNames.size;
  const totalDefined = rootDefinedVars.size + Object.keys(definedTokens).length;

  // 8. Calculate health score
  const healthScore = calculateHealthScore(
    totalVars,
    undefinedVars.length,
    unusedVars.length,
    circularRefs.length
  );

  return {
    undefinedVars,
    unusedVars,
    circularRefs,
    totalVars,
    totalDefined,
    healthScore,
  };
}

// ============================================================================
// Auto-Fix Functions
// ============================================================================

/**
 * Auto-fix undefined CSS variables by applying the fixes map.
 * Returns the fixed CSS string.
 *
 * For each entry in the fixes map:
 * - If the fix starts with '--', it's a variable name: var(--old) becomes var(--new)
 * - Otherwise, it's a literal value: var(--old) becomes the literal value
 */
export function autoFixUndefinedVariables(
  css: string,
  fixes: Map<string, string>
): string {
  if (fixes.size === 0) return css;

  let result = css;
  for (const [oldVar, fix] of fixes) {
    // Escape special regex characters in the variable name
    const escaped = oldVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match var(--old-name) with optional fallback and whitespace
    const pattern = new RegExp(
      `var\\(\\s*${escaped}\\s*(?:,\\s*[^)]+)?\\s*\\)`,
      'g'
    );

    if (fix.startsWith('--')) {
      // Replace with new variable reference
      result = result.replace(pattern, `var(${fix})`);
    } else {
      // Replace with literal value
      result = result.replace(pattern, fix);
    }
  }

  return result;
}

/**
 * Generate suggested fixes for undefined variables.
 * Uses the VARIABLE_NORMALIZATION_MAP from CSSPostProcessor plus fuzzy matching.
 *
 * Priority:
 * 1. Exact match in VARIABLE_NORMALIZATION_MAP
 * 2. Fuzzy match against defined variables (Levenshtein distance <= 3)
 */
export function suggestFixes(
  undefinedVars: string[],
  definedVars: Set<string>
): Map<string, string> {
  const fixes = new Map<string, string>();

  for (const varName of undefinedVars) {
    // 1. Check normalization map first
    const normalized = VARIABLE_NORMALIZATION_MAP[varName];
    if (normalized) {
      fixes.set(varName, normalized);
      continue;
    }

    // 2. Try fuzzy matching against definedVars
    let bestMatch: string | null = null;
    let bestDistance = Infinity;
    const maxDistance = 3; // Only suggest if edit distance is small

    for (const defined of definedVars) {
      const distance = levenshteinDistance(varName, defined);
      if (distance < bestDistance && distance <= maxDistance) {
        bestDistance = distance;
        bestMatch = defined;
      }
    }

    if (bestMatch) {
      fixes.set(varName, bestMatch);
    }
  }

  return fixes;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Collect all var() references from CSS and track which selectors they appear in.
 */
function collectVarReferences(css: string, out: Map<string, Set<string>>): void {
  // Parse CSS into selector blocks, then scan each block for var() references
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  let blockMatch;

  while ((blockMatch = blockPattern.exec(css)) !== null) {
    const selector = blockMatch[1].trim();
    const body = blockMatch[2];

    const varPattern = /var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*[^)]+)?\s*\)/g;
    let varMatch;
    while ((varMatch = varPattern.exec(body)) !== null) {
      const varName = varMatch[1];
      if (!out.has(varName)) {
        out.set(varName, new Set());
      }
      out.get(varName)!.add(selector);
    }
  }

  // Also catch var() references outside of selector blocks (unlikely but possible)
  // We do a global scan as a fallback
  const globalVarPattern = /var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*[^)]+)?\s*\)/g;
  let globalMatch;
  while ((globalMatch = globalVarPattern.exec(css)) !== null) {
    const varName = globalMatch[1];
    if (!out.has(varName)) {
      out.set(varName, new Set());
      out.get(varName)!.add('<global>');
    }
  }
}

/**
 * Collect all variable definitions from :root blocks.
 */
function collectRootDefinitions(css: string, out: Map<string, string>): void {
  const rootPattern = /:root\s*\{([^}]*)\}/g;
  let rootMatch;

  while ((rootMatch = rootPattern.exec(css)) !== null) {
    const body = rootMatch[1];
    const propPattern = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
    let propMatch;
    while ((propMatch = propPattern.exec(body)) !== null) {
      out.set(propMatch[1], propMatch[2].trim());
    }
  }
}

/**
 * Detect circular references among CSS variable definitions.
 * A circular reference is when A -> B -> A (or longer chains).
 */
function detectCircularReferences(definitions: Map<string, string>): string[] {
  const circular: string[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(varName: string, path: string[]): void {
    if (inStack.has(varName)) {
      // Found a cycle - report the variable that closes it
      circular.push(varName);
      return;
    }
    if (visited.has(varName)) return;

    visited.add(varName);
    inStack.add(varName);

    const value = definitions.get(varName);
    if (value) {
      // Extract any var() references in the value
      const refPattern = /var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*[^)]+)?\s*\)/g;
      let refMatch;
      while ((refMatch = refPattern.exec(value)) !== null) {
        const referencedVar = refMatch[1];
        if (definitions.has(referencedVar)) {
          dfs(referencedVar, [...path, varName]);
        }
      }
    }

    inStack.delete(varName);
  }

  for (const varName of definitions.keys()) {
    dfs(varName, []);
  }

  return circular;
}

/**
 * Calculate a health score (0-100) based on the number of issues found.
 *
 * Scoring:
 * - Start at 100
 * - Each undefined variable: -10 points
 * - Each unused variable: -3 points
 * - Each circular reference: -15 points
 * - Minimum score is 0
 */
function calculateHealthScore(
  totalVars: number,
  undefinedCount: number,
  unusedCount: number,
  circularCount: number
): number {
  if (totalVars === 0) return 100;

  let score = 100;
  score -= undefinedCount * 10;
  score -= unusedCount * 3;
  score -= circularCount * 15;

  return Math.max(0, Math.min(100, score));
}

/**
 * Compute the Levenshtein (edit) distance between two strings.
 * Used for fuzzy matching variable names.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Use a single-row optimization for space efficiency
  const row = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(
        row[j] + 1,      // deletion
        prev + 1,         // insertion
        row[j - 1] + cost // substitution
      );
      row[j - 1] = prev;
      prev = val;
    }
    row[n] = prev;
  }

  return row[n];
}
