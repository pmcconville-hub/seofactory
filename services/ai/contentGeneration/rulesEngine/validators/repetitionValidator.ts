// services/ai/contentGeneration/rulesEngine/validators/repetitionValidator.ts

import { ValidationViolation } from '../../../../../types';

export class RepetitionValidator {
  /**
   * Detect repeated information/definitions within content
   */
  static validate(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    const sentences = content.split(/[.!?]+\s*/).filter(s => s.trim().length > 10);

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
