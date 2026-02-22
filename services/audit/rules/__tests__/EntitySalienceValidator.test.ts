import { describe, it, expect } from 'vitest';
import { EntitySalienceValidator } from '../EntitySalienceValidator';

describe('EntitySalienceValidator', () => {
  const validator = new EntitySalienceValidator();

  it('returns no issues when CE is top entity with high salience', () => {
    const issues = validator.validate({
      centralEntity: 'React',
      entities: [
        { name: 'React', type: 'OTHER', salience: 0.45 },
        { name: 'JavaScript', type: 'OTHER', salience: 0.25 },
        { name: 'Facebook', type: 'ORGANIZATION', salience: 0.1 },
      ],
    });
    expect(issues).toHaveLength(0);
  });

  it('returns no issues when CE is in top 3 with sufficient salience', () => {
    const issues = validator.validate({
      centralEntity: 'TypeScript',
      entities: [
        { name: 'JavaScript', type: 'OTHER', salience: 0.35 },
        { name: 'TypeScript', type: 'OTHER', salience: 0.25 },
        { name: 'Node.js', type: 'OTHER', salience: 0.15 },
      ],
    });
    expect(issues).toHaveLength(0);
  });

  it('flags rule-371 when CE is ranked below top 3', () => {
    const issues = validator.validate({
      centralEntity: 'Svelte',
      entities: [
        { name: 'React', type: 'OTHER', salience: 0.3 },
        { name: 'Vue', type: 'OTHER', salience: 0.25 },
        { name: 'Angular', type: 'OTHER', salience: 0.2 },
        { name: 'Svelte', type: 'OTHER', salience: 0.15 },
      ],
    });
    expect(issues.some(i => i.ruleId === 'rule-371')).toBe(true);
    expect(issues.find(i => i.ruleId === 'rule-371')?.severity).toBe('high');
  });

  it('flags rule-371 as critical when CE is not detected at all', () => {
    const issues = validator.validate({
      centralEntity: 'Rust',
      entities: [
        { name: 'JavaScript', type: 'OTHER', salience: 0.4 },
        { name: 'Python', type: 'OTHER', salience: 0.3 },
      ],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('rule-371');
    expect(issues[0].severity).toBe('critical');
  });

  it('flags rule-372 when CE salience is below threshold', () => {
    const issues = validator.validate({
      centralEntity: 'Deno',
      entities: [
        { name: 'Deno', type: 'OTHER', salience: 0.1 },
        { name: 'Node.js', type: 'OTHER', salience: 0.05 },
      ],
    });
    expect(issues.some(i => i.ruleId === 'rule-372')).toBe(true);
  });

  it('returns no issues for empty entities array', () => {
    const issues = validator.validate({
      centralEntity: 'Test',
      entities: [],
    });
    expect(issues).toHaveLength(0);
  });

  it('returns no issues when centralEntity is empty', () => {
    const issues = validator.validate({
      centralEntity: '',
      entities: [{ name: 'Test', type: 'OTHER', salience: 0.5 }],
    });
    expect(issues).toHaveLength(0);
  });

  it('matches CE case-insensitively', () => {
    const issues = validator.validate({
      centralEntity: 'react',
      entities: [
        { name: 'React', type: 'OTHER', salience: 0.45 },
        { name: 'JavaScript', type: 'OTHER', salience: 0.25 },
      ],
    });
    expect(issues).toHaveLength(0);
  });

  it('matches CE as substring (partial match)', () => {
    const issues = validator.validate({
      centralEntity: 'React Framework',
      entities: [
        { name: 'React', type: 'OTHER', salience: 0.45 },
        { name: 'JavaScript', type: 'OTHER', salience: 0.25 },
      ],
    });
    expect(issues).toHaveLength(0);
  });
});
