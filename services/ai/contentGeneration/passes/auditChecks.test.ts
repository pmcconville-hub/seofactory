// services/ai/contentGeneration/passes/auditChecks.test.ts
import { describe, it, expect } from 'vitest';
import { runAlgorithmicAudit } from './auditChecks';
import { ContentBrief, BusinessInfo, SemanticTriple } from '../../../../types';

// Helper to create minimal test fixtures
const createMockBrief = (overrides: Partial<ContentBrief> = {}): ContentBrief => ({
  title: 'Test Article Title',
  metaDescription: 'Test meta description',
  outline: '## Introduction\n## Section 1',
  keyTakeaways: ['Takeaway 1'],
  targetWordCount: 1500,
  ...overrides
} as ContentBrief);

const createMockBusinessInfo = (overrides: Partial<BusinessInfo> = {}): BusinessInfo => ({
  seedKeyword: 'test keyword',
  domain: 'example.com',
  projectName: 'Test Project',
  industry: 'Technology',
  model: 'B2B',
  valueProp: 'Test value',
  audience: 'Test audience',
  expertise: 'Expert',
  language: 'en',
  targetMarket: 'US',
  aiProvider: 'anthropic',
  aiModel: 'claude-3-sonnet',
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'test-key',
  ...overrides
} as BusinessInfo);

describe('runAlgorithmicAudit', () => {
  it('returns array of audit results', async () => {
    const draft = '## Introduction\n\nTest keyword is a concept that means something specific.';
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    results.forEach(r => {
      expect(r).toHaveProperty('ruleName');
      expect(r).toHaveProperty('isPassing');
      expect(r).toHaveProperty('details');
    });
  });
});

describe('checkLLMSignaturePhrases', () => {
  it('fails when draft contains LLM signature phrases', async () => {
    const draft = `## Introduction

Overall, test keyword is important. It's important to note that this concept delves into many areas.
In conclusion, we have explored the world of test keywords.`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const llmCheck = results.find(r => r.ruleName === 'LLM Phrase Detection');

    expect(llmCheck).toBeDefined();
    expect(llmCheck?.isPassing).toBe(false);
    expect(llmCheck?.details).toContain('overall');
  });

  it('passes when draft has no LLM signature phrases', async () => {
    const draft = `## Introduction

Test keyword represents a specific methodology. This approach provides measurable benefits.
The framework enables efficient implementation.`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const llmCheck = results.find(r => r.ruleName === 'LLM Phrase Detection');

    expect(llmCheck).toBeDefined();
    expect(llmCheck?.isPassing).toBe(true);
  });
});

describe('checkPredicateConsistency', () => {
  it('fails when H1 uses negative predicates but H2s use positive', async () => {
    const draft = `## Risks of Test Keyword

Test keyword has some concerns.

## Benefits of Test Keyword

Here are the advantages.

## Advantages of Test Keyword

More positive aspects.`;
    const brief = createMockBrief({ title: 'Risks of Test Keyword' });
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const predicateCheck = results.find(r => r.ruleName === 'Predicate Consistency');

    expect(predicateCheck).toBeDefined();
    expect(predicateCheck?.isPassing).toBe(false);
  });

  it('passes when heading predicates are consistent', async () => {
    const draft = `## Benefits of Test Keyword

Test keyword provides many advantages.

## Advantages of Test Keyword

Additional positive aspects.

## Improvements from Test Keyword

Enhanced outcomes.`;
    const brief = createMockBrief({ title: 'Benefits of Test Keyword' });
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const predicateCheck = results.find(r => r.ruleName === 'Predicate Consistency');

    expect(predicateCheck).toBeDefined();
    expect(predicateCheck?.isPassing).toBe(true);
  });

  it('passes for instructional content with how-to headings', async () => {
    const draft = `## How to Use Test Keyword

Follow these steps.

## Steps for Test Keyword

The process involves.

## Guide to Test Keyword Implementation

Implementation details.`;
    const brief = createMockBrief({ title: 'How to Use Test Keyword' });
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const predicateCheck = results.find(r => r.ruleName === 'Predicate Consistency');

    expect(predicateCheck).toBeDefined();
    expect(predicateCheck?.isPassing).toBe(true);
  });
});

