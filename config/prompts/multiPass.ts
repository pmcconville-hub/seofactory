// config/prompts/multiPass.ts
// Pass 2-7 content optimization prompts

import { ContentBrief, BusinessInfo } from '../../types';
import { getLanguageName } from '../../utils/languageUtils';

/**
 * Pass 2: Header Optimization
 * Optimizes heading hierarchy and contextual overlap
 */
export const PASS_2_HEADER_OPTIMIZATION_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor specializing in heading optimization.

**LANGUAGE: ${getLanguageName(info.language)} | Target: ${info.targetMarket || 'Global'}** - Maintain the original language throughout.

## Current Draft
${draft}

## Central Entity: ${info.seedKeyword}
## Title: ${brief.title}

## Header H Rules to Apply:
1. **H1 contains Central Entity + Main Attribute** - Verify the title reflects the main topic
2. **Straight Line Flow**: H1→H2→H3 must follow logical, incremental order
3. **Contextual Overlap**: Each H2/H3 must contain terms linking back to the Central Entity
4. **No Level Skips**: Never skip from H2 to H4
5. **Heading Order**: Definition → Types → Benefits → How-to → Risks → Conclusion
6. **Query Pattern Matching**: Headings should match likely search queries in ${getLanguageName(info.language)}

## Instructions:
1. Review all headings for hierarchy and flow
2. Ensure each heading includes a contextual term related to "${info.seedKeyword}"
3. Reorder sections if they don't follow logical flow
4. Fix any level skips
5. Make headings more specific where generic
6. **KEEP ALL CONTENT IN ${getLanguageName(info.language)}** - Do not translate or change language

Return the COMPLETE optimized article with all content preserved. Do not summarize or truncate. Maintain ${getLanguageName(info.language)} language.
`;

/**
 * Pass 3: List & Table Optimization
 * Converts content to structured data for Featured Snippets
 */
export const PASS_3_LIST_TABLE_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor specializing in structured data optimization.

**LANGUAGE: ${getLanguageName(info.language)} | Target: ${info.targetMarket || 'Global'}** - Maintain the original language throughout.

## Current Draft
${draft}

## List & Table Rules to Apply:
1. **Ordered Lists (<ol>)**: Use ONLY for rankings, steps, or superlatives ("Top 10", "How to")
2. **Unordered Lists (<ul>)**: Use for types, examples, components where order doesn't matter
3. **List Preamble**: Every list MUST be preceded by a sentence with exact count ("The 5 main types include:")
4. **Table Structure**: Columns = attributes (Price, Speed), Rows = entities
5. **One Fact Per Item**: Each list item delivers ONE unique EAV triple
6. **Instructional Lists**: Items in how-to lists start with command verbs

## Instructions:
1. Convert appropriate prose to lists where Featured Snippet opportunity exists
2. Ensure every list has a proper count preamble
3. Verify ordered vs unordered is semantically correct
4. Keep prose where it's more appropriate than lists
5. **KEEP ALL CONTENT IN ${getLanguageName(info.language)}** - Do not translate

Return the COMPLETE optimized article in ${getLanguageName(info.language)}. Do not summarize or truncate.
`;

/**
 * Pass 4: Visual Semantics
 * Adds image placeholders with vocabulary-extending alt text
 */
export const PASS_4_VISUAL_SEMANTICS_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor specializing in visual semantics.

**LANGUAGE: ${getLanguageName(info.language)} | Target: ${info.targetMarket || 'Global'}**

## Current Draft
${draft}

## Central Entity: ${info.seedKeyword}
## Title: ${brief.title}

## Visual Semantics Rules:
1. **Alt Tag Vocabulary Extension**: Alt tags MUST use NEW vocabulary not in H1/Title (synonyms, related terms)
2. **Context Bridging**: Alt text bridges the image to surrounding content
3. **No Image Between H and Text**: NEVER place image between heading and its subordinate text
4. **Textual Qualification**: Sentence before/after image MUST reference it
5. **LCP Prominence**: First major image relates directly to Central Entity

## Image Types to Consider:
- **HERO**: Top of page, LCP element, includes text overlay with title/keyword
- **SECTION**: Supporting content, placed AFTER definitions/explanations
- **CHART**: For statistical data, comparisons, trends
- **INFOGRAPHIC**: For bullet points, statistics, process summaries
- **DIAGRAM**: For process flows, how-to steps, decision trees

## Instructions:
Insert image placeholders using this EXACT format:
[IMAGE: detailed description of what the image should show | alt="vocabulary-extending alt text"]

Placement rules:
- HERO image: After first paragraph (LCP position)
- SECTION images: After key definitions or explanations
- CHART/INFOGRAPHIC: Where data needs visualization
- NEVER immediately after a heading - always after subordinate text

Image description should include:
- What object/scene should be depicted
- What text overlay is needed (for HERO)
- What data should be visualized (for CHART)

Examples:
[IMAGE: Hero image showing modern contract management dashboard interface with title overlay "${brief.title}" | alt="digital contract workflow automation platform interface"]

[IMAGE: Bar chart comparing contract processing times before and after automation showing 60% reduction | alt="contract automation efficiency metrics comparison"]

[IMAGE: Step-by-step diagram showing document approval workflow from submission to signature | alt="automated document approval process stages"]

**Write all descriptions and alt text in ${getLanguageName(info.language)}.**

