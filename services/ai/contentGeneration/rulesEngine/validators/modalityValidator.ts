// services/ai/contentGeneration/rulesEngine/validators/modalityValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { getLanguageName } from '../../../../../utils/languageUtils';

/**
 * Multilingual modality patterns
 * Supports: English, Dutch, German, French, Spanish
 */
interface LanguageModalityPatterns {
  uncertainPatterns: RegExp[];
  possibilityContexts: string[];
}

const MULTILINGUAL_MODALITY_PATTERNS: Record<string, LanguageModalityPatterns> = {
  'English': {
    uncertainPatterns: [
      /\b(?:might|could)\s+be\b/gi,
      /\b(?:may|might)\s+(?:have|cause|lead|result)\b/gi,
      /\bmight\s+\w+/gi,
    ],
    possibilityContexts: [
      'risk', 'danger', 'warning', 'caution', 'side effect',
      'potential', 'possible', 'exception', 'condition',
    ],
  },

  'Dutch': {
    uncertainPatterns: [
      /\b(?:zou|zouden)\s+kunnen\b/gi,
      /\bkan\s+(?:zijn|hebben|veroorzaken|leiden)\b/gi,
      /\bkunnen\s+(?:zijn|hebben|veroorzaken|leiden)\b/gi,
      /\bmisschien\s+\w+/gi,
      /\bmogelijk\s+\w+/gi,
      /\bwellicht\s+\w+/gi,
    ],
    possibilityContexts: [
      'risico', 'gevaar', 'waarschuwing', 'voorzichtigheid', 'bijwerking',
      'potentieel', 'mogelijk', 'uitzondering', 'voorwaarde',
    ],
  },

  'German': {
    uncertainPatterns: [
      /\b(?:könnte|könnten)\s+sein\b/gi,
      /\bkann\s+(?:sein|haben|verursachen|führen)\b/gi,
      /\bkönnen\s+(?:sein|haben|verursachen|führen)\b/gi,
      /\bvielleicht\s+\w+/gi,
      /\bmöglicherweise\s+\w+/gi,
      /\beventuell\s+\w+/gi,
    ],
    possibilityContexts: [
      'risiko', 'gefahr', 'warnung', 'vorsicht', 'nebenwirkung',
      'potenzial', 'möglich', 'ausnahme', 'bedingung',
    ],
  },

  'French': {
    uncertainPatterns: [
      /\b(?:pourrait|pourraient)\s+être\b/gi,
      /\bpeut\s+(?:être|avoir|causer|mener)\b/gi,
      /\bpeuvent\s+(?:être|avoir|causer|mener)\b/gi,
      /\bpeut-être\s+\w+/gi,
      /\bpossiblement\s+\w+/gi,
      /\béventuellement\s+\w+/gi,
    ],
    possibilityContexts: [
      'risque', 'danger', 'avertissement', 'précaution', 'effet secondaire',
      'potentiel', 'possible', 'exception', 'condition',
    ],
  },

  'Spanish': {
    uncertainPatterns: [
      /\b(?:podría|podrían)\s+ser\b/gi,
      /\bpuede\s+(?:ser|tener|causar|llevar)\b/gi,
      /\bpueden\s+(?:ser|tener|causar|llevar)\b/gi,
      /\btal\s+vez\s+\w+/gi,
      /\bquizás\s+\w+/gi,
      /\bposiblemente\s+\w+/gi,
    ],
    possibilityContexts: [
      'riesgo', 'peligro', 'advertencia', 'precaución', 'efecto secundario',
      'potencial', 'posible', 'excepción', 'condición',
    ],
  },
};

/**
 * Get modality patterns for a specific language
 */
function getModalityPatterns(language?: string): LanguageModalityPatterns {
  const langName = getLanguageName(language);
  return MULTILINGUAL_MODALITY_PATTERNS[langName] || MULTILINGUAL_MODALITY_PATTERNS['English'];
}

export class ModalityValidator {
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const heading = context.section.heading?.toLowerCase() || '';

    // Get language-specific patterns
    const language = context.language;
    const patterns = getModalityPatterns(language);

    // Check if we're in a possibility context (risks, warnings, etc.)
    const isPossibilityContext = patterns.possibilityContexts.some(
      term => heading.includes(term)
    );

    // If in possibility context, uncertain language is acceptable
    if (isPossibilityContext) {
      return violations;
    }

    // Check for uncertain modality using language-specific patterns
    for (const pattern of patterns.uncertainPatterns) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'MODALITY_UNCERTAINTY',
          text: match[0],
          position: match.index || 0,
          suggestion: `Replace uncertain "${match[0]}" with definitive verb for facts, or use only for genuine possibilities`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }
}

// Export for testing
export { MULTILINGUAL_MODALITY_PATTERNS, getModalityPatterns };
