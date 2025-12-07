import { StructureValidator } from '../structureValidator';

describe('StructureValidator', () => {
  const createContext = (seedKeyword: string) => ({
    businessInfo: { seedKeyword },
    section: { heading: 'Test' },
  } as any);

  it('should pass when entity is frequently the subject', () => {
    const content = 'German Shepherds require daily exercise. German Shepherds are loyal dogs. The breed needs proper training.';
    const violations = StructureValidator.validate(content, createContext('German Shepherd'));

    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });

  it('should warn when entity rarely appears as subject', () => {
    const content = 'Exercise is important. Training helps. Food should be nutritious. Walking is beneficial.';
    const violations = StructureValidator.validate(content, createContext('German Shepherd'));

    expect(violations.some(v => v.rule === 'ENTITY_AS_SUBJECT')).toBe(true);
  });
});
