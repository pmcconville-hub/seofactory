/**
 * AI Prompts for Section Analysis
 *
 * Prompts used by LayoutIntelligenceService to analyze sections
 * and make intelligent layout decisions.
 *
 * @module services/semantic-layout/prompts/sectionAnalysis
 */

import type { ArticleContext, ArticleSectionInput } from '../types';

/**
 * Generate the section analysis prompt
 */
export function generateSectionAnalysisPrompt(
  section: ArticleSectionInput,
  context: ArticleContext,
  totalSections: number
): string {
  return `You are an expert content strategist analyzing a section for optimal web presentation.
Your goal is to determine the best way to visually present this content while maintaining semantic SEO compliance.

## BUSINESS CONTEXT
- Central Entity: ${context.business.centralEntity}
- Industry: ${context.business.industry}
- Target Audience: ${context.business.targetAudience}
- Monetization: ${context.business.monetizationModel}
- Brand Personality: ${context.business.brandPersonality.primaryTrait} (Professional: ${context.business.brandPersonality.professional}, Authoritative: ${context.business.brandPersonality.authoritative})

## CONTENT CONTEXT
- Article Title: ${context.content.title}
- Search Intent: ${context.content.searchIntent}
- Content Type: ${context.content.contentType}
- Primary Keyword: ${context.content.primaryKeyword}

## SECTION TO ANALYZE
- Position: ${section.position + 1} of ${totalSections}
- Heading Level: H${section.headingLevel}
- Heading: ${section.heading}
- Word Count: ${section.wordCount}
- Content:
"""
${section.content.substring(0, 2000)}${section.content.length > 2000 ? '...' : ''}
"""

## ANALYSIS REQUIREMENTS

1. **Content Type Classification**
   Classify the content as one of:
   - definition: Explains what something is
   - enumeration: Lists items, features, or points
   - comparison: Compares options, products, or concepts
   - process: Describes steps, how-to, or procedures
   - evidence: Contains statistics, proof, or citations
   - narrative: Tells a story or provides context
   - faq: Contains questions and answers
   - specification: Technical details or requirements
   - benefit: Advantages, value propositions
   - risk: Warnings, drawbacks, considerations

2. **Semantic Weight (1-5)**
   Rate importance based on:
   - 5: UNIQUE attributes (defining features only this entity has)
   - 4: RARE attributes (specific expertise signals)
   - 3: ROOT attributes (essential information)
   - 2: COMMON attributes (standard information)
   - 1: Supplementary (nice-to-have)

3. **Structure Analysis**
   Analyze what's IMPLICIT in the prose:
   - Can this prose be converted to a list? Count potential items.
   - Is there a comparison that could be tabled?
   - Are there statistics that should be highlighted?
   - Are there quotable insights?
   - Are there sequential steps?

4. **Featured Snippet Potential**
   - Does this section answer a direct question?
   - What format would optimize for Featured Snippets?
   - Is the current structure FS-compliant?

5. **Visual Recommendation**
   Based on content type and structure, recommend:
   - Primary component (prose, feature-cards, timeline, stat-grid, comparison-table, etc.)
   - Visual emphasis (hero, featured, standard, supporting, minimal)
   - Layout width (full, contained, narrow)
   - Background treatment (gradient, solid-primary, subtle-gray, white, transparent)

6. **Accessory Recommendations**
   - Should this section have a CTA? (Only if commercial intent makes sense)
   - Should key insights be highlighted in a callout?
   - Should statistics be elevated to a stat highlight?

## OUTPUT FORMAT
Return a JSON object with this exact structure:
{
  "contentType": "string",
  "contentTypeConfidence": 0.0-1.0,
  "contentTypeReasoning": "string",
  "semanticWeight": 1-5,
  "attributeCategory": "UNIQUE|RARE|ROOT|COMMON",
  "structureAnalysis": {
    "hasImplicitList": boolean,
    "listItemCount": number,
    "hasImplicitComparison": boolean,
    "comparisonSubjects": ["string"],
    "hasStatistics": boolean,
    "extractedStats": [{ "value": "string", "label": "string", "context": "string", "isPercentage": boolean }],
    "hasQuotableContent": boolean,
    "quotableExcerpts": ["string"],
    "hasActionableSteps": boolean,
    "stepCount": number
  },
  "fsAnalysis": {
    "hasTarget": boolean,
    "targetType": "paragraph|list|table|null",
    "targetQuestion": "string or null",
    "optimizationSuggestions": ["string"],
    "currentCompliance": 0-100
  },
  "visualRecommendation": {
    "primaryComponent": "string",
    "primaryReasoning": "string",
    "alternativeComponent": "string",
    "alternativeReasoning": "string",
    "emphasis": "hero|featured|standard|supporting|minimal",
    "layoutWidth": "full|contained|narrow",
    "backgroundTreatment": "gradient|solid-primary|solid-secondary|solid-accent|subtle-gray|white|transparent"
  },
  "accessories": {
    "addCta": boolean,
    "ctaType": "primary|secondary|inline|null",
    "ctaPlacement": "before|after|within|null",
    "ctaText": "string or null",
    "ctaReasoning": "string",
    "addCallout": boolean,
    "calloutContent": "string or null",
    "calloutType": "insight|warning|tip|quote|null",
    "addStatHighlight": boolean,
    "statContent": [{ "value": "string", "label": "string", "context": "string", "isPercentage": boolean }],
    "addVisualBreak": boolean,
    "breakType": "divider|spacing|decorative|null"
  }
}

## IMPORTANT RULES
1. Only recommend visual components the content can actually support
2. If content is pure prose with no implicit structure, recommend "prose" component
3. Only add CTAs when the search intent and business context justify it
4. Featured emphasis should be rare - use for genuinely important sections
5. Hero emphasis should be extremely rare - typically only first section or key insight
6. Consider the section's position - first sections often need more emphasis
7. For informational content without commercial angle, skip CTAs entirely

Respond ONLY with the JSON object, no additional text.`;
}

