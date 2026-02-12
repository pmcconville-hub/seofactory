// services/styleguide-generator/sections/ai-batches/index.ts
// Barrel export for all AI batch generators.

export { generateBatchA, BATCH_A_SPECS } from './batchA-core';
export { generateBatchB, BATCH_B_SPECS } from './batchB-content';
export { generateBatchC, BATCH_C_SPECS } from './batchC-site';
export { generateBatchD, BATCH_D_SPECS } from './batchD-guidelines';
export {
  buildTokenSummary,
  buildBrandSummary,
  callAiForBatch,
  parseAiBatchResponse,
  registerAiSections,
} from './aiSectionUtils';
export type { AiSectionSpec, AiSectionOutput } from './aiSectionUtils';
