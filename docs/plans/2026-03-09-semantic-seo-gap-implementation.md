# Semantic SEO Skill Gap Remediation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close all gaps between the application and the updated semantic SEO skill across 6 workstreams: answer capsules, chunking-resistant writing, CoR 2.0 scoring, prompt injection defense, 13 new website types, and Tier 2 quick fixes.

**Architecture:** Extends existing audit validator pattern (class with `validate()` → phase adapter wires via `createFinding()`). Brief generation adds answer_capsule to BriefSection type and prompt. CoR 2.0 is a computed score from existing audit results. New website types extend the WebsiteTypeRuleEngine switch pattern.

**Tech Stack:** TypeScript, React, Vitest, Supabase (PostgreSQL JSONB)

**Design doc:** `docs/plans/2026-03-09-semantic-seo-skill-gap-remediation.md`

---

## Task 1: Answer Capsule — Type & Brief Generation

**Files:**
- Modify: `types/content.ts` (BriefSection interface, ~line 191)
- Modify: `config/prompts/contentBriefs.ts` (GENERATE_BRIEF_OUTLINE_PROMPT)
- Test: `services/ai/__tests__/briefQualityReview.test.ts`

**Step 1: Add answer_capsule to BriefSection type**

In `types/content.ts`, add to the `BriefSection` interface after the `subordinate_text_hint` field:

```typescript
  /** Answer capsule: 40-70 word direct answer for this section (LLM/RAG/Featured Snippet optimization) */
  answer_capsule?: {
    text_hint: string;
    target_length: number;
    required_predicates?: string[];
  };
```

**Step 2: Add answer capsule rules to GENERATE_BRIEF_OUTLINE_PROMPT**

In `config/prompts/contentBriefs.ts`, find the outline prompt and add after the subordinate text rule section:

```
**ANSWER CAPSULE RULE (per H2 section)**:
For each H2, include an "answer_capsule" object:
- "text_hint": A 40-70 word direct factual answer to the heading's question. No preamble, no "In this section...". Lead with the entity name or key term. Must read as a natural, compelling opening paragraph.
- "target_length": Number between 40 and 70.
- "required_predicates": 1-3 key verbs/terms the capsule must contain.

VARIETY RULE: Vary capsule openings across sections. Use definition ("X is..."), statistic ("In 2025, X..."), narrative ("When X occurs..."), scene-setting ("For businesses seeking..."), and question-answer approaches. Do NOT start every capsule with "[Entity] is...".
```

Also add `answer_capsule` to the JSON schema example in the prompt where `structured_outline` items are described.

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors — answer_capsule is optional)

**Step 4: Commit**

```bash
git add types/content.ts config/prompts/contentBriefs.ts
git commit -m "feat(briefs): add answer_capsule type and prompt rules"
```

---

## Task 2: Answer Capsule — Quality Scoring

**Files:**
- Modify: `services/ai/briefQualityReview.ts` (~line 399, Format Compliance component)
- Test: `services/ai/__tests__/briefQualityReview.test.ts`

**Step 1: Write the failing test**

In the test file for briefQualityReview, add:

```typescript
describe('answer capsule quality check', () => {
  it('scores 100 when all sections have valid answer capsules', () => {
    const brief = makeBrief({
      structured_outline: [
        { heading: 'What is X?', level: 2, answer_capsule: { text_hint: 'X is a...', target_length: 50, required_predicates: ['is'] } },
        { heading: 'How does X work?', level: 2, answer_capsule: { text_hint: 'X works by...', target_length: 55, required_predicates: ['works'] } },
        { heading: 'Benefits of X', level: 2, answer_capsule: { text_hint: 'X provides...', target_length: 45, required_predicates: ['provides'] } },
      ],
    });
    const report = reviewBriefQuality(brief, topic, businessInfo, pillars, allTopics);
    expect(report.componentScores?.formatCompliance).toBeGreaterThanOrEqual(80);
  });

  it('scores lower when answer capsules are missing', () => {
    const brief = makeBrief({
      structured_outline: [
        { heading: 'What is X?', level: 2 },
        { heading: 'How does X work?', level: 2 },
        { heading: 'Benefits of X', level: 2 },
      ],
    });
    const report = reviewBriefQuality(brief, topic, businessInfo, pillars, allTopics);
    // Without capsules, format compliance should be lower
    const withCapsules = reviewBriefQuality(makeBrief({
      structured_outline: [
        { heading: 'What is X?', level: 2, answer_capsule: { text_hint: 'X is...', target_length: 50, required_predicates: ['is'] } },
        { heading: 'How?', level: 2, answer_capsule: { text_hint: 'X works...', target_length: 50, required_predicates: ['works'] } },
        { heading: 'Benefits', level: 2, answer_capsule: { text_hint: 'X provides...', target_length: 50, required_predicates: ['provides'] } },
      ],
    }), topic, businessInfo, pillars, allTopics);
    expect(withCapsules.score).toBeGreaterThan(report.score);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/ai/__tests__/briefQualityReview.test.ts`
Expected: FAIL (no answer capsule check exists yet)

**Step 3: Add answer capsule check to Format Compliance**

In `briefQualityReview.ts`, add a new check function:

```typescript
function checkAnswerCapsules(brief: ContentBrief): BriefQualityCheck {
  const sections = (brief.structured_outline ?? []).filter(s => s.level === 2);
  if (sections.length === 0) {
    return { name: 'Answer Capsules', passed: true, details: 'No H2 sections' };
  }
  const withCapsule = sections.filter(s =>
    s.answer_capsule &&
    s.answer_capsule.text_hint &&
    s.answer_capsule.target_length >= 40 &&
    s.answer_capsule.target_length <= 70
  );
  const ratio = withCapsule.length / sections.length;
  const passed = ratio >= 0.5;
  return {
    name: 'Answer Capsules',
    passed,
    details: `${withCapsule.length}/${sections.length} H2 sections have valid answer capsules (40-70 words)`,
    suggestion: passed ? undefined : 'Add answer_capsule with text_hint (40-70 words) to each H2 section for Featured Snippet and AI Overview eligibility',
  };
}
```

