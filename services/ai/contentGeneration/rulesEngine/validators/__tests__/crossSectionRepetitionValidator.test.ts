import { CrossSectionRepetitionValidator } from '../crossSectionRepetitionValidator';

describe('CrossSectionRepetitionValidator', () => {
  describe('validate', () => {
    it('should pass when no cross-section repetition exists', () => {
      const content = `
## Introduction to Dogs

Dogs are loyal companions that have been domesticated for thousands of years. They provide emotional support and physical security.

## Health Benefits

Pet ownership reduces stress levels and blood pressure. Walking your pet daily improves cardiovascular health.

## Training Tips

Positive reinforcement works best for teaching new commands. Consistency in training schedules leads to better results.
      `.trim();

      const violations = CrossSectionRepetitionValidator.validate(content);

      expect(violations.filter(v => v.rule === 'H9_CROSS_SECTION_REPETITION')).toHaveLength(0);
    });

    it('should flag when same phrase appears in multiple sections', () => {
      const content = `
## Introduction

German Shepherds require daily exercise to maintain optimal health. This breed is known for intelligence.

## Exercise Requirements

German Shepherds require daily exercise for their physical wellbeing. Regular activity prevents behavioral issues.

## Nutrition Guide

Feed your dog twice per day. German Shepherds require daily exercise is important for digestion.
      `.trim();

      const violations = CrossSectionRepetitionValidator.validate(content);

      const repetitionViolations = violations.filter(v => v.rule === 'H9_CROSS_SECTION_REPETITION');
      expect(repetitionViolations.length).toBeGreaterThan(0);
      // The phrase "German Shepherds require daily exercise" appears in 3 sections
      expect(repetitionViolations.some(v =>
        v.text.toLowerCase().includes('german shepherds require daily exercise') ||
        v.text.toLowerCase().includes('require daily exercise')
      )).toBe(true);
    });

    it('should ignore common transitional phrases', () => {
      const content = `
## Section One

In addition, the product features improved performance. The design is sleek and modern.

## Section Two

In addition, customers report high satisfaction. Furthermore, delivery times have improved.

## Section Three

In addition, the warranty covers three years. On the other hand, pricing remains competitive.
      `.trim();

      const violations = CrossSectionRepetitionValidator.validate(content);

      // "In addition" should not be flagged as it's a common transition
      const repetitionViolations = violations.filter(v => v.rule === 'H9_CROSS_SECTION_REPETITION');
      expect(repetitionViolations.every(v =>
        !v.text.toLowerCase().includes('in addition') &&
        !v.text.toLowerCase().includes('furthermore') &&
        !v.text.toLowerCase().includes('on the other hand')
      )).toBe(true);
    });

    it('should handle section boundaries correctly with H2 and H3 headings', () => {
      const content = `
## Main Section

The key benefits include improved efficiency and reduced costs.

### Subsection A

Users can expect faster processing times. The system handles large datasets.

### Subsection B

The key benefits include improved efficiency in multiple areas. Processing speed is optimized.

## Another Main Section

Performance metrics show significant gains. The key benefits include improved efficiency for all users.
      `.trim();

      const violations = CrossSectionRepetitionValidator.validate(content);

      const repetitionViolations = violations.filter(v => v.rule === 'H9_CROSS_SECTION_REPETITION');
      // "key benefits include improved efficiency" appears across sections
      expect(repetitionViolations.length).toBeGreaterThan(0);
    });

    it('should extract significant phrases with 3+ words excluding stop words', () => {
      const content = `
## First Section

Machine learning algorithms provide accurate predictions for complex datasets.

## Second Section

Different approaches exist. Machine learning algorithms provide accurate predictions in various domains.
      `.trim();

      const violations = CrossSectionRepetitionValidator.validate(content);

      const repetitionViolations = violations.filter(v => v.rule === 'H9_CROSS_SECTION_REPETITION');
      expect(repetitionViolations.length).toBeGreaterThan(0);
      // Should catch "machine learning algorithms provide accurate predictions"
      expect(repetitionViolations.some(v =>
        v.text.toLowerCase().includes('machine learning') ||
        v.text.toLowerCase().includes('accurate predictions')
      )).toBe(true);
    });

    it('should return violations with correct severity and suggestion', () => {
      const content = `
## Section A

The advanced technology enables seamless integration with existing systems.

## Section B

Companies adopt this because the advanced technology enables seamless integration across platforms.
      `.trim();

      const violations = CrossSectionRepetitionValidator.validate(content);

      const repetitionViolations = violations.filter(v => v.rule === 'H9_CROSS_SECTION_REPETITION');
      expect(repetitionViolations.length).toBeGreaterThan(0);

      const violation = repetitionViolations[0];
      expect(violation.severity).toBe('warning');
      expect(violation.suggestion.toLowerCase()).toContain('rephras');
      expect(violation.position).toBeGreaterThanOrEqual(0);
    });

    it('should not flag phrases that only appear once', () => {
      const content = `
## Section One

Unique content appears only here with specific terminology.

## Section Two

Completely different phrases exist in this section alone.

## Section Three

Another distinct set of words fills this final section.
      `.trim();

      const violations = CrossSectionRepetitionValidator.validate(content);

      const repetitionViolations = violations.filter(v => v.rule === 'H9_CROSS_SECTION_REPETITION');
      expect(repetitionViolations).toHaveLength(0);
    });

    it('should handle content without sections gracefully', () => {
      const content = 'This is simple content without any headings or sections.';

      const violations = CrossSectionRepetitionValidator.validate(content);

      // Should not throw and should return empty violations (no sections to compare)
      expect(violations.filter(v => v.rule === 'H9_CROSS_SECTION_REPETITION')).toHaveLength(0);
    });

    it('should handle empty content gracefully', () => {
      const violations = CrossSectionRepetitionValidator.validate('');

      expect(violations).toHaveLength(0);
    });

    it('should be case-insensitive when detecting repetition', () => {
      const content = `
## Section A

Cloud Computing Solutions transform business operations dramatically.

## Section B

Many organizations leverage cloud computing solutions transform their infrastructure.
      `.trim();

      const violations = CrossSectionRepetitionValidator.validate(content);

      const repetitionViolations = violations.filter(v => v.rule === 'H9_CROSS_SECTION_REPETITION');
      expect(repetitionViolations.length).toBeGreaterThan(0);
    });

    it('should provide phrase location in violation details', () => {
      const content = `
## First Part

Artificial intelligence systems process natural language efficiently.

## Second Part

Modern artificial intelligence systems process natural language for various applications.
      `.trim();

      const violations = CrossSectionRepetitionValidator.validate(content);

      const repetitionViolations = violations.filter(v => v.rule === 'H9_CROSS_SECTION_REPETITION');
      expect(repetitionViolations.length).toBeGreaterThan(0);

      // Each violation should include information about which sections contain the phrase
      expect(repetitionViolations[0].suggestion).toMatch(/section|rephrase/i);
    });
  });

  describe('extractSignificantPhrases', () => {
    it('should extract 3-5 word n-grams', () => {
      const phrases = CrossSectionRepetitionValidator.extractSignificantPhrases(
        'The quick brown fox jumps over the lazy dog.'
      );

      // Should extract phrases like "quick brown fox", "brown fox jumps", etc.
      expect(phrases.some(p => p.phrase.includes('brown fox'))).toBe(true);
    });

    it('should filter out phrases that are only stop words', () => {
      const phrases = CrossSectionRepetitionValidator.extractSignificantPhrases(
        'This is a test of the system.'
      );

      // Phrases like "this is a" or "is a test" that are mostly stop words should be filtered
      expect(phrases.every(p =>
        !['this is a', 'is a test', 'of the'].includes(p.phrase.toLowerCase())
      )).toBe(true);
    });
  });
});
