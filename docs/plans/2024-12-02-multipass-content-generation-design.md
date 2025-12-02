# Multi-Pass Content Generation System Design

**Date:** 2024-12-02
**Status:** Approved for Implementation
**Author:** Claude Code / User Collaboration

---

## 1. Executive Summary

This document describes the design for a **multi-pass, resumable content generation system** that implements all SEO rules from the research documents. The system generates high-quality, algorithmically-optimized content through 8 sequential passes, with each section persisted to the database for reliability and resume capability.

### Key Goals
1. **Reliability**: Survives browser close, network issues, timeouts
2. **Comprehensibility**: User sees exactly what's happening at each step
3. **Quality**: Applies 25+ SEO rules from research documents
4. **Resume Capability**: Pick up exactly where interrupted

### Problem Solved
- Current implementation times out (504 Gateway Timeout) on long content
- Single-shot generation misses many optimization rules
- User has no visibility into generation progress
- No way to resume interrupted generation

---

## 2. Architecture Overview

### 2.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Content Generation Flow                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Content Brief ──► Create Job ──► Pass 1: Draft (section by section)
│                         │              │
│                         ▼              ▼
│                    [DB: Job]     [DB: Sections]
│                         │              │
│                         ▼              ▼
│                    Pass 2: Headers ──► Pass 3: Lists/Tables
│                         │                    │
│                         ▼                    ▼
│                    Pass 4: Visuals ──► Pass 5: Micro Semantics
│                         │                    │
│                         ▼                    ▼
│                    Pass 6: Discourse ──► Pass 7: Introduction
│                         │                    │
│                         ▼                    ▼
│                    Pass 8: Final Audit ──► Complete Draft
│                                                  │
│                                                  ▼
│                                          [DB: content_briefs.articleDraft]
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  ContentGenerationProgress.tsx  │  useContentGeneration.ts      │
│  - Shows pass/section progress  │  - Orchestrates generation    │
│  - Pause/Resume/Cancel buttons  │  - Subscribes to Realtime     │
│  - Section-by-section display   │  - Handles retry logic        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Services Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  contentGenerationOrchestrator.ts                                │
│  - Manages job lifecycle                                         │
│  - Calls individual pass services                                │
│  - Persists progress to DB                                       │
├─────────────────────────────────────────────────────────────────┤
│  passes/                                                         │
│  ├── pass1DraftGeneration.ts    (section-by-section)            │
│  ├── pass2HeaderOptimization.ts                                  │
│  ├── pass3ListTableOptimization.ts                              │
│  ├── pass4VisualSemantics.ts                                    │
│  ├── pass5MicroSemantics.ts     (NEW - major)                   │
│  ├── pass6DiscourseIntegration.ts                               │
│  ├── pass7IntroductionSynthesis.ts                              │
│  └── pass8FinalAudit.ts                                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (Supabase)                         │
├─────────────────────────────────────────────────────────────────┤
│  content_generation_jobs      │  content_generation_sections    │
│  - Job status & progress      │  - Individual section content   │
│  - Current pass tracking      │  - Version history per pass     │
│  - Error logging              │  - Audit scores per section     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### 3.1 Table: `content_generation_jobs`

Tracks the overall generation process for a content brief.

```sql
CREATE TABLE public.content_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.content_briefs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  map_id UUID NOT NULL REFERENCES public.topical_maps(id),

  -- Job Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'paused', 'completed', 'failed', 'cancelled')),

  -- Multi-pass tracking
  current_pass INTEGER NOT NULL DEFAULT 1 CHECK (current_pass >= 1 AND current_pass <= 8),
  passes_status JSONB NOT NULL DEFAULT '{
    "pass_1_draft": "pending",
    "pass_2_headers": "pending",
    "pass_3_lists": "pending",
    "pass_4_visuals": "pending",
    "pass_5_microsemantics": "pending",
    "pass_6_discourse": "pending",
    "pass_7_intro": "pending",
    "pass_8_audit": "pending"
  }',

  -- Section tracking for Pass 1
  total_sections INTEGER,
  completed_sections INTEGER DEFAULT 0,
  current_section_key TEXT,

  -- Content accumulation
  draft_content TEXT,

  -- Audit results
  final_audit_score NUMERIC(5,2),
  audit_details JSONB,

  -- Error handling
  last_error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(brief_id) -- Only one active job per brief
);

-- RLS Policies
ALTER TABLE public.content_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON public.content_generation_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs"
  ON public.content_generation_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON public.content_generation_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs"
  ON public.content_generation_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_content_generation_jobs_brief_id ON public.content_generation_jobs(brief_id);
CREATE INDEX idx_content_generation_jobs_user_id ON public.content_generation_jobs(user_id);
CREATE INDEX idx_content_generation_jobs_status ON public.content_generation_jobs(status);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_generation_jobs;
```

