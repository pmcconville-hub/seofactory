import { FormatCodeValidator } from '../formatCodeValidator';

describe('FormatCodeValidator', () => {
  it('should validate [FS] word count (40-50 words)', () => {
    const shortContent = 'This is too short.';
    const violations = FormatCodeValidator.validate(shortContent, 'FS');

    expect(violations.some(v => v.rule === 'FS_WORD_COUNT')).toBe(true);
  });

  it('should pass [FS] with correct word count', () => {
    // Exactly 45 words
    const content = 'German Shepherds are medium to large sized working dogs that originated in Germany in the late nineteenth century. The breed is known for its intelligence loyalty and versatility making it popular for police work search and rescue and as family companions.';
    const violations = FormatCodeValidator.validate(content, 'FS');

    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });

  it('should validate [LISTING] has preamble', () => {
    const contentWithoutPreamble = '- Item one\n- Item two\n- Item three';
    const violations = FormatCodeValidator.validate(contentWithoutPreamble, 'LISTING');

    expect(violations.some(v => v.rule === 'LISTING_NO_PREAMBLE')).toBe(true);
  });

  it('should pass [LISTING] with proper preamble', () => {
    const content = 'The five main benefits of exercise include:\n- Improved cardiovascular health\n- Weight management\n- Better mood';
    const violations = FormatCodeValidator.validate(content, 'LISTING');

    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });
});
