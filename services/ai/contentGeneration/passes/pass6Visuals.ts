// services/ai/contentGeneration/passes/pass6Visuals.ts
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
import { BriefChangeTracker } from '../briefChangeTracker';
import { ImageProcessingService } from '../../../imageProcessingService';

/**
 * Pass 6: Visual Semantics
 *
 * Uses format budget-aware selective processing:
 * - Only processes sections identified as needing images
 * - Ensures proper image placement (never between heading and first paragraph)
 * - Uses vocabulary-extending alt text
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
  shouldAbort?: () => boolean,
  changeTracker?: BriefChangeTracker
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

      // Brief-led processing: Only sections designated by brief for images + justified additions
      filterSections: (sections: ContentGenerationSection[], budget: ContentFormatBudget) => {
        // Build set of brief-designated image sections
        const briefImageSections = new Set<string>();
        if (brief.enhanced_visual_semantics?.section_images) {
          Object.keys(brief.enhanced_visual_semantics.section_images).forEach(key => {
            briefImageSections.add(key.toLowerCase());
            briefImageSections.add(key.toLowerCase().replace(/-/g, '_'));
            briefImageSections.add(key.toLowerCase().replace(/_/g, '-'));
          });
        }
        // Always include intro for hero image
        briefImageSections.add('intro');

        return sections.filter(s => {
          const sectionKeyLower = s.section_key.toLowerCase();
          const sectionKeyNormalized = sectionKeyLower.replace(/-/g, '_');

          // 1. Always process if brief designates this section for an image
          if (briefImageSections.has(sectionKeyLower) || briefImageSections.has(sectionKeyNormalized)) {
            return true;
          }

          // 2. Check if section already has an image (from Pass 1)
          const hasImage = (s.current_content || '').includes('[IMAGE:');
          if (hasImage) {
            return true;
          }

          // 3. Evaluate if adding an image is justified
          const isFSTarget = brief.featured_snippet_target?.question?.toLowerCase().includes(
            s.section_heading?.toLowerCase().split(' ')[0] || ''
          ) || false;

          const evaluation = BriefChangeTracker.evaluateImageAddition(
            s.current_content || '',
            s.section_heading || '',
            false,
            isFSTarget
          );

          if (evaluation.justified && changeTracker) {
            changeTracker.logImageAdded(
              6,
              s.section_key,
              `Auto-generated visual for ${s.section_heading}`,
              evaluation.criteria,
              evaluation.reason
            );
            return true;
          }

          return false;
        });
      }
    },
    onSectionProgress,
    shouldAbort
  );
}

/**
 * Get hybrid category strategy for image recommendations.
 * Uses ImageProcessingService to determine optimal image category
 * based on content type and entity type.
 */
export function getImageCategoryRecommendation(contentType: string, entityType?: string) {
  return ImageProcessingService.getHybridCategoryStrategy(contentType, entityType);
}
