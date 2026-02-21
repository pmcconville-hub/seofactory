# Pipeline Step Improvements — "The System Knows My Business"

## Design Philosophy

The user knows their own business. They know they were founded in 1953, they manage 4,000+ VvEs, they serve 6 regions. What earns their trust is when the system **already figured that out** and presents it back — organized better, with gaps they didn't know they had, and insights their own marketing team missed.

**The feeling at every step:**
> "This system knows exactly what it's doing. I can recognize my own business in what it shows me — and it's smarter about it than I am."

**Four design principles:**

1. **Mirror first, then improve** — show the user their own data before asking them to confirm anything. They should see their business reflected back before they touch a single field.

2. **Reveal what they're missing** — don't just show what exists; show what competitors have that they don't. "Your competitors mention ISO certification — you don't." That's the moment trust clicks.

3. **Business language, not SEO jargon** — the user sees "Your service areas" not "CS clusters". They see "What people search for" not "CSI predicates". The semantic SEO framework runs underneath — the user sees their business, organized better.

4. **Always show process or result** — the screen is never empty, never waiting silently. If the AI is working, show what it's discovering in real-time. If it's done, show the result as a readable summary. The user is either watching the system work or reading what it produced — never staring at a blank page.

---

## Key UX Decisions (Locked)

### Decision 1: Discovery Narrative (Step 0)
**Choice: Show a live discovery feed while simultaneously populating business fields.**

When the user enters a URL, the system immediately starts two parallel processes:
- **Visible:** A narrative feed showing what it's finding: "Found 47 pages... Detected Dutch language... Found 6 regional office pages..."
- **Background:** Business info fields filling in as data arrives

The user watches their site being understood. By the time the narrative completes, the business profile card is fully populated. No loading spinner — a story of discovery.

### Decision 2: EAV Confidence Sorting (Step 2)
**Choice: Show ALL extractions with aggressive confidence badges, sorted by confidence (highest first).**

Every extracted fact gets a colored badge:
- **GREEN** (HIGH) — from structured data, About page, Schema markup, official company information
- **AMBER** (MEDIUM) — from secondary content pages, inferred from context
- **RED** (LOW) — from competitor sites, uncertain extractions, or contradicted values

Sorted so GREEN items appear first. User confirms the high-confidence facts quickly (one click each), then focuses attention on amber/red items that actually need human judgment. The cognitive flow: "yes, yes, yes, yes — oh this one needs checking."

### Decision 3: Adaptive Display Pattern (All Steps)
**Choice: If AI already ran and data exists → show summary. If empty → show form/process. Always keep user informed.**

Three states per step:
1. **No data yet, AI working** → Show process: live narrative of what the AI is doing, progress indicators, discoveries appearing in real-time
2. **No data yet, waiting for user** → Show form with helpful context and examples
3. **Data exists** → Show readable summary card with an "Adjust" button to reveal editors. User reads first, edits only if needed

The principle: the screen always tells the user something useful. Either "here's what I'm doing right now" or "here's what I found."

### Decision 4: Hybrid Naming with Framework Teaching
**Choice: Content areas use business language as the primary label, with framework terms as a teaching parenthetical.**

Examples:
- "Financial Management (revenue pages)" — not "CS Cluster 2"
- "Knowledge Base (authority pages)" — not "AS Cluster 1"
- "Technical Maintenance (revenue pages)" — not "CS Cluster 3"

The parenthetical gently teaches the user the framework vocabulary. After seeing "(revenue pages)" on 5 clusters, the user naturally starts thinking in those terms. By the Map step, they understand why some pages drive revenue and others build authority — without ever reading an SEO textbook.

Over time, the framework language becomes natural: "Oh, these are our revenue pages, those are our authority pages." The system taught them through repetition, not explanation.

### Decision 5: Confirmed Facts Stay Visible (Green)
**Choice: Confirmed EAV facts turn green but remain in the list. UI optimized so green rows are visually compact.**

Green-confirmed rows:
- Background shifts to a subtle green tint (`bg-emerald-900/10`)
- Checkmark replaces the confirm button
- Row height reduces slightly (compact mode) — value still readable but the row takes less vertical space
- Edit button remains (pencil icon) in case user changes their mind

This means the list never shrinks. The user can always scroll back and see everything they confirmed. But the visual hierarchy is clear: green = done (compact), amber = needs attention (normal height), red = action needed (normal height with call-to-action). The eye naturally skips over green rows and lands on amber/red.

### Decision 6: Map Display — Cluster Counts Primary, Tree Secondary
**Choice: Primary view is cluster list with page counts in business language. Secondary view is a visual tree diagram available via toggle.**

Primary (default) view:
- Cluster cards in business language: "Financial Management (revenue) — 1 hub + 7 articles = 8 pages"
- Each card shows: cluster name, framework type parenthetical, hub title, spoke count, total pages
- Cards use the established color coding: emerald for revenue clusters, sky for authority clusters

Secondary (toggle) view:
- Visual tree: CE at root → clusters → hubs → spokes
- Collapsible nodes, click to expand
- Available via "Show tree view" toggle

The cluster-count view is what 80% of users need. It answers: "how many pages, organized how?" The tree is there for the 20% who want to see the full hierarchy.

### Decision 7: Brief Preview — Full Expandable
**Choice: Briefs show as compact cards by default. Click to expand into full heading tree with all badges (format, snippet target, EAV count, word count).**

Compact card (default):
- One line per brief: title, word count target, section count, EAV count, status badge
- Framework label: "(revenue page)" or "(authority page)"
- Enough info to scan 49 briefs in 30 seconds

Expanded view (on click):
- Full heading hierarchy: H1 → H2 → H3 with indentation
- Format badge per section: prose (gray), table (blue), list (green), definition (amber)
- Featured snippet target badge where applicable: "FS: paragraph <40w" or "FS: list 5 items"
- Required EAV triples listed: "8 business facts assigned to this page"
- Internal link targets: "Links to: Financial Hub, Services Hub, Regional pages"
- Word count breakdown per section

