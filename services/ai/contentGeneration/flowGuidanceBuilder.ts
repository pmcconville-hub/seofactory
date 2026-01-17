// services/ai/contentGeneration/flowGuidanceBuilder.ts
/**
 * Flow Guidance Builder
 *
 * Computes flow guidance for each section during content generation.
 * This transforms flow validation rules into generation-time instructions
 * to prevent flow issues rather than fix them post-hoc.
 */

import {
  SectionFlowGuidance,
  ContentBrief,
  BusinessInfo,
  BriefSection,
  AttributeCategory,
  ContentZone,
  ContextualBridgeSection,
} from '../../../types';
import { SectionDefinition } from '../../../config/contentPrompts/sectionPrompt';
import { splitSentences } from '../../../utils/sentenceTokenizer';

/**
 * Build flow guidance for a section before generation
 */
export function buildFlowGuidance(
  section: SectionDefinition,
  allSections: SectionDefinition[],
  brief: ContentBrief,
  businessInfo: BusinessInfo
): SectionFlowGuidance {
  const index = allSections.findIndex(s => s.key === section.key);
  const prevSection = index > 0 ? allSections[index - 1] : undefined;
  const nextSection = index < allSections.length - 1 ? allSections[index + 1] : undefined;

  // Get the BriefSection from structured_outline to access content_zone and attribute_category
  const briefSection = findBriefSection(section, brief);

  // Detect content zone and zone transition
  const currentZone = briefSection?.content_zone || 'MAIN';
  const prevBriefSection = prevSection ? findBriefSection(prevSection, brief) : undefined;
  const prevZone = prevBriefSection?.content_zone;
  const isZoneTransition = !!(prevZone && prevZone !== currentZone);

  // Determine transition pattern
  const transitionPattern = determineTransitionPattern(
    index,
    allSections.length,
    section,
    briefSection,
    isZoneTransition
  );

  // Get suggested opener from brief
  const suggestedOpener = getSuggestedOpener(
    index,
    brief,
    isZoneTransition,
    transitionPattern
  );

  // Get full bridge content for zone transitions
  const bridgeContent = isZoneTransition ? getFullBridgeContent(brief) : undefined;

  return {
    sectionIndex: index,
    totalSections: allSections.length,
    isFirstSection: index === 0,
    isLastSection: index === allSections.length - 1,
    isIntroduction: isIntroSection(section),
    isConclusion: isConclusionSection(section),
    previousSectionHeading: prevSection?.heading,
    nextSectionHeading: nextSection?.heading,
    contentZone: currentZone,
    isZoneTransition,
    attributeCategory: briefSection?.attribute_category,
    attributeProgression: describeProgression(index, allSections, brief),
    transitionPattern,
    suggestedOpener,
    bridgeContent,
    centralEntity: businessInfo.seedKeyword || brief.targetKeyword || '',
    articleTitle: brief.title,
  };
}

/**
 * Find the corresponding BriefSection in the brief's structured_outline
 */
function findBriefSection(
  section: SectionDefinition,
  brief: ContentBrief
): BriefSection | undefined {
  if (!brief.structured_outline) return undefined;

  // Try to match by key first
  for (const briefSec of brief.structured_outline) {
    if (briefSec.key === section.key) return briefSec;
    // Check subsections
    if (briefSec.subsections) {
      const sub = briefSec.subsections.find(s => s.key === section.key);
      if (sub) return sub;
    }
  }

  // Fallback: match by heading
  for (const briefSec of brief.structured_outline) {
    if (briefSec.heading === section.heading) return briefSec;
    if (briefSec.subsections) {
      const sub = briefSec.subsections.find(s => s.heading === section.heading);
      if (sub) return sub;
    }
  }

  return undefined;
}

/**
 * Check if a section is an introduction
 */
function isIntroSection(section: SectionDefinition): boolean {
  const key = section.key.toLowerCase();
  const heading = section.heading.toLowerCase();
  return (
    key === 'intro' ||
    key === 'introduction' ||
    heading.includes('introduct') ||
    heading.includes('overzicht') || // Dutch
    heading.includes('wat is') || // Dutch "What is"
    section.order === 0
  );
}

/**
 * Check if a section is a conclusion
 */
function isConclusionSection(section: SectionDefinition): boolean {
  const key = section.key.toLowerCase();
  const heading = section.heading.toLowerCase();
  return (
    key === 'conclusion' ||
    key === 'conclusie' ||
    heading.includes('conclus') ||
    heading.includes('samenvatting') || // Dutch summary
    heading.includes('samengevat') || // Dutch summarized
    section.order >= 900 // High order number typically indicates conclusion
  );
}

/**
 * Determine the transition pattern based on section context
 */