describe('checkCoverageWeight', () => {
  it('fails when minor section exceeds 50% of content', async () => {
    const draft = `## Introduction

Short intro about test keyword.

## Main Topic

Brief main content.

## Appendix Notes

${'This is appendix content that goes on and on. '.repeat(50)}
More appendix details that dominate the article.
${'Additional appendix text filling up space. '.repeat(30)}`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const coverageCheck = results.find(r => r.ruleName === 'Content Coverage Weight');

    expect(coverageCheck).toBeDefined();
    expect(coverageCheck?.isPassing).toBe(false);
  });

  it('passes when content is well-balanced', async () => {
    const draft = `## Introduction

${'Introduction content with good detail about test keyword. '.repeat(10)}

## Main Topic

${'Main content providing substantial value about the topic. '.repeat(15)}

## Secondary Topic

${'Secondary content with reasonable detail. '.repeat(12)}

## Conclusion

${'Conclusion wrapping up the main points effectively. '.repeat(8)}`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const coverageCheck = results.find(r => r.ruleName === 'Content Coverage Weight');

    expect(coverageCheck).toBeDefined();
    expect(coverageCheck?.isPassing).toBe(true);
  });
});

describe('checkVocabularyRichness', () => {
  it('fails when vocabulary diversity is too low', async () => {
    // Highly repetitive text with same words (many repetitions of "thing")
    const draft = `## Introduction

The thing is important thing. The thing is good thing. The thing is useful thing.
The thing helps thing. The thing makes thing better thing.
The thing is the best thing for doing thing with thing.
The thing thing thing thing thing thing thing thing thing thing thing thing.
The thing thing thing thing thing thing thing thing thing.
The thing is the thing. The thing with thing for thing.
The thing about thing means thing. The thing and thing with thing.
The thing uses thing to make thing. The thing helps thing become thing.
The thing provides thing through thing. The thing enables thing via thing.
The thing supports thing using thing. The thing creates thing from thing.`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const vocabCheck = results.find(r => r.ruleName === 'Vocabulary Richness');

    expect(vocabCheck).toBeDefined();
    expect(vocabCheck?.isPassing).toBe(false);
    expect(vocabCheck?.details).toContain('TTR');
  });

  it('passes when vocabulary is diverse', async () => {
    const draft = `## Introduction

Test keyword represents a sophisticated methodology for achieving optimal results.
This approach combines multiple strategies, techniques, and frameworks.
Implementation requires careful planning, execution, and monitoring.
The benefits include improved efficiency, reduced costs, and enhanced quality.
Organizations leverage these principles to transform their operations.
Success depends on commitment, resources, and continuous improvement.`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const vocabCheck = results.find(r => r.ruleName === 'Vocabulary Richness');

    expect(vocabCheck).toBeDefined();
    expect(vocabCheck?.isPassing).toBe(true);
  });
});

// =====================================================
// Phase B: Structural Enhancements (Checks 15-17)
// =====================================================

describe('checkMacroMicroBorder', () => {
  it('should pass when content has supplementary section for related links', async () => {
    const draft = `## Introduction

Water is essential for life. This article covers hydration benefits.

## Main Benefits

Hydration improves health and cognitive function significantly.

## Related Topics

For more on dehydration, see [Dehydration Guide](/dehydration).
Also check out [Water Quality](/water-quality) for more information.`;

    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const borderCheck = results.find(r => r.ruleName === 'Macro/Micro Border');

    expect(borderCheck).toBeDefined();
    expect(borderCheck?.isPassing).toBe(true);
  });

  it('should fail when many links appear in main content without supplementary section', async () => {
    const draft = `## Introduction

Water is essential. Learn about [Dehydration](/dehydration) and [Hydration Tips](/tips).
Also see [Water Filters](/filters) and [Water Quality](/quality) for context.

## Main Benefits

Check out [More Resources](/more) and [External Guide](/guide) here.
Hydration improves health significantly.`;

    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const borderCheck = results.find(r => r.ruleName === 'Macro/Micro Border');

    expect(borderCheck).toBeDefined();
    expect(borderCheck?.isPassing).toBe(false);
    expect(borderCheck?.details).toContain('link');
  });
});

