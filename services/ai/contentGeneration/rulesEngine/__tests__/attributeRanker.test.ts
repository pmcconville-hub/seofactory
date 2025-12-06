import { AttributeRanker } from '../attributeRanker';
import { BriefSection } from '../../../../../types';

describe('AttributeRanker', () => {
  it('should order sections by attribute category: ROOT > UNIQUE > RARE > COMMON', () => {
    const sections: BriefSection[] = [
      { heading: 'Common Info', level: 2, attribute_category: 'COMMON' },
      { heading: 'Unique Feature', level: 2, attribute_category: 'UNIQUE' },
      { heading: 'Definition', level: 2, attribute_category: 'ROOT' },
      { heading: 'Rare Detail', level: 2, attribute_category: 'RARE' },
    ];

    const ordered = AttributeRanker.orderSections(sections);

    expect(ordered[0].attribute_category).toBe('ROOT');
    expect(ordered[1].attribute_category).toBe('UNIQUE');
    expect(ordered[2].attribute_category).toBe('RARE');
    expect(ordered[3].attribute_category).toBe('COMMON');
  });

  it('should order by query_priority within same category', () => {
    const sections: BriefSection[] = [
      { heading: 'Low Priority', level: 2, attribute_category: 'ROOT', query_priority: 10 },
      { heading: 'High Priority', level: 2, attribute_category: 'ROOT', query_priority: 100 },
    ];

    const ordered = AttributeRanker.orderSections(sections);

    expect(ordered[0].heading).toBe('High Priority');
    expect(ordered[1].heading).toBe('Low Priority');
  });

  it('should preserve subsection order within parent', () => {
    const sections: BriefSection[] = [
      {
        heading: 'Parent',
        level: 2,
        attribute_category: 'ROOT',
        subsections: [
          { heading: 'Sub A', level: 3 },
          { heading: 'Sub B', level: 3 },
        ]
      },
    ];

    const ordered = AttributeRanker.orderSections(sections);

    expect(ordered[0].subsections?.[0].heading).toBe('Sub A');
    expect(ordered[0].subsections?.[1].heading).toBe('Sub B');
  });

  it('should handle sections without attribute_category', () => {
    const sections: BriefSection[] = [
      { heading: 'No Category', level: 2 },
      { heading: 'Has Category', level: 2, attribute_category: 'ROOT' },
    ];

    const ordered = AttributeRanker.orderSections(sections);

    // Sections with categories should come first
    expect(ordered[0].attribute_category).toBe('ROOT');
    expect(ordered[1].attribute_category).toBeUndefined();
  });

  describe('inferCategory', () => {
    it('should infer ROOT for definition headings', () => {
      expect(AttributeRanker.inferCategory('What is German Shepherd', 'German Shepherd')).toBe('ROOT');
      expect(AttributeRanker.inferCategory('Definition', 'Product')).toBe('ROOT');
      expect(AttributeRanker.inferCategory('Overview', 'Service')).toBe('ROOT');
    });

    it('should infer UNIQUE for feature headings', () => {
      expect(AttributeRanker.inferCategory('Unique Features', 'Product')).toBe('UNIQUE');
      expect(AttributeRanker.inferCategory('Product vs Competitors', 'Product')).toBe('UNIQUE');
    });

    it('should infer RARE for technical headings', () => {
      expect(AttributeRanker.inferCategory('Technical Specifications', 'Engine')).toBe('RARE');
      expect(AttributeRanker.inferCategory('Advanced Usage', 'Tool')).toBe('RARE');
    });

    it('should default to COMMON for general headings', () => {
      expect(AttributeRanker.inferCategory('General Information', 'Product')).toBe('COMMON');
      expect(AttributeRanker.inferCategory('Background', 'Topic')).toBe('COMMON');
    });
  });
});
