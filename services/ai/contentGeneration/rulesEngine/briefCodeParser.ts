// services/ai/contentGeneration/rulesEngine/briefCodeParser.ts

import { FormatCode } from '../../../../types';

export interface ParsedCodes {
  formatCode: FormatCode;
  requiredPhrases: string[];
  anchorTexts: string[];
}

export class BriefCodeParser {
  private static readonly FORMAT_PATTERNS: Record<FormatCode, RegExp> = {
    FS: /\[FS\]/i,
    PAA: /\[PAA\]/i,
    LISTING: /\[LISTING\]/i,
    DEFINITIVE: /\[DEFINITIVE\]/i,
    TABLE: /\[TABLE\]/i,
    PROSE: /^$/, // Never matches - default fallback
  };

  private static readonly PHRASE_PATTERN = /"([^"]+)"/g;
  private static readonly ANCHOR_PATTERN = /\[Anchor:\s*([^\]]+)\]/gi;

  static parseFormatCodes(methodologyNote: string): ParsedCodes {
    const result: ParsedCodes = {
      formatCode: 'PROSE',
      requiredPhrases: [],
      anchorTexts: [],
    };

    if (!methodologyNote) return result;

    // Detect format code
    for (const [code, pattern] of Object.entries(this.FORMAT_PATTERNS)) {
      if (code !== 'PROSE' && pattern.test(methodologyNote)) {
        result.formatCode = code as FormatCode;
        break;
      }
    }

    // Extract required phrases
    let phraseMatch;
    while ((phraseMatch = this.PHRASE_PATTERN.exec(methodologyNote)) !== null) {
      result.requiredPhrases.push(phraseMatch[1]);
    }

    // Extract anchor texts
    let anchorMatch;
    while ((anchorMatch = this.ANCHOR_PATTERN.exec(methodologyNote)) !== null) {
      result.anchorTexts.push(anchorMatch[1].trim());
    }

    return result;
  }

  static getFormatConstraints(formatCode: FormatCode): string {
    switch (formatCode) {
      case 'FS':
        return 'Featured Snippet target: Write 40-50 words MAX. Direct definition. First sentence after heading must be the complete answer.';
      case 'PAA':
        return 'People Also Ask target: Use Definition + Expansion structure. Start with direct answer, then elaborate.';
      case 'LISTING':
        return 'List format required: Start with a preamble sentence stating what the list contains and how many items (e.g., "The five main benefits include:"). Then use HTML list.';
      case 'DEFINITIVE':
        return 'Long-form comprehensive answer: Cover all qualifiers and signifiers. Include entity attributes, conditions, and exceptions.';
      case 'TABLE':
        return 'Table format required: First column = Entity Name, subsequent columns = Attributes. Include comparison data.';
      case 'PROSE':
      default:
        return 'Standard prose format. Focus on EAV density and discourse integration.';
    }
  }
}
