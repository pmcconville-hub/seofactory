# Phase 3 Brainstorm: Core System Features

**Date**: 2026-01-26
**Status**: Deep Analysis Complete - Ready for Decision
**Criticality**: HIGH - These features touch the core Semantic SEO system

---

## Executive Summary

Phase 3 involves three features that integrate deeply with the Semantic SEO workflow:

| Feature | Impact | Risk | Implementation Effort |
|---------|--------|------|----------------------|
| **Entity Research Panel** | Very High | Low | Medium |
| **Knowledge Graph Explorer** | High | Medium | High |
| **Organization Leaderboard** | Medium | Low | Low |

**Recommended Order**: Entity Research → Knowledge Graph Explorer → Leaderboard

---

## Feature 1: Entity Research Panel

### Why This Matters for Semantic SEO

Per the EAV Architecture skill:
> "Knowledge-Based Trust (KBT) is the trust score determined by accuracy and consistency of EAV triples."
> "High KBT requires: Values match external knowledge bases (Wikipedia, authoritative sources)"

**Current Gap**: Users create EAV triples without verifying entities against authoritative sources. This risks:
- Incorrect entity names (KBT penalty)
- Missing Wikidata IDs (no schema.org entity resolution)
- Unverified facts (contradicts Knowledge Panel requirements)

### Available Infrastructure

**Services Ready to Use**:

| Service | Methods | Data |
|---------|---------|------|
| `wikipediaService.ts` | `verifyEntity()`, `searchWikipedia()`, `getWikipediaPage()`, `getWikipediaCategories()` | Title, extract, Wikidata ID, categories, links |
| `googleKnowledgeGraphService.ts` | `validateEntityAuthority()`, `searchKnowledgeGraph()` | Authority score (0-100), E-A-T breakdown, verification status |
| `mentionScanner.ts` | `validateEntityIdentity()`, `calculateEATBreakdown()` | Expertise/Authority/Trust scores |

**Database Support**:
- `entity_resolution_cache` table exists for caching Wikidata resolutions

### User Workflow Integration

```
EAV DISCOVERY WORKFLOW (Current)
┌─────────────────────────────────────────────────────────────┐
│ 1. Business Info → 2. Pillars → 3. EAV Discovery → 4. Map  │
└─────────────────────────────────────────────────────────────┘

EAV DISCOVERY WORKFLOW (With Entity Research)
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  3. EAV Discovery                                          │
│     ├── AI generates triples                               │
│     │     Entity: "Germany"                                │
│     │     Attribute: "Population"                          │
│     │     Value: "84 million"                              │
│     │                                                       │
│     └── [🔍 Research] ← NEW BUTTON                         │
│           │                                                 │
│           └── Entity Research Panel (Modal)                │
│                 ├── Wikipedia Summary                      │
│                 ├── Authority Score: 95/100                │
│                 ├── Wikidata ID: Q183                      │
│                 ├── Categories: European countries, etc.   │
│                 ├── Related Entities (clickable)           │
│                 │                                           │
│                 └── [✓ Confirm] [Disambiguate] [Skip]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Design

**EntityResearchPanel.tsx** - Modal with tabs:

| Tab | Data Source | Purpose |
|-----|-------------|---------|
| **Overview** | `validateEntityAuthority()` | Authority score, verification status, recommendations |
| **Wikipedia** | `getWikipediaPage()` | Extract, categories, internal links |
| **Knowledge Graph** | `searchKnowledgeGraph()` | Type, description, image, sameAs URLs |
| **Related** | `getCoOccurringEntities()` | Co-occurring entities for topic expansion |

**Props**:
```typescript
interface EntityResearchPanelProps {
  entityName: string;
  context?: string;  // CE or topic context for better matching
  onConfirm: (verification: EntityVerification) => void;
  onDisambiguate: (options: DisambiguationOption[]) => void;
  onClose: () => void;
}

