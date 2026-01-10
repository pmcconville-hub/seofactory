// services/ai/contentGeneration/passes/index.ts
//
// CORRECT 10-PASS ORDER (as of 2026-01-10):
// Introduction Synthesis moved to Pass 7 (AFTER body polish) so it can see polished content
//
// Pass 1: Draft Generation - create all sections
// Pass 2: Header Optimization - body sections only
// Pass 3: Lists & Tables - body sections only
// Pass 4: Discourse Integration - body sections only
// Pass 5: Micro Semantics - body sections only
// Pass 6: Visual Semantics - body sections only (images added to polished body)
// Pass 7: Introduction Synthesis - intro/conclusion with FULL POLISHED body context
// Pass 8: Final Polish - entire article
// Pass 9: Final Audit - quality scoring
// Pass 10: Schema Generation - JSON-LD structured data

// Pass 1: Draft Generation
export { executePass1 } from './pass1DraftGeneration';

// Pass 2: Header Optimization
export { executePass2 } from './pass2Headers';

// Pass 3: Lists & Tables (file: pass3Lists.ts)
export { executePass3 } from './pass3Lists';

// Pass 4: Discourse Integration (file: pass6Discourse.ts, aliased)
export { executePass6 as executePass4 } from './pass6Discourse';

// Pass 5: Micro Semantics (file: pass5MicroSemantics.ts)
export { executePass5 } from './pass5MicroSemantics';

// Pass 6: Visual Semantics (file: pass4Visuals.ts, aliased)
export { executePass4 as executePass6 } from './pass4Visuals';

// Pass 7: Introduction Synthesis (file: pass7Introduction.ts) - NOW AFTER BODY POLISH
export { executePass7 } from './pass7Introduction';

// Pass 8: Final Polish
export { executePass8 } from './pass8FinalPolish';

// Pass 9: Final Audit (file: pass8Audit.ts, aliased)
export { executePass8 as executePass9 } from './pass8Audit';

// Pass 10: Schema Generation (file: pass9SchemaGeneration.ts, aliased)
export { executePass9 as executePass10, canExecutePass9 as canExecutePass10, getPass9Status as getPass10Status, regenerateSchema } from './pass9SchemaGeneration';

// Audit utilities
export { runAlgorithmicAudit, generateAutoFix, applyAutoFix } from './auditChecks';
