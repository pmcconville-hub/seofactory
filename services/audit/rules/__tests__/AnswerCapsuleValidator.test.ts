import { describe, it, expect } from 'vitest';
import { AnswerCapsuleValidator } from '../AnswerCapsuleValidator';

describe('AnswerCapsuleValidator', () => {
  const validator = new AnswerCapsuleValidator();

  it('passes when first paragraph after H2 is 40-70 words with entity name', () => {
    const html = `
      <h2>What is Solar Energy?</h2>
      <p>Solar energy is the radiant light and heat from the Sun that humans harness using photovoltaic cells, solar thermal collectors, and concentrated solar power systems. Solar panels convert sunlight directly into electricity through the photovoltaic effect, providing clean renewable power for residential and commercial applications.</p>
    `;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues.filter(i => i.ruleId === 'rule-capsule-length')).toHaveLength(0);
    expect(issues.filter(i => i.ruleId === 'rule-capsule-entity')).toHaveLength(0);
  });

  it('flags when first paragraph after H2 exceeds 70 words', () => {
    const longParagraph = 'Solar energy ' + Array(80).fill('word').join(' ') + '.';
    const html = `<h2>What is Solar Energy?</h2><p>${longParagraph}</p>`;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-capsule-length' }));
  });

  it('flags when first paragraph is under 40 words', () => {
    const html = `<h2>What is Solar?</h2><p>Solar energy is power from the sun.</p>`;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-capsule-length' }));
  });

  it('flags when entity name is missing from first paragraph', () => {
    const html = `<h2>What is this technology?</h2><p>This renewable technology converts sunlight into electricity through photovoltaic cells and thermal collectors providing clean power for homes and businesses across the globe efficiently and affordably for many years to come.</p>`;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-capsule-entity' }));
  });

  it('flags preamble patterns in first paragraph', () => {
    const html = `<h2>Benefits of Solar</h2><p>In this section we will explore the many benefits of solar energy and why it matters for homeowners looking to reduce costs and environmental impact in their daily lives and for future generations.</p>`;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-capsule-preamble' }));
  });

  it('flags repetitive capsule openings (3+ identical patterns)', () => {
    const html = `
      <h2>What is A?</h2><p>Solar energy is the process of converting sunlight into electricity using photovoltaic panels and thermal systems for residential and commercial power generation needs worldwide.</p>
      <h2>What is B?</h2><p>Solar energy is the method of harnessing renewable light from the sun through various technologies including panels and mirrors for sustainable energy production globally.</p>
      <h2>What is C?</h2><p>Solar energy is the practice of using sunlight as a primary source of electrical power through modern photovoltaic technology and concentrated solar thermal systems everywhere.</p>
    `;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-capsule-variety' }));
  });
});
