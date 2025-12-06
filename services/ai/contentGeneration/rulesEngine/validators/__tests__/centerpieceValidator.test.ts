import { CenterpieceValidator } from '../centerpieceValidator';

describe('CenterpieceValidator', () => {
  const createContext = (seedKeyword: string) => ({
    businessInfo: { seedKeyword },
    section: { heading: 'Introduction', level: 1 },
    brief: { title: `What is ${seedKeyword}` },
  } as any);

  it('should pass when definition appears in first 400 chars', () => {
    const content = 'German Shepherd is a medium-to-large working dog breed that originated in Germany. The breed is known for its intelligence and loyalty.';
    const violations = CenterpieceValidator.validate(content, createContext('German Shepherd'));

    expect(violations.filter(v => v.severity === 'error').length).toBe(0);
  });

  it('should flag when definition is delayed', () => {
    const content = 'Dogs have been companions to humans for thousands of years. There are many breeds to choose from. Each breed has unique characteristics. '.repeat(10) + 'German Shepherd is a working dog breed.';
    const violations = CenterpieceValidator.validate(content, createContext('German Shepherd'));

    expect(violations.some(v => v.rule === 'CENTERPIECE_DELAYED')).toBe(true);
  });

  it('should flag fluff before definition', () => {
    const content = 'Have you ever wondered about dogs? In this article, we explore German Shepherds.';
    const violations = CenterpieceValidator.validate(content, createContext('German Shepherd'));

    expect(violations.length).toBeGreaterThan(0);
  });
});
