# Disconnected Services Audit & Integration Plan

**Date**: 2026-01-26
**Status**: Brainstorming Complete - Ready for Implementation Decisions
**Goal**: Ensure all services comply with Semantic SEO principles and deliver maximum value

---

## Executive Summary

This audit identifies services that are either disconnected from the UI, incomplete, or placeholders. Each service is analyzed for its role in the Semantic SEO framework and given a concrete integration plan.

**Key Finding**: Most "placeholder" services have full implementations elsewhere - the placeholders are architectural artifacts that can be safely removed after redirecting imports.

---

## PART 1: Services Ready to Wire Up

These are fully-built services with clear value that simply need UI integration.

---

### 1.1 Organization Leaderboard System

**File**: `hooks/useOrganizationLeaderboard.ts` (299 lines)

**What It Does**:
- Global leaderboard by period (week/month/all-time)
- Organization score tracking (articles generated, avg audit score)
- Achievement system with badge earning
- Nearby competitor rankings
- Historical trend data

**Semantic SEO Compliance**: ✅ Supports gamification of Semantic Compliance Score targets (>85%)

**Input/Output**:
| Function | Input | Output |
|----------|-------|--------|
| `getLeaderboard(period, limit)` | 'week' \| 'month' \| 'all', count | `LeaderboardEntry[]` with rank, score, articles |
| `getOwnScore()` | - | `OrganizationScore` with breakdown |
| `getAchievements()` | orgId? | `OrganizationAchievement[]` with badge data |
| `getLeaderboardHistory(type, limit)` | 'week' \| 'month', count | Historical rank + score array |
| `getNearbyRanks(range)` | ±2 default | Competitors above/below current rank |

**Logical UI Position**:
- New tab in `ProjectDashboard` or dedicated `/leaderboard` route
- Achievement badges in organization header/profile
- Rank widget in sidebar (shows nearby competitors)

**Implementation Priority**: Medium (engagement feature, not core workflow)

---

### 1.2 Frame Expansion Recommendation

**File**: `hooks/useFrameExpansionRecommendation.ts` (306 lines)

**What It Does**:
- Detects when topics need Frame Semantics expansion
- Analyzes topic for: process indicators, abstract concepts, local/niche markets
- Returns confidence level and alternative expansion modes
- Critical for low-volume topics where SERP data is sparse

**Semantic SEO Compliance**: ✅ Directly implements Koray's advice: "Use Frame Semantics when competitor data is weak"

**Input/Output**:
| Function | Input | Output |
|----------|-------|--------|
| `useFrameExpansionRecommendation(topic, allTopics)` | Single topic + context | `{ shouldRecommend, confidence, reasons[], alternativeMode }` |
| `useFrameExpansionRecommendations(topics)` | All topics | `Map<topicId, recommendation>` |

**Logical UI Position**:
- Inline indicator in `TopicDetailPanel` when viewing core topics
- Badge in topic list showing "Frame Expansion Recommended"
- Integration into expand mode selector in `ExpandTopicModal`

**Implementation Priority**: High (improves topic expansion quality for edge cases)

---

### 1.3 Social Signals Panel

**File**: `components/dashboard/SocialSignalsPanel.tsx` (complete component)

**What It Does**:
- Knowledge Panel eligibility tracker
- 10 platform scoring (YouTube, Twitter, LinkedIn, etc.)
- Entity mention consistency tracking
- Corroboration matrix (how many sources confirm each fact)
- KP readiness status: not-ready → building → ready → strong

**Semantic SEO Compliance**: ✅ Implements Knowledge-Based Trust (KBT) validation across social profiles

**Input/Output**:
| Prop | Type | Purpose |
|------|------|---------|
| `entityName` | string | The Central Entity being tracked |
| `entityType` | string? | Person, Organization, Product, etc. |
| `existingProfiles` | SocialProfile[] | Current social profiles |
| `onProfilesChange` | callback | When profiles are added/edited |

**Logical UI Position**:
- Tab in `ProjectDashboard` alongside existing panels
- Integration with Business Info (Central Entity already defined)
- Link from EAV Discovery (validates entity consistency)

**Implementation Priority**: Medium (valuable for Knowledge Panel strategy)

---

### 1.4 Wikipedia & Knowledge Graph Entity Search

**Files**:
- `services/wikipediaService.ts` - Wikipedia API wrapper
- `services/googleKnowledgeGraphService.ts` - Google KG API wrapper

**What They Do**:
- Entity verification against authoritative sources
- Wikidata ID extraction for schema.org markup
- Related entity discovery
- Authority score validation

**Semantic SEO Compliance**: ✅ Essential for EAV verification and entity resolution in Pass 9 (Schema Generation)

**Current Usage**: Only internal (used by `mentionScanner.ts` and schema generation)

