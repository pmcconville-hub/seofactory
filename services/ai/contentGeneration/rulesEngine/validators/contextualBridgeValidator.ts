// services/ai/contentGeneration/rulesEngine/validators/contextualBridgeValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';

export class ContextualBridgeValidator {
  /**
   * Validate contextual bridge between MAIN and SUPPLEMENTARY zones
   * Supplementary sections should have transitional language
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Only validate SUPPLEMENTARY sections
    if (context.section.content_zone !== 'SUPPLEMENTARY') {
      return violations;
    }

    // Check for bridge/transition language at start
    const bridgePatterns = [
      /^(to|for|in order to|when|while|if|beyond|related to|in addition)/i,
      /^(building on|extending|furthermore|additionally)/i,
      /ensure|enjoy|benefit|understand|consider/i,
    ];

    const firstSentence = content.split(/[.!?]/)[0] || '';
    const hasBridge = bridgePatterns.some(p => p.test(firstSentence));

    if (!hasBridge) {
      violations.push({
        rule: 'CONTEXTUAL_BRIDGE_MISSING',
        text: firstSentence.substring(0, 50) + '...',
        position: 0,
        suggestion: 'SUPPLEMENTARY section should start with transitional language connecting to the main topic',
        severity: 'warning',
      });
    }

    return violations;
  }
}