The expand/collapse is instant — no re-fetch needed, all data is in the brief object. User can expand one brief, review it, collapse, expand the next. Quick sequential review flow.

### Decision 8: Waves — All Visible, User-Controlled, Action-Guided
**Choice: Show all 4 waves simultaneously. Each wave explains WHY this order, WHAT to do, and HOW to implement. User can move topics between waves.**

Each wave card shows:
1. **Wave name + rationale:** "Wave 1: Your Services (revenue pages) — publish these first because they drive revenue and conversions. These pages should go live before anything else because they directly serve customers searching for your services."
2. **Action guidance:** "After publishing: submit URLs to Google Search Console, add internal links from your homepage, share on your business social channels."
3. **Improvement notes:** "These pages will be strengthened in Wave 2 when authority content links back to them. Expect ranking improvements within 4-6 weeks of Wave 2 publishing."
4. **Topic list:** Expandable list of pages in this wave, each draggable to other waves.
5. **Wave dependencies:** "Wave 3 (Regional) needs: 6 office addresses to be confirmed in your business facts."

**User control:**
- Drag-and-drop topics between waves (or select + "Move to Wave X" button)
- If user moves a topic, the system shows impact: "Moving 'VvE Sustainability' from Wave 2 to Wave 1 adds 1 page to Wave 1. Note: this page references EAV values about energy certifications — confirm these values are filled before generating."
- User can also reorder waves (e.g., "We want authority content before regional content")
- Changes persist — the user's wave arrangement is what gets generated

The key insight: waves aren't just a technical sequence — they're a **publishing strategy**. The user needs to understand WHY "revenue pages first" is the right strategy, and feel empowered to adjust if their business situation demands it ("we have a sustainability campaign launching next month — move those to Wave 1").

### Decision 9: Contextual Approval Gate Text
**Choice: Every approval button uses step-specific language. No generic "Approve" buttons.**

| Step | Button text | What it means to the user |
|------|-----------|--------------------------|
| Crawl | "Confirm Business Profile" | "Yes, you described my business correctly" |
| Gap Analysis | "Confirm Competitive Analysis" | "Yes, these gaps are real" |
| Strategy | "Approve Strategy" | "Yes, this CE/SC/CSI definition is correct" |
| EAVs | "Confirm Business Facts" | "Yes, these facts about my business are accurate" |
| Map | "Approve Content Plan" | "Yes, build these pages in this structure" |
| Briefs | "Approve Content Specs" | "Yes, write the content according to these specs" |
| Content | "Approve Articles" | "Yes, this content is ready to publish" |
| Audit | "Accept Audit Results" | "Yes, the quality scores are acceptable" |
| Tech Spec | "Approve Technical Specs" | "Yes, hand this to the developer" |

The reject/revise buttons are also contextual:
- "Adjust Strategy" instead of "Revise"
- "Edit Business Facts" instead of "Revise"
- "Modify Content Plan" instead of "Revise"

This removes the feeling of generic software. Every interaction speaks the user's language about what they're actually deciding.

---

## Step 0 — Discover (Site Scanner)

### The Trust Moment
User enters their URL. The system comes back with: *"You're a B2B VvE management company based in the Netherlands, founded in 1953, serving homeowner associations with financial, technical, and sustainability services across 6 regional offices."*

The user thinks: **"It actually read my website and got it right."**

### Current State
- Greenfield: blank BusinessInfoForm — user types everything manually
- Migration: sitemap crawl + auto-research fills some fields
- No crawl progress visibility

### What Changes

| # | Improvement | What the user sees | Effort |
|---|-----------|-------------------|--------|
| C1 | **Business profile auto-generation** — one AI call from URL or seed keyword returns ALL business context fields pre-filled. Every field gets a small "Detected from website" badge. User only corrects what's wrong, never fills from scratch. | A complete business profile card: industry, language, market, audience, value proposition — all pre-filled. Each field editable with an amber "verify" icon that turns green on confirm. | Medium |
| C2 | **Discovery narrative (Decision 1)** — the moment the user enters a URL, the screen splits into two zones. Left: a live discovery feed — "Scanning sitemap... Found 47 pages... Detected Dutch language content... Found 6 regional office pages... Identified service catalog structure..." with checkmarks appearing as each discovery completes. Right: business profile card fields filling in one-by-one as data arrives. The crawl and the profile build happen simultaneously. The user watches both: their site being read AND their business profile materializing. By the time the narrative says "Discovery complete," every field is populated. | Two-column layout: left = live narrative with discoveries appearing line-by-line (each with a checkmark animation), right = business profile card with fields sliding into view as they're detected. Feels like watching an expert analyst read your website in real time. | Medium |
| C3 | **Site snapshot summary** — after discovery completes, the narrative collapses into a 4-card summary: Pages (47), Internal Links (312), Content Areas (6 topics detected), Technical Health (TTFB, CLS). This becomes the permanent "your site at a glance" reference. | Four metric cards that transition in as the narrative completes. User can glance and think "yes, that sounds right for my site." The narrative stays accessible via "Show discovery log" toggle. | Low |
| C4 | **Greenfield: business inference from seed keyword** — even without a URL, "elektrische fietsen" → the AI shows a shorter narrative: "Analyzing keyword... Detected Dutch language... Industry: E-commerce / Mobility... Audience: Consumers looking to buy e-bikes..." Same narrative pattern, shorter sequence. | Same discovery narrative but from keyword analysis instead of crawl. Same business profile card populating. User experience is consistent whether they have a URL or not. | Low |

---

## Step 0b — Competitive Intelligence

### The Trust Moment
The system shows: *"Your competitors cover 8 topics you don't. The top 3 gaps: sustainability certifications, cost calculators, and customer testimonials. Here's what they're saying about VvE management that you're not."*

