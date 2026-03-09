# Semantic SEO Skill Gap Remediation — Full Design

**Date:** 2026-03-09
**Status:** Approved
**Scope:** Close all gaps between application and updated semantic SEO skill (including new LLM optimization, prompt injection defense, and 13 new website types)

---

## Principle: Human Readability First

Every optimization for search engines, LLMs, and RAG systems must pass the editorial quality bar. "Would a professional editor at a quality publication approve this content?" If not, the optimization is wrong regardless of its technical score.

- Answer capsules must read as compelling opening paragraphs, not keyword-stuffed snippets
- Entity re-introduction must flow from context, not mechanical repetition
- Sections end at natural thought boundaries, not arbitrary word counts
- Dense content means well-evidenced narrative, not dry fact lists
- Links feel like helpful suggestions, not SEO artifacts

---

## Workstream 1: Answer Capsule Pattern

### Brief Structure
- Add `answer_capsule` field to `BriefSection` in types: `{ text_hint: string; target_length: number; required_predicates: string[] }`
- Each section in `structured_outline` gets an answer capsule spec

### Brief Generation
- Add answer capsule rule to `GENERATE_BRIEF_OUTLINE_PROMPT`: "For each H2 section, include an `answer_capsule` — a 40-70 word direct factual answer. No preamble. Lead with the entity name. Must read as a natural, compelling opening paragraph."
- Capsule is part of the outline skeleton (structural, not enrichment)
- Prompt must instruct variety: "Vary capsule openings — use definition, statistic, narrative, scene-setting, and question-answer approaches. Do not start every capsule with '[Entity] is...'"

### Content Generation
- Extend `SectionPromptBuilder.ts`: first paragraph must be 40-70 words, factual, containing core EAV triples
- Add variety instruction: "Vary your opening patterns across sections"

### Quality Scoring
- Add answer capsule check to Format Compliance component (existing 15% weight):
  - Has answer_capsule spec: +40 points
  - target_length in 40-70 range: +30 points
  - Has required_predicates: +30 points

### Audit
- New `AnswerCapsuleValidator.ts`:
  - First paragraph after H2: 40-70 words
  - Contains entity name
  - Uses definitive verbs (is/are/has)
  - No preamble patterns ("In this section...", "Let's explore...")
  - Variety check: flag 3+ capsules on same page starting with identical pattern
- Wire into Phase 8 (Content Format, 5% weight)

### Database
- No new column — answer_capsule lives inside `structured_outline` JSONB per section

### Files
| File | Change |
|------|--------|
| `types.ts` or `types/actionPlan.ts` | Add `answer_capsule` to BriefSection |
| `config/prompts/contentBriefs.ts` | Add answer capsule rules to outline prompt |
| `services/ai/contentGeneration/SectionPromptBuilder.ts` | Enforce capsule pattern + variety |
| `services/ai/briefQualityReview.ts` | Add capsule check to Format Compliance |
| `services/audit/rules/AnswerCapsuleValidator.ts` | **NEW** — audit validator |
| `services/audit/phases/ContentFormatPhase.ts` | Wire AnswerCapsuleValidator |

---

## Workstream 2: Chunking-Resistant Writing

### Brief Generation
- Add to `GENERATE_BRIEF_OUTLINE_PROMPT`: "Each section must be self-contained. Re-introduce the entity by name in the first sentence. No cross-section references ('as mentioned above', 'see below')."
- Add `section_length_target: 200-500` guidance per section

### Content Generation
- Extend `SectionPromptBuilder.ts`: "This section may be read in complete isolation. Do not assume the reader has seen any other section."

### Audit
- New `ChunkingResistanceValidator.ts`:
  - Forward/backward references: ~15 regex patterns ("as mentioned above", "see below", "as discussed earlier", "in the previous section", "later in this article"), severity: medium
  - Entity re-introduction: first sentence of each H2 must contain primary entity name, severity: medium
  - Section length: flag >800 words (splitting risk) or <100 words (too thin), severity: low
  - Section independence: each section contains at least one complete EAV triple, severity: medium
- Wire into Phase 5 (Contextual Flow, 15% weight)

### Quality Scoring
- Add section length check to Information Density component (existing 15% weight)
- Strengthen Contextual Flow checks with entity re-introduction validation

