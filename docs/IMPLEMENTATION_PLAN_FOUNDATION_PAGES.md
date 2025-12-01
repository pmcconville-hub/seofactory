# Implementation Plan: Foundation Pages & Navigation Structure

**Status:** AWAITING APPROVAL
**Created:** 2025-11-29
**Based on Research:** homepage.md, company pages about us EEAT.md, head header footer.md, Headers H rules.md, html structuur boilerplate en headers in head and footer.md

---

## Executive Summary

This plan adds foundation pages (Homepage, About Us, Contact, Privacy, Terms) and navigation/header/footer structure to topical maps based on Holistic SEO research. This transforms topical maps from content plans into complete website blueprints.

**Implementation Strategy:** Start with Phase 1 (Smart Defaults), then progressively add Phase 2 (Validation), Phase 3 (Blueprint Wizard), Phase 4 (Navigation Designer), Phase 5 (Internal Linking), and Phase 6 (Unified Audit).

---

## Research Rules Integrated

### From `homepage.md`
| Rule | Implementation |
|------|----------------|
| Homepage = Entity Home | H1 template reflects Central Entity + Source Context |
| Target Canonical Query | Homepage targets main business query |
| Link to Quality Nodes | Top 5-10 articles linked from homepage |
| First 400 chars = Centerpiece Text | Template enforces critical info + CTA first |
| Most internally linked page | Navigation Designer enforces homepage in all sections |
| Max 150 links total | Real-time link counter |
| LCP optimization | Schema export includes performance hints |
| Semantic HTML | Export uses `<header>`, `<footer>`, `<nav>`, `<main>` |

### From `company pages about us EEAT.md`
| Rule | Implementation |
|------|----------------|
| E-A-T corroboration | About page with expertise, credentials |
| NAP consistency | Single source of truth in `foundation_pages.nap_data` |
| Organization Schema | Auto-generated for homepage |
| AboutPage/ContactPage Schema | Schema type per page |
| Expertise display | Sections template for credentials |
| Footer legal links | Legal Links section in Navigation Designer |

### From `head header footer.md`
| Rule | Implementation |
|------|----------------|
| UTF-8 consistency | Export generates proper charset |
| First 1.4KB critical | SEO tags prioritized in export |
| Semantic HTML | `<header>`, `<footer>`, `<nav>` in export |
| Max 150 links per page | Enforced with real-time counting |
| Dynamic boilerplate | `dynamic_by_section` toggle in navigation |

### From `Headers H rules.md`
| Rule | Implementation |
|------|----------------|
| H1 = Macro Context | H1 template targets Central Entity + CSI |
| H2 sequence = Contextual Vector | Sections array defines H2 flow |
| Numeric values in H1 | Template suggestions include numbers |
| Each H2 in `<section>` | Export generates semantic structure |
| Visual hierarchy | CSS hints in export |

### From `html structuur boilerplate en headers in head and footer.md`
| Rule | Implementation |
|------|----------------|
| Pure HTML links | No JS-dependent links in export |
| 150 link maximum | Hard limit with warnings |
| Dynamic headers/footers | Section-aware navigation |
| Descriptive anchor texts | Validation for generic anchors |
| NAP + E-A-T in footer | NAP display toggle |
| H4/H5/H6 for footer | Footer sections use H4 |
| No anchor repetition >3x | Anchor text audit |

---

## Phase 1: Smart Defaults (Foundation)

**Goal:** Auto-generate foundation pages when creating a new topical map.
**Priority:** HIGH
**Estimated Tasks:** 15

### Task 1.1: Add Type Definitions
**File:** `types.ts`
**Status:** ✅ COMPLETED