### 3.2 Table: `content_generation_sections`

Stores individual section results with version history.

```sql
CREATE TABLE public.content_generation_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.content_generation_jobs(id) ON DELETE CASCADE,

  -- Section identification
  section_key TEXT NOT NULL,  -- 'intro', 'section_1', 'conclusion', etc.
  section_heading TEXT,       -- The H2/H3 heading text
  section_order INTEGER NOT NULL,
  section_level INTEGER DEFAULT 2, -- H2=2, H3=3

  -- Content versions (one per pass)
  pass_1_content TEXT,  -- Initial draft
  pass_2_content TEXT,  -- After header optimization
  pass_3_content TEXT,  -- After list/table optimization
  pass_4_content TEXT,  -- After visual semantics
  pass_5_content TEXT,  -- After micro semantics
  pass_6_content TEXT,  -- After discourse integration
  pass_7_content TEXT,  -- After intro synthesis (only for intro section)
  pass_8_content TEXT,  -- Final polished version

  -- Current version pointer
  current_content TEXT,
  current_pass INTEGER DEFAULT 1,

  -- Per-section audit scores
  audit_scores JSONB DEFAULT '{}',
  -- Example: {"modality": 95, "density": 88, "positioning": 100}

  -- Status
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(job_id, section_key)
);

-- RLS (inherits from job ownership)
ALTER TABLE public.content_generation_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sections"
  ON public.content_generation_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.content_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own sections"
  ON public.content_generation_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.content_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_content_generation_sections_job_id ON public.content_generation_sections(job_id);
CREATE INDEX idx_content_generation_sections_order ON public.content_generation_sections(job_id, section_order);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_generation_sections;
```

---

## 4. The 8-Pass Workflow

### 4.1 Pass Overview

| Pass | Name | Duration | AI Calls | Key Rules Applied |
|------|------|----------|----------|-------------------|
| 1 | Draft Generation | ~30-60s | N (per section) | Central Entity, Basic Structure |
| 2 | Header Optimization | ~10-15s | 1 | H1→H2→H3 flow, Contextual overlap |
| 3 | Lists & Tables | ~10-15s | 1 | Ordered vs Unordered, Count specificity |
| 4 | Visual Semantics | ~10-15s | 1 | Alt tag vocabulary, Context bridging |
| 5 | Micro Semantics | ~15-20s | 1-2 | Modality, Density, Subject positioning |
| 6 | Discourse Integration | ~10-15s | 1 | Anchors, Bridges, Annotation text |
| 7 | Introduction Synthesis | ~10-15s | 1 | Centerpiece annotation, Summary alignment |
| 8 | Final Audit | ~15-20s | 1 + algorithmic | All 25+ rule checks, Score calculation |

**Total estimated time:** 2-4 minutes (vs 5+ minutes single-shot with timeout risk)

### 4.2 Pass 1: Draft Generation (Section-by-Section)

This is the only pass that generates content section-by-section:

