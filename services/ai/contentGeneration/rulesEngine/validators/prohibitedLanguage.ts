// services/ai/contentGeneration/rulesEngine/validators/prohibitedLanguage.ts

import { ValidationViolation } from '../../../../../types';

export const PROHIBITED_PATTERNS = {
  STOP_WORDS: [
    'also', 'basically', 'actually', 'very', 'really',
    'just', 'quite', 'anyway', 'maybe', 'perhaps',
    'certainly', 'definitely', 'obviously', 'simply',
  ],

  OPINIONS: [
    /\b(I think|we think|I believe|we believe|in my opinion|in our opinion)\b/gi,
    /\b(unfortunately|fortunately|hopefully|ideally|interestingly)\b/gi,
    /\b(beautiful|amazing|wonderful|terrible|horrible|awesome|fantastic)\b/gi,
  ],

  ANALOGIES: [
    /\b(like a|similar to|is like|as if|imagine|think of it as)\b/gi,
    /\b(metaphor|analogy|compared to a|just like)\b/gi,
  ],

  PASSIVE_VOICE: [
    /\b(is|are|was|were|been|being)\s+(being\s+)?\w+ed\b/gi,
  ],

  FUTURE_FOR_FACTS: [
    /\bwill (always|never|typically|usually|generally)\b/gi,
  ],

  AMBIGUOUS_PRONOUNS: [
    /^(It|They|This|That|These|Those)\s+(is|are|was|were|said|mentioned|noted)\b/gi,
  ],

  FLUFF_OPENERS: [
    /^(In this (article|guide|post|section)|Let's (dive|explore|look|discuss)|Have you ever wondered)/i,
    /^(Welcome to|Today we|We will|We're going to)/i,
  ],
};

export class ProhibitedLanguageValidator {
  static validate(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Check stop words
    const words = content.toLowerCase().split(/\s+/);
    for (const stopWord of PROHIBITED_PATTERNS.STOP_WORDS) {
      const indices = this.findWordIndices(content, stopWord);
      for (const index of indices) {
        violations.push({
          rule: 'STOP_WORDS',
          text: stopWord,
          position: index,
          suggestion: `Remove filler word "${stopWord}" - it adds no semantic value`,
          severity: 'warning',
        });
      }
    }

    // Check opinions
    for (const pattern of PROHIBITED_PATTERNS.OPINIONS) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'OPINIONS',
          text: match[0],
          position: match.index || 0,
          suggestion: `Remove opinionated language "${match[0]}" - use factual statements instead`,
          severity: 'error',
        });
      }
    }

    // Check analogies
    for (const pattern of PROHIBITED_PATTERNS.ANALOGIES) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'ANALOGIES',
          text: match[0],
          position: match.index || 0,
          suggestion: `Remove analogy "${match[0]}" - analogies introduce irrelevant entities into the semantic space`,
          severity: 'error',
        });
      }
    }

    // Check fluff openers (only at start)
    for (const pattern of PROHIBITED_PATTERNS.FLUFF_OPENERS) {
      if (pattern.test(content)) {
        const match = content.match(pattern);
        violations.push({
          rule: 'FLUFF_OPENERS',
          text: match?.[0] || '',
          position: 0,
          suggestion: 'Remove fluff opener - start with a direct definition or fact',
          severity: 'error',
        });
      }
    }

    // Check ambiguous pronouns at sentence starts
    const sentences = content.split(/[.!?]+\s*/);
    sentences.forEach((sentence, idx) => {
      for (const pattern of PROHIBITED_PATTERNS.AMBIGUOUS_PRONOUNS) {
        if (pattern.test(sentence)) {
          const match = sentence.match(pattern);
          violations.push({
            rule: 'AMBIGUOUS_PRONOUNS',
            text: match?.[0] || '',
            position: content.indexOf(sentence),
            suggestion: 'Replace ambiguous pronoun with explicit entity name',
            severity: 'warning',
          });
        }
      }
    });

    // Check future tense for facts
    for (const pattern of PROHIBITED_PATTERNS.FUTURE_FOR_FACTS) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'FUTURE_FOR_FACTS',
          text: match[0],
          position: match.index || 0,
          suggestion: `Use present tense for permanent facts - change "${match[0]}" to present simple`,
          severity: 'warning',
        });
      }
    }

    // Check passive voice
    for (const pattern of PROHIBITED_PATTERNS.PASSIVE_VOICE) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'PASSIVE_VOICE',
          text: match[0],
          position: match.index || 0,
          suggestion: `Convert passive voice "${match[0]}" to active voice - clarify the subject/agent`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  private static findWordIndices(content: string, word: string): number[] {
    const indices: number[] = [];
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
      indices.push(match.index);
    }
    return indices;
  }
}
