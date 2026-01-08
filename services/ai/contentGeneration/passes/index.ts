// services/ai/contentGeneration/passes/index.ts
//
// NEW 10-PASS ORDER (as of 2026-01-08):
// Pass 1: Draft Generation (unchanged)
// Pass 2: Header Optimization (unchanged) - excludes intro/conclusion
// Pass 3: Introduction Synthesis (was Pass 7) - moved early
// Pass 4: Lists & Tables (was Pass 3) - excludes intro/conclusion
// Pass 5: Discourse Integration (was Pass 6) - excludes intro/conclusion
// Pass 6: Micro Semantics (was Pass 5) - excludes intro/conclusion, preserves images
// Pass 7: Visual Semantics (was Pass 4) - moved late, uses brief's visual_semantics
// Pass 8: Final Polish (NEW) - absorbs manual polish functionality
// Pass 9: Final Audit (was Pass 8) - includes auto-fix capability
// Pass 10: Schema Generation (was Pass 9)

// Pass 1: Draft Generation (unchanged)
export { executePass1 } from './pass1DraftGeneration';

// Pass 2: Header Optimization (unchanged)
export { executePass2 } from './pass2Headers';

// Pass 3: Introduction Synthesis (was Pass 7)
export { executePass7 as executePass3 } from './pass7Introduction';

// Pass 4: Lists & Tables (was Pass 3)
export { executePass3 as executePass4 } from './pass3Lists';

// Pass 5: Discourse Integration (was Pass 6)
export { executePass6 as executePass5 } from './pass6Discourse';

// Pass 6: Micro Semantics (was Pass 5)
export { executePass5 as executePass6 } from './pass5MicroSemantics';

// Pass 7: Visual Semantics (was Pass 4)
export { executePass4 as executePass7 } from './pass4Visuals';

// Pass 8: Final Polish (NEW)
export { executePass8 } from './pass8FinalPolish';

// Pass 9: Final Audit (was Pass 8)
export { executePass8 as executePass9 } from './pass8Audit';

// Pass 10: Schema Generation (was Pass 9)
export { executePass9 as executePass10, canExecutePass9 as canExecutePass10, getPass9Status as getPass10Status, regenerateSchema } from './pass9SchemaGeneration';

// Audit utilities
export { runAlgorithmicAudit, generateAutoFix, applyAutoFix } from './auditChecks';