```typescript
interface Pass1Config {
  sections: SectionDefinition[];
  maxTokensPerSection: number;  // ~800-1200
  retryAttempts: number;        // 3
}

interface SectionDefinition {
  key: string;           // 'intro', 'section_1', etc.
  heading: string;       // The H2/H3 text
  level: number;         // 2 or 3
  order: number;
  subordinateTextHint: string;  // From brief
  methodologyNote: string;       // From brief
}

async function executePass1(job: Job, brief: ContentBrief): Promise<void> {
  // 1. Parse sections from brief.structured_outline
  const sections = parseSectionsFromBrief(brief);

  // 2. Update job with section count
  await updateJob(job.id, {
    total_sections: sections.length,
    status: 'in_progress',
    started_at: new Date()
  });

  // 3. Generate each section
  for (const section of sections) {
    // Check for pause/cancel
    const currentJob = await getJob(job.id);
    if (currentJob.status === 'paused' || currentJob.status === 'cancelled') {
      return;
    }

    // Update current section
    await updateJob(job.id, { current_section_key: section.key });

    // Generate with retry
    const content = await generateSectionWithRetry(section, brief, job);

    // Save to sections table
    await upsertSection({
      job_id: job.id,
      section_key: section.key,
      section_heading: section.heading,
      section_order: section.order,
      section_level: section.level,
      pass_1_content: content,
      current_content: content,
      status: 'completed'
    });

    // Update progress
    await updateJob(job.id, {
      completed_sections: job.completed_sections + 1
    });

    // Log for UI
    dispatch({ type: 'LOG_EVENT', payload: {
      service: 'Content Generation',
      message: `Completed section ${section.order}/${sections.length}: ${section.heading}`,
      status: 'success'
    }});
  }

  // 4. Assemble full draft
  const fullDraft = await assembleDraft(job.id);

  // 5. Mark pass complete
  await updateJob(job.id, {
    draft_content: fullDraft,
    passes_status: { ...job.passes_status, pass_1_draft: 'completed' },
    current_pass: 2
  });
}
```

### 4.3 Pass 2: Header Optimization

```typescript
async function executePass2(job: Job): Promise<void> {
  const draft = job.draft_content;

  // Rules to check and fix:
  // 1. H1 contains Central Entity + Main Attribute
  // 2. H2s follow logical order (Definition → Types → Benefits → How-to → Risks)
  // 3. H3s are proper sub-attributes of parent H2
  // 4. No heading level skips (H2 to H4)
  // 5. Each heading has contextual overlap with H1

  const optimizedDraft = await callAI({
    prompt: PASS_2_HEADER_OPTIMIZATION_PROMPT,
    content: draft,
    brief: job.brief
  });

  // Update all sections with pass_2_content
  await updateSectionsWithNewContent(job.id, optimizedDraft, 2);

  await updateJob(job.id, {
    draft_content: optimizedDraft,
    passes_status: { ...job.passes_status, pass_2_headers: 'completed' },
    current_pass: 3
  });
}
```

### 4.4 Pass 3: Lists & Tables Optimization

```typescript
async function executePass3(job: Job): Promise<void> {
  // Rules:
  // 1. Ordered lists (<ol>) ONLY for rankings, steps, superlatives
  // 2. Unordered lists (<ul>) for types, examples, components
  // 3. Each list preceded by definitive intro with exact count
  // 4. Tables: columns = attributes, rows = entities
  // 5. Table cells contain single facts

  const optimizedDraft = await callAI({
    prompt: PASS_3_LIST_TABLE_PROMPT,
    content: job.draft_content
  });

  await updateJob(job.id, {
    draft_content: optimizedDraft,
    passes_status: { ...job.passes_status, pass_3_lists: 'completed' },
    current_pass: 4
  });
}
```

### 4.5 Pass 4: Visual Semantics

```typescript
async function executePass4(job: Job, brief: ContentBrief): Promise<void> {
  // Rules:
  // 1. Alt tags extend topicality with NEW vocabulary (not repeat H1)
  // 2. Alt tags serve as context bridges between image and text
  // 3. No images between heading and subordinate text
  // 4. Each image has textual qualification (sentence referencing it)
  // 5. Generate [IMAGE: ...] placeholders with proper specifications

  const visualSpecs = await callAI({
    prompt: PASS_4_VISUAL_SEMANTICS_PROMPT,
    content: job.draft_content,
    existingVisuals: brief.visual_semantics
  });

  // Insert visual placeholders into draft
  const draftWithVisuals = insertVisualPlaceholders(job.draft_content, visualSpecs);

  await updateJob(job.id, {
    draft_content: draftWithVisuals,
    passes_status: { ...job.passes_status, pass_4_visuals: 'completed' },
    current_pass: 5
  });
}
```

### 4.6 Pass 5: Micro Semantics (Major Pass)

