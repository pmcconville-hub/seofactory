# Structural Analysis Layer — Design Document

**Goal:** Compute rich HTML structural analysis per page (heading tree, content regions, schema markup, entity prominence) via a serverless edge function, store it centrally, and surface it across all application features — pipeline, audits, content generation, briefs, migration, insights, and entity tracking.

**Architecture:** A Supabase Edge Function (`html-structure-analyzer`) parses raw HTML with `deno-dom`, extracts structural signals, and returns a `StructuralAnalysis` object. Results are stored in `site_analysis_pages.structural_analysis` (JSONB) and cached for reuse. No new infrastructure — fully serverless.

**Why:** The current extraction stack (Jina + Firecrawl) converts HTML to flat markdown, losing heading hierarchy, content regions, schema context, and entity positioning. This information is critical for 8+ audit rules, entity prominence scoring, content brief generation, and competitive structural analysis — but is currently unavailable.

---

## 1. The Problem

When a page is crawled, its HTML is converted to markdown (Jina) or metadata (Firecrawl/Apify). In this conversion:

- **Heading hierarchy is flattened** — stored as `[{level: 2, text: "..."}, {level: 3, text: "..."}]` with no parent-child relationships
- **Content regions are lost** — `<main>`, `<article>`, `<aside>`, `<nav>` distinctions disappear
- **Entity positioning is unknown** — can't tell if Central Entity is in H1 (strong signal) vs. mentioned in footer (weak signal)
- **Schema markup is extracted but disconnected** — JSON-LD blocks are stored but never correlated with page structure
- **Word counts include boilerplate** — navigation, footer, sidebar text inflates metrics

This causes:
- Entity salience analysis failing ("Insufficient content") or producing inaccurate results
- Audit rules using text-based heuristics instead of structural signals
- Content briefs lacking competitor structural templates
- Gap analysis comparing flat page counts instead of structural depth

---

## 2. The Solution: `StructuralAnalysis` Type

One analysis object per page, computed once, consumed everywhere.

```typescript
interface StructuralAnalysis {
  // Nested heading hierarchy (tree, not flat array)
  headingTree: HeadingNode[];

  // Content regions with word counts
  regions: {
    main:    RegionStats;   // <main>, <article>, role="main"
    sidebar: RegionStats;   // <aside>, role="complementary"
    nav:     RegionStats;   // <nav>, role="navigation"
    header:  RegionStats;   // <header>, role="banner"
    footer:  RegionStats;   // <footer>, role="contentinfo"
  };
  mainContentText: string;  // Boilerplate-stripped text (for NLP analysis)
  mainContentWordCount: number;

  // Per-section metrics (one entry per H2, with nested H3s)
  sections: SectionAnalysis[];

  // Central Entity structural positioning
  entityProminence: EntityProminence;

  // All JSON-LD and microdata blocks
  schemaMarkup: SchemaBlock[];

  // DOM metrics
  domMetrics: {
    totalNodes: number;
    mainContentNodes: number;
    nestingDepth: number;
    htmlSizeBytes: number;
  };

  // Metadata
  analyzedAt: string;       // ISO timestamp
  analyzerVersion: string;  // For cache invalidation
}

interface HeadingNode {
  level: number;            // 1-6
  text: string;
  wordCountBelow: number;   // Words between this heading and the next same-or-higher level
  entityMentions: number;   // CE mentions in this section's text
  children: HeadingNode[];  // Nested sub-headings
}

interface RegionStats {
  wordCount: number;
  percentage: number;       // Of total page word count
  exists: boolean;          // Whether semantic tag was found
}

interface SectionAnalysis {
  heading: string;
  level: number;
  wordCount: number;
  paragraphCount: number;
  listCount: number;
  tableCount: number;
  imageCount: number;
  entityMentions: number;
  subSections: SectionAnalysis[];  // Nested H3s under this H2
}

interface EntityProminence {
  entity: string;           // The CE being measured
  inTitle: boolean;
  inH1: boolean;
  inFirstH2: boolean;
  inMetaDescription: boolean;
  totalMentions: number;
  mainContentMentions: number;
  sidebarMentions: number;
  footerMentions: number;
  firstMentionPosition: number;  // 0-1 scale (0 = start of main content)
  headingMentionRate: number;    // % of headings containing CE
}

interface SchemaBlock {
  type: string;             // e.g., "Organization", "Article", "FAQPage"
  properties: Record<string, any>;
  source: 'json-ld' | 'microdata' | 'rdfa';
}
```

