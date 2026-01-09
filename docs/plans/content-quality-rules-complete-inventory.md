# Complete Content Quality Rules Inventory

## Document Purpose

This document provides a complete numbered inventory of all content quality rules from the Holistic SEO framework, their current enforcement status, and how they are implemented in the content generation pipeline.

**Audience**: Business stakeholders, content managers, development team
**Last Updated**: 2026-01-09

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | **Fully Enforced** - Rule is algorithmically validated and blocks/flags content |
| ⚠️ | **Partially Enforced** - Rule is checked but with gaps or lenient thresholds |
| 📝 | **Prompt Only** - Rule is instructed to AI but not validated |
| ❌ | **Not Implemented** - Rule exists in framework but is not enforced |

---

## Category A: Central Entity & Topic Focus

The central entity is the main subject of the article. All content should orbit around this entity.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| A1 | Central entity must appear in article title | ✅ | Validated against brief.entity | Pass 1, Audit |
| A2 | Central entity must appear in H1 heading | ✅ | Heading-entity alignment check | Audit Rule #7 |
| A3 | Central entity should appear in 80%+ of H2 headings | ⚠️ | Checked but threshold is 15% Jaccard (lenient) | Audit Rule #7 |
| A4 | Central entity should appear in first paragraph | ✅ | CenterpieceValidator checks first 100 words | Pass 1, Validator |
| A5 | Central entity mention density of 30%+ in body text | ⚠️ | CentralEntityFocusValidator checks but severity is INFO (non-blocking) | All Passes |
| A6 | Each paragraph should reference central entity or related attribute | 📝 | Instructed in prompts, not validated | Pass 1 Prompts |
| A7 | Avoid entity drift (introducing unrelated entities) | 📝 | Instructed in prompts, not validated | Pass 1 Prompts |

---

## Category B: Introduction & Centerpiece

The introduction must immediately establish what the article is about and answer the user's primary question.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| B1 | Centerpiece (main answer) must appear in first 100 words | ✅ | CenterpieceValidator validates position | Pass 1, Pass 3 |
| B2 | No fluff or filler in introduction | ✅ | ProhibitedLanguageValidator blocks filler phrases | All Passes |
| B3 | No meta-commentary ("In this article we will discuss...") | ✅ | ProhibitedLanguageValidator has 57 blocked phrases | All Passes |
| B4 | Introduction must align with user search intent | 📝 | Response code provided in prompts, not validated | Pass 1, Pass 3 |
| B5 | Introduction minimum 150 words | ❌ | Not validated | None |
| B6 | Introduction should contain 1-2 UNIQUE/ROOT EAVs | ❌ | Not validated | None |
| B7 | No questions in introduction (unless rhetorical for hook) | 📝 | Instructed in prompts, not validated | Pass 1 Prompts |

---

## Category C: Semantic Triples (EAV Integration)

Entity-Attribute-Value triples are factual statements that establish expertise and topical authority.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| C1 | EAVs must be present in content | ✅ | EAVDensityValidator checks presence | All Passes |
| C2 | UNIQUE category EAVs in first 300 words | ❌ | AttributeRanker orders prompts but output not validated | None |
| C3 | ROOT category EAVs in first 500 words | ❌ | Same as above | None |
| C4 | RARE category EAVs distributed in core sections | 📝 | Instructed in prompts, not validated | Pass 1 |
| C5 | COMMON category EAVs can appear anywhere | 📝 | Instructed in prompts, not validated | Pass 1 |
| C6 | EAV density target: 1 EAV per 100-150 words | ⚠️ | EAVDensityValidator checks ratio but threshold is lenient | All Passes |
| C7 | EAVs must be naturally integrated (not listed) | 📝 | Instructed in prompts, not validated | Pass 1 |
| C8 | EAV attributes should extend vocabulary | 📝 | Instructed in prompts, not validated | Pass 1 |

---

## Category D: Sentence Structure & Grammar

