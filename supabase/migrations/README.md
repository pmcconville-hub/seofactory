# Database Migrations

This folder contains Supabase/PostgreSQL migrations for the Holistic SEO Topical Map Generator.

## Migration Naming Convention

Migrations use timestamp prefixes: `YYYYMMDDHHMMSS_description.sql`

## Migration History

### Foundational Schema (July 2024)
- `20240725000000_initial_schema.sql` - **Primary schema** with core tables:
  - `user_settings` - User preferences and encrypted API keys
  - `projects` - Top-level project container
  - `topical_maps` - Content strategy with business_info, pillars, eavs
  - `topics` - Core and outer topics with parent-child relationships
  - `content_briefs` - AI-generated briefs linked to topics

### Legacy No-Op Migrations
These migrations are kept for migration history compatibility. They contain only `SELECT 1;`:
- `20240730100000_initial_schema.sql`
- `20240801000000_create_projects_table.sql`
- `20240801000001_setup_project_table.sql`
- `20251125000000_site_analysis_tables.sql`

**Do not delete these files** - Supabase tracks executed migrations in `supabase_migrations.schema_migrations`. Removing files that have already run will cause sync issues.

### Feature Migrations (November-December 2025)
- Site analysis V2 tables and page audits
- Content generation jobs and sections (multi-pass article generation)
- Unified audit system
- Transition tables for topic reparenting
- Schema generation and entity resolution cache
- Publication planning
- Help documentation system

## Key Tables by Feature

### Core SEO Workflow
- `user_settings`, `projects`, `topical_maps`, `topics`, `content_briefs`

### Content Generation (9-Pass System)
- `content_generation_jobs` - Job state, pass status, audit results
- `content_generation_sections` - Per-section content with version history
- `entity_resolution_cache` - Cached Wikidata entity resolutions

### Site Analysis V2
- `site_analysis_projects` - Analysis project configuration
- `site_analysis_pages` - Discovered/crawled pages
- `page_audits` - Audit results per page
- `audit_tasks` - Remediation tasks from audits

### AI & Analytics
- `ai_usage_logs` - Token usage tracking
- `insight_actions` - User actions on AI insights
- `audit_history` - Historical audit snapshots

## RLS (Row Level Security)

All tables have RLS enabled with policies that:
1. Direct ownership: `user_id = auth.uid()`
2. Indirect ownership via joins (e.g., topics → topical_maps → user)

## Adding New Migrations

```bash
# Create a new migration
npx supabase migration new description_here

# Apply migrations locally
npx supabase db push

# Deploy to production
npx supabase db push --linked
```

## Troubleshooting

If migrations fail with "already exists" errors, the table likely exists from a previous run. Use `CREATE TABLE IF NOT EXISTS` or `DROP TABLE IF EXISTS` patterns.

If you need to fix data issues, create a new migration with UPDATE/DELETE statements rather than modifying existing migrations.
