// services/ai/briefRegeneration/passes/assembly.ts
// Final pass: Assemble all regenerated parts into a coherent brief

import { ContentBrief, BriefSection } from '../../../../types';

interface MetaResult {
  title: string;
  slug: string;
  metaDescription: string;
  keyTakeaways: string[];
  perspectives: string[];
  methodology_note?: string;
  predicted_user_journey?: string;
  query_type_format?: string;
  featured_snippet_target?: any;
}

interface LinkingResult {
  contextualBridge: any;
  discourse_anchors: string[];
  visual_semantics: any[];
}

/**
 * Assemble all regenerated parts into a final coherent brief
 * Preserves original IDs and ensures all required fields are present
 */
export function assembleFinalBrief(
  originalBrief: ContentBrief,
  meta: MetaResult,
  sections: BriefSection[],
  linking: LinkingResult
): ContentBrief {
  // Generate markdown outline from sections
  const outline = sections.map(s => {
    const prefix = '#'.repeat(s.level || 2);
    return `${prefix} ${s.heading}`;
  }).join('\n');

  // Ensure all sections have required fields
  const validatedSections = sections.map((s, index) => ({
    key: s.key || `section-${index}-${Date.now()}`,
    heading: s.heading || `Section ${index + 1}`,
    level: s.level || 2,
    format_code: s.format_code || 'PROSE',
    attribute_category: s.attribute_category || 'COMMON',
    content_zone: s.content_zone || 'MAIN',
    subordinate_text_hint: s.subordinate_text_hint || '',
    methodology_note: s.methodology_note || '',
    required_phrases: s.required_phrases || [],
    anchor_texts: s.anchor_texts || []
  }));

  // Assemble the final brief
  const finalBrief: ContentBrief = {
    // Preserve original identity
    id: originalBrief.id,
    topic_id: originalBrief.topic_id,

    // Meta from Pass 1
    title: meta.title,
    slug: meta.slug,
    metaDescription: meta.metaDescription,
    keyTakeaways: meta.keyTakeaways,
    perspectives: meta.perspectives,
    methodology_note: meta.methodology_note,
    predicted_user_journey: meta.predicted_user_journey,
    query_type_format: meta.query_type_format,
    featured_snippet_target: meta.featured_snippet_target,

    // Sections from Pass 2+
    outline,
    structured_outline: validatedSections,

    // Linking from Pass N+1
    contextualBridge: linking.contextualBridge,
    discourse_anchors: linking.discourse_anchors,
    visual_semantics: linking.visual_semantics,

    // Preserve other fields from original
    serpAnalysis: originalBrief.serpAnalysis,
    visuals: originalBrief.visuals,
    contextualVectors: originalBrief.contextualVectors,
    structural_template_hash: originalBrief.structural_template_hash
  };

  return finalBrief;
}
