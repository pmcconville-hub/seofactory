# Multi-Pass Content Generation Research

## Research Summary from Build-Docs

### 1. Header H Rules (Contextual Vector & Hierarchy)

**Key Rules:**
- **Single Macro Context**: H1 must reflect the Central Entity (CE) and Central Search Intent (CSI)
- **Straight Line Flow**: H1→H2→H3 must follow logical, incremental thought stream
- **Hierarchy Definition**: H2 defines sub-contexts, H3/H4 defines attributes of parent heading
- **Summary Alignment**: Introduction must synthesize all H2s and H3s in the same order as content
- **Query Pattern Matching**: Match heading to most likely query pattern (definitional, instructional, comparative)
- **Predicate Usage**: Instructional queries must have instructional verb in H-tag or first sentence
- **Responsive Subordinate Text**: Text after heading must be exact, clear, concise answer
- **Contextual Overlap**: Each H2/H3 must contain terms/synonyms linking back to H1
- **Numeric Value Prominence**: Use numbers in H1/Title when possible ("7 Types...")
- **Semantic HTML**: Each heading wrapped in `<section>` tag, use `<main>` for main content
- **Visual Hierarchy**: Font size/weight must reflect hierarchy (4px smaller per level)

### 2. Images Rules (Visual Semantics)

**Key Rules:**
- **Alt Tags**: Extend topicality with NEW related terms not in H1/Title
- **Unique Vocabulary**: Use synonyms in Alt/URL not already in H1
- **No Functional Words**: Remove stopwords from image URLs
- **Image Triples (EAV)**: Alt tag reflects object entity in center of image
- **Branding**: Use unique, licensed images with IPTC metadata
- **Format**: Use AVIF with `<picture>` and `srcset` fallbacks
- **CLS Prevention**: Always specify height/width attributes
- **LCP Prominence**: LCP image must be directly relevant to H1 and CE
- **Proximity Rule**: No images between H-tag and Subordinate Text
- **Textual Qualification**: Sentence before/after image must explicitly reference it

### 3. Lists and Tables Rules

**Key Rules:**
- **Semantic HTML**: Use correct tags (`<table>`, `<thead>`, `<ol>`, `<ul>`)
- **List Definition Completeness**: Precede with COMPLETE definitive sentence
- **Content Density**: Each item delivers ONE unique EAV triple
- **Contextual Term Alignment**: Items must contain context terms connecting to main heading
- **Featured Snippet (FS) Target**: Use lists/tables for FS opportunities (<40 words)
- **Ordered Lists**: Required for superlatives or instructional content
- **Count Specificity**: State exact number of items in intro sentence
- **Instructional Verb Usage**: Each item starts with command verb
- **Bolding Rule**: Bold the answer/description, not the entity name
- **Table Structure Control**: Brief defines exact row/column count and names
- **Macro Context Placement**: First structured element high on page

### 4. Semantic Distance Rules

**Key Rules:**
- **Primary Formula**: 1 - (Cosine Similarity x Context Weight x Co-occurrence)
- **Connection Length**: Count nodes between concepts in Topical Graph
- **Distance Thresholds**: If >5 nodes apart, may be considered unrelated
- **Clustering Strategy**: Only cluster pages with low semantic distance
- **Attribute Prominence**: Closer distance = higher relevance
- **Proximity for Linking**: Links connect semantically close entities
- **Anchor Text Hierarchy**: Order hypernyms before hyponyms
- **Contextual Bridge**: Use bridge topics to span large semantic distances
- **Word Proximity**: Related words (E, A, V) must be in close textual proximity

### 5. Semantic Triples (EAV) Rules

**Key Rules:**
- **Triple Structure**: Subject-Predicate-Object = Entity-Attribute-Value
- **Predicate Context Signaling**: Verb signals indexing context
- **Subject-Predicate Match**: Query subject must match document subject
- **Sentence Simplicity**: Short, clear sentences with one EAV per sentence
- **Consistency of Declarations**: All EAV facts must be consistent across site
- **Predicate Prominence**: Predicate is most central word in sentence
- **Entity Proximity**: E, A, V must be close together in text
- **Root Attributes**: Essential for entity definition
- **Unique Attributes**: Definitive features that differentiate
- **Derived Attributes**: Values calculated from other attributes