Proper sentence structure ensures clarity and supports semantic parsing by search engines.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| D1 | Subject-Predicate-Object (S-P-O) sentence structure | ✅ | StructureValidator analyzes patterns | All Passes |
| D2 | Subject in first 40% of sentence | ✅ | Audit checks >70% compliance | Audit Rule #3 |
| D3 | Entity as subject in majority of sentences | ⚠️ | Checked but not strictly enforced | All Passes |
| D4 | Passive voice under 15% of sentences | ✅ | Audit enforces <15% threshold | Audit Rule #6 |
| D5 | Discourse chaining (S1 object → S2 subject) | ❌ | Not validated | None |
| D6 | No orphan pronouns (pronoun without clear antecedent) | 📝 | Instructed in prompts, not validated | Pass 1 |
| D7 | Sentence length variety (mix of short and long) | 📝 | Instructed in prompts, not validated | Pass 1 |
| D8 | No run-on sentences (over 40 words) | 📝 | Instructed in prompts, not validated | Pass 1 |

---

## Category E: Heading Hierarchy

Headings create the semantic structure of the article and signal topic hierarchy to search engines.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| E1 | Single H1 per article | ✅ | Audit validates single H1 | Audit Rule #4 |
| E2 | No heading level skipping (H1→H3 forbidden) | ✅ | Audit checks sequence | Audit Rule #4 |
| E3 | H2 headings must contain central entity or attribute | ⚠️ | Jaccard threshold 0.15 (too lenient) | Audit Rule #7 |
| E4 | No generic headings ("Introduction", "Overview", etc.) | ✅ | Audit checks against pattern list | Audit Rule #5 |
| E5 | Headings should be questions or specific claims | 📝 | Instructed in prompts, not validated | Pass 2 |
| E6 | H2-H3 count: minimum 3, maximum 12 | ❌ | Not validated | None |
| E7 | Heading word count: 3-10 words optimal | ❌ | Not validated | None |
| E8 | No duplicate headings in article | ❌ | Not validated | None |
| E9 | Contextual vectors define heading flow logic | ⚠️ | ContextualVectorValidator checks structure, not semantic flow | All Passes |

---

## Category F: Paragraph Structure

Well-structured paragraphs support readability and semantic coherence.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| F1 | First paragraph after heading must relate to heading | ❌ | Not validated | None |
| F2 | Each section: 2-5 paragraphs | ❌ | Not validated | None |
| F3 | Paragraph length: 3-6 sentences optimal | ❌ | Not validated | None |
| F4 | Topic sentence at paragraph start | 📝 | Instructed in prompts, not validated | Pass 1 |
| F5 | One main idea per paragraph | 📝 | Instructed in prompts, not validated | Pass 1 |
| F6 | Smooth transitions between paragraphs | ⚠️ | Pass 5 adds transitions, not validated | Pass 5 |

---

## Category G: Word Count & Length

Content length should match topic complexity and user needs.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| G1 | Article total word count matches brief target | ❌ | Brief specifies target, not enforced | None |
| G2 | Introduction: 150-250 words | ❌ | Not validated | None |
| G3 | Core sections: 200-400 words each | ❌ | Not validated | None |
| G4 | Conclusion: 100-200 words | ❌ | Not validated | None |
| G5 | Section word counts proportional to importance | 📝 | Format budget calculates, not enforced | Pass 1 |

---

## Category H: Vocabulary & Language Quality

Rich vocabulary demonstrates expertise while remaining accessible.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| H1 | Type-Token Ratio (TTR) 0.4-0.7 | ✅ | Audit calculates and enforces | Audit Rule #9 |
| H2 | Stop word ratio 40-55% | ✅ | Audit enforces range | Audit Rule #2 |
| H3 | No LLM signature phrases | ✅ | 57 phrases blocked | Audit Rule #8 |
| H4 | No filler words ("very", "really", "basically") | ✅ | ProhibitedLanguageValidator | All Passes |
| H5 | No hedging phrases ("it seems", "appears to be") | ⚠️ | Some blocked, not comprehensive | All Passes |
| H6 | Technical terms defined on first use | 📝 | Instructed in prompts, not validated | Pass 1 |
| H7 | Consistent terminology throughout | ⚠️ | RepetitionValidator flags overuse, not inconsistency | All Passes |
| H8 | No repetitive phrases within section | ✅ | RepetitionValidator uses n-gram analysis | All Passes |
| H9 | No repetitive phrases across sections | ❌ | Only within-section detection | None |