**Proposed UI Integration**:
- "Verify Entity" button in EAV Discovery wizard
- Entity research panel for checking Wikipedia/Wikidata coverage
- Suggested entities in content brief creation

**Implementation Priority**: Medium (enhances EAV discovery accuracy)

---

### 1.5 Neo4j Graph Visualization

**File**: `services/neo4jService.ts` (693 lines)

**What It Does**:
- Page graph with PageRank calculations
- Orphan/hub/dead-end page detection
- Entity co-occurrence analysis
- Link statistics and anchor text analysis
- Topic clustering via graph algorithms

**Semantic SEO Compliance**: ✅ Implements Internal Linking Strategy with PageRank flow optimization

**Why It's Hidden**: Requires Neo4j database setup (optional infrastructure)

**Proposed UI Integration** (if Neo4j is enabled):
- Settings panel for Neo4j connection configuration
- Graph visualization dashboard for internal linking
- PageRank results in Page Audit detail view
- Linking issue alerts (orphans, dead-ends)

**Implementation Priority**: Low (optional advanced feature)

---

## PART 2: Placeholder Services Analysis

These files exist but are empty or stubs. Analysis of whether to implement, merge, or remove.

---

### 2.1 Topical Authority Service

**File**: `services/topicalAuthorityService.ts`
**Current Content**: `export {};` (empty placeholder)

**Intended Purpose**: Calculate holistic Topical Authority Score

**Discovery**: ✅ FUNCTIONALITY EXISTS ELSEWHERE

**Actual Implementation Location**: `services/ai/analysis.ts` → `calculateTopicalAuthority()`

**How It Works**:
```typescript
// AI-based calculation across all providers
dispatchToProvider('calculateTopicalAuthority', {
  topics, briefs, kgStats, businessInfo
})

// Returns:
{
  overallScore: number,     // 0-100
  summary: string,
  breakdown: {
    contentDepth: number,    // EAV coverage
    contentBreadth: number,  // Topic variety
    interlinking: number,    // Link quality
    semanticRichness: number // KG density
  }
}
```

**UI Integration Status**: ✅ Already wired to "Authority" button in `AnalysisToolsPanel`

**Recommendation**: **DELETE placeholder file** - functionality complete

**Migration Steps**:
1. Search for imports of `topicalAuthorityService` → None found
2. Delete `services/topicalAuthorityService.ts`
3. Update CLAUDE.md to document actual location

---

### 2.2 Semantic Distance Service

**File**: `services/semanticDistanceService.ts`
**Current Content**: `export {};` (empty with comment: "handled within AI service calls directly")

**Intended Purpose**: Calculate semantic distance between topics/entities

**Discovery**: ✅ FUNCTIONALITY EXISTS ELSEWHERE (2 implementations!)

**Implementation 1**: `lib/knowledgeGraph.ts`
```typescript
calculateSemanticDistance(entityA, entityB) {
  // Full formula: 1 - (CosineSimilarity × ContextWeight × CoOccurrence)
  // Returns: { distance, cosineSimilarity, contextWeight, coOccurrenceScore, shouldLink, linkingRecommendation }
}

// Additional features:
findLinkingCandidates(entity)      // 0.3-0.7 range
identifyCannibalizationRisks()     // < 0.2 distance
buildDistanceMatrix()              // Full matrix for viz
```

**Implementation 2**: `services/ai/clustering.ts`
```typescript
clusterTopicsSemanticDistance(topics, threshold)  // Hierarchical clustering
findSemanticLinkingCandidates(topics, count)      // Optimal linking
findCannibalizationRisks(topics)                   // Too-similar detection
suggestHubSpokeStructure(topics)                   // 1:7 ratio optimization
```

**UI Integration Status**:
- ✅ `SemanticDistanceMatrix.tsx` - Heatmap visualization
- ✅ Clustering used in topic expansion
- ⚠️ Cannibalization detection not surfaced in UI

**Recommendation**: **DELETE placeholder file** - functionality complete

**Enhancement Opportunity**: Surface cannibalization risks in Map Dashboard

**Migration Steps**:
1. Search for imports → None found
2. Delete `services/semanticDistanceService.ts`
3. Add cannibalization warning component to dashboard

---

### 2.3 Infranodus Service

**File**: `services/infranodusService.ts`
**Current Content**: 49-line placeholder with commented example code

**Intended Purpose**: Text network analysis via Infranodus API

**Discovery**: Feature was planned but never implemented

**What Infranodus Would Provide**:
- Visual text network graphs from content
- Gap detection by clicking unconnected nodes
- Source shadowing analysis vs competitors
- PageRank flow visualization

