// services/ai/contentGeneration/passes/pass7Introduction.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo, SectionProgressCallback, ContentGenerationSection, SectionOptimizationContext, HolisticSummaryContext } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { buildPass7Prompt, buildPass7ConclusionPrompt } from '../rulesEngine/prompts/sectionOptimizationPromptBuilder';
import { buildHolisticSummary, buildAdjacentContext } from '../holisticAnalyzer';
import { callProviderWithFallback } from '../providerUtils';
import { createLogger } from '../../../../utils/debugLogger';

const log = createLogger('Pass7');

/**
 * Pass 7: Introduction Synthesis
 *
 * Rewrites the introduction AFTER the body is fully polished.
 * This ensures the intro can accurately summarize the polished content.
 *
 * NOTE: Conclusion sections are NO LONGER GENERATED
 * User feedback: "I really dislike them also only AI does that"
 * The introduction serves as the ONLY summary of the article.
 * Articles end with their last substantive H2 section.
 *
 * Uses holistic context to:
 * - Synthesize intro with all H2/H3 topics in correct order with centerpiece annotation
 * - Intro gets topic-specific heading (not generic "Introduction")
 */
export async function executePass7(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  onSectionProgress?: SectionProgressCallback,
  shouldAbort?: () => boolean
): Promise<string> {
  // Mark pass as in_progress
  await orchestrator.updateJob(job.id, {
    passes_status: { ...job.passes_status, pass_7_intro: 'in_progress' }
  });

  // Get all sections
  const sections = await orchestrator.getSections(job.id);
  const sortedSections = [...sections].sort((a, b) => a.section_order - b.section_order);

  if (sortedSections.length === 0) {
    log.warn(' No sections found for job', job.id);
    await orchestrator.updateJob(job.id, {
      passes_status: { ...job.passes_status, pass_7_intro: 'completed' },
      current_pass: 8  // Proceed to Pass 8 (Final Polish)
    });
    return '';
  }

  // Build holistic summary (once for both intro and conclusion)
  log.log(' Building holistic summary from', sortedSections.length, 'sections...');
  // NOTE: buildHolisticSummary is now async and yields to prevent browser freeze
  const holisticContext = await buildHolisticSummary(sortedSections, brief, businessInfo);

  // Find intro and conclusion sections
  const introSection = sortedSections.find(s =>
    s.section_key === 'intro' ||
    s.section_heading?.toLowerCase().includes('introduction') ||
    s.section_heading?.toLowerCase().includes('introductie') ||
    s.section_heading?.toLowerCase().startsWith('wat is')
  );

  const conclusionSection = sortedSections.find(s =>
    s.section_key === 'conclusion' ||
    s.section_heading?.toLowerCase().includes('conclusion') ||
    s.section_heading?.toLowerCase().includes('conclusie') ||
    s.section_heading?.toLowerCase().includes('samenvatting')
  );

  let processedCount = 0;
  const totalToProcess = (introSection ? 1 : 0) + (conclusionSection ? 1 : 0);

  // Process Introduction
  if (introSection) {
    if (shouldAbort && shouldAbort()) {
      throw new Error('Pass aborted by user');
    }

    if (onSectionProgress) {
      onSectionProgress(introSection.section_key, ++processedCount, totalToProcess);
    }

    log.log(' Processing introduction section...');
    await processIntroOrConclusion(
      orchestrator,
      introSection,
      sortedSections,
      holisticContext,
      brief,
      businessInfo,
      'intro'
    );
  }

  // Process Conclusion
  if (conclusionSection) {
    if (shouldAbort && shouldAbort()) {
      throw new Error('Pass aborted by user');
    }

    if (onSectionProgress) {
      onSectionProgress(conclusionSection.section_key, ++processedCount, totalToProcess);
    }

    log.log(' Processing conclusion section...');
    await processIntroOrConclusion(
      orchestrator,
      conclusionSection,
      sortedSections,
      holisticContext,
      brief,
      businessInfo,
      'conclusion'
    );
  }

  // Assemble final draft
  const assembledDraft = await orchestrator.assembleDraft(job.id);
  log.log(' Pass complete. Assembled draft:', assembledDraft.length, 'chars');

  // Update job with assembled draft and mark pass complete
  await orchestrator.updateJob(job.id, {
    draft_content: assembledDraft,
    passes_status: { ...job.passes_status, pass_7_intro: 'completed' },
    current_pass: 8  // Proceed to Pass 8 (Final Polish)
  });

  return assembledDraft;
}

/**
 * Process either introduction or conclusion section
 */
