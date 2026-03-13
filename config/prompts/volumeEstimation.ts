// config/prompts/volumeEstimation.ts
// Prompt for AI-based search volume estimation (free path)

import { businessContext, jsonResponseInstruction } from './_common';
import { BusinessInfo } from '../../types';

export interface VolumeEstimationInput {
  keyword: string;
  title: string;
  parentTitle?: string;
}

/**
 * Build prompt for estimating search volumes from topic semantics.
 * This is the "free" path - no API keys needed, AI estimates based on knowledge.
 */
export const VOLUME_ESTIMATION_PROMPT = (
  keywords: VolumeEstimationInput[],
  businessInfo: BusinessInfo
): string => {
  return `${businessContext(businessInfo)}

You are an SEO research analyst with deep knowledge of search volume patterns.

**TASK:** Estimate monthly search volumes for the keywords below. Use your knowledge of:
- Industry search patterns for "${businessInfo.industry}"
- Market size in "${businessInfo.region || businessInfo.targetMarket}"
- Language: "${businessInfo.language}"
- Typical search volume distributions for ${businessInfo.industry} topics

**Guidelines for estimation:**
- Head terms (1-2 generic words): 1,000-50,000+
- Body terms (2-3 words, moderate specificity): 100-5,000
- Long-tail (3-4 words, specific): 10-500
- Very niche/local: 0-50
- Consider the region/market size (smaller markets = lower volumes)
- Commercial/transactional keywords typically have lower volume but higher value
- Informational keywords typically have higher volume but lower conversion

**Keywords to estimate:**
${keywords.map((k, i) => `${i + 1}. Keyword: "${k.keyword}" | Topic: "${k.title}"${k.parentTitle ? ` | Parent: "${k.parentTitle}"` : ''}`).join('\n')}

${jsonResponseInstruction}

Return a JSON array:
[{
  "keyword": "the keyword",
  "estimatedMonthlyVolume": number,
  "intent": "informational" | "navigational" | "transactional" | "commercial",
  "estimatedContentDepth": number (estimated words needed: 300-3000),
  "confidence": number (0-1, your confidence in the estimate)
}]`;
};