**Existing Alternatives in Codebase**:
| Infranodus Feature | Existing Implementation |
|-------------------|------------------------|
| Text network graph | `CompetitorGapGraph.tsx` (D3 force-directed) |
| Gap detection | `QueryNetworkAudit` + gap analysis |
| Distance visualization | `SemanticDistanceMatrix.tsx` (heatmap) |
| Clustering | `services/ai/clustering.ts` |

**Semantic SEO Compliance Assessment**:

The Infranodus integration was intended to enhance EAV Discovery by:
1. Visualizing entity relationships from competitor content
2. Finding "structural holes" (missing connections)
3. Validating topical map completeness

**Current Gap**: No way to visualize the Knowledge Graph as an interactive network

**Options**:

**Option A: Implement Infranodus Integration**
- Requires: User to have Infranodus account + API key
- Adds external dependency
- Provides: Professional-grade text network viz

**Option B: Build Custom Text Network Visualization**
- Use existing KG data with D3 force-directed graph
- Show entity → attribute → value connections
- Allow clicking to explore relationships
- No external dependency

**Option C: Defer/Remove**
- Current gap analysis meets 90% of use cases
- Heatmap provides distance visualization
- Remove placeholder to reduce technical debt

**Recommendation**: **Option B** - Build custom KG visualization

**Rationale**:
- Aligns with existing architecture (KG data already computed)
- No external API dependency
- Better UX than requiring third-party account
- Can show EAV relationships directly

**Implementation Scope**:
1. Create `KnowledgeGraphExplorer.tsx` component
2. Render KG nodes (entities) and edges (attributes/values)
3. Color by attribute category (UNIQUE/ROOT/RARE/COMMON)
4. Click node to see all connected triples
5. Highlight gaps (entities with few connections)

---

### 2.4 Gap Analysis Worker (Edge Function)

**File**: `supabase/functions/gap-analysis-worker/index.ts`
**Current Content**: 97-line stub returning hardcoded placeholder data

**Intended Purpose**: Server-side gap analysis processing

**Discovery**: ✅ FULL IMPLEMENTATION EXISTS CLIENT-SIDE

**Actual Implementation**: `services/ai/queryNetworkAudit.ts`

**How Gap Analysis Currently Works**:
```
User → QueryNetworkAudit component
     → runQueryNetworkAudit()
     → Fetches SERP data
     → Extracts competitor EAVs
     → Compares against user's EAVs
     → Identifies gaps by frequency
     → Returns: { contentGaps[], competitorEAVs[], recommendations[] }
```

**UI Components**:
- `QueryNetworkAudit.tsx` - Full-featured analysis UI
- `CompetitorGapGraph.tsx` - Network visualization
- `hooks/useCompetitorGapNetwork.ts` - Data transformation

**Why Edge Function Was Planned**:
- Offload heavy processing to server
- Enable background processing
- Support webhook-based updates

**Current Architecture Decision**: Client-side is sufficient because:
- Analysis is on-demand (not scheduled)
- User waits for results anyway
- Progress tracking works in real-time

**Recommendation**: **DELETE or DOCUMENT as deprecated**

**Options**:
- **Delete**: Remove stub, document that gap analysis is client-side
- **Implement**: If background processing needed in future, complete the worker

---

## PART 3: Edge Functions Analysis

---

### 3.1 firecrawl-scraper

**Status**: ✅ Fully integrated (service-layer dependency)

**Integration Chain**:
```
SiteAnalysisToolV2
  → pageExtractionService
  → scrapingProviderRouter
  → [Apify + Jina + Firecrawl fallback]
```

**Where Results Surface**: `PageAuditDetailV2.tsx`

**Enhancement Opportunity**: Add provider selection in Settings (currently auto-fallback only)

---

### 3.2 semantic-mapping-worker

**Status**: ❌ Orphaned placeholder (part of disabled Website Analysis workflow)

**Historical Context**: Part of a legacy feature that was removed from UI

**Current State**:
- Called by `crawl-results-worker` (also disabled)
- No UI trigger exists
- Would invoke `gap-analysis-worker` (which is a stub)

**Recommendation**: **DELETE** along with related disabled workers:
- `start-website-analysis`
- `sitemap-discovery`
- `crawl-worker`
- `crawl-results-worker`
- `check-crawl-status`
- `apify-webhook-handler`

**Rationale**: The Site Analysis V2 feature replaced this entire workflow

---

### 3.3 migrate-schema

**Status**: ✅ Functional utility (not user-facing)

**Purpose**: One-time migration for legacy column names

**Recommendation**: **KEEP** but document as admin-only

**Enhancement**: Add to admin settings panel if schema migrations become recurring

---

## PART 4: Implementation Roadmap

### Phase 1: Cleanup (Low Effort, High Clarity)

| Action | Files | Impact |
|--------|-------|--------|
| Delete placeholder services | `topicalAuthorityService.ts`, `semanticDistanceService.ts` | Reduces confusion |
| Delete orphaned edge functions | `semantic-mapping-worker`, etc. | Removes dead code |
| Document actual implementations | Update CLAUDE.md | Improves discoverability |