async function processIntroOrConclusion(
  orchestrator: ContentGenerationOrchestrator,
  section: ContentGenerationSection,
  allSections: ContentGenerationSection[],
  holisticContext: HolisticSummaryContext,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  type: 'intro' | 'conclusion'
): Promise<void> {
  const adjacentContext = buildAdjacentContext(allSections, section);
  const ctx: SectionOptimizationContext = {
    section,
    holistic: holisticContext,
    adjacentContext,
    brief,
    businessInfo,
    passNumber: 7  // Pass 7: Introduction Synthesis (after body polish)
  };

  try {
    // Use appropriate prompt builder
    const prompt = type === 'intro'
      ? buildPass7Prompt(ctx)
      : buildPass7ConclusionPrompt(ctx);

    const optimizedContent = await callProviderWithFallback(businessInfo, prompt, 2);

    if (typeof optimizedContent !== 'string' || !optimizedContent.trim()) {
      console.warn(`[Pass7] Empty response for ${type} section, keeping original`);
      return;
    }

    // Clean the content
    let content = optimizedContent.trim();

    // Remove markdown code block wrapper if present
    if (content.startsWith('```markdown')) {
      content = content.slice(11);
    } else if (content.startsWith('```')) {
      content = content.slice(3);
    }
    if (content.endsWith('```')) {
      content = content.slice(0, -3);
    }
    content = content.trim();

    // Normalize whitespace
    content = content
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+$/gm, '')
      .trim();

    // Validate and fix generic headings for intro sections
    if (type === 'intro') {
      content = fixGenericIntroHeading(content, holisticContext.centralEntity);

      // Ensure intro content has an H2 heading - AI sometimes returns content without one
      const hasH2 = /^##\s+.+$/m.test(content);
      if (!hasH2) {
        const originalHeading = (section.current_content || '').match(/^##\s+.+$/m)?.[0];
        if (originalHeading && !originalHeading.includes('[GENERATE_HEADING:')) {
          content = `${originalHeading}\n\n${content}`;
          console.warn(`[Pass7] AI omitted H2 heading - restored from original: "${originalHeading}"`);
        } else if (section.section_heading && !section.section_heading.startsWith('[GENERATE_HEADING:')) {
          content = `## ${section.section_heading}\n\n${content}`;
          console.warn(`[Pass7] AI omitted H2 heading - restored from section definition: "${section.section_heading}"`);
        } else {
          // Both heading sources contain placeholder — derive from central entity
          const fallbackHeading = holisticContext.centralEntity || 'Introduction';
          content = `## ${fallbackHeading}\n\n${content}`;
          console.warn(`[Pass7] AI omitted H2 heading - used central entity fallback: "${fallbackHeading}"`);
        }
      }
    }

    // CRITICAL: Preserve image placeholders from the original content
    // Pass 6 adds hero image to intro section - don't lose it when rewriting
    const originalImagePlaceholders = (section.current_content || '').match(/\[IMAGE:[^\]]+\]/g) || [];
    if (originalImagePlaceholders.length > 0 && !content.includes('[IMAGE:')) {
      log.log(` Preserving ${originalImagePlaceholders.length} image placeholder(s) from original intro`);
      // Re-insert image placeholder after first paragraph (after heading + first para)
      const lines = content.split('\n');
      let insertIndex = -1;
      let foundHeading = false;
      let foundFirstPara = false;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('##')) {
          foundHeading = true;
        } else if (foundHeading && lines[i].trim() && !lines[i].startsWith('#')) {
          // Found first content line after heading
          if (!foundFirstPara) {
            foundFirstPara = true;
          } else if (lines[i].trim() === '') {
            // Found empty line after first paragraph - insert here
            insertIndex = i;
            break;
          }
        }
      }

      if (insertIndex > 0) {
        lines.splice(insertIndex + 1, 0, '', originalImagePlaceholders[0]);
        content = lines.join('\n');
      } else {
        // Fallback: append after first double newline
        const firstParaEnd = content.indexOf('\n\n');
        if (firstParaEnd > 0) {
          content = content.slice(0, firstParaEnd) + '\n\n' + originalImagePlaceholders[0] + content.slice(firstParaEnd);
        }
      }
    }

    // Update section
    await orchestrator.upsertSection({
      ...section,
      current_content: content,
      current_pass: 7,  // Pass 7: Introduction Synthesis
      updated_at: new Date().toISOString()
    });

    console.log(`[Pass7] ${type} section optimized: ${section.current_content?.length || 0} → ${content.length} chars`);

  } catch (error) {
    console.error(`[Pass7] Error optimizing ${type} section:`, error);
  }
}

/**
 * Fix generic intro headings that the AI might still produce.
 * Validates against banned patterns and replaces with topic-specific alternatives.
 */
function fixGenericIntroHeading(content: string, centralEntity: string): string {
  // Banned generic patterns (case-insensitive)
  const bannedPatterns = [
    /^##\s+.*\bIntroductie\b.*$/im,
    /^##\s+.*\bInleiding\b.*$/im,
    /^##\s+.*\bOverzicht\b.*$/im,
    /^##\s+.*\bEen Overzicht\b.*$/im,
    /^##\s+.*\bIntroduction\b.*$/im,
    /^##\s+.*\bOverview\b.*$/im,
    /^##\s+.*\bAn Overview\b.*$/im,
    /^##\s+.*\bSamenvatting\b.*$/im,
    /^##\s+.*\bSummary\b.*$/im,
  ];

  // Check if heading contains banned patterns
  const headingMatch = content.match(/^##\s+(.+)$/m);
  if (!headingMatch) return content; // No H2 heading found

  const currentHeading = headingMatch[0];
  const headingText = headingMatch[1];

  // Check against banned patterns
  for (const pattern of bannedPatterns) {
    if (pattern.test(currentHeading)) {
      log.warn(` Detected generic heading: "${headingText}" - replacing with topic-specific heading`);

      // Generate better heading
      let newHeading: string;
      if (centralEntity.length > 30) {
        // Long entity - use question format
        newHeading = `## Wat is ${centralEntity}?`;
      } else if (centralEntity.split(' ').length >= 3) {
        // Multi-word entity - use direct format
        newHeading = `## ${centralEntity}: De Complete Gids`;
      } else {
        // Short entity - use comprehensive format
        newHeading = `## Alles over ${centralEntity}`;
      }

      return content.replace(currentHeading, newHeading);
    }
  }

  // Also check if heading is just "[Entity]: Een Overzicht" pattern
  const overviewPattern = new RegExp(`^##\\s+${escapeRegex(centralEntity)}:\\s*(Een\\s+)?(Overzicht|Overview|Introductie|Introduction)$`, 'i');
  if (overviewPattern.test(currentHeading)) {
    log.warn(` Detected generic overview pattern in heading - replacing`);
    const newHeading = `## Wat is ${centralEntity}?`;
    return content.replace(currentHeading, newHeading);
  }

  return content;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