Add the following types:
- `FoundationPageType` - enum for page types
- `FoundationPage` - full page specification
- `FoundationPageSection` - content section hints
- `NAPData` - Name, Address, Phone, Email
- `NavigationStructure` - header/footer config
- `NavigationLink` - link definition
- `FooterSection` - footer column
- `NavigationSyncStatus` - change tracking
- `FoundationNotification` - non-blocking alerts
- `SitemapView` - computed sitemap
- `SitemapNode` - hierarchical node

### Task 1.2: Create Database Migration - Foundation Pages
**File:** `supabase/migrations/YYYYMMDD_foundation_pages.sql`
**Status:** PENDING

```sql
-- Foundation Pages Table
CREATE TABLE foundation_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  page_type TEXT NOT NULL CHECK (page_type IN ('homepage', 'about', 'contact', 'privacy', 'terms', 'author')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  meta_description TEXT,
  h1_template TEXT,
  schema_type TEXT CHECK (schema_type IN ('Organization', 'AboutPage', 'ContactPage', 'WebPage')),
  sections JSONB,
  nap_data JSONB,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deletion_reason TEXT CHECK (deletion_reason IN ('user_deleted', 'not_needed')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(map_id, page_type)
);

-- RLS Policies
ALTER TABLE foundation_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own foundation pages"
  ON foundation_pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own foundation pages"
  ON foundation_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own foundation pages"
  ON foundation_pages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own foundation pages"
  ON foundation_pages FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_foundation_pages_map_id ON foundation_pages(map_id);
CREATE INDEX idx_foundation_pages_user_id ON foundation_pages(user_id);
```

### Task 1.3: Create Database Migration - Navigation Structures
**File:** `supabase/migrations/YYYYMMDD_navigation_structures.sql`
**Status:** PENDING

```sql
-- Navigation Structures Table
CREATE TABLE navigation_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  header JSONB NOT NULL DEFAULT '{"logo_alt_text": "", "primary_nav": [], "cta_button": null}',
  footer JSONB NOT NULL DEFAULT '{"sections": [], "legal_links": [], "nap_display": true, "copyright_text": ""}',
  max_header_links INTEGER DEFAULT 10,
  max_footer_links INTEGER DEFAULT 30,
  dynamic_by_section BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Navigation Sync Status Table
CREATE TABLE navigation_sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE UNIQUE,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  topics_modified_since INTEGER DEFAULT 0,
  requires_review BOOLEAN DEFAULT false,
  pending_changes JSONB DEFAULT '{"addedTopics": [], "deletedTopics": [], "renamedTopics": []}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE navigation_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own navigation"
  ON navigation_structures FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sync status"
  ON navigation_sync_status FOR ALL
  USING (map_id IN (SELECT id FROM topical_maps WHERE user_id = auth.uid()));
```

### Task 1.4: Add Foundation Page Generation Prompt
**File:** `config/prompts.ts`
**Status:** PENDING

Add `GENERATE_FOUNDATION_PAGES_PROMPT` function that:
- Takes BusinessInfo and SEOPillars as input
- Generates 5 foundation pages (homepage, about, contact, privacy, terms)
- Returns JSON with page specs and NAP suggestions
- Enforces E-A-T principles
- Uses Central Entity in H1 templates

### Task 1.5: Create Foundation Pages Service
**File:** `services/ai/foundationPages.ts`
**Status:** PENDING

Functions to implement:
- `generateFoundationPages(businessInfo, pillars, dispatch)` - AI generation
- `generateDefaultNavigation(foundationPages, coreTopics)` - Create default nav
- `saveFoundationPages(mapId, userId, pages)` - Database save
- `loadFoundationPages(mapId)` - Database load
- `updateFoundationPage(pageId, updates)` - Update single page
- `deleteFoundationPage(pageId, reason)` - Soft delete

### Task 1.6: Add State Management for Foundation Pages
**File:** `lib/state.ts` (or appropriate state file)
**Status:** PENDING

Add to AppState:
- `foundationPages: FoundationPage[]`
- `navigation: NavigationStructure | null`
- `navigationSyncStatus: NavigationSyncStatus | null`
- `foundationNotifications: FoundationNotification[]`

