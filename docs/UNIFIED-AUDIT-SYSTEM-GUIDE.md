# Unified Content Audit System — User Guide

## What Changed & Why

The application now includes a **Unified Content Audit System** — a single, cohesive auditing engine that replaces and consolidates the previously scattered audit checks across 16+ subsystems. Instead of running separate checks for E-A-T, technical SEO, content quality, and semantic structure, everything runs through one orchestrator with **15 audit phases**, **300+ rules**, and a **weighted scoring system** (0-100).

### Key Benefits
- **One score, one dashboard** — no more jumping between 8 different audit tabs
- **Configurable weights** — adjust which phases matter most for your project
- **External URL auditing** — audit competitor pages without project setup
- **Performance correlation** — connect GSC/GA4 data to see how audit improvements affect traffic
- **Export anywhere** — CSV, HTML (standalone report), or JSON
- **Snapshot history** — track audit scores over time and compare any two audits
- **Multilingual** — UI labels in EN, NL, DE, FR, ES

---

## Quick Start

### Prerequisites
Before running an internal audit, you need:
1. **Business Information** configured (industry, services, target audience)
2. **SEO Pillars** defined (your topical map structure)
3. **EAV Triples** added (entity-attribute-value definitions)

For **external URL audits** (competitor analysis), you can skip these and "Proceed Anyway".

### Running Your First Audit

1. Open your project dashboard
2. Click the **Audit** button on any topic, URL, or content brief
3. The **Prerequisite Gate** checks your setup — click through if ready
4. Choose audit settings:
   - **Audit type**: Internal (your content) or External (competitor URL)
   - **Depth**: Quick (essential phases) or Deep (all 15 phases)
5. Click **Start Audit**
6. Watch the progress bar as each phase completes
7. View your results in the **Unified Audit Dashboard**

---

## Understanding Your Score

### Overall Score (0-100)

The overall score is a **weighted average** of all phase scores. Each phase calculates its score by starting at 100 and subtracting severity penalties:

| Severity | Penalty |
|----------|---------|
| Critical | -15 points |
| High | -8 points |
| Medium | -4 points |
| Low | -1 point |

### Score Bands

| Score | Rating | Meaning |
|-------|--------|---------|
| 90-100 | Exceptional | Content is optimally structured for search engines |
| 80-89 | Strong | Minor improvements possible, but well above average |
| 70-79 | Good | Solid foundation with room for targeted improvements |
| 60-69 | Fair | Several important issues need attention |
| 40-59 | Needs Work | Significant gaps in SEO structure |
| 0-39 | Major Issues | Fundamental problems must be addressed |

### Phase Weights (Default)

| Phase | Weight | What It Checks |
|-------|--------|----------------|
| **Strategic Foundation** | 10% | Central Entity positioning, Source Context alignment, E-E-A-T signals |
| **EAV System** | 15% | Entity-Attribute-Value triple coverage, root attribute completeness |
| **Micro-Semantics** | 13% | Sentence-level quality: modality, predicate specificity, SPO patterns |
| **Information Density** | 8% | Redundancy, filler content, vague statements, preamble |
| **Contextual Flow** | 15% | CE distribution, transitions, heading quality, subordinate text |
| **Internal Linking** | 10% | Anchor text quality, link volume, placement, context |
| **Semantic Distance** | 3% | Cannibalization risk detection between similar topics |
| **Content Format** | 5% | Lists, tables, heading hierarchy, IR Zone optimization |
| **HTML Technical** | 7% | Nesting validity, semantic tags, alt text, image attributes |
| **Meta & Structured Data** | 5% | Canonical tags, meta description, JSON-LD validation |
| **Cost of Retrieval** | 4% | DOM complexity, TTFB, compression |
| **URL Architecture** | 3% | Redirect chains, URL structure |
| **Cross-Page Consistency** | 2% | Signal conflicts, robots.txt alignment |

**Bonus phases** (not in the 100% total):
- **Website Type Specific** — rules for e-commerce, SaaS, B2B, blog, local business
- **Fact Validation** — verifies statistics, dates, and attributions against sources

You can **customize weights** using the Weight Sliders before running an audit.

---

## The 15 Audit Phases Explained

### 1. Strategic Foundation (Rules 1-32)
Checks whether your content aligns with your defined business context. Validates that the **Central Entity** appears early (first 2 sentences), that your Source Context attributes are covered, and that author/entity signals are present.

### 2. EAV System (Rules 33-56)
Validates your Entity-Attribute-Value triples against the actual content. Flags low coverage (<50% of triples mentioned), excessive pronouns (should use named entities), missing units on numbers, and incomplete root attributes.

### 3. Micro-Semantics (Rules 57-73)
Sentence-level linguistic quality. Detects mixed factual/modal language, excessive hedging, vague predicates ("do", "make", "get"), and weak sentence starters ("There is", "It is").