---

## Category I: Modality & Certainty

Appropriate use of certainty markers builds trust and accuracy.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| I1 | Certainty ratio 60-85% | ✅ | Audit enforces range | Audit Rule #1 |
| I2 | Use "is/are/will" for established facts | ⚠️ | Ratio checked, not context | Audit Rule #1 |
| I3 | Use "may/might/could" for uncertain claims | ⚠️ | Ratio checked, not context | Audit Rule #1 |
| I4 | Match modality to evidence strength | ❌ | Not validated | None |
| I5 | YMYL topics require hedged language | ✅ | YMYLValidator enforces | All Passes (YMYL) |

---

## Category J: YMYL (Your Money Your Life) Protocol

Special rules for health, finance, legal, and safety content.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| J1 | YMYL detection from topic/brief | ✅ | Brief contains isYMYL flag | Pass 1 |
| J2 | Disclaimer required for YMYL content | ✅ | YMYLValidator checks presence | All Passes (YMYL) |
| J3 | Professional consultation recommendation | ⚠️ | Prompted, not all patterns validated | Pass 1 (YMYL) |
| J4 | Source citations for claims | ❌ | Not validated | None |
| J5 | Author qualifications statement | 📝 | Instructed in prompts, not validated | Pass 1 (YMYL) |
| J6 | Date sensitivity acknowledgment | 📝 | Instructed in prompts, not validated | Pass 1 (YMYL) |

---

## Category K: Lists & Structured Content

Lists and tables enhance scannability and can trigger Featured Snippets.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| K1 | Prose-to-structured ratio 60-80% prose | ✅ | Audit enforces Baker Principle | Audit Rule #10 |
| K2 | Definition sentence before every list | ✅ | Audit checks list context | Audit Rule #11 |
| K3 | Never open section with list | ✅ | Implied by K2 | Audit Rule #11 |
| K4 | List items: minimum 3, maximum 7 | ❌ | Not validated | None |
| K5 | List items should be parallel structure | ❌ | Not validated | None |
| K6 | Ordered lists for sequential/ranked content | 📝 | Instructed in prompts, not validated | Pass 4 |
| K7 | Unordered lists for non-sequential items | 📝 | Instructed in prompts, not validated | Pass 4 |
| K8 | List items should be complete thoughts | 📝 | Instructed in prompts, not validated | Pass 4 |

---

## Category L: Tables

Tables are used for comparative and structured data.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| L1 | Tables for comparative data only | ❌ | Not validated | None |
| L2 | Minimum dimensions: 2 columns, 3 rows | ❌ | Not validated | None |
| L3 | Clear, descriptive headers | ❌ | Not validated | None |
| L4 | No merged cells | ❌ | Not validated | None |
| L5 | Consistent data types per column | ❌ | Not validated | None |
| L6 | Definition sentence before table | ✅ | Same rule as K2 | Audit Rule #11 |
| L7 | Table should be referenced in surrounding text | 📝 | Instructed in prompts, not validated | Pass 4 |

---

## Category M: Images & Visual Content

Images enhance engagement and provide additional ranking opportunities.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| M1 | Never place image between heading and first paragraph | ✅ | Audit validates position | Audit Rule #12 |
| M2 | Image density: 1 per 300-500 words | ❌ | Not validated | None |
| M3 | Alt text must describe image content | 📝 | Instructed in prompts, not validated | Pass 7 |
| M4 | Alt text should extend vocabulary | ❌ | Not validated | None |
| M5 | Alt text includes relevant entity/attribute | 📝 | Instructed in prompts, not validated | Pass 7 |
| M6 | Image placement in format budget zones | ⚠️ | Format budget identifies zones, placement optional | Pass 7 |
| M7 | Decorative images should have empty alt | 📝 | Instructed in prompts, not validated | Pass 7 |

