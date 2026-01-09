# Quality Enforcement System - Implementation Plan

## Document Info

- **Created**: 2026-01-09
- **Status**: Approved Design
- **Owner**: Development Team
- **Stakeholders**: Business, Content, QA

---

## 1. Executive Summary

This plan implements a comprehensive quality enforcement system for the content generation pipeline. The system ensures all 113+ content quality rules are actively enforced, visible to users, and trackable across the organization.

### Key Outcomes

1. **Active Enforcement**: Every quality rule is validated algorithmically, not just prompted
2. **Full Visibility**: Users see all rules and their status at every step
3. **User Control**: Two modes - Autonomous (AI decides) and Supervised (user approves)
4. **Conflict Prevention**: Detect and auto-revert when passes undo each other's work
5. **Business Analytics**: Historical compliance tracking across all content

### Scope

- 12 new validators for previously unenforced rules
- 5 new systemic validators (language, pillars, audience, etc.)
- Rule tracking database infrastructure
- Conflict detection and auto-revert system
- Three-view quality dashboard

---

## 2. Current State Analysis

### Coverage Statistics (Before)

| Status | Count | Percentage |
|--------|-------|------------|
| Fully Enforced | 47 | 42% |
| Partially Enforced | 24 | 21% |
| Prompt Only | 28 | 25% |
| Not Implemented | 14 | 12% |
| **Total** | **113** | **100%** |

### Critical Gaps Identified

**Content Rules:**
- C2/C3: EAV placement in first 300/500 words
- G1-G4: Word count validation (article and sections)
- D5: Discourse chaining (S-P-O flow)
- K4/K5: List structure (3-7 items, parallel)
- L2-L5: Table structure validation
- H9: Cross-section repetition

**Systemic Context:**
- S1: Output language verification
- S2: Regional spelling consistency
- S3: Pillar alignment scoring
- S4: Audience readability matching
- S5: Author voice/stylometry

### Pass Conflict Risks

| Earlier Pass | Later Pass | Risk | Frequency |
|--------------|------------|------|-----------|
| Pass 1 (Draft) | Pass 3 (Intro) | HIGH | ~23% of articles |
| Pass 1 (Draft) | Pass 5 (Discourse) | MEDIUM | ~15% of articles |
| Pass 4 (Lists) | Pass 6 (Micro) | MEDIUM | ~12% of articles |

---

## 3. System Architecture

### 3.1 Operational Modes

**Autonomous Mode (Default)**
- AI handles all decisions automatically
- User informed at each step but not required to approve
- Smart retry logic prevents endless loops
- Auto-revert on critical regressions

**Supervised Mode**
- AI pauses after each pass
- User must approve, edit, or revert before continuing
- Full control over every change

### 3.2 AI Decision Logic (Autonomous Mode)

```
After each pass:
│
├─ Critical rules failing?
│   ├─ Yes → Can this pass fix them?
│   │         ├─ Yes → Continue to next pass
│   │         └─ No → Is there a later pass that can?
│   │                  ├─ Yes → Continue, flag for that pass
│   │                  └─ No → Mark as "Requires Manual Fix"
│   └─ No → Continue
│
├─ Regression detected?
│   ├─ Critical regression → Auto-revert change, retry once
│   │                        └─ Still regresses? → Keep best version
│   └─ Non-critical → Log warning, continue
│
├─ Same issue failed 2+ times?
│   └─ Stop retrying, mark as "Needs Attention"
│
└─ Continue to next pass
```

**Loop Prevention Rules:**
1. Maximum 2 retries per rule per pass
2. If Pass N breaks something Pass M fixed, keep Pass M's version
3. After 3 consecutive regressions, pause and notify user

### 3.3 Data Flow

