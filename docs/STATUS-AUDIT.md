# STATUS-AUDIT.md -- Unified Content Audit System

**Last updated:** 2026-02-13
**System version:** 1 (as defined in `UnifiedAuditReport.version`)

---

## 1. System Overview

The Unified Content Audit system is a 15-phase, penalty-based content audit engine implementing the Holistic SEO audit checklist. It analyzes published or draft content across strategic, semantic, technical, and performance dimensions, producing a weighted overall score (0--100) with per-phase breakdowns, actionable findings, and export capabilities.

**Key characteristics:**
- 15 audit phases, 13 weighted (summing to 100%) + 2 bonus phases
- 35 standalone rule validators
- Penalty-based scoring: critical=15, high=8, medium=4, low=1
- Multi-provider content fetching (Jina, Firecrawl, with fallback chains)
- TopicalMapContext injection enriching all phases with project-level SEO data
- i18n support for 5 languages (EN, NL, DE, FR, ES)
- Multi-format export: CSV, HTML, JSON, XLSX, batch ZIP
- Supabase persistence with snapshot history
- GSC and GA4 performance correlation

---

## 2. Architecture

### 2.1 Component Table

| Component | File | Role |
|---|---|---|
| **Orchestrator** | `services/audit/UnifiedAuditOrchestrator.ts` | Facade coordinating content fetch, URL discovery, phase execution, scoring, snapshot persistence |
| **AuditPhase (abstract)** | `services/audit/phases/AuditPhase.ts` | Base class with `execute()`, `buildResult()`, `createFinding()`, severity penalties |
| **15 Phase Adapters** | `services/audit/phases/*.ts` | Concrete phase implementations wiring rule validators |
| **35 Rule Validators** | `services/audit/rules/*.ts` | Standalone validators with `validate()` methods |
| **ContentFetcher** | `services/audit/ContentFetcher.ts` | Multi-provider HTML/text fetching with fallback chain |
| **RelatedUrlDiscoverer** | `services/audit/RelatedUrlDiscoverer.ts` | Sitemap parsing and sibling URL discovery |
| **AuditSnapshotService** | `services/audit/AuditSnapshotService.ts` | Supabase persistence layer |
| **AuditReportExporter** | `services/audit/AuditReportExporter.ts` | CSV, HTML, JSON, XLSX (ExcelJS), batch ZIP (JSZip) |
| **PerformanceCorrelator** | `services/audit/PerformanceCorrelator.ts` | Pearson correlation, lagged correlation, insight generation |
| **FactValidator** | `services/audit/FactValidator.ts` | Claim extraction and pluggable verification |
| **GscApiAdapter** | `services/audit/adapters/GscApiAdapter.ts` | Google Search Console integration |
| **Ga4ApiAdapter** | `services/audit/adapters/Ga4ApiAdapter.ts` | Google Analytics 4 integration |
| **LanguageSpecificRules** | `services/audit/rules/LanguageSpecificRules.ts` | Stop word sets for EN/NL/DE/FR/ES |
| **Types** | `services/audit/types.ts` | Core type definitions for entire system |

### 2.2 Scoring System

```
Phase Score = max(0, 100 - SUM(severity_penalties_for_all_findings))

Severity Penalties:
  critical = 15
  high     = 8
  medium   = 4
  low      = 1

Overall Score = weighted_average(phase_scores, phase_weights)
```

### 2.3 Default Weight Configuration

From `services/audit/types.ts` -> `DEFAULT_AUDIT_WEIGHTS`:

| Phase | Weight |
|---|---|
| Strategic Foundation | 10% |
| EAV System | 15% |
| Micro-Semantics | 13% |
| Information Density | 8% |
| Contextual Flow | 15% |
| Internal Linking | 10% |
| Semantic Distance | 3% |
| Content Format | 5% |
| HTML Technical | 7% |
| Meta & Structured Data | 5% |
| Cost of Retrieval | 4% |
| URL Architecture | 3% |
| Cross-Page Consistency | 2% |
| Website Type Specific | **bonus** |
| Fact Validation | **bonus** |

### 2.4 Data Flow

```
AuditRequest
    |
    v
UnifiedAuditOrchestrator.runAudit()
    |
    +-- ContentFetcher.fetch(url, provider)  --> FetchedContent
    |
    +-- RelatedUrlDiscoverer.discover(url)   --> relatedUrls[]
    |
    +-- enrichContent(fetchedContent + TopicalMapContext)
    |
    +-- for each phase in phases[]:
    |       phase.execute(request, enrichedContent)
    |       --> AuditPhaseResult { score, findings[] }
    |
    +-- calculateWeightedScore(phaseResults)
    +-- extractCannibalizationRisks(phaseResults)
    +-- detectMergeSuggestions(phaseResults)
    +-- detectMissingKgTopics(phaseResults)
    |
    +-- AuditSnapshotService.saveSnapshot(report) [if Supabase available]
    |
    v
UnifiedAuditReport
```