Wire into Format Compliance component (existing 15% weight). Adjust the weighting within the component:
- Featured Snippet: 40% (was 60%)
- Website-Type Compliance: 30% (was 40%)
- Answer Capsules: 30% (new)

```typescript
componentScores.formatCompliance = Math.round(
  (graduateCheck(featuredSnippetCheck) * 0.4) +
  (graduateCheck(websiteTypeCheck) * 0.3) +
  (graduateCheck(answerCapsuleCheck) * 0.3)
);
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/ai/__tests__/briefQualityReview.test.ts`
Expected: PASS

**Step 5: Run full type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add services/ai/briefQualityReview.ts services/ai/__tests__/briefQualityReview.test.ts
git commit -m "feat(quality): add answer capsule check to Format Compliance scoring"
```

---

## Task 3: Answer Capsule — Audit Validator

**Files:**
- Create: `services/audit/rules/AnswerCapsuleValidator.ts`
- Create: `services/audit/rules/__tests__/AnswerCapsuleValidator.test.ts`
- Modify: `services/audit/phases/ContentFormatPhase.ts`

**Step 1: Write the failing test**

```typescript
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
    // Build a paragraph > 70 words
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/audit/rules/__tests__/AnswerCapsuleValidator.test.ts`
Expected: FAIL (module not found)

**Step 3: Implement AnswerCapsuleValidator**

```typescript
/**
 * Answer Capsule Validator
 *
 * Validates that the first paragraph after each H2 heading serves as a
 * 40-70 word answer capsule: direct, factual, entity-explicit, no preamble.
 * Capsules must read as natural, compelling opening paragraphs.
 */

export interface CapsuleIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

const PREAMBLE_PATTERNS = [
  /^in this section/i,
  /^let's explore/i,
  /^let us explore/i,
  /^we will discuss/i,
  /^this section covers/i,
  /^this section explores/i,
  /^here we will/i,
  /^now let's/i,
  /^before we begin/i,
  /^to understand/i,
  /^it is important to note/i,
  /^in today's world/i,
  /^in the ever-evolving/i,
];

export class AnswerCapsuleValidator {
  validate(html: string, entityName?: string): CapsuleIssue[] {
    const issues: CapsuleIssue[] = [];
    const sections = this.extractH2Sections(html);

    if (sections.length === 0) return issues;

    const openingPatterns: string[] = [];

    for (const section of sections) {
      const firstPara = section.firstParagraph;
      if (!firstPara) continue;

      const wordCount = firstPara.split(/\s+/).filter(w => w.length > 0).length;

      // Check length (40-70 words)
      if (wordCount < 40 || wordCount > 70) {
        issues.push({
          ruleId: 'rule-capsule-length',
          severity: 'medium',
          title: 'Answer capsule outside 40-70 word range',
          description: `First paragraph after "${section.heading}" is ${wordCount} words (target: 40-70). Answer capsules should be concise, direct answers that work for Featured Snippets and RAG retrieval.`,
          affectedElement: section.heading,
          exampleFix: wordCount < 40
            ? 'Expand with a supporting fact or evidence to reach 40 words'
            : 'Tighten to core facts only — move detail to subsequent paragraphs',
        });
      }

      // Check entity presence
      if (entityName && !firstPara.toLowerCase().includes(entityName.toLowerCase())) {
        issues.push({
          ruleId: 'rule-capsule-entity',
          severity: 'medium',
          title: 'Answer capsule missing entity name',
          description: `First paragraph after "${section.heading}" does not mention "${entityName}". RAG systems may extract this section without page context — the entity name ensures the chunk is self-identifying.`,
          affectedElement: section.heading,
          exampleFix: `Include "${entityName}" naturally in the opening sentence`,
        });
      }

      // Check preamble
      const trimmed = firstPara.trim();
      for (const pattern of PREAMBLE_PATTERNS) {
        if (pattern.test(trimmed)) {
          issues.push({
            ruleId: 'rule-capsule-preamble',
            severity: 'medium',
            title: 'Answer capsule starts with preamble',
            description: `First paragraph after "${section.heading}" starts with introductory fluff. Answer capsules must open with a direct factual statement, not setup text.`,
            affectedElement: section.heading,
            exampleFix: 'Remove the introductory phrase and start with the direct answer',
          });
          break;
        }
      }

      // Track opening pattern for variety check
      const firstWords = trimmed.split(/\s+/).slice(0, 4).join(' ').toLowerCase();
      openingPatterns.push(firstWords);
    }

    // Check variety: flag if 3+ capsules start with the same 4-word pattern
    const patternCounts = new Map<string, number>();
    for (const p of openingPatterns) {
      patternCounts.set(p, (patternCounts.get(p) || 0) + 1);
    }
    for (const [pattern, count] of patternCounts) {
      if (count >= 3) {
        issues.push({
          ruleId: 'rule-capsule-variety',
          severity: 'low',
          title: 'Repetitive answer capsule openings',
          description: `${count} answer capsules start with "${pattern}...". Vary openings for better readability — use definitions, statistics, narratives, and scene-setting approaches.`,
          exampleFix: 'Rewrite some capsules to open with a statistic, question-answer, or narrative approach instead',
        });
      }
    }

    return issues;
  }