```
[Start Generation]
       │
       ▼
┌──────────────────┐
│ Load Rule Config │ ← 113+ rules from ruleRegistry.ts
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌─────────────────────┐
│ Pass 1: Draft    │────▶│ Snapshot Rules      │
└────────┬─────────┘     │ Hash Content        │
         │               │ Store in DB         │
         ▼               └─────────────────────┘
┌──────────────────┐              │
│ Compare Snapshot │◀─────────────┘
│ Detect Deltas    │
└────────┬─────────┘
         │
    ┌────┴────┐
    │Regression│
    │Detected? │
    └────┬────┘
         │
    Yes ─┴─ No
     │      │
     ▼      ▼
┌─────────┐ ┌──────────┐
│Auto-    │ │Continue  │
│Revert   │ │to Pass 2 │
└─────────┘ └──────────┘
         │
         ▼
    [Repeat for Passes 2-10]
         │
         ▼
┌──────────────────┐
│ Final Report     │
│ Store Analytics  │
└──────────────────┘
```

---

## 4. Phase 1: Critical Validators

### 4.1 New Validators

| # | Validator | File | Rules Covered | Initial Severity |
|---|-----------|------|---------------|------------------|
| 1 | LanguageOutputValidator | `languageOutputValidator.ts` | S1 | ERROR |
| 2 | PillarAlignmentValidator | `pillarAlignmentValidator.ts` | S3 | WARNING |
| 3 | EavPlacementValidator | `eavPlacementValidator.ts` | C2, C3 | WARNING |
| 4 | WordCountValidator | `wordCountValidator.ts` | G1, G2, G3, G4 | WARNING |
| 5 | HeadingContentAlignmentValidator | `headingContentValidator.ts` | F1, E3 | WARNING |
| 6 | DiscourseChainingValidator | `discourseChainingValidator.ts` | D5 | WARNING |
| 7 | ReadabilityValidator | `readabilityValidator.ts` | S4 | WARNING |
| 8 | RegionalSpellingValidator | `regionalSpellingValidator.ts` | S2 | WARNING |
| 9 | ListStructureValidator | `listStructureValidator.ts` | K4, K5 | WARNING |
| 10 | TableStructureValidator | `tableStructureValidator.ts` | L2, L3, L4, L5 | WARNING |
| 11 | CrossSectionRepetitionValidator | `crossSectionRepetitionValidator.ts` | H9 | WARNING |
| 12 | StylometryValidator | `stylometryValidator.ts` | S5 | INFO |

### 4.2 Validator Specifications

#### V1: LanguageOutputValidator (P0 - ERROR)
```typescript
/**
 * Detects if output language matches configured language
 * Uses character set analysis + common word detection
 */
interface LanguageOutputValidatorConfig {
  expectedLanguage: string;      // From businessInfo.language
  expectedRegion?: string;       // From businessInfo.region
  confidenceThreshold: 0.85;     // Minimum confidence for pass
}

// Detection methods:
// 1. Character set analysis (Cyrillic, CJK, Latin, etc.)
// 2. Common word frequency (the, de, der, el, etc.)
// 3. N-gram language models
```

#### V2: PillarAlignmentValidator (P0 - WARNING→ERROR)
```typescript
/**
 * Scores content alignment with 3 SEO pillars
 */
interface PillarAlignmentResult {
  centralEntityScore: number;    // 0-100: Entity prominence
  sourceContextScore: number;    // 0-100: Value prop alignment
  searchIntentScore: number;     // 0-100: Intent satisfaction
  overallScore: number;          // Weighted average
  passing: boolean;              // >= 70% overall
}

// Scoring:
// - Central Entity: Count mentions, check positions
// - Source Context: Semantic similarity to valueProp
// - Search Intent: Match response to intent type
```

#### V3: EavPlacementValidator (P0 - WARNING→ERROR)
```typescript
/**
 * Validates EAV placement by category
 */
interface EavPlacementRules {
  UNIQUE: { maxPosition: 300 };   // Must appear in first 300 words
  ROOT: { maxPosition: 500 };     // Must appear in first 500 words
  RARE: { zone: 'CORE' };         // Must be in core sections
  COMMON: { zone: 'ANY' };        // Can appear anywhere
}
```

