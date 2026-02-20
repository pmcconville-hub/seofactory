/**
 * Pillar Suggestion Service
 *
 * Derives CE/SC/CSI suggestions from business info gathered during the crawl step.
 * Used by PipelineStrategyStep to auto-fill strategy fields.
 */

import type { BusinessInfo, SEOPillars } from '../../types';
import type { AppAction } from '../../state/appState';
import { dispatchToProvider } from './providerDispatcher';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';

export interface PillarSuggestionResult {
  centralEntity: string;
  sourceContext: string;
  centralSearchIntent: string;
  csiPredicates: string[];
  scPriorities: string[];
  reasoning: string;
}

/**
 * Suggest SEO pillars (CE, SC, CSI) from business context.
 * Called when the user reaches the Strategy step with business info but no pillars.
 */
export async function suggestPillarsFromBusinessInfo(
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<PillarSuggestionResult> {
  const { seedKeyword, industry, valueProp, audience, domain, language, targetMarket } = businessInfo;

  const prompt = `You are a Holistic SEO strategist specializing in the five-component framework: Central Entity (CE), Source Context (SC), Central Search Intent (CSI), Core Section (CS), and Author Section (AS).

Given the following business context, derive the optimal SEO pillars.

BUSINESS CONTEXT:
- Seed Keyword / Core Topic: "${seedKeyword}"
- Industry: "${industry}"
- Value Proposition: "${valueProp}"
- Target Audience: "${audience}"
- Domain: "${domain || 'not specified'}"
- Language: "${language || 'en'}"
- Target Market: "${targetMarket || 'not specified'}"

TASK:
1. **Central Entity (CE)**: The single unambiguous entity this website should be the definitive source for. Must be a noun or noun phrase (not a keyword). It should appear in every H1, meta title, and meta description.

2. **Source Context (SC)**: The authority type — how the website positions itself as a source (e.g., "B2B service provider", "E-commerce retailer", "SaaS platform", "Industry expert blog"). This determines E-A-T signaling.

3. **Central Search Intent (CSI)**: The primary search predicates users combine with the CE. Provide both a description and a ranked list of predicates (verbs/action phrases).

4. **SC Attribute Priorities**: Key attributes that define this source type's authority (e.g., "certifications", "case studies", "pricing transparency").

Return JSON:
{
  "centralEntity": "string — the CE noun/phrase",
  "sourceContext": "string — the SC authority type",
  "centralSearchIntent": "string — one-sentence CSI description",
  "csiPredicates": ["verb1", "verb2", "verb3", "verb4", "verb5"],
  "scPriorities": ["priority1", "priority2", "priority3"],
  "reasoning": "Brief explanation of why these pillars are optimal for this business"
}`;

  const fallback: PillarSuggestionResult = {
    centralEntity: seedKeyword || '',
    sourceContext: industry ? `${industry} provider` : '',
    centralSearchIntent: '',
    csiPredicates: [],
    scPriorities: [],
    reasoning: 'Fallback — AI suggestion unavailable',
  };

  try {
    const result = await dispatchToProvider<PillarSuggestionResult>(businessInfo, {
      gemini: () => geminiService.generateJson(prompt, businessInfo, dispatch, fallback),
      openai: () => openAiService.generateJson(prompt, businessInfo, dispatch, fallback),
      anthropic: () => anthropicService.generateJson(prompt, businessInfo, dispatch, fallback),
      perplexity: () => perplexityService.generateJson(prompt, businessInfo, dispatch, fallback),
      openrouter: () => openRouterService.generateJson(prompt, businessInfo, dispatch, fallback),
    });

    return {
      centralEntity: result.centralEntity || fallback.centralEntity,
      sourceContext: result.sourceContext || fallback.sourceContext,
      centralSearchIntent: result.centralSearchIntent || fallback.centralSearchIntent,
      csiPredicates: Array.isArray(result.csiPredicates) ? result.csiPredicates : [],
      scPriorities: Array.isArray(result.scPriorities) ? result.scPriorities : [],
      reasoning: result.reasoning || '',
    };
  } catch (err) {
    console.warn('[pillarSuggestion] AI suggestion failed, using fallback:', err);
    return fallback;
  }
}
