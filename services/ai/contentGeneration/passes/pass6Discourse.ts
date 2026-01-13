// services/ai/contentGeneration/passes/pass6Discourse.ts
import {
  ContentBrief,
  ContentGenerationJob,
  BusinessInfo,
  SectionProgressCallback,
  ContentGenerationSection,
  ContentFormatBudget
} from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { executeSectionPass } from './baseSectionPass';
import { buildPass6Prompt, buildPass6BatchPrompt } from '../rulesEngine/prompts/sectionOptimizationPromptBuilder';

/**
 * Pass 4: Discourse Integration (exported as executePass4 via index.ts)
 *
 * Uses format budget-aware selective processing:
 * - Only processes sections identified as needing discourse improvement
 * - Uses adjacent section context to ensure smooth transitions
 * - Applies discourse anchors for contextual bridges
 * - Excludes intro/conclusion (handled in Pass 7)
 *
 * Batches sections to reduce API calls.
 */
export async function executePass6(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  onSectionProgress?: SectionProgressCallback,
  shouldAbort?: () => boolean
): Promise<string> {
  return executeSectionPass(
    orchestrator,
    job,
    brief,
    businessInfo,
    {
      passNumber: 4,  // Pass 4: Discourse Integration
      passKey: 'pass_4_discourse',
      nextPassNumber: 5,  // Proceed to Pass 5 (Micro Semantics)
      promptBuilder: buildPass6Prompt,

      // Batch processing: 3 sections per API call with proper batch prompt
      batchSize: 3,
      buildBatchPrompt: buildPass6BatchPrompt,

      // Selective processing: Only sections needing discourse improvement
      filterSections: (sections: ContentGenerationSection[], budget: ContentFormatBudget) => {
        return sections.filter(s =>
          budget.sectionsNeedingOptimization.discourse.includes(s.section_key)
        );
      }
    },
    onSectionProgress,
    shouldAbort
  );
}
