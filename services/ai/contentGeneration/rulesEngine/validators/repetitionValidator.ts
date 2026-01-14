// services/ai/contentGeneration/rulesEngine/validators/repetitionValidator.ts

import { ValidationViolation, ContentGenerationSection } from '../../../../../types';
import { splitSentences } from '../../../../../utils/sentenceTokenizer';

// Common opening patterns that indicate repetitive section starts (multilingual)
const REPETITIVE_OPENING_PATTERNS = [
  // Dutch patterns
  /^(het|de|een)\s+(controleren|controle|inspectie|onderzoek|analyse|beoordeling)\s+(van|op|bij)\s+/i,
  /^(bij|voor|met)\s+(het|de|een)\s+(controleren|controle|inspectie)\s+(van|op|bij)\s+/i,
  /^(deze|dit|die|dat)\s+(sectie|hoofdstuk|onderdeel|gedeelte)\s+(behandelt|bespreekt|beschrijft)/i,
  // English patterns
  /^(the|a|an)\s+(checking|inspection|analysis|examination|assessment)\s+(of|for|on)\s+/i,
  /^(when|while|for)\s+(checking|inspecting|analyzing|examining)\s+/i,
  /^this\s+(section|chapter|part)\s+(covers|discusses|describes|explains)/i,
];

export class RepetitionValidator {
  /**
   * Detect repeated information/definitions within content
   */
  static validate(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    const sentences = splitSentences(content).filter(s => s.trim().length > 10);

    // Check for similar sentences (simplified approach)
    for (let i = 0; i < sentences.length; i++) {
      for (let j = i + 1; j < sentences.length; j++) {
        const similarity = this.calculateSimilarity(sentences[i], sentences[j]);

        if (similarity > 0.7) {
          violations.push({
            rule: 'INFORMATION_REPETITION',
            text: sentences[j].substring(0, 50) + '...',
            position: content.indexOf(sentences[j]),
            suggestion: 'This sentence is similar to an earlier one. Remove repetition to increase Information Gain.',
            severity: 'warning',
          });
        }
      }
    }

    return violations;
  }

  /**
   * Detect repetitive opening phrases across sections.
   * This catches patterns like:
   * - "Het controleren van naden en aansluitingen beschermt..."
   * - "De controle van naden en aansluitingen begint..."
   * - "De inspectie van naden en aansluitingen richt zich..."
   */
  static validateCrossSectionOpenings(sections: ContentGenerationSection[]): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Extract first sentence of each section (skip intro/conclusion)
    const sectionOpenings: Array<{ key: string; heading: string; opening: string }> = [];

    for (const section of sections) {
      if (!section.current_content) continue;
      if (section.section_key === 'intro' || section.section_key === 'conclusion') continue;

      // Get first sentence after any heading
      const content = section.current_content.replace(/^#+\s+.+\n+/, '');
      const sentences = splitSentences(content);
      const firstSentence = sentences[0]?.trim() || '';

      if (firstSentence.length > 20) {
        sectionOpenings.push({
          key: section.section_key,
          heading: section.section_heading || '',
          opening: firstSentence
        });
      }
    }

    // Check for similar openings
    const openingPatterns = new Map<string, string[]>();

    for (const section of sectionOpenings) {
      // Normalize opening to pattern (first 8 words)
      const words = section.opening.toLowerCase().split(/\s+/).slice(0, 8);
      const pattern = words.join(' ');

      // Check against known repetitive patterns
      for (const regex of REPETITIVE_OPENING_PATTERNS) {
        if (regex.test(section.opening)) {
          if (!openingPatterns.has('repetitive_pattern')) {
            openingPatterns.set('repetitive_pattern', []);
          }
          openingPatterns.get('repetitive_pattern')!.push(section.key);
          break;
        }
      }

      // Check similarity with other sections
      for (const [patternKey, sectionKeys] of openingPatterns) {
        if (patternKey === 'repetitive_pattern') continue;

        const similarity = this.calculateSimilarity(pattern, patternKey);
        if (similarity > 0.6) {
          sectionKeys.push(section.key);
        }
      }

      if (!openingPatterns.has(pattern)) {
        openingPatterns.set(pattern, [section.key]);
      }
    }

    // Report violations for sections with similar openings
    for (const [pattern, sectionKeys] of openingPatterns) {
      if (sectionKeys.length >= 3) {
        violations.push({
          rule: 'CROSS_SECTION_REPETITION',
          text: `${sectionKeys.length} sections start with similar phrasing`,
          position: 0,
          suggestion: `Sections ${sectionKeys.slice(0, 3).join(', ')} have repetitive openings. Vary the sentence structure to improve readability. Use different verbs, subjects, or perspectives.`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  /**
   * Get varied opening suggestions for sections
   */
  static getVariedOpeningSuggestions(centralEntity: string): string[] {
    return [
      `${centralEntity} requires careful attention to...`,
      `Professional standards for ${centralEntity} emphasize...`,
      `Understanding ${centralEntity} begins with...`,
      `The foundation of effective ${centralEntity} lies in...`,
      `Experts recommend approaching ${centralEntity} through...`,
      `Successful implementation of ${centralEntity} depends on...`,
      `Key considerations for ${centralEntity} include...`,
      `The practical application of ${centralEntity} involves...`,
    ];
  }

  private static calculateSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));

    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersection = 0;
    wordsA.forEach(word => {
      if (wordsB.has(word)) intersection++;
    });

    return intersection / Math.min(wordsA.size, wordsB.size);
  }
}
