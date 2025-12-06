import { ProhibitedLanguageValidator } from '../prohibitedLanguage';

describe('ProhibitedLanguageValidator', () => {
  it('should detect stop words', () => {
    const content = 'The product is basically very good and also reliable.';
    const violations = ProhibitedLanguageValidator.validate(content);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some(v => v.text.includes('basically'))).toBe(true);
    expect(violations.some(v => v.text.includes('very'))).toBe(true);
    expect(violations.some(v => v.text.includes('also'))).toBe(true);
  });

  it('should detect opinionated language', () => {
    const content = 'I think this is a beautiful solution. Unfortunately, it has issues.';
    const violations = ProhibitedLanguageValidator.validate(content);

    expect(violations.some(v => v.rule === 'OPINIONS')).toBe(true);
  });

  it('should detect analogies', () => {
    const content = 'The CPU is like a brain that processes information.';
    const violations = ProhibitedLanguageValidator.validate(content);

    expect(violations.some(v => v.rule === 'ANALOGIES')).toBe(true);
  });

  it('should detect fluff openers', () => {
    const content = 'In this article, we will explore the benefits of exercise.';
    const violations = ProhibitedLanguageValidator.validate(content);

    expect(violations.some(v => v.rule === 'FLUFF_OPENERS')).toBe(true);
  });

  it('should pass clean content', () => {
    const content = 'German Shepherds require 60-90 minutes of daily exercise. The breed maintains muscle mass through regular activity.';
    const violations = ProhibitedLanguageValidator.validate(content);

    // Should have no error-level violations
    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });
});