Add actions:
- `SET_FOUNDATION_PAGES`
- `UPDATE_FOUNDATION_PAGE`
- `DELETE_FOUNDATION_PAGE`
- `SET_NAVIGATION`
- `UPDATE_NAVIGATION`
- `SET_NAV_SYNC_STATUS`
- `ADD_FOUNDATION_NOTIFICATION`
- `DISMISS_FOUNDATION_NOTIFICATION`

### Task 1.7: Create FoundationPagesPanel Component
**File:** `components/FoundationPagesPanel.tsx`
**Status:** PENDING

Component features:
- List of all foundation pages with status badges
- NAP data input form (shared across pages)
- Expandable cards for each page
- Edit title, slug, meta description, H1 template
- Edit sections (add/remove/reorder)
- Schema type selector
- Delete with confirmation (soft delete)
- "Generate Missing Pages" button
- Non-blocking notification display

### Task 1.8: Add Website Structure Tab to Dashboard
**File:** `components/ProjectDashboardContainer.tsx`
**Status:** PENDING

Changes:
- Add "Website Structure" tab between Briefs and existing tabs
- Load foundation pages when tab is selected
- Pass props to FoundationPagesPanel
- Show notification badge if pages need attention

### Task 1.9: Integrate Foundation Generation into Map Creation
**File:** `components/ProjectWorkspace.tsx`
**Status:** PENDING

After map generation:
1. Generate foundation pages via AI
2. Save to database
3. Generate default navigation
4. Save navigation to database
5. Update state
6. Show success notification

### Task 1.10: Update Database Types
**File:** `database.types.ts`
**Status:** PENDING

Add Supabase-generated types for:
- `foundation_pages` table
- `navigation_structures` table
- `navigation_sync_status` table

### Task 1.11: Create Sitemap View Component
**File:** `components/ui/SitemapView.tsx`
**Status:** PENDING

Display computed sitemap:
- Foundation pages section
- Core topics with children
- Total URL count
- Hierarchical tree view
- Filter by type

### Task 1.12: Add NAP Input Form Component
**File:** `components/ui/NAPForm.tsx`
**Status:** PENDING

Reusable NAP form:
- Company name input
- Address input (with validation hints)
- Phone input (with formatting)
- Email input (with validation)
- Founded year (optional)
- Save button with loading state

### Task 1.13: Create Foundation Page Card Component
**File:** `components/ui/FoundationPageCard.tsx`
**Status:** PENDING

Individual page display:
- Page type icon
- Title (editable)
- Status badge (complete/needs attention/deleted)
- Expand to show details
- Quick actions (edit, delete, restore)

### Task 1.14: Add Schema Preview Component
**File:** `components/ui/SchemaPreview.tsx`
**Status:** PENDING

Display generated schema:
- JSON-LD formatted
- Syntax highlighting
- Copy button
- Validation indicator

### Task 1.15: Create Non-Blocking Notification Component
**File:** `components/ui/FoundationNotificationBanner.tsx`
**Status:** PENDING

Yellow warning banner:
- Dismissable
- "Don't show again" option
- Action button (e.g., "Add About Page")
- Stacks multiple notifications

---

## Phase 2: Validation Extension

**Goal:** Extend existing Validate Map to check foundation page completeness.
**Priority:** MEDIUM
**Estimated Tasks:** 8

### Task 2.1: Extend Validation Prompt
**File:** `config/prompts.ts`
**Status:** PENDING

Add to `VALIDATE_TOPICAL_MAP_PROMPT`:
- Rule H: Foundation Page Completeness (WARNING)
- Rule I: Navigation Structure (SUGGESTION)

### Task 2.2: Add Foundation Validation Types
**File:** `types.ts`
**Status:** ✅ COMPLETED

Added:
- `FoundationPageIssues` interface
- `NavigationIssues` interface