---

## 3. Edge Function: `html-structure-analyzer`

### Input

```typescript
{
  url?: string;            // Fetch and analyze (via fetch-proxy pattern)
  html?: string;           // Or analyze pre-fetched HTML
  centralEntity?: string;  // Entity to measure prominence for
  language?: string;       // For entity matching rules
}
```

### Processing Steps

1. **Fetch HTML** — if `url` provided, fetch via internal HTTP (same CORS pattern as fetch-proxy). If `html` provided, use directly.
2. **Parse DOM** — use `deno-dom` (Deno-native HTML parser, no external deps)
3. **Identify content regions** — find `<main>`, `<article>`, `<aside>`, `<nav>`, `<header>`, `<footer>` tags and ARIA roles. Fallback heuristic: first/last 15% as boilerplate, middle 70% as main.
4. **Build heading tree** — walk all `h1`-`h6` elements, construct nested tree. For each heading, count words until the next heading of same-or-higher level.
5. **Build section analysis** — for each H2, compute paragraph/list/table/image counts and entity mentions within its section.
6. **Measure entity prominence** — case-insensitive search for `centralEntity` in title, H1, first H2, meta description, and per content region. Calculate mention distribution and first mention position.
7. **Extract schema markup** — parse all `<script type="application/ld+json">` blocks. Detect microdata (`itemscope`/`itemprop`) and RDFa (`typeof`/`property`) attributes.
8. **Compute DOM metrics** — count total nodes, main content nodes, max nesting depth, HTML size.

### Output

Full `StructuralAnalysis` JSON object.

### Performance

- HTML parsing with `deno-dom`: ~10-50ms for typical pages
- Entity counting: ~5ms (string search, no AI)
- Total: <100ms per page (well within 25s edge function limit)
- No AI/LLM calls, no external API calls — pure DOM parsing

---

## 4. Database Schema

### Migration: Add `structural_analysis` Column

```sql
ALTER TABLE site_analysis_pages
ADD COLUMN IF NOT EXISTS structural_analysis JSONB DEFAULT NULL;

COMMENT ON COLUMN site_analysis_pages.structural_analysis IS
  'Rich HTML structural analysis: heading tree, content regions, entity prominence, schema markup';
```

### Cache Strategy

- Computed once per page during crawl or on-demand analysis
- Invalidated when page content changes (compare `content_hash`)
- Edge function version tracked in `analyzerVersion` field for cache busting

---

## 5. Integration Points Across the Application

### 5A. Pipeline Steps

| Step | Integration | Data Used |
|------|-------------|-----------|
| **1. Discover** | Run analyzer on each crawled page during sitemap discovery | Store `structural_analysis` per page |
| **2. Gap Analysis** | Entity prominence for own pages; structural comparison with competitor pages | `entityProminence`, `headingTree`, `sections` |
| **3. Strategy** | Show existing structural coverage: "CE in H1 on X of Y pages" | `entityProminence.inH1` aggregated |
| **4. EAV Inventory** | H2 headings suggest attributes; section analysis suggests entity-attribute candidates | `headingTree`, `sections` |
| **5. Topical Map** | Compare existing page headings against planned topics | `headingTree` vs topic list |
| **6. Content Briefs** | Competitor structural templates: avg H2 count, section types, content type distribution | `sections`, `headingTree` from competitor pages |
| **7. Content Generation** | Pass 2: validate generated headings against structural baseline. Pass 9: heading-driven schema | `headingTree` from competitors, `schemaMarkup` |
| **8. Audit** | 8+ rules get structural signals instead of text heuristics (see 5C below) | All fields |
| **9. Tech Spec** | Schema recommendations based on actual structure | `schemaMarkup`, `headingTree` |