---

## 3. Phase-by-Phase Status

### Phase 1: Strategic Foundation (10%)

**Phase name:** `strategicFoundation`
**File:** `services/audit/phases/StrategicFoundationPhase.ts`
**Status:** Partially implemented

**Wired validators:**

| Validator | Rules | Status |
|---|---|---|
| `SourceContextAligner` | 6-ce, 6-business, 6-keywords, 6-attributes | Implemented: CE presence, business/industry alignment, keyword coverage (>50%), attribute coverage (>30%) |
| `CentralEntityPositionChecker` | 4, 5, 7, 8, 11 | Implemented: CE in first sentence, first 2 sentences, SC attribute coverage (>50%), CS/AS classification, CSI predicate coverage (>30%) |
| `AuthorEntityChecker` | 17, 19 | Implemented: Author schema markup, author bio presence |
| `ContextQualifierDetector` | 85-93 | Implemented: Temporal, spatial, conditional qualifier detection |

**Dormant code:** `transformCeIssues()` method exists but is never called from `execute()`. It transforms `centralEntityAnalyzer` results into findings but is not wired into the execution path.

**Gaps:**
- Header comment says "Future sprints will add SC/CSI alignment, E-E-A-T signals, AI pattern detection"
- Rules 1-3, 9-10, 12-16, 18, 20-32 not yet covered
- `centralEntityAnalyzer` service is imported but only used via the dormant `transformCeIssues()` method

---

### Phase 2: EAV System (15%)

**Phase name:** `eavSystem`
**File:** `services/audit/phases/EavSystemPhase.ts`
**Status:** Partially implemented

**Wired validators:**

| Validator | Rules | Status |
|---|---|---|
| `EavTextValidator` | 33, 37, 40, 45 | Implemented: Triple coverage, pronoun overuse, quantitative values missing units, root attribute completeness |

**Dormant code:** `transformEavInconsistencies()` method exists but is never called from `execute()`. The `eavAudit.ts` service (`auditEavs`, `auditBriefEavConsistency`) is imported at file top but never invoked in the execution path.

**Gaps:**
- Rules 34-36, 38-39, 41-44, 46-56 not covered
- `auditEavs()` and `auditBriefEavConsistency()` services exist and are imported but not called
- The phase docblock describes calling these services but `execute()` only uses `EavTextValidator`

---

### Phase 3: Micro-Semantics (13%)

**Phase name:** `microSemantics`
**File:** `services/audit/phases/ContentQualityPhase.ts`
**Status:** Partially implemented

**Wired validators:**

| Validator | Rules | Status |
|---|---|---|
| `MicroSemanticsValidator` | 57, 58, 61, 73 | Implemented: Modality checks (57, 58), predicate specificity (61), SPO patterns (73) |

**Dormant code:** `transformAuditRuleResults()` method exists but is never called from `execute()`. It transforms Pass 8 `AuditRuleResult[]` (from content generation audit) into audit findings.

**Gaps:**
- Rules 59-60, 62-72, 74-84 not covered
- Pass 8 integration (35 algorithmic content checks) is wired via transform method but not called

---

### Phase 4: Information Density (8%)

**Phase name:** `informationDensity`
**File:** `services/audit/phases/InformationDensityPhase.ts`
**Status:** Well implemented

**Wired validators:**

| Validator | Rules | Status |
|---|---|---|
| `InformationDensityValidator` | 94, 95, 96, 98 | Implemented: Redundancy (Jaccard similarity), filler paragraphs, vague statements, preamble detection |
| `FillerReplacementAdvisor` | 100-112 | Implemented: 13 specific filler patterns with concrete replacement suggestions |

**Gaps:**
- Rules 97, 99 not covered (minor)
- Overall this is one of the most complete phases

---

### Phase 5: Contextual Flow (15%)

**Phase name:** `contextualFlow`
**File:** `services/audit/phases/ContextualFlowPhase.ts`
**Status:** Well implemented

**Wired validators:**

| Validator | Rules | Status |
|---|---|---|
| `ContentObstructionChecker` | 122-128 | Implemented: CTA obstruction, ad placement, popup detection |
| `ContextualFlowValidator` | 113-121 | Implemented: Transition presence, paragraph flow, topic drift |
| `HeadingAndDiscourseValidator` | 129-140 | Implemented: Heading hierarchy, discourse markers, section length |
| `ContextualBridgeDetector` | 141-161 | Implemented: Contextual bridge presence, bridge quality |

Plus an inline check (rule 113) for centerpiece text presence.

**Gaps:** Minimal. One of the most complete phases.

---

### Phase 6: Internal Linking (10%)

**Phase name:** `internalLinking`
**File:** `services/audit/phases/LinkStructurePhase.ts`
**Status:** Partially implemented

**Wired validators:**