### Task 2.3: Implement Foundation Validation Logic
**File:** `services/ai/analysis.ts`
**Status:** PENDING

Add `validateFoundationPages()` function:
- Check for missing pages
- Verify NAP data completeness
- Check H1 templates reference Central Entity
- Validate section structure
- Return FoundationPageIssues

### Task 2.4: Implement Navigation Validation Logic
**File:** `services/ai/analysis.ts`
**Status:** PENDING

Add `validateNavigation()` function:
- Count header links (warn if >10)
- Count footer links (warn if >30)
- Check homepage is in header
- Check legal pages in footer
- Return NavigationIssues

### Task 2.5: Update validateTopicalMap Function
**File:** `services/ai/analysis.ts`
**Status:** PENDING

Modify to:
1. Run existing topic validation
2. Run foundation page validation
3. Run navigation validation
4. Merge results into ValidationResult
5. Adjust overall score based on foundation/nav issues

### Task 2.6: Update ValidationResultModal
**File:** `components/ValidationResultModal.tsx`
**Status:** PENDING

Add new sections:
- Foundation Pages Issues tab
- Navigation Issues tab
- "Repair Foundation" button
- Missing pages list with "Add" buttons

### Task 2.7: Add Repair Foundation Handler
**File:** `components/TopicalMapDisplay.tsx`
**Status:** PENDING

Add `handleRepairFoundation()`:
1. Generate missing foundation pages
2. Fill in suggested NAP data
3. Create default navigation if missing
4. Update database and state
5. Re-run validation

### Task 2.8: Add Foundation Quick Actions
**File:** `components/TopicalMapDisplay.tsx`
**Status:** PENDING

Add buttons near existing "Repair Section Labels":
- "Repair Foundation Pages"
- "Configure Navigation"
- Link to Website Structure tab

---

## Phase 3: Website Blueprint Wizard

**Goal:** Pre-generation wizard for foundation pages and navigation.
**Priority:** MEDIUM
**Estimated Tasks:** 7

### Task 3.1: Create WebsiteBlueprintWizard Component
**File:** `components/WebsiteBlueprintWizard.tsx`
**Status:** PENDING

Multi-step wizard:
- Step 1: NAP input
- Step 2: Foundation page selection
- Step 3: Navigation preferences
- Back/Next navigation
- Skip option

### Task 3.2: Create Industry Blueprint Templates
**File:** `config/blueprintTemplates.ts`
**Status:** PENDING

Templates for:
- E-commerce (+ Shipping, Returns)
- SaaS (+ Pricing, Support)
- Local Business (+ Service Areas)
- Blog/Media (+ Editorial Policy)
- Professional Services (+ Team, Testimonials)

### Task 3.3: Update Wizard Flow
**File:** `components/ProjectWorkspace.tsx`
**Status:** PENDING

Insert blueprint step:
```typescript
const WIZARD_STEPS = [
  'business-info',
  'pillar-definition',
  'eav-discovery',
  'competitor-refinement',
  'website-blueprint',  // NEW
  'generate-map'
];
```

### Task 3.4: Create Template Selector Component
**File:** `components/ui/BlueprintTemplateSelector.tsx`
**Status:** PENDING

Visual template selection:
- Template cards with descriptions
- Foundation page preview
- Customization options
- "Start from scratch" option

### Task 3.5: Create Navigation Preferences Form
**File:** `components/ui/NavigationPreferencesForm.tsx`
**Status:** PENDING

Configuration options:
- Max header links slider (5-15)
- Dynamic navigation toggle
- CTA button toggle
- Footer columns count

### Task 3.6: Store Blueprint Config in State
**File:** `lib/state.ts`
**Status:** PENDING

Add to AppState:
- `blueprintConfig: BlueprintConfig | null`

