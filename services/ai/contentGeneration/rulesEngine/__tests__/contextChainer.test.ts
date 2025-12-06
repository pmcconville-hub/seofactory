import { ContextChainer } from '../contextChainer';

describe('ContextChainer', () => {
  describe('extractForNext', () => {
    it('should extract last paragraph and sentence', () => {
      const content = `First paragraph about engines.

Second paragraph about fuel. Fuel combustion generates energy. Energy propels the pistons.`;

      const result = ContextChainer.extractForNext(content);

      expect(result.previousParagraph).toContain('Energy propels the pistons');
      expect(result.lastSentence).toBe('Energy propels the pistons.');
    });

    it('should extract grammatical object from last sentence', () => {
      const content = 'The German Shepherd requires daily exercise.';
      const result = ContextChainer.extractForNext(content);

      expect(result.lastObject).toBe('daily exercise');
    });

    it('should generate subject hint for next section', () => {
      const content = 'Dogs need proper nutrition.';
      const result = ContextChainer.extractForNext(content);

      expect(result.subjectHint).toBeTruthy();
      expect(result.subjectHint).toContain('proper nutrition');
    });

    it('should handle empty content', () => {
      const result = ContextChainer.extractForNext('');

      expect(result.previousParagraph).toBe('');
      expect(result.lastSentence).toBe('');
      expect(result.lastObject).toBe('');
      expect(result.subjectHint).toBe('');
    });

    it('should extract object from "is" patterns', () => {
      const content = 'German Shepherd is a working dog breed.';
      const result = ContextChainer.extractForNext(content);

      expect(result.lastObject).toBe('working dog breed');
    });
  });

  describe('buildContext', () => {
    it('should return null for first section', () => {
      const result = ContextChainer.buildContext(null);

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = ContextChainer.buildContext('');

      expect(result).toBeNull();
    });

    it('should return discourse context for valid content', () => {
      const result = ContextChainer.buildContext('Dogs require exercise.');

      expect(result).not.toBeNull();
      expect(result?.lastObject).toBe('exercise');
    });
  });
});