### 4. Information Density (Rules 94-98)
Checks for content bloat. Flags redundant paragraphs (>50% word overlap), filler phrases ("in today's world"), vague qualifiers (>3% of word count), and meta-commentary preambles ("In this article we will...").

### 5. Contextual Flow (Rules 113-148)
Validates how your content flows. Central Entity should appear in 30%+ of paragraphs and in the conclusion. Checks for overly long paragraphs (>200 words), missing transitions, duplicate headings, and keyword-stuffed headings.

### 6. Internal Linking (Rules 162-184)
Evaluates link quality. Flags generic anchors ("click here"), single-word anchors, overly long anchors (>7 words), duplicate anchor text pointing to different URLs, insufficient link density, and links placed outside main content.

### 7. Semantic Distance
Uses your knowledge graph to detect cannibalization risks — topics that are too semantically similar (<0.2 distance) and may compete for the same keywords.

### 8. Content Format (Rules 205-229)
Checks formatting best practices. How-to content should use ordered lists, comparisons should use tables. Validates list item length, list size, table headers, and IR Zone optimization (query words in first 400 characters).

### 9. HTML Technical (Rules 233-261)
Validates HTML structure. Checks for proper `<article>` wrapping, single `<main>` element, no pseudo-headings (bold used as headings), alt text on images, lazy loading, image dimensions, no `<figure>` inside `<p>`, heading level skips, and multiple H1 tags.

### 10. Meta & Structured Data (Rules 270-284)
Validates metadata. Checks canonical tag presence and correctness (self-referencing, absolute URL, no conflicts with noindex), meta description length (70-160 chars), lang attribute, viewport, charset, and JSON-LD schema validity.

### 11. Cost of Retrieval (Rules 292-308)
Performance-focused checks. DOM node count (critical if >1500), Time to First Byte (critical if >500ms), and HTTP compression (gzip/brotli).

### 12. URL Architecture (Rules 358-363)
Checks redirect chains. Flags 5xx server errors, redirect loops, and chains longer than 2 hops.

### 13. Cross-Page Consistency (Rules 371-373)
Detects signal conflicts. Flags when a URL is blocked by robots.txt but listed in sitemap, noindex combined with external canonical, noindex on pages that should be indexed, and internal nofollow links.

### 14. Website Type Specific
Domain-specific rules based on your website type selection (e-commerce, SaaS, B2B, blog, local business). For example, e-commerce pages get checked for product schema, pricing markup, and review signals.

### 15. Fact Validation
Extracts factual claims (statistics, dates, attributions) from your content and attempts to verify them against sources. Results are cached to avoid repeated lookups.

---

## Features & How to Use Them

### Customizing Audit Weights
1. Open the audit configuration
2. Use the **Weight Sliders** to adjust phase importance
3. Example: For a technical blog, increase Micro-Semantics and Information Density weights
4. Weights are saved per-project in the `project_audit_config` table

### Auditing External URLs
1. In the audit panel, click **External URL** input
2. Enter a competitor URL (e.g., `https://competitor.com/their-article`)
3. The system fetches the page using Jina/Firecrawl/Apify fallback chain
4. All phases run against the fetched content
5. No project prerequisites required

### Exporting Results
Click the **Export** dropdown in the dashboard:
- **CSV** — spreadsheet-friendly, one row per finding
- **HTML** — standalone dark-themed report (share with clients, no dependencies)
- **JSON** — full data for re-import or API integration

### Comparing Audits
After running 2+ audits:
1. Open the **Comparison View**
2. Select "Before" and "After" snapshots
3. See:
   - Overall score delta (+/-)
   - Per-phase score changes (green = improvement, red = regression)
   - New findings (appeared in "After")
   - Resolved findings (fixed since "Before")
   - Persistent findings (still present)

### Performance Correlation (GSC/GA4)
1. Go to **Settings > Google Search Console**
2. Click **Connect Google Search Console**
3. Authorize with your Google account
4. Select properties to track
5. The **Performance Trend Chart** shows:
   - Left Y-axis: Audit score over time (blue line)
   - Right Y-axis: Clicks (green) and Impressions (orange)
   - Correlation badge showing statistical relationship

### Audit History & Timeline
The **Timeline View** shows all historical audit scores as a chart. Track how your content improves over time as you fix findings.

### Content Merge Suggestions
The audit detects when pages on your site have significant content overlap. The **Content Merge Suggestions Panel** shows:
- Source and target URLs
- Overlap percentage
- Recommended action (merge, differentiate, or redirect)
- Cannibalization risks with shared entities and keywords

### Knowledge Graph Gaps
The **Knowledge Graph Gaps Panel** shows topics that should be covered but aren't, based on your EAV system. Each missing topic has an "Add to Plan" button.

---

## Google Search Console Setup