/**
 * Generate batch analysis prompt for multiple sections
 */
export function generateBatchAnalysisPrompt(
  sections: ArticleSectionInput[],
  context: ArticleContext
): string {
  const sectionSummaries = sections.map((s, i) => `
Section ${i + 1}: "${s.heading}"
- Level: H${s.headingLevel}
- Words: ${s.wordCount}
- Preview: ${s.content.substring(0, 300)}...
`).join('\n');

  return `You are analyzing multiple sections of an article to create a cohesive visual layout.

## CONTEXT
- Article: ${context.content.title}
- Intent: ${context.content.searchIntent}
- Business: ${context.business.centralEntity} (${context.business.industry})

## SECTIONS
${sectionSummaries}

## TASK
Analyze each section and ensure visual variety across the article:
1. Don't use the same component type for adjacent sections
2. Alternate emphasis levels for visual rhythm
3. Ensure background treatments create visual flow
4. Limit CTAs to 2 maximum per article
5. Stat highlights should be used sparingly (1-2 per article)

Return an array of analysis objects, one per section.`;
}

/**
 * Generate accessory decision prompt
 */
export function generateAccessoryPrompt(
  context: ArticleContext,
  sectionSummaries: string[]
): string {
  return `You are deciding what visual accessories to add to enhance this article.

## CONTEXT
- Business: ${context.business.centralEntity}
- Monetization: ${context.business.monetizationModel}
- Search Intent: ${context.content.searchIntent}
- Content Type: ${context.content.contentType}

## CURRENT SECTIONS
${sectionSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## ACCESSORY OPTIONS
- CTA: Call-to-action (use sparingly, only if commercial intent)
- Callout: Highlighted key insights
- Stat Highlight: Visual number displays
- Pull Quote: Emphasized excerpts
- Newsletter: Email signup (at end)
- Related Posts: Article links (at end)

## RULES
- Max 2 CTAs per article
- CTAs only if article has commercial angle
- Stat highlights need real numbers from content
- Pull quotes should be genuinely quotable
- Newsletter only for publisher/blog content types

## OUTPUT
Return JSON:
{
  "articleLevelAccessories": {
    "addNewsletterSignup": boolean,
    "addRelatedPosts": boolean,
    "addAuthorBio": boolean
  },
  "sectionAccessories": [
    {
      "sectionIndex": number,
      "accessories": [{ "type": "string", "position": "string", "content": {} }]
    }
  ]
}`;
}
