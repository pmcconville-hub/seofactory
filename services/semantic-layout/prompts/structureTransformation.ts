/**
 * AI Prompts for Structure Transformation
 *
 * Prompts used to transform prose content into structured data
 * that visual components can render.
 *
 * @module services/semantic-layout/prompts/structureTransformation
 */

import type { ComponentType, SectionIntelligence, ArticleSectionInput } from '../types';

/**
 * Generate prompt to transform prose to feature cards
 */
export function generateCardTransformationPrompt(
  section: ArticleSectionInput,
  intelligence: SectionIntelligence
): string {
  return `You are transforming prose content into structured feature cards.

## CONTENT
Heading: ${section.heading}
Content:
"""
${section.content}
"""

## ANALYSIS
- Detected ${intelligence.structureAnalysis.listItemCount} potential items
- Content type: ${intelligence.contentType}

## TASK
Extract distinct features, points, or items from this prose and structure them as cards.

For each card, provide:
1. title: Short title (3-7 words) - the key concept
2. description: Brief explanation (1-2 sentences)
3. icon: Suggested icon name (from common icon sets like Lucide, Heroicons)

## RULES
- Extract 3-6 cards (optimal for visual layout)
- Each card should be a distinct concept, not overlapping
- Titles should be action-oriented or noun-based
- Descriptions should be self-contained (make sense without the title)
- If fewer than 3 distinct items exist, return fewer cards
- Icons should be semantic (database for data, shield for security, etc.)

## OUTPUT
Return JSON:
{
  "introSentence": "Brief intro before the cards (optional)",
  "items": [
    {
      "title": "string",
      "description": "string",
      "icon": "string"
    }
  ],
  "confidence": 0.0-1.0
}`;
}

/**
 * Generate prompt to transform prose to timeline/steps
 */
export function generateTimelineTransformationPrompt(
  section: ArticleSectionInput,
  intelligence: SectionIntelligence
): string {
  return `You are transforming prose content into a timeline or step sequence.

## CONTENT
Heading: ${section.heading}
Content:
"""
${section.content}
"""

## ANALYSIS
- Detected ${intelligence.structureAnalysis.stepCount} potential steps
- Has actionable steps: ${intelligence.structureAnalysis.hasActionableSteps}

## TASK
Extract sequential steps, phases, or timeline events from this prose.

For each item, provide:
1. marker: Step number, date, or phase label
2. title: Short title for this step (3-7 words)
3. content: Description of what happens in this step

## RULES
- Order matters - maintain the logical sequence
- Each step should be distinct and actionable
- Markers can be numbers (1, 2, 3), phases (Phase 1), or descriptive
- If content doesn't have clear sequence, use logical ordering
- Minimum 3 steps, maximum 8 steps

## OUTPUT
Return JSON:
{
  "introSentence": "Brief intro before the timeline",
  "items": [
    {
      "marker": "string",
      "title": "string",
      "content": "string"
    }
  ],
  "timelineType": "numbered|phased|chronological",
  "confidence": 0.0-1.0
}`;
}

/**
 * Generate prompt to transform prose to comparison table
 */
export function generateTableTransformationPrompt(
  section: ArticleSectionInput,
  intelligence: SectionIntelligence
): string {
  const subjects = intelligence.structureAnalysis.comparisonSubjects.join(', ');

  return `You are transforming prose content into a comparison table.

## CONTENT
Heading: ${section.heading}
Content:
"""
${section.content}
"""

## ANALYSIS
- Comparison subjects detected: ${subjects || 'None explicitly detected'}
- Content type: ${intelligence.contentType}

## TASK
Extract comparison data and structure it as a table.

## RULES
- Identify the items being compared (columns after the first)
- Identify the attributes being compared (rows)
- First column should be the attribute names
- Cells should contain concise, comparable values
- Use consistent formatting (✓/✗ for boolean, numbers for quantities)
- Include 3-6 attributes and 2-4 comparison subjects

## OUTPUT
Return JSON:
{
  "caption": "Brief table caption",
  "headers": ["Attribute", "Option A", "Option B", ...],
  "rows": [
    ["Attribute 1", "Value A1", "Value B1", ...],
    ["Attribute 2", "Value A2", "Value B2", ...]
  ],
  "highlightFirstColumn": true,
  "confidence": 0.0-1.0
}`;
}

/**
 * Generate prompt to transform prose to stats
 */
