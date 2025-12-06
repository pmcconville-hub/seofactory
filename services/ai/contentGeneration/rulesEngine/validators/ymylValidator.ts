// services/ai/contentGeneration/rulesEngine/validators/ymylValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';

type YMYLCategory = 'HEALTH' | 'FINANCE' | 'LEGAL' | 'SAFETY';

export class YMYLValidator {
  private static readonly YMYL_KEYWORDS: Record<YMYLCategory, string[]> = {
    HEALTH: [
      'symptom', 'treatment', 'medication', 'disease', 'diagnosis',
      'medical', 'health', 'doctor', 'patient', 'therapy', 'drug',
      'dosage', 'side effect', 'prescription', 'surgery',
    ],
    FINANCE: [
      'investment', 'loan', 'mortgage', 'tax', 'insurance',
      'credit', 'debt', 'financial', 'bank', 'retirement',
      'stock', 'bond', 'portfolio', 'interest rate',
    ],
    LEGAL: [
      'law', 'legal', 'lawsuit', 'attorney', 'court',
      'contract', 'liability', 'regulation', 'compliance',
      'rights', 'statute', 'litigation',
    ],
    SAFETY: [
      'safety', 'emergency', 'danger', 'warning', 'hazard',
      'risk', 'injury', 'accident', 'protection', 'recall',
    ],
  };

  private static readonly CONDITION_PATTERNS = [
    /\b(?:however|unless|depending on|except|although|but)\b/i,
    /\b(?:in (?:some|certain) cases?|under (?:certain|specific) conditions?)\b/i,
    /\b(?:consult|speak with|see)\s+(?:a|your)?\s*(?:doctor|physician|professional|advisor)\b/i,
  ];

  static detectYMYL(content: string): { isYMYL: boolean; category?: YMYLCategory } {
    const lowerContent = content.toLowerCase();

    for (const [category, keywords] of Object.entries(this.YMYL_KEYWORDS)) {
      const matchCount = keywords.filter(kw => lowerContent.includes(kw)).length;
      if (matchCount >= 2) {
        return { isYMYL: true, category: category as YMYLCategory };
      }
    }

    return { isYMYL: false };
  }

  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    if (!context.isYMYL) return violations;

    // Safe Answer Protocol: Check for condition/exception
    const hasCondition = this.CONDITION_PATTERNS.some(pattern => pattern.test(content));

    if (!hasCondition) {
      violations.push({
        rule: 'YMYL_SAFE_ANSWER',
        text: content.substring(0, 100) + '...',
        position: 0,
        suggestion: 'YMYL content requires Safe Answer Protocol: Add condition/exception (However, Unless, Depending on...) or professional consultation recommendation',
        severity: 'warning',
      });
    }

    // Check for citation placement (fact first, then source)
    const badCitationPattern = /^According to\s+/i;
    const sentences = content.split(/[.!?]+\s*/);

    sentences.forEach(sentence => {
      if (badCitationPattern.test(sentence.trim())) {
        violations.push({
          rule: 'YMYL_CITATION_ORDER',
          text: sentence,
          position: content.indexOf(sentence),
          suggestion: 'State the fact first, then the source. Change "According to X, Y" to "Y, according to X"',
          severity: 'warning',
        });
      }
    });

    return violations;
  }
}
