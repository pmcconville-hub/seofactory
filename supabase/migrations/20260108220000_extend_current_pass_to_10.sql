-- Migration: Extend current_pass constraint to allow 10 passes
-- The 10-pass content generation system requires current_pass values from 1-10:
-- 1: Draft Generation
-- 2: Header Optimization
-- 3: Introduction Synthesis (was 7)
-- 4: Lists & Tables (was 3)
-- 5: Discourse Integration (was 6)
-- 6: Micro Semantics (was 5)
-- 7: Visual Semantics (was 4)
-- 8: Final Polish (NEW)
-- 9: Audit (was 8)
-- 10: Schema Generation (was 9)

-- Drop the existing constraint that only allows 1-9
ALTER TABLE content_generation_jobs
  DROP CONSTRAINT IF EXISTS content_generation_jobs_current_pass_check;

-- Add new constraint that allows 1-10
ALTER TABLE content_generation_jobs
  ADD CONSTRAINT content_generation_jobs_current_pass_check
  CHECK (current_pass >= 1 AND current_pass <= 10);