  private extractH2Sections(html: string): Array<{ heading: string; firstParagraph: string }> {
    const results: Array<{ heading: string; firstParagraph: string }> = [];
    // Simple regex extraction — match H2 followed by first <p>
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    let match;
    while ((match = h2Regex.exec(html)) !== null) {
      const heading = match[1].replace(/<[^>]+>/g, '').trim();
      const afterH2 = html.slice(match.index + match[0].length);
      const pMatch = afterH2.match(/<p[^>]*>(.*?)<\/p>/is);
      if (pMatch) {
        const paraText = pMatch[1].replace(/<[^>]+>/g, '').trim();
        results.push({ heading, firstParagraph: paraText });
      }
    }
    return results;
  }
}
```

**Step 4: Wire into ContentFormatPhase**

In `services/audit/phases/ContentFormatPhase.ts`, add import and validation call:

```typescript
import { AnswerCapsuleValidator } from '../rules/AnswerCapsuleValidator';

// Inside execute(), after existing format validators:
totalChecks++;
const capsuleValidator = new AnswerCapsuleValidator();
const capsuleIssues = capsuleValidator.validate(
  contentData.html,
  request.centralEntity || request.targetQuery
);
for (const issue of capsuleIssues) {
  findings.push(this.createFinding({
    ruleId: issue.ruleId,
    severity: issue.severity,
    title: issue.title,
    description: issue.description,
    affectedElement: issue.affectedElement,
    exampleFix: issue.exampleFix,
    whyItMatters: 'Answer capsules (40-70 word opening paragraphs) serve Featured Snippets, AI Overviews, and RAG retrieval simultaneously while providing immediate value to human readers.',
    category: 'Content Format',
  }));
}
```

**Step 5: Run tests**

Run: `npx vitest run services/audit/rules/__tests__/AnswerCapsuleValidator.test.ts`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add services/audit/rules/AnswerCapsuleValidator.ts services/audit/rules/__tests__/AnswerCapsuleValidator.test.ts services/audit/phases/ContentFormatPhase.ts
git commit -m "feat(audit): add AnswerCapsuleValidator for LLM/RAG readiness"
```

---

## Task 4: Chunking Resistance — Audit Validator

**Files:**
- Create: `services/audit/rules/ChunkingResistanceValidator.ts`
- Create: `services/audit/rules/__tests__/ChunkingResistanceValidator.test.ts`
- Modify: `services/audit/phases/ContextualFlowPhase.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { ChunkingResistanceValidator } from '../ChunkingResistanceValidator';

describe('ChunkingResistanceValidator', () => {
  const validator = new ChunkingResistanceValidator();

  it('flags forward references like "as mentioned above"', () => {
    const html = `<h2>Benefits</h2><p>As mentioned above, solar energy reduces costs significantly for homeowners.</p>`;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-chunk-forward-ref' }));
  });

  it('flags "see below" references', () => {
    const html = `<h2>Overview</h2><p>Solar energy provides many benefits, see below for details on each advantage.</p>`;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-chunk-forward-ref' }));
  });

  it('flags missing entity in first sentence of H2 section', () => {
    const html = `<h2>Key Benefits</h2><p>It provides significant cost savings for homeowners across the country.</p>`;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-chunk-entity-reintro' }));
  });

  it('passes when entity is in first sentence', () => {
    const html = `<h2>Key Benefits</h2><p>Solar energy provides significant cost savings for homeowners across the country.</p>`;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues.filter(i => i.ruleId === 'rule-chunk-entity-reintro')).toHaveLength(0);
  });

  it('flags sections over 800 words', () => {
    const longContent = Array(850).fill('word').join(' ');
    const html = `<h2>Long Section</h2><p>${longContent}</p>`;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-chunk-section-length' }));
  });

  it('flags sections under 100 words', () => {
    const html = `<h2>Short Section</h2><p>Very brief content here.</p>`;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-chunk-section-length' }));
  });

  it('passes clean content with no cross-references', () => {
    const html = `
      <h2>What is Solar Energy?</h2>
      <p>Solar energy is the radiant light and heat from the Sun harnessed using photovoltaic cells and thermal collectors. Modern solar panels convert sunlight directly into electricity through the photovoltaic effect. This technology provides clean renewable power for residential commercial and industrial applications worldwide with growing adoption rates.</p>
      <h2>How Solar Panels Work</h2>
      <p>Solar panels work by converting photons from sunlight into electrical current through semiconductor materials. Each panel contains multiple photovoltaic cells made from silicon wafers that generate direct current when exposed to light. An inverter then converts this direct current into alternating current suitable for home use and grid connection.</p>
    `;
    const issues = validator.validate(html, 'Solar energy');
    expect(issues.filter(i => i.ruleId === 'rule-chunk-forward-ref')).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/audit/rules/__tests__/ChunkingResistanceValidator.test.ts`
Expected: FAIL

**Step 3: Implement ChunkingResistanceValidator**