describe('checkExtractiveSummaryAlignment', () => {
  it('should pass when intro mentions all H2 topics', async () => {
    const draft = `## Introduction

This article covers hydration benefits, dehydration risks, and daily intake guidelines for optimal health.

## Hydration Benefits

Proper hydration improves cognitive function and physical performance.

## Dehydration Risks

Dehydration causes fatigue, headaches, and reduced concentration.

## Daily Intake Guidelines

Adults need 2-3 liters of water daily for optimal function.`;

    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const summaryCheck = results.find(r => r.ruleName === 'Extractive Summary Alignment');

    expect(summaryCheck).toBeDefined();
    expect(summaryCheck?.isPassing).toBe(true);
  });

  it('should fail when intro does not preview H2 topics', async () => {
    const draft = `## Introduction

Water is important for health. Everyone should drink water.

## Hydration Benefits

Proper hydration improves function significantly.

## Chemical Composition

H2O contains hydrogen and oxygen atoms.

## Manufacturing Process

Water treatment involves multiple filtration steps.`;

    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const summaryCheck = results.find(r => r.ruleName === 'Extractive Summary Alignment');

    expect(summaryCheck).toBeDefined();
    expect(summaryCheck?.isPassing).toBe(false);
    expect(summaryCheck?.details).toContain('does not preview');
  });
});

describe('checkQueryFormatAlignment', () => {
  it('should pass when "types of" query has list format', async () => {
    const draft = `## Types of Water Filters

There are 5 main types of water filters available:

- Activated Carbon filters
- Reverse Osmosis systems
- UV Filters for sterilization
- Ceramic filters
- Ion Exchange filters`;

    const brief = createMockBrief({ title: 'Types of Water Filters' });
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const formatCheck = results.find(r => r.ruleName === 'Query-Format Alignment');

    expect(formatCheck).toBeDefined();
    expect(formatCheck?.isPassing).toBe(true);
  });

  it('should fail when "how to" query lacks ordered list', async () => {
    const draft = `## How to Install a Water Filter

Installing a water filter requires careful preparation. First, you need tools.
Then you should read the manual. After that, follow instructions.
The process takes about an hour to complete properly.`;

    const brief = createMockBrief({ title: 'How to Install a Water Filter' });
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const formatCheck = results.find(r => r.ruleName === 'Query-Format Alignment');

    expect(formatCheck).toBeDefined();
    expect(formatCheck?.isPassing).toBe(false);
    expect(formatCheck?.details).toContain('numbered');
  });

  it('should pass when "how to" query has numbered steps', async () => {
    const draft = `## How to Install a Water Filter

Installing a water filter is straightforward:

1. Turn off the water supply
2. Remove the old filter if present
3. Install the new filter housing
4. Connect the water lines
5. Turn on the water and check for leaks`;

    const brief = createMockBrief({ title: 'How to Install a Water Filter' });
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const formatCheck = results.find(r => r.ruleName === 'Query-Format Alignment');

    expect(formatCheck).toBeDefined();
    expect(formatCheck?.isPassing).toBe(true);
  });
});

// =====================================================
// Phase C: Link Optimization (Checks 18-20)
// =====================================================