The user thinks: **"It's finding things my marketing team missed."**

### Current State
- Skipped entirely in greenfield mode
- Migration: health scores, gap findings, entity inventory — but framed as SEO metrics

### What Changes

| # | Improvement | What the user sees | Effort |
|---|-----------|-------------------|--------|
| G1 | **Central Entity detection with evidence** — show the entity the system detected from the website, with proof: "Your website talks about 'VvE' on 42 of 47 pages. It appears in your navigation, footer, and meta titles. This is your Central Entity." | A card showing their main topic/entity with a site presence heatmap — page count, navigation presence, title presence. User thinks "yes, that IS what we're about." | Medium |
| G2 | **Competitor insight panel (business language)** — instead of "competitor EAV triples", show: "What your competitors say that you don't." Table: Attribute | Competitors mention | You mention | Gap. Example: "ISO certification — 4/5 competitors mention it — you don't." | A comparison table where the user instantly sees blind spots. Not SEO jargon — business facts their competitors promote that they don't. | Medium |
| G3 | **Greenfield: market landscape** — even without a site, show what the top 5 sites covering this keyword talk about. "The market for [seed keyword] is dominated by these topics: [list]. Here's what you'll need to cover to compete." | A market overview card: "5 competitors analyzed. They collectively cover 12 topic areas. The most common: pricing (5/5), reviews (4/5), how-to guides (4/5)." | Medium |
| G4 | **Feed detected entity into Strategy** — auto-populate the CE field in the next step. Show "Detected from your website" badge. No manual typing needed for the most important field in the entire system. | CE field arrives pre-filled at Strategy step. User just confirms. | Low |

---

## Step 1 — Strategy (Five Components)

### The Trust Moment
The system shows: *"Your business is about VvE management (that's your Central Entity). You're a B2B service provider (Source Context). People search for you to manage, maintain, make sustainable, and take care of their VvE (those are your 4 search predicates). We'll build content in 7 groups: 5 for your services and 2 for educational content."*

The user thinks: **"That's exactly what we do. And the content structure makes perfect sense."**

### Current State
- AI auto-suggests CE, SC, CSI on mount — works well
- Color-coded cards (emerald/sky/amber) — just fixed
- Section Allocation is informational only — no actual clusters shown

### What Changes

| # | Improvement | What the user sees | Effort |
|---|-----------|-------------------|--------|
| S1 | **Content areas preview (Decision 4 + Decision 6)** — when AI suggests pillars, also return 5-7 content groups named in hybrid business+framework language. Two columns: **"Revenue pages"** (emerald) and **"Authority pages"** (sky). Each group shows business name + framework label: "Financial Management (revenue)", "Technical Maintenance (revenue)", "Knowledge Base (authority)". The parenthetical teaches the framework through repetition — by the Map step, the user naturally thinks in revenue vs. authority terms. | Two columns: emerald column = revenue page groups, sky column = authority page groups. Each entry: "Financial Management (revenue)" with business-recognizable name primary, framework term secondary. User sees their service lines AND learns the framework: "Oh — our services are 'revenue pages' and our guides are 'authority pages.' That makes sense." | Medium |
| S2 | **CE evidence card** — show WHERE on the site the entity was found. "VvE appears on 42/47 pages, in navigation, in 38 meta titles." If greenfield: "This entity will anchor every page we create." | A small evidence panel on the CE card. User sees proof the system analyzed their site. Builds trust through transparency. | Low |
| S3 | **"What people search for" preview** — under each predicate, show 2-3 real search query examples. Not "predicate: buy" but "People search: 'VvE beheren', 'VvE beheer kosten', 'professioneel VvE beheer'." | Predicate pills expand to show real search queries. User recognizes the queries their customers actually type. | Low |
| S4 | **Priority reasoning** — each SC priority shows a one-line explanation. Not just "1. Price" but "1. Price — most searched attribute by your target audience." | Subtle reasoning text below each priority. User understands why that order was chosen. | Low |
| S5 | **Content areas seed the Map** — persist the cluster names so the Map step uses them as starting points. The map refines the clusters — it doesn't invent new ones from scratch. Continuity between steps. | User sees the same business-recognizable names flow from Strategy into the Map. No jarring "where did these cluster names come from?" moments. | Low |

---

## Step 2 — Business Facts (EAV Inventory)

### The Trust Moment
The system shows: *"We found 24 facts about your business from your website. You were founded in 1953, manage 4,000+ VvEs across 100,000 apartment rights, and have 11 offices. We also found 6 facts that conflict across your pages — and 8 facts your competitors mention that you don't."*

The user thinks: **"It knows our facts better than our own website does. And it caught inconsistencies we didn't even know about."**

### Current State (BIGGEST GAP)
- Template-based: generates attribute templates with EMPTY values
- User must manually fill in every single value
- No extraction from crawled content
- No competitor comparison
- No consistency rules

### What Changes