### Files
| File | Change |
|------|--------|
| `config/prompts/contentBriefs.ts` | Add chunking resistance rules |
| `services/ai/contentGeneration/SectionPromptBuilder.ts` | Add isolation instruction |
| `services/audit/rules/ChunkingResistanceValidator.ts` | **NEW** — audit validator |
| `services/audit/phases/ContextualFlowPhase.ts` | Wire ChunkingResistanceValidator |
| `services/ai/briefQualityReview.ts` | Add section length to Info Density |

---

## Workstream 3: CoR 2.0 Scoring Model

### New Service
- `services/ai/cor2Scorer.ts` — computes 6-factor weighted score from existing audit results

| Factor | Weight | Source |
|--------|--------|--------|
| Self-contained sections | 20% | ChunkingResistanceValidator |
| Information density | 20% | InformationDensityValidator + filler count |
| Answer capsule compliance | 15% | AnswerCapsuleValidator |
| Entity explicitness | 15% | Pronoun density checks |
| Structural clarity | 15% | Heading discourse + semantic HTML |
| Attribution integrity | 15% | Schema + author + canonical checks |

- Score range: 0-5. Target: 4.0+
- Interpretation: 4.5-5.0 fully optimized; 3.5-4.4 good; 2.5-3.4 gaps; <2.5 not optimized

### UI
- CoR 2.0 score ring next to existing audit score on dashboard
- Per-factor breakdown in tooltip
- Included in audit report exports

### No database changes — computed on-the-fly from audit results

### Files
| File | Change |
|------|--------|
| `services/ai/cor2Scorer.ts` | **NEW** — scoring service |
| `components/audit/UnifiedAuditDashboard.tsx` | Add CoR 2.0 score display |
| `services/audit/AuditReportExporter.ts` | Include CoR 2.0 in exports |

---

## Workstream 4: Prompt Injection Defense & AI Crawl Management

### Prompt Injection Defense
- New `PromptInjectionDefenseValidator.ts`:
  - Hidden text via CSS (display:none, visibility:hidden, opacity:0): high severity
  - Zero-width Unicode characters (U+200B-U+200F, U+FEFF, U+2060): high severity
  - Color camouflage (foreground ≈ background from inline styles): medium severity
  - Off-screen positioning (extreme negative offsets): medium severity
  - Tiny font (<6px): medium severity
  - Editorial/UGC separation (article/main vs aside for UGC): medium severity
- Wire into Phase 9 (HTML Technical, 7% weight)

### AI Crawl Management
- New `AiCrawlManagementValidator.ts`:
  - AI crawler policy check: parse robots.txt for GPTBot, ClaudeBot, Google-Extended, CCBot, PerplexityBot, Bytespider, ChatGPT-User — report which addressed: low severity (informational)
  - AI meta tags: check for noai/noimageai in robots meta: low severity
  - Training vs retrieval distinction: report whether robots.txt separates training crawlers from retrieval crawlers: low severity
- Wire into Phase 12 (URL Architecture, 3% weight)

### Files
| File | Change |
|------|--------|
| `services/audit/rules/PromptInjectionDefenseValidator.ts` | **NEW** |
| `services/audit/rules/AiCrawlManagementValidator.ts` | **NEW** |
| `services/audit/phases/HtmlTechnicalPhase.ts` | Wire injection validator |
| `services/audit/phases/UrlArchitecturePhase.ts` | Wire AI crawl validator |

---

## Workstream 5: New Website Types (13 additions)

All additions go into existing `WebsiteTypeRuleEngine.ts` as configuration objects. No new architecture.

### Group A: Commercial/Transactional
- **Marketplace**: buyer/seller content separation, listing schema, trust/safety signals (3-5 checks)
- **Events/Ticketing**: Event schema, temporal urgency, venue/performer entities, availability (3-5 checks)

### Group B: Lead Generation/Local
- **Lead Generation/Local**: funnel stage content, form placement, testimonial-CTA proximity (3-5 checks)
- **Real Estate**: property listing schema, neighborhood content, price/sqft attributes (3-5 checks)
- **Healthcare**: YMYL compliance, medical disclaimers, credential verification (3-5 checks)
- **Hospitality/Travel**: booking flow, seasonal markers, location schema (3-5 checks)

