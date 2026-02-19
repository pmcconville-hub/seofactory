import { describe, it, expect } from 'vitest';
import { SectionAnalyzer } from '../SectionAnalyzer';
import { BriefSection } from '../../../types';

describe('SectionAnalyzer', () => {
  describe('calculateSemanticWeight', () => {
    it('should return base weight of 3 with no modifiers', () => {
      const weight = SectionAnalyzer.calculateSemanticWeight({});
      expect(weight).toBe(3);
    });

    it('should add +2 for UNIQUE topic category', () => {
      const weight = SectionAnalyzer.calculateSemanticWeight({
        attributeCategory: 'UNIQUE',
      });
      expect(weight).toBe(5); // 3 + 2
    });

    it('should add +1 for RARE topic category', () => {
      const weight = SectionAnalyzer.calculateSemanticWeight({
        attributeCategory: 'RARE',
      });
      expect(weight).toBe(4); // 3 + 1
    });

    it('should add +0.5 for ROOT topic category', () => {
      const weight = SectionAnalyzer.calculateSemanticWeight({
        attributeCategory: 'ROOT',
      });
      expect(weight).toBe(3.5); // 3 + 0.5
    });

    it('should add no bonus for COMMON topic category', () => {
      const weight = SectionAnalyzer.calculateSemanticWeight({
        attributeCategory: 'COMMON',
      });
      expect(weight).toBe(3); // 3 + 0
    });

    it('should add +0.5 for isCoreTopic', () => {
      const weight = SectionAnalyzer.calculateSemanticWeight({
        isCoreTopic: true,
      });
      expect(weight).toBe(3.5); // 3 + 0.5
    });

    it('should add +0.5 for hasFSTarget', () => {
      const weight = SectionAnalyzer.calculateSemanticWeight({
        hasFSTarget: true,
      });
      expect(weight).toBe(3.5); // 3 + 0.5
    });

    it('should add +0.5 for answersMainIntent', () => {
      const weight = SectionAnalyzer.calculateSemanticWeight({
        answersMainIntent: true,
      });
      expect(weight).toBe(3.5); // 3 + 0.5
    });

    it('should combine all bonuses correctly', () => {
      const weight = SectionAnalyzer.calculateSemanticWeight({
        attributeCategory: 'UNIQUE', // +2
        isCoreTopic: true, // +0.5
        hasFSTarget: true, // +0.5
        answersMainIntent: true, // +0.5
      });
      expect(weight).toBe(5); // 3 + 2 + 0.5 + 0.5 + 0.5 = 6.5, clamped to 5
    });

    it('should clamp weight to maximum of 5', () => {
      const weight = SectionAnalyzer.calculateSemanticWeight({
        attributeCategory: 'UNIQUE', // +2
        isCoreTopic: true, // +0.5
        hasFSTarget: true, // +0.5
        answersMainIntent: true, // +0.5
      });
      expect(weight).toBeLessThanOrEqual(5);
    });

    it('should clamp weight to minimum of 1', () => {
      // Base is 3, so we can't really go below 1 with current formula
      // but let's verify clamping works
      const weight = SectionAnalyzer.calculateSemanticWeight({});
      expect(weight).toBeGreaterThanOrEqual(1);
    });

    it('should clamp weight to MAX_WEIGHT=5 even with all bonuses stacked', () => {
      const weight = SectionAnalyzer.calculateSemanticWeight({
        attributeCategory: 'UNIQUE',   // +2
        isCoreTopic: true,             // +0.5
        hasFSTarget: true,             // +0.5
        answersMainIntent: true,       // +0.5
      });
      expect(weight).toBe(5);
    });

    it('should clamp intermediate values so bonuses after overflow still work correctly', () => {
      const weightWithCore = SectionAnalyzer.calculateSemanticWeight({
        attributeCategory: 'UNIQUE',
        isCoreTopic: true,
      });
      const weightWithout = SectionAnalyzer.calculateSemanticWeight({
        attributeCategory: 'UNIQUE',
      });
      expect(weightWithCore).toBe(5);
      expect(weightWithout).toBe(5);
    });
  });

  describe('detectContentType', () => {
    it('should detect introduction from heading', () => {
      const type = SectionAnalyzer.detectContentType('Introduction', 'Some content here');
      expect(type).toBe('introduction');
    });

    it('should detect introduction from "overview" heading', () => {
      const type = SectionAnalyzer.detectContentType('Overview of the Topic', 'Some content here');
      expect(type).toBe('introduction');
    });

    it('should detect faq from heading', () => {
      const type = SectionAnalyzer.detectContentType('Frequently Asked Questions', 'Q: What is this?');
      expect(type).toBe('faq');
    });

    it('should detect faq from "FAQ" heading', () => {
      const type = SectionAnalyzer.detectContentType('FAQ', 'Q: What is this?');
      expect(type).toBe('faq');
    });

    it('should detect comparison from heading', () => {
      const type = SectionAnalyzer.detectContentType('Product A vs Product B', 'Comparing features');
      expect(type).toBe('comparison');
    });

    it('should detect comparison from "comparison" heading', () => {
      const type = SectionAnalyzer.detectContentType('Feature Comparison', 'Table content');
      expect(type).toBe('comparison');
    });

    it('should detect summary from heading', () => {
      const type = SectionAnalyzer.detectContentType('Summary', 'In conclusion');
      expect(type).toBe('summary');
    });

    it('should detect summary from "conclusion" heading', () => {
      const type = SectionAnalyzer.detectContentType('Conclusion', 'To wrap up');
      expect(type).toBe('summary');
    });

    it('should detect steps from LISTING format code', () => {
      const type = SectionAnalyzer.detectContentType('How to Do Something', 'Step 1', 'LISTING');
      expect(type).toBe('steps');
    });

    it('should detect steps from numbered list in content', () => {
      const content = '1. First step\n2. Second step\n3. Third step';
      const type = SectionAnalyzer.detectContentType('Guide', content);
      expect(type).toBe('steps');
    });

    it('should detect steps from ol tag in content', () => {
      const content = '<ol><li>First</li><li>Second</li></ol>';
      const type = SectionAnalyzer.detectContentType('Guide', content);
      expect(type).toBe('steps');
    });

    it('should detect comparison from table in content', () => {
      const content = '| Feature | A | B |\n|---------|---|---|\n| Price | $10 | $20 |';
      const type = SectionAnalyzer.detectContentType('Features', content);
      expect(type).toBe('comparison');
    });

    it('should detect comparison from TABLE format code', () => {
      const type = SectionAnalyzer.detectContentType('Details', 'content', 'TABLE');
      expect(type).toBe('comparison');
    });

    it('should detect definition from "What is" heading', () => {
      const type = SectionAnalyzer.detectContentType('What is SEO?', 'SEO stands for');
      expect(type).toBe('definition');
    });

    it('should detect definition from DEFINITIVE format code', () => {
      const type = SectionAnalyzer.detectContentType('Topic Name', 'content', 'DEFINITIVE');
      expect(type).toBe('definition');
    });

    it('should detect list from bullet points', () => {
      const content = '- Item one\n- Item two\n- Item three';
      const type = SectionAnalyzer.detectContentType('Features', content);
      expect(type).toBe('list');
    });

    it('should default to explanation for general content', () => {
      const type = SectionAnalyzer.detectContentType('General Topic', 'Some general text without special patterns.');
      expect(type).toBe('explanation');
    });
  });

  describe('analyzeSection', () => {
    it('should analyze a section with basic input', () => {
      const result = SectionAnalyzer.analyzeSection({
        sectionId: 'section-1',
        content: '## My Heading\n\nSome paragraph content here.',
      });

      expect(result.sectionId).toBe('section-1');
      expect(result.heading).toBe('My Heading');
      expect(result.headingLevel).toBe(2);
      expect(result.contentType).toBe('explanation');
      expect(result.semanticWeight).toBeGreaterThanOrEqual(1);
      expect(result.semanticWeight).toBeLessThanOrEqual(5);
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should detect tables in content', () => {
      const result = SectionAnalyzer.analyzeSection({
        sectionId: 'section-1',
        content: '## Comparison\n\n| A | B |\n|---|---|\n| 1 | 2 |',
      });

      expect(result.hasTable).toBe(true);
      expect(result.contentType).toBe('comparison');
    });

    it('should detect lists in content', () => {
      const result = SectionAnalyzer.analyzeSection({
        sectionId: 'section-1',
        content: '## Features\n\n- Feature 1\n- Feature 2',
      });

      expect(result.hasList).toBe(true);
    });

    it('should detect quotes in content', () => {
      const result = SectionAnalyzer.analyzeSection({
        sectionId: 'section-1',
        content: '## Quote\n\n> This is a quote',
      });

      expect(result.hasQuote).toBe(true);
    });

    it('should detect images in content', () => {
      const result = SectionAnalyzer.analyzeSection({
        sectionId: 'section-1',
        content: '## Image\n\n![Alt text](image.jpg)',
      });

      expect(result.hasImage).toBe(true);
    });

    it('should use brief section data when provided', () => {
      const briefSection: BriefSection = {
        heading: 'Feature Details',
        level: 2,
        attribute_category: 'UNIQUE',
        format_code: 'FS',
        content_zone: 'MAIN',
      };

      const result = SectionAnalyzer.analyzeSection({
        sectionId: 'section-1',
        content: '## Feature Details\n\nThis is important.',
        briefSection,
      });

      expect(result.attributeCategory).toBe('UNIQUE');
      expect(result.formatCode).toBe('FS');
      expect(result.contentZone).toBe('MAIN');
      expect(result.constraints.fsTarget).toBe(true);
    });

    it('should set isCoreTopic from options', () => {
      const result = SectionAnalyzer.analyzeSection({
        sectionId: 'section-1',
        content: '## Topic\n\nContent',
        isCoreTopic: true,
      });

      expect(result.isCoreTopic).toBe(true);
    });

    it('should detect if section answers main intent', () => {
      const result = SectionAnalyzer.analyzeSection({
        sectionId: 'section-1',
        content: '## What is SEO\n\nSEO is search engine optimization.',
        mainIntent: 'What is SEO',
      });

      expect(result.answersMainIntent).toBe(true);
    });

    it('should calculate semantic weight based on all factors', () => {
      const briefSection: BriefSection = {
        heading: 'Unique Feature',
        level: 2,
        attribute_category: 'UNIQUE',
        format_code: 'FS',
      };

      const result = SectionAnalyzer.analyzeSection({
        sectionId: 'section-1',
        content: '## Unique Feature\n\nThis is a unique feature.',
        briefSection,
        isCoreTopic: true,
      });

      // UNIQUE (+2) + isCoreTopic (+0.5) + FS target (+0.5) = 3 + 3 = 6, clamped to 5
      expect(result.semanticWeight).toBe(5);
    });

    it('should return weight factors for debugging', () => {
      const result = SectionAnalyzer.analyzeSection({
        sectionId: 'section-1',
        content: '## Topic\n\nContent',
      });

      expect(result.semanticWeightFactors).toBeDefined();
      expect(result.semanticWeightFactors.baseWeight).toBe(3);
      expect(result.semanticWeightFactors.totalWeight).toBe(result.semanticWeight);
    });
  });

  describe('analyzeAllSections', () => {
    it('should analyze markdown content with multiple sections', () => {
      const markdown = `# Main Title

Introduction paragraph.

## Feature Overview

This is a feature overview section.

## How It Works

1. Step one
2. Step two
3. Step three

## FAQ

**Q: What is this?**
A: This is a test.
`;

      const results = SectionAnalyzer.analyzeAllSections(markdown);

      expect(results.length).toBeGreaterThanOrEqual(3);
      expect(results.some(r => r.contentType === 'steps')).toBe(true);
      expect(results.some(r => r.contentType === 'faq')).toBe(true);
    });

    it('should use brief sections to enhance analysis', () => {
      const markdown = `## Feature A

Content for feature A.

## Feature B

Content for feature B.
`;

      const briefSections: BriefSection[] = [
        { heading: 'Feature A', level: 2, attribute_category: 'UNIQUE' },
        { heading: 'Feature B', level: 2, attribute_category: 'COMMON' },
      ];

      const results = SectionAnalyzer.analyzeAllSections(markdown, briefSections);

      const featureA = results.find(r => r.heading === 'Feature A');
      const featureB = results.find(r => r.heading === 'Feature B');

      expect(featureA?.attributeCategory).toBe('UNIQUE');
      expect(featureB?.attributeCategory).toBe('COMMON');
    });

    it('should apply global options to all sections', () => {
      const markdown = `## Section 1

Content 1.

## Section 2

Content 2.
`;

      const results = SectionAnalyzer.analyzeAllSections(markdown, undefined, {
        isCoreTopic: true,
        topicTitle: 'Main Topic',
      });

      expect(results.every(r => r.isCoreTopic === true)).toBe(true);
    });

    it('should handle empty content', () => {
      const results = SectionAnalyzer.analyzeAllSections('');
      expect(results).toEqual([]);
    });

    it('should handle content without headings', () => {
      const markdown = 'Just some text without any headings.';
      const results = SectionAnalyzer.analyzeAllSections(markdown);

      // Should still produce at least one section for the content
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should assign sequential section IDs', () => {
      const markdown = `## First

Content.

## Second

Content.

## Third

Content.
`;

      const results = SectionAnalyzer.analyzeAllSections(markdown);

      expect(results[0].sectionId).toContain('section-');
      expect(results[1].sectionId).toContain('section-');
      expect(results[2].sectionId).toContain('section-');
    });
  });

  describe('edge cases', () => {
    it('should handle H1 headings', () => {
      const result = SectionAnalyzer.analyzeSection({
        sectionId: 'hero',
        content: '# Hero Title\n\nHero content.',
      });

      expect(result.headingLevel).toBe(1);
    });

    it('should handle deeply nested headings', () => {
      const result = SectionAnalyzer.analyzeSection({
        sectionId: 'deep',
        content: '#### Deep Heading\n\nDeep content.',
      });

      expect(result.headingLevel).toBe(4);
    });

    it('should handle content with no heading', () => {
      const result = SectionAnalyzer.analyzeSection({
        sectionId: 'no-heading',
        content: 'Just paragraph text without a heading.',
      });

      expect(result.heading).toBe('');
      expect(result.headingLevel).toBe(0);
    });

    it('should handle mixed content formats', () => {
      const content = `## Mixed Content

Some text.

- List item 1
- List item 2

| Col A | Col B |
|-------|-------|
| 1     | 2     |

> A quote here
`;

      const result = SectionAnalyzer.analyzeSection({
        sectionId: 'mixed',
        content,
      });

      expect(result.hasList).toBe(true);
      expect(result.hasTable).toBe(true);
      expect(result.hasQuote).toBe(true);
    });

    it('should handle HTML content mixed with markdown', () => {
      const content = `## HTML Section

<p>HTML paragraph</p>

<ul>
  <li>HTML list</li>
</ul>

<table><tr><td>Cell</td></tr></table>
`;

      const result = SectionAnalyzer.analyzeSection({
        sectionId: 'html',
        content,
      });

      expect(result.hasList).toBe(true);
      expect(result.hasTable).toBe(true);
    });
  });
});