| # | Improvement | What the user sees | Effort |
|---|-----------|-------------------|--------|
| E1 | **Auto-extract facts from the website (Decision 2)** — after crawl, run an LLM pass over the crawled page content to extract entity+attribute+value triples. Pre-fill the value column. **Sort by confidence: GREEN first, then AMBER, then RED at the bottom.** User scans from top: confirms the obvious facts quickly, then focuses attention downward on items that need judgment. The cognitive flow is "yes, yes, yes, yes — hmm, let me check this one." | A fact inventory sorted by confidence. Top section: green-badged facts the user confirms with one click ("Founded 1953 — from /about-us"). Middle: amber-badged facts that need verification ("200+ employees — from /services, last updated 2024"). Bottom: red-badged gaps ("ISO certification — 4/5 competitors mention this, you don't"). Total time: 2 minutes to confirm 20 items and correct 3. | High |
| E2 | **"What competitors say about you" panel** — show attributes that competitors mention about similar businesses but the user's site doesn't. These appear as RED-confidence rows at the bottom of the sorted list: "4 of 5 competitors mention ISO certification. You don't mention any certifications. Do you have any?" with a text field to add the value or a "Not applicable" dismiss button. | RED-badged rows at the bottom of the inventory, clearly separated: "Competitor insights — facts others mention that you don't." User sees market expectations: "Oh right, we DO have SKG-IKOB certification — we just never mention it." Adds value in one click, dismisses irrelevant ones. | Medium |
| E3 | **Canonical formulations (KBT rules)** — after values are confirmed, auto-generate the exact phrasing to use site-wide. "Always say: 'since 1953' — Never say: '70+ years experience', 'founded decades ago'." These rules ensure every page says the same thing about the same fact. Shown as a collapsible "Consistency Rules" panel below the inventory. | A "Consistency Rules" card that appears once values are confirmed. Shows: canonical form, forbidden variants, and which existing pages currently violate it. User sees the system is protecting them from contradicting themselves. Feels like a brand style guide generated automatically. | Medium |
| E4 | **Confidence sorting logic** — GREEN = from structured data, About page, Schema markup, official headers. AMBER = from secondary content pages, blog posts, inferred from context. RED = from competitors only, uncertain extraction, or contradicted across pages. Sorting: GREEN → AMBER → RED. Within each band, sort by attribute importance (UNIQUE first, then ROOT, RARE, COMMON). | The visual hierarchy does the prioritization work. User's eye naturally starts at the top (confirmed facts) and works down (uncertain facts). The most important uncertain facts appear first within the amber band. No manual prioritization needed. | Low |
| E5 | **Inline confirm/edit pattern (Decision 5)** — each row has a confirm button (checkmark) and an edit button (pencil). GREEN rows: one-click confirm → row turns green tint, checkmark replaces button, row compacts slightly but stays visible. AMBER rows: show the source text and current value side-by-side, one-click confirm OR edit field. RED rows: show the competitor evidence and a "Add value" text field or "Not applicable" dismiss. **Confirmed rows never disappear** — they compact and turn green so the user can always scroll back and see the full inventory. The visual hierarchy does the work: green (compact, done) → amber (normal, needs check) → red (normal, needs action). | Every row is actionable in one click. Confirmed rows shrink but stay. The list starts mostly amber/red at the top (sorted by confidence), and as the user works through it, rows turn green — the whole list visually "greens up" from top to bottom. By the time they're done, the list is mostly green with a few amber edits and red additions. Feels like progress. No items vanish. | Medium |
| E6 | **Contradiction alerts (inline)** — if the same fact appears differently on different pages, show an AMBER row with both values: "Your website says two things: '/about-us says Founded 1953' vs '/services says 50+ years experience.' Which is correct?" with radio buttons to pick. | Contradictions appear as special amber rows with a "resolve" interaction. Not a separate panel — inline in the confidence-sorted flow. User resolves while scanning. These are the moments that build the most trust: "the system caught inconsistencies on MY OWN site." | Medium |

---

## Step 3 — Content Architecture (Topical Map)

### The Trust Moment
The system shows: *"We've planned 56 pages across 7 content areas, organized around your VvE management services. Here's your content map: Financial Management (8 pages), Technical Maintenance (8 pages), Sustainability (8 pages)... Each area has one main hub page and 7 supporting articles. We've mapped 312 internal links between them."*

The user thinks: **"This is exactly how I'd organize our knowledge — but more thorough than anything we've ever built."**

### Current State
- AI generates hubs + spokes — works well
- Hub-spoke architecture, URL slugs, link flow, contextual bridges, publishing waves — all shown
- Missing: semantic distances, anchor text rules, bridge documentation

### What Changes

| # | Improvement | What the user sees | Effort |
|---|-----------|-------------------|--------|
| M1 | **Cluster cards with page counts (Decision 6 — primary view)** — default view shows each content area as a card: "Financial Management (revenue) — 1 hub + 7 articles = 8 pages." Cards use hybrid naming from Decision 4. Emerald border for revenue clusters, sky border for authority clusters. Each card expandable to show the hub title and first 3 spoke titles. Below the cards: a "Show tree view" toggle reveals the full CE → cluster → hub → spoke hierarchy as a collapsible tree. 80% of users never need the tree — the cards tell them everything: how many pages, organized how, in language they recognize. | Cluster cards as primary: "Financial Management (revenue) — 8 pages", "Knowledge Base (authority) — 8 pages". Each card shows hub title on expand. Relevance indicator as a subtle badge: "core service" (green), "supporting topic" (blue), "bridged topic" (amber). Tree view available via toggle for users who want the full hierarchy. | Medium |
| M2 | **Linking strategy card** — plain-language linking rules derived from the map: "Every article links back to its main page. Authority pages always link to revenue pages. Main pages connect through shared topics. No link text used more than 3 times per page." Uses framework-teaching language: "authority pages → revenue pages" matches the labels from Strategy. | A rules panel in framework-teaching language. User recognizes the terms from Strategy step: "authority pages link to revenue pages — right, the knowledge content supports the service content." Framework vocabulary reinforced through context. | Low |
| M3 | **Content bridges explained** — for each hub-to-hub connection, show the shared business concept: "Financial Management connects to Technical Maintenance through maintenance budgets (MJOP). When talking about budgets, we'll link to maintenance and vice versa." | Bridge cards showing: "Topic A ↔ Topic B — connected through: [shared concept]." User sees natural business connections. "Of course budgets and maintenance are connected — we deal with both." | Medium |
| M4 | **Strategy clusters as seeds** — if content areas were defined at Strategy (S1), use them as starting points. The map refines (splits, merges, adds pages) but the names and framework labels stay recognizable. "Financial Management (revenue)" at Strategy becomes "Financial Management (revenue) — 8 pages" in the Map. Continuity builds trust. | Same hybrid names from Strategy appear in the Map, now with page counts. User thinks "this is the plan from the previous step, now with specific pages filled in." No jarring name changes. | Low |
| M5 | **Existing page mapping (migration)** — for existing sites, show: "Your page /about-us maps to new page /over-mvgm. Your page /services maps to /onze-vve-diensten. 12 pages need redirects. 8 new pages will be created." | A mapping table: Old URL → New URL → Action (keep/redirect/create new). User sees their existing site transforming, not being replaced. | High |