```typescript
async function executePass5(job: Job, brief: ContentBrief): Promise<void> {
  // This is the most comprehensive linguistic optimization pass

  // 5.1 Modality Certainty
  // - Replace "can be", "might be" with "is", "are" for facts
  // - Keep uncertainty only for genuinely uncertain claims

  // 5.2 Stop Word Removal
  // - Remove: "also", "basically", "very", "maybe", "actually", "really"
  // - Especially strict in first 2 paragraphs

  // 5.3 Subject Positioning
  // - Central Entity must be grammatical SUBJECT, not object
  // - Bad: "Financial advisors help you achieve X"
  // - Good: "X relies on sufficient savings"

  // 5.4 Definition Structure
  // - Definitions must use "Is-A" hypernymy
  // - Pattern: "[Entity] is a [Category] that [Function]"

  // 5.5 Information Density
  // - Every sentence must add new fact
  // - No entity repetition without new attribute

  // 5.6 Reference Principle
  // - Links never at start of sentence
  // - Make declaration first, then cite

  // 5.7 Negative Constraints
  // - Add "is not" clarifications for disambiguation

  const optimizedDraft = await callAI({
    prompt: PASS_5_MICRO_SEMANTICS_PROMPT,
    content: job.draft_content,
    centralEntity: brief.centralEntity,
    rules: MICRO_SEMANTICS_RULES
  });

  await updateJob(job.id, {
    draft_content: optimizedDraft,
    passes_status: { ...job.passes_status, pass_5_microsemantics: 'completed' },
    current_pass: 6
  });
}
```

### 4.7 Pass 6: Discourse Integration

```typescript
async function executePass6(job: Job, brief: ContentBrief): Promise<void> {
  // Rules:
  // 1. Use discourse_anchors from brief at paragraph transitions
  // 2. End of paragraph A hooks into start of paragraph B
  // 3. Contextual bridges between sub-topics
  // 4. Annotation text for internal links provides micro-context

  const optimizedDraft = await callAI({
    prompt: PASS_6_DISCOURSE_PROMPT,
    content: job.draft_content,
    discourseAnchors: brief.discourse_anchors,
    contextualBridge: brief.contextualBridge
  });

  await updateJob(job.id, {
    draft_content: optimizedDraft,
    passes_status: { ...job.passes_status, pass_6_discourse: 'completed' },
    current_pass: 7
  });
}
```

### 4.8 Pass 7: Introduction Synthesis

```typescript
async function executePass7(job: Job, brief: ContentBrief): Promise<void> {
  // Rules:
  // 1. Introduction is rewritten AFTER full content exists
  // 2. Must synthesize all H2/H3 topics in same order as content
  // 3. Centerpiece Annotation: core answer in first 400 characters
  // 4. Key terms from all sections must appear
  // 5. Featured snippet target addressed immediately

  const newIntro = await callAI({
    prompt: PASS_7_INTRO_SYNTHESIS_PROMPT,
    fullContent: job.draft_content,
    featuredSnippetTarget: brief.featured_snippet_target,
    keyTakeaways: brief.keyTakeaways
  });

  // Replace introduction section
  const draftWithNewIntro = replaceIntroduction(job.draft_content, newIntro);

  await updateJob(job.id, {
    draft_content: draftWithNewIntro,
    passes_status: { ...job.passes_status, pass_7_intro: 'completed' },
    current_pass: 8
  });
}
```

### 4.9 Pass 8: Final Audit & Score