Interface:
```typescript
interface BlueprintConfig {
  napData: NAPData;
  selectedPages: FoundationPageType[];
  templateId?: string;
  navigationPreferences: {
    maxHeaderLinks: number;
    dynamicBySection: boolean;
    includeCTA: boolean;
    footerColumns: number;
  };
}
```

### Task 3.7: Use Blueprint Config in Generation
**File:** `components/ProjectWorkspace.tsx`
**Status:** PENDING

Modify `handleGenerateMap`:
1. Read blueprintConfig from state
2. Pass to foundation page generation
3. Use NAP data from config
4. Apply navigation preferences
5. Only generate selected pages

---

## Phase 4: Navigation Designer

**Goal:** Visual drag-and-drop navigation editor.
**Priority:** MEDIUM
**Estimated Tasks:** 10

### Task 4.1: Create NavigationDesigner Component
**File:** `components/NavigationDesigner.tsx`
**Status:** PENDING

Main editor layout:
- Header preview section
- Header link editor
- CTA button editor
- Footer preview section
- Footer section editor
- Legal links checkboxes
- Save/discard buttons

### Task 4.2: Create NavigationPreview Component
**File:** `components/ui/NavigationPreview.tsx`
**Status:** PENDING

Live preview showing:
- Header with logo, nav links, CTA
- Footer with sections, legal, NAP
- Updates in real-time
- Responsive preview toggle

### Task 4.3: Add Drag-and-Drop for Header Links
**File:** `components/NavigationDesigner.tsx`
**Status:** PENDING

Use existing DnD library:
- Reorder header links
- Visual drag handles
- Drop zone indicators
- Keyboard accessibility

### Task 4.4: Add Drag-and-Drop for Footer Sections
**File:** `components/NavigationDesigner.tsx`
**Status:** PENDING

DnD for footer:
- Reorder sections
- Reorder links within sections
- Move links between sections
- Add/remove sections

### Task 4.5: Create Link Editor Modal
**File:** `components/ui/LinkEditorModal.tsx`
**Status:** PENDING

Edit individual links:
- Text input
- Target selector (topic/foundation page/external)
- External URL input
- Prominence selector
- Delete option

### Task 4.6: Create Topic/Page Selector
**File:** `components/ui/NavigationTargetSelector.tsx`
**Status:** PENDING

Select link targets:
- Search/filter
- Foundation pages section
- Core topics section
- Outer topics section
- External URL option

### Task 4.7: Add Real-Time Link Counting
**File:** `components/NavigationDesigner.tsx`
**Status:** PENDING

Display counters:
- Header links: X/10
- Footer links: X/30
- Total links: X/150
- Warning colors when approaching limits

### Task 4.8: Add Smart Link Suggestions
**File:** `services/ai/navigationSuggestions.ts`
**Status:** PENDING

AI-powered suggestions:
- Suggest missing Quality Nodes
- Suggest hub topics for header
- Suggest logical footer groupings
- PageRank optimization hints

### Task 4.9: Create Export Functionality
**File:** `services/navigationExport.ts`
**Status:** PENDING

Export formats:
- HTML with semantic tags
- Schema markup (SiteNavigationElement)
- CSS class suggestions
- Responsive menu structure

### Task 4.10: Add Navigation Tab to Dashboard
**File:** `components/ProjectDashboardContainer.tsx`
**Status:** PENDING

Add "Navigation" tab:
- Load navigation structure
- Show sync status notification
- NavigationDesigner component
- Export button

---

## Phase 5: Internal Linking System

**Goal:** Multi-pass internal linking optimization.
**Priority:** LOW
**Estimated Tasks:** 8

### Task 5.1: Add Internal Linking Types
**File:** `types.ts`
**Status:** ✅ COMPLETED

Added:
- `InternalLinkingRules`
- `LinkingIssue`
- `LinkingPassResult`
- `LinkingAuditResult`

### Task 5.2: Create Database Migration - Linking Analysis
**File:** `supabase/migrations/YYYYMMDD_linking_analysis.sql`
**Status:** PENDING