---

## Step 4 — Content Briefs

### The Trust Moment
The system shows: *"Here's the content plan for 'Financial Management of your VvE' (revenue page). This page targets the query 'VvE financien.' It will have 1,200 words across 6 sections: What is VvE financial management? (definition paragraph), How is the budget structured? (comparison table), What is the reserve fund? (legal requirement list), etc. We'll mention 8 specific facts from your business data on this page."*

The user thinks: **"This reads like a professional content strategist wrote it. It uses our actual business data. And I can see which sections will be tables vs. paragraphs."**

### Current State
- AI generates ContentBrief with structured_outline — works
- Wave-grouped generation, writing rules, preview, validation, anchor strategy — all shown
- Missing: format per section, snippet targets, EAV per page, word count targets

### What Changes

| # | Improvement | What the user sees | Effort |
|---|-----------|-------------------|--------|
| B1 | **Section format badges (visible in Decision 7 expanded view)** — each heading in the expanded brief shows its content format: prose (paragraph icon), table (grid icon), list (bullet icon), definition (quote icon). User sees at a glance what each section will look like. In compact view, shows only the format count: "3 prose, 2 tables, 1 list." | Compact card: "6 sections (3 prose, 2 tables, 1 list)". Expanded: "H2: How is the budget structured? [TABLE]" — user instantly knows this section will have a comparison table. | Medium |
| B2 | **Search result targets per section (visible in expanded view)** — show which sections target a Google answer box: "This section is designed to appear as a direct Google answer: paragraph, max 40 words." Shown as small badges: "Google answer: paragraph" or "Google answer: list (5 items)." Framework-teaching language — not "FS target" but "Google answer." | Compact card: "2 Google answer targets." Expanded: Small badges on applicable sections. User understands which parts of their content are designed to appear directly in search results. | Medium |
| B3 | **Business facts assigned per page** — cross-reference EAV inventory: "This page will mention: founded 1953, manages 4,000+ VvEs, SKG-IKOB certified." Show as "Required Facts" panel in expanded view. Compact card shows count: "8 business facts." | Compact: "8 business facts assigned." Expanded: checklist of specific facts. User sees their own data mapped to pages: "Oh, the founding year appears on About AND Services — makes sense." | Medium |
| B4 | **Opening sentence hints (expanded view only)** — for each section, show what the first sentence should establish: "Lead with: Define what a VvE reserve fund is." Guides content generation to lead with the answer. | Visible only in expanded view. Subtle hint text per section. User sees the content strategy: "lead with the answer, then elaborate." Matches their intuition about good writing. | Low |
| B5 | **Word count targets (visible on compact card)** — hub pages: 1,200-1,500 words. Spoke pages: 800-1,200 words. Regional pages: 600-800 words. Show as metric on each compact brief card. | A word count badge visible even without expanding. User quickly scans 49 briefs: "main pages ~1,300 words, sub-pages ~900. That feels right." | Low |

---

## Step 5 — Content Generation

### The Trust Moment
The system shows: *"Wave 1: Your Services (revenue pages) — 8 pages, 12,400 words, average quality 91%. We published these first because they directly serve customers searching for your services. All 8 pages consistently mention 'since 1953' and '4,000+ VvEs.' Next: submit these URLs to Google Search Console and add homepage links."*

The user thinks: **"It didn't just write the content — it told me exactly what to do next. And it wrote 8 pages that all say the same thing about our company. Our own team can't even do that."**

### Current State
- 10-pass content generation — fully implemented
- Wave-by-wave execution, progress tracking, quality scores
- Missing: wave rationale, action guidance, user control, cross-page consistency, content preview

### What Changes

| # | Improvement | What the user sees | Effort |
|---|-----------|-------------------|--------|
| W1 | **Wave cards with rationale + actions (Decision 8)** — all 4 waves visible simultaneously. Each wave card shows: (1) **Why this order:** "Revenue pages first — these drive conversions and establish your service authority." (2) **After publishing:** "Submit to Search Console, add homepage links, share on business channels." (3) **What happens next:** "These pages get stronger in Wave 2 when authority content links back." (4) **Dependencies:** "Wave 3 needs 6 office addresses confirmed." The user understands the strategy, not just the sequence. | Four wave cards, all visible. Each has a rationale panel (collapsible, open by default on first visit): WHY this wave order, WHAT to do after publishing, HOW this wave connects to the next. User feels guided through a strategy, not clicking "generate" buttons blindly. | Medium |
| W2 | **User-controlled wave composition** — topics can be moved between waves. Drag-and-drop or "Move to Wave X" dropdown per topic. When user moves a topic, system shows impact: "Moving 'VvE Sustainability' to Wave 1 adds 1 page. Note: this page uses 3 EAV values about energy certifications — make sure those are confirmed." User can also reorder entire waves. Changes persist. | Each wave's topic list has move controls. User drags a topic or clicks "Move to Wave 2." System shows a brief impact note. User feels in control: "We have a sustainability campaign next month — let me move those pages to Wave 1." Their business reality overrides the default sequence when needed. | Medium |
| W3 | **Consistency verification** — after each wave completes, scan all generated content for EAV mentions and compare against the inventory. "All 8 pages in Wave 1 consistently say 'since 1953' and '4,000+ VvEs.' Zero contradictions." Or: "Warning: page 3 says 'founded in 1952' — EAV says 1953." | A consistency report per wave. Green checkmark = all facts consistent. Red alert = contradiction found with exact location. This is the moment: "It checks its own work. Our content team doesn't do that." | Medium |
| W4 | **Content preview (expandable per page)** — each generated page shows a compact card: title, word count, quality score. Click to expand: H1, first 2-3 paragraphs rendered in readable format. User scans their content without leaving the pipeline. | Compact cards per page (Decision 7 pattern, same as briefs). Click to expand and read. User checks: "this sounds like us" or "tone needs adjusting." Quick scan, not deep editing. Consistent expand/collapse pattern from Briefs step — user already knows how this works. | Low |
| W5 | **Wave quality indicator** — show average quality score per wave with a threshold: "Wave 1: 91% average (above 85% target)." If below, amber warning with specific issues. Not a hard block — user decides whether to proceed or fix. | A quality bar per wave card. Green above 85%, amber below. Expandable to show which specific pages pulled the average down. User has the info to decide: fix now or proceed and fix in audit. | Low |
| W6 | **Pre-flight dependency check** — before generating, check if all required EAV values for that wave's pages are filled. "Wave 3 (Regional) needs: Amsterdam office address, Rotterdam phone number, 4 more values." Amber warning with a link back to the EAV step. Not a hard block — user can generate with missing data (placeholders will be used) or go back to fill values. | A pre-flight checklist per wave. User sees exactly what's missing. System offers a choice: "Go back to fill values" or "Generate anyway (we'll use placeholder text for missing facts)." Respects user autonomy while surfacing risks. | Medium |