interface EntityVerification {
  originalName: string;
  verifiedName: string;
  wikidataId: string | null;
  wikipediaUrl: string | null;
  authorityScore: number;
  categories: string[];
}
```

### Integration Points

1. **EAV Discovery Wizard** (`components/wizards/EavDiscoveryWizard.tsx`)
   - Add "Research" icon button next to each entity in the triple list
   - Store verified entity metadata in `SemanticTriple.subject.wikidataId`

2. **Content Brief Editor** (`components/modals/ContentBriefModal.tsx`)
   - Add "Verify Entities" action to verify mentioned entities in brief
   - Pre-populate entity cache before content generation

3. **Knowledge Graph Builder** (`hooks/useKnowledgeGraph.ts`)
   - When verified entities have Wikidata IDs, store in node metadata
   - Enable "Add verified entity" action from Research Panel

4. **Pass 9 Schema Generation** (already uses entity resolution)
   - Pre-verified entities from Research Panel will hit cache
   - Higher confidence in schema.org sameAs URLs

### Semantic SEO Compliance Check

| Principle | How Feature Supports It |
|-----------|------------------------|
| **KBT (Knowledge-Based Trust)** | ✅ Verifies facts against Wikipedia/Wikidata |
| **Entity Consistency** | ✅ Standardizes entity names via Wikipedia canonical title |
| **Schema.org Enhancement** | ✅ Provides Wikidata IDs for entity resolution |
| **E-A-T Signals** | ✅ Authority score indicates entity credibility |

---

## Feature 2: Knowledge Graph Explorer

### Why This Matters for Semantic SEO

Per the Topical Maps skill:
> "Semantic distance threshold: How far from CE can content go?"
> "Canonical queries: Which page answers which query?"

**Current Gap**: The Knowledge Graph is built but invisible. Users cannot:
- See entity relationships visually
- Identify knowledge gaps (missing ROOT/UNIQUE/RARE attributes)
- Find cannibalization risks
- Understand optimal linking opportunities

### Available Infrastructure

**KnowledgeGraph Class Methods**:

| Category | Methods | Output |
|----------|---------|--------|
| **Visualization Data** | `getNodes()`, `getEdges()`, `getEdgesByCategory()` | Network graph data |
| **Semantic Analysis** | `calculateSemanticDistance()`, `buildDistanceMatrix()` | Distance heatmap data |
| **Gap Detection** | `identifyKnowledgeGaps()` | Missing attribute categories |
| **Optimization** | `findLinkingCandidates()`, `identifyCannibalizationRisks()` | Actionable recommendations |
| **Statistics** | `getStatistics()`, `getExtendedStatistics()` | Summary metrics |

**Existing Visualization Components**:
- `SemanticDistanceMatrix.tsx` - Heatmap (can be reused)
- `CompetitorGapGraph.tsx` - Force-directed graph (pattern to follow)

### User Workflow Integration

```
TOPICAL MAP WORKFLOW
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  DASHBOARD                                                  │
│  ├── Strategy Overview                                      │
│  ├── Semantic Authority Score                               │
│  ├── [🔮 Explore Knowledge Graph] ← NEW BUTTON              │
│  │     │                                                    │
│  │     └── Knowledge Graph Explorer (Full-screen Modal)    │
│  │           │                                              │
│  │           ├── TAB 1: Network View                       │
│  │           │     Force-directed graph of entities        │
│  │           │     Color by category (ROOT/UNIQUE/RARE)    │
│  │           │     Click entity → sidebar details          │
│  │           │                                              │
│  │           ├── TAB 2: Distance Matrix                    │
│  │           │     Heatmap of semantic distances           │
│  │           │     Cannibalization warnings                │
│  │           │     Linking recommendations                  │
│  │           │                                              │
│  │           ├── TAB 3: Knowledge Gaps                     │
│  │           │     Missing ROOT attributes                  │
│  │           │     Missing UNIQUE differentiators          │
│  │           │     Suggested additions                      │
│  │           │                                              │
│  │           └── TAB 4: Statistics                         │
│  │                 Node/edge counts                        │
│  │                 Category distribution                   │
│  │                 Cannibalization risk count              │
│  │                                                          │
│  └── Topic List                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Design

**KnowledgeGraphExplorer.tsx** - Full-screen modal with tabs:

```typescript
interface KnowledgeGraphExplorerProps {
  knowledgeGraph: KnowledgeGraph;
  onSelectEntity?: (entityId: string) => void;
  onAddEntity?: (entity: KnowledgeNode) => void;
  onClose: () => void;
}
```

**Tab Components**:

1. **KGNetworkView.tsx** - Force-directed visualization
   - D3 or react-force-graph library
   - Node colors: ROOT (blue), UNIQUE (green), RARE (purple), COMMON (gray)
   - Edge thickness: Based on co-occurrence count
   - Click node → show neighbor details in sidebar

2. **KGDistanceTab.tsx** - Reuse SemanticDistanceMatrix
   - Pass `knowledgeGraph.buildDistanceMatrix()` as data
   - Show cannibalization warnings prominently
   - Click cell → linking recommendation modal

3. **KGGapsTab.tsx** - Knowledge gap analysis
   - Call `knowledgeGraph.identifyKnowledgeGaps()`
   - Group by entity
   - Show missing categories with suggestions
   - "Add EAV" button to address gaps

4. **KGStatisticsTab.tsx** - Summary metrics
   - Call `knowledgeGraph.getExtendedStatistics()`
   - Pie chart: Category distribution
   - Metrics: Node count, edge count, avg neighbors, cannibalization risks

### Integration Points

