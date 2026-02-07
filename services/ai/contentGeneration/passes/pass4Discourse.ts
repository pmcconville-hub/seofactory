// services/ai/contentGeneration/passes/pass4Discourse.ts
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
 * Pass 4: Discourse Integration
 *
 * Uses format budget-aware selective processing:
 * - Only processes sections identified as needing discourse improvement
 * - Uses adjacent section context to ensure smooth transitions
 * - Applies discourse anchors for contextual bridges
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
      passNumber: 4,  // Pass 4: Discourse Integration
      passKey: 'pass_4_discourse',
      nextPassNumber: 5,  // Proceed to Pass 5 (Micro Semantics)
      promptBuilder: buildPass6Prompt,

      // Batch processing: 3 sections per API call with proper batch prompt
      batchSize: 3,
      buildBatchPrompt: buildPass6BatchPrompt,

      // Selective processing: Sections needing discourse improvement + adjacent sections
      // Discourse chaining requires processing adjacent sections together for smooth transitions
      filterSections: (sections: ContentGenerationSection[], budget: ContentFormatBudget) => {
        // Get sections that need discourse improvement
        const needsDiscourse = new Set(budget.sectionsNeedingOptimization.discourse);

        // Also include sections adjacent to those needing improvement (for transition continuity)
        const sortedSections = [...sections].sort((a, b) => a.section_order - b.section_order);
        const toProcess = new Set<string>();

        for (let i = 0; i < sortedSections.length; i++) {
          const section = sortedSections[i];
          if (needsDiscourse.has(section.section_key)) {
            toProcess.add(section.section_key);
            // Include previous section for transition context
            if (i > 0) {
              toProcess.add(sortedSections[i - 1].section_key);
            }
            // Include next section for forward transition
            if (i < sortedSections.length - 1) {
              toProcess.add(sortedSections[i + 1].section_key);
            }
          }
        }

        // Also check for sections with weak discourse indicators
        for (const section of sections) {
          if (section.section_key === 'intro' || section.section_key === 'conclusion') continue;
          const content = section.current_content || '';

          // Check for weak paragraph transitions (missing connecting words)
          const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50);
          if (paragraphs.length >= 2) {
            let weakTransitions = 0;
            for (let i = 1; i < paragraphs.length; i++) {
              // Check if paragraph starts without a connecting word/phrase
              const hasConnector = /^(however|therefore|additionally|moreover|furthermore|similarly|consequently|thus|hence|also|deze|dit|daarom|echter|bovendien|verder|daarnaast|hierdoor)/.test(paragraphs[i].trim().toLowerCase());
              if (!hasConnector) {
                weakTransitions++;
              }
            }
            // If more than half of paragraph transitions are weak, process this section
            if (weakTransitions > paragraphs.length / 2) {
              toProcess.add(section.section_key);
            }
          }
        }

        return sections.filter(s => toProcess.has(s.section_key));
      }
    },
    onSectionProgress,
    shouldAbort
  );
}
