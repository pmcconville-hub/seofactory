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

  describe('non-intro sections', () => {
    const createBodyContext = (heading: string, seedKeyword: string) => ({
      businessInfo: { seedKeyword },
      section: { heading, level: 2, content_zone: 'MAIN' },
      brief: { title: `All About ${seedKeyword}` },
    } as any);

    it('should validate first sentence answers heading for body sections', () => {
      const content = 'The weight of a German Shepherd typically ranges from 50 to 90 pounds.';
      const violations = CenterpieceValidator.validate(content, createBodyContext('How Much Does a German Shepherd Weigh?', 'German Shepherd'));
      // Should pass - first sentence answers the heading question
      expect(violations.filter(v => v.rule === 'HEADING_ANSWER_MISSING').length).toBe(0);
    });

    it('should flag when first sentence does not answer heading', () => {
      const content = 'Many people wonder about this topic. It is a common question.';
      const violations = CenterpieceValidator.validate(content, createBodyContext('How Much Does a German Shepherd Weigh?', 'German Shepherd'));
      // Should flag - first sentence is fluff, doesn't answer the question
      expect(violations.some(v => v.rule === 'HEADING_ANSWER_MISSING' || v.rule === 'FIRST_SENTENCE_NO_DEFINITIVE_VERB')).toBe(true);
    });

    it('should extract question keywords from heading', () => {
      const content = 'German Shepherds need approximately 2-3 cups of food daily.';
      const violations = CenterpieceValidator.validate(content, createBodyContext('How Much Should You Feed a German Shepherd?', 'German Shepherd'));
      // Should pass - answers the "how much" + "feed" question
      expect(violations.filter(v => v.rule === 'HEADING_ANSWER_MISSING').length).toBe(0);
    });
  });
});