### Phase 2: Quick Wins (Medium Effort, High Value)

| Action | Files | Impact |
|--------|-------|--------|
| Wire up SocialSignalsPanel | Add tab to ProjectDashboard | KP tracking enabled |
| Surface Frame Expansion recommendations | Add indicator in TopicDetailPanel | Better expansion decisions |
| Add cannibalization warnings | New component in dashboard | Prevents content conflicts |

### Phase 3: Feature Enhancements (High Effort, High Value)

| Action | Files | Impact |
|--------|-------|--------|
| Build Knowledge Graph Explorer | New `KnowledgeGraphExplorer.tsx` | Visual EAV network |
| Build Leaderboard UI | New leaderboard route/tab | Gamification enabled |
| Entity Research Panel | Wikipedia/KG integration UI | Enhanced EAV verification |

### Phase 4: Optional/Deferred

| Action | Condition | Impact |
|--------|-----------|--------|
| Neo4j Visualization | If Neo4j is deployed | Advanced graph analytics |
| Infranodus Integration | If external viz required | Professional network analysis |

---

## PART 5: Decision Matrix

For each item, answer: **Implement / Remove / Defer?**

| Service | Recommendation | Rationale |
|---------|---------------|-----------|
| `topicalAuthorityService.ts` | **REMOVE** | Exists in `services/ai/analysis.ts` |
| `semanticDistanceService.ts` | **REMOVE** | Exists in `lib/knowledgeGraph.ts` + `clustering.ts` |
| `infranodusService.ts` | **REPLACE** | Build custom KG Explorer instead |
| `gap-analysis-worker` | **REMOVE** | Client-side implementation sufficient |
| `semantic-mapping-worker` | **REMOVE** | Legacy workflow, replaced by Site Analysis V2 |
| `useOrganizationLeaderboard` | **IMPLEMENT UI** | Ready, needs dashboard tab |
| `useFrameExpansionRecommendation` | **IMPLEMENT UI** | Ready, needs topic detail integration |
| `SocialSignalsPanel` | **WIRE UP** | Component exists, needs parent |
| Wikipedia/KG Services | **IMPLEMENT UI** | Build entity research panel |
| Neo4j Service | **DEFER** | Optional, requires infrastructure |

---

## PART 6: Semantic SEO Compliance Verification

Each service must support these framework principles:

| Principle | Services That Support It |
|-----------|-------------------------|
| **Cost of Retrieval Reduction** | Semantic Distance (clustering), Gap Analysis (coverage) |
| **Entity-Attribute-Value Architecture** | EAV Services, KG Services, Gap Analysis |
| **Knowledge-Based Trust** | Social Signals (corroboration), Wikipedia (verification) |
| **Hub-Spoke Structure (1:7)** | Clustering, Frame Expansion, Topical Authority |
| **Semantic Compliance > 85%** | All audit services, Authority scoring |
| **Internal Linking Optimization** | Semantic Distance (0.3-0.7 range), Neo4j (PageRank) |

All proposed services either directly implement or support these principles.

---

## Appendix A: File Paths Reference

**Services to Remove**:
- `D:\www\cost-of-retreival-reducer\services\topicalAuthorityService.ts`
- `D:\www\cost-of-retreival-reducer\services\semanticDistanceService.ts`
- `D:\www\cost-of-retreival-reducer\services\infranodusService.ts`
- `D:\www\cost-of-retreival-reducer\supabase\functions\gap-analysis-worker\index.ts`
- `D:\www\cost-of-retreival-reducer\supabase\functions\semantic-mapping-worker\index.ts`

**Services to Wire Up**:
- `D:\www\cost-of-retreival-reducer\hooks\useOrganizationLeaderboard.ts`
- `D:\www\cost-of-retreival-reducer\hooks\useFrameExpansionRecommendation.ts`
- `D:\www\cost-of-retreival-reducer\components\dashboard\SocialSignalsPanel.tsx`

**Actual Implementations (Document in CLAUDE.md)**:
- Topical Authority: `D:\www\cost-of-retreival-reducer\services\ai\analysis.ts`
- Semantic Distance: `D:\www\cost-of-retreival-reducer\lib\knowledgeGraph.ts`
- Clustering: `D:\www\cost-of-retreival-reducer\services\ai\clustering.ts`
- Gap Analysis: `D:\www\cost-of-retreival-reducer\services\ai\queryNetworkAudit.ts`

---

## Next Steps

1. Review this plan and confirm decisions for each item
2. Create implementation tasks for approved items
3. Execute Phase 1 (cleanup) first to reduce noise
4. Proceed with Phase 2/3 features based on priority