### 6. Contextual Flow Audit Rules

**Key Rules:**
- **Vector Straightness**: H1→Hx forms straight logical line
- **Attribute Order**: Unique → Root → Rare
- **Introductory Alignment**: Intro reflects entire Contextual Vector
- **Discourse Integration**: Use anchor segments (mutual words) for transitions
- **Subordinate Text Flow**: First sentence after heading is responsive
- **List/Table Flow**: Preceded by definitive intro sentence
- **Visual Semantics**: Follow LIFT model for component ordering
- **Contextual Bridge Placement**: Justify transition from Macro to Micro context
- **Link Flow Direction**: Author Section links to Core Section
- **Template Consistency**: Same entity types use same brief structure

### 7. Content Brief Rules

**Key Rules:**
- **Central Entity Focus**: Brief dedicated to single Macro Context and CE
- **Source Context Alignment**: Content aligns with SC and CSI
- **Section Classification**: Define CS (monetization) vs AS (historical data)
- **Attribute Prioritization**: Unique → Root → Rare
- **Compliance Threshold**: Target >85% Semantic Compliance
- **Content Format**: Specify based on query type (prose/table/list)
- **URL Structure**: Shortest possible, reflects Topical Hierarchy
- **Anchor Text Limit**: Same anchor max 3 times per page
- **Link Position**: Place after entity definition

### 8. Authorship Rules

**Key Rules:**
- **Author as Entity**: Define author in Knowledge Graph with Schema
- **Domain Experts**: Use domain experts especially for YMYL content
- **External Citations**: Author authority confirmed by external sources
- **Publishing Frequency**: Maintain consistent activity
- **Unique Stylometry**: Remove LLM phrases ("Overall", "I had the pleasure of")
- **One Fact Per Sentence**: Short, dense sentences
- **No Co-reference**: Avoid ambiguous pronouns
- **Originality**: Create new contexts/attributes not on competitor sites
- **Safe Answers**: Support facts with conditions and multiple perspectives

### 9. On-Page Audit Framework

**Key Audit Areas:**
1. Strategic Fundamentals (Macro Context, SC Alignment, E-A-T)
2. Content Structure & Flow (Centerpiece Text, Subordinate Text, Vector)
3. Visuals, Schema & Layout (Hierarchy, Metadata, Structured Data)
4. Interlinking & Anchor Text (Repetition, Precedence, Annotation)
5. Technical & Crawl Efficiency (CWV, HTML Simplicity, URL Structure)

### 10. Micro Semantics Rules (CRITICAL - Added)

**Key Rules:**

#### Sentence Structure and Modality:
- **Modality (Certainty)**: Use definitive verbs ("is", "are") for facts. Only use "can", "might" when scientific consensus is uncertain
- **Stop Word Removal**: Remove fluff words ("also", "basically", "very", "maybe") - especially from first 2 paragraphs
- **Subject Positioning**: Main entity must be SUBJECT of sentence, not object
  - Good: "Financial Independence relies on sufficient savings"
  - Bad: "Financial advisors help you achieve financial independence"
- **Definition Structure**: Definitions must follow "Is-A" hypernymy structure
  - Good: "A penguin is a flightless sea bird"
  - Bad: "Penguins swim and don't fly"
- **Information Density**: Every sentence must add a new fact. No entity repetition without new attribute

#### Contextual Flow:
- **Centerpiece Annotation**: Critical info (direct answer) must be in first 400 characters of main content
- **First Sentence Rule**: First sentence of paragraph must directly address the heading
- **Contextual Bridges**: Transitional sentences required between sub-topics

#### Answer Formats:
- **Ordered Lists**: Use `<ol>` ONLY for rankings, steps, or superlatives ("Top 10", "How to")
- **Unordered Lists**: Use `<ul>` for items where order doesn't matter
- **Tables**: Columns = attributes (Price, Speed), Rows = entities

#### Links and References:
- **Annotation Text**: Text surrounding anchor must provide micro-context for WHY the link exists
- **Reference Principle**: Don't link at beginning of sentence - make declaration first, then cite
- **Link Placement**: Links after definition/definitive statement carry more weight