export function generateStatsTransformationPrompt(
  section: ArticleSectionInput,
  intelligence: SectionIntelligence
): string {
  const existingStats = intelligence.structureAnalysis.extractedStats
    .map(s => `${s.value}: ${s.label}`)
    .join(', ');

  return `You are extracting statistics from prose for visual highlighting.

## CONTENT
Heading: ${section.heading}
Content:
"""
${section.content}
"""

## ALREADY DETECTED STATS
${existingStats || 'None detected yet'}

## TASK
Extract impactful statistics, numbers, and metrics from this content.

For each stat, provide:
1. value: The number/percentage (e.g., "156%", "10M", "24/7")
2. label: What the number represents (e.g., "Increase in attacks")
3. description: Optional additional context
4. trend: up/down/neutral if applicable

## RULES
- Only extract actual numbers mentioned in the content
- Don't make up statistics
- Format numbers for impact (1,000,000 → 1M)
- Percentages should include the % symbol
- Maximum 4 stats for visual balance
- Prioritize the most impactful/relevant numbers

## OUTPUT
Return JSON:
{
  "items": [
    {
      "value": "string",
      "label": "string",
      "description": "string (optional)",
      "trend": "up|down|neutral|null"
    }
  ],
  "layout": "grid|inline|featured",
  "confidence": 0.0-1.0
}`;
}

/**
 * Generate prompt to transform prose to FAQ
 */
export function generateFAQTransformationPrompt(
  section: ArticleSectionInput,
  intelligence: SectionIntelligence
): string {
  return `You are transforming content into FAQ format.

## CONTENT
Heading: ${section.heading}
Content:
"""
${section.content}
"""

## TASK
Extract or create question-answer pairs from this content.

For each FAQ item:
1. question: A clear question the content answers
2. answer: The answer from the content (1-3 sentences)

## RULES
- Questions should be how users would actually ask them
- Questions should start with What, How, Why, When, Where, Who, Can, Does, Is
- Answers should be concise and direct
- Match the question format to the answer style:
  - "What is X?" → "X is..."
  - "How do I X?" → "To X, you should..."
  - "Why does X?" → "X happens because..."
- Extract 3-6 FAQ items
- Don't repeat information across answers

## OUTPUT
Return JSON:
{
  "items": [
    {
      "question": "string",
      "answer": "string"
    }
  ],
  "style": "accordion|cards|simple",
  "confidence": 0.0-1.0
}`;
}

/**
 * Generate prompt to extract list items from prose
 */
export function generateListTransformationPrompt(
  section: ArticleSectionInput,
  intelligence: SectionIntelligence
): string {
  return `You are extracting list items from prose content.

## CONTENT
Heading: ${section.heading}
Content:
"""
${section.content}
"""

## ANALYSIS
- Detected ${intelligence.structureAnalysis.listItemCount} potential items

## TASK
Extract distinct items that should be presented as a list.

## RULES
- Each item should be a distinct point
- Items should be parallel in structure (all start with verbs, or all are nouns)
- Create an intro sentence that states the EXACT count (e.g., "There are five key factors:")
- Keep items concise (1-2 sentences max)
- Determine if list should be ordered (process, ranking) or unordered (features, benefits)

## OUTPUT
Return JSON:
{
  "introSentence": "There are X items: (MUST state exact count)",
  "items": [
    {
      "text": "string",
      "subItems": ["string"] // optional nested items
    }
  ],
  "ordered": true|false,
  "confidence": 0.0-1.0
}`;
}

/**
 * Get the appropriate transformation prompt for a component type
 */
export function getTransformationPrompt(
  componentType: ComponentType,
  section: ArticleSectionInput,
  intelligence: SectionIntelligence
): string {
  switch (componentType) {
    case 'feature-cards':
    case 'step-cards':
      return generateCardTransformationPrompt(section, intelligence);

    case 'timeline':
    case 'numbered-list':
      return generateTimelineTransformationPrompt(section, intelligence);

    case 'comparison-table':
    case 'data-table':
      return generateTableTransformationPrompt(section, intelligence);

    case 'stat-grid':
    case 'stat-highlight':
      return generateStatsTransformationPrompt(section, intelligence);

    case 'faq-accordion':
    case 'faq-cards':
      return generateFAQTransformationPrompt(section, intelligence);

    case 'bulleted-list':
    case 'checklist':
      return generateListTransformationPrompt(section, intelligence);

    default:
      // For prose and other simple components, no transformation needed
      return '';
  }
}
