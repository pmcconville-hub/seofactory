// services/ai/contentGeneration/rulesEngine/validators/crossSectionRepetitionValidator.ts

import { ValidationViolation } from '../../../../../types';

/**
 * Common transitional phrases that should be ignored when detecting repetition
 */
const COMMON_TRANSITIONS = [
  'in addition',
  'furthermore',
  'moreover',
  'however',
  'therefore',
  'consequently',
  'as a result',
  'on the other hand',
  'in contrast',
  'for example',
  'for instance',
  'in other words',
  'in conclusion',
  'to summarize',
  'first of all',
  'second of all',
  'last but not least',
  'in summary',
  'to begin with',
  'as mentioned',
  'as stated',
  'as noted',
  'it is important',
  'it is worth',
  'it should be',
];

/**
 * Common English stop words to filter out when extracting significant phrases
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
  'he', 'she', 'him', 'her', 'his', 'we', 'us', 'our', 'you', 'your',
  'who', 'which', 'what', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'also', 'now', 'here', 'there', 'then', 'once', 'if', 'into', 'about',
  'after', 'before', 'above', 'below', 'between', 'under', 'over', 'any',
]);

interface PhraseOccurrence {
  phrase: string;
  sectionIndex: number;
  position: number;
}

interface Section {
  heading: string;
  content: string;
  startPosition: number;
}

export class CrossSectionRepetitionValidator {
  /**
   * Validate content for cross-section repetition (Rule H9)
   * Flags phrases that appear in 2+ different sections
   */
  static validate(content: string): ValidationViolation[] {
    if (!content || content.trim().length === 0) {
      return [];
    }

    const violations: ValidationViolation[] = [];
    const sections = this.splitIntoSections(content);

    // If there's only one section or no sections, nothing to compare
    if (sections.length < 2) {
      return [];
    }

    // Extract significant phrases from each section
    const phraseOccurrences = new Map<string, PhraseOccurrence[]>();

    sections.forEach((section, sectionIndex) => {
      const phrases = this.extractSignificantPhrases(section.content);

      for (const phraseData of phrases) {
        const normalizedPhrase = phraseData.phrase.toLowerCase();

        // Skip common transitions
        if (this.isCommonTransition(normalizedPhrase)) {
          continue;
        }

        if (!phraseOccurrences.has(normalizedPhrase)) {
          phraseOccurrences.set(normalizedPhrase, []);
        }

        phraseOccurrences.get(normalizedPhrase)!.push({
          phrase: phraseData.phrase,
          sectionIndex,
          position: section.startPosition + phraseData.position,
        });
      }
    });

    // Find phrases that appear in multiple sections
    for (const [phrase, occurrences] of phraseOccurrences) {
      const uniqueSections = new Set<number>(occurrences.map(o => o.sectionIndex));

      if (uniqueSections.size >= 2) {
        // Report the first occurrence after the first section
        const firstOccurrence = occurrences[0];
        const sectionNumbers = Array.from(uniqueSections)
          .map((i: number) => i + 1)
          .sort((a: number, b: number) => a - b);

        violations.push({
          rule: 'H9_CROSS_SECTION_REPETITION',
          text: firstOccurrence.phrase,
          position: firstOccurrence.position,
          suggestion: `Phrase "${firstOccurrence.phrase}" appears in sections ${sectionNumbers.join(', ')}. Consider rephrasing to avoid redundancy and improve information diversity.`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  /**
   * Split content into sections based on H2 and H3 headings
   */
  private static splitIntoSections(content: string): Section[] {
    const sections: Section[] = [];
    // Match ## or ### headings in markdown
    const headingRegex = /^#{2,3}\s+.+$/gm;

    const matches = [...content.matchAll(headingRegex)];

    if (matches.length === 0) {
      // No headings found, treat entire content as one section
      return [{ heading: '', content, startPosition: 0 }];
    }

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const heading = match[0];
      const startPos = match.index!;
      const contentStart = startPos + heading.length;

      // Find where this section ends (next heading or end of content)
      const endPos = i < matches.length - 1
        ? matches[i + 1].index!
        : content.length;

      const sectionContent = content.slice(contentStart, endPos).trim();

      sections.push({
        heading,
        content: sectionContent,
        startPosition: startPos,
      });
    }

    return sections;
  }

  /**
   * Extract significant phrases (3-5 word n-grams) from text
   * Filters out phrases that are mostly stop words
   */
  static extractSignificantPhrases(text: string): { phrase: string; position: number }[] {
    const phrases: { phrase: string; position: number }[] = [];

    // Normalize text: remove punctuation except spaces, convert to lowercase
    const cleanText = text.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleanText.split(' ').filter(w => w.length > 0);

    // Extract n-grams of sizes 3, 4, and 5
    for (let n = 3; n <= 5; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        const phraseWords = words.slice(i, i + n);
        const phrase = phraseWords.join(' ');

        // Count significant (non-stop) words
        const significantWordCount = phraseWords.filter(
          w => !STOP_WORDS.has(w.toLowerCase())
        ).length;

        // Require at least 2 significant words in the phrase
        if (significantWordCount >= 2) {
          // Find position in original text
          const position = this.findPhrasePosition(text, phraseWords);

          phrases.push({
            phrase: phrase.toLowerCase(),
            position,
          });
        }
      }
    }

    return phrases;
  }

  /**
   * Find the position of a phrase in the original text
   */
  private static findPhrasePosition(text: string, words: string[]): number {
    // Create a regex pattern that matches the words with possible whitespace/punctuation between
    const pattern = words
      .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('[\\s\\W]+');

    const regex = new RegExp(pattern, 'i');
    const match = text.match(regex);

    return match?.index ?? 0;
  }

  /**
   * Check if a phrase is a common transitional phrase
   */
  private static isCommonTransition(phrase: string): boolean {
    const normalizedPhrase = phrase.toLowerCase().trim();

    return COMMON_TRANSITIONS.some(transition => {
      // Check if phrase starts with or equals the transition
      return normalizedPhrase.startsWith(transition) ||
        normalizedPhrase === transition ||
        transition.startsWith(normalizedPhrase);
    });
  }
}