1. **Dashboard** (`components/ProjectDashboard.tsx`)
   - Add "Explore Knowledge Graph" button in Strategy section
   - Badge showing knowledge gap count (if any)

2. **EAV Manager Modal** (`components/modals/EavManagerModal.tsx`)
   - Link from gap suggestions to add missing EAVs
   - Bidirectional navigation

3. **Topic Selection**
   - When hovering/selecting a topic, highlight related entities in KG
   - Show `findLinkingCandidates()` for current topic

4. **Cannibalization Warnings** (already implemented in Phase 2)
   - Link from warning to KG Explorer distance matrix
   - Deep dive into why topics are too similar

### Semantic SEO Compliance Check

| Principle | How Feature Supports It |
|-----------|------------------------|
| **EAV Completeness** | ✅ Gap analysis identifies missing ROOT/UNIQUE/RARE |
| **Semantic Distance** | ✅ Visualizes 0.3-0.7 linking sweet spot |
| **Cannibalization Prevention** | ✅ Highlights <0.2 distance risks |
| **Hub-Spoke Validation** | ✅ Can visualize cluster structure |

### Replaces Infranodus

**Why Custom is Better**:
1. **No external API dependency** - Uses internal KG data
2. **EAV-native** - Shows UNIQUE/ROOT/RARE categories directly
3. **Semantic distance integrated** - Same calculations as content briefs
4. **Actionable** - Links to EAV manager, topic selection

---

## Feature 3: Organization Leaderboard UI

### Why This Matters

Gamification drives engagement. Users with visible progress metrics:
- Generate more content (10+ points per article)
- Target higher quality (5+ bonus for audit score ≥80)
- Compete with peers (nearby ranks view)

**Current Gap**: Complete data layer exists, zero UI.

### Available Infrastructure

**Hook Ready**: `useOrganizationLeaderboard.ts`

| Function | Returns |
|----------|---------|
| `getLeaderboard(period, limit)` | Ranked list with scores |
| `getOwnScore()` | Current org's score, rank |
| `getAchievements(orgId)` | Earned achievements |
| `getLeaderboardHistory(type, limit)` | Historical rank/score data |
| `getNearbyRanks(range)` | ±N competitors |

**Database Tables**:
- `organization_scores` - Scores, ranks, auto-calculated
- `organization_achievements` - Achievement tracking
- `organization_leaderboard_history` - Historical trends

### User Workflow Integration

