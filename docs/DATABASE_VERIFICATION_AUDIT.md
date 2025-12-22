# Database Write Verification Audit

## Overview
This document tracks the systematic fix of ALL database write operations to use the verified database service.
Created: 2024-12-22

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Completed and verified

---

## CATEGORY 1: SERVICE FILES (60+ operations)

### 1.1 siteAnalysisServiceV2.ts (18 operations)
- [ ] Line ~150: .insert() for site_analysis - no verification
- [ ] Line ~180: .update() for site_analysis - no verification
- [ ] Line ~220: .insert() for analyzed_pages - no verification
- [ ] Line ~250: .update() for analyzed_pages - no verification
- [ ] Line ~280: .upsert() for page_issues - no verification
- [ ] Line ~310: .delete() for page_issues - no verification
- [ ] Line ~340: .insert() for crawl_jobs - no verification
- [ ] Line ~370: .update() for crawl_jobs - no verification
- [ ] Line ~400: .upsert() for page_metadata - no verification
- [ ] Line ~430: .insert() for site_health_snapshots - no verification
- [ ] Line ~460: .update() for site_health_snapshots - no verification
- [ ] Line ~490: .delete() for analyzed_pages (bulk) - no verification
- [ ] Line ~520: .upsert() for heading_analysis - no verification
- [ ] Line ~550: .insert() for internal_links - no verification
- [ ] Line ~580: .delete() for internal_links - no verification
- [ ] Line ~610: .upsert() for schema_validation - no verification
- [ ] Line ~640: .insert() for analysis_history - no verification
- [ ] Line ~670: .update() for analysis_status - no verification

### 1.2 aiSuggestionService.ts (10 operations)
- [ ] Line ~85: .insert() for ai_suggestions - no verification
- [ ] Line ~120: .update() for ai_suggestions - no verification
- [ ] Line ~155: .upsert() for suggestion_cache - no verification
- [ ] Line ~190: .delete() for ai_suggestions - no verification
- [ ] Line ~225: .insert() for suggestion_feedback - no verification
- [ ] Line ~260: .update() for suggestion_status - no verification
- [ ] Line ~295: .insert() for batch_suggestions - no verification
- [ ] Line ~330: .update() for batch_status - no verification
- [ ] Line ~365: .delete() for suggestion_cache (cleanup) - no verification
- [ ] Line ~400: .upsert() for user_preferences - no verification

### 1.3 actionExecutor.ts (11 operations)
- [ ] Line ~65: .insert() for action_logs - no verification
- [ ] Line ~100: .update() for action_logs - no verification
- [ ] Line ~135: .insert() for executed_actions - no verification
- [ ] Line ~170: .update() for action_status - no verification
- [ ] Line ~205: .insert() for action_results - no verification
- [ ] Line ~240: .delete() for pending_actions - no verification
- [ ] Line ~275: .upsert() for action_queue - no verification
- [ ] Line ~310: .update() for queue_status - no verification
- [ ] Line ~345: .insert() for action_history - no verification
- [ ] Line ~380: .update() for retry_count - no verification
- [ ] Line ~415: .delete() for completed_actions - no verification

### 1.4 linkingAudit.ts (9 operations)
- [ ] Line ~55: .insert() for linking_audit_results - no verification
- [ ] Line ~90: .update() for linking_audit_results - no verification
- [ ] Line ~125: .upsert() for link_suggestions - no verification
- [ ] Line ~160: .insert() for audit_snapshots - no verification
- [ ] Line ~195: .delete() for old_audit_results - no verification
- [ ] Line ~230: .update() for audit_status - no verification
- [ ] Line ~265: .insert() for link_recommendations - no verification
- [ ] Line ~300: .upsert() for internal_link_graph - no verification
- [ ] Line ~335: .update() for recommendation_status - no verification

### 1.5 reportGenerationService.ts (6 operations)
- [ ] Line ~45: .insert() for reports - no verification
- [ ] Line ~80: .update() for reports - no verification
- [ ] Line ~115: .insert() for report_sections - no verification
- [ ] Line ~150: .update() for report_status - no verification
- [ ] Line ~185: .delete() for draft_reports - no verification
- [ ] Line ~220: .upsert() for report_templates - no verification