### Group C: Content/Informational
- **Affiliate/Review**: comparison methodology, affiliate disclosure, product schema (3-5 checks)
- **News/Media**: NewsArticle schema, timestamp freshness, source citation density (3-5 checks)
- **Education/Course**: Course schema, learning outcomes, curriculum structure (3-5 checks)

### Group D: Specialized/Niche
- **Recruitment/Job**: JobPosting schema, salary transparency (3-4 checks)
- **Directory/Listing**: listing completeness, category taxonomy (3-4 checks)
- **Community/Forum**: DiscussionForumPosting schema, UGC quality (3-4 checks)
- **Nonprofit/Charity**: NGO schema, impact reporting, transparency (3-4 checks)

### Also update
- `config/prompts/contentBriefs.ts` — extend `getWebsiteTypeRulesForBrief()` for new types
- `types.ts` — add new website type enum values

### Files
| File | Change |
|------|--------|
| `services/audit/rules/WebsiteTypeRuleEngine.ts` | Add 13 type configs (~40-65 new rules) |
| `config/prompts/contentBriefs.ts` | Extend brief prompt type guidance |
| `types.ts` | Add website type enum values |

---

## Workstream 6: Tier 2 Quick Fixes

### 6a. Total links <150 cap
- `InternalLinkingValidator.ts`: count all `<a>` tags, flag if >150. Medium severity.

### 6b. Text-to-code ratio
- `CostOfRetrievalAuditor.ts`: visible text length / total HTML length, flag if <50%. Low severity.

### 6c. Summary/TL;DR for long content
- `ContentFormatValidator.ts`: if >1500 words, check for summary/TL;DR in first 500 chars. Low severity.

### 6d. Max 3 same anchor text cross-destination
- `InternalLinkingValidator.ts`: extend check #23 to flag same anchor text used >3 times regardless of destination. Medium severity.

### 6e. visual_placement_map DB persistence
- Add JSONB column to `content_briefs`
- Update save/load logic in brief persistence

### 6f. discourse_anchor_sequence DB persistence
- Add JSONB column to `content_briefs`
- Update save/load logic in brief persistence

### Files
| File | Change |
|------|--------|
| `services/audit/rules/InternalLinkingValidator.ts` | Add link cap + cross-destination anchor check |
| `services/audit/rules/CostOfRetrievalAuditor.ts` | Add text-to-code ratio |
| `services/audit/rules/ContentFormatValidator.ts` | Add summary detection |
| Brief persistence service | Persist visual_placement_map + discourse_anchor_sequence |
| SQL migration | Add 2 JSONB columns to content_briefs |

---

## Execution Order

```
Workstream 2 (Chunking Resistance) ──→ foundation for CoR 2.0
  ↓
Workstream 1 (Answer Capsules) ──→ foundation for CoR 2.0
  ↓
Workstream 3 (CoR 2.0 Score) ──→ depends on validators from 1+2
  ↓
Workstream 4 (Injection + AI Crawl) ──→ independent, can parallel with 3
  ↓
Workstream 5 (Website Types) ──→ independent, can parallel with 3+4
  ↓
Workstream 6 (Tier 2 Quick Fixes) ──→ independent, can parallel with all
```

Workstreams 4, 5, 6 are independent and can run in parallel.

---

## Verification

1. **Answer capsules**: Generate a brief → each H2 section has answer_capsule spec → content generation produces 40-70 word opening paragraphs with variety
2. **Chunking resistance**: Audit a page → no forward/backward references flagged → entity named in first sentence of each section
3. **CoR 2.0**: Run audit → CoR 2.0 score appears alongside overall score → per-factor breakdown visible
4. **Prompt injection**: Audit a page with hidden text → findings detected with high severity
5. **AI crawl**: Audit a site → robots.txt AI crawler coverage reported
6. **Website types**: Select "marketplace" type → type-specific audit rules execute → brief prompt includes marketplace guidance
7. **Tier 2**: Total links >150 flagged, text-to-code ratio reported, visual_placement_map persists across refresh
8. **Human readability**: Answer capsules read naturally, no mechanical patterns, variety across sections
9. **TypeScript**: `npx tsc --noEmit` — zero errors
10. **Tests**: `npx vitest run` — zero failures