```typescript
async function executePass8(job: Job, brief: ContentBrief): Promise<void> {
  const draft = job.draft_content;

  // Run all algorithmic checks
  const algorithmicResults: AuditRuleResult[] = [
    // Existing checks
    checkSubjectivity(draft),
    checkPronounDensity(draft, brief.title),
    checkLinkPositioning(draft),
    checkFirstSentencePrecision(draft),
    checkQuestionProtection(draft),
    checkListLogic(draft),
    checkSentenceDensity(draft),

    // New Header H Rules
    checkHeadingHierarchy(draft),
    checkHeadingContextualOverlap(draft, brief.centralEntity),

    // New List/Table Rules
    checkListSemanticType(draft),
    checkListCountSpecificity(draft),

    // New Visual Rules
    checkImageAltTagVocabulary(draft, brief.title),
    checkImagePlacement(draft),

    // New Micro Semantics Rules
    checkModality(draft),
    checkStopWords(draft),
    checkSubjectPositioning(draft, brief.centralEntity),
    checkDefinitionStructure(draft),
    checkInformationDensity(draft, brief.centralEntity),
    checkReferencePositioning(draft),

    // New Discourse Rules
    checkDiscourseAnchors(draft, brief.discourse_anchors),
    checkAnnotationText(draft),

    // Centerpiece Annotation
    checkCenterpieceAnnotation(draft, brief)
  ];

  // Run AI-based semantic audit
  const aiAuditResult = await callAI({
    prompt: PASS_8_FINAL_AUDIT_PROMPT,
    content: draft,
    brief: brief
  });

  // Calculate final score
  const passingRules = algorithmicResults.filter(r => r.isPassing).length;
  const totalRules = algorithmicResults.length;
  const algorithmicScore = (passingRules / totalRules) * 100;

  const finalScore = (algorithmicScore * 0.6) + (aiAuditResult.semanticScore * 0.4);

  // Save audit results
  await updateJob(job.id, {
    draft_content: draft,
    final_audit_score: finalScore,
    audit_details: {
      algorithmicResults,
      aiAuditResult,
      passingRules,
      totalRules,
      timestamp: new Date()
    },
    passes_status: { ...job.passes_status, pass_8_audit: 'completed' },
    status: 'completed',
    completed_at: new Date()
  });

  // Copy final draft to content_briefs.articleDraft
  await updateContentBrief(job.brief_id, {
    articleDraft: draft,
    auditScore: finalScore
  });
}
```

---

## 5. Error Handling & Resume Logic

### 5.1 Retry Strategy

```typescript
const generateSectionWithRetry = async (
  section: SectionDefinition,
  brief: ContentBrief,
  job: Job,
  maxRetries = 3
): Promise<string> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const content = await generateSection(section, brief);
      return content;
    } catch (error) {
      // Log attempt
      dispatch({ type: 'LOG_EVENT', payload: {
        service: 'Content Generation',
        message: `Retry ${attempt}/${maxRetries} for section: ${section.heading}`,
        status: 'warning'
      }});

      if (attempt === maxRetries) {
        // Update job with error
        await updateJob(job.id, {
          last_error: error.message,
          status: 'failed'
        });
        throw error;
      }

      // Exponential backoff
      await delay(1000 * Math.pow(2, attempt - 1));
    }
  }
  throw new Error('Max retries exceeded');
};
```

### 5.2 Resume Flow

```typescript
// On ContentBriefModal open, check for incomplete jobs
const checkAndResumeJob = async (briefId: string) => {
  const { data: existingJob } = await supabase
    .from('content_generation_jobs')
    .select('*')
    .eq('brief_id', briefId)
    .in('status', ['in_progress', 'paused', 'failed'])
    .single();

  if (existingJob) {
    const progress = calculateProgress(existingJob);

    const shouldResume = await showResumeModal({
      message: `Found incomplete draft (${progress}% complete, Pass ${existingJob.current_pass}/8). Resume?`,
      options: ['Resume', 'Start Fresh', 'Cancel']
    });

    if (shouldResume === 'Resume') {
      return resumeGeneration(existingJob);
    } else if (shouldResume === 'Start Fresh') {
      await deleteJob(existingJob.id);
      return startNewGeneration(briefId);
    }
  }

  return startNewGeneration(briefId);
};

const resumeGeneration = async (job: Job) => {
  // Update status
  await updateJob(job.id, { status: 'in_progress' });

  // Determine where to resume
  const passStatuses = job.passes_status;

  for (let pass = 1; pass <= 8; pass++) {
    const passKey = `pass_${pass}_*`;
    const status = Object.entries(passStatuses)
      .find(([k]) => k.startsWith(`pass_${pass}_`))?.[1];

    if (status !== 'completed') {
      // Resume from this pass
      await executePass(pass, job);
    }
  }
};
```

### 5.3 Pause/Cancel

```typescript
const pauseGeneration = async (jobId: string) => {
  await updateJob(jobId, { status: 'paused' });
  // The pass loop checks status and exits gracefully
};

const cancelGeneration = async (jobId: string) => {
  await updateJob(jobId, { status: 'cancelled' });
  // Optionally delete job and sections
};
```