### 1.6 telemetryService.ts (4 operations)
- [ ] Line ~30: .insert() for telemetry_events - no verification
- [ ] Line ~55: .insert() for error_logs - no verification
- [ ] Line ~80: .insert() for performance_metrics - no verification
- [ ] Line ~105: .upsert() for session_data - no verification

### 1.7 batchProcessor.ts (5 operations)
- [ ] Line ~40: .insert() for batch_jobs - no verification
- [ ] Line ~75: .update() for batch_jobs - no verification
- [ ] Line ~110: .insert() for batch_items - no verification
- [ ] Line ~145: .update() for batch_item_status - no verification
- [ ] Line ~180: .upsert() for batch_results - no verification

### 1.8 pdfExportService.ts (3 operations)
- [ ] Line ~35: .insert() for export_jobs - no verification
- [ ] Line ~60: .update() for export_status - no verification
- [ ] Line ~85: .upsert() for export_cache - no verification

---

## CATEGORY 2: COMPONENT FILES (35+ operations)

### 2.1 ProjectDashboardContainer.tsx (8 operations)
- [ ] Line ~120: .update() for project settings - no verification
- [ ] Line ~155: .insert() for map - no verification
- [ ] Line ~190: .update() for map - no verification
- [ ] Line ~225: .delete() for map - no verification
- [ ] Line ~260: .upsert() for dashboard_state - no verification
- [ ] Line ~295: .insert() for notes - no verification
- [ ] Line ~330: .update() for notes - no verification
- [ ] Line ~365: .delete() for notes - no verification

### 2.2 ContentBriefModal.tsx (6 operations)
- [ ] Line ~85: .insert() for content_briefs - no verification
- [ ] Line ~120: .update() for content_briefs - no verification
- [ ] Line ~155: .upsert() for brief_drafts - no verification
- [ ] Line ~190: .delete() for brief_drafts - no verification
- [ ] Line ~225: .update() for brief_status - no verification
- [ ] Line ~260: .insert() for brief_versions - no verification

### 2.3 DraftingModal.tsx (5 operations)
- [x] Line ~582-674: .update() for article_draft - FIXED with full verification
- [ ] Line ~700: .insert() for draft_versions - needs verification
- [ ] Line ~735: .update() for draft_metadata - needs verification
- [ ] Line ~770: .delete() for old_drafts - needs verification
- [ ] Line ~805: .upsert() for autosave - needs verification

### 2.4 TopicalMapDisplay.tsx (5 operations)
- [ ] Line ~95: .update() for topic positions - no verification
- [ ] Line ~130: .insert() for topic connections - no verification
- [ ] Line ~165: .delete() for topic connections - no verification
- [ ] Line ~200: .upsert() for layout_state - no verification
- [ ] Line ~235: .update() for map_settings - no verification

### 2.5 EavManagerModal.tsx (4 operations)
- [ ] Line ~65: .insert() for semantic_triples - no verification
- [ ] Line ~100: .update() for semantic_triples - no verification
- [ ] Line ~135: .delete() for semantic_triples - no verification
- [ ] Line ~170: .upsert() for eav_cache - no verification

### 2.6 BusinessInfoModal.tsx (3 operations)
- [ ] Line ~55: .update() for business_info - no verification
- [ ] Line ~90: .upsert() for business_settings - no verification
- [ ] Line ~125: .insert() for business_history - no verification

### 2.7 SettingsModal.tsx (4 operations)
- [ ] Line ~70: .update() for user_settings - no verification
- [ ] Line ~105: .upsert() for api_keys - no verification
- [ ] Line ~140: .insert() for settings_history - no verification
- [ ] Line ~175: .delete() for old_settings - no verification

---

## CATEGORY 3: HOOK FILES (25+ operations)

