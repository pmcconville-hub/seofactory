# Site Authority Engine — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Migration Workbench from a disconnected set of import/audit/edit tools into a unified 5-step Site Authority Engine: Import → Audit → Match → Plan → Execute — giving users a clear, data-driven migration roadmap grounded in the Holistic SEO / Koray framework.

**Architecture:** The existing 437-rule Unified Audit becomes the quality backbone. GSC data expands to 16 months with daily granularity. A new auto-matching service links inventory URLs to topical map topics. An AI decision engine generates a prioritized migration plan with per-URL reasoning. The UI becomes a linear 5-step wizard replacing the current disconnected views.

**Tech Stack:** React 18, TypeScript, TailwindCSS, Supabase (PostgreSQL + Edge Functions + Auth), Vitest, existing AI service layer (Gemini/OpenAI/Anthropic), Google Search Console API v1, CrUX API, PageSpeed Insights API.

---

## Table of Contents

1. [Phase 1: Database & Infrastructure](#phase-1-database--infrastructure)
2. [Phase 2: GSC Data Enhancement](#phase-2-gsc-data-enhancement)
3. [Phase 3: Batch Audit Engine](#phase-3-batch-audit-engine)
4. [Phase 4: Auto-Matching Service](#phase-4-auto-matching-service)
5. [Phase 5: AI Migration Plan Engine](#phase-5-ai-migration-plan-engine)
6. [Phase 6: UI — 5-Step Authority Wizard](#phase-6-ui--5-step-authority-wizard)
7. [Phase 7: Cleanup & Polish](#phase-7-cleanup--polish)

---

## Reference: Key Existing Files

| Area | File | Purpose |
|------|------|---------|
| DB Schema | `supabase/migrations/20251204000000_transition_tables.sql` | site_inventory, transition_snapshots |
| DB Schema | `supabase/migrations/20260212100000_create_gsc_ga4_data_tables.sql` | gsc_search_analytics |
| DB Schema | `supabase/migrations/20260211230000_create_analytics_tables.sql` | analytics_properties, analytics_accounts |
| DB Schema | `supabase/migrations/20260211260000_create_unified_audit_snapshots.sql` | unified_audit_snapshots |
| DB Schema | `supabase/migrations/20251205120000_semantic_analysis_results.sql` | semantic_analysis_results |
| Edge Function | `supabase/functions/analytics-sync-worker/index.ts` | GSC/GA4 data sync (currently 7 days) |
| Service | `services/migrationService.ts` | Sitemap fetch, GSC import, technical crawl |
| Service | `services/audit/UnifiedAuditOrchestrator.ts` | 15-phase audit engine |
| Service | `services/audit/ContentFetcher.ts` | Page content fetching |
| Service | `services/audit/AuditSnapshotService.ts` | Audit result persistence |
| Service | `services/audit/types.ts` | All audit interfaces (AuditRequest, UnifiedAuditReport, etc.) |
| Hook | `hooks/useInventoryOperations.ts` | Inventory CRUD |
| Hook | `hooks/useSemanticAnalysis.ts` | Per-page semantic analysis |
| Component | `components/migration/MigrationDashboardContainer.tsx` | Main container |
| Component | `components/migration/SiteIngestionWizard.tsx` | 3-step import wizard |
| Component | `components/migration/InventoryMatrix.tsx` | Inventory table |
| Component | `components/migration/MigrationWorkbenchModal.tsx` | Per-page editor |
| Component | `components/pages/map/AuditPage.tsx` | Current single-page audit UI |
| Types | `types.ts` | SiteInventoryItem (~line 2409), TransitionStatus, ActionType |

---

## Phase 1: Database & Infrastructure

### Task 1.1: Extend site_inventory table

Add columns for audit integration, auto-matching, and migration plan data.

**Files:**
- Create: `supabase/migrations/20260215000000_extend_site_inventory_for_authority_engine.sql`

**SQL:**
```sql
-- Extend site_inventory for the Site Authority Engine
-- Adds: audit score, audit linking, auto-match data, plan reasoning, page metadata

-- Audit integration
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS audit_score numeric(5,2);
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS audit_snapshot_id uuid REFERENCES public.unified_audit_snapshots(id) ON DELETE SET NULL;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS last_audited_at timestamptz;

-- Page metadata extracted during audit (cached to avoid re-fetch)
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS page_title text;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS page_h1 text;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS headings jsonb; -- [{level,text}]
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS internal_link_count int;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS external_link_count int;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS schema_types text[]; -- ['Article','FAQPage']
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS language text;

-- Auto-matching
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS match_confidence numeric(4,2); -- 0.00-1.00
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS match_source text; -- 'auto'|'manual'|'confirmed'

-- Migration plan
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS recommended_action action_type;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS action_reasoning text;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS action_priority text CHECK (action_priority IN ('critical', 'high', 'medium', 'low'));
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS action_effort text CHECK (action_effort IN ('none', 'low', 'medium', 'high'));

-- CrUX / Core Web Vitals (real user data)
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS cwv_lcp numeric; -- ms
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS cwv_inp numeric; -- ms
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS cwv_cls numeric; -- unitless
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS cwv_assessment text CHECK (cwv_assessment IN ('good', 'needs-improvement', 'poor'));

-- URL Inspection data
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS google_index_verdict text; -- 'PASS','NEUTRAL','FAIL'
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS google_canonical text; -- Google-selected canonical
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS last_crawled_at timestamptz;
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS mobile_usability text; -- 'PASS','FAIL'
ALTER TABLE public.site_inventory ADD COLUMN IF NOT EXISTS rich_results_status text; -- 'ELIGIBLE','INELIGIBLE','UNKNOWN'

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_site_inventory_audit_score ON public.site_inventory(audit_score);
CREATE INDEX IF NOT EXISTS idx_site_inventory_priority ON public.site_inventory(action_priority);
CREATE INDEX IF NOT EXISTS idx_site_inventory_recommended ON public.site_inventory(recommended_action);

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
```

**Step 1:** Create the migration file with the SQL above.
**Step 2:** Run `supabase db push` to apply.
**Step 3:** Update `SiteInventoryItem` interface in `types.ts` to add all new fields.
**Step 4:** Run `npx tsc --noEmit` — zero errors expected.
**Step 5:** Commit: `"feat: extend site_inventory schema for authority engine"`

---

### Task 1.2: Create gsc_page_metrics materialized view

Aggregate daily GSC data into per-page metrics with date-range support. This avoids expensive GROUP BY queries on every page load.

**Files:**
- Create: `supabase/migrations/20260215000001_gsc_page_metrics_view.sql`

**SQL:**
```sql
-- Per-page aggregated GSC metrics for inventory display
-- Supports date-range filtering via function parameters
-- Stores: total clicks, impressions, avg position, CTR, top queries

CREATE OR REPLACE FUNCTION public.get_gsc_page_metrics(
  p_property_id uuid,
  p_start_date date DEFAULT (CURRENT_DATE - interval '90 days')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  page text,
  total_clicks bigint,
  total_impressions bigint,
  avg_position numeric,
  avg_ctr numeric,
  top_queries jsonb,
  click_trend jsonb,  -- [{date, clicks}] for sparkline
  first_seen date,
  last_seen date
) AS $$
BEGIN
  RETURN QUERY
  WITH page_stats AS (
    SELECT
      gsa.page,
      SUM(gsa.clicks) AS total_clicks,
      SUM(gsa.impressions) AS total_impressions,
      ROUND(AVG(gsa.position)::numeric, 1) AS avg_position,
      CASE
        WHEN SUM(gsa.impressions) > 0
        THEN ROUND((SUM(gsa.clicks)::numeric / SUM(gsa.impressions)::numeric), 4)
        ELSE 0
      END AS avg_ctr,
      MIN(gsa.date) AS first_seen,
      MAX(gsa.date) AS last_seen
    FROM gsc_search_analytics gsa
    WHERE gsa.property_id = p_property_id
      AND gsa.date BETWEEN p_start_date AND p_end_date
    GROUP BY gsa.page
  ),
  top_queries_per_page AS (
    SELECT
      gsa.page,
      jsonb_agg(
        jsonb_build_object('query', gsa.query, 'clicks', gsa.clicks, 'impressions', gsa.impressions, 'position', gsa.position)
        ORDER BY gsa.clicks DESC
      ) FILTER (WHERE rn <= 10) AS top_queries
    FROM (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY page ORDER BY clicks DESC) AS rn
      FROM gsc_search_analytics
      WHERE property_id = p_property_id
        AND date BETWEEN p_start_date AND p_end_date
    ) gsa
    GROUP BY gsa.page
  ),
  click_trends AS (
    SELECT
      gsa.page,
      jsonb_agg(
        jsonb_build_object('date', gsa.date, 'clicks', SUM(gsa.clicks))
        ORDER BY gsa.date
      ) AS click_trend
    FROM gsc_search_analytics gsa
    WHERE gsa.property_id = p_property_id
      AND gsa.date BETWEEN p_start_date AND p_end_date
    GROUP BY gsa.page, gsa.date
  )
  SELECT
    ps.page,
    ps.total_clicks,
    ps.total_impressions,
    ps.avg_position,
    ps.avg_ctr,
    COALESCE(tq.top_queries, '[]'::jsonb),
    COALESCE(ct.click_trend, '[]'::jsonb),
    ps.first_seen,
    ps.last_seen
  FROM page_stats ps
  LEFT JOIN top_queries_per_page tq ON tq.page = ps.page
  LEFT JOIN click_trends ct ON ct.page = ps.page
  ORDER BY ps.total_clicks DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_gsc_page_metrics(uuid, date, date) TO authenticated;

NOTIFY pgrst, 'reload schema';
```

**Step 1:** Create the migration file.
**Step 2:** Run `supabase db push`.
**Step 3:** Commit: `"feat: add gsc_page_metrics function with date-range support"`

---

### Task 1.3: Fix remaining RLS policies (406 errors)

The `semantic_analysis_results` and `unified_audit_snapshots` tables still use legacy `user_id = auth.uid()` RLS.

**Files:**
- Create: `supabase/migrations/20260215000002_fix_remaining_rls_policies.sql`

**SQL:**
```sql
-- Fix semantic_analysis_results RLS (legacy user_id pattern)
DROP POLICY IF EXISTS "Users can view semantic results for their projects" ON public.semantic_analysis_results;
DROP POLICY IF EXISTS "Users can insert semantic results for their projects" ON public.semantic_analysis_results;
DROP POLICY IF EXISTS "Users can update semantic results for their projects" ON public.semantic_analysis_results;
DROP POLICY IF EXISTS "Users can delete semantic results for their projects" ON public.semantic_analysis_results;

CREATE POLICY "Users can view semantic results for their projects" ON public.semantic_analysis_results
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.site_inventory si
    WHERE si.id = semantic_analysis_results.inventory_id
      AND has_project_access(si.project_id)
  ));

CREATE POLICY "Users can insert semantic results for their projects" ON public.semantic_analysis_results
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.site_inventory si
    WHERE si.id = semantic_analysis_results.inventory_id
      AND has_project_access(si.project_id)
  ));

CREATE POLICY "Users can update semantic results for their projects" ON public.semantic_analysis_results
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.site_inventory si
    WHERE si.id = semantic_analysis_results.inventory_id
      AND has_project_access(si.project_id)
  ));

CREATE POLICY "Users can delete semantic results for their projects" ON public.semantic_analysis_results
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.site_inventory si
    WHERE si.id = semantic_analysis_results.inventory_id
      AND has_project_access(si.project_id)
  ));

CREATE POLICY "Service role full access to semantic_analysis_results"
  ON public.semantic_analysis_results FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Fix unified_audit_snapshots RLS
DROP POLICY IF EXISTS "Users can manage own audit snapshots" ON public.unified_audit_snapshots;

CREATE POLICY "Users can manage own audit snapshots"
  ON public.unified_audit_snapshots FOR ALL TO authenticated
  USING (has_project_access(project_id))
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "Service role full access to unified_audit_snapshots"
  ON public.unified_audit_snapshots FOR ALL TO service_role
  USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
```

**Step 1:** Create the migration file.
**Step 2:** Run `supabase db push`.
**Step 3:** Verify: open Migration Workbench → click a URL → Semantic Audit tab should not show 406.
**Step 4:** Commit: `"fix: update semantic_analysis_results and audit_snapshots RLS to has_project_access()"`

---

### Task 1.4: Create migration_plans table

Store AI-generated migration plans with per-URL actions and reasoning.

**Files:**
- Create: `supabase/migrations/20260215000003_create_migration_plans.sql`

**SQL:**
```sql
-- Migration plans: stores AI-generated migration roadmaps
CREATE TABLE IF NOT EXISTS public.migration_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  map_id uuid NOT NULL REFERENCES public.topical_maps(id) ON DELETE CASCADE,

  -- Plan metadata
  name text NOT NULL DEFAULT 'Migration Plan',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),

  -- Date range used for GSC analysis
  gsc_start_date date,
  gsc_end_date date,

  -- Summary stats (denormalized for quick display)
  total_urls int NOT NULL DEFAULT 0,
  total_topics int NOT NULL DEFAULT 0,
  matched_count int NOT NULL DEFAULT 0,
  orphan_count int NOT NULL DEFAULT 0,
  gap_count int NOT NULL DEFAULT 0,
  cannibalization_count int NOT NULL DEFAULT 0,

  -- Action breakdown
  keep_count int NOT NULL DEFAULT 0,
  optimize_count int NOT NULL DEFAULT 0,
  rewrite_count int NOT NULL DEFAULT 0,
  merge_count int NOT NULL DEFAULT 0,
  redirect_count int NOT NULL DEFAULT 0,
  prune_count int NOT NULL DEFAULT 0,
  create_count int NOT NULL DEFAULT 0,

  -- Completion tracking
  completed_count int NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.migration_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migration_plans_project_access"
  ON public.migration_plans FOR ALL TO authenticated
  USING (has_project_access(project_id))
  WITH CHECK (has_project_access(project_id));

CREATE POLICY "Service role full access to migration_plans"
  ON public.migration_plans FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_migration_plans_project ON public.migration_plans(project_id);

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
```

**Step 1:** Create the migration file.
**Step 2:** Run `supabase db push`.
**Step 3:** Add `MigrationPlan` interface to `types.ts`.
**Step 4:** Commit: `"feat: add migration_plans table for AI-generated roadmaps"`

---

## Phase 2: GSC Data Enhancement

### Task 2.1: Upgrade analytics-sync-worker to 16 months

The edge function currently fetches only 7 days. Upgrade to full 16 months with pagination.

**Files:**
- Modify: `supabase/functions/analytics-sync-worker/index.ts` (lines 208-284)

**Changes to `fetchGscData()` function:**

```typescript
async function fetchGscData(
  accessToken: string,
  siteUrl: string,
  supabase: any,
  propertyDbId: string,
  syncLogId: string
): Promise<{ rows: any[]; rowCount: number }> {
  // Fetch full 16 months of search analytics (GSC API max)
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3); // GSC data delayed by ~3 days
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 16);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  let allRows: any[] = [];
  let startRow = 0;
  const ROW_LIMIT = 25000; // API max per request
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `${GSC_API_BASE}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ['query', 'page', 'date'],
          rowLimit: ROW_LIMIT,
          startRow,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`GSC API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const rows = data.rows || [];
    allRows = allRows.concat(rows);
    startRow += rows.length;
    hasMore = rows.length === ROW_LIMIT; // If we got exactly the limit, there may be more

    console.log(
      `[analytics-sync-worker] GSC: fetched ${rows.length} rows (total: ${allRows.length}) for ${siteUrl}`
    );
  }

  // Persist rows to gsc_search_analytics table in batches
  if (allRows.length > 0) {
    const BATCH_SIZE = 500;
    for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
      const batch = allRows.slice(i, i + BATCH_SIZE).map((row: any) => ({
        property_id: propertyDbId,
        sync_log_id: syncLogId,
        date: row.keys[2],
        query: row.keys[0],
        page: row.keys[1],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));

      const { error: insertError } = await supabase
        .from('gsc_search_analytics')
        .upsert(batch, { onConflict: 'property_id,date,query,page' });

      if (insertError) {
        console.error(
          `[analytics-sync-worker] GSC insert batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`,
          insertError
        );
      }
    }
  }

  return { rows: allRows, rowCount: allRows.length };
}
```

**Step 1:** Update `fetchGscData()` in the edge function with pagination and 16-month range.
**Step 2:** Deploy: `supabase functions deploy analytics-sync-worker --no-verify-jwt --use-api`
**Step 3:** Test manually: trigger sync from UI, verify data spans > 7 days in `gsc_search_analytics`.
**Step 4:** Commit: `"feat: upgrade GSC sync to 16 months with pagination"`

---

### Task 2.2: Create URL Inspection edge function

New edge function to batch-fetch URL Inspection data from GSC API.

**Files:**
- Create: `supabase/functions/gsc-url-inspection/index.ts`

**Key details:**
- Accepts: `{ propertyId: string, urls: string[] }` (max 50 per call due to API rate limits)
- Uses service role key to bypass RLS
- For each URL, calls `https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`
- Returns per-URL: indexing verdict, crawl state, Google-selected canonical, mobile usability, rich results status, last crawl date
- Rate limit: ~600 inspections/min (GSC limit is 2000/day — batch intelligently)
- Stores results directly in `site_inventory` columns
- Uses same OAuth token refresh pattern as `analytics-sync-worker`

**Step 1:** Create edge function with CORS headers (include `app.cutthecrap.net`).
**Step 2:** Deploy: `supabase functions deploy gsc-url-inspection --no-verify-jwt --use-api`
**Step 3:** Test with a small batch of 5 URLs.
**Step 4:** Commit: `"feat: add gsc-url-inspection edge function for index status data"`

---

### Task 2.3: Create CrUX lookup edge function

New edge function to fetch real Core Web Vitals data from CrUX API.

**Files:**
- Create: `supabase/functions/crux-lookup/index.ts`

**Key details:**
- Accepts: `{ urls: string[] }` (batch up to 50)
- Calls CrUX API: `https://chromeuxreport.googleapis.com/v1/records:queryRecord`
- Per URL request body: `{ url: "https://example.com/page" }`
- Falls back to origin-level if per-URL data unavailable
- Returns: LCP (p75), INP (p75), CLS (p75), assessment (good/needs-improvement/poor)
- Rate limit: 150 queries/min (free, no key needed for basic usage; API key recommended)
- Stores results in `site_inventory.cwv_*` columns

**Step 1:** Create edge function.
**Step 2:** Deploy: `supabase functions deploy crux-lookup --no-verify-jwt --use-api`
**Step 3:** Test with 3 URLs.
**Step 4:** Commit: `"feat: add crux-lookup edge function for real Core Web Vitals data"`

---

### Task 2.4: Update importGscFromApi to use date-range function

Update `services/migrationService.ts` to use the new `get_gsc_page_metrics` function and populate inventory with richer GSC data.

**Files:**
- Modify: `services/migrationService.ts` — `importGscFromApi()` function

**Changes:**
- Instead of raw SELECT on `gsc_search_analytics`, call the RPC function: `supabase.rpc('get_gsc_page_metrics', { p_property_id, p_start_date, p_end_date })`
- Map results to inventory: `gsc_clicks`, `gsc_impressions`, `gsc_position`, plus new `striking_distance_keywords` from top_queries where position 5-20
- Accept date range parameters from UI (default: 90 days)

**Step 1:** Update `importGscFromApi` to use RPC call.
**Step 2:** Update `SiteIngestionWizard.tsx` to pass date range.
**Step 3:** Run `npx tsc --noEmit` — zero errors.
**Step 4:** Commit: `"feat: use date-range GSC aggregation for inventory import"`

---

## Phase 3: Batch Audit Engine

### Task 3.1: Create BatchAuditService

A service that queues and processes audits for all inventory URLs.

**Files:**
- Create: `services/audit/BatchAuditService.ts`

**Interface:**
```typescript
export interface BatchAuditProgress {
  total: number;
  completed: number;
  currentUrl: string;
  currentPhase: string;
  errors: { url: string; error: string }[];
}

export interface BatchAuditOptions {
  concurrency?: number; // default: 2 (Jina/Firecrawl rate limit safe)
  skipAlreadyAudited?: boolean; // default: true
  maxPages?: number; // optional cap
  priorityOrder?: 'clicks' | 'impressions' | 'alphabetical'; // default: 'clicks'
}

export class BatchAuditService {
  constructor(
    private orchestrator: UnifiedAuditOrchestrator,
    private supabase: SupabaseClient,
    private projectId: string,
    private mapId: string,
  ) {}

  async runBatch(
    inventory: SiteInventoryItem[],
    options: BatchAuditOptions,
    onProgress: (progress: BatchAuditProgress) => void,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    // 1. Filter: skip already-audited if option set
    // 2. Sort by priority (clicks DESC)
    // 3. Process with concurrency limit
    // 4. For each URL:
    //    a. Run full audit via orchestrator
    //    b. Cache content as ORIGINAL_IMPORT snapshot (avoid re-fetch later)
    //    c. Update site_inventory: audit_score, audit_snapshot_id, last_audited_at
    //    d. Update site_inventory: page_title, page_h1, meta_description, headings, etc.
    //    e. Report progress
    // 5. On error: log and continue (don't abort entire batch)
  }
}
```

**Key implementation details:**
- Use `Promise.allSettled` with concurrency pool (p-limit pattern or manual semaphore)
- Content from `ContentFetcher.fetch()` is saved to `transition_snapshots` with type `ORIGINAL_IMPORT` so the workbench doesn't re-fetch
- Page metadata (title, H1, headings, links, schema) extracted from `FetchedContent` is stored on the inventory row for auto-matching
- Audit snapshot ID linked to inventory row for quick lookup

**Step 1:** Write tests for BatchAuditService (mock orchestrator, verify progress callbacks, verify inventory updates).
**Step 2:** Run tests — verify they fail.
**Step 3:** Implement BatchAuditService.
**Step 4:** Run tests — verify they pass.
**Step 5:** Run `npx tsc --noEmit` — zero errors.
**Step 6:** Commit: `"feat: add BatchAuditService for inventory-wide auditing"`

---

### Task 3.2: Create useBatchAudit hook

React hook that manages batch audit state and progress for the UI.

**Files:**
- Create: `hooks/useBatchAudit.ts`

**Interface:**
```typescript
export function useBatchAudit(projectId: string, mapId: string) {
  return {
    isRunning: boolean,
    progress: BatchAuditProgress | null,
    startBatch: (inventory: SiteInventoryItem[], options?: BatchAuditOptions) => Promise<void>,
    cancelBatch: () => void,
    error: string | null,
  };
}
```

**Details:**
- Instantiates `BatchAuditService` with `UnifiedAuditOrchestrator` (same pattern as `AuditPage.tsx` lines 158-188)
- Uses `AbortController` for cancellation
- Updates progress state on each callback
- Handles cleanup on unmount

**Step 1:** Write hook.
**Step 2:** Run `npx tsc --noEmit` — zero errors.
**Step 3:** Commit: `"feat: add useBatchAudit hook for UI integration"`

---

## Phase 4: Auto-Matching Service

### Task 4.1: Create AutoMatchService

Matches inventory URLs to topical map topics using multiple signals.

**Files:**
- Create: `services/migration/AutoMatchService.ts`
- Test: `services/migration/__tests__/AutoMatchService.test.ts`

**Interface:**
```typescript
export interface MatchResult {
  inventoryId: string;
  topicId: string | null;       // null = orphan
  confidence: number;           // 0.0 - 1.0
  matchSignals: MatchSignal[];  // which signals contributed
  category: 'matched' | 'orphan' | 'cannibalization';
  competingUrls?: string[];     // for cannibalization
}

export interface MatchSignal {
  type: 'h1' | 'title' | 'url_slug' | 'gsc_query' | 'content_body' | 'heading_keywords';
  score: number;
  detail: string; // e.g., "H1 'Plumbing Services' matches topic 'Plumbing Services Miami'"
}

export interface GapTopic {
  topicId: string;
  topicTitle: string;
  importance: 'pillar' | 'supporting';
}

export interface AutoMatchResult {
  matches: MatchResult[];
  gaps: GapTopic[];
  stats: {
    matched: number;
    orphans: number;
    cannibalization: number;
    gaps: number;
  };
}

export class AutoMatchService {
  match(
    inventory: SiteInventoryItem[],     // with page_title, page_h1, headings populated
    topics: EnrichedTopic[],
    gscQueries?: Map<string, string[]>, // url → top queries
  ): AutoMatchResult
}
```

**Matching algorithm:**
1. For each inventory URL, compute similarity against each topic:
   - H1 ↔ topic title: Jaccard similarity on word tokens (weight: 0.30)
   - Page title ↔ topic title: Jaccard similarity (weight: 0.25)
   - URL slug ↔ topic slug/keywords: token overlap (weight: 0.20)
   - GSC queries ↔ topic keywords: set intersection (weight: 0.25)
2. Best match > 0.4 threshold → suggest as match
3. Multiple URLs → same topic with confidence > 0.3 → cannibalization
4. Topics with no matching URL → gap

**Step 1:** Write tests covering: exact match, partial match, no match (orphan), cannibalization detection, gap detection.
**Step 2:** Run tests — verify fail.
**Step 3:** Implement `AutoMatchService`.
**Step 4:** Run tests — verify pass.
**Step 5:** Commit: `"feat: add AutoMatchService for inventory-to-topic matching"`

---

### Task 4.2: Create useAutoMatch hook

**Files:**
- Create: `hooks/useAutoMatch.ts`

**Interface:**
```typescript
export function useAutoMatch(projectId: string, mapId: string) {
  return {
    isMatching: boolean,
    result: AutoMatchResult | null,
    runMatch: (inventory: SiteInventoryItem[], topics: EnrichedTopic[]) => Promise<void>,
    confirmMatch: (inventoryId: string, topicId: string) => Promise<void>,
    rejectMatch: (inventoryId: string) => Promise<void>,
    confirmAll: (minConfidence: number) => Promise<void>,  // batch confirm above threshold
    error: string | null,
  };
}
```

**Details:**
- Calls `AutoMatchService.match()`
- `confirmMatch` updates `site_inventory.mapped_topic_id`, `match_confidence`, `match_source='confirmed'`
- `confirmAll` batch-confirms all matches above threshold
- Fetches GSC top queries per page from `gsc_search_analytics` for matching signals

**Step 1:** Write hook.
**Step 2:** Run `npx tsc --noEmit`.
**Step 3:** Commit: `"feat: add useAutoMatch hook"`

---

## Phase 5: AI Migration Plan Engine

### Task 5.1: Create MigrationPlanEngine

Generates a prioritized action plan based on GSC performance + audit quality + matching results.

**Files:**
- Create: `services/migration/MigrationPlanEngine.ts`
- Test: `services/migration/__tests__/MigrationPlanEngine.test.ts`

**Interface:**
```typescript
export interface PlanInput {
  inventory: SiteInventoryItem[];  // with audit_score, gsc_clicks, matched_topic_id populated
  topics: EnrichedTopic[];
  matchResult: AutoMatchResult;
}

export interface PlannedAction {
  inventoryId: string;
  url: string;
  action: ActionType | 'CREATE_NEW'; // extends ActionType with CREATE_NEW for gaps
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'none' | 'low' | 'medium' | 'high';
  reasoning: string;               // Human-readable explanation
  dataPoints: PlanDataPoint[];     // Evidence supporting the decision
  topicId?: string;                // For matched/gap items
  mergeTargetUrl?: string;         // For merge actions
  redirectTargetUrl?: string;      // For redirect actions
}

export interface PlanDataPoint {
  label: string;    // e.g., "Monthly Clicks"
  value: string;    // e.g., "342"
  impact: string;   // e.g., "High traffic at risk"
}

export class MigrationPlanEngine {
  generatePlan(input: PlanInput): PlannedAction[]
}
```

**Decision logic (deterministic, no AI needed):**

```
For each matched URL:
  IF audit_score >= 70 AND gsc_clicks > 0:
    action = KEEP, priority = low, effort = none
    reasoning = "Page scores {score}/100 and drives {clicks} clicks/month. No changes needed."

  IF audit_score >= 70 AND gsc_clicks == 0:
    action = KEEP, priority = low, effort = none
    reasoning = "Content quality is good. Monitor for indexing/ranking improvements."

  IF audit_score 40-69 AND gsc_clicks > 0:
    action = REWRITE (light), priority = high, effort = medium
    reasoning = "This page drives {clicks} clicks but has {critical_count} critical issues. Optimization protects existing traffic."

  IF audit_score < 40 AND gsc_clicks > 0:
    action = REWRITE, priority = critical, effort = high
    reasoning = "Low quality ({score}/100) but {clicks} monthly clicks. Rewrite urgently to prevent ranking loss."

  IF audit_score < 40 AND gsc_clicks == 0:
    action = REWRITE, priority = medium, effort = high
    reasoning = "Content doesn't serve the target topic. Needs fundamental rework."

For cannibalization sets:
  action = MERGE, priority = high, effort = medium
  reasoning = "Pages {url_a} and {url_b} compete for '{topic}'. Merge into one page, 301 redirect the weaker."
  (Keep the URL with more clicks, redirect the other)

For orphan URLs:
  IF gsc_clicks > threshold (e.g., 10):
    action = REDIRECT_301, priority = high, effort = low
    reasoning = "Gets {clicks} clicks but doesn't match any target topic. Redirect to {closest_topic} to preserve link equity."

  IF gsc_clicks <= threshold AND audit_score < 30:
    action = PRUNE_410, priority = medium, effort = low
    reasoning = "No traffic, low quality. Removing reduces crawl budget waste."

  IF gsc_clicks <= threshold AND audit_score >= 30:
    action = KEEP, priority = low, effort = none
    reasoning = "Decent content but no matching topic. Consider adding to topical map or redirecting."

  IF google_canonical != url (canonical conflict):
    action = CANONICALIZE, priority = high, effort = low
    reasoning = "Google selected a different canonical ({canonical}). Fix to consolidate ranking signals."

For gap topics:
  IF topic is pillar type:
    action = CREATE_NEW, priority = critical, effort = high
    reasoning = "Core pillar topic with no existing page. Essential for topical authority."

  IF topic is supporting type:
    action = CREATE_NEW, priority = medium, effort = high
    reasoning = "Supporting topic needed for complete coverage of '{pillar_name}' cluster."
```

**Priority sorting:**
1. Critical: traffic at risk OR pillar gaps
2. High: optimization opportunities OR cannibalization
3. Medium: rewrites without traffic, supporting gaps
4. Low: keep as-is, monitor

Within each priority tier, sort by `gsc_clicks DESC` (highest traffic impact first).

**Step 1:** Write tests: matched-keep, matched-optimize, matched-rewrite, cannibalization-merge, orphan-redirect, orphan-prune, gap-create.
**Step 2:** Run tests — verify fail.
**Step 3:** Implement `MigrationPlanEngine`.
**Step 4:** Run tests — verify pass.
**Step 5:** Commit: `"feat: add MigrationPlanEngine for AI migration roadmap generation"`

---

### Task 5.2: Create useMigrationPlan hook

**Files:**
- Create: `hooks/useMigrationPlan.ts`

**Interface:**
```typescript
export function useMigrationPlan(projectId: string, mapId: string) {
  return {
    plan: PlannedAction[] | null,
    isGenerating: boolean,
    generatePlan: (inventory: SiteInventoryItem[], topics: EnrichedTopic[], matchResult: AutoMatchResult) => void,
    applyPlan: () => Promise<void>,  // writes recommended_action, action_reasoning, action_priority to site_inventory
    savePlan: () => Promise<void>,   // persists to migration_plans table
    stats: PlanStats | null,
    error: string | null,
  };
}
```

**Step 1:** Write hook.
**Step 2:** Run `npx tsc --noEmit`.
**Step 3:** Commit: `"feat: add useMigrationPlan hook"`

---

## Phase 6: UI — 5-Step Authority Wizard

### Task 6.1: Create AuthorityWizardContainer

Replace `MigrationDashboardContainer` content area with a step-based wizard.

**Files:**
- Create: `components/migration/AuthorityWizardContainer.tsx`
- Modify: `components/migration/MigrationDashboardContainer.tsx` — render `AuthorityWizardContainer` as the main content

**Design:**
```
┌─────────────────────────────────────────────────────────┐
│  Step indicator: [1.Import] [2.Audit] [3.Match] [4.Plan] [5.Execute] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Step content (varies per step)                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Back]                              [Continue / Skip]  │
└─────────────────────────────────────────────────────────┘
```

**State:**
```typescript
const [currentStep, setCurrentStep] = useState<1|2|3|4|5>(1);
const [importComplete, setImportComplete] = useState(false);
const [auditComplete, setAuditComplete] = useState(false);
const [matchComplete, setMatchComplete] = useState(false);
const [planComplete, setPlanComplete] = useState(false);
```

**Step navigation rules:**
- Step 1 → 2: when inventory has at least 1 URL imported
- Step 2 → 3: when batch audit is complete (or skipped)
- Step 3 → 4: when matching is confirmed
- Step 4 → 5: when plan is generated and applied
- Steps are clickable if their prerequisite is met (can go back)

**Step 1:** Create component shell with step indicator and navigation.
**Step 2:** Wire into `MigrationDashboardContainer` (keep existing views accessible via "Advanced Views" dropdown).
**Step 3:** Run `npx tsc --noEmit`.
**Step 4:** Commit: `"feat: add AuthorityWizardContainer with step navigation"`

---

### Task 6.2: Step 1 — Import Screen

**Files:**
- Create: `components/migration/steps/ImportStep.tsx`

**Layout:**
```
"Let's understand your website"

┌─────────────────────────────────────────────┐
│  Sitemap Import                             │
│  [URL input] [Fetch & Import]               │
│  ✓ 127 URLs imported                        │
├─────────────────────────────────────────────┤
│  Google Search Console                      │
│  [Connected: sc-domain:example.com]         │
│  Date range: [Start ▼] — [End ▼]           │
│  [Sync 16 Months of Data]                   │
│  ✓ 48,329 rows synced (16 months)          │
│  — or —                                     │
│  [Upload Pages.csv]                         │
├─────────────────────────────────────────────┤
│  URL Inspection (optional)                  │
│  [Fetch Index Status for Top 100 Pages]     │
│  ⏳ 23/100 inspected...                     │
├─────────────────────────────────────────────┤
│  Core Web Vitals (optional)                 │
│  [Fetch CrUX Data]                          │
│  ✓ 89 URLs with field data                  │
├─────────────────────────────────────────────┤
│  Preview Table:                             │
│  URL | Clicks | Impressions | Position | Indexed | CWV │
│  /services/   | 342 | 12,400 | 4.2 | ✓ | Good  │
│  /about/      | 89  | 3,200  | 8.7 | ✓ | Poor  │
│  ...                                        │
└─────────────────────────────────────────────┘
```

**Key differences from current SiteIngestionWizard:**
- Not a modal — inline step content
- Date range picker for GSC sync
- Shows impressions column
- URL Inspection and CrUX as optional enrichment steps
- Preview table shows all available data columns

**Step 1:** Create `ImportStep` component.
**Step 2:** Integrate existing `fetchAndParseSitemap`, `importGscFromApi`, and new edge function calls.
**Step 3:** Add date range picker (simple select: 28d/90d/6m/12m/16m).
**Step 4:** Run `npx tsc --noEmit`.
**Step 5:** Commit: `"feat: add ImportStep with full GSC data and optional enrichments"`

---

### Task 6.3: Step 2 — Audit Screen

**Files:**
- Create: `components/migration/steps/AuditStep.tsx`

**Layout:**
```
"Analyzing every page"

┌─────────────────────────────────────────────┐
│  Batch Audit Progress                       │
│  ████████░░░░░░░ 42/127 pages              │
│  Current: /services/plumbing/ — EAV System  │
│  Estimated: ~12 min remaining               │
│  [Cancel]                                   │
├─────────────────────────────────────────────┤
│  Results (live-updating as audits complete): │
│  URL         | Clicks | Quality | CoR | CWV │
│  /services/  | 342    | 78 🟢   | 23  | Good│
│  /about/     | 89     | 34 🔴   | 67  | Poor│
│  /blog/seo/  | 12     | 61 🟡   | 45  | OK  │
│  ...                                        │
├─────────────────────────────────────────────┤
│  Summary (updates in real-time):            │
│  🟢 Good (>70): 34 pages                    │
│  🟡 Needs Work (40-70): 56 pages            │
│  🔴 Poor (<40): 37 pages                    │
│  Average score: 52/100                      │
└─────────────────────────────────────────────┘
```

**Features:**
- Auto-starts batch audit on step entry (with user confirmation)
- Real-time progress bar
- Live-updating inventory table with quality scores
- Summary stats update as audits complete
- Cancel button (graceful — completes current audit, stops queue)
- Can skip (proceed without full audit — actions will be less informed)
- Clicking a row opens a mini audit detail panel (phase scores, top findings)

**Step 1:** Create `AuditStep` component using `useBatchAudit` hook.
**Step 2:** Add real-time table updates.
**Step 3:** Run `npx tsc --noEmit`.
**Step 4:** Commit: `"feat: add AuditStep with batch audit progress and live results"`

---

### Task 6.4: Step 3 — Match Screen

**Files:**
- Create: `components/migration/steps/MatchStep.tsx`

**Layout:**
```
"Mapping your site to the target strategy"

┌──────────────────┬──────────────────────────┐
│  Stats Bar:      │                          │
│  47 Matched | 8 Cannibalization | 32 Orphans | 38 Gaps │
├──────────────────┴──────────────────────────┤
│                                             │
│  Left: Inventory                            │
│  ┌─────────────────────────────────────┐    │
│  │ /services/plumbing/ → Plumbing (87%)│ ✓  │
│  │ /services/heating/ → Heating (92%)  │ ✓  │
│  │ /old-blog-post/ → ??? (orphan)      │ 🔴 │
│  │ /services/ac/ → AC Repair (34%)     │ ⚠️  │
│  └─────────────────────────────────────┘    │
│                                             │
│  Right: Topical Map (visual)                │
│  Topics colored by: covered / gap           │
│  🟢 = has matched URL                       │
│  🔴 = no existing page (gap)                │
│                                             │
├─────────────────────────────────────────────┤
│  Actions:                                   │
│  [Accept All Above 80%] [Review One-by-One] │
└─────────────────────────────────────────────┘
```

**Features:**
- Auto-runs matching on step entry
- Split view: inventory list (left) + topical map visualization (right)
- Each match shows confidence % and the signals that contributed
- Click to override: reassign URL to different topic, or mark as orphan
- Cannibalization highlighted in red with both competing URLs shown
- Gaps highlighted on the topical map
- Bulk confirm button for high-confidence matches
- Manual drag & drop still works for overrides

**Step 1:** Create `MatchStep` component using `useAutoMatch` hook.
**Step 2:** Add split view with confidence display.
**Step 3:** Add bulk confirm and per-match override UI.
**Step 4:** Run `npx tsc --noEmit`.
**Step 5:** Commit: `"feat: add MatchStep with auto-matching and confidence display"`

---

### Task 6.5: Step 4 — Plan Screen

**Files:**
- Create: `components/migration/steps/PlanStep.tsx`

**Layout:**
```
"Your migration roadmap"

┌─────────────────────────────────────────────┐
│  Summary Dashboard                          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │Keep │ │Opt. │ │Merge│ │Redir│ │Prune│   │
│  │ 34  │ │ 37  │ │  8  │ │ 12  │ │  6  │   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │
│  + 38 new pages to create                   │
│                                             │
│  Estimated effort: ~45 hours                │
│  Traffic at risk: 2,340 clicks/month        │
├─────────────────────────────────────────────┤
│  Filter: [All ▼] [Critical ▼] [Action ▼]   │
├─────────────────────────────────────────────┤
│  🔴 CRITICAL                                │
│  ┌───────────────────────────────────────┐  │
│  │ REWRITE /services/plumbing/           │  │
│  │ 342 clicks/mo | Score: 28/100         │  │
│  │ "Low quality but high traffic.        │  │
│  │  Rewrite urgently to prevent loss."   │  │
│  │ Key issues: CE missing from H1,       │  │
│  │  3 critical EAV gaps, no schema       │  │
│  │ [Override Action ▼]                   │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │ CREATE NEW: "Emergency Plumbing"      │  │
│  │ Pillar topic — no existing page       │  │
│  │ "Core pillar topic. Essential for     │  │
│  │  topical authority."                  │  │
│  │ [Override Action ▼]                   │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  🟠 HIGH                                    │
│  ...                                        │
├─────────────────────────────────────────────┤
│  [Apply Plan & Start Executing]             │
└─────────────────────────────────────────────┘
```

**Features:**
- Summary counters per action type (pie chart)
- Estimated effort aggregation
- Traffic at risk calculation (sum of clicks on optimize/rewrite/merge actions)
- Grouped by priority tier (critical → high → medium → low)
- Each action card shows: action, URL, metrics, reasoning, key issues
- Override dropdown per action (user can change any recommendation)
- "Apply Plan" writes `recommended_action`, `action_reasoning`, `action_priority`, `action_effort` to all inventory rows
- Saves plan to `migration_plans` table

**Step 1:** Create `PlanStep` component using `useMigrationPlan` hook.
**Step 2:** Add summary dashboard with action counters.
**Step 3:** Add grouped action list with reasoning cards.
**Step 4:** Add override dropdowns.
**Step 5:** Run `npx tsc --noEmit`.
**Step 6:** Commit: `"feat: add PlanStep with prioritized migration roadmap"`

---

### Task 6.6: Step 5 — Execute Screen

**Files:**
- Create: `components/migration/steps/ExecuteStep.tsx`

**Layout:**
```
"Work through the plan"

┌─────────────────────────────────────────────┐
│  Progress: 12/37 optimizations complete     │
│  ████████░░░░░░░ 32%                        │
├──────────┬──────────────────────────────────┤
│  Queue   │  Workbench                       │
│  ────    │  ────                            │
│ ✓ /srv/  │  /about/                         │
│ ✓ /abt/  │  ┌─────────┬──────────────┐     │
│ ▶ /blog/ │  │Original │ Optimized    │     │
│   /faq/  │  │ + Audit │ Editor       │     │
│   /cnt/  │  │ Findings│              │     │
│          │  └─────────┴──────────────┘     │
│          │  Score: 34 → ???                 │
│          │  [Re-Audit] [Mark Done] [Skip]  │
├──────────┴──────────────────────────────────┤
│  Next: /faq/ (OPTIMIZE, 89 clicks)         │
└─────────────────────────────────────────────┘
```

**Features:**
- Left sidebar: prioritized queue of action items (completed items checked off)
- Main area: adapted from existing `MigrationWorkbenchModal` but inline (not modal)
- For OPTIMIZE/REWRITE: shows original + findings + editor (same as current workbench)
- For MERGE: shows both pages side-by-side
- For REDIRECT/PRUNE: simple confirmation card with target selection
- For CREATE_NEW: link to content brief generation
- Re-audit button: runs audit on new content, shows before/after score
- "Mark Done" advances to next item
- Progress bar updates

**Step 1:** Create `ExecuteStep` component, adapting workbench modal to inline layout.
**Step 2:** Add queue sidebar with completion tracking.
**Step 3:** Add action-type-specific views (optimize, merge, redirect, prune, create).
**Step 4:** Add re-audit comparison (before/after scores).
**Step 5:** Run `npx tsc --noEmit`.
**Step 6:** Commit: `"feat: add ExecuteStep with queue-based workbench"`

---

## Phase 7: Cleanup & Polish

### Task 7.1: Update InventoryMatrix columns

Add missing columns to the inventory table view.

**Files:**
- Modify: `components/migration/InventoryMatrix.tsx`

**New columns:**
| Column | Source | Notes |
|--------|--------|-------|
| URL | url | Keep, show relative path |
| Clicks | gsc_clicks | Keep |
| Impressions | gsc_impressions | **New** (was collected but not shown) |
| Position | gsc_position | **New** |
| Quality | audit_score | **New** — replaces CoR as primary metric |
| CoR | cor_score | Keep but demote (less prominent) |
| CWV | cwv_assessment | **New** — good/needs-improvement/poor badge |
| Status | status | Keep |
| Action | recommended_action | **New** — from migration plan |

**Step 1:** Add new columns.
**Step 2:** Add sortability for all columns.
**Step 3:** Run `npx tsc --noEmit`.
**Step 4:** Commit: `"feat: add impressions, position, quality, CWV, action columns to inventory table"`

---

### Task 7.2: Update types.ts with all new interfaces

Ensure all new interfaces are properly exported.

**Files:**
- Modify: `types.ts`

**New types to add:**
```typescript
// Site Authority Engine types
export interface MigrationPlan {
  id: string;
  project_id: string;
  map_id: string;
  name: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  gsc_start_date?: string;
  gsc_end_date?: string;
  total_urls: number;
  total_topics: number;
  matched_count: number;
  orphan_count: number;
  gap_count: number;
  cannibalization_count: number;
  keep_count: number;
  optimize_count: number;
  rewrite_count: number;
  merge_count: number;
  redirect_count: number;
  prune_count: number;
  create_count: number;
  completed_count: number;
  created_at: string;
  updated_at: string;
}
```

**Updated SiteInventoryItem** — add all new columns from Task 1.1.

**Step 1:** Update types.
**Step 2:** Run `npx tsc --noEmit`.
**Step 3:** Commit: `"feat: update types for Site Authority Engine"`

---

### Task 7.3: Remove deprecated code

Clean up code that's been superseded.

**Files to modify:**
- `services/migrationService.ts` — Remove `runTechnicalCrawl()` and `calculateCoR()` (superseded by batch audit)
- `components/migration/SiteIngestionWizard.tsx` — Remove Step 3 (Technical Audit) entirely; the batch audit in Step 2 replaces it
- `hooks/useSemanticAnalysis.ts` — Keep but mark as legacy; the audit's Strategic Foundation + EAV phases replace it for migration context
- `services/semanticAnalysisPersistence.ts` — Keep but mark as legacy

**Do NOT remove:**
- `getOriginalContent()` — still needed as fallback for workbench if audit content cache is missing
- `fetchAndParseSitemap()` — still used in Step 1
- `processGscPages()` — still used for CSV upload fallback
- `importGscFromApi()` — still used in Step 1

**Step 1:** Remove `runTechnicalCrawl` and `calculateCoR` from migrationService.ts.
**Step 2:** Simplify `SiteIngestionWizard` to 2 steps (or deprecate in favor of `ImportStep`).
**Step 3:** Run `npx tsc --noEmit` — fix any references.
**Step 4:** Run `npx vitest run` — all tests pass.
**Step 5:** Commit: `"refactor: remove deprecated technical crawl, replaced by batch audit"`

---

### Task 7.4: Fix the `unified_audit_snapshots` RLS policy

Already covered in Task 1.3, but verify it's applied.

---

## Implementation Order & Dependencies

```
Phase 1 (DB)     ──→ All other phases depend on schema
  ├── Task 1.1 (extend site_inventory)
  ├── Task 1.2 (GSC page metrics function)
  ├── Task 1.3 (fix RLS) ← DO THIS FIRST (fixes 406 errors)
  └── Task 1.4 (migration_plans table)

Phase 2 (GSC)    ──→ Depends on Phase 1
  ├── Task 2.1 (16-month sync)
  ├── Task 2.2 (URL Inspection)
  ├── Task 2.3 (CrUX)
  └── Task 2.4 (date-range import)

Phase 3 (Audit)  ──→ Depends on Phase 1
  ├── Task 3.1 (BatchAuditService)
  └── Task 3.2 (useBatchAudit hook)

Phase 4 (Match)  ──→ Depends on Phase 3 (needs audit data for matching)
  ├── Task 4.1 (AutoMatchService)
  └── Task 4.2 (useAutoMatch hook)

Phase 5 (Plan)   ──→ Depends on Phase 4 (needs match results)
  ├── Task 5.1 (MigrationPlanEngine)
  └── Task 5.2 (useMigrationPlan hook)

Phase 6 (UI)     ──→ Depends on Phases 2-5 (needs all hooks)
  ├── Task 6.1 (AuthorityWizardContainer)
  ├── Task 6.2 (ImportStep) ← depends on Phase 2
  ├── Task 6.3 (AuditStep) ← depends on Phase 3
  ├── Task 6.4 (MatchStep) ← depends on Phase 4
  ├── Task 6.5 (PlanStep) ← depends on Phase 5
  └── Task 6.6 (ExecuteStep) ← depends on existing workbench

Phase 7 (Polish) ──→ After all phases
  ├── Task 7.1 (InventoryMatrix columns)
  ├── Task 7.2 (types.ts updates)
  └── Task 7.3 (remove deprecated code)
```

**Recommended execution order:**
1. Task 1.3 (fix RLS — immediate bug fix)
2. Task 7.2 (types — needed by everything)
3. Task 1.1 (schema extension)
4. Task 1.2 + 1.4 (parallel)
5. Task 2.1 (GSC upgrade)
6. Task 3.1 + 3.2 (batch audit)
7. Task 4.1 + 4.2 (auto-matching)
8. Task 5.1 + 5.2 (plan engine)
9. Task 6.1 → 6.6 (UI, sequential)
10. Task 2.2 + 2.3 (optional enrichments — can be added later)
11. Task 7.1 + 7.3 (cleanup)

---

## Data Sources Not Yet Available (Future Work)

| Data Source | Status | What It Provides | Priority |
|-----------|--------|------------------|----------|
| **Bing Webmaster Tools API** | Not implemented | AI citations, search data | Medium |
| **AI Overview / Citation tracking** | Not available via API | AI search visibility | Future |
| **Competitor analysis** | Partially exists (QueryNetworkAudit) | Competitor gap data | Medium |
| **Backlink data** | Not implemented | Link authority, referring domains | Medium |
| **Google Indexing API** | Not implemented | Request indexing for new pages | Low |
| **PageSpeed Insights API** | Edge function needed | Lab performance data | Low |
| **Structured Data Testing** | Partially in audit (Meta phase) | Schema validation | Already done |

---

## Testing Strategy

**Unit tests (Vitest):**
- `AutoMatchService` — matching logic, cannibalization detection, gap detection
- `MigrationPlanEngine` — decision logic for each action type
- `BatchAuditService` — progress tracking, error handling, concurrency
- `get_gsc_page_metrics` — SQL function (test via Supabase client)

**Integration tests:**
- Full flow: import → audit → match → plan → verify inventory state
- GSC sync: verify 16-month data lands correctly

**Manual verification:**
- Open Migration Workbench → complete 5-step flow end-to-end
- Verify date range picker affects displayed metrics
- Verify batch audit progress updates in real-time
- Verify auto-match confidence scores are reasonable
- Verify plan reasoning is clear and actionable
- Verify workbench shows audit findings per page

---

## Commit Conventions

All commits follow existing pattern:
- `feat:` for new features
- `fix:` for bug fixes
- `refactor:` for cleanup
- Each task = 1 commit (or sub-commits per step for TDD)
- All commits include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