```sql
CREATE TABLE linking_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
  pass_results JSONB NOT NULL,
  overall_score INTEGER,
  summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Task 5.3: Implement Pass 1 - Hub-Spoke Links
**File:** `services/ai/internalLinking.ts`
**Status:** PENDING

Check:
- Every outer links to parent core
- Every core links to children
- 1:7 ratio coverage

### Task 5.4: Implement Pass 2 - Cross-Cluster Links
**File:** `services/ai/internalLinking.ts`
**Status:** PENDING

Check:
- Semantic relationships between clusters
- Bridge links where context overlaps
- Limit to prevent dilution

### Task 5.5: Implement Pass 3-4 - Quality Nodes & Foundation
**File:** `services/ai/internalLinking.ts`
**Status:** PENDING

Check:
- Quality Nodes linked from multiple sources
- Homepage links to Quality Nodes
- Foundation pages properly linked

### Task 5.6: Implement Pass 5-6 - Anchor Text & Validation
**File:** `services/ai/internalLinking.ts`
**Status:** PENDING

Check:
- No anchor text repeated >3 times
- Total links per page <150
- Suggest alternatives for repetitive anchors

### Task 5.7: Create Linking Audit UI
**File:** `components/LinkingAuditPanel.tsx`
**Status:** PENDING

Display:
- Pass results with status
- Issue list by severity
- Auto-fix suggestions
- Apply fixes button

### Task 5.8: Add Linking Tab to Dashboard
**File:** `components/ProjectDashboardContainer.tsx`
**Status:** PENDING

Add "Linking" tab or sub-section in Audit.

---

## Phase 6: Intelligent Audit System

**Goal:** Unified audit with fix application.
**Priority:** LOW
**Estimated Tasks:** 10

### Task 6.1: Add Unified Audit Types
**File:** `types.ts`
**Status:** ✅ COMPLETED

Added:
- `AuditSeverity`
- `AuditRule`
- `AuditCategory`
- `UnifiedAuditIssue`
- `AuditCategoryResult`
- `UnifiedAuditResult`
- `AuditFix`
- `AuditHistoryEntry`

### Task 6.2: Create Database Migration - Audit System
**File:** `supabase/migrations/YYYYMMDD_audit_system.sql`
**Status:** PENDING

```sql
CREATE TABLE audit_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
  overall_score INTEGER,
  categories JSONB,
  total_issues INTEGER,
  critical_count INTEGER,
  warning_count INTEGER,
  suggestion_count INTEGER,
  auto_fixable_count INTEGER,
  run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  run_by UUID REFERENCES auth.users(id)
);