---

## 6. Frontend Components

### 6.1 ContentGenerationProgress Component

```tsx
interface ContentGenerationProgressProps {
  job: ContentGenerationJob;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

const ContentGenerationProgress: React.FC<ContentGenerationProgressProps> = ({
  job, onPause, onResume, onCancel
}) => {
  const progress = calculateProgress(job);
  const currentPassName = PASS_NAMES[job.current_pass];

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">
        Generating Article Draft
      </h3>

      {/* Overall Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Pass {job.current_pass} of 8: {currentPassName}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Pass 1 Section Progress */}
      {job.current_pass === 1 && (
        <div className="space-y-2 mb-4">
          {job.sections?.map((section, i) => (
            <div key={section.key} className="flex items-center gap-2 text-sm">
              {section.status === 'completed' ? (
                <CheckIcon className="w-4 h-4 text-green-400" />
              ) : section.key === job.current_section_key ? (
                <Loader className="w-4 h-4 text-blue-400 animate-spin" />
              ) : (
                <CircleIcon className="w-4 h-4 text-gray-500" />
              )}
              <span className={section.status === 'completed' ? 'text-gray-400' : ''}>
                {section.heading}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pass List */}
      <div className="space-y-1 mb-4">
        {Object.entries(PASS_NAMES).map(([num, name]) => {
          const passNum = parseInt(num);
          const status = getPassStatus(job, passNum);
          return (
            <div key={num} className="flex items-center gap-2 text-sm">
              {status === 'completed' ? (
                <CheckIcon className="w-4 h-4 text-green-400" />
              ) : status === 'in_progress' ? (
                <Loader className="w-4 h-4 text-blue-400 animate-spin" />
              ) : (
                <CircleIcon className="w-4 h-4 text-gray-500" />
              )}
              <span>Pass {num}: {name}</span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {job.status === 'in_progress' ? (
          <button onClick={onPause} className="btn-secondary">Pause</button>
        ) : job.status === 'paused' ? (
          <button onClick={onResume} className="btn-primary">Resume</button>
        ) : null}
        <button onClick={onCancel} className="btn-danger">Cancel</button>
      </div>
    </div>
  );
};
```

### 6.2 useContentGeneration Hook

