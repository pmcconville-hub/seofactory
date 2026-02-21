# User Workflows

Complete definition of all user-facing workflows in the Holistic SEO Workbench application.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Project Management](#2-project-management)
3. [Map Setup Wizard](#3-map-setup-wizard)
4. [Dashboard & Navigation](#4-dashboard--navigation)
5. [Topic Management](#5-topic-management)
6. [Content Brief Generation](#6-content-brief-generation)
7. [Content Drafting (Multi-Pass)](#7-content-drafting-multi-pass)
8. [Content Audit](#8-content-audit)
9. [Style Guide & Publishing](#9-style-guide--publishing)
10. [Site Analysis & Migration](#10-site-analysis--migration)
11. [Insights & Analytics](#11-insights--analytics)
12. [Strategy Tools](#12-strategy-tools)
13. [Settings & Configuration](#13-settings--configuration)
14. [Admin Dashboard](#14-admin-dashboard)

---

## 1. Authentication

**Route:** `/login`
**Component:** `AuthScreen`

### Workflow
1. User navigates to app root (`/`) — redirected to `/login` if unauthenticated
2. User sees Sign In / Sign Up tabs
3. **Sign In:** Enter email + password → Click "Sign In" → Redirected to `/projects`
4. **Sign Up:** Enter email + password → Click "Sign Up" → Email verification → Sign In
5. Session persists via Supabase Auth (localStorage token)
6. Page reload preserves session

### E2E Coverage
- `e2e/auth.spec.ts` — Login form display, valid/invalid credentials, session persistence
- `e2e/regression-smoke.spec.ts` — Auth screen elements, empty form submission

---

## 2. Project Management

**Route:** `/projects`
**Component:** `ProjectsPage`

### Workflow
1. After login, user sees project list with "Create New Project" button
2. **Create Project:** Click "Create" → Fill name/description → Submit → Project created
3. **Open Project:** Click "Open" on existing project → Navigate to `/p/:projectId`
4. **Delete Project:** Click delete → Confirmation modal → Confirm → Project removed

### E2E Coverage
- `e2e/projects.spec.ts` — Create form display, validation, create/list/load/delete projects

---

## 3. Map Setup Wizard

**Route:** `/p/:projectId/m/:mapId/setup/*`
**Component:** `SetupWizardLayout` with sub-pages

### Steps
1. **Business Info** (`/setup/business`) — Language, region, industry, target market, audience
2. **SEO Pillars** (`/setup/pillars`) — Central Entity, Source Context, Central Search Intent
3. **EAVs** (`/setup/eavs`) — Entity-Attribute-Value triple management
4. **Competitors** (`/setup/competitors`) — Competitor URL entry and analysis
5. **Catalog** (`/setup/catalog`) — Product/service catalog (if applicable)
6. **Blueprint** (`/setup/blueprint`) — Map generation configuration and execution

### Workflow
1. User creates or selects a map from Map Selection (`/p/:projectId`)
2. Wizard opens at Business Info step
3. User completes each step sequentially (can navigate back)
4. Business Info and Pillars are **mandatory prerequisites** for all AI operations
5. Blueprint step triggers AI-powered topical map generation
6. After generation, user is redirected to Dashboard

### E2E Coverage
- `e2e/wizards.spec.ts` — Business info form, pillar wizard, EAV wizard, competitor wizard
- `e2e/layout-audit.spec.ts` — Setup wizard page rendering (steps 07-10)

---

## 4. Dashboard & Navigation

**Route:** `/p/:projectId/m/:mapId`
**Component:** `DashboardPage`

### Layout
- **Sidebar:** Navigation with map sections, strategy tools, settings
- **Main Area:** Dashboard with topical map visualization, analysis tools, topic grid
- **Footer Dock:** Quick actions (audit, generate, export)

### Navigation Targets
| Sidebar Item | Route | Component |
|-------------|-------|-----------|
| Dashboard | `/` (index) | `DashboardPage` |
| Audit | `/audit` | `AuditPage` |
| Insights | `/insights` | `InsightsPage` |
| Gap Analysis | `/gap-analysis` | `GapAnalysisPage` |
| Quality | `/quality` | `QualityPage` |
| Planning | `/planning` | `PlanningPage` |
| Calendar | `/calendar` | `CalendarPage` |
| KP Strategy | `/strategy/kp` | `KPStrategyPage` |
| Entity Authority | `/strategy/entity-authority` | `EntityAuthorityPage` |
| Entity Health | `/strategy/entity-health` | `EntityHealthPage` |
| Catalog | `/catalog` | `CatalogDashboardPage` |

### E2E Coverage
- `e2e/topical-map.spec.ts` — Map selection, dashboard display, tab navigation
- `e2e/layout-audit.spec.ts` — All page rendering verification
- `e2e/global-ui.spec.ts` — Navigation elements, console errors, responsive nav

---

## 5. Topic Management

**Route:** `/p/:projectId/m/:mapId/topics/:topicId`
**Component:** `TopicDetailPage`

### Workflow
1. From Dashboard, click a topic in the map/grid
2. Topic detail panel opens with:
   - Topic metadata (title, type, parent, search volume)
   - Expansion modes (Frame Semantics, Query Templates)
   - Content brief generation button
   - Drafting controls
3. Sub-routes:
   - `/brief` — Content brief view/edit
   - `/draft` — Multi-pass content drafting
   - `/style` — Style/publishing controls

### E2E Coverage
- `e2e/topical-map.spec.ts` — Topic display, detail panel, brief modal

---

## 6. Content Brief Generation

**Trigger:** Topic Detail → "Generate Brief" button
**Component:** `ContentBriefModal`, `BriefPage`

### Workflow
1. User selects a topic and clicks "Generate Brief"
2. AI generates brief with:
   - Structured outline (sections, headings)
   - SERP analysis (PAA, related queries)
   - Visual semantics (image suggestions)
   - Contextual bridge from parent topic
   - EAV integration requirements
3. User can review, edit sections, regenerate parts
4. Brief is saved and linked to topic

### E2E Coverage
- `e2e/topical-map.spec.ts` — Brief modal display, existing brief load

---

## 7. Content Drafting (Multi-Pass)

**Route:** `/p/:projectId/m/:mapId/topics/:topicId/draft`
**Component:** `DraftPage`

### 10-Pass Pipeline
1. **Draft Generation** — Section-by-section content creation
2. **Header Optimization** — Heading hierarchy and overlap
3. **Lists & Tables** — Featured Snippet optimization
4. **Visual Semantics** — Image placeholder insertion
5. **Micro Semantics** — Linguistic optimization
6. **Discourse Integration** — Transitions and bridges
7. **Introduction Synthesis** — Post-hoc intro rewriting
8. **Final Audit** — Algorithmic scoring
9. **Schema Generation** — JSON-LD with entity resolution

### Workflow
1. User navigates to topic draft page
2. Selects generation mode (full article, section-by-section)
3. Progress tracked in real-time via `ContentGenerationProgress` component
4. Each pass runs sequentially with retry logic
5. Final output includes audit score and schema markup
6. User can view pass diffs, edit sections, re-run passes

### E2E Coverage
- `e2e/layout-audit.spec.ts` — Draft page rendering

---

## 8. Content Audit

**Route:** `/p/:projectId/m/:mapId/audit`
**Component:** `AuditPage`

### Workflow
1. User navigates to Audit page from sidebar
2. **External URL Audit:** Enter URL → Click "Audit" → System fetches content
3. **Topic Audit:** Select topic with content → Run audit
4. Audit runs 15 phases with 282+ rules:
   - Strategic Foundation, EAV System, Micro-Semantics
   - Information Density, Contextual Flow, Internal Linking
   - Semantic Distance, Content Format, HTML Technical
   - Meta & Structured Data, Cost of Retrieval, URL Architecture
   - Cross-Page Consistency, Website Type Specific, Fact Validation
5. Results displayed in dashboard with:
   - Overall score ring (0-100)
   - Phase score cards with progress bars
   - Findings grouped by severity (critical/high/medium/low)
   - Weight sliders for phase customization
   - Export to CSV/HTML/JSON
6. Historical snapshots for score tracking over time

### E2E Coverage
- `e2e/linking-audit.spec.ts` — Audit modal, tabs, run audit, results display
- `e2e/layout-audit.spec.ts` — Audit dashboard page rendering

---

## 9. Style Guide & Publishing

**Route:** Topic → Style page
**Components:** `StylePublishModal`, `PremiumDesignModal`

### Workflow
1. **Brand Intelligence:** AI detects brand personality from reference URL
2. **Layout Intelligence:** Section analysis with semantic weight mapping
3. **Preview:** Live preview with brand-matched CSS
4. **Publish:** Export HTML/CSS or publish to WordPress

### E2E Coverage
- `e2e/style-guide.spec.ts` — Style guide generation
- `e2e/style-guide-live-flow.spec.ts` — Live styling flow
- `e2e/style-publish-css-quality.spec.ts` — CSS quality validation
- `e2e/brand-replication-e2e.spec.ts` — Brand detection/replication
- `e2e/premium-design.spec.ts` — Premium design features
- `e2e/premium-design-visual-quality.spec.ts` — Visual quality checks
- `e2e/visual-quality.spec.ts` — Renderer quality
- `e2e/visual-renderer-test.spec.ts` — Renderer functionality

---

## 10. Site Analysis & Migration

**Trigger:** Project selection → "Open Site Analysis"
**Components:** `SiteIngestionWizard`, `MigrationWorkbenchModal`

### Workflow
1. User provides existing site URL
2. System crawls/scrapes pages (via Jina/Firecrawl)
3. Semantic analysis maps existing content to topical map
4. Gap analysis identifies missing topics
5. Migration plan generated with URL matching
6. Content can be imported and optimized

### E2E Coverage
- `e2e/site-analysis-v2.spec.ts` — Site analysis flow

---

## 11. Insights & Analytics

**Route:** `/p/:projectId/m/:mapId/insights`
**Component:** `InsightsPage` → `InsightsHub`

### Features
- Topical authority scoring
- Semantic distance matrix (heatmap)
- Cannibalization risk detection
- EAV completeness tracking
- Knowledge graph visualization

### E2E Coverage
- `e2e/layout-audit.spec.ts` — Insights page rendering

---

## 12. Strategy Tools

### Knowledge Panel Strategy
**Route:** `/strategy/kp`
**Component:** `KPStrategyPage`

### Entity Authority
**Route:** `/strategy/entity-authority`
**Component:** `EntityAuthorityPage`

### Entity Health
**Route:** `/strategy/entity-health`
**Component:** `EntityHealthPage`

### Gap Analysis
**Route:** `/gap-analysis`
**Component:** `GapAnalysisPage`
- Competitor gap network visualization
- Query network audit
- Missing topic identification

### E2E Coverage
- `e2e/layout-audit.spec.ts` — All strategy page rendering

---

## 13. Settings & Configuration

**Route:** `/settings`
**Component:** `SettingsPage`

### Workflow
1. User clicks Settings in sidebar/header
2. Configure:
   - AI provider selection (Gemini, OpenAI, Anthropic, Perplexity, OpenRouter)
   - API key management
   - Default language/region
   - Audit weight configuration
3. Save settings → Persisted to `user_settings` table

### E2E Coverage
- `e2e/settings.spec.ts` — Modal open, provider selection, API keys, save

---

## 14. Admin Dashboard

**Route:** `/admin`
**Component:** `AdminPage`

### Features
- AI usage reports
- Map usage analytics
- Organization management
- Project management
- Help content editor

### E2E Coverage
- `e2e/layout-audit.spec.ts` — Admin page rendering

---

## Workflow Gaps & Missing E2E Coverage

### Workflows With No Dedicated E2E Tests
1. **Content Generation Pipeline** — No E2E test for the 10-pass drafting flow
2. **Content Audit Execution** — `linking-audit.spec.ts` exists but 2 tests timeout
3. **Site-Level Audit Aggregation** — New service, no E2E test
4. **Auto-Fix Engine** — New service, no UI integration yet
5. **Fact Validation** — Perplexity verifier exists, no E2E test
6. **Calendar/Planning** — Pages render but no workflow tests
7. **Catalog Management** — Page renders but no dedicated workflow test
8. **WordPress Publishing** — Integration exists, no E2E test

### New Services Without UI Integration
These services were created as part of the Semantic SEO remediation but are backend-only:
- `SiteAuditAggregator` — Needs UI for site-wide audit reports
- `AutoFixEngine` — Needs "Apply Fix" buttons in audit findings
- `ContentRefreshTracker` — Needs freshness indicators in dashboard
- `MomentumTracker` — Needs publication velocity chart
- `ContentPruningAdvisor` — Needs pruning recommendations panel
- `CompetitorTracker` — Needs competitor snapshot comparison UI
- `PageRankSimulator` — Needs PageRank visualization
- `KnowledgePanelBuilder` — Could enhance KP Strategy page
- `TopicalBorderValidator` — Needs boundary warnings in map view
- `TMDDetector` — Needs skew visualization in map
- `FrameSemanticsAnalyzer` — Already partially integrated via topic expansion
- GSC/PageSpeed edge functions — Need connection UI in settings