---

## Step 6 — Content Audit

### The Trust Moment
The system shows: *"Overall score: 88.1%. Your Financial Management content scores 91% — strongest area. Your Regional pages score 80% — they need more unique local content. 3 pages still say 'more than 50 years' instead of 'since 1953.' Here are the fixes."*

The user thinks: **"It's auditing our content with the same rigor a senior SEO consultant would — and it caught things a human would miss."**

### Current State
- Full 15-phase audit with 282+ rules — works well
- Phase grid, severity tabs, findings, auto-fix suggestions
- Missing: KBT violations, cluster-level view, role assignment, one-click fixes

### What Changes

| # | Improvement | What the user sees | Effort |
|---|-----------|-------------------|--------|
| A1 | **Consistency violations panel** — show KBT violations in business language: "3 pages say 'more than 50 years' — the correct formulation is 'since 1953.' Fix all 3?" with an "Apply Fix" button. | A dedicated "Fact Consistency" section. User sees their own brand inconsistencies surfaced and fixable in one click. This is the moment they think "this system is more thorough than our content team." | Medium |
| A2 | **Content area scores (Decision 4 naming)** — group findings by business area using the hybrid names from Strategy/Map: "Financial Management (revenue): 91%, Technical Maintenance (revenue): 88%, Regional (revenue): 80%, Knowledge Base (authority): 91%." The framework labels help the user spot patterns: "all our revenue pages score high except Regional — and our authority pages are strong." | A bar chart of scores by content area using hybrid names. Emerald bars for revenue areas, sky bars for authority areas. User immediately sees which business areas need work AND whether revenue or authority content is stronger. Framework teaching continues through the audit. | Medium |
| A3 | **Action items by team** — tag each finding: "Your team needs to: confirm 3 business facts (business owner), fix 12 content issues (content team), implement 8 technical changes (developer)." | Three role columns: Business, Content, Developer. Each with a count and expandable list. User delegates without needing to understand the findings. "I'll send the dev list to our developer and handle the business questions myself." | Low |
| A4 | **One-click safe fixes** — for unambiguous fixes (remove filler words, standardize entity naming, fix sentence length), "Apply 23 Safe Fixes" button. Shows before/after preview. Only deterministic, no-risk changes. | A big green button: "Apply 23 automatic fixes." User clicks, score improves from 85% to 89%. Instant gratification. Trust: "the system can even fix its own output." | High |

---

## Step 7 — Technical Handoff

### The Trust Moment
The system shows: *"Here's everything your developer needs to implement this: 56 URLs, JSON-LD schema for every page type, sitemap, robots.txt, and a performance checklist. The Organization schema includes your founding date (1953), employee count (250+), and certifications — pulled directly from your verified business data."*

The user thinks: **"I can hand this to my developer and they'll know exactly what to build. The schema even uses our real data."**

### Current State
- Deliverables grid with download buttons — works
- Missing: schema previews with real data, performance checklist, navigation spec

### What Changes

| # | Improvement | What the user sees | Effort |
|---|-----------|-------------------|--------|
| T1 | **Schema previews with real business data** — show JSON-LD examples populated with actual EAV values: `"foundingDate": "1953"`, `"numberOfEmployees": "250+"`. Not generic placeholders — their real data. | Collapsible code blocks showing their actual schema markup. User sees their business data structured for Google. "It even has our founding date and certifications in the schema." | Medium |
| T2 | **Performance targets card** — simple, always-the-same card: TTFB <150ms, LCP <2.5s, INP <200ms, CLS <0.1. With implementation notes a developer can act on. | A checklist card their developer can screenshot and use as a spec. No need to research CWV targets — it's all there. | Low |
| T3 | **Navigation spec from their content** — auto-generate: header items = their 7 hub pages (by name), footer = all content areas + legal. Visual wireframe showing their actual page names in the nav. | A nav wireframe with their real page titles. User sees how their website navigation will look. "Financial Management, Technical Maintenance, Sustainability — yes, those should be our main menu items." | Medium |
| T4 | **Image specification card** — format rules, lazy loading, alt text = visual semantics from content generation, file naming convention using their CE. | A reference card their developer/designer uses for image implementation. Low effort, high utility. | Low |

---

## Step 8 — Project Summary & Calendar

### The Trust Moment
The system shows: *"Your content plan: 56 pages, 18,958 words, published over 7 weeks. Week 1: service pages (revenue-driving). Weeks 2-4: knowledge content. Week 5: regional pages. Weeks 6-7: authority content. Expected: 40+ keywords indexed by month 3, measurable organic traffic growth by month 6."*