### 5B. Non-Pipeline Features

| Feature | Integration | Data Used |
|---------|-------------|-----------|
| **Topical Map Wizards** | Competitor heading trees inform pillar/EAV suggestions | `headingTree` from competitor pages |
| **Topical Map Workbench** | Structural gap overlay: which planned topics already have structural coverage? | `headingTree` mapped to topics |
| **Migration Planning** | Structural depth justifies REWRITE vs OPTIMIZE: "page has 4 H2s, competitors average 8" | `sections.length`, competitor comparison |
| **Insights Hub** | New "Structural Health" metrics: heading compliance, DOM efficiency, schema coverage | Aggregated across all pages |
| **KP Strategy / Entity Authority** | Entity prominence in heading structure: "CE appears in H1 on X% of pages" | `entityProminence` aggregated |
| **Entity Health** | Track structural entity signals over time | `entityProminence` time series |
| **Content Briefs** | `structuralTemplate` from competitor analysis embedded in brief | `sections`, `headingTree` from competitors |
| **Quality Dashboard** | Heading hierarchy validity, section length consistency | `headingTree`, `sections` |
| **Site Analysis V2** | Full structural audit per page | All fields |

### 5C. Audit Rule Enhancements (15 Phases)

| Phase | Rule | Current (Text-Based) | Enhanced (Structural) |
|-------|------|---------------------|----------------------|
| **1** Strategic | Rule 4: CE in first 2 sentences | Regex on full text | `entityProminence.firstMentionPosition < 0.05` |
| **1** Strategic | Rule 5: CE in first sentence | Text search | `entityProminence.inH1 && entityProminence.firstMentionPosition < 0.02` |
| **2** EAV | Triple coverage | Per-page count | Per-section density: `sections[i].entityMentions` |
| **4** Info Density | Redundancy/filler | Total word count | `mainContentWordCount` (boilerplate excluded) |
| **5** Contextual Flow | Heading hierarchy | Flat `[{level,text}]` | Nested `headingTree` with parent-child validation |
| **5** Contextual Flow | CE distribution | Text frequency | `entityProminence.headingMentionRate` + per-section |
| **8** Content Format | List/table distribution | Whole-page counts | Per-section: `sections[i].listCount`, `tableCount` |
| **9** HTML Technical | Rule 251: Single H1 | `/<h1/g` regex | `headingTree.filter(h => h.level === 1).length` |
| **9** HTML Technical | Rule 252: No heading skips | Flat level check | Tree nesting validation |
| **10** Schema | About vs Mentions | Schema-only check | Schema ↔ heading alignment: does `@mainEntity` match H1? |
| **11** CoR | DOM size | Total `domNodes` | `domMetrics.mainContentNodes` vs total ratio |
| **BP** Boilerplate | Main content ratio | Heuristic 70% | `regions.main.percentage` from semantic HTML tags |

---

## 6. How It Gets Called

### During Crawl (Step 1 — Automatic)

When pages are discovered and crawled, the structural analyzer runs on each page:

```
PipelineCrawlStep discovers URLs via sitemap
  → For each page, Jina extracts content_markdown
  → Edge function html-structure-analyzer runs on the raw HTML
  → Result stored in site_analysis_pages.structural_analysis
```

### During Gap Analysis (Step 2 — Competitor Pages)

When analyzing competitor pages from SERP results:

```
Gap analysis fetches competitor pages via Jina/Firecrawl
  → Edge function analyzes competitor HTML
  → Structural comparison: your pages vs competitor pages
```

### During Audit (Step 8 — On-Demand)

When auditing a specific page:

