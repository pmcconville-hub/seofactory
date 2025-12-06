// services/ai/contentGeneration/rulesEngine/contextChainer.ts

import { DiscourseContext } from '../../../../types';

export class ContextChainer {
  /**
   * Extract discourse context from generated content for the next section
   * Implements S-P-O chaining: Object of previous → Subject of next
   */
  static extractForNext(content: string): DiscourseContext {
    if (!content || content.trim().length === 0) {
      return {
        previousParagraph: '',
        lastSentence: '',
        lastObject: '',
        subjectHint: '',
      };
    }

    // Split into paragraphs
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
    const lastParagraph = paragraphs[paragraphs.length - 1] || '';

    // Split into sentences (handle common abbreviations)
    const sentences = lastParagraph
      .replace(/([.?!])\s+/g, '$1|')
      .split('|')
      .filter(s => s.trim().length > 0);

    const lastSentence = sentences[sentences.length - 1]?.trim() || '';

    // Extract grammatical object (simplified: last noun phrase after verb)
    const lastObject = this.extractObject(lastSentence);

    // Generate subject hint for next section
    const subjectHint = lastObject
      ? `Start by connecting to "${lastObject}" from the previous section.`
      : '';

    return {
      previousParagraph: lastParagraph.trim(),
      lastSentence: lastSentence,
      lastObject: lastObject,
      subjectHint: subjectHint,
    };
  }

  /**
   * Extract the grammatical object from a sentence
   * Simplified NLP: looks for noun phrases after common verbs
   */
  private static extractObject(sentence: string): string {
    if (!sentence) return '';

    // Remove trailing punctuation
    const clean = sentence.replace(/[.?!]+$/, '').trim();

    // Common patterns: "X requires Y", "X needs Y", "X provides Y", "X is Y"
    const verbPatterns = [
      /(?:requires?|needs?|provides?|offers?|includes?|contains?|has|have)\s+(.+)$/i,
      /(?:is|are|was|were)\s+(?:a|an|the)?\s*(.+)$/i,
      /(?:uses?|creates?|generates?|produces?)\s+(.+)$/i,
    ];

    for (const pattern of verbPatterns) {
      const match = clean.match(pattern);
      if (match && match[1]) {
        // Return the captured object, trimmed
        return match[1].trim();
      }
    }

    // Fallback: last 2-4 words as likely object
    const words = clean.split(/\s+/);
    if (words.length >= 3) {
      return words.slice(-3).join(' ');
    }

    return '';
  }

  /**
   * Build discourse context for section generation
   */
  static buildContext(previousContent: string | null): DiscourseContext | null {
    if (!previousContent || previousContent.trim().length === 0) {
      return null;
    }

    return this.extractForNext(previousContent);
  }
}