Return the COMPLETE article with image placeholders inserted. Do not summarize or truncate.
`;

/**
 * Pass 5: Micro Semantics
 * Linguistic optimization (modality, stop words, subject positioning)
 */
export const PASS_5_MICRO_SEMANTICS_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor specializing in micro-semantic optimization. This is the most comprehensive linguistic optimization pass.

**LANGUAGE: ${getLanguageName(info.language)} | Target: ${info.targetMarket || 'Global'}** - Maintain the original language throughout all optimizations.

## Current Draft
${draft}

## Central Entity: ${info.seedKeyword}
## Title: ${brief.title}

## MICRO SEMANTICS RULES TO APPLY:

### 1. Modality Certainty
- Replace uncertain language ("can be", "might be", "could be") with definitive verbs ("is", "are")
- Only keep uncertainty for genuinely uncertain claims backed by science
- BAD: "Water can be vital for life"
- GOOD: "Water is vital for life"

### 2. Stop Word Removal
- Remove fluff words: "also", "basically", "very", "maybe", "actually", "really", "just", "quite"
- Be ESPECIALLY strict in the first 2 paragraphs
- BAD: "It also helps with digestion"
- GOOD: "It helps digestion"

### 3. Subject Positioning
- The Central Entity ("${info.seedKeyword}") must be the grammatical SUBJECT, not object
- BAD: "Financial advisors help you achieve financial independence"
- GOOD: "Financial independence relies on sufficient savings"

### 4. Definition Structure (Is-A Hypernymy)
- Definitions must follow: "[Entity] is a [Category] that [Function]"
- BAD: "Penguins swim and don't fly"
- GOOD: "A penguin is a flightless sea bird native to the Southern Hemisphere"

### 5. Information Density
- Every sentence must add a NEW fact
- No entity repetition without new attribute
- BAD: "The Glock 19 is a gun. The Glock 19 is popular."
- GOOD: "The Glock 19 weighs 30oz. It has a 15-round capacity."

### 6. Reference Principle
- Never place links at the START of a sentence
- Make your declaration first, then cite
- BAD: "[According to research], the method works"
- GOOD: "The method works effectively, as [research confirms]"

### 7. Negative Constraints
- Add "is not" clarifications for disambiguation where helpful
- Example: "This visa is not for permanent residency"

### 8. Centerpiece Annotation
- The core answer/definition must appear in the first 400 characters of main content
- Front-load the most important information

## Instructions:
Apply ALL rules above. Go sentence by sentence if needed. This pass dramatically impacts search engine comprehension.
**KEEP ALL CONTENT IN ${getLanguageName(info.language)}** - Do not translate.

Return the COMPLETE optimized article in ${getLanguageName(info.language)}. Do not summarize or truncate.
`;

/**
 * Pass 6: Discourse Integration
 * Improves transitions and contextual bridges
 */
export const PASS_6_DISCOURSE_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor specializing in discourse integration.

**LANGUAGE: ${getLanguageName(info.language)} | Target: ${info.targetMarket || 'Global'}** - Maintain the original language throughout.

## Current Draft
${draft}

## Discourse Anchors (transition words to use)
${brief.discourse_anchors?.join(', ') || 'contextual, semantic, optimization, framework, methodology'}

## Discourse Rules:
1. **Paragraph Transitions**: End of paragraph A should hook into start of paragraph B
2. **Contextual Bridges**: Use bridge sentences when moving between sub-topics
3. **Anchor Segments**: Include mutual words (discourse anchors) at transitions
4. **Annotation Text**: Text surrounding links must explain WHY the link exists
5. **Link Micro-Context**: "For more details on **engine performance**, check our guide on [V8 Engines]"

## Instructions:
1. Add transitional sentences between major sections
2. Ensure internal links have proper annotation text
3. Use discourse anchors naturally at paragraph transitions
4. Smooth any abrupt topic changes
5. **KEEP ALL CONTENT IN ${getLanguageName(info.language)}** - Do not translate

Return the COMPLETE article with improved flow in ${getLanguageName(info.language)}. Do not summarize or truncate.
`;

/**
 * Pass 7: Introduction Synthesis
 * Rewrites introduction based on complete content
 */
export const PASS_7_INTRO_SYNTHESIS_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor rewriting the introduction AFTER the full article exists.

**LANGUAGE: ${getLanguageName(info.language)} | Target: ${info.targetMarket || 'Global'}** - Write the introduction in ${getLanguageName(info.language)}.

## Full Article
${draft}

## Brief Info
Title: ${brief.title}
Central Entity: ${info.seedKeyword}
Key Takeaways: ${brief.keyTakeaways?.join(', ') || 'N/A'}
Featured Snippet Target: ${brief.featured_snippet_target?.question || 'N/A'}

## Introduction Synthesis Rules:
1. **Centerpiece Annotation**: Core answer/definition in FIRST 400 characters
2. **Summary Alignment**: Synthesize all H2/H3 topics in the SAME ORDER as they appear
3. **Key Terms**: Include at least one term from each major section
4. **Featured Snippet**: Address the featured snippet target immediately
5. **No Fluff**: Maximum information density

## Instructions:
Write a NEW introduction (150-250 words) in ${getLanguageName(info.language)} that:
1. Starts with a direct definition/answer (centerpiece annotation)
2. Previews ALL major sections in order
3. Includes key terms from each section
4. Sets reader expectations clearly
5. **IS WRITTEN ENTIRELY IN ${getLanguageName(info.language)}** for ${info.targetMarket || 'the target market'}

Output ONLY the introduction paragraph content in ${getLanguageName(info.language)}. Do not include "## Introduction" heading.
`;