#### V4: WordCountValidator (P1 - WARNING→ERROR)
```typescript
/**
 * Validates word counts at article and section level
 */
interface WordCountRules {
  article: {
    target: number;              // From brief.targetWordCount
    tolerance: 0.10;             // ±10%
  };
  sections: {
    introduction: { min: 150, max: 250 };
    core: { min: 200, max: 400 };
    conclusion: { min: 100, max: 200 };
  };
}
```

#### V5: ReadabilityValidator (P1 - WARNING)
```typescript
/**
 * Matches content readability to target audience
 */
interface AudienceReadabilityMap {
  'general': { fleschKincaid: { min: 60, max: 80 }, gradeLevel: { min: 6, max: 8 } };
  'professional': { fleschKincaid: { min: 30, max: 60 }, gradeLevel: { min: 10, max: 14 } };
  'technical': { fleschKincaid: { min: 20, max: 50 }, gradeLevel: { min: 12, max: 16 } };
  'beginner': { fleschKincaid: { min: 70, max: 90 }, gradeLevel: { min: 4, max: 6 } };
}
```

### 4.3 Database Schema

```sql
-- Central rule definitions (seeded, not user-editable)
CREATE TABLE quality_rules (
  id VARCHAR(10) PRIMARY KEY,           -- e.g., "A1", "C2", "S3"
  category VARCHAR(50) NOT NULL,        -- e.g., "Central Entity", "EAV Integration"
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning', -- 'error', 'warning', 'info'
  is_critical BOOLEAN DEFAULT false,
  threshold JSONB,                       -- Rule-specific thresholds
  upgrade_date TIMESTAMPTZ,              -- When WARNING becomes ERROR
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track rule status after each pass
CREATE TABLE content_rule_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
  pass_number INTEGER NOT NULL,
  snapshot_type VARCHAR(20) NOT NULL,   -- 'before' or 'after'
  rules JSONB NOT NULL,                 -- { "A1": { status, value, threshold }, ... }
  content_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snapshots_job_pass ON content_rule_snapshots(job_id, pass_number);

-- Track changes between passes
CREATE TABLE content_pass_deltas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
  pass_number INTEGER NOT NULL,
  rules_fixed TEXT[],                   -- ["A3", "B1"]
  rules_regressed TEXT[],               -- ["A4"]
  rules_unchanged TEXT[],
  auto_reverted BOOLEAN DEFAULT false,
  revert_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Section-level versioning for rollback
CREATE TABLE content_section_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
  section_key VARCHAR(50) NOT NULL,
  pass_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  rule_snapshot JSONB,                  -- Section-specific rule statuses
  is_best_version BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_section_versions ON content_section_versions(job_id, section_key, pass_number);

-- Historical analytics aggregation
CREATE TABLE quality_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  articles_generated INTEGER DEFAULT 0,
  articles_passed_first_time INTEGER DEFAULT 0,
  articles_auto_fixed INTEGER DEFAULT 0,
  articles_manual_intervention INTEGER DEFAULT 0,
  rule_compliance JSONB,                -- { "A1": 0.94, "C2": 0.34, ... }
  conflict_patterns JSONB,              -- [{ passes: [3,1], rule: "A4", frequency: 0.23 }]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```

### 4.4 Severity Upgrade Schedule

| Week | Action |
|------|--------|
| 0 | Deploy all validators as WARNING (S1 as ERROR) |
| 1 | Monitor metrics, gather baseline data |
| 2 | Upgrade P0 validators to ERROR (V2, V3, V4) |
| 3 | Monitor impact, adjust thresholds if needed |
| 4 | Upgrade P1 validators to ERROR (V5, V6, V7, V8, V9, V10, V11) |
| Ongoing | V12 (Stylometry) remains INFO, review quarterly |

---

## 5. Phase 2: Conflict Detection

### 5.1 Snapshot Service

