# Gap Analysis Step -- Complete Wireframes & Processing Pipeline

**Date**: 2026-02-23
**Status**: Design specification
**Depends on**: `2026-02-23-gap-analysis-semantic-seo-overhaul.md` (code-level fix plan)
**Impact**: Complete redesign of what the user sees and what happens behind the scenes for the Gap Analysis pipeline step.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Part 1: Processing Pipeline](#part-1-processing-pipeline)
3. [Part 2: UI Wireframes](#part-2-ui-wireframes)
4. [Part 3: Messaging Guidelines](#part-3-messaging-guidelines)
5. [Part 4: User Input Requirements](#part-4-user-input-requirements)

---

## 1. Design Principles

These five principles drive every design decision in this document:

```
P1  "The AI knows better" ........... Show the user things they could not
                                      have discovered on their own. Lead
                                      with insights, not raw data.

P2  "Educate while guiding" ......... Every label, every empty state, every
                                      tooltip teaches the user WHY this
                                      matters -- not just WHAT it is.

P3  "Wow through specificity" ....... Generic = boring. Every score, every
                                      gap, every recommendation references
                                      the user's actual Central Entity,
                                      content areas, and business context.

P4  "Less is more" .................. Show the most important finding first.
                                      Collapse details. Never overwhelm.

P5  "Minimum user input" ............ The user already configured everything
                                      in earlier steps. This step should
                                      require ONE click: "Run Analysis".
```

---

## Part 1: Processing Pipeline

### 1.1 Complete Data Flow Diagram

```
 INPUTS (already available -- no new user input)
 ================================================

 From Business Info Wizard + Pillar Wizard:
 +-------------------------------------------------+
 | centralEntity    "Koelman Dakwerken"             |
 | sourceContext     "Residential roofing..."        |
 | centralSearchIntent "Hire a certified roofer..." |
 | csiPredicates    ["hire","install","repair"...]   |
 | contentAreas     ["Dakbedekking","Dakisolatie"..] |
 | contentAreaTypes  ["revenue","authority"...]      |
 | domain           "koelmandakwerken.nl"            |
 | industry / targetMarket / language / region       |
 +-------------------------------------------------+

 From Pillar Wizard (EAV Inventory):
 +-------------------------------------------------+
 | eavs[]  User-defined semantic triples            |
 |   e.g. "Koelman Dakwerken -> opgericht_in: 1987" |
 |         category: ROOT / UNIQUE / RARE / COMMON  |
 +-------------------------------------------------+

 From Crawl Step:
 +-------------------------------------------------+
 | siteInventory[]  Crawled pages with URL, title,  |
 |   H1, meta, headings, word count                 |
 | gscData[]  GSC queries with pos/impr/clicks/CTR  |
 +-------------------------------------------------+

 From Google APIs (fetched during analysis):
 +-------------------------------------------------+
 | Knowledge Graph entity data                      |
 | Entity salience scores (NLP)                     |
 | Google Trends data                               |
 | GA4 metrics (if connected)                       |
 | URL Inspection results (if connected)            |
 +-------------------------------------------------+


 PROCESSING PIPELINE
 ====================

 +------------------------------------------------------------------+
 |  PHASE 0: RESOLVE FRAMEWORK CONTEXT          [~0s, sync]         |
 |                                                                  |
 |  Read from pillars (NOT from seedKeyword):                       |
 |    CE  = pillars.centralEntity                                   |
 |    SC  = pillars.sourceContext                                    |
 |    CSI = pillars.centralSearchIntent                             |
 |    predicates = pillars.csiPredicates                            |
 |    areas = pillars.contentAreas + contentAreaTypes                |
 |    userEAVs = activeMap.eavs[]                                   |
 |                                                                  |
 |  Framework concept: All downstream operations are entity-driven, |
 |  not keyword-driven. "Keywords inform, attributes structure."    |
 +------------------------------------------------------------------+
                       |
                       v
 +------------------------------------------------------------------+
 |  PHASE 1: GOOGLE API ENRICHMENT (PARALLEL)   [~5-15s]           |
 |                                                                  |
 |  All calls run via Promise.allSettled() -- partial failure OK.   |
 |                                                                  |
 |  1a. Knowledge Graph Lookup                                      |
 |      Input: CE (not seedKeyword)                                 |
 |      Returns: entity type, description, URL, authority score     |
 |      Framework: Validates CE exists in Google's KG               |
 |      User event: "Checking if Google recognizes 'Koelman         |
 |                    Dakwerken' as an entity..."                    |
 |                                                                  |
 |  1b. Entity Salience (NLP)                                       |
 |      Input: full page content from siteInventory (title + H1 +  |
 |             meta + ALL headings), NOT just titles                 |
 |      Measures: CE prominence across all crawled pages             |
 |      Framework: CoR -- is CE the most salient entity?            |
 |      User event: "Measuring how prominently 'Koelman Dakwerken' |
 |                    appears across your 23 pages..."              |
 |                                                                  |
 |  1c. Google Trends                                               |
 |      Input: CE (not seedKeyword)                                 |
 |      Returns: seasonality, peak months, related/rising queries   |
 |      Framework: Informs content timing strategy                  |
 |      User event: "Analyzing search interest trends for           |
 |                    'dakwerken' in Noord-Holland..."               |
 |                                                                  |
 |  1d. URL Inspection (if GSC connected)                           |
 |      Input: siteInventory URLs (up to 20)                        |
 |      Returns: indexation status per page                         |
 |      Framework: CoR -- indexed pages reduce retrieval cost       |
 |      User event: "Checking indexation status of your pages..."   |
 |                                                                  |
 |  1e. GA4 Metrics (if connected)                                  |
 |      Input: property ID, date range                              |
 |      Returns: sessions, bounce rate, top pages                   |
 |      Framework: Real user engagement signals                     |
 |      User event: "Loading real visitor data from Analytics..."   |
 |                                                                  |
 |  1f. GSC Data Enrichment (if loaded)                             |
 |      Input: gscData[] from earlier load                          |
 |      Extracts: quick wins, low CTR, zero-click queries           |
 |      Framework: Real ranking positions for gap prioritization    |
 |      User event: "Analyzing 247 real search queries from         |
 |                    Search Console..."                             |
 +------------------------------------------------------------------+
                       |
                       v
 +------------------------------------------------------------------+
 |  PHASE 2: ENTITY-DRIVEN QUERY GENERATION     [~5-10s, 1 AI call]|
 |                                                                  |
 |  AI Prompt contains (not just a flat keyword):                   |
 |    - Central Entity: "Koelman Dakwerken"                         |
 |    - Source Context: "Residential roofing installation..."        |
 |    - CSI: "Hire a certified roofer for residential projects"     |
 |    - CSI Predicates: ["hire","install","repair","maintain"]      |
 |    - Content Areas: ["Dakbedekking (revenue)","Dakisolatie..."]  |
 |    - User's existing EAVs (subjects + predicates)                |
 |    - Language: "nl", Region: "Noord-Holland"                     |
 |                                                                  |
 |  Generates queries across 5 framework-aligned categories:        |
 |    1. ATTRIBUTE GAP queries (predicates the user doesn't cover)  |
 |       e.g. "kosten dakbedekking per m2"                          |
 |    2. CSI-ALIGNED queries (match CSI predicates)                 |
 |       e.g. "dakdekker inhuren noord-holland"                     |
 |    3. PROCESS/EXPERTISE queries (how-to + trust)                 |
 |       e.g. "hoe lang duurt een dakrenovatie"                     |
 |    4. COMPARISON/COMMERCIAL queries (vs competitors)             |
 |       e.g. "beste dakdekker haarlem reviews"                     |
 |    5. TRUST/AUTHORITY queries (E-E-A-T signals)                  |
 |       e.g. "erkend dakdekker certificering nederland"            |
 |                                                                  |
 |  Each query tagged with:                                         |
 |    - intent (informational/commercial/transactional/navigational)|
 |    - content area alignment (which of the user's areas)          |
 |    - CSI predicate alignment (which predicate it serves)         |
 |    - query category (1-5 above)                                  |
 |                                                                  |
 |  If GSC data exists: enrich with real search volumes             |
 |                                                                  |
 |  Framework: Entity-driven query network, not generic "What is X" |
 |  User event: "We're building a query network specific to your    |
 |               business model and content areas..."               |
 +------------------------------------------------------------------+
                       |
                       v
 +------------------------------------------------------------------+
 |  PHASE 3: SERP ANALYSIS + COMPETITOR CRAWL   [~20-40s]          |
 |                                                                  |
 |  For each generated query (up to 10):                            |
 |    1. Fetch SERP results via DataForSEO (top 10 per query)      |
 |    2. Identify unique competitor URLs across all SERPs           |
 |    3. Note which queries the user's own domain appears in        |
 |                                                                  |
 |  For top competitors (up to 8 unique URLs):                      |
 |    1. Extract full page content via Jina                         |
 |    2. Analyze heading hierarchy (H1-H6 structure)                |
 |    3. Measure word count and content structure                   |
 |                                                                  |
 |  Framework: Competitive landscape mapping                        |
 |  User event: "Found 6 competitors ranking for your queries.     |
 |               Now extracting their content structure..."         |
 +------------------------------------------------------------------+
                       |
                       v
 +------------------------------------------------------------------+
 |  PHASE 4: COMPETITOR EAV EXTRACTION           [~15-30s]         |
 |                                                                  |
 |  For each competitor page, AI extracts EAV triples.              |
 |                                                                  |
 |  AI Prompt contains:                                             |
 |    - Central Entity (not seedKeyword)                            |
 |    - Source Context (for filtering irrelevant facts)             |
 |    - Industry context                                            |
 |    - Page content (up to 8000 chars)                             |
 |                                                                  |
 |  Returns per page:                                               |
 |    { entity, attribute, value, confidence }                      |
 |                                                                  |
 |  IMPORTANT: Category is NOT assigned per-page.                   |
 |  Categories are computed AFTER all pages are processed           |
 |  (see Phase 5).                                                  |
 |                                                                  |
 |  Framework: EAV extraction with SC-filtered relevance            |
 |  User event: "Extracting structured facts from competitor        |
 |               content. Found 47 facts across 6 competitors..."   |
 +------------------------------------------------------------------+
                       |
                       v
 +------------------------------------------------------------------+
 |  PHASE 5: OWN CONTENT ANALYSIS                [~10-20s]         |
 |                                                                  |
 |  Strategy A (preferred): Use siteInventory from Crawl step       |
 |    - Analyze up to 10 own pages via Jina                         |
 |    - Extract EAVs from own content using same prompt             |
 |    - Analyze heading hierarchy for own pages                     |
 |                                                                  |
 |  Strategy B (fallback): Find own domain in SERP results          |
 |    - Collect own pages found in competitor SERPs                 |
 |    - Analyze up to 5 own SERP pages                              |
 |                                                                  |
 |  Framework: Self-assessment of current content state             |
 |  User event: "Now analyzing YOUR content to find what you're     |
 |               already doing well and where gaps exist..."        |
 +------------------------------------------------------------------+
                       |
                       v
 +------------------------------------------------------------------+
 |  PHASE 6: CROSS-PAGE EAV CATEGORY ASSIGNMENT  [sync, algorithmic]|
 |                                                                  |
 |  After ALL competitor and own EAVs are collected, assign         |
 |  categories based on CROSS-PAGE FREQUENCY (not AI per-page):    |
 |                                                                  |
 |  For each unique (entity, attribute) pair:                       |
 |    sourceCount = number of distinct competitor URLs               |
 |    totalCompetitors = total unique competitor domains             |
 |                                                                  |
 |    if sourceCount >= 80% of totalCompetitors:                    |
 |      category = ROOT    (everyone has it -- foundational)        |
 |    elif sourceCount >= 40% of totalCompetitors:                  |
 |      category = COMMON  (most competitors have it)               |
 |    elif sourceCount >= 2:                                        |
 |      category = RARE    (only some have it -- depth signal)      |
 |    else:                                                         |
 |      category = UNIQUE  (only 1 source -- differentiator)        |
 |                                                                  |
 |  Framework: EAV categories are a MARKET property, not a          |
 |  per-page property. ROOT means "the market expects this".        |
 |  UNIQUE means "this is a differentiator".                        |
 +------------------------------------------------------------------+
                       |
                       v
 +------------------------------------------------------------------+
 |  PHASE 7: SEMANTIC GAP DETECTION              [sync, algorithmic]|
 |                                                                  |
 |  Compare own EAVs against competitor EAVs using SEMANTIC         |
 |  MATCHING (not exact string matching):                           |
 |                                                                  |
 |  For each competitor (entity, attribute) pair:                   |
 |    1. Normalize: lowercase, strip diacritics, stem tokens        |
 |    2. Compute token overlap against each own EAV pair            |
 |    3. If best overlap > 0.6: MATCHED (not a gap)                 |
 |    4. If best overlap <= 0.6: GAP detected                       |
 |                                                                  |
 |  Also cross-reference against user's STRATEGIC EAVs:             |
 |    - User already defined EAVs in Pillar Wizard                  |
 |    - If competitor attribute matches a user-defined predicate    |
 |      but user has no content for it yet: STRATEGIC GAP           |
 |                                                                  |
 |  Priority calculation (category-weighted, not frequency-only):   |
 |    ROOT attribute missing    -> CRITICAL (must have)             |
 |    UNIQUE attribute missing  -> HIGH (differentiator)            |
 |    COMMON + high frequency   -> HIGH (expected by market)        |
 |    COMMON + low frequency    -> MEDIUM                           |
 |    RARE attribute missing    -> MEDIUM (depth opportunity)       |
 |                                                                  |
 |  Framework: ROOT > UNIQUE > COMMON (high freq) > RARE > COMMON  |
 |  User event: "We found 12 gaps. 3 are critical -- every          |
 |               competitor covers these but you don't."            |
 +------------------------------------------------------------------+
                       |
                       v
 +------------------------------------------------------------------+
 |  PHASE 8: INFORMATION DENSITY SCORING         [sync, algorithmic]|
 |                                                                  |
 |  For own content:                                                |
 |    - factsPerSentence = ownEAVCount / sentenceCount              |
 |    - uniqueEntities, uniqueAttributes                            |
 |    - densityScore (0-100)                                        |
 |                                                                  |
 |  For each competitor:                                            |
 |    - Same metrics per competitor URL                             |
 |                                                                  |
 |  Compute:                                                        |
 |    - competitorAverage (mean across all competitors)             |
 |    - topCompetitor (highest scoring)                             |
 |                                                                  |
 |  FIX: Use actual page content for density, not empty string.     |
 |  FIX: If own content not available, return null (not 100).       |
 |                                                                  |
 |  Framework: Information density = facts per unit of content.     |
 |  Higher density = lower Cost of Retrieval.                       |
 +------------------------------------------------------------------+
                       |
                       v
 +------------------------------------------------------------------+
 |  PHASE 9: FRAMEWORK-ALIGNED SCORING           [sync, algorithmic]|
 |                                                                  |
 |  Replace generic "Overall Health" with framework dimensions:     |
 |                                                                  |
 |  1. EAV Completeness (weight: 30%)                               |
 |     = (own EAV count / market average EAV count) * 100           |
 |     null if no own content analyzed                               |
 |     Framework: Do you cover the facts the market expects?        |
 |                                                                  |
 |  2. Semantic Density (weight: 25%)                               |
 |     = (own facts/sentence / competitor avg facts/sentence) * 100 |
 |     null if no own content analyzed                               |
 |     Framework: How dense is your factual content?                |
 |                                                                  |
 |  3. Entity Coverage (weight: 25%)                                |
 |     = (own unique entities / market unique entities) * 100       |
 |     null if no own content analyzed                               |
 |     Framework: How many entities in the topical space do you     |
 |                cover?                                            |
 |                                                                  |
 |  4. Content Structure (weight: 20%)                              |
 |     = average heading hierarchy score across own pages           |
 |     null if no heading data available                             |
 |     Framework: Proper H1-H6 structure lowers CoR                 |
 |                                                                  |
 |  CRITICAL RULE: Return null for any unmeasured dimension.        |
 |  NEVER use hardcoded fallbacks (no more "20", "15", "60").       |
 |  Show "Not measured" in UI instead of fake scores.               |
 |                                                                  |
 |  Overall Score:                                                  |
 |     = weighted average of non-null dimensions                    |
 |     null if ALL dimensions are null                               |
 +------------------------------------------------------------------+
                       |
                       v
 +------------------------------------------------------------------+
 |  PHASE 10: RECOMMENDATION GENERATION          [sync, algorithmic]|
 |                                                                  |
 |  Generate actionable recommendations with framework context:     |
 |                                                                  |
 |  Each recommendation includes:                                   |
 |    - Which EAV category drives it (ROOT/UNIQUE/RARE/COMMON)     |
 |    - Which content area it belongs to                             |
 |    - Which CSI predicate it serves                               |
 |    - Specific content format suggestion                          |
 |    - Whether it's Core Section or Author Section content         |
 |                                                                  |
 |  Priority order:                                                 |
 |    1. CRITICAL: Missing ROOT attributes (market baseline)        |
 |    2. HIGH: GSC quick wins (positions 4-20, real traffic)        |
 |    3. HIGH: Missing UNIQUE attributes (differentiators)          |
 |    4. MEDIUM: Low CTR queries (ranking but no clicks)            |
 |    5. MEDIUM: RARE attributes (depth opportunities)              |
 |    6. LOW: COMMON attributes with low frequency                  |
 |                                                                  |
 |  Also integrates existing eavService.ts functions:               |
 |    - getMissingPredicates() from eavService                      |
 |    - getHighPriorityMissing() from eavService                    |
 |    - calculateIndustryCoverage() from eavService                 |
 |                                                                  |
 |  Framework: Recommendations are prioritized by framework         |
 |  importance (ROOT > UNIQUE > RARE > COMMON) and connected to    |
 |  the user's content areas and CSI predicates.                    |
 +------------------------------------------------------------------+
                       |
                       v
 +------------------------------------------------------------------+
 |  PHASE 11: PERSIST + DISPLAY                                     |
 |                                                                  |
 |  1. Save result to activeMap.analysis_state.gap_analysis         |
 |  2. Save to query_network_audits table (history)                 |
 |  3. Set pipeline step status to pending_approval                 |
 |  4. Render results in UI (see Part 2)                            |
 +------------------------------------------------------------------+
```

### 1.2 AI Prompt Architecture

Each AI call uses the full framework context. Here is the prompt structure:

```
PROMPT STRUCTURE FOR ALL GAP ANALYSIS AI CALLS
===============================================

SYSTEM CONTEXT BLOCK (prepended to every prompt):
--------------------------------------------------
You are analyzing content for a Holistic SEO strategy.

Central Entity (CE): {pillars.centralEntity}
  This is the single main entity the website is about.

Source Context (SC): {pillars.sourceContext}
  This describes who they are and how they monetize.

Central Search Intent (CSI): {pillars.centralSearchIntent}
  This is the unified action connecting CE and SC.

CSI Predicates: {pillars.csiPredicates.join(', ')}
  These are the verbs/actions the audience takes.

Content Areas: {pillars.contentAreas.map((a,i) =>
  `${a} (${pillars.contentAreaTypes[i]})`).join(', ')}
  These are the topic clusters, tagged as revenue or authority.

Industry: {businessInfo.industry}
Target Market: {businessInfo.targetMarket}
Language: {businessInfo.language}
Region: {businessInfo.region}

Existing EAVs (the user has already defined these facts):
{userEAVs.map(e =>
  `${e.subject.label} -> ${e.predicate.relation}: ${e.object.value} [${e.category}]`
).join('\n')}
--------------------------------------------------

This block replaces the current approach of passing a single
"seedKeyword" string with generic industry/market context.
```

---

## Part 2: UI Wireframes

### 2.1 State 1: Before Analysis (user arrives at Gap Analysis step)

The user has just completed the Crawl step and arrives at Gap Analysis.
Everything they need is already configured. The screen communicates
confidence: "We know your business. One click to analyze."

```
+============================================================================+
|                                                                            |
|  GAP ANALYSIS                                                              |
|  Discover what's missing from your content and what competitors            |
|  do differently -- based on your specific business model.                  |
|                                                                            |
+============================================================================+
|                                                                            |
|  YOUR FRAMEWORK CONTEXT (auto-loaded from earlier steps)                   |
|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~                    |
|  We'll analyze your site using the strategy you defined:                   |
|                                                                            |
|  +--------------------------------------------------------------------+   |
|  |                                                                    |   |
|  |  Central Entity     Koelman Dakwerken                              |   |
|  |  Source Context      Residential roofing installation and repair   |   |
|  |                      services in Noord-Holland                     |   |
|  |  Search Intent       Hire a certified roofer for residential       |   |
|  |                      projects                                      |   |
|  |  Content Areas       Dakbedekking  Dakisolatie  Dakonderhoud      |   |
|  |                      Noodgevallen                                  |   |
|  |                      [revenue]     [revenue]    [authority]        |   |
|  |                      [revenue]                                     |   |
|  |  Your EAVs           14 facts defined (7 ROOT, 3 UNIQUE, 4 RARE) |   |
|  |  Crawled Pages        23 pages from koelmandakwerken.nl           |   |
|  |                                                                    |   |
|  +--------------------------------------------------------------------+   |
|                                                                            |
|  +- DATA SOURCES -------------------------------------------------------+ |
|  |                                                                       | |
|  |  [*] Google Search Console    Connected: sc-domain:koelmandakwerken.nl| |
|  |                                247 queries loaded                     | |
|  |  [*] Google Analytics 4       Connected: Koelman Dakwerken            | |
|  |  [ ] Google Knowledge Graph   API key configured                      | |
|  |  [ ] Google NLP / Salience    API key configured                      | |
|  |  [ ] Google Trends            API key configured                      | |
|  |                                                                       | |
|  |  i  More data sources = richer analysis. But the analysis works       | |
|  |     without any of them -- AI + SERP analysis are always available.   | |
|  |                                                                       | |
|  +-----------------------------------------------------------------------+ |
|                                                                            |
|  WHAT THIS ANALYSIS DOES                                                   |
|  ~~~~~~~~~~~~~~~~~~~~~~~                                                   |
|  In plain language -- the analysis will:                                   |
|                                                                            |
|  1. Search Google for queries your customers actually use                  |
|  2. Analyze what your top competitors write about                          |
|  3. Extract the facts (EAVs) competitors cover that you don't             |
|  4. Score your content against the market benchmark                        |
|  5. Prioritize exactly what to write next                                  |
|                                                                            |
|  Duration: approximately 2-4 minutes depending on competitor count.        |
|                                                                            |
|  +================================================================+       |
|  |                                                                |       |
|  |              [ Run Gap Analysis ]                              |       |
|  |                                                                |       |
|  |   i  This will use your AI provider (Gemini Flash) and         |       |
|  |      approximately 5-10 API calls. Estimated cost: <EUR 0.05    |       |
|  |                                                                |       |
|  +================================================================+       |
|                                                                            |
|  +- PREVIOUS ANALYSES (2 available) --------------------------------+     |
|  |  [v] Show previous analyses                                       |     |
|  +-------------------------------------------------------------------+     |
|                                                                            |
+============================================================================+
```

**Key design decisions:**
- Framework context shown at top so user confirms "yes, this is my business"
- Data sources shown as a collapsible panel (already configured, just status)
- The "What this analysis does" section educates in plain language
- Single primary CTA: "Run Gap Analysis"
- No seed keyword input field (CE is used automatically)
- No domain input field (domain is already known)
- No max queries/competitors sliders (sensible defaults, advanced settings hidden)
- Cost estimate shown to build trust
- History collapsed by default

---

### 2.2 State 2: During Analysis (analysis is running)

Two-column layout: left = narrative feed, right = progress phases.
Educational messages explain each phase in the user's business context.

```
+============================================================================+
|                                                                            |
|  GAP ANALYSIS                                                              |
|  Analyzing koelmandakwerken.nl against the market...                       |
|                                                                            |
+============================================================================+
|                                                                            |
|  +-LIVE ANALYSIS FEED--------------------+  +-PROGRESS------------------+  |
|  |                                       |  |                           |  |
|  |  (*) Starting analysis for            |  |  [##########] Phase 1/7   |  |
|  |      "Koelman Dakwerken"...           |  |                           |  |
|  |                                       |  |  [*] Google APIs          |  |
|  |  (*) Loading 247 GSC queries          |  |      Checking KG, NLP,   |  |
|  |      478,231 total impressions        |  |      Trends, GA4, URL    |  |
|  |                                       |  |      inspection...        |  |
|  |  [*] Google recognizes "Koelman       |  |                           |  |
|  |      Dakwerken" as an Organization    |  |  [ ] Query Generation     |  |
|  |      Authority score: 42/100          |  |      Build CE-driven      |  |
|  |                                       |  |      query network        |  |
|  |  WHY THIS MATTERS: Being recognized   |  |                           |  |
|  |  in Google's Knowledge Graph means    |  |  [ ] SERP Analysis        |  |
|  |  Google already treats your business  |  |      Fetch competitor     |  |
|  |  as a known entity. This is the       |  |      rankings             |  |
|  |  foundation of entity-based SEO.      |  |                           |  |
|  |  Score 42/100 means there's room to   |  |  [ ] Competitor EAVs      |  |
|  |  strengthen your entity signals.      |  |      Extract structured   |  |
|  |                                       |  |      facts                |  |
|  |  [*] Your CE "Koelman Dakwerken"      |  |                           |  |
|  |      salience: 67% (rank #1 of 8)     |  |  [ ] Own Content          |  |
|  |      across your 23 pages             |  |      Analyze your pages   |  |
|  |                                       |  |                           |  |
|  |  GOOD NEWS: Your central entity is    |  |  [ ] Gap Detection        |  |
|  |  the most prominent entity on your    |  |      Find missing facts   |  |
|  |  site. This is exactly what search    |  |                           |  |
|  |  engines need to understand what      |  |  [ ] Scoring              |  |
|  |  your site is about.                  |  |      Calculate scores     |  |
|  |                                       |  |                           |  |
|  |  [~] Seasonal pattern detected:       |  +---------------------------+  |
|  |      Peak months: Mar, Apr, Sep       |  |                              |
|  |      Seasonality strength: 71%        |  |  Did you know?               |
|  |                                       |  |  ~~~~~~~~~~~~                |
|  |  PLANNING TIP: Your industry peaks    |  |  Search engines understand   |
|  |  in March-April and September.        |  |  your website by extracting  |
|  |  Plan content publication 4-6 weeks   |  |  facts (Entity-Attribute-    |
|  |  before these periods for maximum     |  |  Value triples) from your    |
|  |  impact.                              |  |  content. The more accurate  |
|  |                                       |  |  and consistent these facts  |
|  |  [~] Building query network for       |  |  are across your pages, the  |
|  |      4 content areas...               |  |  easier it is for Google to  |
|  |      Using 5 CSI predicates as        |  |  understand and rank your    |
|  |      query generators                 |  |  content.                    |
|  |                                       |  |                              |
|  |  ...                                  |  |  This analysis measures      |
|  |  (auto-scrolls)                       |  |  exactly that.               |
|  |                                       |  |                              |
|  +-LIVE ANALYSIS FEED--------------------+  +------------------------------+
|                                                                            |
+============================================================================+
```

**Key design decisions:**
- Narrative feed events include "WHY THIS MATTERS" educational callouts
- Every event references the user's actual CE, domain, content areas
- Progress phases use plain language, not technical jargon
- "Did you know?" sidebar educates about EAVs in simple terms
- Seasonal pattern immediately provides an actionable planning tip
- Entity salience gives positive reinforcement when score is good
- Knowledge Graph result explained in business terms

**Educational messages per phase:**

| Phase | User-facing message | Educational callout |
|-------|-------------------|-------------------|
| Google APIs | "Checking if Google recognizes '{CE}' as an entity..." | "Being in Google's Knowledge Graph means Google treats your business as a known entity, not just a keyword." |
| Query Generation | "Building a query network around your 4 content areas using your CSI predicates..." | "Instead of guessing keywords, we derive queries from your business model -- the actions your customers take." |
| SERP Analysis | "Found 6 competitors ranking for your queries. Extracting their content..." | "We analyze the actual pages ranking for your queries, not generic competitor lists." |
| EAV Extraction | "Extracting structured facts from competitor content. Found 47 facts..." | "Facts (EAVs) are how search engines understand content. More relevant facts = higher authority." |
| Own Content | "Now analyzing YOUR content to compare against the market..." | "This is where we find the gaps -- facts competitors cover that you don't yet." |
| Gap Detection | "We found 12 gaps. 3 are critical ROOT attributes every competitor covers." | "ROOT facts are baseline expectations. Missing them means Google doesn't see you as a complete source." |
| Scoring | "Calculating your position against the market benchmark..." | "Scores are relative to your specific market, not arbitrary benchmarks." |

---

### 2.3 State 3: After Analysis -- Results Display

Results are organized into collapsible sections. The most actionable
information is shown first. Less is more.

#### 2.3a Competitive Position Summary (the scores)

```
+============================================================================+
|                                                                            |
|  GAP ANALYSIS RESULTS                                     [Export v]       |
|  for Koelman Dakwerken | koelmandakwerken.nl              [New Analysis]   |
|  Analysis date: 23 Feb 2026, 14:32                                        |
|                                                                            |
+============================================================================+
|                                                                            |
|  YOUR COMPETITIVE POSITION                                                 |
|  How your content compares to the market for your specific business.       |
|                                                                            |
|  +----------+  +----------+  +----------+  +----------+  +----------+     |
|  |          |  |          |  |          |  |          |  |          |     |
|  |    62    |  |    58    |  |    71    |  |    --    |  |    45    |     |
|  |   /100   |  |   /100   |  |   /100   |  | Not yet |  |   /100   |     |
|  |          |  |          |  |          |  |measured  |  |          |     |
|  |  [====.] |  |  [===..] |  |  [====.] |  |  [     ] |  |  [==...] |     |
|  |  yellow  |  |  yellow  |  |  green   |  |  gray    |  |  orange  |     |
|  |          |  |          |  |          |  |          |  |          |     |
|  | OVERALL  |  |  EAV     |  |SEMANTIC  |  |CONTENT   |  | ENTITY   |     |
|  | POSITION |  |COMPLETE- |  |DENSITY   |  |STRUCTURE |  |COVERAGE  |     |
|  |          |  |  NESS    |  |          |  |          |  |          |     |
|  +----------+  +----------+  +----------+  +----------+  +----------+     |
|                                                                            |
|  [i] What do these scores mean?                                            |
|                                                                            |
|  +- (expanded on click) -----------------------------------------------+  |
|  |                                                                     |  |
|  |  OVERALL POSITION: Weighted average of all measured dimensions.     |  |
|  |  62/100 means you're above average but have clear gaps to fill.     |  |
|  |                                                                     |  |
|  |  EAV COMPLETENESS: You cover 58% of the facts your competitors     |  |
|  |  cover. The missing 42% are listed in "Content Gaps" below.        |  |
|  |                                                                     |  |
|  |  SEMANTIC DENSITY: Your content packs 71% as many facts per        |  |
|  |  sentence as the market leader. This is good -- your content is    |  |
|  |  relatively fact-rich.                                              |  |
|  |                                                                     |  |
|  |  CONTENT STRUCTURE: Not measured because heading data was not       |  |
|  |  available for your pages. (This is honest -- we don't fake it.)   |  |
|  |                                                                     |  |
|  |  ENTITY COVERAGE: You mention 45% of the entities your competitors |  |
|  |  discuss. Expanding your topical breadth will improve this.        |  |
|  |                                                                     |  |
|  +---------------------------------------------------------------------+  |
|                                                                            |
+============================================================================+
```

**Key design decisions:**
- Scores use framework-aligned labels (not "Overall Health" or "Info Density")
- Unmeasured dimensions show "--" and "Not yet measured" (not fake scores)
- Color coding: green (>=80), yellow (60-79), orange (40-59), red (<40), gray (null)
- Expandable explanation translates each score into plain business language
- Every explanation references the user's actual data ("you cover 58%...")

#### 2.3b Content Gaps (what competitors have that you don't)

```
+============================================================================+
|                                                                            |
|  CONTENT GAPS                                                              |
|  Facts your competitors cover that are missing from your content.          |
|  Sorted by importance: foundational facts first, then differentiators.     |
|                                                                            |
|  12 gaps found | 3 critical | 5 high | 4 medium                           |
|                                                                            |
|  +- CRITICAL: Foundational gaps (every competitor covers these) --------+ |
|  |                                                                       | |
|  |  [!] dakbedekking -> gemiddelde_kosten_per_m2          [ROOT]        | |
|  |      Missing: Average cost per square meter for roofing              | |
|  |      Found in: 5 of 6 competitors                                    | |
|  |      Example value: "EUR 45-85 per m2 afhankelijk van materiaal"      | |
|  |      Content area: Dakbedekking (revenue)                            | |
|  |                                                                       | |
|  |      WHY THIS MATTERS: This is a ROOT fact -- the most basic         | |
|  |      information customers expect. Without it, search engines see    | |
|  |      your content as incomplete compared to every competitor.         | |
|  |                                                                       | |
|  |      SUGGESTED ACTION: Add a pricing section to your Dakbedekking    | |
|  |      hub page with cost ranges per material type.                    | |
|  |      Format: comparison table with columns per material.             | |
|  |                                                                       | |
|  |  [!] dakisolatie -> isolatiewaarde_Rd                  [ROOT]        | |
|  |      Missing: Insulation R-value specifications                      | |
|  |      Found in: 4 of 6 competitors                                    | |
|  |      Content area: Dakisolatie (revenue)                             | |
|  |      ...                                                              | |
|  |                                                                       | |
|  |  [!] dakdekker -> certificering_erkend                 [ROOT]        | |
|  |      Missing: Professional certifications                            | |
|  |      Found in: 5 of 6 competitors                                    | |
|  |      Content area: (cross-cutting -- Author Section)                 | |
|  |      ...                                                              | |
|  |                                                                       | |
|  +-----------------------------------------------------------------------+ |
|                                                                            |
|  +- HIGH: Differentiator gaps (could set you apart) -------------------+ |
|  |                                                                       | |
|  |  [*] Koelman Dakwerken -> garantievoorwaarden          [UNIQUE]      | |
|  |      Missing: Guarantee terms and conditions                         | |
|  |      Found in: 2 of 6 competitors                                    | |
|  |      YOUR EAV SAYS: You defined "garantie_periode: 15 jaar"         | |
|  |      but this fact doesn't appear in your published content.         | |
|  |                                                                       | |
|  |      WHY THIS MATTERS: You already know this fact (you defined       | |
|  |      it in your EAV inventory!). But competitors who publish it      | |
|  |      outperform those who don't. This is low-hanging fruit.          | |
|  |                                                                       | |
|  |      SUGGESTED ACTION: Add guarantee details to your service pages.  | |
|  |      This directly serves your CSI: "Hire a certified roofer"       | |
|  |      because guarantees build hiring confidence.                     | |
|  |                                                                       | |
|  |  [*] dakrenovatie -> doorlooptijd_dagen                [UNIQUE]      | |
|  |      Missing: Project duration in days                               | |
|  |      Found in: 1 of 6 competitors (differentiator!)                  | |
|  |      ...                                                              | |
|  |                                                                       | |
|  +-----------------------------------------------------------------------+ |
|                                                                            |
|  +- MEDIUM: Depth opportunities ----------------------------------------+ |
|  |  [v] Show 4 medium-priority gaps                                      | |
|  +-----------------------------------------------------------------------+ |
|                                                                            |
+============================================================================+
```

**Key design decisions:**
- Gaps grouped by severity (CRITICAL > HIGH > MEDIUM), not alphabetically
- Each gap shows: EAV category badge, content area, competitor count
- "WHY THIS MATTERS" for every critical gap -- educates on ROOT vs UNIQUE
- "SUGGESTED ACTION" includes format suggestion (table, section, FAQ)
- Cross-references user's OWN EAVs: "You defined this but haven't published it"
- Connects gaps to CSI predicates: "This serves your CSI: Hire a roofer"
- Medium-priority gaps collapsed by default (less is more)
- Category badge colors: ROOT=red, UNIQUE=purple, RARE=blue, COMMON=gray

#### 2.3c Query Opportunities (queries to target)

```
+============================================================================+
|                                                                            |
|  QUERY OPPORTUNITIES                                                       |
|  Search queries your customers use, organized by your content areas.       |
|  Queries are derived from your business model, not generic suggestions.    |
|                                                                            |
+============================================================================+
|                                                                            |
|  +- DAKBEDEKKING (Revenue -- Core Section) -------- 4 queries -----------+|
|  |                                                                        ||
|  |  "kosten dakbedekking per m2"                                          ||
|  |  [transactional] [CSI: hire] [GSC: pos 14, 320 impr]                  ||
|  |  You rank #14 -- this is a quick win. Optimize existing content.       ||
|  |  Suggested format: Pricing table + calculator                          ||
|  |                                                                        ||
|  |  "beste dakbedekking materialen vergelijken"                           ||
|  |  [commercial] [CSI: install]                                           ||
|  |  Competitors ranking: dakdekkersvergelijker.nl, bouwinfo.nl            ||
|  |  Suggested format: Comparison table with pros/cons                     ||
|  |                                                                        ||
|  |  "dakbedekking vervangen wanneer nodig"                                ||
|  |  [informational] [CSI: maintain]                                       ||
|  |  No competitor dominates this -- opportunity to own the topic.         ||
|  |  Suggested format: Decision guide with checklist                       ||
|  |                                                                        ||
|  |  "levensduur dakpannen vs bitumen"                                     ||
|  |  [informational] [CSI: install]                                        ||
|  |  Suggested format: Comparison article with data table                  ||
|  |                                                                        ||
|  +------------------------------------------------------------------------+|
|                                                                            |
|  +- DAKISOLATIE (Revenue -- Core Section) ---------- 3 queries -----------+|
|  |                                                                        ||
|  |  "dakisolatie kosten subsidie 2026"                                    ||
|  |  [transactional] [CSI: hire] [GSC: pos 8, 890 impr]                   ||
|  |  ...                                                                   ||
|  |                                                                        ||
|  +------------------------------------------------------------------------+|
|                                                                            |
|  +- DAKONDERHOUD (Authority -- Author Section) ---- 2 queries -----------+|
|  |                                                                        ||
|  |  "hoe vaak dak laten inspecteren"                                      ||
|  |  [informational] [CSI: inspect]                                        ||
|  |  This is Author Section content -- builds authority, not revenue.      ||
|  |  Suggested format: FAQ + seasonal maintenance calendar                 ||
|  |                                                                        ||
|  +------------------------------------------------------------------------+|
|                                                                            |
|  +- NOODGEVALLEN (Revenue -- Core Section) --------- 1 query ------------+|
|  |                                                                        ||
|  |  "daklekkage spoed dakdekker Noord-Holland"                            ||
|  |  [transactional] [CSI: hire]                                           ||
|  |  ...                                                                   ||
|  |                                                                        ||
|  +------------------------------------------------------------------------+|
|                                                                            |
|  +- GSC QUICK WINS (Real search data) ------------ 5 queries ------------+|
|  |                                                                        ||
|  |  These queries come from YOUR actual search data. You already rank     ||
|  |  for them -- small optimizations can move you to page 1.               ||
|  |                                                                        ||
|  |  "dakdekker haarlem"          pos 7  | 1,240 impr | 2.1% CTR          ||
|  |  ACTION: You're on page 1 but CTR is low. Improve title tag and       ||
|  |  meta description to include your guarantee (15 jaar).                 ||
|  |                                                                        ||
|  |  "daklekkage reparatie kosten" pos 12 | 890 impr  | 0.8% CTR          ||
|  |  ACTION: Position 12 = page 2. Add a dedicated pricing section        ||
|  |  with the ROOT facts identified above (kosten per m2).                ||
|  |                                                                        ||
|  |  ...                                                                   ||
|  |                                                                        ||
|  +------------------------------------------------------------------------+|
|                                                                            |
+============================================================================+
```

**Key design decisions:**
- Queries grouped by CONTENT AREA (from user's pillars), not by intent
- Each content area tagged as Revenue/Authority (Core/Author Section)
- CSI predicate alignment shown as badge: [CSI: hire], [CSI: install]
- GSC data overlaid where available: actual position and impressions
- Quick wins highlighted as separate section with specific actions
- Suggested FORMAT for each query (table, guide, FAQ, calculator)
- Authority section queries explicitly labeled as "not revenue"

#### 2.3d Google API Insights

```
+============================================================================+
|                                                                            |
|  GOOGLE API INSIGHTS                                                       |
|  What Google's own tools reveal about your online presence.                |
|                                                                            |
+============================================================================+
|                                                                            |
|  +----------------------------------------------------------------------+ |
|  |  KNOWLEDGE GRAPH                                                      | |
|  |  Does Google recognize your business as an entity?                    | |
|  |                                                                       | |
|  |  [*] "Koelman Dakwerken" found as Organization                       | |
|  |      Authority score: 42/100                                          | |
|  |                                                                       | |
|  |  WHAT THIS MEANS FOR YOU:                                             | |
|  |  Google already knows your business exists. This is the foundation    | |
|  |  of entity-based SEO. Your authority score of 42 means Google has     | |
|  |  some confidence in your entity, but there's significant room to      | |
|  |  grow. Competitors with scores above 70 get preferential treatment    | |
|  |  in search results.                                                   | |
|  |                                                                       | |
|  |  HOW TO IMPROVE:                                                      | |
|  |  - Add consistent NAP (Name, Address, Phone) across all pages        | |
|  |  - Implement Organization schema with sameAs links                    | |
|  |  - Get mentions on authoritative Dutch business directories           | |
|  |  - Ensure your business appears on Google Maps with reviews           | |
|  +----------------------------------------------------------------------+ |
|                                                                            |
|  +----------------------------------------------------------------------+ |
|  |  ENTITY SALIENCE (NLP Analysis)                                       | |
|  |  How prominently does your Central Entity appear across your site?    | |
|  |                                                                       | |
|  |  [*] "Koelman Dakwerken" salience: 67% (rank #1 of 8 entities)      | |
|  |                                                                       | |
|  |  WHAT THIS MEANS FOR YOU:                                             | |
|  |  Your central entity is the most prominent entity on your website.    | |
|  |  This is correct -- it means Google can clearly identify what your    | |
|  |  site is about. The 67% salience means 67% of entity signals on      | |
|  |  your pages point to "Koelman Dakwerken".                            | |
|  |                                                                       | |
|  |  The other 7 entities detected are likely your services (dakbedekking,| |
|  |  dakisolatie) and location (Noord-Holland). These should be related  | |
|  |  to your CE, not competing with it.                                   | |
|  +----------------------------------------------------------------------+ |
|                                                                            |
|  +----------------------------------------------------------------------+ |
|  |  SEARCH TRENDS                                                        | |
|  |  When do people search for your services?                             | |
|  |                                                                       | |
|  |  Pattern: SEASONAL (strength: 71%)                                    | |
|  |  Peak months: March, April, September                                | |
|  |                                                                       | |
|  |     Jan  Feb  [MAR] [APR] May  Jun  Jul  Aug  [SEP] Oct  Nov  Dec   | |
|  |      -    -    ^^^   ^^^   -    -    -    -    ^^^   -    -    -     | |
|  |                                                                       | |
|  |  WHAT THIS MEANS FOR YOU:                                             | |
|  |  Your industry has strong seasonal demand. Content published 4-6      | |
|  |  weeks before peak months has the highest impact.                     | |
|  |                                                                       | |
|  |  PUBLISHING CALENDAR:                                                 | |
|  |  - Publish new Dakbedekking content: January-February                | |
|  |  - Publish Noodgevallen content: August (before autumn storms)       | |
|  |  - Refresh all pages: January (pre-spring) and August (pre-autumn)   | |
|  +----------------------------------------------------------------------+ |
|                                                                            |
|  +----------------------------------------------------------------------+ |
|  |  INDEXATION STATUS                                                    | |
|  |  Are your pages visible to Google?                                    | |
|  |                                                                       | |
|  |  21/23 pages indexed | 2 blocked by robots.txt                       | |
|  |                                                                       | |
|  |  WHAT THIS MEANS FOR YOU:                                             | |
|  |  2 pages are blocked from Google's index. These pages exist on your   | |
|  |  site but Google cannot see them. Check if this is intentional.       | |
|  |                                                                       | |
|  |  Blocked pages:                                                       | |
|  |  - /staging/dakbedekking-test (likely intentional)                   | |
|  |  - /diensten/dakisolatie-oud  (may be unintentional -- check)        | |
|  +----------------------------------------------------------------------+ |
|                                                                            |
|  +----------------------------------------------------------------------+ |
|  |  VISITOR DATA (GA4)                                                   | |
|  |  How visitors interact with your site                                 | |
|  |                                                                       | |
|  |  1,247 sessions/week | 43% bounce rate | Top: /dakbedekking           | |
|  |                                                                       | |
|  |  WHAT THIS MEANS FOR YOU:                                             | |
|  |  Your bounce rate of 43% is healthy (below 50% is good). Your        | |
|  |  top-performing page (/dakbedekking) aligns with your highest         | |
|  |  revenue content area. This confirms your content strategy is         | |
|  |  directionally correct.                                               | |
|  +----------------------------------------------------------------------+ |
|                                                                            |
|  +-NOT AVAILABLE----------------------------------------------------------+|
|  |  GOOGLE API INSIGHT: Entity Verification via Wikidata                  ||
|  |                                                                        ||
|  |  This insight is available when you add a Google Cloud API key in      ||
|  |  Settings. It verifies your entity against Wikidata and measures      ||
|  |  cross-platform consistency (Knowledge-Based Trust).                   ||
|  |                                                                        ||
|  |  Why it matters: Consistent entity information across platforms        ||
|  |  (Google, Wikidata, KvK, LinkedIn) signals trustworthiness to         ||
|  |  search engines.                                                       ||
|  +------------------------------------------------------------------------+|
|                                                                            |
+============================================================================+
```

**Key design decisions:**
- Each insight has: title, educational subtitle, result, "WHAT THIS MEANS FOR YOU"
- Actionable next steps for every finding (not just data display)
- Trends data immediately converted into a publishing calendar
- Unavailable insights shown with explanation of what they would provide
- Positive reinforcement when things are good ("Your CE is rank #1 -- correct!")
- Blocked pages shown with assessment of intentionality

#### 2.3e Recommendations (what to do next)

```
+============================================================================+
|                                                                            |
|  WHAT TO DO NEXT                                                           |
|  Prioritized actions based on your gap analysis. Start with #1.            |
|  Each action is connected to your content strategy.                        |
|                                                                            |
|  8 recommendations | 2 critical | 3 high | 3 medium                       |
|                                                                            |
+============================================================================+
|                                                                            |
|  1. [CRITICAL] Add missing foundational facts to your content              |
|  +----------------------------------------------------------------------+ |
|  |                                                                       | |
|  |  You're missing 3 ROOT facts that every competitor covers:            | |
|  |                                                                       | |
|  |    * Average cost per m2 for roofing       -> Dakbedekking page       | |
|  |    * Insulation R-value specifications     -> Dakisolatie page        | |
|  |    * Professional certifications            -> About/Author pages     | |
|  |                                                                       | |
|  |  ROOT facts are the baseline. Without them, search engines see your   | |
|  |  content as incomplete. Think of it as: a restaurant menu without     | |
|  |  prices. Customers expect it; competitors provide it.                 | |
|  |                                                                       | |
|  |  EAV category: ROOT | Content areas: Dakbedekking, Dakisolatie       | |
|  |  CSI alignment: Supports "hire" and "install" predicates             | |
|  |  Section type: Core Section (revenue-generating)                      | |
|  |  Suggested format: Data tables with specific numbers                  | |
|  |                                                                       | |
|  +----------------------------------------------------------------------+ |
|                                                                            |
|  2. [CRITICAL] Optimize 5 GSC quick-win queries                           |
|  +----------------------------------------------------------------------+ |
|  |                                                                       | |
|  |  You rank positions 7-15 for 5 queries with real search traffic.      | |
|  |  These are your fastest path to more visitors.                        | |
|  |                                                                       | |
|  |    * "dakdekker haarlem" (pos 7, 1,240 impr)                         | |
|  |    * "daklekkage reparatie kosten" (pos 12, 890 impr)                | |
|  |    * "dakisolatie subsidie 2026" (pos 8, 650 impr)                   | |
|  |    * "dak renovatie noord-holland" (pos 14, 430 impr)                | |
|  |    * "bitumen dakbedekking levensduur" (pos 11, 380 impr)            | |
|  |                                                                       | |
|  |  Moving from page 2 to page 1 typically increases traffic by 5-10x.  | |
|  |                                                                       | |
|  |  Data source: Google Search Console (real data, last 28 days)        | |
|  |  CSI alignment: "hire" (3 queries), "install" (2 queries)            | |
|  |  Section type: Core Section (revenue-generating)                      | |
|  |  Suggested action: Strengthen on-page content with the ROOT EAVs     | |
|  |  identified above. Add the missing pricing and specification data.    | |
|  |                                                                       | |
|  +----------------------------------------------------------------------+ |
|                                                                            |
|  3. [HIGH] Publish your unique differentiators                            |
|  +----------------------------------------------------------------------+ |
|  |                                                                       | |
|  |  You've defined UNIQUE facts in your EAV inventory that are NOT       | |
|  |  published on your website yet:                                       | |
|  |                                                                       | |
|  |    * Guarantee period: 15 years (only 2 of 6 competitors mention     | |
|  |      guarantee terms at all)                                          | |
|  |    * Founded: 1987 (longest-established in your competitive set)      | |
|  |    * Service area: All of Noord-Holland (most competitors are local) | |
|  |                                                                       | |
|  |  These are your competitive advantages. Publishing them creates       | |
|  |  UNIQUE EAVs that no competitor can replicate.                       | |
|  |                                                                       | |
|  |  EAV category: UNIQUE | Section type: Both Core and Author           | |
|  |  CSI alignment: "hire" (guarantees -> hiring confidence)             | |
|  |  Suggested format: Trust badges on service pages + dedicated          | |
|  |  "Why Koelman" page                                                   | |
|  |                                                                       | |
|  +----------------------------------------------------------------------+ |
|                                                                            |
|  4. [HIGH] Fix 3 low-CTR queries                                         |
|  +----------------------------------------------------------------------+ |
|  |                                                                       | |
|  |  You rank in the top 5 for 3 queries but visitors don't click.        | |
|  |  Your listing appears on page 1 -- the problem is your title tag      | |
|  |  and meta description.                                                | |
|  |                                                                       | |
|  |    * "dakdekker certificering" (pos 3, 2.1% CTR vs expected 8-12%)   | |
|  |    * "daklekkage nood" (pos 4, 1.8% CTR vs expected 6-10%)           | |
|  |    * "dakpannen vervangen" (pos 2, 3.4% CTR vs expected 12-18%)      | |
|  |                                                                       | |
|  |  This is leaving traffic on the table. Improving CTR at these         | |
|  |  positions could double your organic visits for these queries.        | |
|  |                                                                       | |
|  |  Data source: Google Search Console                                   | |
|  |  Suggested action: Rewrite title tags to include your CE and          | |
|  |  strongest UNIQUE EAV (e.g., "15 jaar garantie").                    | |
|  |                                                                       | |
|  +----------------------------------------------------------------------+ |
|                                                                            |
|  5. [HIGH] Create content for depth opportunities                         |
|  +----------------------------------------------------------------------+ |
|  |  ...                                                                   | |
|  +----------------------------------------------------------------------+ |
|                                                                            |
|  6-8. [MEDIUM] (collapsed)                                                |
|  +----------------------------------------------------------------------+ |
|  |  [v] Show 3 medium-priority recommendations                          | |
|  +----------------------------------------------------------------------+ |
|                                                                            |
+============================================================================+
|                                                                            |
|  +====================================================================+   |
|  |                                                                    |   |
|  |  Ready to proceed?                                                 |   |
|  |                                                                    |   |
|  |  The next step (Strategy) will use these findings to build         |   |
|  |  your topical map -- the complete content architecture for         |   |
|  |  your website.                                                     |   |
|  |                                                                    |   |
|  |           [ Approve & Continue to Strategy ]                       |   |
|  |                                                                    |   |
|  +====================================================================+   |
|                                                                            |
+============================================================================+
```

**Key design decisions:**
- Recommendations numbered and prioritized (start with #1)
- Each shows: EAV category, content area, CSI alignment, section type, format
- CRITICAL recommendations are expanded by default; MEDIUM collapsed
- Cross-references user's own EAVs ("you defined this but haven't published")
- GSC-based recommendations include real numbers (position, impressions)
- Expected CTR benchmarks given for low-CTR findings
- Analogy for ROOT facts: "like a menu without prices"
- Clear CTA at bottom: "Approve & Continue to Strategy"

---

### 2.4 Complete Page Layout (all sections together)

```
+============================================================================+
|  GAP ANALYSIS RESULTS                                                      |
|  for Koelman Dakwerken | koelmandakwerken.nl                              |
+============================================================================+
|                                                                            |
|  [Section 1] YOUR COMPETITIVE POSITION (score cards)  .............. open  |
|  [Section 2] CONTENT GAPS (12 gaps, grouped by severity) .......... open  |
|  [Section 3] QUERY OPPORTUNITIES (10 queries, by content area) .... open  |
|  [Section 4] GOOGLE API INSIGHTS (5 data sources) ............. collapsed  |
|  [Section 5] WHAT TO DO NEXT (8 recommendations) .................. open  |
|                                                                            |
|  [Export v] [New Analysis]                                                 |
|                                                                            |
|  [ Approve & Continue to Strategy ]                                        |
|                                                                            |
+============================================================================+
```

Default state: Sections 1, 2, 3, 5 open. Section 4 collapsed (it's supporting
data, not primary action). Each section is independently collapsible.

---

## Part 3: Messaging Guidelines

### 3.1 Section: Competitive Position (Scores)

| Element | Text |
|---------|------|
| **Headline** | YOUR COMPETITIVE POSITION |
| **Educational subtitle** | How your content compares to the market for your specific business. These scores are relative to competitors ranking for your queries -- not arbitrary benchmarks. |
| **Empty state (no results)** | Run the gap analysis to see how your content compares to competitors ranking for "{CE}" queries in {region}. |
| **Empty state (unmeasured dimension)** | **Not yet measured.** This dimension requires [specific data source]. Connect it in Settings to enable this score. We won't show a fake number. |
| **Success state (score >= 80)** | Strong performance. Your {dimension} score of {score}/100 means you're ahead of most competitors in this area. Maintain this by keeping your content current. |
| **Warning state (score 40-79)** | Room to improve. Your {dimension} score of {score}/100 means competitors are covering more {explanation} than you. See the Content Gaps section for specifics. |
| **Critical state (score < 40)** | Significant gap. Your {dimension} score of {score}/100 means your content is missing substantial information that competitors provide. Prioritize the CRITICAL recommendations below. |
| **Framework surfacing** | Scores use framework terms: "EAV Completeness" (not "Content Quality"), "Semantic Density" (not "Info Density"), "Entity Coverage" (not "Topic Coverage"). Each score label links to a tooltip explaining the concept in plain language. |

### 3.2 Section: Content Gaps

| Element | Text |
|---------|------|
| **Headline** | CONTENT GAPS |
| **Educational subtitle** | Facts your competitors cover that are missing from your content. Each gap shows which EAV category it belongs to and why it matters for your business. |
| **Empty state (no gaps found, own content analyzed)** | No gaps detected. Your content covers all the structured facts that competitors cover. This is excellent -- it means search engines see your content as at least as comprehensive as the competition. Focus on UNIQUE differentiators to pull ahead. |
| **Empty state (no gaps found, own content NOT analyzed)** | We couldn't analyze your own content because [reason: no pages in site inventory / domain not found in SERPs]. Without comparing your content, we can only show what competitors cover. Run the Crawl step first to enable gap detection. |
| **Empty state (no competitors found)** | No competitor data available. This can happen if your queries are very niche or the SERP API didn't return results. Try running the analysis again, or check that your DataForSEO credentials are configured. |
| **Success state (few gaps, all low priority)** | Only {count} minor gaps found. Your content is comprehensive for the foundational facts. The remaining gaps are RARE or COMMON attributes that could add depth but aren't critical. |
| **Warning state (ROOT gaps found)** | {count} ROOT facts are missing. These are foundational -- every competitor covers them. Think of ROOT facts as the minimum information customers expect. Missing them is like a product page without a price. |
| **Framework surfacing** | Gaps are tagged with EAV category badges (ROOT in red, UNIQUE in purple, RARE in blue, COMMON in gray). Tooltip: "ROOT = baseline fact every competitor covers. UNIQUE = differentiator only you or few competitors have. RARE = depth signal. COMMON = expected but not critical." |

### 3.3 Section: Query Opportunities

| Element | Text |
|---------|------|
| **Headline** | QUERY OPPORTUNITIES |
| **Educational subtitle** | Search queries your customers use, organized by your content areas. These aren't generic keyword suggestions -- they're derived from your business model, CSI predicates, and competitor rankings. |
| **Empty state** | Query generation requires an AI provider. Configure your API key in Settings to generate a query network for "{CE}". |
| **Success state (with GSC)** | {total} queries identified across {areaCount} content areas. {gscCount} queries enriched with real search data from Google Search Console. |
| **Success state (without GSC)** | {total} queries identified across {areaCount} content areas. Connect Google Search Console to overlay real ranking positions and search volumes. |
| **Warning state (low query count)** | Only {count} queries generated. This usually means your content areas are very specific. This isn't necessarily bad -- niche topics often have less competition. |
| **Framework surfacing** | Queries are grouped by content area (from pillars) and tagged with CSI predicate alignment. Revenue queries are visually distinct from authority queries. GSC quick wins are highlighted separately because they represent real, measured opportunities. |

### 3.4 Section: Google API Insights

| Element | Text |
|---------|------|
| **Headline** | GOOGLE API INSIGHTS |
| **Educational subtitle** | What Google's own tools reveal about your online presence. Each insight comes directly from Google's systems -- this is how Google sees you. |
| **Empty state (no APIs configured)** | No Google API data available. The analysis ran using AI and SERP data only. To unlock deeper insights (Knowledge Graph recognition, entity salience, search trends, indexation status), configure your API keys in Settings. |
| **Empty state (specific API failed)** | {API_NAME} data unavailable: {reason}. The analysis continues without it -- the other data sources compensate. |
| **Success state (KG found)** | Google recognizes "{CE}" as a {type}. This is the foundation of entity-based SEO -- Google treats your business as a known entity, not just a collection of keywords. |
| **Warning state (KG not found)** | Google does not yet recognize "{CE}" in its Knowledge Graph. This means Google hasn't established your business as a formal entity. This is common for smaller businesses and doesn't prevent ranking, but building entity recognition accelerates SEO. |
| **Warning state (low salience)** | Your Central Entity salience is {pct}% (rank #{rank} of {total}). Other entities on your site are competing for attention. Ensure "{CE}" appears prominently in titles, H1s, and first paragraphs. |
| **Framework surfacing** | Each API insight includes "WHAT THIS MEANS FOR YOU" in business language and "HOW TO IMPROVE" with specific actions. Technical metrics are translated: salience = "how prominently your business appears", KG = "whether Google recognizes you as a known entity". |

### 3.5 Section: Recommendations

| Element | Text |
|---------|------|
| **Headline** | WHAT TO DO NEXT |
| **Educational subtitle** | Prioritized actions based on your gap analysis. Start with #1 -- each action is connected to your content strategy and ordered by impact. |
| **Empty state** | No recommendations generated. This typically means the analysis didn't produce enough data. Try running again with additional data sources connected. |
| **Success state (few recs, low severity)** | {count} recommendations, none critical. Your content is in good shape. Focus on the HIGH-priority items to move from good to excellent. |
| **Warning state (critical recs)** | {critical_count} critical actions need attention. These represent foundational gaps that every competitor addresses. Resolving them should be your immediate priority before creating new content. |
| **Framework surfacing** | Each recommendation shows: EAV category, content area, CSI predicate alignment, and whether it's Core Section (revenue) or Author Section (authority). This connects every action to the user's business model. Recommendations reference specific CSI predicates: "This supports your 'hire' predicate because customers making hiring decisions need to see certification information." |

---

## Part 4: User Input Requirements

### 4.1 What is Already Available (NO user input needed)

| Data | Source | Pipeline Step | Status |
|------|--------|--------------|--------|
| Central Entity | `pillars.centralEntity` | Pillar Wizard | Required (set in earlier step) |
| Source Context | `pillars.sourceContext` | Pillar Wizard | Required (set in earlier step) |
| Central Search Intent | `pillars.centralSearchIntent` | Pillar Wizard | Required (set in earlier step) |
| CSI Predicates | `pillars.csiPredicates` | Pillar Wizard | Required (set in earlier step) |
| Content Areas | `pillars.contentAreas` | Pillar Wizard | Required (set in earlier step) |
| Content Area Types | `pillars.contentAreaTypes` | Pillar Wizard | Required (set in earlier step) |
| Domain | `businessInfo.domain` | Business Info Wizard | Required (set in earlier step) |
| Industry | `businessInfo.industry` | Business Info Wizard | Required (set in earlier step) |
| Target Market | `businessInfo.targetMarket` | Business Info Wizard | Required (set in earlier step) |
| Language | `businessInfo.language` | Business Info Wizard | Required (set in earlier step) |
| Region | `businessInfo.region` | Business Info Wizard | Required (set in earlier step) |
| User-defined EAVs | `activeMap.eavs[]` | EAV Discovery Wizard | Optional (may be empty) |
| Site Inventory | `analysis_state.site_inventory` or `site_inventory` table | Crawl Step | Available if crawl completed |
| GSC Data | `gscData[]` loaded via edge function | GSC Connection (in Gap Step) | Optional (user connects) |
| AI Provider + Key | `businessInfo.aiProvider`, `businessInfo.*ApiKey` | Settings | Required |
| DataForSEO credentials | `businessInfo.dataforseoLogin/Password` | Settings | Required for SERP data |
| Jina API Key | `businessInfo.jinaApiKey` | Settings | Required for content extraction |
| Google API Keys | Various `businessInfo.google*ApiKey` | Settings | Optional (enrichment) |

### 4.2 What is Automatically Fetched During Analysis

| Data | API | Condition |
|------|-----|-----------|
| Knowledge Graph entity | Google Knowledge Graph API | `googleKnowledgeGraphApiKey` configured |
| Entity salience scores | Google Cloud NLP API | `googleApiKey` configured |
| Search trends + seasonality | Google Trends (via proxy) | `googleApiKey` configured |
| URL inspection results | Google Search Console API | GSC account connected |
| GA4 page metrics | Google Analytics Data API | GA4 integration enabled + connected |
| SERP results per query | DataForSEO | Credentials configured |
| Competitor page content | Jina Reader API | API key configured |
| AI-generated queries | User's AI provider | AI provider configured |
| AI-extracted EAVs | User's AI provider | AI provider configured |

### 4.3 What the User Needs to Do in This Step

```
+------------------------------------------------------------------------+
|                                                                        |
|  REQUIRED USER ACTIONS IN GAP ANALYSIS STEP:                           |
|                                                                        |
|  1. Click "Run Gap Analysis"                                           |
|     That's it. One click.                                              |
|                                                                        |
|  OPTIONAL USER ACTIONS:                                                |
|                                                                        |
|  2. Connect Google Search Console (if not already connected)           |
|     This enriches the analysis with real ranking data.                 |
|     UI: "Data Sources" panel with "Connect GSC" button.                |
|                                                                        |
|  3. Review results and approve                                         |
|     After analysis completes, user reviews findings and clicks         |
|     "Approve & Continue to Strategy" to advance the pipeline.          |
|                                                                        |
|  USER DOES NOT NEED TO:                                                |
|  - Enter a seed keyword (CE is used automatically)                     |
|  - Enter their domain (already known from Business Info)               |
|  - Configure max queries or competitors (sensible defaults)            |
|  - Select which APIs to use (all available ones are used)              |
|  - Choose analysis depth (one-size-fits-all comprehensive analysis)   |
|  - Interpret raw data (everything is explained in plain language)      |
|                                                                        |
+------------------------------------------------------------------------+
```

### 4.4 Prerequisite Check (shown if data is missing)

If the user arrives at Gap Analysis without the required earlier-step data:

```
+============================================================================+
|                                                                            |
|  GAP ANALYSIS                                                              |
|                                                                            |
|  +- SETUP REQUIRED ------------------------------------------------+      |
|  |                                                                  |      |
|  |  [!] The gap analysis needs information from earlier steps.     |      |
|  |                                                                  |      |
|  |  Missing:                                                        |      |
|  |  [ ] Central Entity -- Define your main entity in the Strategy  |      |
|  |      step or Pillar Wizard                                       |      |
|  |  [*] Source Context -- Defined                                   |      |
|  |  [*] Central Search Intent -- Defined                            |      |
|  |  [ ] Site Inventory -- Run the Crawl step first to discover     |      |
|  |      your existing pages                                         |      |
|  |  [*] AI Provider -- Configured (Gemini Flash)                    |      |
|  |                                                                  |      |
|  |  The gap analysis compares YOUR content against competitors.     |      |
|  |  Without your Central Entity and crawled pages, we can't         |      |
|  |  perform a meaningful comparison.                                |      |
|  |                                                                  |      |
|  |  [ Go to Crawl Step ]                                            |      |
|  |                                                                  |      |
|  +------------------------------------------------------------------+     |
|                                                                            |
+============================================================================+
```

---

## Appendix A: Color and Visual Treatment Reference

```
SCORE COLORS:
  >= 80  green    (#4ade80)  Excellent
  60-79  yellow   (#facc15)  Good, room to improve
  40-59  orange   (#fb923c)  Needs attention
  < 40   red      (#f87171)  Critical
  null   gray     (#9ca3af)  Not measured

EAV CATEGORY BADGES:
  ROOT    red background    (#7f1d1d/30)  text-red-400     "Foundational"
  UNIQUE  purple background (#581c87/30)  text-purple-400  "Differentiator"
  RARE    blue background   (#1e3a5f/30)  text-blue-400    "Depth signal"
  COMMON  gray background   (#374151)     text-gray-400    "Expected"

PRIORITY BADGES:
  CRITICAL  red     Same as ROOT -- these demand immediate attention
  HIGH      orange  Significant impact opportunity
  MEDIUM    yellow  Worth doing but not urgent
  LOW       blue    Nice to have

DATA SOURCE BADGES:
  GSC         teal    Real search data
  AI          purple  AI-generated analysis
  SERP        blue    Search engine results
  Competitor  amber   Competitor content analysis
  Google API  emerald Google platform data
```

## Appendix B: Educational Tooltip Content

These tooltips appear on hover/tap for framework terms shown in the UI:

| Term in UI | Tooltip text |
|------------|-------------|
| Central Entity | The single main entity your website is about. Everything on your site should relate back to this entity. For you, this is "{CE}". |
| EAV Completeness | Measures how many structured facts (Entity-Attribute-Value triples) your content covers compared to competitors. Higher = more comprehensive content. |
| Semantic Density | How many verifiable facts per sentence your content contains. Higher density means search engines can extract more knowledge from your pages with less effort. |
| Entity Coverage | How many of the entities (topics, products, concepts) in your market space your content mentions. Wider coverage = stronger topical authority. |
| Content Structure | How well your headings (H1-H6) are organized. Proper hierarchy helps search engines and users navigate your content efficiently. |
| ROOT fact | A foundational fact that every competitor covers. Missing ROOT facts signals incomplete content. Example: pricing information for a service business. |
| UNIQUE fact | A fact that only you or very few competitors mention. UNIQUE facts are your competitive advantage -- they differentiate you in search results. |
| RARE fact | A fact that only some competitors cover. RARE facts add depth and signal expertise beyond the basics. |
| COMMON fact | A fact that most competitors cover. Expected by the market but not critical if missing. |
| Content Area | A thematic section of your content strategy. Each area is tagged as "revenue" (directly drives business) or "authority" (builds expertise and trust). |
| CSI Predicate | An action verb that connects your business to customer intent. For you, these are: {predicates}. Queries containing these verbs are directly relevant to your business. |
| Core Section | Content that directly generates revenue. These pages target transactional and commercial queries. |
| Author Section | Content that builds authority and expertise. These pages target informational queries and establish you as a trusted source. |
| Quick Win | A query where you already rank on page 1-2 with real traffic. Small optimizations here give the fastest results. |
| Cost of Retrieval | How much computational effort search engines need to understand your content. Lower cost = better structured content = higher rankings. |

## Appendix C: Transition to Next Pipeline Step

When the user clicks "Approve & Continue to Strategy", the following data
is passed forward for use in the Strategy step:

```typescript
// Data persisted to analysis_state.gap_analysis
{
  // Scores (used for strategy prioritization)
  scores: { overallPosition, eavCompleteness, semanticDensity, entityCoverage, contentStructure },

  // Gaps (used to inform topical map generation)
  contentGaps: [...],  // With EAV category, content area, priority

  // Query opportunities (used to generate topics)
  queryOpportunities: [...],  // Grouped by content area, with intent and CSI alignment

  // Competitor EAVs (used as input for EAV inventory refinement)
  competitorEAVs: [...],  // With cross-page categories

  // Google API insights (used for strategy context)
  googleApiInsights: { knowledgeGraph, entitySalience, trends, indexation, ga4 },

  // GSC insights (used for quick-win prioritization)
  gscInsights: [...],  // Quick wins, low CTR, zero clicks

  // Recommendations (carried forward as strategy inputs)
  recommendations: [...],  // Prioritized, framework-aligned

  // Metadata
  timestamp: "...",
  completedBy: "auto" | "user",
}
```

This data directly feeds into:
- **Strategy step**: Uses gaps + queries + content areas to plan the topical map
- **EAV Inventory step**: Uses competitor EAVs to suggest missing predicates
- **Map Planning step**: Uses query opportunities to generate hub-spoke topics
- **Content Briefs step**: Uses recommendations for brief prioritization