describe('checkAnchorTextVariety', () => {
  it('should pass when anchor text is used 3 times or less', async () => {
    const draft = `
See [water filters](/filters) for options.
Learn about [water filters](/filters) here.
More on [water filters](/filters) in this guide.
`;

    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const anchorCheck = results.find(r => r.ruleName === 'Anchor Text Variety');

    expect(anchorCheck).toBeDefined();
    expect(anchorCheck?.isPassing).toBe(true);
  });

  it('should fail when same anchor text used more than 3 times', async () => {
    const draft = `
See [water filters](/filters) for options.
Learn about [water filters](/filters) here.
More on [water filters](/filters) in this guide.
Check [water filters](/filters) again for details.
Also see [water filters](/filters) for reference.
`;

    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const anchorCheck = results.find(r => r.ruleName === 'Anchor Text Variety');

    expect(anchorCheck).toBeDefined();
    expect(anchorCheck?.isPassing).toBe(false);
    expect(anchorCheck?.details).toContain('5');
  });
});

describe('checkAnnotationTextQuality', () => {
  it('should pass when links have descriptive surrounding text', async () => {
    const draft = `
For proper hydration, you should drink adequate amounts of water daily. Learn more about the
[benefits of hydration](/hydration-benefits) and how it affects your overall health and wellbeing.
`;

    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const annotationCheck = results.find(r => r.ruleName === 'Annotation Text Quality');

    expect(annotationCheck).toBeDefined();
    expect(annotationCheck?.isPassing).toBe(true);
  });

  it('should fail when links have generic anchors', async () => {
    const draft = `
For more information, [click here](/page).

[Read more](/other) about water.

See [here](/another) for details.
`;

    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const annotationCheck = results.find(r => r.ruleName === 'Annotation Text Quality');

    expect(annotationCheck).toBeDefined();
    expect(annotationCheck?.isPassing).toBe(false);
    expect(annotationCheck?.details).toContain('lack');
  });
});

describe('checkSupplementaryLinkPlacement', () => {
  it('should pass when related links are at the end', async () => {
    const draft = `## Introduction

Main content about the topic without any links in the introduction.

## Topic Details

More details here about the subject matter.

## Related Topics

See [Related Article](/related) for more information.
`;

    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const placementCheck = results.find(r => r.ruleName === 'Supplementary Link Placement');

    expect(placementCheck).toBeDefined();
    expect(placementCheck?.isPassing).toBe(true);
  });

  it('should fail when many links appear in introduction', async () => {
    const draft = `## Introduction

Check out [this guide](/a), [that resource](/b), and [another article](/c) for context before we begin.

## Main Content

The main topic is discussed here without distractions.
`;

    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(draft, brief, info);
    const placementCheck = results.find(r => r.ruleName === 'Supplementary Link Placement');

    expect(placementCheck).toBeDefined();
    expect(placementCheck?.isPassing).toBe(false);
    expect(placementCheck?.details).toContain('Introduction contains');
  });
});

// =====================================================
// Sentence Length Check (Semantic SEO Requirement)
// =====================================================

describe('checkSentenceLength', () => {
  it('passes when sentences are short', async () => {
    const text = `## Introduction

This is short. This is also short. Good content here.

## Main Topic

Test keyword is a concept. It has specific meaning. The approach works well.`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(text, brief, info);
    const rule = results.find(r => r.ruleName === 'Sentence Length');

    expect(rule).toBeDefined();
    expect(rule?.isPassing).toBe(true);
    expect(rule?.score).toBe(100);
  });

  it('warns when some sentences are long', async () => {
    const longSentence = 'This is a very long sentence that goes on and on and on and on and on and on and on and on and on and on and on and on and on and on and on to exceed thirty words easily.';
    const text = `## Introduction

Short sentence here. ${longSentence} Another short one.

## Main Topic

More short content.`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(text, brief, info);
    const rule = results.find(r => r.ruleName === 'Sentence Length');

    expect(rule).toBeDefined();
    expect(rule?.isPassing).toBe(true); // 1 long sentence is a warning, not failure
    expect(rule?.score).toBeLessThan(100);
  });

  it('fails when too many sentences are long', async () => {
    const longSentence = 'This is a very long sentence that goes on and on and on and on and on and on and on and on and on and on and on and on and on and on and on to exceed thirty words easily.';
    const text = `## Introduction

${longSentence} ${longSentence} ${longSentence}

## More Content

Additional content here.`;
    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(text, brief, info);
    const rule = results.find(r => r.ruleName === 'Sentence Length');

    expect(rule).toBeDefined();
    expect(rule?.isPassing).toBe(false);
    expect(rule?.details).toContain('exceed');
  });
});

