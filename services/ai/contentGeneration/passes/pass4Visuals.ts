// services/ai/contentGeneration/passes/pass4Visuals.ts
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
import { buildPass4Prompt, buildPass4BatchPrompt } from '../rulesEngine/prompts/sectionOptimizationPromptBuilder';

/**
 * Pass 6: Visual Semantics (exported as executePass6 via index.ts)
 *
 * Uses format budget-aware selective processing:
 * - Only processes sections identified as needing images
 * - Ensures proper image placement (never between heading and first paragraph)
 * - Uses vocabulary-extending alt text
 * - Excludes intro/conclusion (handled in Pass 7)
 *
 * Batches sections to reduce API calls.
 */
export async function executePass4(
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
      passNumber: 6,  // Pass 6: Visual Semantics
      passKey: 'pass_6_visuals',
      nextPassNumber: 7,  // Proceed to Pass 7 (Introduction Synthesis)
      promptBuilder: buildPass4Prompt,

      // Batch processing: 5 sections per API call with proper batch prompt
      batchSize: 5,
      buildBatchPrompt: buildPass4BatchPrompt,

      // Selective processing: Sections needing images + ALWAYS include intro for hero image
      filterSections: (sections: ContentGenerationSection[], budget: ContentFormatBudget) => {
        return sections.filter(s => {
          // Always process intro section for HERO image (Korayanese framework requirement)
          const isIntroSection = s.section_key === 'intro' ||
            s.section_order === 0 ||
            s.section_heading?.toLowerCase().includes('introductie') ||
            s.section_heading?.toLowerCase().includes('introduction') ||
            s.section_heading?.toLowerCase().startsWith('wat is');

          if (isIntroSection) {
            // Check if intro already has an image - if not, force processing
            const hasImage = (s.current_content || '').includes('[IMAGE:');
            if (!hasImage) {
              console.log('[Pass4] Forcing intro section processing for hero image');
              return true;
            }
          }

          // Otherwise use budget-based selection
          return budget.sectionsNeedingOptimization.images.includes(s.section_key);
        });
      }
    },
    onSectionProgress,
    shouldAbort
  );
}
