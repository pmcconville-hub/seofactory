import { YMYLValidator } from '../ymylValidator';

describe('YMYLValidator', () => {
  const createYMYLContext = (category: 'HEALTH' | 'FINANCE' | 'LEGAL' | 'SAFETY') => ({
    isYMYL: true,
    ymylCategory: category,
    section: { heading: 'Treatment Options' },
    brief: {},
    businessInfo: {},
  } as any);

  it('should detect YMYL category from content', () => {
    expect(YMYLValidator.detectYMYL('symptoms of diabetes treatment')).toEqual({
      isYMYL: true,
      category: 'HEALTH',
    });

    expect(YMYLValidator.detectYMYL('investment portfolio management')).toEqual({
      isYMYL: true,
      category: 'FINANCE',
    });
  });

  it('should require Safe Answer Protocol for boolean questions', () => {
    const content = 'Aspirin is effective for headaches.';
    const violations = YMYLValidator.validate(content, createYMYLContext('HEALTH'));

    // Should suggest adding condition/exception
    expect(violations.some(v => v.suggestion.includes('condition') || v.suggestion.includes('However'))).toBe(true);
  });

  it('should pass content with proper Safe Answer structure', () => {
    const content = 'Aspirin is effective for mild headaches. However, patients with stomach ulcers should consult a doctor before use.';
    const violations = YMYLValidator.validate(content, createYMYLContext('HEALTH'));

    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });
});