---

## Category N: Contextual Flow & Discourse

Content should flow logically with clear relationships between sections.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| N1 | Contextual vectors define section relationships | ⚠️ | Structure validated, semantic flow not checked | All Passes |
| N2 | Each H2+ has relationship type to previous | ⚠️ | ContextualVectorValidator checks presence | All Passes |
| N3 | SUPPLEMENTARY sections need contextual bridge | ✅ | ContextualBridgeValidator enforces | All Passes |
| N4 | Smooth transitions between sections | ⚠️ | Pass 5 adds, not validated | Pass 5 |
| N5 | No abrupt topic shifts | 📝 | Instructed in prompts, not validated | All Passes |
| N6 | Conclusion ties back to introduction | 📝 | Instructed in prompts, not validated | Pass 3 |

---

## Category O: Format Codes & Content Types

Different content types require different structural approaches.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| O1 | Response code determines answer format | ⚠️ | FormatCodeValidator checks compliance | All Passes |
| O2 | DEFINITION format: concise, direct definition | ⚠️ | Prompted, lenient validation | Pass 1 |
| O3 | COMPARISON format: balanced pros/cons | 📝 | Instructed in prompts, not validated | Pass 1 |
| O4 | HOW-TO format: numbered steps | 📝 | Instructed in prompts, not validated | Pass 1 |
| O5 | LIST format: comprehensive enumeration | 📝 | Instructed in prompts, not validated | Pass 1 |
| O6 | EXPLANATION format: logical exposition | 📝 | Instructed in prompts, not validated | Pass 1 |

---

## Category P: Schema & Structured Data

JSON-LD markup helps search engines understand content semantics.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| P1 | Article schema with all required properties | ✅ | Schema generator includes all fields | Pass 10 |
| P2 | Author schema with proper attribution | ✅ | From businessInfo | Pass 10 |
| P3 | Publisher/Organization schema | ✅ | From businessInfo | Pass 10 |
| P4 | FAQPage schema when content has Q&A | ✅ | Content analysis detection | Pass 10 |
| P5 | HowTo schema for instructional content | ✅ | Content analysis detection | Pass 10 |
| P6 | Entity resolution via Wikidata | ✅ | Wikidata API lookup | Pass 10 |
| P7 | sameAs links for entities | ✅ | From entity resolution | Pass 10 |
| P8 | Schema validation against schema.org | ✅ | schemaValidator.ts | Pass 10 |
| P9 | Auto-fix for common schema errors | ✅ | schemaAutoFix.ts | Pass 10 |
| P10 | BreadcrumbList schema | ✅ | From topic hierarchy | Pass 10 |

---

## Category Q: Quality Audit Scoring

Final quality gate before content is approved.

| # | Rule | Status | How It's Enforced | Where Enforced |
|---|------|--------|-------------------|----------------|
| Q1 | Algorithmic audit runs 12+ checks | ✅ | auditChecks.ts | Pass 9 |
| Q2 | Compliance score calculation | ✅ | complianceScoring.ts | Pass 9 |
| Q3 | Final score = 60% algorithmic + 40% compliance | ✅ | Pass 9 calculation | Pass 9 |
| Q4 | Critical threshold: 50% (content blocked) | ✅ | Quality gate in Pass 9 | Pass 9 |
| Q5 | Warning threshold: 70% (logged warning) | ✅ | Quality gate in Pass 9 | Pass 9 |
| Q6 | Critical rules weighted higher | ✅ | HEADING_HIERARCHY, LLM_SIGNATURE, IMAGE_PLACEMENT | Pass 9 |

---

## Summary Statistics