```typescript
const useContentGeneration = (briefId: string) => {
  const [job, setJob] = useState<ContentGenerationJob | null>(null);
  const [sections, setSections] = useState<ContentGenerationSection[]>([]);
  const supabase = useSupabaseClient();

  // Subscribe to realtime updates
  useEffect(() => {
    const jobChannel = supabase
      .channel(`job-${briefId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_generation_jobs',
        filter: `brief_id=eq.${briefId}`
      }, (payload) => {
        setJob(payload.new as ContentGenerationJob);
      })
      .subscribe();

    const sectionsChannel = supabase
      .channel(`sections-${briefId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_generation_sections',
        filter: `job_id=eq.${job?.id}`
      }, (payload) => {
        setSections(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(s => s.id === payload.new.id);
          if (idx >= 0) {
            updated[idx] = payload.new as ContentGenerationSection;
          } else {
            updated.push(payload.new as ContentGenerationSection);
          }
          return updated.sort((a, b) => a.section_order - b.section_order);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
      supabase.removeChannel(sectionsChannel);
    };
  }, [briefId, job?.id]);

  const startGeneration = async () => {
    // Check for existing job
    // Create new job
    // Start orchestrator
  };

  const pauseGeneration = async () => {
    if (job) {
      await supabase
        .from('content_generation_jobs')
        .update({ status: 'paused' })
        .eq('id', job.id);
    }
  };

  const resumeGeneration = async () => {
    // Resume from current pass
  };

  const cancelGeneration = async () => {
    // Cancel and optionally delete
  };

  return {
    job,
    sections,
    startGeneration,
    pauseGeneration,
    resumeGeneration,
    cancelGeneration,
    isGenerating: job?.status === 'in_progress',
    isPaused: job?.status === 'paused',
    isComplete: job?.status === 'completed',
    progress: job ? calculateProgress(job) : 0
  };
};
```

---

## 7. Audit Rules Summary

### 7.1 Complete Rule Checklist (25+ Rules)

| # | Rule Name | Pass Applied | Check Type |
|---|-----------|--------------|------------|
| 1 | Central Entity Focus | 1, 8 | AI + Algorithmic |
| 2 | Attribute Prioritization | 1, 8 | AI |
| 3 | Heading Hierarchy (H1→H2→H3) | 2, 8 | Algorithmic |
| 4 | Heading Contextual Overlap | 2, 8 | Algorithmic |
| 5 | Subordinate Text Precision | 1, 8 | Algorithmic |
| 6 | Question Protection | 1, 8 | Algorithmic |
| 7 | List Count Specificity | 3, 8 | Algorithmic |
| 8 | Ordered vs Unordered Lists | 3, 8 | Algorithmic |
| 9 | Table Structure (cols=attrs) | 3, 8 | AI |
| 10 | Image Alt Vocabulary Extension | 4, 8 | Algorithmic |
| 11 | Image Placement Rules | 4, 8 | Algorithmic |
| 12 | Modality Certainty | 5, 8 | Algorithmic |
| 13 | Stop Word Removal | 5, 8 | Algorithmic |
| 14 | Subject Positioning | 5, 8 | Algorithmic |
| 15 | Definition Structure (Is-A) | 5, 8 | AI |
| 16 | Information Density | 5, 8 | Algorithmic |
| 17 | Reference Principle | 5, 8 | Algorithmic |
| 18 | Negative Constraints | 5, 8 | AI |
| 19 | Discourse Anchors | 6, 8 | Algorithmic |
| 20 | Annotation Text for Links | 6, 8 | Algorithmic |
| 21 | Contextual Bridges | 6, 8 | AI |
| 22 | Centerpiece Annotation | 7, 8 | Algorithmic |
| 23 | Introduction Summary Alignment | 7, 8 | AI |
| 24 | Pronoun Density | 8 | Algorithmic |
| 25 | Sentence Density | 8 | Algorithmic |
| 26 | LLM Phrase Detection | 8 | Algorithmic |
| 27 | Link Positioning | 8 | Algorithmic |
| 28 | EAV Word Proximity | 8 | Algorithmic |

---

## 8. Implementation Plan

### Phase 1: Database & Core Infrastructure (Day 1-2)
1. Create migration for `content_generation_jobs` table
2. Create migration for `content_generation_sections` table
3. Enable Realtime for both tables
4. Create TypeScript types for new tables

### Phase 2: Orchestrator & Pass 1 (Day 2-3)
1. Create `contentGenerationOrchestrator.ts`
2. Implement `pass1DraftGeneration.ts` with section-by-section logic
3. Implement retry and error handling
4. Create `useContentGeneration` hook

### Phase 3: Remaining Passes (Day 3-5)
1. Implement Pass 2-7 services
2. Create prompts for each pass in `config/prompts.ts`
3. Wire up pass execution in orchestrator

### Phase 4: Audit & Scoring (Day 5-6)
1. Implement all new algorithmic checks
2. Implement Pass 8 with comprehensive audit
3. Calculate and store final scores

### Phase 5: Frontend UI (Day 6-7)
1. Create `ContentGenerationProgress` component
2. Integrate with `ContentBriefModal`
3. Add pause/resume/cancel functionality
4. Add resume modal for incomplete jobs

### Phase 6: Testing & Polish (Day 7-8)
1. End-to-end testing
2. Error scenario testing
3. Performance optimization
4. Documentation

---

## 9. Success Criteria

1. **No timeouts**: All API calls complete within 30 seconds
2. **Full resume**: Can resume from any section/pass after interruption
3. **25+ rules**: All documented rules are checked and enforced
4. **Clear progress**: User always knows what's happening
5. **Quality score**: Final audit produces meaningful compliance score
6. **Reliability**: <1% failure rate on generation jobs

---

## 10. Future Enhancements

1. **Parallel section generation**: Generate non-dependent sections concurrently
2. **A/B testing**: Generate multiple versions and compare
3. **Learning from edits**: Track user edits to improve future generation
4. **Batch generation**: Queue multiple articles for overnight processing
5. **Export to CMS**: Direct publish to WordPress, Contentful, etc.
