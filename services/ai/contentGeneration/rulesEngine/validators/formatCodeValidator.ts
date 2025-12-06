// services/ai/contentGeneration/rulesEngine/validators/formatCodeValidator.ts

import { ValidationViolation, FormatCode } from '../../../../../types';

export class FormatCodeValidator {
  private static readonly FS_MIN_WORDS = 40;
  private static readonly FS_MAX_WORDS = 50;

  static validate(content: string, formatCode: FormatCode): ValidationViolation[] {
    switch (formatCode) {
      case 'FS':
        return this.validateFeaturedSnippet(content);
      case 'PAA':
        return this.validatePAA(content);
      case 'LISTING':
        return this.validateListing(content);
      case 'TABLE':
        return this.validateTable(content);
      case 'DEFINITIVE':
        return this.validateDefinitive(content);
      default:
        return [];
    }
  }

  private static validateFeaturedSnippet(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const words = content.trim().split(/\s+/).length;

    if (words < this.FS_MIN_WORDS) {
      violations.push({
        rule: 'FS_WORD_COUNT',
        text: `${words} words`,
        position: 0,
        suggestion: `Featured Snippet must be 40-50 words. Current: ${words}. Add more detail.`,
        severity: 'error',
      });
    } else if (words > this.FS_MAX_WORDS) {
      violations.push({
        rule: 'FS_WORD_COUNT',
        text: `${words} words`,
        position: 0,
        suggestion: `Featured Snippet must be 40-50 words. Current: ${words}. Reduce to fit snippet box.`,
        severity: 'error',
      });
    }

    // Check for direct definition at start
    const startsWithDefinition = /^[A-Z][^.!?]*\s+(?:is|are|refers?\s+to|means?)\s+/i.test(content);
    if (!startsWithDefinition) {
      violations.push({
        rule: 'FS_NO_DEFINITION',
        text: content.substring(0, 50) + '...',
        position: 0,
        suggestion: 'Featured Snippet must start with direct definition: "[Entity] is/are..."',
        severity: 'warning',
      });
    }

    return violations;
  }

  private static validatePAA(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // PAA should have definition + expansion structure
    const sentences = content.split(/[.!?]+\s*/).filter(s => s.trim().length > 0);

    if (sentences.length < 2) {
      violations.push({
        rule: 'PAA_STRUCTURE',
        text: content,
        position: 0,
        suggestion: 'PAA answer needs Definition + Expansion. Add elaboration after the direct answer.',
        severity: 'warning',
      });
    }

    return violations;
  }

  private static validateListing(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Check for list markers
    const hasListMarkers = /[-*•]\s+|^\d+\.\s+/m.test(content);

    if (!hasListMarkers) {
      violations.push({
        rule: 'LISTING_NO_LIST',
        text: content.substring(0, 100),
        position: 0,
        suggestion: 'LISTING format requires bullet points or numbered list.',
        severity: 'error',
      });
      return violations;
    }

    // Check for preamble (sentence before list)
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const firstLineIsList = /^[-*•]\s+|^\d+\.\s+/.test(lines[0]?.trim() || '');

    if (firstLineIsList) {
      violations.push({
        rule: 'LISTING_NO_PREAMBLE',
        text: lines[0],
        position: 0,
        suggestion: 'Lists require a preamble sentence before items. E.g., "The main benefits include:"',
        severity: 'error',
      });
    }

    return violations;
  }

  private static validateTable(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Check for table structure (markdown or HTML)
    const hasTable = /\|.*\|/.test(content) || /<table/i.test(content);

    if (!hasTable) {
      violations.push({
        rule: 'TABLE_NO_TABLE',
        text: content.substring(0, 100),
        position: 0,
        suggestion: 'TABLE format requires actual table markup (Markdown | or HTML <table>).',
        severity: 'error',
      });
    }

    return violations;
  }

  private static validateDefinitive(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const words = content.trim().split(/\s+/).length;

    // Definitive should be comprehensive - at least 200 words
    if (words < 200) {
      violations.push({
        rule: 'DEFINITIVE_TOO_SHORT',
        text: `${words} words`,
        position: 0,
        suggestion: `DEFINITIVE format requires comprehensive coverage. Current: ${words} words. Expand with more detail.`,
        severity: 'warning',
      });
    }

    return violations;
  }
}