function determineTransitionPattern(
  index: number,
  totalSections: number,
  section: SectionDefinition,
  briefSection: BriefSection | undefined,
  isZoneTransition: boolean
): SectionFlowGuidance['transitionPattern'] {
  // First section is always opening
  if (index === 0) return 'opening';

  // Last section is always concluding
  if (index === totalSections - 1) return 'concluding';

  // Zone transitions require bridging
  if (isZoneTransition) return 'bridging';

  // Check attribute category for deepening vs parallel
  const attrCat = briefSection?.attribute_category;

  // RARE attributes = deepening into specific details
  if (attrCat === 'RARE') return 'deepening';

  // UNIQUE attributes = also deepening (differentiation)
  if (attrCat === 'UNIQUE') return 'deepening';

  // ROOT and COMMON are typically parallel exploration
  return 'parallel';
}

/**
 * Get a suggested opener from the brief's discourse anchors or contextual bridge
 */
function getSuggestedOpener(
  index: number,
  brief: ContentBrief,
  isZoneTransition: boolean,
  transitionPattern: SectionFlowGuidance['transitionPattern']
): string | undefined {
  // For zone transitions, try to use contextual bridge
  if (isZoneTransition && brief.contextualBridge) {
    const bridgeOpener = extractBridgeOpener(brief.contextualBridge);
    if (bridgeOpener) return bridgeOpener;
  }

  // Use discourse anchors if available
  if (brief.discourse_anchors && brief.discourse_anchors.length > 0) {
    // Cycle through anchors based on section index
    const anchorIndex = index % brief.discourse_anchors.length;
    return brief.discourse_anchors[anchorIndex];
  }

  // Provide default transition suggestions based on pattern
  switch (transitionPattern) {
    case 'opening':
      return undefined; // Opening doesn't need a transition
    case 'deepening':
      return 'Building on this foundation...';
    case 'parallel':
      return 'Another important aspect...';
    case 'bridging':
      return 'Having covered the fundamentals...';
    case 'concluding':
      return undefined; // Use specific concluding instructions instead
    default:
      return undefined;
  }
}

/**
 * Extract an opener phrase from the contextual bridge
 */
function extractBridgeOpener(
  bridge: ContentBrief['contextualBridge']
): string | undefined {
  if (!bridge) return undefined;

  // Check if it's the new ContextualBridgeSection format (has 'type' and 'content')
  if (typeof bridge === 'object' && !Array.isArray(bridge) && 'type' in bridge && 'content' in bridge) {
    const bridgeSection = bridge as ContextualBridgeSection;
    // Extract first sentence from the content as opener suggestion
    if (bridgeSection.content) {
      const sentences = splitSentences(bridgeSection.content);
      const firstSentence = sentences[0]?.trim();
      return firstSentence || undefined;
    }
  }

  // Legacy array format - extract from first item if it has anchor_text
  if (Array.isArray(bridge) && bridge.length > 0) {
    const first = bridge[0];
    if (typeof first === 'object' && 'anchor_text' in first) {
      return `Continuing with ${first.anchor_text}...`;
    }
  }

  return undefined;
}

/**
 * Get the full contextual bridge content for zone transitions
 * This includes the transition paragraphs that should be rendered in the content
 */
function getFullBridgeContent(brief: ContentBrief): string | undefined {
  if (!brief.contextualBridge) return undefined;

  // Check if it's the new ContextualBridgeSection format
  if (typeof brief.contextualBridge === 'object' &&
      !Array.isArray(brief.contextualBridge) &&
      'type' in brief.contextualBridge &&
      'content' in brief.contextualBridge) {
    const bridgeSection = brief.contextualBridge as ContextualBridgeSection;
    return bridgeSection.content || undefined;
  }

  return undefined;
}

/**
 * Describe the attribute progression at this point in the article
 */
function describeProgression(
  index: number,
  allSections: SectionDefinition[],
  brief: ContentBrief
): string {
  if (index === 0) {
    return 'Opening the article - establish core concepts';
  }

  if (index === allSections.length - 1) {
    return 'Closing the article - synthesize and conclude';
  }

  // Analyze sections before this point
  const previousSections = allSections.slice(0, index);
  const rootCount = countSectionsWithCategory(previousSections, brief, 'ROOT');
  const rareCount = countSectionsWithCategory(previousSections, brief, 'RARE');
  const uniqueCount = countSectionsWithCategory(previousSections, brief, 'UNIQUE');

  // Determine progression stage
  if (rootCount < 2) {
    return 'Foundation phase - establishing core attributes';
  }

  if (uniqueCount < 2 && rareCount < 2) {
    return 'Differentiation phase - building unique value';
  }

  return 'Depth phase - exploring detailed aspects';
}

/**
 * Count sections with a specific attribute category
 */
function countSectionsWithCategory(
  sections: SectionDefinition[],
  brief: ContentBrief,
  category: AttributeCategory
): number {
  let count = 0;
  for (const section of sections) {
    const briefSection = findBriefSection(section, brief);
    if (briefSection?.attribute_category === category) {
      count++;
    }
  }
  return count;
}

export default { buildFlowGuidance };
