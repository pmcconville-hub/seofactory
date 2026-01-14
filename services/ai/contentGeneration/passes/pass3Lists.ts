// services/ai/contentGeneration/passes/pass3Lists.ts
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
import { buildPass3Prompt, buildPass3BatchPrompt } from '../rulesEngine/prompts/sectionOptimizationPromptBuilder';

/**
 * Validate and fix missing list/table introduction sentences.
 * Every list or table MUST be preceded by a definition sentence ending with ":"
 */
function validateListIntroductions(content: string): string {
  let result = content;

  // Pattern to find lists without proper introduction
  // A proper introduction ends with ":" before the list
  const listPatterns = [
    // Markdown unordered lists without intro
    /(\n\n)([-*]\s+[^\n]+(\n[-*]\s+[^\n]+)+)/g,
    // Markdown ordered lists without intro
    /(\n\n)(\d+\.\s+[^\n]+(\n\d+\.\s+[^\n]+)+)/g,
    // Markdown tables without intro
    /(\n\n)(\|[^\n]+\|(\n\|[^\n]+\|)+)/g,
  ];

  for (const pattern of listPatterns) {
    result = result.replace(pattern, (match, leadingNewlines, listContent) => {
      // Check if the text before this list ends with ":"
      const beforeMatch = result.substring(0, result.indexOf(match));
      const lastSentence = beforeMatch.split(/[.!?]\s*/).pop()?.trim() || '';

      // If last sentence doesn't end with ":", the list lacks proper intro
      if (!lastSentence.endsWith(':')) {
        console.log('[Pass3] Warning: List/table found without proper introduction sentence');
        // We can't auto-fix this without context, but we log it for the AI to handle
      }

      return match; // Return unchanged for now - the prompt should handle this
    });
  }

  return result;
}

/**
 * Check if content has lists/tables that need introduction sentences.
 * Returns true if any list/table is missing a proper intro.
 */
export function hasListsWithoutIntro(content: string): boolean {
  // Find all lists and tables
  const listMatches = [
    ...content.matchAll(/\n([-*]\s+[^\n]+(?:\n[-*]\s+[^\n]+)+)/g),
    ...content.matchAll(/\n(\d+\.\s+[^\n]+(?:\n\d+\.\s+[^\n]+)+)/g),
    ...content.matchAll(/\n(\|[^\n]+\|(?:\n\|[^\n]+\|)+)/g),
  ];

  for (const match of listMatches) {
    const position = match.index || 0;
    const beforeList = content.substring(Math.max(0, position - 200), position);

    // Check if the paragraph before ends with ":"
    const lines = beforeList.split('\n').filter(l => l.trim());
    const lastLine = lines[lines.length - 1] || '';

    if (!lastLine.trim().endsWith(':')) {
      return true; // Found a list without proper intro
    }
  }

  return false;
}

/**
 * Pass 3: List & Table Optimization
 *
 * Uses format budget-aware selective processing:
 * - Only processes sections identified as needing lists/tables
 * - Respects the 40% list / 15% table budget
 * - Batches sections to reduce API calls
 * - Excludes intro/conclusion (handled in Pass 7)
 *
 * This prevents over-optimization with lists/tables (Baker Principle).
 */
export async function executePass3(
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
      passNumber: 3,  // Pass 3: Lists & Tables
      passKey: 'pass_3_lists',
      nextPassNumber: 4,  // Proceed to Pass 4 (Discourse Integration)
      promptBuilder: buildPass3Prompt,

      // Batch processing: 3 sections per API call
      batchSize: 3,

      // Selective processing: Sections that need lists/tables + sections with lists missing intros
      filterSections: (sections: ContentGenerationSection[], budget: ContentFormatBudget) => {
        const needsOptimization = new Set([
          ...budget.sectionsNeedingOptimization.lists,
          ...budget.sectionsNeedingOptimization.tables
        ]);

        // Also include sections that have existing lists/tables without proper introduction
        for (const section of sections) {
          if (section.current_content && hasListsWithoutIntro(section.current_content)) {
            console.log(`[Pass3] Section "${section.section_key}" has lists without proper intro - adding to processing`);
            needsOptimization.add(section.section_key);
          }
        }

        return sections.filter(s => needsOptimization.has(s.section_key));
      },

      // Batch prompt with format budget context
      buildBatchPrompt: buildPass3BatchPrompt
    },
    onSectionProgress,
    shouldAbort
  );
}
