/**
 * Semantic Validator for Hero Images
 *
 * Validates hero image compositions against semantic SEO rules
 * based on Koray Tugberk GUBUR's "Pixels, Letters, and Bytes" framework.
 *
 * Features:
 * - Real-time validation during editing
 * - Auto-fix suggestions and execution
 * - Detailed error/warning messages
 * - Category-based validation
 */

import {
  HeroImageComposition,
  HeroValidationResult,
  HeroValidationRule,
  HeroRuleResult,
  HeroValidationSeverity
} from '../../../types';

import {
  allHeroImageRules,
  getRulesByCategory,
  getRulesBySeverity,
  getAutoFixableRules
} from '../../../config/heroImageRules';

// ============================================
// VALIDATION ENGINE
// ============================================

/**
 * Validate a hero image composition against all semantic rules
 */
export const validateComposition = (
  composition: HeroImageComposition
): HeroValidationResult => {
  const ruleResults: HeroRuleResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of allHeroImageRules) {
    try {
      const checkResult = rule.check(composition);

      const result: HeroRuleResult = {
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        passed: checkResult.passed,
        message: checkResult.passed ? rule.passMessage : rule.checkMessage,
        details: checkResult.details,
        autoFixAvailable: !checkResult.passed && rule.autoFixAvailable
      };

      ruleResults.push(result);

      // Collect errors and warnings
      if (!checkResult.passed) {
        if (rule.severity === 'error') {
          errors.push(`${rule.name}: ${rule.checkMessage}`);
        } else {
          warnings.push(`${rule.name}: ${rule.checkMessage}`);
        }
      }
    } catch (error) {
      // Rule execution failed - log but continue
      console.warn(`[SemanticValidator] Rule ${rule.id} failed:`, error);
      ruleResults.push({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: 'warning',
        passed: false,
        message: `Rule validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        autoFixAvailable: false
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    ruleResults
  };
};

/**
 * Validate composition against specific category rules only
 */
export const validateCategory = (
  composition: HeroImageComposition,
  category: string
): HeroValidationResult => {
  const categoryRules = getRulesByCategory(category);
  const ruleResults: HeroRuleResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of categoryRules) {
    const checkResult = rule.check(composition);

    const result: HeroRuleResult = {
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      severity: rule.severity,
      passed: checkResult.passed,
      message: checkResult.passed ? rule.passMessage : rule.checkMessage,
      details: checkResult.details,
      autoFixAvailable: !checkResult.passed && rule.autoFixAvailable
    };

    ruleResults.push(result);

    if (!checkResult.passed) {
      if (rule.severity === 'error') {
        errors.push(`${rule.name}: ${rule.checkMessage}`);
      } else {
        warnings.push(`${rule.name}: ${rule.checkMessage}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    ruleResults
  };
};

/**
 * Validate only critical (error severity) rules
 */
export const validateCritical = (
  composition: HeroImageComposition
): HeroValidationResult => {
  const criticalRules = getRulesBySeverity('error');
  const ruleResults: HeroRuleResult[] = [];
  const errors: string[] = [];

  for (const rule of criticalRules) {
    const checkResult = rule.check(composition);

    const result: HeroRuleResult = {
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      severity: rule.severity,
      passed: checkResult.passed,
      message: checkResult.passed ? rule.passMessage : rule.checkMessage,
      details: checkResult.details,
      autoFixAvailable: !checkResult.passed && rule.autoFixAvailable
    };

    ruleResults.push(result);

    if (!checkResult.passed) {
      errors.push(`${rule.name}: ${rule.checkMessage}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
    ruleResults
  };
};

// ============================================
// AUTO-FIX ENGINE
// ============================================

/**
 * Apply auto-fix for a specific rule
 */
export const applyAutoFix = (
  composition: HeroImageComposition,
  ruleId: string
): HeroImageComposition | null => {
  const rule = allHeroImageRules.find(r => r.id === ruleId);

  if (!rule || !rule.autoFix || !rule.autoFixAvailable) {
    console.warn(`[SemanticValidator] No auto-fix available for rule: ${ruleId}`);
    return null;
  }

  try {
    const fixedComposition = rule.autoFix(composition);

    // Re-validate to confirm fix worked
    const checkResult = rule.check(fixedComposition);

    if (!checkResult.passed) {
      console.warn(`[SemanticValidator] Auto-fix did not resolve issue for rule: ${ruleId}`);
    }

    return fixedComposition;
  } catch (error) {
    console.error(`[SemanticValidator] Auto-fix failed for rule ${ruleId}:`, error);
    return null;
  }
};

/**
 * Apply all available auto-fixes
 */
export const applyAllAutoFixes = (
  composition: HeroImageComposition
): { composition: HeroImageComposition; fixedRules: string[]; failedRules: string[] } => {
  let currentComposition = { ...composition };
  const fixedRules: string[] = [];
  const failedRules: string[] = [];

  // First, validate to find failing rules
  const validation = validateComposition(currentComposition);

  // Get failing rules that have auto-fix
  const failingRulesWithFix = validation.ruleResults.filter(
    r => !r.passed && r.autoFixAvailable
  );

  // Apply fixes in order (errors first, then warnings)
  const sortedRules = failingRulesWithFix.sort((a, b) => {
    if (a.severity === 'error' && b.severity !== 'error') return -1;
    if (a.severity !== 'error' && b.severity === 'error') return 1;
    return 0;
  });

  for (const ruleResult of sortedRules) {
    const fixed = applyAutoFix(currentComposition, ruleResult.ruleId);

    if (fixed) {
      currentComposition = fixed;
      fixedRules.push(ruleResult.ruleId);
    } else {
      failedRules.push(ruleResult.ruleId);
    }
  }

  // Update validation result in composition
  currentComposition.validation = validateComposition(currentComposition);

  return {
    composition: currentComposition,
    fixedRules,
    failedRules
  };
};

/**
 * Apply auto-fixes for a specific category
 */
export const applyAutoFixesForCategory = (
  composition: HeroImageComposition,
  category: string
): HeroImageComposition => {
  let currentComposition = { ...composition };

  const categoryRules = getRulesByCategory(category);
  const autoFixableRules = categoryRules.filter(r => r.autoFixAvailable);

  for (const rule of autoFixableRules) {
    const checkResult = rule.check(currentComposition);

    if (!checkResult.passed && rule.autoFix) {
      const fixed = rule.autoFix(currentComposition);
      if (fixed) {
        currentComposition = fixed;
      }
    }
  }

  return currentComposition;
};

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Check if composition can be exported (no critical errors)
 */
export const canExport = (composition: HeroImageComposition): boolean => {
  const validation = validateCritical(composition);
  return validation.isValid;
};

/**
 * Get validation summary for UI display
 */
export const getValidationSummary = (
  validation: HeroValidationResult
): {
  status: 'valid' | 'warnings' | 'errors';
  errorCount: number;
  warningCount: number;
  passedCount: number;
  totalRules: number;
  score: number;
} => {
  const errorCount = validation.errors.length;
  const warningCount = validation.warnings.length;
  const passedCount = validation.ruleResults.filter(r => r.passed).length;
  const totalRules = validation.ruleResults.length;

  // Calculate score (100 = all passed, 0 = all failed)
  const score = totalRules > 0
    ? Math.round((passedCount / totalRules) * 100)
    : 100;

  const status: 'valid' | 'warnings' | 'errors' =
    errorCount > 0 ? 'errors' :
    warningCount > 0 ? 'warnings' :
    'valid';

  return {
    status,
    errorCount,
    warningCount,
    passedCount,
    totalRules,
    score
  };
};

/**
 * Get categorized validation results for UI display
 */
export const getCategorizedResults = (
  validation: HeroValidationResult
): Record<string, HeroRuleResult[]> => {
  const categories: Record<string, HeroRuleResult[]> = {};

  for (const result of validation.ruleResults) {
    if (!categories[result.category]) {
      categories[result.category] = [];
    }
    categories[result.category].push(result);
  }

  return categories;
};

/**
 * Get auto-fixable issues for UI display
 */
export const getAutoFixableIssues = (
  validation: HeroValidationResult
): HeroRuleResult[] => {
  return validation.ruleResults.filter(
    r => !r.passed && r.autoFixAvailable
  );
};

// ============================================
// REAL-TIME VALIDATION
// ============================================

/**
 * Debounced validation for real-time editing
 * Returns a function that can be called repeatedly but only
 * executes validation after the specified delay
 */
export const createDebouncedValidator = (
  delayMs: number = 300
): {
  validate: (composition: HeroImageComposition) => void;
  cancel: () => void;
  getResult: () => HeroValidationResult | null;
} => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastResult: HeroValidationResult | null = null;

  const validate = (composition: HeroImageComposition) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      lastResult = validateComposition(composition);
      timeoutId = null;
    }, delayMs);
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const getResult = () => lastResult;

  return { validate, cancel, getResult };
};

/**
 * Validate specific layer changes (optimized for real-time)
 */
export const validateLayerChange = (
  composition: HeroImageComposition,
  layerId: string
): HeroRuleResult[] => {
  const layer = composition.layers.find(l => l.id === layerId);
  if (!layer) return [];

  // Get rules relevant to this layer type
  const relevantRules = allHeroImageRules.filter(rule => {
    switch (layer.type) {
      case 'background':
        return rule.category === 'technical';
      case 'centralObject':
        return rule.category === 'centerpiece';
      case 'textOverlay':
        return rule.category === 'text' || rule.category === 'accessibility';
      case 'logo':
        return rule.category === 'logo';
      default:
        return false;
    }
  });

  const results: HeroRuleResult[] = [];

  for (const rule of relevantRules) {
    const checkResult = rule.check(composition);

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      severity: rule.severity,
      passed: checkResult.passed,
      message: checkResult.passed ? rule.passMessage : rule.checkMessage,
      details: checkResult.details,
      autoFixAvailable: !checkResult.passed && rule.autoFixAvailable
    });
  }

  return results;
};

// ============================================
// ALT TEXT HELPERS
// ============================================

/**
 * Generate suggested alt text from composition
 */
export const generateAltTextSuggestion = (
  composition: HeroImageComposition
): string => {
  const parts: string[] = [];

  // Get central object entity name
  const centralLayer = composition.layers.find(l => l.type === 'centralObject');
  if (centralLayer && centralLayer.type === 'centralObject' && centralLayer.entityName) {
    parts.push(centralLayer.entityName);
  }

  // Get text overlay content
  const textLayers = composition.layers.filter(l => l.type === 'textOverlay');
  for (const layer of textLayers) {
    if (layer.type === 'textOverlay' && layer.text) {
      parts.push(layer.text);
    }
  }

  // Combine parts
  if (parts.length === 0) {
    return 'Hero image';
  }

  return parts.join(' - ');
};

/**
 * Validate alt text against best practices
 */
export const validateAltText = (
  altText: string,
  entityName?: string
): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} => {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check length
  if (altText.length < 30) {
    issues.push('Alt text is too short (minimum 30 characters recommended)');
    suggestions.push('Add more descriptive context about the image');
  }

  if (altText.length > 200) {
    issues.push('Alt text is too long (maximum 200 characters recommended)');
    suggestions.push('Shorten the description to key details');
  }

  // Check for entity reference
  if (entityName && !altText.toLowerCase().includes(entityName.toLowerCase())) {
    issues.push('Alt text does not reference the central entity');
    suggestions.push(`Include "${entityName}" in the alt text`);
  }

  // Check for keyword stuffing
  const words = altText.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }

  const repeatedWords = Array.from(wordCounts.entries())
    .filter(([_, count]) => count > 2)
    .map(([word]) => word);

  if (repeatedWords.length > 0) {
    issues.push(`Repeated keywords detected: ${repeatedWords.join(', ')}`);
    suggestions.push('Remove duplicate keywords for more natural text');
  }

  // Check for generic phrases
  const genericPhrases = ['image of', 'picture of', 'photo of', 'graphic of'];
  for (const phrase of genericPhrases) {
    if (altText.toLowerCase().startsWith(phrase)) {
      issues.push('Alt text starts with generic phrase');
      suggestions.push('Start with the main subject instead');
      break;
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
};

// ============================================
// EXPORTS
// ============================================

export {
  allHeroImageRules,
  getRulesByCategory,
  getRulesBySeverity,
  getAutoFixableRules
} from '../../../config/heroImageRules';