```typescript
// services/ai/contentGeneration/tracking/ruleSnapshotService.ts

interface RuleSnapshot {
  ruleId: string;
  status: 'passing' | 'warning' | 'failing';
  value: number | null;
  threshold: number | null;
  details?: Record<string, unknown>;
}

interface PassSnapshot {
  jobId: string;
  passNumber: number;
  type: 'before' | 'after';
  rules: Record<string, RuleSnapshot>;
  contentHash: string;
  timestamp: Date;
}

class RuleSnapshotService {
  async captureSnapshot(
    jobId: string,
    passNumber: number,
    type: 'before' | 'after',
    content: string,
    context: SectionGenerationContext
  ): Promise<PassSnapshot>;

  async compareSnapshots(
    before: PassSnapshot,
    after: PassSnapshot
  ): Promise<PassDelta>;

  async getBestVersionForSection(
    jobId: string,
    sectionKey: string
  ): Promise<SectionVersion | null>;
}
```

### 5.2 Conflict Detector

```typescript
// services/ai/contentGeneration/tracking/conflictDetector.ts

interface PassDelta {
  passNumber: number;
  fixed: string[];           // Rules that improved
  regressed: string[];       // Rules that got worse
  unchanged: string[];       // Rules with same status
  criticalRegression: boolean;
}

interface ConflictPattern {
  earlierPass: number;
  laterPass: number;
  affectedRule: string;
  frequency: number;         // How often this happens (0-1)
  recommendation: string;
}

class ConflictDetector {
  async detectRegression(delta: PassDelta): Promise<{
    hasCriticalRegression: boolean;
    regressedRules: string[];
    recommendedAction: 'continue' | 'revert' | 'pause';
  }>;

  async identifyConflictPatterns(
    userId: string,
    lookbackDays: number
  ): Promise<ConflictPattern[]>;
}
```

### 5.3 Auto-Revert Logic

```typescript
// In basePass.ts - wrap each pass execution

async function executePassWithTracking(
  pass: ContentPass,
  job: ContentGenerationJob,
  context: ContentGenerationContext
): Promise<PassResult> {
  const snapshotService = new RuleSnapshotService();
  const conflictDetector = new ConflictDetector();

  // Capture before state
  const beforeSnapshot = await snapshotService.captureSnapshot(
    job.id, pass.number, 'before', job.draft_content, context
  );

  // Store section versions before pass
  await snapshotService.storeSectionVersions(job.id, pass.number, 'before');

  // Execute pass
  const result = await pass.execute(job, context);

  // Capture after state
  const afterSnapshot = await snapshotService.captureSnapshot(
    job.id, pass.number, 'after', result.content, context
  );

  // Compare and detect regressions
  const delta = await snapshotService.compareSnapshots(beforeSnapshot, afterSnapshot);
  const regression = await conflictDetector.detectRegression(delta);

  // Handle regression
  if (regression.hasCriticalRegression && context.mode === 'autonomous') {
    // Auto-revert affected sections
    for (const rule of regression.regressedRules) {
      const affectedSections = identifyAffectedSections(rule, delta);
      for (const sectionKey of affectedSections) {
        const bestVersion = await snapshotService.getBestVersionForSection(
          job.id, sectionKey
        );
        if (bestVersion) {
          await revertSection(job.id, sectionKey, bestVersion);
          log.info(`Auto-reverted ${sectionKey} due to ${rule} regression`);
        }
      }
    }

    // Log the revert
    await logPassDelta(job.id, pass.number, {
      ...delta,
      autoReverted: true,
      revertReason: `Critical regression in: ${regression.regressedRules.join(', ')}`
    });
  }

  return result;
}
```

---

## 6. Phase 3: Quality Dashboard

### 6.1 Component Structure

```
components/quality/
├── QualityRulePanel.tsx          # Sidebar showing all 113+ rules
├── RuleStatusIcon.tsx            # ✅ ⚠️ ❌ ○ icons
├── RuleDetailModal.tsx           # Full rule info + history
├── PassInterventionGate.tsx      # Approve/Edit/Revert between passes
├── LiveGenerationMonitor.tsx     # Real-time progress view
├── ArticleQualityReport.tsx      # Post-generation detailed report
├── PortfolioAnalytics.tsx        # Historical analytics dashboard
├── RuleComplianceChart.tsx       # Visual compliance breakdown
├── ConflictPatternAlert.tsx      # Shows detected conflicts
└── index.ts
```