```typescript
/**
 * Chunking Resistance Validator
 *
 * Validates that content sections can be extracted in isolation by RAG systems
 * and still make complete sense. Checks for cross-section references, entity
 * re-introduction, and section length optimization.
 */

export interface ChunkingIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

const FORWARD_BACKWARD_PATTERNS = [
  /as mentioned above/i,
  /as discussed above/i,
  /as noted above/i,
  /as explained above/i,
  /as described above/i,
  /as stated above/i,
  /as we discussed/i,
  /as we mentioned/i,
  /see below/i,
  /see above/i,
  /in the previous section/i,
  /in the next section/i,
  /in the following section/i,
  /later in this article/i,
  /earlier in this article/i,
  /as discussed earlier/i,
  /as noted earlier/i,
  /we covered this in/i,
  /refer to the section/i,
];

export class ChunkingResistanceValidator {
  validate(html: string, entityName?: string): ChunkingIssue[] {
    const issues: ChunkingIssue[] = [];
    const sections = this.extractH2Sections(html);

    for (const section of sections) {
      // Check forward/backward references
      for (const pattern of FORWARD_BACKWARD_PATTERNS) {
        if (pattern.test(section.content)) {
          const match = section.content.match(pattern);
          issues.push({
            ruleId: 'rule-chunk-forward-ref',
            severity: 'medium',
            title: 'Cross-section reference breaks chunking',
            description: `Section "${section.heading}" contains "${match?.[0] || 'cross-reference'}". RAG systems may extract this section alone — the referenced content won't be available. Restate the fact instead.`,
            affectedElement: section.heading,
            exampleFix: 'Replace the cross-reference with the actual fact or statement being referenced',
          });
          break; // One finding per section for this rule
        }
      }

      // Check entity re-introduction in first sentence
      if (entityName && section.firstSentence) {
        if (!section.firstSentence.toLowerCase().includes(entityName.toLowerCase())) {
          issues.push({
            ruleId: 'rule-chunk-entity-reintro',
            severity: 'medium',
            title: 'Entity not re-introduced in section',
            description: `First sentence of "${section.heading}" does not mention "${entityName}". When this section is extracted as a standalone chunk, the subject is unclear.`,
            affectedElement: section.heading,
            exampleFix: `Naturally include "${entityName}" in the opening sentence`,
          });
        }
      }

      // Check section length
      const wordCount = section.content.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount > 800) {
        issues.push({
          ruleId: 'rule-chunk-section-length',
          severity: 'low',
          title: 'Section may split across multiple RAG chunks',
          description: `Section "${section.heading}" is ${wordCount} words. Sections over 800 words risk being split by RAG chunking algorithms, potentially losing context. Consider splitting into focused subsections.`,
          affectedElement: section.heading,
          exampleFix: 'Split into 2-3 subsections (H3) of 200-500 words each',
        });
      } else if (wordCount < 100 && wordCount > 0) {
        issues.push({
          ruleId: 'rule-chunk-section-length',
          severity: 'low',
          title: 'Section too thin for standalone retrieval',
          description: `Section "${section.heading}" is only ${wordCount} words. Sections under 100 words may not provide sufficient context when retrieved as a standalone chunk.`,
          affectedElement: section.heading,
          exampleFix: 'Expand with supporting evidence, examples, or merge into parent section',
        });
      }
    }

    return issues;
  }

  private extractH2Sections(html: string): Array<{
    heading: string;
    content: string;
    firstSentence: string;
  }> {
    const results: Array<{ heading: string; content: string; firstSentence: string }> = [];
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    const matches = [...html.matchAll(h2Regex)];

    for (let i = 0; i < matches.length; i++) {
      const heading = matches[i][1].replace(/<[^>]+>/g, '').trim();
      const start = matches[i].index! + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index! : html.length;
      const sectionHtml = html.slice(start, end);
      const content = sectionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      // Extract first sentence (up to first period, question mark, or exclamation)
      const sentenceMatch = content.match(/^[^.!?]+[.!?]/);
      const firstSentence = sentenceMatch ? sentenceMatch[0].trim() : content.slice(0, 200);

      results.push({ heading, content, firstSentence });
    }

    return results;
  }
}
```

**Step 4: Wire into ContextualFlowPhase**

In `services/audit/phases/ContextualFlowPhase.ts`, add:

```typescript
import { ChunkingResistanceValidator } from '../rules/ChunkingResistanceValidator';

// Inside execute(), after existing flow validators:
if (contentData?.html) {
  totalChecks++;
  const chunkValidator = new ChunkingResistanceValidator();
  const chunkIssues = chunkValidator.validate(
    contentData.html,
    contentData.centralEntity || request.centralEntity
  );
  for (const issue of chunkIssues) {
    findings.push(this.createFinding({
      ruleId: issue.ruleId,
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      affectedElement: issue.affectedElement,
      exampleFix: issue.exampleFix,
      whyItMatters: 'Self-contained sections survive RAG chunking and can be retrieved independently by AI systems. Cross-references break when a section is extracted alone.',
      category: 'Contextual Flow',
    }));
  }
}
```

**Step 5: Run tests**

Run: `npx vitest run services/audit/rules/__tests__/ChunkingResistanceValidator.test.ts`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add services/audit/rules/ChunkingResistanceValidator.ts services/audit/rules/__tests__/ChunkingResistanceValidator.test.ts services/audit/phases/ContextualFlowPhase.ts
git commit -m "feat(audit): add ChunkingResistanceValidator for RAG-ready content"
```

---

## Task 5: Chunking Resistance — Brief Prompt Updates

**Files:**
- Modify: `config/prompts/contentBriefs.ts`
- Modify: `services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts`

**Step 1: Add chunking resistance to outline prompt**

In `GENERATE_BRIEF_OUTLINE_PROMPT`, add after the subordinate text rules:

```
**CHUNKING RESISTANCE (Self-Contained Sections)**:
Each section MUST be independently comprehensible when read in isolation:
- Re-introduce the entity by name in the first sentence (not "it" or "they")
- Never use cross-references: "as mentioned above", "see below", "as discussed earlier"
- Each section should be 200-500 words (optimal for RAG chunk retrieval)
- Include at least one complete fact (Subject-Predicate-Object) per section
```

**Step 2: Add isolation instruction to SectionPromptBuilder**

In `sectionPromptBuilder.ts`, in the `buildSubordinateTextGuidance` method or the main `build` method, add:

```
**ISOLATION RULE**: This section may be read in complete isolation by an AI system. Do not assume the reader has seen any other section. Restate key facts rather than referencing other sections.
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add config/prompts/contentBriefs.ts services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts
git commit -m "feat(prompts): add chunking resistance and isolation rules"
```

---