| Validator | Rules | Status |
|---|---|---|
| `InternalLinkingValidator` | 162-165, 169, 171-172, 174, 177-179, 181, 184 | Implemented: Anchor text quality, link placement, annotation text, volume checks |
| `ExternalDataRuleEngine` | 186-194 | Implemented: Navigation structure, breadcrumb, jump links, GSC/citation checks |

**Dormant code:** `transformLinkingIssues()` method exists but is never called from `execute()`. The `runLinkingAudit()` function from `linkingAudit.ts` is imported but not invoked.

**Gaps:**
- Rules 166-168, 170, 173, 175-176, 180, 182-183, 185, 195+ not covered
- The full linking audit service (`linkingAudit.ts`) is available but not integrated

---

### Phase 7: Semantic Distance (3%)

**Phase name:** `semanticDistance`
**File:** `services/audit/phases/SemanticDistancePhase.ts`
**Status:** Implemented

**Wired validators:**

| Validator | Rules | Status |
|---|---|---|
| `SemanticDistanceAuditor` | 200-210 | Implemented: Jaccard similarity-based cannibalization detection |

**Note:** Uses Jaccard similarity, not the cosine-similarity formula defined in `lib/knowledgeGraph.ts`. The knowledge graph module uses `1 - (CosineSimilarity x ContextWeight x CoOccurrence)` but the audit uses word-level Jaccard overlap as a simpler proxy.

---

### Phase 8: Content Format (5%)

**Phase name:** `contentFormat`
**File:** `services/audit/phases/ContentFormatPhase.ts`
**Status:** Implemented

**Wired validators:**

| Validator | Rules | Status |
|---|---|---|
| `ContentFormatValidator` | 220-224 | Implemented: List presence, table presence, visual hierarchy, heading density |
| `ContentFormattingExtended` | 225-240 | Implemented: Code blocks, blockquotes, featured snippet optimization |

---

### Phase 9: HTML Technical (7%)

**Phase name:** `htmlTechnical`
**File:** `services/audit/phases/HtmlTechnicalPhase.ts`
**Status:** Well implemented

**Wired validators:**

| Validator | Rules | Status |
|---|---|---|
| `HtmlNestingValidator` | 250-258 | Implemented: Heading nesting, list nesting, semantic element nesting |
| `HtmlTechnicalValidator` | 260-270 | Implemented: Deprecated tags, inline styles, accessibility attrs |
| `HtmlStructureExtendedValidator` | 271-285 | Implemented: ARIA landmarks, form labels, table headers, semantic elements |
| `ImageMetadataValidator` | 286-290 | Implemented: Alt text quality, image dimensions, lazy loading |

Plus an inline check for empty alt text attributes.

---

### Phase 10: Meta & Structured Data (5%)

**Phase name:** `metaStructuredData`
**File:** `services/audit/phases/MetaStructuredDataPhase.ts`
**Status:** Implemented

**Wired validators:**

| Validator | Rules | Status |
|---|---|---|
| `CanonicalValidator` | 300, 301, 302 | Implemented: Canonical presence, self-referencing, protocol consistency |
| `MetaValidator` | 303-310 | Implemented: Title length, meta description, OG tags, Twitter cards, viewport |

---

### Phase 11: Cost of Retrieval (4%)

**Phase name:** `costOfRetrieval`
**File:** `services/audit/phases/CostOfRetrievalPhase.ts`
**Status:** Implemented

**Wired validators:**

| Validator | Rules | Status |
|---|---|---|
| `CostOfRetrievalAuditor` | 292, 304, 308 | Implemented: DOM node count (tag counting proxy), TTFB estimate, compression detection |
| `CoreWebVitalsChecker` | 320-333 | Implemented: 14 rules covering LCP, INP/FID, CLS (two-tier thresholds), FCP, TTFB, TBT, Speed Index, DOM size, JS/CSS payload, third-party impact, render-blocking, font-display, image fetchpriority |
| `HttpHeadersAuditor` | 311-319 | Implemented: Cache-Control, ETag, max-age, Expires, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, CSP |

**Note:** CWV data must be externally provided (e.g., from CrUX API or Lighthouse). The checker validates thresholds but does not fetch performance data itself.

---

### Phase 12: URL Architecture (3%)

**Phase name:** `urlArchitecture`
**File:** `services/audit/phases/UrlArchitecturePhase.ts`
**Status:** Implemented

**Wired validators:**

| Validator | Rules | Status |
|---|---|---|
| `RedirectChainChecker` | 340-345 | Implemented: Redirect chain length, redirect loops, mixed HTTP/HTTPS |
| `UrlArchitectureAuditor` | 350-360 | Implemented: URL length, depth, parameter count, trailing slashes |
| `UrlStructureValidator` | 361-370 | Implemented: URL readability, keyword presence, extension checks |

---

### Phase 13: Cross-Page Consistency (2%)