### 6.2 Quality Rule Panel (Always Visible)

```typescript
// components/quality/QualityRulePanel.tsx

interface QualityRulePanelProps {
  jobId?: string;                    // If viewing specific job
  rules: QualityRule[];              // All 113+ rules
  snapshots?: PassSnapshot[];        // Current status per rule
  mode: 'generation' | 'report' | 'reference';
  onRuleClick?: (ruleId: string) => void;
}

// Expandable categories A-Q + S (systemic)
// Each rule shows: ID, name, status icon, value vs threshold
// Click to expand: full description, how enforced, historical compliance
```

### 6.3 Live Generation Monitor

```typescript
// components/quality/LiveGenerationMonitor.tsx

interface LiveGenerationMonitorProps {
  jobId: string;
  mode: 'autonomous' | 'supervised';
  onModeChange: (mode: 'autonomous' | 'supervised') => void;
  onPause: () => void;
  onResume: () => void;
}

// Shows:
// - Current pass progress
// - Rule status summary (X/113 passing)
// - Current pass actions (fixing, working on)
// - Critical rules status bar
// - Real-time delta display
```

### 6.4 Article Quality Report

```typescript
// components/quality/ArticleQualityReport.tsx

interface ArticleQualityReportProps {
  jobId: string;
  onApprove: () => void;
  onRequestFix: (ruleIds: string[]) => void;
  onEdit: () => void;
  onRegenerate: () => void;
}

// Shows:
// - Overall score
// - Category breakdown with visual bars
// - Systemic context checks (language, pillars, audience)
// - Issues requiring attention with actions
// - Pass-by-pass change history
```

### 6.5 Portfolio Analytics

```typescript
// components/quality/PortfolioAnalytics.tsx

interface PortfolioAnalyticsProps {
  userId: string;
  dateRange: { start: Date; end: Date };
}

// Shows:
// - Overall compliance trend
// - Articles generated/passed/fixed/manual
// - Top improvement areas with training links
// - Best performing rules
// - Conflict patterns detected
// - Export capability
```

### 6.6 User Settings Addition

```typescript
// In user settings, add content generation mode preference

interface ContentGenerationSettings {
  mode: 'autonomous' | 'supervised';
  autoUpgradeSeverity: boolean;      // Auto-upgrade WARNING→ERROR
  notifyOnRegression: boolean;       // Email/notification on regression
  pauseOnCriticalFail: boolean;      // Pause even in autonomous mode
}
```

---

## 7. File Changes Summary

### New Files

```
services/ai/contentGeneration/
├── rulesEngine/
│   ├── validators/
│   │   ├── languageOutputValidator.ts
│   │   ├── pillarAlignmentValidator.ts
│   │   ├── eavPlacementValidator.ts
│   │   ├── wordCountValidator.ts
│   │   ├── headingContentValidator.ts
│   │   ├── discourseChainingValidator.ts
│   │   ├── readabilityValidator.ts
│   │   ├── regionalSpellingValidator.ts
│   │   ├── listStructureValidator.ts
│   │   ├── tableStructureValidator.ts
│   │   ├── crossSectionRepetitionValidator.ts
│   │   └── stylometryValidator.ts
│   └── ruleRegistry.ts
├── tracking/
│   ├── ruleSnapshotService.ts
│   ├── passChangeTracker.ts
│   ├── conflictDetector.ts
│   └── analyticsAggregator.ts

components/quality/
├── QualityRulePanel.tsx
├── RuleStatusIcon.tsx
├── RuleDetailModal.tsx
├── PassInterventionGate.tsx
├── LiveGenerationMonitor.tsx
├── ArticleQualityReport.tsx
├── PortfolioAnalytics.tsx
├── RuleComplianceChart.tsx
├── ConflictPatternAlert.tsx
└── index.ts

components/settings/
└── ContentGenerationModeSelector.tsx

supabase/migrations/
├── YYYYMMDD_quality_rules_table.sql
├── YYYYMMDD_rule_snapshots_table.sql
├── YYYYMMDD_pass_deltas_table.sql
├── YYYYMMDD_section_versions_table.sql
└── YYYYMMDD_analytics_daily_table.sql
```