#### Disambiguation:
- **Negative Constraints**: Explicitly state what something is NOT to increase accuracy
  - Example: "This visa is not for permanent residency"

#### Site-Wide N-Grams:
- Footer/header links should include topic keywords
  - Good: "Visa Consultancy Privacy Policy"
  - Bad: "Privacy Policy"

---

## Current Application Gap Analysis

### What the Application Already Has:
1. Topical Map generation with pillars
2. Content brief generation
3. SERP analysis integration
4. EAV (Semantic Triple) discovery
5. Topic expansion (core/outer)

### What's Missing (Based on Research):

#### Content Brief Generation Gaps:
1. **No attribute prioritization** (Unique → Root → Rare ordering)
2. **No list/table format specification** with exact counts
3. **No image alt tag specifications**
4. **No heading hierarchy validation**
5. **No Subordinate Text guidelines**
6. **No anchor text specifications**
7. **No semantic distance validation**

#### Content Draft Generation Gaps:
1. **No multi-pass workflow** - currently single-shot generation
2. **No header H rules validation**
3. **No EAV triple density checking**
4. **No discourse integration checking**
5. **No LLM phrase removal**
6. **No list/table format enforcement**
7. **No semantic compliance scoring**

#### Content Audit Gaps:
1. **No on-page audit using these rules**
2. **No contextual flow validation**
3. **No visual semantics checking**
4. **No interlinking audit**

---

## Proposed Multi-Pass Content Generation Workflow

### Pass 1: Content Brief Enhancement
- Add attribute prioritization (categorize as Unique/Root/Rare)
- Add list/table format specifications with exact counts
- Add image specifications (alt tags, placement)
- Add Subordinate Text requirements
- Add anchor text specifications

### Pass 2: Draft Content Generation
- Generate initial draft aligned with:
  - Central Entity and Source Context
  - EAV triples from brief
  - Contextual Vector (heading order)
  - Query pattern matching

### Pass 3: Header H Rules Optimization
- Validate H1 reflects CE and CSI
- Ensure straight line flow H1→H2→H3
- Add numeric values where appropriate
- Check heading hierarchy consistency
- Validate responsive Subordinate Text

### Pass 4: Lists, Tables, and Structure Optimization
- Convert appropriate content to lists/tables
- Add definitive intro sentences with counts
- Ensure instructional verbs for ordered lists
- Validate EAV density per list item

### Pass 5: Image and Visual Semantics
- Generate image specifications
- Create alt tags that extend topicality
- Define placement rules (not between H and Subordinate Text)
- Specify textual qualifications

### Pass 6: Word Order and Linguistics Optimization
- Check EAV word proximity
- Remove LLM phrases ("Overall", etc.)
- Ensure subject-predicate match with query
- Validate discourse integration (anchor segments)

### Pass 7: Introduction/Summary Synthesis
- Rewrite intro after full draft complete
- Synthesize all H2/H3 topics in order
- Include key terms from all sections

### Pass 8: Final Compliance Check
- Run semantic compliance scoring
- Validate against all rules
- Flag any violations for manual review

---

## Technical Issues to Fix

### CORS/504 Error on Article Draft Generation
- Error: `Access to fetch at 'https://blucvnmncvwzlwxoyoum.supabase.co/functions/v1/anthropic-proxy' from origin 'http://localhost:3000' has been blocked by CORS policy`
- Error: `net::ERR_FAILED 504 (Gateway Timeout)`

**Root Cause Analysis:**
1. The anthropic-proxy function HAS proper CORS headers (verified in code)
2. The 504 Gateway Timeout is the REAL issue - Supabase Edge Functions have a 60-second timeout
3. Large content generation requests (especially for long articles) exceed this timeout
4. The CORS error appears SECONDARY to the timeout - browser reports CORS when the gateway times out

**Solutions:**
1. **Streaming Response**: Implement SSE (Server-Sent Events) or chunked responses
2. **Break into Smaller Requests**: Split article generation into multiple smaller AI calls
3. **Use Anthropic Batches API**: For very long content, use async batch processing
4. **Implement Client-Side Polling**: Start async job, poll for completion
5. **Increase max_tokens gradually**: Start with outline, then section by section