**Phase name:** `crossPageConsistency`
**File:** `services/audit/phases/CrossPageConsistencyPhase.ts`
**Status:** Implemented

**Wired validators:**

| Validator | Rules | Status |
|---|---|---|
| `SignalConflictChecker` | 380, 382 | Implemented: CE in boilerplate detection, one CE per site validation |
| `RobotsTxtParser` | 390, 392 | Implemented: Robots.txt directives, AS-to-CS flow checks |
| `CrossPageConsistencyAuditor` | 394 | Implemented: Orphan pages, canonical query assignment |

---

### Phase 14: Website Type Specific (Bonus)

**Phase name:** `websiteTypeSpecific`
**File:** `services/audit/phases/WebsiteTypeSpecificPhase.ts`
**Status:** Partially implemented

**Wired validators:**

| Validator | Rules | Status |
|---|---|---|
| `WebsiteTypeRuleEngine` | 400-429 | Implemented: ecommerce (400-403: Product schema, price, availability, images), SaaS (411-413: comparison table, pricing, docs), B2B (421-422: case studies, Service schema), Blog (426-429: Article schema, author, date, categories). local-business returns empty. |
| `AiAssistedRuleEngine` | 14 AI rules | Partial: Only `validateFallback()` is called (no `AiEvaluator` is injected). Only 4 of 14 AI rules have `fallbackCheck` implementations: 21-ai (author expertise), 22-ai (author credentials), 225-ai (featured snippet potential), 226-ai (comparison format). |

**AI-assisted rule groups (in `AiAssistedRuleEngine`):**
- SC Attribute Priority: 7-ai, 14-ai -- no fallback
- Author Expertise/EEAT: 21-ai, 22-ai, 23-ai, 24-ai -- 21-ai and 22-ai have fallbacks
- EAV Explicitness: 34-ai, 47-ai -- no fallback
- Frame Semantics: 69-ai, 72-ai -- no fallback
- Featured Snippet: 225-ai, 226-ai, 227-ai, 228-ai -- 225-ai and 226-ai have fallbacks
- Related Content: 230-ai -- no fallback

**Gaps:**
- `local-business` website type returns empty array
- 10 of 14 AI rules have no heuristic fallback and are effectively dead without an injected `AiEvaluator`
- Full `validate()` method requires injected `AiEvaluator` which is never provided

---

### Phase 15: Fact Validation (Bonus)

**Phase name:** `factValidation`
**File:** `services/audit/phases/FactValidationPhase.ts`
**Status:** Stub/Proof of concept

The phase delegates to `FactValidator` which:
- Extracts claims via regex (statistics, dates, attributions, comparisons)
- Uses a pluggable `ClaimVerifier` interface for verification
- Default verifier is a **stub** that returns `status: 'unable_to_verify'` for all claims
- `isOutdated()` checks if year references are >2 years old
- Caching via `FactValidationCacheAdapter` interface (not connected to any store)
- Only runs when `request.includeFactValidation === true`

---

## 4. What Has Been Done

### 4.1 Core Infrastructure (Complete)

- `AuditPhase` abstract base class with penalty-based scoring and i18n support
- `UnifiedAuditOrchestrator` with full orchestration pipeline:
  - Content fetching with fallback chains
  - Related URL discovery
  - TopicalMapContext enrichment
  - Sequential phase execution with progress callbacks
  - Weighted score calculation
  - Cannibalization risk extraction
  - Content merge suggestion detection
  - Missing knowledge graph topic detection
  - Snapshot persistence
- `AuditRequest` / `AuditPhaseResult` / `AuditFinding` / `UnifiedAuditReport` type system
- `DEFAULT_AUDIT_WEIGHTS` configuration (13 phases summing to 100%)
- Error-tolerant design: content fetch failures and phase errors are non-fatal

### 4.2 Rule Validators (35 files)

All 35 rule validators in `services/audit/rules/`:

1. `AiAssistedRuleEngine.ts` -- 14 AI rules with prompt templates and heuristic fallbacks
2. `AuthorEntityChecker.ts` -- Author schema and bio detection
3. `CanonicalValidator.ts` -- Canonical URL validation
4. `CentralEntityPositionChecker.ts` -- CE placement and SC/CSI alignment
5. `ContentFormattingExtended.ts` -- Extended formatting checks
6. `ContentFormatValidator.ts` -- Core format validation
7. `ContentObstructionChecker.ts` -- CTA/ad/popup obstruction detection
8. `ContextQualifierDetector.ts` -- Temporal/spatial/conditional qualifiers
9. `ContextualBridgeDetector.ts` -- Bridge presence and quality
10. `ContextualFlowValidator.ts` -- Transition and flow analysis
11. `CoreWebVitalsChecker.ts` -- 14 CWV threshold rules
12. `CostOfRetrievalAuditor.ts` -- DOM size, TTFB, compression
13. `CrossPageConsistencyAuditor.ts` -- Orphan pages, canonical queries
14. `EavTextValidator.ts` -- EAV triple text validation
15. `ExternalDataRuleEngine.ts` -- Navigation, breadcrumb, GSC rules
16. `FillerReplacementAdvisor.ts` -- 13 filler patterns with replacements
17. `HeadingAndDiscourseValidator.ts` -- Heading hierarchy and discourse markers
18. `HtmlNestingValidator.ts` -- Semantic nesting validation
19. `HtmlStructureExtendedValidator.ts` -- ARIA, forms, tables, semantics
20. `HtmlTechnicalValidator.ts` -- Deprecated tags, inline styles
21. `HttpHeadersAuditor.ts` -- 9 HTTP security/caching header checks
22. `ImageMetadataValidator.ts` -- Alt text, dimensions, lazy loading
23. `InformationDensityValidator.ts` -- Redundancy, filler, vagueness, preamble
24. `InternalLinkingValidator.ts` -- Anchor text, placement, volume
25. `LanguageSpecificRules.ts` -- Stop words for 5 languages
26. `MetaValidator.ts` -- Title, meta description, OG/Twitter tags
27. `MicroSemanticsValidator.ts` -- Modality, predicate specificity, SPO
28. `RobotsTxtParser.ts` -- Robots.txt directive parsing
29. `SemanticDistanceAuditor.ts` -- Jaccard similarity cannibalization
30. `SignalConflictChecker.ts` -- CE boilerplate, signal conflicts
31. `SourceContextAligner.ts` -- CE/business/keyword/attribute alignment
32. `UrlArchitectureAuditor.ts` -- URL length, depth, parameters
33. `UrlStructureValidator.ts` -- URL readability and keywords
34. `WebsiteTypeRuleEngine.ts` -- Industry-specific rules (4 types)
35. `RedirectChainChecker.ts` -- Redirect chains, loops, protocol

### 4.3 Content Fetching

- `ContentFetcher.ts`: Multi-provider (Jina, Firecrawl, proxy) with fallback chain
- Full HTML parser extracting: title, meta description, headings, images, internal/external links, schema markup, language (with heuristic fallback for NL/DE/FR/ES)
- Note: `direct` provider removed from chain (`// 'direct' removed -- raw fetch() is always CORS-blocked from browser`)

### 4.4 Export System

- `AuditReportExporter.ts` with 5 export formats:
  - **CSV**: Flat findings table
  - **HTML**: Dark theme standalone report
  - **JSON**: Full structured report
  - **XLSX**: 5 sheets (Overview, Findings, Phase Scores, Recommendations, Metadata) with color-coded severity via ExcelJS
  - **Batch ZIP**: Multi-report ZIP via JSZip with summary CSV

### 4.5 UI Components (21 files)

In `components/audit/`:

1. `UnifiedAuditDashboard.tsx` -- Main dashboard with phase grid and severity tabs
2. `AuditButton.tsx` -- Click-to-audit trigger
3. `AuditComparisonView.tsx` -- Snapshot diff comparison
4. `AuditExportDropdown.tsx` -- Export format selector
5. `AuditFindingCard.tsx` -- Expandable finding with severity colors
6. `AuditPrerequisiteGate.tsx` -- Setup requirement checker
7. `AuditReportView.tsx` -- Full report rendering
8. `AuditScoreExplanation.tsx` -- Score breakdown explanation
9. `AuditScoreRing.tsx` -- SVG circular score indicator
10. `AuditSidePanel.tsx` -- Inline audit results panel
11. `AuditTimelineView.tsx` -- Score history SVG chart
12. `AuditWeightSliders.tsx` -- Weight configuration (sum=100 constraint)
13. `AnalyticsPropertiesManager.tsx` -- GSC/GA4 property management
14. `AnalyticsPropertySelector.tsx` -- Property selection dropdown
15. `ContentMergeSuggestionsPanel.tsx` -- Merge suggestion display
16. `ExternalUrlInput.tsx` -- External URL audit input
17. `KnowledgeGraphGapsPanel.tsx` -- Missing KG topic display
18. `PerformanceTrendChart.tsx` -- Performance trend visualization
19. `PhaseScoreCard.tsx` -- Phase score with progress bar
20. `WebsiteTypeSelector.tsx` -- Industry type dropdown
21. `SiteAuditWizard.tsx` -- **Note: Uses different audit system** (see Known Issues)

### 4.6 Database Layer

- `project_audit_config` table: Per-project weights, website type with CHECK constraint, RLS policies, auto-update trigger
- `unified_audit_snapshots` table: Overall score, phase scores JSONB, severity counts, full report JSONB, GSC/GA4 columns
- `audit_schedules` table: Schema created (scheduling not implemented)
- `AuditSnapshotService.ts`: Supabase persistence with `buildRow()` extracting phase scores, severity counts, performance data