### Prerequisites
You need a Google Cloud Platform project with OAuth 2.0 credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the **Search Console API** and **Google Analytics Data API**
4. Go to **Credentials > Create Credentials > OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add authorized redirect URI: `https://your-domain.com/settings/oauth/callback`
7. Copy the **Client ID**

### Configuration
Add to your `.env.local`:
```
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

Add to your **Supabase Edge Function secrets**:
```
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

### Connecting
1. Go to **Settings** (gear icon)
2. Scroll to **Google Search Console** section
3. Click **Connect Google Search Console**
4. Authorize with your Google account
5. Your GSC properties will appear in the settings

### CSV Fallback
If you prefer not to connect via OAuth, you can **import GSC data as CSV** directly in the audit panel.

---

## Multilingual Support

The audit UI supports 5 languages:
- **English** (en) — default
- **Dutch** (nl)
- **German** (de)
- **French** (fr)
- **Spanish** (es)

The language is auto-detected from your project's business info settings. Language-specific rules (stop word lists, compound word detection) are applied automatically for DE, NL, FR, and ES content.

---

## Understanding Findings

Each finding has:

| Field | Meaning |
|-------|---------|
| **Severity** | critical / high / medium / low — determines score impact |
| **Title** | Short problem description |
| **Description** | Detailed explanation |
| **Why It Matters** | SEO impact explanation |
| **Current Value** | What the audit found |
| **Expected Value** | What it should be |
| **Example Fix** | Suggested code/text fix |
| **Auto-Fix** | Some findings have one-click fixes |
| **Impact** | Estimated business impact (high/medium/low) |

### Severity Priority
Fix findings in this order:
1. **Critical** — blocking issues that severely harm rankings
2. **High** — important issues with significant impact
3. **Medium** — optimization opportunities
4. **Low** — minor improvements

---

## Architecture Overview

```
User clicks "Audit"
        |
        v
AuditPrerequisiteGate  (checks Business Info, Pillars, EAVs)
        |
        v
UnifiedAuditOrchestrator
        |
        ├── ContentFetcher (if URL provided)
        ├── RelatedUrlDiscoverer (finds related pages)
        |
        └── Runs 15 Phases sequentially:
            ├── StrategicFoundationPhase  → SourceContextAligner, CentralEntityPositionChecker, AuthorEntityChecker
            ├── EavSystemPhase            → EavTextValidator
            ├── MicroSemanticsPhase       → MicroSemanticsValidator
            ├── InformationDensityPhase   → InformationDensityValidator
            ├── ContextualFlowPhase       → ContextualFlowValidator, ContentObstructionChecker
            ├── InternalLinkingPhase      → InternalLinkingValidator
            ├── SemanticDistancePhase     → SemanticDistanceAuditor
            ├── ContentFormatPhase        → ContentFormatValidator
            ├── HtmlTechnicalPhase        → HtmlNestingValidator, HtmlTechnicalValidator
            ├── MetaStructuredDataPhase   → CanonicalValidator, MetaValidator
            ├── CostOfRetrievalPhase      → CostOfRetrievalAuditor
            ├── UrlArchitecturePhase      → RedirectChainChecker
            ├── CrossPageConsistencyPhase → SignalConflictChecker, RobotsTxtParser
            ├── WebsiteTypeSpecificPhase  → WebsiteTypeRuleEngine
            └── FactValidationPhase       → FactValidator
        |
        v
UnifiedAuditReport (overall score, phase results, findings, merge suggestions, gaps)
        |
        v
UnifiedAuditDashboard (renders results)
        |
        ├── AuditScoreRing (overall score visualization)
        ├── PhaseScoreCard × 15 (per-phase breakdown)
        ├── AuditFindingCard × N (expandable findings)
        ├── ContentMergeSuggestionsPanel
        ├── KnowledgeGraphGapsPanel
        ├── AuditExportDropdown (CSV/HTML/JSON)
        ├── AuditComparisonView (before/after)
        ├── AuditTimelineView (historical scores)
        └── PerformanceTrendChart (GSC/GA4 correlation)
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `unified_audit_snapshots` | Stores audit results over time for comparison |
| `project_audit_config` | Per-project weight customization |
| `audit_schedules` | Future: automated periodic audits |
| `analytics_accounts` | Encrypted GSC/GA4 OAuth tokens |
| `analytics_sync_logs` | Data sync history and status |

---

## File Locations

| Area | Directory |
|------|-----------|
| UI Components | `components/audit/` |
| Core Services | `services/audit/` |
| Phase Adapters | `services/audit/phases/` |
| Rule Validators | `services/audit/rules/` |
| API Adapters | `services/audit/adapters/` |
| i18n Translations | `services/audit/i18n/` |
| Tests | `*/__tests__/` (co-located) |
| DB Migrations | `supabase/migrations/` |