CREATE TABLE audit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES topical_maps(id) ON DELETE CASCADE,
  audit_run_id UUID NOT NULL,
  category TEXT NOT NULL,
  issue_id TEXT NOT NULL,
  fix_description TEXT NOT NULL,
  changes JSONB NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_by UUID REFERENCES auth.users(id),
  undone_at TIMESTAMP WITH TIME ZONE,
  can_undo BOOLEAN DEFAULT true
);
```

### Task 6.3: Define Audit Categories and Rules
**File:** `config/auditRules.ts`
**Status:** PENDING

Define categories:
- Topical Structure (25% weight)
- Foundation Pages (15% weight)
- Navigation (20% weight)
- Internal Linking (20% weight)
- Content Structure (20% weight)

### Task 6.4: Implement Unified Audit Engine
**File:** `services/ai/unifiedAudit.ts`
**Status:** PENDING

Main function:
- Run all category audits
- Collect issues
- Calculate scores
- Determine auto-fixable items
- Return UnifiedAuditResult

### Task 6.5: Implement Fix Application System
**File:** `services/ai/auditFixes.ts`
**Status:** PENDING

Functions:
- `generateFix(issue)` - Create fix definition
- `applyFix(fix)` - Execute single fix
- `applyFixes(fixes)` - Batch with transaction
- `undoFix(historyEntry)` - Rollback fix

### Task 6.6: Create Audit Dashboard Component
**File:** `components/AuditDashboard.tsx`
**Status:** PENDING

Full audit UI:
- Overall score with progress bar
- Category breakdown table
- Critical/Warning/Suggestion counts
- "Fix All Auto-Fixable" button
- Issue list by category

### Task 6.7: Create Issue Card Component
**File:** `components/ui/AuditIssueCard.tsx`
**Status:** PENDING

Individual issue display:
- Severity icon
- Message
- Affected items
- [Apply Fix] [Ignore] [Details] buttons
- Fix type indicator

### Task 6.8: Create Audit History Panel
**File:** `components/AuditHistoryPanel.tsx`
**Status:** PENDING

History display:
- List of applied fixes
- Undo button for eligible fixes
- Timestamp
- Applied by

### Task 6.9: Add Audit Tab to Dashboard
**File:** `components/ProjectDashboardContainer.tsx`
**Status:** PENDING

Add "Audit" tab:
- Run Audit button
- AuditDashboard component
- History toggle

### Task 6.10: Implement Progress Tracking
**File:** `services/ai/unifiedAudit.ts`
**Status:** PENDING

Track improvement over time:
- Store historical scores
- Show trend graph
- Highlight improvements

---

## Critical UX Requirements

### Requirement 1: Non-Intrusive Integration
- Current topical map workflow remains unchanged
- Foundation pages are additive, not blocking
- Navigation is a separate step after map creation

### Requirement 2: Foundation Pages Are Optional
- Users can skip or delete any foundation page
- Non-blocking notifications (yellow banners, not modals)
- Soft delete tracks user intent
- "Don't show again" option for notifications

### Requirement 3: Sitemap/Navigation as Next Step
- Clear "Next Step" prompts after map generation
- "Skip for now" always available
- No required steps

### Requirement 4: Topic Changes Trigger Notifications
- Track changes since last navigation sync
- Show badge on Navigation tab
- Offer auto-update or manual review

### Requirement 5: Updates Reflected in Sitemap
- Sitemap is computed view, not stored
- Automatically includes all topics + foundation pages
- Filters out soft-deleted pages

---

## Database Persistence Summary

| Feature | Table | Key Fields |
|---------|-------|------------|
| Foundation Pages | `foundation_pages` | id, map_id, page_type, title, slug, sections, nap_data, deleted_at |
| Navigation Structure | `navigation_structures` | id, map_id, header, footer, max_links, dynamic_by_section |
| Navigation Sync | `navigation_sync_status` | map_id, last_synced_at, pending_changes |
| Audit Results | `audit_results` | id, map_id, categories, overall_score |
| Audit History | `audit_history` | id, map_id, issue_id, changes, applied_at, undone_at |
| Linking Analysis | `linking_analysis` | id, map_id, pass_results, summary |

---

## Success Criteria

After full implementation:
- [ ] Every new topical map can include 5 foundation pages
- [ ] NAP data is captured and consistent across pages
- [ ] Navigation follows max 150 link rule
- [ ] Header has ≤10 links by default
- [ ] Footer has dynamic sections
- [ ] Validation catches missing E-A-T pages
- [ ] Users can visually design navigation
- [ ] Exported navigation includes semantic HTML and Schema
- [ ] Internal linking follows all research rules
- [ ] Unified audit catches all optimization issues
- [ ] One-click fixes for auto-fixable issues
- [ ] Audit history with undo support

---

## Approval Required

**This plan requires approval before implementation begins.**

To approve, confirm:
1. Phase 1 implementation scope is correct
2. UX requirements are understood
3. Database schema is acceptable
4. Implementation order is approved

Once approved, implementation will proceed phase by phase with regular check-ins.