### 4.7 Analytics Integration

- `GscApiAdapter.ts`: Full GSC API (OAuth URL generation, search analytics, page performance, top queries, click trends, site listing)
- `Ga4ApiAdapter.ts`: Full GA4 API (page metrics, pageview trends, property listing)
- `PerformanceCorrelator.ts`: Pearson/lagged correlation with insight generation

### 4.8 i18n System

- `config/audit-i18n/index.ts`: Translation loader with EN fallback
- Translation files: `en.ts`, `nl.ts`, `de.ts`, `fr.ts`, `es.ts`
- `AuditTranslations` type: 15 phase name/description pairs, 4 severity labels, 30+ UI keys
- Integration: `AuditPhase.createFinding()` applies localized category from phase translations

### 4.9 Test Coverage

**Rule validator tests (35 files):** `services/audit/rules/__tests__/`
Every rule validator has a corresponding test file (1:1 coverage).

**Phase tests (3 files):** `services/audit/phases/__tests__/`
- `ContextualFlowPhase.test.ts`
- `HtmlTechnicalPhase.test.ts`
- `P0PhasesWiring.test.ts` -- Tests that all phases wire to correct validators

**Core service tests (10 files):** `services/audit/__tests__/`
- `UnifiedAuditOrchestrator.test.ts`
- `AuditReportExporter.test.ts`
- `AuditSnapshotService.test.ts`
- `ContentFetcher.test.ts`
- `FactValidator.test.ts`
- `PerformanceCorrelator.test.ts`
- `RelatedUrlDiscoverer.test.ts`
- `types.test.ts`
- `integration.test.ts`
- `auditE2E.test.ts`

**UI component tests (19 files):** `components/audit/__tests__/`
All 19 tested (missing only `SiteAuditWizard` and `AuditReportView`).

**i18n tests (1 file):** `config/audit-i18n/__tests__/`

**Total test files: 68**

---

## 5. What Is Partially Done

### 5.1 Dormant Transform Methods (4 phases)

Four phase adapters have `transform*()` methods that convert existing service outputs into audit findings, but these methods are **never called from `execute()`**:

| Phase | Method | Source Service |
|---|---|---|
| `StrategicFoundationPhase` | `transformCeIssues()` | `centralEntityAnalyzer.ts` |
| `EavSystemPhase` | `transformEavInconsistencies()` | `eavAudit.ts` |
| `ContentQualityPhase` | `transformAuditRuleResults()` | `auditChecks.ts` (Pass 8) |
| `LinkStructurePhase` | `transformLinkingIssues()` | `linkingAudit.ts` |

These methods are fully implemented and could be wired into `execute()` to add significant rule coverage.

### 5.2 AI-Assisted Rules

`AiAssistedRuleEngine` defines 14 AI rules with full prompt templates, but:
- `validate()` requires an injected `AiEvaluator` function that no phase currently provides
- Only `validateFallback()` is called, which runs heuristic checks
- Only 4 of 14 rules have `fallbackCheck` implementations (21-ai, 22-ai, 225-ai, 226-ai)
- The remaining 10 rules are effectively inert

### 5.3 Website Type Coverage

`WebsiteTypeRuleEngine` supports 4 types (ecommerce, SaaS, B2B, blog), but:
- `local-business` type returns an empty array
- `other` type is skipped entirely (phase guard: `websiteType !== 'other'`)

### 5.4 Fact Validation

`FactValidator` has working claim extraction (regex-based: statistics, dates, attributions, comparisons) but the default `ClaimVerifier` is a stub returning `unable_to_verify`.

### 5.5 i18n Per-Rule Translations

The i18n system translates phase names and severity labels, but per-rule title/description translations are not implemented. Comment in `AuditPhase.ts`: "rule-specific i18n would require a per-rule translation registry which we leave to future work."

### 5.6 Related URL Discovery CORS

`RelatedUrlDiscoverer.ts` uses raw `fetch()` for sitemap retrieval, which will be CORS-blocked in browser context. Needs to route through Supabase edge function or existing proxy.

### 5.7 Audit Scheduling

`audit_schedules` table exists in the database but no scheduling logic is implemented.

### 5.8 Performance Data Collection

`CoreWebVitalsChecker` validates thresholds but does not fetch CWV data itself. No integration with CrUX API or Lighthouse is wired up. Performance data must be externally provided in the `AuditRequest`.

### 5.9 totalChecks Inflation

`totalChecks` is incremented once per validator block (not per rule), making `passedChecks / totalChecks` misleading. For example, a phase wiring 4 validators reports `totalChecks = 4` even if those 4 validators collectively check 20+ rules.

---

## 6. What Still Needs To Be Done

### Priority 1 -- High Impact, Low Effort

