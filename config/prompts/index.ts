/**
 * Prompt Utilities - Barrel Exports
 *
 * This module exports all prompt-building utilities for use across the application.
 *
 * Created: 2024-12-20 - Prompt template engine
 * Updated: 2026-01-27 - Added modular prompt exports
 */

export {
  // Constants
  PROMPT_CONSTRAINTS,
  jsonResponseInstruction,

  // Context builders
  businessContext,
  compactBusinessContext,
  pillarsContext,
  compactPillarsContext,
  stylometryInstructions,
  websiteTypeInstructions,

  // Composition utilities
  composePrompt,
  criticalRequirement,
  numberedListFormat,
  jsonArrayExample,

  // Fluent builder
  PromptBuilder,
  createPromptBuilder,

  // Types
  type PromptPart,
} from './PromptBuilder';

// Re-export common utilities from modular structure
export {
  getStylometryInstructions,
  getMarketDataPromptSection,
  getWebsiteTypeInstructions,
  condenseBriefForPrompt,
  getLanguageAndRegionInstruction,
} from './_common';

// Re-export multi-pass content optimization prompts
export {
  PASS_2_HEADER_OPTIMIZATION_PROMPT,
  PASS_3_LIST_TABLE_PROMPT,
  PASS_4_VISUAL_SEMANTICS_PROMPT,
  PASS_5_MICRO_SEMANTICS_PROMPT,
  PASS_6_DISCOURSE_PROMPT,
  PASS_7_INTRO_SYNTHESIS_PROMPT,
} from './multiPass';