```
ORGANIZATION DASHBOARD
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  HEADER: Your Organization                                  │
│  ├── Current Rank: #7 globally                             │
│  ├── Total Score: 2,450 points                             │
│  └── Articles Generated: 203                                │
│                                                             │
│  ┌─────────────────────┐ ┌─────────────────────────────────┐│
│  │  LEADERBOARD        │ │  ACHIEVEMENTS                   ││
│  │  [All] [Month] [Wk] │ │                                 ││
│  │                     │ │  🏆 First 100 Articles (+500)   ││
│  │  #1 🥇 CompanyA 5k  │ │  ⭐ Quality Streak 10 (+250)    ││
│  │  #2 🥈 CompanyB 4.2k│ │  🚀 Speed Demon (+100)          ││
│  │  ...                │ │                                 ││
│  │  #6    CompanyF 2.6k│ │  🔒 First 500 Articles          ││
│  │  #7 ➤ YOU     2.45k │ │     [███░░░░░░░] 203/500       ││
│  │  #8    CompanyH 2.3k│ │                                 ││
│  │                     │ │                                 ││
│  └─────────────────────┘ └─────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  RANK HISTORY (Last 12 weeks)                           ││
│  │  📈 [Line chart showing rank progression]               ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Design

**OrganizationLeaderboard.tsx** - Dashboard panel:

```typescript
interface OrganizationLeaderboardProps {
  organizationId: string;
  showHistory?: boolean;
  showAchievements?: boolean;
  compact?: boolean;  // For widget mode
}
```

**Sub-components**:

1. **LeaderboardTable.tsx**
   - Period toggle (all/month/week)
   - Paginated list (top 10/50/100)
   - Highlight current org row
   - Score/articles/avg audit columns

2. **AchievementGrid.tsx**
   - Earned achievements with dates
   - Locked achievements with progress bars
   - Celebration animation on new unlock

3. **RankHistoryChart.tsx**
   - Line chart (Recharts or Chart.js)
   - Weekly/monthly toggle
   - Rank on Y-axis (inverted), time on X-axis

4. **NearbyCompetitors.tsx**
   - ±5 ranks from current position
   - Delta indicators (+2, -1, =)
   - Compact for sidebar widget

### Integration Points

1. **Organization Dashboard** (primary location)
   - Full leaderboard panel with all features

2. **Admin Dashboard** (`AppStep.ADMIN`)
   - Global leaderboard view (all organizations)
   - Achievement management

3. **Project Dashboard** (widget)
   - Compact rank display in header
   - "View Leaderboard" link

### Achievement Registry Design

**Suggested Achievement Types**:

| ID | Name | Requirement | Points |
|----|------|-------------|--------|
| `first_10_articles` | Getting Started | 10 articles generated | 50 |
| `first_50_articles` | Content Creator | 50 articles generated | 150 |
| `first_100_articles` | Content Machine | 100 articles generated | 500 |
| `first_500_articles` | Content Factory | 500 articles generated | 2000 |
| `quality_streak_5` | Quality Minded | 5 consecutive ≥80 audit | 100 |
| `quality_streak_10` | Quality Streak | 10 consecutive ≥80 audit | 250 |
| `perfect_100` | Perfectionist | Article with 100 audit score | 500 |
| `category_master_unique` | Differentiation Expert | 50+ UNIQUE attributes used | 300 |
| `category_master_root` | Foundation Builder | 100+ ROOT attributes used | 300 |

---

## Decision Points for User

### 1. Entity Research Panel

**Question**: Where should the "Research Entity" button appear?

| Option | Pros | Cons |
|--------|------|------|
| **A. EAV Discovery only** | Focused, clear workflow | Users can't verify later |
| **B. EAV Discovery + Brief Editor** | More touchpoints | More complexity |
| **C. Standalone panel accessible anywhere** | Maximum flexibility | May be overwhelming |

**Recommendation**: Option B - EAV Discovery + Brief Editor

---

### 2. Knowledge Graph Explorer

**Question**: How should the KG Explorer be accessed?

| Option | Pros | Cons |
|--------|------|------|
| **A. Modal from Dashboard** | Non-destructive, easy to close | Limited screen space |
| **B. Full page route (/kg-explorer)** | Maximum space for visualization | Context switch from dashboard |
| **C. Expandable panel in Dashboard** | In-context, no navigation | Constrained size |

**Recommendation**: Option A - Modal with maximize option

---

### 3. Leaderboard Scope

**Question**: Who should see the leaderboard?

| Option | Pros | Cons |
|--------|------|------|
| **A. All users** | Maximum engagement | Privacy concerns |
| **B. Admin + Org members** | Balanced | Less competitive |
| **C. Opt-in only** | Privacy-first | Lower adoption |

**Recommendation**: Option A with org name anonymization option

---

### 4. Implementation Priority

**Question**: Which feature first?

| Option | Rationale |
|--------|-----------|
| **Entity Research Panel** | Highest impact on content quality, lowest risk |
| **Knowledge Graph Explorer** | High strategic value, replaces Infranodus |
| **Leaderboard** | Engagement feature, lowest priority |

**Recommendation**: Entity Research → KG Explorer → Leaderboard

---

## Implementation Estimates

| Feature | New Components | Complexity | Dependencies |
|---------|---------------|------------|--------------|
| **Entity Research Panel** | 3-4 components | Medium | Wikipedia/KG services (exist) |
| **Knowledge Graph Explorer** | 5-6 components | High | D3/force-graph lib, KG class |
| **Organization Leaderboard** | 4-5 components | Low | useOrganizationLeaderboard (exists) |

---

## Appendix: Type Definitions Needed

### Entity Research

```typescript
interface EntityVerification {
  originalName: string;
  verifiedName: string;
  wikidataId: string | null;
  wikipediaUrl: string | null;
  authorityScore: number;
  verificationStatus: 'verified' | 'partial' | 'unverified';
  categories: string[];
  relatedEntities: string[];
}

interface DisambiguationOption {
  name: string;
  description: string;
  wikidataId?: string;
  type?: string;
  score: number;
}
```

### Knowledge Graph Explorer

```typescript
interface KGVisualizationNode {
  id: string;
  label: string;
  type: string;
  category: 'ROOT' | 'UNIQUE' | 'RARE' | 'COMMON';
  x?: number;
  y?: number;
  neighbors: string[];
}

interface KGVisualizationEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  coOccurrenceCount: number;
}

interface KnowledgeGapResult {
  entityId: string;
  entityName: string;
  missingCategories: ('ROOT' | 'UNIQUE' | 'RARE')[];
  suggestions: string[];
}
```

### Achievement System

```typescript
interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: {
    type: 'article_count' | 'quality_streak' | 'category_usage' | 'perfect_score';
    threshold: number;
    category?: string;
  };
  points: number;
}
```

---

## Next Steps

1. **Review this document** and make decisions on the 4 questions above
2. **Confirm implementation order** (recommend: Entity Research → KG Explorer → Leaderboard)
3. **Create implementation plan** with specific tasks for chosen feature
4. **Begin implementation** with test coverage

