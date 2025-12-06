import { BriefCodeParser } from '../briefCodeParser';

describe('BriefCodeParser', () => {
  describe('parseFormatCodes', () => {
    it('should detect [FS] Featured Snippet code', () => {
      const result = BriefCodeParser.parseFormatCodes('[FS] Write a concise definition');
      expect(result.formatCode).toBe('FS');
    });

    it('should detect [PAA] People Also Ask code', () => {
      const result = BriefCodeParser.parseFormatCodes('[PAA] Answer this question directly');
      expect(result.formatCode).toBe('PAA');
    });

    it('should detect [LISTING] code', () => {
      const result = BriefCodeParser.parseFormatCodes('[LISTING] Create an ordered list');
      expect(result.formatCode).toBe('LISTING');
    });

    it('should extract required phrases from quotes', () => {
      const result = BriefCodeParser.parseFormatCodes('Include "credit score calculation" and "payment history"');
      expect(result.requiredPhrases).toContain('credit score calculation');
      expect(result.requiredPhrases).toContain('payment history');
    });

    it('should extract anchor texts', () => {
      const result = BriefCodeParser.parseFormatCodes('[Anchor: German Shepherd diet guide]');
      expect(result.anchorTexts).toContain('German Shepherd diet guide');
    });

    it('should default to PROSE when no code found', () => {
      const result = BriefCodeParser.parseFormatCodes('Just regular instructions');
      expect(result.formatCode).toBe('PROSE');
    });
  });

  describe('getFormatConstraints', () => {
    it('should return constraints for FS code', () => {
      const constraints = BriefCodeParser.getFormatConstraints('FS');
      expect(constraints).toContain('40-50 words');
    });

    it('should return constraints for LISTING code', () => {
      const constraints = BriefCodeParser.getFormatConstraints('LISTING');
      expect(constraints).toContain('preamble');
    });
  });
});