1. **Wire dormant transform methods**: Call `transformCeIssues()`, `transformEavInconsistencies()`, `transformAuditRuleResults()`, and `transformLinkingIssues()` from their respective phase `execute()` methods. This would activate dozens of rules using existing, tested code.

2. **Fix totalChecks counting**: Increment `totalChecks` per individual rule rather than per validator block to give accurate passed/total ratios.

3. **Fix prerequisitesMet hardcoding**: `UnifiedAuditOrchestrator.runAudit()` hardcodes `prerequisitesMet: { businessInfo: true, pillars: true, eavs: true }` without checking actual project state.

4. **Fix RelatedUrlDiscoverer CORS**: Route sitemap fetching through Supabase edge function or existing proxy service.

### Priority 2 -- Medium Impact

5. **Inject AiEvaluator into WebsiteTypeSpecificPhase**: Wire an AI provider so the full `validate()` method can run instead of only `validateFallback()`. This would activate 10 additional AI rules.

6. **Add fallback checks for remaining AI rules**: Implement `fallbackCheck` for the 10 AI rules that lack heuristic fallbacks (7-ai, 14-ai, 23-ai, 24-ai, 34-ai, 47-ai, 69-ai, 72-ai, 227-ai, 228-ai, 230-ai).

7. **Implement local-business website type**: Add rule set for local business (e.g., LocalBusiness schema, NAP consistency, service area).

8. **Implement FactValidation verifier**: Connect a real verification source (e.g., web search API, knowledge base API) to replace the stub `ClaimVerifier`.

9. **Add missing phase tests**: Only 3 of 15 phases have dedicated tests. The `P0PhasesWiring.test.ts` covers basic wiring but not execution logic for 12 phases.

10. **Create `useAudit` React hook**: No dedicated hook exists for the unified audit system. Components currently manage audit state locally.

### Priority 3 -- Nice to Have

11. **Implement audit scheduling**: Wire the `audit_schedules` table to a cron-like mechanism (Supabase CRON, edge function timer).

12. **Add per-rule i18n translations**: Create rule-level translation registry for all 5 supported languages.

13. **Integrate CrUX API / Lighthouse**: Auto-fetch CWV data rather than requiring it in `AuditRequest`.

14. **Reconcile SiteAuditWizard**: `SiteAuditWizard.tsx` uses a completely different audit service (`services/ai/siteAudit.ts`) with 5 different phases (Technical Baseline, Semantic Extraction, Knowledge Graph, Segmentation, Roadmap). Either integrate it with the unified audit system or clearly mark it as a separate feature.

15. **Add Supabase edge function for audit**: No audit-related edge functions exist. An edge function could run server-side audits without CORS issues.

16. **Semantic Distance algorithm alignment**: Align the `SemanticDistanceAuditor` (Jaccard similarity) with the knowledge graph module's formula (`1 - CosineSimilarity x ContextWeight x CoOccurrence`) for consistency.

---

## 7. Known Issues and Bugs

### 7.1 Hardcoded Prerequisites

**Location:** `services/audit/UnifiedAuditOrchestrator.ts`, line ~189
**Issue:** `prerequisitesMet` is hardcoded to `{ businessInfo: true, pillars: true, eavs: true }` without validating actual project state.
**Impact:** `AuditPrerequisiteGate` component cannot rely on this field for accurate gating.

### 7.2 Misleading totalChecks

**Location:** All phase adapters
**Issue:** `totalChecks` increments once per validator invocation, not per individual rule. A phase with 4 validators reports `totalChecks: 4` even when those validators execute 20+ rules internally.
**Impact:** The `passedChecks / totalChecks` ratio in the UI is misleading.

### 7.3 Dormant Code in 4 Phases

**Location:** `StrategicFoundationPhase`, `EavSystemPhase`, `ContentQualityPhase`, `LinkStructurePhase`
**Issue:** Each has transform methods that convert existing service results to findings but are never called from `execute()`.
**Impact:** Existing services (centralEntityAnalyzer, eavAudit, auditChecks, linkingAudit) are imported but their outputs are not included in audit results.

### 7.4 RelatedUrlDiscoverer CORS

**Location:** `services/audit/RelatedUrlDiscoverer.ts`
**Issue:** Uses raw `fetch()` for sitemap retrieval, which will be CORS-blocked in browser context.
**Impact:** Sitemap-based URL discovery will silently fail in the SPA.

### 7.5 Stub Fact Verifier

**Location:** `services/audit/FactValidator.ts`
**Issue:** Default `ClaimVerifier` returns `unable_to_verify` for all claims.
**Impact:** Fact validation phase produces no actionable findings.

### 7.6 Dual Audit Systems

**Location:** `components/audit/SiteAuditWizard.tsx` vs `components/audit/UnifiedAuditDashboard.tsx`
**Issue:** `SiteAuditWizard` uses `services/ai/siteAudit.ts` (a completely different audit system with 5 phases: Technical Baseline, Semantic Extraction, Knowledge Graph, Segmentation, Roadmap). This is separate from the unified audit system.
**Impact:** User confusion -- two audit buttons/workflows exist that produce different results.