// =====================================================
// EAV Density Check (Semantic SEO Requirement)
// =====================================================

describe('checkEavDensity', () => {
  it('passes with high pattern density when EAVs are not provided', async () => {
    // Content with lots of "X is Y" patterns (EAV-like structures)
    const text = `## Introduction

Water is essential for human survival. The human body is composed of approximately 60% water.
Dehydration is a condition where the body loses more fluid than it takes in.
The recommended daily water intake is 2-3 liters for most adults.

## Benefits

Hydration is critical for cognitive function. Brain performance is directly linked to water intake.
Blood pressure is regulated by proper fluid balance. Kidney function is optimized with adequate water.`;

    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(text, brief, info);
    const rule = results.find(r => r.ruleName === 'EAV Density');

    expect(rule).toBeDefined();
    expect(rule?.isPassing).toBe(true);
    expect(rule?.score).toBeGreaterThanOrEqual(50);
  });

  it('warns when EAV density is moderate', async () => {
    // Content with some EAV patterns but also fluff
    const text = `## Introduction

Water is important for health. People should drink more water. It really helps a lot.
Many experts agree about this topic. There are several considerations to keep in mind.

## Details

Some studies suggest benefits. The research shows interesting findings about hydration.
Various factors play a role. Drinking water has many implications.`;

    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(text, brief, info);
    const rule = results.find(r => r.ruleName === 'EAV Density');

    expect(rule).toBeDefined();
    // Should still pass but with a lower score
    expect(rule?.details).toContain('%');
  });

  it('fails when content lacks EAV patterns', async () => {
    // Vague content with no "X is Y" structures
    const text = `## Introduction

Thinking about this topic. Considering various things. Looking at possibilities.
Many considerations here. Very important stuff. Quite remarkable really.

## More Content

Some general thoughts. Random observations follow. Nothing specific mentioned.
Vague statements continue. Abstract concepts prevail.`;

    const brief = createMockBrief();
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(text, brief, info);
    const rule = results.find(r => r.ruleName === 'EAV Density');

    expect(rule).toBeDefined();
    expect(rule?.isPassing).toBe(false);
    expect(rule?.details).toContain('lack');
    expect(rule?.score).toBeLessThan(30);
  });

  it('uses term density when EAVs are provided', async () => {
    const eavs = [
      {
        subject: { label: 'Water Filter', type: 'Product' },
        predicate: { relation: 'has', type: 'attribute' },
        object: { value: 'activated carbon', type: 'string' }
      },
      {
        subject: { label: 'Reverse Osmosis', type: 'Process' },
        predicate: { relation: 'removes', type: 'action' },
        object: { value: '99% of contaminants', type: 'string' }
      }
    ] as any;

    // Content using the EAV terms
    const text = `## Water Filter Overview

A water filter is a device that removes impurities. The most common type uses activated carbon.
Activated carbon is effective for removing chlorine and bad tastes.

## Reverse Osmosis

Reverse osmosis is a filtration method. It removes 99% of contaminants from water.
The reverse osmosis process uses a semipermeable membrane.`;

    const brief = createMockBrief({ eavs });
    const info = createMockBusinessInfo();

    const results = await runAlgorithmicAudit(text, brief, info, 'en', eavs);
    const rule = results.find(r => r.ruleName === 'EAV Density');

    expect(rule).toBeDefined();
    expect(rule?.isPassing).toBe(true);
    expect(rule?.details).toContain('Term density');
  });
});