The user thinks: **"This is a complete project plan I can present to my manager or client. It looks like a $15,000 SEO engagement packaged up."**

### Current State
- Metric cards, export options, download buttons, waves, open items
- Missing: visual calendar, projections, optimization plan, status tracking

### What Changes

| # | Improvement | What the user sees | Effort |
|---|-----------|-------------------|--------|
| X1 | **Visual content calendar** — horizontal timeline: Week 1-7, color-coded bars showing which content area publishes when, with page counts. Not a data table — a visual plan. | A Gantt-style calendar using their business-recognizable content area names. User can screenshot this for a client presentation or management approval. | Medium |
| X2 | **Open items with ownership** — each item has: what needs to happen, who does it (business/dev/content), severity, and a status checkbox. Persists across sessions. | An interactive to-do list organized by role. User checks off items as their team completes them. Progress visible: "14/28 items done." | Medium |
| X3 | **Growth projections** — conservative estimates: "Month 3: 56 pages indexed, initial rankings. Month 6: top-20 rankings for X keywords. Month 12: estimated Y organic sessions/month." Based on page count + competitive landscape. | A projections card showing 3/6/12 month milestones. User has realistic expectations. Not promises — conservative benchmarks. | Low |
| X4 | **Maintenance plan** — monthly: check rankings, update EAV values if business changes. Quarterly: add 5-10 new articles, refresh top pages. Annual: full re-audit, competitor re-analysis. | A "What happens after launch" card. User knows the content plan doesn't end at publication — it's an ongoing asset. | Low |

---

## Cross-Step: The Journey Experience

These improvements affect how the user experiences the overall pipeline, not individual steps.

| # | Improvement | What the user experiences | Effort |
|---|-----------|--------------------------|--------|
| J1 | **Adaptive display (Decision 3)** — three states per step: (1) **AI working** → show live process narrative: "Analyzing your content areas... Found 7 clusters... Assigning pages to clusters..." with progress. (2) **Waiting for user** → show form with helpful context and examples. (3) **Data exists** → show readable summary card with "Adjust" button to reveal editors. User reads the summary, edits only if something is wrong. **The screen is never blank or silent.** Always either showing process or showing results. | Three states, seamless transitions. User arrives at a step and immediately sees something useful: either the AI working (with narrative), the result (as summary), or a guided form (with context). No empty screens, no "loading..." with no context. When a summary is shown, 80% of users will think "looks right" and approve. The 20% who need changes click "Adjust" to reveal editors. | Medium |
| J2 | **Data source badges** — every piece of data shows where it came from: "From your website" (green), "AI-suggested" (purple), "From competitors" (blue), "You entered this" (gray). These appear in both summary and edit views. | Small badges next to every field. User can tell at a glance: "this was extracted from my site, this was AI-suggested, this I typed myself." Trust through provenance. In summary view, badges help user scan without expanding editors. | Medium |
| J3 | **Auto-approve with review window** — when auto-approve is on, show the summary card for 3 seconds with a "Pause" button before advancing. Currently auto-approve skips instantly — user sees nothing, learns nothing. Combined with J1: auto-approve mode shows each summary briefly, then advances — the user watches their business plan build itself. | A brief pause at each step where the user sees the result flash by. They can pause if something looks wrong. Otherwise the pipeline flows smoothly. Like watching their business get organized in real-time — each step's summary appears, holds for 3 seconds, then advances. | Medium |
| J4 | **Resume intelligence** — when user returns to a mid-pipeline project, show: "You left off at Business Facts — 3 values need confirmation. Your service pages are already planned (56 pages across 7 areas)." Uses the adaptive display: completed steps show summaries, current step shows its appropriate state. | A welcome-back banner showing progress and next action. Completed steps show collapsed summaries the user can expand. Current step picks up where they left off. User doesn't need to remember where they were — the system tells them. | Low |
| J5 | **Progress ring** — circular indicator in the pipeline header: 0-100%. Fills as steps complete. Each step contributes proportionally: Strategy 15%, EAVs 10%, Map 20%, Briefs 15%, Content 25%, Audit 10%, Export 5%. | A visual progress indicator that fills as the user advances. Motivation: "I'm 65% done — let me finish the last few steps." | Low |

---

## Priority Matrix — Reframed

### Tier 1: "The system already knows my business" (Trust-building)

These are the moments that make the user go "wow, it actually read my website."
They must happen early — this is where trust is earned or lost.

| # | What | Trust moment | Decision |
|---|------|-------------|----------|
| C1+C2 | Auto-fill business profile + discovery narrative | "It's reading my website right now — and it figured out we're a B2B VvE management company." | **Decision 1** |
| G1 | Detect Central Entity from crawl | "It knows our main topic is VvE management." | |
| E1+E4 | Extract facts with confidence sorting | "It found we were founded in 1953 from our About page — and sorted the certain facts at the top." | **Decision 2 + 5** |
| E6 | Surface contradictions | "It caught that we say '50 years' on one page and '1953' on another." | |
| G2 | Show competitor gaps | "It found 4 competitors mention ISO certification — we don't." | |

### Tier 2: "It organized my business better than I could" (Value delivery)

These show the user a version of their business that's smarter than what they had.

| # | What | Value moment | Decision |
|---|------|-------------|----------|
| S1 | Content areas in hybrid business+framework language | "It organized our services into 7 areas — and taught me the difference between revenue and authority pages." | **Decision 4** |
| B3 | Business facts mapped to pages (expandable briefs) | "I can expand any brief and see exactly which facts go on which page." | **Decision 7** |
| E3 | Canonical formulations (KBT) | "It locked 'since 1953' as the only way we say this across all pages." | |
| W1+W2 | Wave strategy with rationale + user control | "It explains WHY revenue pages go first — and I can rearrange if my business needs differ." | **Decision 8** |
| A2 | Scores by content area with framework labels | "Financial (revenue) scores 91%, Regional (revenue) is 80%. I can see the pattern." | **Decision 4** |

