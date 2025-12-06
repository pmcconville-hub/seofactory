import { ModalityValidator } from '../modalityValidator';

describe('ModalityValidator', () => {
  it('should flag uncertain language for facts', () => {
    const content = 'Water might be important for health. It can be essential.';
    const context = { isYMYL: false, section: { heading: 'Water Benefits' } } as any;
    const violations = ModalityValidator.validate(content, context);

    expect(violations.some(v => v.rule === 'MODALITY_UNCERTAINTY')).toBe(true);
  });

  it('should pass definitive statements', () => {
    const content = 'Water is essential for metabolic function. The body requires adequate hydration.';
    const context = { isYMYL: false, section: { heading: 'Water Benefits' } } as any;
    const violations = ModalityValidator.validate(content, context);

    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });

  it('should allow can/may for genuine possibilities', () => {
    const content = 'Excessive water intake can cause hyponatremia.';
    const context = { isYMYL: false, section: { heading: 'Risks' } } as any;
    const violations = ModalityValidator.validate(content, context);

    // Should not flag 'can' in a risks context
    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });
});
