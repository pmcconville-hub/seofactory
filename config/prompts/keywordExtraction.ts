// config/prompts/keywordExtraction.ts
// Prompt for extracting 2-4 word searchable keywords from topic titles

import { businessContext, jsonResponseInstruction } from './_common';
import { BusinessInfo } from '../../types';

/**
 * Build prompt for extracting core search keywords from topic titles.
 * Topics are descriptive but the search keyword should be the core 2-4 word query.
 */
export const KEYWORD_EXTRACTION_PROMPT = (
  topics: { id: string; title: string }[],
  businessInfo: BusinessInfo
): string => {
  return `${businessContext(businessInfo)}

You are an SEO keyword research expert.

**TASK:** For each topic title below, extract the core 2-4 word searchable keyword that a user would actually type into Google.

**Rules:**
- Keywords must be 2-4 words (the most natural search query)
- Remove filler words like "Understanding", "Guide to", "Benefits of", "How to" unless they ARE the search intent
- Keep the core subject + modifier
- Match the language of the topic title
- Keywords should be lowercase

**Examples:**
- "Understanding the Benefits of Regular Dental Checkups" → "dental checkups benefits"
- "How to Choose the Best Running Shoes for Flat Feet" → "running shoes flat feet"
- "Complete Guide to Kitchen Renovation Costs in 2024" → "kitchen renovation costs"
- "Why Organic Dog Food Is Better for Your Pet" → "organic dog food"

**Topics to process:**
${topics.map((t, i) => `${i + 1}. [${t.id}] "${t.title}"`).join('\n')}

${jsonResponseInstruction}

Return a JSON array with objects: { "id": "topic-id", "keyword": "extracted keyword" }`;
};