```
Audit requests page HTML (via ContentFetcher)
  → Check if structural_analysis already cached
  → If not, call edge function and cache result
  → Audit rules read from structural_analysis
```

### From Any Feature (On-Demand)

```typescript
// Frontend service function
async function getStructuralAnalysis(
  url: string,
  centralEntity: string,
  options?: { forceRefresh?: boolean }
): Promise<StructuralAnalysis> {
  // 1. Check cache in site_analysis_pages
  // 2. If cached and not stale, return
  // 3. If missing or stale, call edge function
  // 4. Store result, return
}
```

---

## 7. What This Does NOT Do

- **No JavaScript rendering** — Jina already handles JS-rendered content via `X-Wait-For-Selector`. The structural analyzer works on the final HTML (which Jina or the browser already rendered).
- **No content generation** — Pure analysis, no markdown conversion or text generation.
- **No AI/LLM calls** — Pure DOM parsing. Fast, deterministic, free.
- **No new infrastructure** — Runs as a Supabase Edge Function (Deno). No Docker, no VPS.
- **No replacement of Jina/Firecrawl** — Complementary. Jina provides markdown content; this provides structural signals from the same HTML.

---

## 8. Implementation Order

### Phase 1: Foundation (Core)
1. TypeScript types (`types/structuralAnalysis.ts`)
2. Edge function (`supabase/functions/html-structure-analyzer/`)
3. Database migration (add `structural_analysis` column)
4. Frontend service (`services/structuralAnalysisService.ts`)

### Phase 2: Pipeline Integration
5. Crawl step: auto-analyze during discovery
6. Gap analysis: structural comparison with competitors
7. Entity salience: use `entityProminence` instead of flat text

### Phase 3: Audit Enhancement
8. Update audit rules to read from `structural_analysis`
9. BoilerplateDetector: use actual `regions` data
10. HeadingValidator: use nested `headingTree`
11. EntitySalienceValidator: use `entityProminence`

### Phase 4: Content & Intelligence
12. Content briefs: competitor structural templates
13. Content generation: structural validation in Pass 2
14. Insights Hub: structural health metrics
15. KP Strategy: entity prominence tracking

### Phase 5: Migration & Advanced
16. Migration planning: structural gap justification
17. Topical map workbench: structural coverage overlay
18. Schema generation: heading-driven schema in Pass 9

---

## 9. Existing Infrastructure Leveraged

| Existing Component | How It's Used |
|---|---|
| `fetch-proxy` edge function | Fetches HTML for URLs (CORS bypass) |
| `site_analysis_pages` table | Stores `structural_analysis` JSONB alongside existing columns |
| `pageExtractionService.ts` | Orchestration point for triggering structural analysis |
| `ContentFetcher.ts` | Audit entry point — check cache, call analyzer if needed |
| `BoilerplateDetector.ts` | Already detects `<main>`/`<aside>`/`<nav>` — shares logic |
| `HeadingAndDiscourseValidator.ts` | Already validates headings — enhanced with tree data |
| `EntitySalienceValidator.ts` | Rules 371/372 get structural signals |
| `CentralEntityPositionChecker.ts` | Rules 4/5 get `entityProminence` data |
| `scrapingProviderRouter.ts` | Can route structural analysis requests |

---

## 10. Verification

1. Edge function returns valid `StructuralAnalysis` for test URLs (HTML with semantic tags, without semantic tags, JS-rendered pages)
2. Heading tree correctly nests H1→H2→H3 hierarchy
3. Content regions correctly identify `<main>` vs `<aside>` vs `<footer>`
4. Entity prominence correctly detects CE in H1, title, meta description
5. Schema markup extracts all JSON-LD blocks
6. Results persist in `site_analysis_pages.structural_analysis`
7. Cached results are reused (no re-analysis for same content hash)
8. Audit rules produce different (more accurate) results with structural data
9. `mainContentWordCount` differs from total `word_count` (boilerplate excluded)
