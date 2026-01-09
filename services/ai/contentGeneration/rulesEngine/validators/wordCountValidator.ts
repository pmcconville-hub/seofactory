// services/ai/contentGeneration/rulesEngine/validators/wordCountValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';

/**
 * Result of article-level word count validation (G1)
 */
interface WordCountResult {
  isValid: boolean;
  actualCount: number;
  targetCount: number;
  tolerance: number;
  minAllowed: number;
  maxAllowed: number;
}

/**
 * Word count rules per section type
 */
interface SectionWordCountRules {
  min: number;
  max: number;
}

/**
 * Section type rules:
 * - G2: Introduction 150-250 words
 * - G3: Core sections 200-400 words
 * - G4: Conclusion 100-200 words
 * - Supplementary: 100-300 words
 */
const SECTION_RULES: Record<string, SectionWordCountRules> = {
  introduction: { min: 150, max: 250 },
  core: { min: 200, max: 400 },
  conclusion: { min: 100, max: 200 },
  supplementary: { min: 100, max: 300 },
};

/**
 * WordCountValidator - Enforces word count rules G1-G4
 *
 * G1: Article total matches brief target +/-10%
 * G2: Introduction 150-250 words
 * G3: Core sections 200-400 words
 * G4: Conclusion 100-200 words
 */
export class WordCountValidator {
  /**
   * Count words in content, stripping HTML and markdown
   */
  static countWords(content: string): number {
    return content
      .replace(/<[^>]*>/g, ' ')           // Remove HTML tags
      .replace(/[#*_`~\[\]()]/g, ' ')      // Remove markdown syntax
      .replace(/\s+/g, ' ')               // Normalize whitespace
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }

  /**
   * Validate section word count based on section type
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const wordCount = this.countWords(content);
    const sectionType = this.determineSectionType(context);
    const rules = SECTION_RULES[sectionType] || SECTION_RULES.core;

    if (wordCount < rules.min) {
      const ruleId = this.getRuleId(sectionType);
      violations.push({
        rule: ruleId,
        text: `Section has ${wordCount} words, minimum is ${rules.min}`,
        position: 0,
        suggestion: `Add ${rules.min - wordCount} more words to meet minimum of ${rules.min} words for ${sectionType} sections.`,
        severity: 'warning',
      });
    }

    if (wordCount > rules.max) {
      const ruleId = this.getRuleId(sectionType);
      violations.push({
        rule: ruleId,
        text: `Section has ${wordCount} words, maximum is ${rules.max}`,
        position: 0,
        suggestion: `Remove ${wordCount - rules.max} words to meet maximum of ${rules.max} words for ${sectionType} sections.`,
        severity: 'warning',
      });
    }

    return violations;
  }

  /**
   * Validate article total word count against target (G1)
   * @param content - Full article content
   * @param targetWordCount - Target word count from brief
   * @param tolerance - Tolerance percentage (default 10%)
   */
  static validateArticleTotal(content: string, targetWordCount: number, tolerance: number = 0.10): WordCountResult {
    const actualCount = this.countWords(content);
    const minAllowed = Math.floor(targetWordCount * (1 - tolerance));
    const maxAllowed = Math.ceil(targetWordCount * (1 + tolerance));

    return {
      isValid: actualCount >= minAllowed && actualCount <= maxAllowed,
      actualCount,
      targetCount: targetWordCount,
      tolerance,
      minAllowed,
      maxAllowed,
    };
  }

  /**
   * Validate article total with violations (for integration with RulesValidator)
   */
  static validateArticleTotalWithViolations(content: string, targetWordCount: number): ValidationViolation[] {
    const result = this.validateArticleTotal(content, targetWordCount);

    if (result.isValid) return [];

    const diff = result.actualCount - result.targetCount;
    const direction = diff < 0 ? 'under' : 'over';

    return [{
      rule: 'G1_ARTICLE_WORD_COUNT',
      text: `Article has ${result.actualCount} words, target is ${result.targetCount} (+/-${result.tolerance * 100}%)`,
      position: 0,
      suggestion: direction === 'under'
        ? `Add ${Math.abs(diff)} more words to reach target range of ${result.minAllowed}-${result.maxAllowed} words.`
        : `Remove ${diff} words to reach target range of ${result.minAllowed}-${result.maxAllowed} words.`,
      severity: 'warning',
    }];
  }

  /**
   * Determine section type from context
   */
  private static determineSectionType(context: SectionGenerationContext): string {
    const heading = context.section?.heading?.toLowerCase() || '';

    // Check for introduction patterns
    // Note: Level 1 headings are treated as introduction because in this content generation
    // system, level 1 is exclusively used for the article's main title/intro section.
    // The structured outline schema enforces that core content sections start at level 2+.
    if (heading.includes('introduction') || heading.includes('intro') || context.section?.level === 1) {
      return 'introduction';
    }

    // Check for conclusion patterns
    if (heading.includes('conclusion') || heading.includes('summary') || heading.includes('final')) {
      return 'conclusion';
    }

    // Check for supplementary zone
    if (context.section?.content_zone === 'SUPPLEMENTARY') {
      return 'supplementary';
    }

    // Default to core section
    return 'core';
  }

  /**
   * Get rule ID based on section type
   */
  private static getRuleId(sectionType: string): string {
    const ruleMap: Record<string, string> = {
      introduction: 'G2_INTRO_WORD_COUNT',
      core: 'G3_CORE_WORD_COUNT',
      conclusion: 'G4_CONCLUSION_WORD_COUNT',
      supplementary: 'G3_CORE_WORD_COUNT', // Supplementary uses core rule ID
    };
    return ruleMap[sectionType] || 'G3_CORE_WORD_COUNT';
  }
}