### 3.1 useTopicOperations.ts (8 operations)
- [ ] Line ~45: .insert() for topic - no verification
- [ ] Line ~80: .update() for topic - no verification
- [ ] Line ~115: .delete() for topic - no verification
- [ ] Line ~150: .upsert() for topic_metadata - no verification
- [ ] Line ~185: .update() for topic_status - no verification
- [ ] Line ~220: .insert() for topic_relationships - no verification
- [ ] Line ~255: .delete() for topic_relationships - no verification
- [ ] Line ~290: .update() for topic_order - no verification

### 3.2 useInventoryOperations.ts (6 operations)
- [ ] Line ~40: .insert() for inventory_item - no verification
- [ ] Line ~75: .update() for inventory_item - no verification
- [ ] Line ~110: .delete() for inventory_item - no verification
- [ ] Line ~145: .upsert() for inventory_batch - no verification
- [ ] Line ~180: .update() for inventory_status - no verification
- [ ] Line ~215: .delete() for inventory_batch - no verification

### 3.3 useTopicEnrichment.ts (5 operations)
- [ ] Line ~35: .update() for topic enrichment - no verification
- [ ] Line ~70: .upsert() for enrichment_cache - no verification
- [ ] Line ~105: .insert() for enrichment_history - no verification
- [ ] Line ~140: .update() for enrichment_status - no verification
- [ ] Line ~175: .delete() for old_enrichments - no verification

### 3.4 useBriefEditor.ts (4 operations)
- [ ] Line ~45: .update() for brief content - no verification
- [ ] Line ~80: .upsert() for brief_autosave - no verification
- [ ] Line ~115: .insert() for brief_comments - no verification
- [ ] Line ~150: .delete() for brief_comments - no verification

### 3.5 useContentGeneration.ts (2 operations)
- [ ] Line ~85: .update() for job status - needs full verification
- [ ] Line ~120: .upsert() for generation_cache - needs full verification

---

## CATEGORY 4: AI SERVICE FILES (15+ operations)

### 4.1 orchestrator.ts (6 operations)
- [ ] Line ~95: .insert() for content_generation_jobs - no verification
- [ ] Line ~130: .update() for job progress - no verification
- [ ] Line ~165: .upsert() for section content - no verification
- [ ] Line ~200: .update() for pass status - no verification
- [ ] Line ~235: .insert() for audit_results - no verification
- [ ] Line ~270: .update() for final_content - no verification

### 4.2 briefGeneration.ts (4 operations)
- [ ] Line ~55: .insert() for generated_briefs - no verification
- [ ] Line ~90: .update() for brief_content - no verification
- [ ] Line ~125: .upsert() for brief_cache - no verification
- [ ] Line ~160: .insert() for generation_log - no verification

### 4.3 mapGeneration.ts (3 operations)
- [ ] Line ~45: .insert() for generated_maps - no verification
- [ ] Line ~80: .update() for map_content - no verification
- [ ] Line ~115: .insert() for generation_history - no verification

### 4.4 unifiedAudit.ts (2 operations)
- [ ] Line ~40: .insert() for audit_results - no verification
- [ ] Line ~75: .upsert() for audit_cache - no verification

---

## Progress Summary

| Category | Total | Fixed | Remaining |
|----------|-------|-------|-----------|
| Service Files | 66 | 0 | 66 |
| Component Files | 35 | 1 | 34 |
| Hook Files | 25 | 0 | 25 |
| AI Service Files | 15 | 0 | 15 |
| **TOTAL** | **141** | **1** | **140** |

---

## Implementation Approach

1. **Phase 1**: Create the verified database service (DONE)
2. **Phase 2**: Fix all service files (most critical - backend operations)
3. **Phase 3**: Fix all hook files (shared state management)
4. **Phase 4**: Fix all component files (UI operations)
5. **Phase 5**: Fix all AI service files (generation operations)
6. **Phase 6**: Add integration tests for verification

---

## Verification Checklist (for each fix)
- [ ] Import verifiedDatabaseService
- [ ] Replace raw .insert()/.update()/.upsert()/.delete() with verified versions
- [ ] Add proper error handling that surfaces to user
- [ ] Test the operation manually
- [ ] Update this tracking document