### Modified Files

```
services/ai/contentGeneration/
├── rulesEngine/validators/index.ts    # Add new validators
├── passes/baseSectionPass.ts          # Add snapshot hooks
├── orchestrator.ts                    # Add tracking integration

components/
├── ContentGenerationProgress.tsx      # Add rule panel integration
└── settings/UserSettingsForm.tsx      # Add mode selector

hooks/
└── useContentGeneration.ts            # Add rule status subscription

types.ts                               # Add new interfaces
```

---

## 8. Migration & Rollout

### Week 1: Foundation
- [ ] Create database migrations
- [ ] Implement ruleRegistry.ts with all 113+ rules
- [ ] Build RuleSnapshotService
- [ ] Deploy to staging

### Week 2: Validators (Batch 1)
- [ ] Implement V1-V4 (P0 validators)
- [ ] Integrate into validator chain
- [ ] Add to rule snapshots
- [ ] Test with sample content

### Week 3: Validators (Batch 2)
- [ ] Implement V5-V8 (P1 validators)
- [ ] Implement conflict detector
- [ ] Add auto-revert logic
- [ ] Test regression scenarios

### Week 4: Validators (Batch 3)
- [ ] Implement V9-V12 (P2 validators)
- [ ] Build QualityRulePanel component
- [ ] Build LiveGenerationMonitor
- [ ] Integration testing

### Week 5: Dashboard
- [ ] Build ArticleQualityReport
- [ ] Build PortfolioAnalytics
- [ ] Build PassInterventionGate
- [ ] Add mode selector to settings

### Week 6: Polish & Deploy
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Production deployment
- [ ] Begin severity upgrade schedule

---

## 9. Success Metrics

### Target Coverage (After Implementation)

| Status | Before | After | Change |
|--------|--------|-------|--------|
| Fully Enforced | 42% | 85% | +43% |
| Partially Enforced | 21% | 10% | -11% |
| Prompt Only | 25% | 5% | -20% |
| Not Implemented | 12% | 0% | -12% |

### Quality Metrics

| Metric | Current | Target |
|--------|---------|--------|
| First-time pass rate | ~50% | 75% |
| Auto-fix success rate | N/A | 80% |
| Manual intervention rate | ~30% | <10% |
| Regression detection | 0% | 95% |
| Avg. quality score | ~70 | 85+ |

### Business Metrics

| Metric | Target |
|--------|--------|
| Content production velocity | No decrease |
| User satisfaction with quality | +20% |
| Time spent on manual fixes | -50% |
| Quality-related support tickets | -40% |

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Too strict = blocks content | HIGH | Start as WARNING, monitor before ERROR |
| Performance degradation | MEDIUM | Optimize validators, cache snapshots |
| False positives | MEDIUM | Tune thresholds based on data |
| User overwhelm | LOW | Clean UI, sensible defaults |
| Endless loops | HIGH | Max 2 retries, pause after 3 regressions |

---

## Appendix A: Complete Rule Reference

See `docs/plans/content-quality-rules-complete-inventory.md` for the full 113+ rule inventory with enforcement status.

---

## Appendix B: API Contracts

### Rule Status Subscription

```typescript
// Real-time rule status updates via Supabase Realtime
interface RuleStatusUpdate {
  jobId: string;
  passNumber: number;
  ruleId: string;
  previousStatus: 'passing' | 'warning' | 'failing';
  newStatus: 'passing' | 'warning' | 'failing';
  value: number | null;
  timestamp: Date;
}
```

### Quality Report API

```typescript
// GET /api/quality/report/:jobId
interface QualityReportResponse {
  jobId: string;
  overallScore: number;
  categories: CategoryScore[];
  systemicChecks: SystemicCheck[];
  issues: QualityIssue[];
  passHistory: PassSummary[];
  recommendations: string[];
}
```

---

*Document Version: 1.0*
*Approved: 2026-01-09*