### 7.7 AI Rules Mostly Inert

**Location:** `services/audit/rules/AiAssistedRuleEngine.ts` + `services/audit/phases/WebsiteTypeSpecificPhase.ts`
**Issue:** No `AiEvaluator` is injected, so `validateFallback()` runs instead of `validate()`. Only 4 of 14 rules fire in fallback mode.
**Impact:** 10 AI rules with full prompt templates are effectively dead code.

### 7.8 No Audit Edge Functions

**Location:** `supabase/functions/`
**Issue:** No audit-related edge functions exist despite the system requiring external HTTP calls (content fetching, sitemap parsing) that hit CORS restrictions in the browser.
**Impact:** Content fetching relies entirely on third-party proxy services (Jina, Firecrawl).

---

## 8. File Inventory

### 8.1 Core Services (`services/audit/`)

| File | Purpose |
|---|---|
| `types.ts` | Type definitions: AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding, UnifiedAuditReport, FetchedContent, FactClaim, etc. |
| `UnifiedAuditOrchestrator.ts` | Main facade: runAudit(), enrichContent(), calculateWeightedScore(), extractCannibalizationRisks(), detectMergeSuggestions(), detectMissingKgTopics() |
| `ContentFetcher.ts` | Multi-provider content fetcher with HTML parser |
| `RelatedUrlDiscoverer.ts` | Sitemap and internal link URL discovery |
| `AuditSnapshotService.ts` | Supabase persistence for audit snapshots |
| `AuditReportExporter.ts` | CSV, HTML, JSON, XLSX, batch ZIP export |
| `PerformanceCorrelator.ts` | Pearson/lagged correlation with insight generation |
| `FactValidator.ts` | Claim extraction, verification, caching |

### 8.2 Phase Adapters (`services/audit/phases/`)

| File | Phase Name | Weight |
|---|---|---|
| `AuditPhase.ts` | (abstract base) | -- |
| `StrategicFoundationPhase.ts` | strategicFoundation | 10% |
| `EavSystemPhase.ts` | eavSystem | 15% |
| `ContentQualityPhase.ts` | microSemantics | 13% |
| `InformationDensityPhase.ts` | informationDensity | 8% |
| `ContextualFlowPhase.ts` | contextualFlow | 15% |
| `LinkStructurePhase.ts` | internalLinking | 10% |
| `SemanticDistancePhase.ts` | semanticDistance | 3% |
| `ContentFormatPhase.ts` | contentFormat | 5% |
| `HtmlTechnicalPhase.ts` | htmlTechnical | 7% |
| `MetaStructuredDataPhase.ts` | metaStructuredData | 5% |
| `CostOfRetrievalPhase.ts` | costOfRetrieval | 4% |
| `UrlArchitecturePhase.ts` | urlArchitecture | 3% |
| `CrossPageConsistencyPhase.ts` | crossPageConsistency | 2% |
| `WebsiteTypeSpecificPhase.ts` | websiteTypeSpecific | bonus |
| `FactValidationPhase.ts` | factValidation | bonus |

### 8.3 Rule Validators (`services/audit/rules/`)

35 files (listed in section 4.2 above).

### 8.4 UI Components (`components/audit/`)

21 files (listed in section 4.5 above).

### 8.5 Adapters (`services/audit/adapters/`)

| File | Purpose |
|---|---|
| `GscApiAdapter.ts` | Google Search Console API integration |
| `Ga4ApiAdapter.ts` | Google Analytics 4 API integration |

### 8.6 i18n (`config/audit-i18n/`)

| File | Language |
|---|---|
| `index.ts` | Loader with EN fallback |
| `en.ts` | English (default) |
| `nl.ts` | Dutch |
| `de.ts` | German |
| `fr.ts` | French |
| `es.ts` | Spanish |

### 8.7 Database Migrations

| File | Purpose |
|---|---|
| `20260211250000_create_project_audit_config.sql` | project_audit_config table, RLS, triggers |
| `20260211260000_create_unified_audit_snapshots.sql` | unified_audit_snapshots + audit_schedules tables |

### 8.8 Test Files (68 total)

| Directory | Count | Coverage |
|---|---|---|
| `services/audit/rules/__tests__/` | 35 | 1:1 with all rule validators |
| `services/audit/__tests__/` | 10 | Orchestrator, exporter, snapshot, fetcher, fact validator, performance correlator, URL discoverer, types, integration, E2E |
| `services/audit/phases/__tests__/` | 3 | ContextualFlow, HtmlTechnical, P0PhasesWiring |
| `components/audit/__tests__/` | 19 | All components except SiteAuditWizard and AuditReportView |
| `config/audit-i18n/__tests__/` | 1 | Translation loader |

---

*End of status document.*