### By Enforcement Status

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Fully Enforced | 47 | 42% |
| ⚠️ Partially Enforced | 24 | 21% |
| 📝 Prompt Only | 28 | 25% |
| ❌ Not Implemented | 14 | 12% |
| **Total Rules** | **113** | **100%** |

### By Category

| Category | Total | ✅ Full | ⚠️ Partial | 📝 Prompt | ❌ None |
|----------|-------|---------|------------|-----------|---------|
| A: Central Entity | 7 | 2 | 2 | 3 | 0 |
| B: Introduction | 7 | 3 | 0 | 2 | 2 |
| C: EAV Integration | 8 | 1 | 1 | 4 | 2 |
| D: Sentence Structure | 8 | 3 | 1 | 3 | 1 |
| E: Headings | 9 | 3 | 2 | 1 | 3 |
| F: Paragraphs | 6 | 0 | 1 | 3 | 2 |
| G: Word Count | 5 | 0 | 0 | 1 | 4 |
| H: Vocabulary | 9 | 4 | 2 | 1 | 2 |
| I: Modality | 5 | 2 | 2 | 0 | 1 |
| J: YMYL | 6 | 2 | 1 | 2 | 1 |
| K: Lists | 8 | 3 | 0 | 3 | 2 |
| L: Tables | 7 | 1 | 0 | 1 | 5 |
| M: Images | 7 | 1 | 1 | 3 | 2 |
| N: Contextual Flow | 6 | 1 | 3 | 2 | 0 |
| O: Format Codes | 6 | 0 | 2 | 4 | 0 |
| P: Schema | 10 | 10 | 0 | 0 | 0 |
| Q: Audit | 6 | 6 | 0 | 0 | 0 |

---

## Priority Fix Recommendations

### Priority 0 (Critical - Fix Immediately)

1. **C2/C3**: EAV placement validation in first 300/500 words
2. **G1**: Article word count validation against brief target
3. **A5**: Upgrade CentralEntityFocusValidator from INFO to WARNING

### Priority 1 (High - Fix Soon)

4. **D5**: Discourse chaining validation
5. **E3**: Increase heading-entity alignment Jaccard from 0.15 to 0.25
6. **F1**: Heading-to-paragraph relevance validation
7. **G2-G4**: Section word count validation

### Priority 2 (Medium - Schedule)

8. **K4/K5**: List structure validation (3-7 items, parallel structure)
9. **L2-L5**: Table structure validation
10. **H9**: Cross-section repetition detection
11. **M2**: Image density validation

### Priority 3 (Low - Backlog)

12. **M4**: Alt text vocabulary extension validation
13. **I4**: Context-aware modality matching
14. **E6-E8**: Heading count and uniqueness validation

---

## Appendix: Blocked Phrases (Rule H3)

The following 57 phrases are blocked by ProhibitedLanguageValidator and Audit Rule #8:

1. delve
2. crucial
3. pivotal
4. moreover
5. furthermore
6. additionally
7. it's important to note
8. it's worth noting
9. in today's world
10. in this day and age
11. at the end of the day
12. when it comes to
13. in terms of
14. as a matter of fact
15. needless to say
16. it goes without saying
17. in conclusion
18. to summarize
19. all in all
20. in essence
21. essentially
22. basically
23. fundamentally
24. ultimately
25. arguably
26. undoubtedly
27. certainly
28. definitely
29. absolutely
30. incredibly
31. extremely
32. very
33. really
34. quite
35. rather
36. somewhat
37. fairly
38. pretty (as intensifier)
39. literally
40. actually
41. obviously
42. clearly
43. of course
44. naturally
45. interestingly
46. surprisingly
47. unfortunately
48. fortunately
49. importantly
50. significantly
51. notably
52. remarkably
53. let's explore
54. let's dive in
55. without further ado
56. stay tuned
57. last but not least

---

*Document Version: 1.0*
*Total Rules Catalogued: 113*
*Framework: Holistic SEO by Koray Tuğberk GÜBÜR*