### Tier 3: "I can hand this to my team" (Deliverable quality)

These make the output professional enough to share with stakeholders.
Combined with the adaptive display pattern so summaries ARE the deliverable preview.

| # | What | Deliverable moment | Decision |
|---|------|-------------------|----------|
| J1 | Adaptive display (summary/process/form) | "I can review the whole plan in 10 minutes by reading the summaries. Or watch it build itself." | **Decision 3** |
| X1 | Visual content calendar | "I can show this Gantt chart to my client." | |
| T1 | Schema with real data | "I can give this to my developer — it has our actual business data." | |
| X2 | Open items with ownership | "I can assign tasks to business/dev/content — everything is tracked." | |
| Gates | Contextual approval language | "I click 'Confirm Business Facts' not 'Approve' — I know exactly what I'm deciding." | **Decision 9** |

### Tier 4: "The details are right" (Framework quality)

These ensure the semantic SEO framework operates at full quality underneath.

| # | What | Quality impact | Decision |
|---|------|---------------|----------|
| B1+B2 | Format + snippet targets per section | Content generation produces structured, snippet-optimized output | **Decision 7 (visible in expanded view)** |
| M1 | Cluster cards with page counts + tree toggle | Map is scannable AND detailed when needed | **Decision 6** |
| M2 | Anchor text linking rules in framework language | Links use "authority → revenue" vocabulary user already learned | **Decision 4** |
| W6 | Pre-flight dependency checks per wave | Prevents generating with missing facts, respects user autonomy | **Decision 8** |
| A1+A4 | KBT violation panel + one-click safe fixes | Ensures fact consistency, auto-fixes safe issues | |

---

## Implementation Order

**Phase 1 — "It knows my business" (Tier 1 trust — the foundation everything rests on):**

The entire pipeline's credibility rests on this phase. If Step 0 shows the user their business accurately reflected back, they trust every step that follows. If it gets their business wrong, they'll second-guess everything.

1. **C1+C2: Discovery narrative with parallel business profile (D1)** — user enters URL, watches the system read their site in real-time, sees fields populate. This IS the first impression.
2. **G1+G4: Detect CE from crawl, auto-populate Strategy** — the most important single field in the system arrives pre-filled with evidence.
3. **E1+E4+E5: Extract, confidence-sort, inline confirm (D2+D5)** — GREEN facts at top (one-click confirm, stay visible), RED gaps at bottom. User confirms in 2 minutes, not 20.
4. **E6: Surface contradictions** — the "smarter than my marketing team" moment.
5. **G2+E2: Competitor gaps as RED-confidence rows** — "what competitors say that you don't" in the same sorted list.

**Phase 2 — "It organized my business better" (Tier 2 value — the strategic layer):**

Now the user trusts the data. This phase shows them their business organized into a content plan they recognize but couldn't have built themselves. Framework vocabulary introduced through the hybrid naming.

6. **S1+S5: Content areas with hybrid naming (D4), feeding into Map** — "Financial Management (revenue), Knowledge Base (authority)" — user learns the framework through their own content.
7. **E3: KBT consistency rules** — the consistency layer that protects brand integrity.
8. **M1+M4: Cluster cards with page counts (D6), seeded from Strategy** — continuity between steps, cluster-count primary view.
9. **B3+B1+B2: Business facts per page + format/snippet badges (D7)** — expandable briefs: compact by default, full detail on click.
10. **W1+W2+W6: Wave strategy with rationale, user control, dependencies (D8)** — user understands why, can rearrange, sees what's missing.

**Phase 3 — "I can hand this to my team" (Tier 3 deliverables — the output layer):**

User trusts the data, understands the plan. Now the system produces deliverables they can share — with contextual language throughout.

11. **J1: Adaptive display pattern (D3)** — process narrative when AI works, summary when done, form when needed. Applied across all steps.
12. **Decision 9: Contextual approval gates** — "Confirm Business Facts", "Approve Content Plan", "Approve Articles" — applied across all steps.
13. **X1: Visual content calendar** — the deliverable every client asks for.
14. **A2: Scores by content area (D4 naming)** — "Financial Management (revenue): 91%" — framework labels in the audit.
15. **T1+X2: Schema with real data + open items with ownership** — developer handoff + task tracking.

**Phase 4 — "The details are right" (Tier 4 framework — the quality layer):**

Framework-level improvements that make the output genuinely better.

16. W3+W4+W5: Cross-page EAV consistency, content preview, wave quality indicators
17. M2+M3: Anchor text strategy card + contextual bridge enrichment
18. A1+A4: KBT violation panel + one-click safe fixes
19. A3: Role-based action assignment
20. Remaining polish (J2-J5, T2-T4, X3-X4, B4-B5, S2-S4, M5, C3-C4)

---

## Decisions Summary

| # | Decision | Scope | Pattern |
|---|----------|-------|---------|
| D1 | Discovery Narrative | Step 0 | Live feed of discoveries + parallel field population |
| D2 | Confidence Sorting | Step 2 | GREEN (high) first → AMBER → RED (low/competitor) last |
| D3 | Adaptive Display | All steps | Process when working, summary when done, form when needed |
| D4 | Hybrid Naming | All steps | "Financial Management (revenue pages)" — business primary, framework secondary |
| D5 | Green Stays Visible | Step 2 | Confirmed facts turn green + compact, never disappear |
| D6 | Cluster Counts Primary | Step 3 | Cards with page counts default, tree diagram via toggle |
| D7 | Full Expandable Briefs | Step 4+5 | Compact card default, click for full heading tree with all badges |
| D8 | Action-Guided Waves | Step 5 | All waves visible, rationale + actions + user can rearrange topics |
| D9 | Contextual Gates | All steps | "Confirm Business Facts" not "Approve" — step-specific language |