### Status Communication for Long Operations
- User sees no feedback during multi-minute operations
- Need progress indicators for each pass
- Need intermediate status updates

**Solutions:**
1. Dispatch LOG_EVENT actions at each step
2. Show loading states with step descriptions
3. Use the existing LoggingPanel for real-time feedback
4. Add progress percentage or step counter

---

## Current Implementation Analysis

### What Already Exists:

**Content Brief Generation (`briefGeneration.ts:244-256`):**
- Calls AI provider to generate content brief
- Returns structured ContentBrief object
- Has good structured_outline with subordinate_text_hint

**Article Draft Generation (`briefGeneration.ts:258-270`):**
- Single-shot generation using GENERATE_ARTICLE_DRAFT_PROMPT
- Returns raw markdown
- No multi-pass workflow

**Draft Polishing (`briefGeneration.ts:272-284`):**
- Second pass using POLISH_ARTICLE_DRAFT_PROMPT
- Rewrites introduction
- Converts to lists/tables
- Inserts visual placeholders

**Content Audit (`briefGeneration.ts:289-338`):**
- Combines AI audit with algorithmic checks
- Has rules for:
  - Subjectivity check
  - Pronoun density check
  - Link positioning check
  - First sentence precision
  - Question protection
  - List logic preamble
  - Sentence density

### What's Missing from Research Docs:

1. **Attribute Prioritization Pass**: No Unique → Root → Rare ordering
2. **Header H Rules Validation**: No H1→H2→H3 straight line validation
3. **Image Alt Tag Generation**: No vocabulary extension with synonyms
4. **Semantic Distance Checking**: No contextual bridge validation
5. **Word Order Optimization**: No EAV proximity checking
6. **List Count Specificity**: No exact count in intro sentence validation
7. **LLM Phrase Removal**: Only basic subjectivity check, not full stylometry
8. **Table Structure Control**: No row/column count enforcement
9. **Discourse Integration**: discourse_anchors in brief but not validated in audit

---

## Gap Summary

| Rule Category | In Brief Generation | In Draft Generation | In Audit | Status |
|---------------|---------------------|---------------------|----------|--------|
| Central Entity Focus | ✅ | ✅ | ✅ | Complete |
| Attribute Prioritization | ✅ (outline) | ❌ | ❌ | GAP |
| Contextual Vector | ✅ | ❌ | ❌ | GAP |
| Subordinate Text | ✅ (hints) | ✅ | ✅ | Complete |
| Discourse Anchors | ✅ | ❌ | ❌ | GAP |
| Featured Snippet | ✅ | ✅ | ❌ | GAP |
| Visual Semantics | ✅ | ✅ | ❌ | GAP |
| Link Positioning | ❌ | ✅ | ✅ | Complete |
| Question Protection | ❌ | ✅ | ✅ | Complete |
| List Logic | ❌ | ✅ | ✅ | Complete |
| Image Alt Tags | ❌ | ❌ | ❌ | GAP |
| Table Structure | ❌ | ❌ | ❌ | GAP |
| LLM Phrase Removal | ❌ | ❌ | Partial | GAP |
| EAV Word Proximity | ❌ | ❌ | ❌ | GAP |
| Semantic Distance | ❌ | ❌ | ❌ | GAP |
| **MICRO SEMANTICS (NEW)** | | | | |
| Modality (is/are vs can/might) | ❌ | ❌ | ❌ | GAP |
| Stop Word Removal | ❌ | ❌ | ❌ | GAP |
| Subject Positioning | ❌ | ❌ | ❌ | GAP |
| Definition Structure (Is-A) | ❌ | ❌ | ❌ | GAP |
| Information Density | ❌ | ❌ | ❌ | GAP |
| Centerpiece Annotation (400 chars) | ❌ | ❌ | ❌ | GAP |
| Ordered vs Unordered Lists | ❌ | ❌ | ❌ | GAP |
| Annotation Text for Links | ❌ | ❌ | ❌ | GAP |
| Reference Principle (link position) | ❌ | ❌ | ❌ | GAP |
| Negative Constraints | ❌ | ❌ | ❌ | GAP |

