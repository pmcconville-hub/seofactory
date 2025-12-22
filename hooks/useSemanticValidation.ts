/**
 * Semantic Validation Hook for Hero Image Editor
 *
 * Real-time validation of hero image compositions against semantic SEO rules.
 * Provides debounced validation, auto-fix capabilities, and validation state management.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  HeroImageComposition,
  HeroValidationResult,
  HeroRuleResult
} from '../types';
import {
  validateComposition,
  validateCategory,
  validateCritical,
  applyAutoFix,
  applyAllAutoFixes,
  getValidationSummary,
  getCategorizedResults,
  getAutoFixableIssues,
  canExport
} from '../services/ai/imageGeneration/semanticValidator';
import { ruleCategories } from '../config/heroImageRules';

// ============================================
// TYPES
// ============================================

export interface ValidationState {
  result: HeroValidationResult | null;
  isValidating: boolean;
  lastValidated: Date | null;
  summary: {
    status: 'valid' | 'warnings' | 'errors' | 'pending';
    errorCount: number;
    warningCount: number;
    passedCount: number;
    totalRules: number;
    score: number;
  };
  categorizedResults: Record<string, HeroRuleResult[]>;
  autoFixableIssues: HeroRuleResult[];
  canExport: boolean;
}

export interface ValidationActions {
  // Validation
  validate: () => HeroValidationResult;
  validateAsync: () => Promise<HeroValidationResult>;
  validateCategoryOnly: (category: string) => HeroValidationResult;
  validateCriticalOnly: () => HeroValidationResult;

  // Auto-fix
  applyFix: (ruleId: string) => HeroImageComposition | null;
  applyAllFixes: () => { composition: HeroImageComposition; fixedRules: string[]; failedRules: string[] };
  applyCategoryFixes: (category: string) => HeroImageComposition;

  // State management
  clearValidation: () => void;
  setValidationResult: (result: HeroValidationResult) => void;
}

export interface UseSemanticValidationOptions {
  /**
   * Debounce delay in milliseconds for automatic validation
   * Set to 0 to disable debouncing
   */
  debounceMs?: number;

  /**
   * Enable automatic validation on composition changes
   */
  autoValidate?: boolean;

  /**
   * Callback when validation completes
   */
  onValidationComplete?: (result: HeroValidationResult) => void;

  /**
   * Callback when auto-fix is applied
   */
  onAutoFixApplied?: (ruleId: string, success: boolean) => void;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useSemanticValidation(
  composition: HeroImageComposition,
  options?: UseSemanticValidationOptions
): [ValidationState, ValidationActions] {
  const {
    debounceMs = 300,
    autoValidate = true,
    onValidationComplete,
    onAutoFixApplied
  } = options || {};

  // ============================================
  // STATE
  // ============================================

  const [result, setResult] = useState<HeroValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidated, setLastValidated] = useState<Date | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compositionRef = useRef(composition);

  // Keep ref up to date
  useEffect(() => {
    compositionRef.current = composition;
  }, [composition]);

  // ============================================
  // VALIDATION FUNCTIONS
  // ============================================

  const validate = useCallback((): HeroValidationResult => {
    setIsValidating(true);
    const validationResult = validateComposition(compositionRef.current);
    setResult(validationResult);
    setLastValidated(new Date());
    setIsValidating(false);
    onValidationComplete?.(validationResult);
    return validationResult;
  }, [onValidationComplete]);

  const validateAsync = useCallback(async (): Promise<HeroValidationResult> => {
    setIsValidating(true);

    return new Promise((resolve) => {
      // Use requestAnimationFrame for non-blocking validation
      requestAnimationFrame(() => {
        const validationResult = validateComposition(compositionRef.current);
        setResult(validationResult);
        setLastValidated(new Date());
        setIsValidating(false);
        onValidationComplete?.(validationResult);
        resolve(validationResult);
      });
    });
  }, [onValidationComplete]);

  const validateCategoryOnly = useCallback((category: string): HeroValidationResult => {
    setIsValidating(true);
    const validationResult = validateCategory(compositionRef.current, category);
    setIsValidating(false);
    // Don't update full result for category-only validation
    return validationResult;
  }, []);

  const validateCriticalOnly = useCallback((): HeroValidationResult => {
    setIsValidating(true);
    const validationResult = validateCritical(compositionRef.current);
    setIsValidating(false);
    return validationResult;
  }, []);

  // ============================================
  // AUTO-FIX FUNCTIONS
  // ============================================

  const applyFix = useCallback((ruleId: string): HeroImageComposition | null => {
    const fixed = applyAutoFix(compositionRef.current, ruleId);
    const success = fixed !== null;
    onAutoFixApplied?.(ruleId, success);

    if (fixed) {
      // Re-validate after fix
      const newResult = validateComposition(fixed);
      setResult(newResult);
      setLastValidated(new Date());
    }

    return fixed;
  }, [onAutoFixApplied]);

  const applyAllFixes = useCallback(() => {
    const fixResult = applyAllAutoFixes(compositionRef.current);

    // Notify about each fix
    fixResult.fixedRules.forEach(ruleId => onAutoFixApplied?.(ruleId, true));
    fixResult.failedRules.forEach(ruleId => onAutoFixApplied?.(ruleId, false));

    // Update validation state
    setResult(fixResult.composition.validation);
    setLastValidated(new Date());

    return fixResult;
  }, [onAutoFixApplied]);

  const applyCategoryFixes = useCallback((category: string): HeroImageComposition => {
    const { applyAutoFixesForCategory } = require('../services/ai/imageGeneration/semanticValidator');
    const fixed = applyAutoFixesForCategory(compositionRef.current, category);

    // Re-validate after category fixes
    const newResult = validateComposition(fixed);
    setResult(newResult);
    setLastValidated(new Date());

    return fixed;
  }, []);

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const clearValidation = useCallback(() => {
    setResult(null);
    setLastValidated(null);
  }, []);

  const setValidationResult = useCallback((newResult: HeroValidationResult) => {
    setResult(newResult);
    setLastValidated(new Date());
  }, []);

  // ============================================
  // DEBOUNCED AUTO-VALIDATION
  // ============================================

  useEffect(() => {
    if (!autoValidate) return;

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (debounceMs === 0) {
      // No debounce - validate immediately
      validate();
    } else {
      // Debounced validation
      setIsValidating(true);
      debounceTimer.current = setTimeout(() => {
        validate();
      }, debounceMs);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [
    composition.layers,
    composition.metadata,
    composition.canvasWidth,
    composition.canvasHeight,
    autoValidate,
    debounceMs,
    validate
  ]);

  // ============================================
  // COMPUTED STATE
  // ============================================

  const summary = useMemo(() => {
    if (!result) {
      return {
        status: 'pending' as const,
        errorCount: 0,
        warningCount: 0,
        passedCount: 0,
        totalRules: 0,
        score: 100
      };
    }
    return getValidationSummary(result);
  }, [result]);

  const categorizedResults = useMemo(() => {
    if (!result) return {};
    return getCategorizedResults(result);
  }, [result]);

  const autoFixableIssues = useMemo(() => {
    if (!result) return [];
    return getAutoFixableIssues(result);
  }, [result]);

  const canExportValue = useMemo(() => {
    return canExport(composition);
  }, [composition]);

  // ============================================
  // RETURN
  // ============================================

  const state: ValidationState = useMemo(() => ({
    result,
    isValidating,
    lastValidated,
    summary,
    categorizedResults,
    autoFixableIssues,
    canExport: canExportValue
  }), [result, isValidating, lastValidated, summary, categorizedResults, autoFixableIssues, canExportValue]);

  const actions: ValidationActions = useMemo(() => ({
    validate,
    validateAsync,
    validateCategoryOnly,
    validateCriticalOnly,
    applyFix,
    applyAllFixes,
    applyCategoryFixes,
    clearValidation,
    setValidationResult
  }), [
    validate, validateAsync, validateCategoryOnly, validateCriticalOnly,
    applyFix, applyAllFixes, applyCategoryFixes, clearValidation, setValidationResult
  ]);

  return [state, actions];
}

// ============================================
// HELPER HOOKS
// ============================================

/**
 * Hook to get validation status for a specific rule
 */
export function useRuleValidation(
  validation: ValidationState,
  ruleId: string
): {
  passed: boolean;
  result: HeroRuleResult | undefined;
  canAutoFix: boolean;
} {
  return useMemo(() => {
    const result = validation.result?.ruleResults.find(r => r.ruleId === ruleId);
    return {
      passed: result?.passed ?? true,
      result,
      canAutoFix: result?.autoFixAvailable ?? false
    };
  }, [validation.result, ruleId]);
}

/**
 * Hook to get validation status for a specific category
 */
export function useCategoryValidation(
  validation: ValidationState,
  category: string
): {
  results: HeroRuleResult[];
  passedCount: number;
  failedCount: number;
  hasErrors: boolean;
  hasWarnings: boolean;
} {
  return useMemo(() => {
    const results = validation.categorizedResults[category] || [];
    const passed = results.filter(r => r.passed);
    const failed = results.filter(r => !r.passed);
    const errors = failed.filter(r => r.severity === 'error');
    const warnings = failed.filter(r => r.severity === 'warning');

    return {
      results,
      passedCount: passed.length,
      failedCount: failed.length,
      hasErrors: errors.length > 0,
      hasWarnings: warnings.length > 0
    };
  }, [validation.categorizedResults, category]);
}

/**
 * Get all rule categories with their validation status
 */
export function useAllCategoriesValidation(validation: ValidationState) {
  return useMemo(() => {
    return ruleCategories.map(cat => {
      const results = validation.categorizedResults[cat.id] || [];
      const passed = results.filter(r => r.passed).length;
      const failed = results.filter(r => !r.passed).length;
      const errors = results.filter(r => !r.passed && r.severity === 'error').length;

      return {
        ...cat,
        passedCount: passed,
        failedCount: failed,
        errorCount: errors,
        totalRules: results.length,
        status: errors > 0 ? 'error' : failed > 0 ? 'warning' : 'valid'
      };
    });
  }, [validation.categorizedResults]);
}

export default useSemanticValidation;