## Task 6: CoR 2.0 Scoring Model

**Files:**
- Create: `services/ai/cor2Scorer.ts`
- Create: `services/ai/__tests__/cor2Scorer.test.ts`
- Modify: `components/audit/UnifiedAuditDashboard.tsx` (add score display)

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { computeCor2Score } from '../cor2Scorer';

describe('computeCor2Score', () => {
  it('returns perfect score when all factors are optimal', () => {
    const result = computeCor2Score({
      chunkingIssueCount: 0,
      totalSections: 5,
      fillerWordCount: 0,
      totalWords: 500,
      capsuleCompliantSections: 5,
      totalH2Sections: 5,
      pronounDensity: 0.03,
      hasQuestionH2s: true,
      hasSemanticHtml: true,
      hasProperNesting: true,
      hasArticleSchema: true,
      hasAuthorEntity: true,
      hasCanonical: true,
    });
    expect(result.score).toBeGreaterThanOrEqual(4.5);
    expect(result.score).toBeLessThanOrEqual(5.0);
    expect(result.interpretation).toBe('fully_optimized');
  });

  it('returns low score when nothing is optimized', () => {
    const result = computeCor2Score({
      chunkingIssueCount: 10,
      totalSections: 5,
      fillerWordCount: 50,
      totalWords: 200,
      capsuleCompliantSections: 0,
      totalH2Sections: 5,
      pronounDensity: 0.20,
      hasQuestionH2s: false,
      hasSemanticHtml: false,
      hasProperNesting: false,
      hasArticleSchema: false,
      hasAuthorEntity: false,
      hasCanonical: false,
    });
    expect(result.score).toBeLessThan(2.5);
    expect(result.interpretation).toBe('not_optimized');
  });

  it('returns per-factor breakdown', () => {
    const result = computeCor2Score({
      chunkingIssueCount: 0,
      totalSections: 5,
      fillerWordCount: 0,
      totalWords: 500,
      capsuleCompliantSections: 5,
      totalH2Sections: 5,
      pronounDensity: 0.03,
      hasQuestionH2s: true,
      hasSemanticHtml: true,
      hasProperNesting: true,
      hasArticleSchema: true,
      hasAuthorEntity: true,
      hasCanonical: true,
    });
    expect(result.factors).toHaveProperty('selfContainedSections');
    expect(result.factors).toHaveProperty('informationDensity');
    expect(result.factors).toHaveProperty('answerCapsuleCompliance');
    expect(result.factors).toHaveProperty('entityExplicitness');
    expect(result.factors).toHaveProperty('structuralClarity');
    expect(result.factors).toHaveProperty('attributionIntegrity');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/ai/__tests__/cor2Scorer.test.ts`
Expected: FAIL

**Step 3: Implement cor2Scorer**

```typescript
/**
 * CoR 2.0 Scorer
 *
 * Computes a 6-factor weighted LLM readiness score (0-5) from audit results.
 * Measures how well content is optimized for RAG retrieval, AI Overviews,
 * and Featured Snippets alongside traditional search.
 */

export interface Cor2Input {
  // Self-contained sections
  chunkingIssueCount: number;
  totalSections: number;
  // Information density
  fillerWordCount: number;
  totalWords: number;
  // Answer capsule
  capsuleCompliantSections: number;
  totalH2Sections: number;
  // Entity explicitness
  pronounDensity: number; // 0-1
  // Structural clarity
  hasQuestionH2s: boolean;
  hasSemanticHtml: boolean;
  hasProperNesting: boolean;
  // Attribution integrity
  hasArticleSchema: boolean;
  hasAuthorEntity: boolean;
  hasCanonical: boolean;
}

export interface Cor2Result {
  score: number; // 0-5
  interpretation: 'fully_optimized' | 'good_foundation' | 'significant_gaps' | 'not_optimized';
  factors: Record<string, { score: number; weight: number; label: string }>;
}

export function computeCor2Score(input: Cor2Input): Cor2Result {
  // Factor 1: Self-contained sections (20%)
  const chunkingRatio = input.totalSections > 0
    ? Math.max(0, 1 - (input.chunkingIssueCount / input.totalSections))
    : 0.5;
  const selfContained = chunkingRatio * 5;

  // Factor 2: Information density (20%)
  const fillerRatio = input.totalWords > 0
    ? input.fillerWordCount / input.totalWords
    : 0;
  const density = Math.max(0, 5 - (fillerRatio * 50)); // 10% filler = score 0

  // Factor 3: Answer capsule compliance (15%)
  const capsuleRatio = input.totalH2Sections > 0
    ? input.capsuleCompliantSections / input.totalH2Sections
    : 0;
  const capsule = capsuleRatio * 5;

  // Factor 4: Entity explicitness (15%)
  const entityScore = input.pronounDensity <= 0.05 ? 5
    : input.pronounDensity <= 0.10 ? 3.5
    : input.pronounDensity <= 0.15 ? 2
    : 1;

  // Factor 5: Structural clarity (15%)
  let structurePoints = 0;
  if (input.hasQuestionH2s) structurePoints += 2;
  if (input.hasSemanticHtml) structurePoints += 1.5;
  if (input.hasProperNesting) structurePoints += 1.5;
  const structure = structurePoints;

  // Factor 6: Attribution integrity (15%)
  let attrPoints = 0;
  if (input.hasArticleSchema) attrPoints += 2;
  if (input.hasAuthorEntity) attrPoints += 1.5;
  if (input.hasCanonical) attrPoints += 1.5;
  const attribution = attrPoints;

  // Weighted total
  const score = Math.round((
    selfContained * 0.20 +
    density * 0.20 +
    capsule * 0.15 +
    entityScore * 0.15 +
    structure * 0.15 +
    attribution * 0.15
  ) * 10) / 10;

  const interpretation: Cor2Result['interpretation'] =
    score >= 4.5 ? 'fully_optimized'
    : score >= 3.5 ? 'good_foundation'
    : score >= 2.5 ? 'significant_gaps'
    : 'not_optimized';

  return {
    score,
    interpretation,
    factors: {
      selfContainedSections: { score: Math.round(selfContained * 10) / 10, weight: 0.20, label: 'Self-Contained Sections' },
      informationDensity: { score: Math.round(density * 10) / 10, weight: 0.20, label: 'Information Density' },
      answerCapsuleCompliance: { score: Math.round(capsule * 10) / 10, weight: 0.15, label: 'Answer Capsule Compliance' },
      entityExplicitness: { score: Math.round(entityScore * 10) / 10, weight: 0.15, label: 'Entity Explicitness' },
      structuralClarity: { score: Math.round(structure * 10) / 10, weight: 0.15, label: 'Structural Clarity' },
      attributionIntegrity: { score: Math.round(attribution * 10) / 10, weight: 0.15, label: 'Attribution Integrity' },
    },
  };
}
```

**Step 4: Run tests**

Run: `npx vitest run services/ai/__tests__/cor2Scorer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai/cor2Scorer.ts services/ai/__tests__/cor2Scorer.test.ts
git commit -m "feat(audit): add CoR 2.0 scoring model for LLM readiness"
```

**Step 6: Wire into UnifiedAuditDashboard (UI)**

Add CoR 2.0 score ring next to the existing audit score. Import `computeCor2Score`, extract inputs from the audit report findings, and render alongside the main score. This is a UI integration step — implement after the core scoring logic is verified.

```bash
git add components/audit/UnifiedAuditDashboard.tsx
git commit -m "feat(ui): display CoR 2.0 score on audit dashboard"
```

---

## Task 7: Prompt Injection Defense Validator

**Files:**
- Create: `services/audit/rules/PromptInjectionDefenseValidator.ts`
- Create: `services/audit/rules/__tests__/PromptInjectionDefenseValidator.test.ts`
- Modify: `services/audit/phases/HtmlTechnicalPhase.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { PromptInjectionDefenseValidator } from '../PromptInjectionDefenseValidator';

describe('PromptInjectionDefenseValidator', () => {
  const validator = new PromptInjectionDefenseValidator();

  it('flags display:none on text-containing elements', () => {
    const html = `<div><p>Visible</p><p style="display:none">Hidden instruction for AI</p></div>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-injection-hidden-text' }));
  });

  it('flags visibility:hidden', () => {
    const html = `<div><span style="visibility:hidden">Secret text</span></div>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-injection-hidden-text' }));
  });

  it('flags opacity:0', () => {
    const html = `<div><p style="opacity:0">Invisible content</p></div>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-injection-hidden-text' }));
  });

  it('flags zero-width characters', () => {
    const html = `<p>Normal text\u200Bhidden\u200Btext here</p>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-injection-zero-width' }));
  });

  it('flags tiny font size', () => {
    const html = `<p style="font-size:1px">Tiny hidden text that humans cannot read</p>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-injection-tiny-font' }));
  });

  it('passes clean HTML', () => {
    const html = `<article><h1>Title</h1><p>Normal visible content about solar energy.</p></article>`;
    const issues = validator.validate(html);
    expect(issues).toHaveLength(0);
  });

  it('checks for editorial/UGC separation', () => {
    const html = `<div><p>Main content</p><div class="comments"><p>User comment</p></div></div>`;
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-injection-ugc-separation' }));
  });
});
```

**Step 2: Implement the validator**

Follow the same class pattern as `SignalConflictChecker`. Key checks:
- `checkHiddenText(html)` — regex for `display:\s*none`, `visibility:\s*hidden`, `opacity:\s*0` on elements with text content
- `checkZeroWidthChars(html)` — scan for U+200B-U+200F, U+FEFF, U+2060
- `checkTinyFont(html)` — regex for `font-size:\s*[0-5]px`
- `checkOffScreen(html)` — `position:\s*(absolute|fixed)` with `left:\s*-[0-9]{4,}` or `top:\s*-[0-9]{4,}`
- `checkUgcSeparation(html)` — check for `<article>` or `<main>` tag presence; if comments/reviews detected without `<aside>`, flag

**Step 3: Wire into HtmlTechnicalPhase.ts**

Same pattern as other validators — instantiate, call validate, loop issues through createFinding.

**Step 4: Run tests, type check, commit**

```bash
git commit -m "feat(audit): add PromptInjectionDefenseValidator for content security"
```

---

## Task 8: AI Crawl Management Validator

**Files:**
- Create: `services/audit/rules/AiCrawlManagementValidator.ts`
- Create: `services/audit/rules/__tests__/AiCrawlManagementValidator.test.ts`
- Modify: `services/audit/phases/UrlArchitecturePhase.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { AiCrawlManagementValidator } from '../AiCrawlManagementValidator';

describe('AiCrawlManagementValidator', () => {
  const validator = new AiCrawlManagementValidator();

  it('reports missing AI crawler policies', () => {
    const robotsTxt = 'User-agent: Googlebot\nAllow: /\n';
    const issues = validator.validate(robotsTxt);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-ai-crawl-policy' }));
  });

  it('reports when AI crawlers are addressed', () => {
    const robotsTxt = `User-agent: Googlebot\nAllow: /\nUser-agent: GPTBot\nDisallow: /private/\nUser-agent: ClaudeBot\nAllow: /blog/\n`;
    const issues = validator.validate(robotsTxt);
    // Should still report on uncovered crawlers but with lower severity
    const policyIssue = issues.find(i => i.ruleId === 'rule-ai-crawl-policy');
    if (policyIssue) {
      expect(policyIssue.severity).toBe('low');
    }
  });

  it('checks for AI meta tags', () => {
    const issues = validator.validateMetaTags('<meta name="robots" content="index, follow">');
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-ai-meta-tags' }));
  });

  it('passes when noai is present', () => {
    const issues = validator.validateMetaTags('<meta name="robots" content="index, follow, noai">');
    expect(issues.filter(i => i.ruleId === 'rule-ai-meta-tags')).toHaveLength(0);
  });
});
```

**Step 2: Implement, wire, test, commit**

The validator checks robots.txt for 7 AI crawlers: GPTBot, ClaudeBot, Google-Extended, CCBot, PerplexityBot, Bytespider, ChatGPT-User. Reports which are addressed. All findings are `low` severity (informational).

```bash
git commit -m "feat(audit): add AiCrawlManagementValidator for AI crawler policy"
```

---

## Task 9: New Website Types (13 additions)

**Files:**
- Modify: `services/audit/rules/WebsiteTypeRuleEngine.ts`
- Modify: `config/prompts/_common.ts` (getWebsiteTypeRulesForBrief)
- Test: `services/audit/rules/__tests__/WebsiteTypeRuleEngine.test.ts`

**Step 1: Expand WebsiteType union in WebsiteTypeRuleEngine.ts**

Replace the local `WebsiteType` type at line 21-27:

```typescript
export type WebsiteType =
  | 'ecommerce'
  | 'saas'
  | 'b2b'
  | 'blog'
  | 'local-business'
  | 'marketplace'
  | 'events'
  | 'lead-generation'
  | 'real-estate'
  | 'healthcare'
  | 'hospitality'
  | 'affiliate-review'
  | 'news-media'
  | 'education'
  | 'recruitment'
  | 'directory'
  | 'community'
  | 'nonprofit'
  | 'other';
```

**Step 2: Add switch cases and validate methods**

Add cases to the switch statement and implement validate methods for each new type. Each method follows the existing pattern (check schema types, check content patterns, return issues array). Use the skill file `frameworks/website-types.md` as the specification for each type's rules.

Example for marketplace:

```typescript
case 'marketplace':
  return this.validateMarketplace(input);

private validateMarketplace(input: WebsiteTypeInput): WebsiteTypeIssue[] {
  const issues: WebsiteTypeIssue[] = [];
  const text = input.text || '';
  const html = input.html || '';
  const schemas = input.schemaTypes || [];

  // Rule MP-1: Product/Offer schema
  if (!schemas.some(s => s.includes('Product') || s.includes('Offer'))) {
    issues.push({
      ruleId: 'rule-mp-schema',
      severity: 'high',
      title: 'Missing marketplace listing schema',
      description: 'Marketplace pages should have Product or Offer schema for listing visibility.',
      exampleFix: 'Add Product or Offer JSON-LD with price, availability, and seller information',
    });
  }

  // Rule MP-2: Trust/safety signals
  if (!html.includes('verified') && !html.includes('trust') && !html.includes('guarantee')) {
    issues.push({
      ruleId: 'rule-mp-trust',
      severity: 'medium',
      title: 'Missing trust and safety signals',
      description: 'Marketplace pages should display trust signals (verified sellers, buyer protection, guarantees).',
      exampleFix: 'Add trust badges, verification status, or buyer protection information',
    });
  }

  // Rule MP-3: Buyer/seller content separation
  // ... check for distinct buyer and seller sections

  return issues;
}
```

Repeat this pattern for all 13 new types with 3-5 checks each.

**Step 3: Update getWebsiteTypeRulesForBrief**

In `config/prompts/_common.ts`, ensure `getWebsiteTypeConfig()` returns valid configs for all new types. If it already covers them via `types/core.ts` WEBSITE_TYPE_CONFIG, verify the mapping works. If not, add fallback handling.

**Step 4: Write tests for 2-3 representative new types**

```typescript
describe('WebsiteTypeRuleEngine - marketplace', () => {
  it('flags missing Product/Offer schema', () => {
    const engine = new WebsiteTypeRuleEngine();
    const issues = engine.validate({
      websiteType: 'marketplace',
      html: '<div>Listing page</div>',
      schemaTypes: [],
    });
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-mp-schema' }));
  });
});
```

**Step 5: Run tests, type check, commit**

```bash
git commit -m "feat(audit): add 13 new website type validators (marketplace through nonprofit)"
```

---

## Task 10: Tier 2 Quick Fixes

**Files:**
- Modify: `services/audit/rules/InternalLinkingValidator.ts`
- Modify: `services/audit/rules/CostOfRetrievalAuditor.ts`
- Modify: `services/audit/rules/ContentFormatValidator.ts`

**Step 1: Add total links <150 cap**

In `InternalLinkingValidator.ts`, in `checkLinkVolume()` or add new method:

```typescript
// Rule: Total internal links should not exceed 150
const allLinks = this.extractInternalLinks(context.html, context.pageUrl);
if (allLinks.length > 150) {
  issues.push({
    ruleId: 'rule-link-cap-150',
    severity: 'medium',
    title: 'Excessive internal links',
    description: `Page has ${allLinks.length} internal links (recommended maximum: 150). Excessive links dilute PageRank and overwhelm crawlers.`,
    exampleFix: 'Remove low-value links, consolidate navigation, prioritize contextual links in main content',
  });
}
```

**Step 2: Add cross-destination anchor text check**

In `checkAnchorTextRepetition()`, extend to check same anchor text used >3 times regardless of destination:

```typescript
// Count anchor text usage across all destinations
const anchorCounts = new Map<string, number>();
for (const link of links) {
  const anchor = link.anchorText.toLowerCase().trim();
  if (anchor.length > 0) {
    anchorCounts.set(anchor, (anchorCounts.get(anchor) || 0) + 1);
  }
}
for (const [anchor, count] of anchorCounts) {
  if (count > 3) {
    issues.push({
      ruleId: 'rule-link-anchor-overuse',
      severity: 'medium',
      title: 'Same anchor text used too many times',
      description: `Anchor text "${anchor}" used ${count} times across different links (maximum: 3). Over-optimized anchor text can trigger algorithmic penalties.`,
      exampleFix: 'Vary anchor text for different link destinations — use synonyms and natural phrasing',
    });
  }
}
```

**Step 3: Add text-to-code ratio**

In `CostOfRetrievalAuditor.ts`, add:

```typescript
private checkTextToCodeRatio(html: string, issues: CoRIssue[]): void {
  const textContent = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const ratio = textContent.length / html.length;
  if (ratio < 0.5) {
    issues.push({
      ruleId: 'rule-cor-text-ratio',
      severity: 'low',
      title: 'Low text-to-code ratio',
      description: `Text-to-code ratio is ${Math.round(ratio * 100)}% (target: >50%). High HTML overhead increases Cost of Retrieval for both search engines and LLM crawlers.`,
      exampleFix: 'Reduce unnecessary wrapper elements, inline styles, and verbose attributes',
    });
  }
}
```

Call from `validate()` method.

**Step 4: Add summary/TL;DR detection**

In `ContentFormatValidator.ts`, add:

```typescript
private checkSummaryPresence(html: string, issues: FormatIssue[]): void {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount > 1500) {
    const first500Chars = text.slice(0, 500).toLowerCase();
    const hasSummary = /summary|tl;?dr|key takeaways|at a glance|overview|highlights/i.test(first500Chars);
    if (!hasSummary) {
      issues.push({
        ruleId: 'rule-format-summary',
        severity: 'low',
        title: 'Long content missing summary',
        description: `Page has ${wordCount} words but no summary/TL;DR in the first 500 characters. Long-form content benefits from an upfront summary for both readers and AI systems.`,
        exampleFix: 'Add a "Key Takeaways" or "TL;DR" section near the top of the page',
      });
    }
  }
}
```

**Step 5: Run tests, type check, commit**

```bash
git commit -m "feat(audit): add link cap, cross-anchor check, text-ratio, summary detection"
```

---

## Task 11: Database Persistence — visual_placement_map & discourse_anchor_sequence

**Files:**
- Create: SQL migration for 2 new JSONB columns on `content_briefs`
- Modify: Brief save logic (in `PipelineBriefsStep.tsx` or brief persistence service)

**Step 1: Create migration**

```sql
ALTER TABLE content_briefs
ADD COLUMN IF NOT EXISTS visual_placement_map JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS discourse_anchor_sequence JSONB DEFAULT '[]'::jsonb;
```

**Step 2: Update brief persistence**

In the brief save function, add `visual_placement_map` and `discourse_anchor_sequence` to the upsert column list. These fields are already generated by the enrichment phase — they just need to be persisted.

**Step 3: Update brief loading**

Verify that `select('*')` is used when loading briefs (it already is per CLAUDE.md). Confirm the component reads these fields on mount.

**Step 4: Commit**

```bash
git commit -m "feat(persistence): persist visual_placement_map and discourse_anchor_sequence"
```

---

## Task 12: Content Generation — Answer Capsule Enforcement

**Files:**
- Modify: `services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts`

**Step 1: Extend SectionPromptBuilder for answer capsule**

In the `build()` method, after the subordinate text guidance, add answer capsule enforcement if the section has an `answer_capsule` spec:

```typescript
if (section.answer_capsule) {
  prompt += `\n**ANSWER CAPSULE (FIRST PARAGRAPH)**:
Your first paragraph must be exactly ${section.answer_capsule.target_length} words (±10).
Hint: ${section.answer_capsule.text_hint}
${section.answer_capsule.required_predicates?.length ? `Must include: ${section.answer_capsule.required_predicates.join(', ')}` : ''}
This paragraph must read as a natural, compelling opening — not a keyword list.
After the capsule, add an evidence paragraph, then the depth section.`;
}
```

**Step 2: Type check and commit**

```bash
git commit -m "feat(content-gen): enforce answer capsule in section prompt builder"
```

---

## Execution Order

```
Task 1 (answer capsule types + prompt) → no dependencies
Task 2 (answer capsule quality scoring) → depends on Task 1
Task 3 (answer capsule audit validator) → no dependencies
Task 4 (chunking resistance audit validator) → no dependencies
Task 5 (chunking resistance prompts) → no dependencies
Task 6 (CoR 2.0 scorer) → depends on Tasks 3 + 4 (uses their output)
Task 7 (prompt injection defense) → no dependencies
Task 8 (AI crawl management) → no dependencies
Task 9 (website types) → no dependencies
Task 10 (tier 2 quick fixes) → no dependencies
Task 11 (DB persistence) → no dependencies
Task 12 (content gen capsule) → depends on Task 1
```

**Parallel groups:**
- Group A: Tasks 1 → 2 → 12 (answer capsule chain)
- Group B: Tasks 3, 4 → 5 → 6 (audit validators → CoR 2.0)
- Group C: Tasks 7, 8 (security validators — independent)
- Group D: Tasks 9, 10, 11 (independent quick wins)

---

## Verification Checklist

After all tasks complete:

1. `npx tsc --noEmit` — zero errors
2. `npx vitest run` — zero failures
3. Generate a brief → each H2 has answer_capsule spec
4. Run audit on any page → new validators produce findings
5. CoR 2.0 score displays on audit dashboard
6. Select new website type (e.g., marketplace) → type-specific rules execute
7. Refresh page after brief generation → visual_placement_map and discourse_anchor_sequence persist
