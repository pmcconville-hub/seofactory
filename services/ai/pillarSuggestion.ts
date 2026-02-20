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
  detectedLanguage: string;
  detectedRegion: string;
}

/**
 * Suggest SEO pillars (CE, SC, CSI) from business context.
 * Called when the user reaches the Strategy step with business info but no pillars.
 */
export async function suggestPillarsFromBusinessInfo(
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): Promise<PillarSuggestionResult> {
  const { seedKeyword, industry, valueProp, audience, domain, language, targetMarket, region } = businessInfo;

  // Detect language signals from existing business info content
  const hasExplicitLanguage = !!language && language !== 'en';
  const hasExplicitMarket = !!targetMarket && targetMarket !== 'United States';

  // Extract TLD from domain for language/region hints
  let domainTLD = '';
  if (domain) {
    try {
      const hostname = new URL(domain.startsWith('http') ? domain : `https://${domain}`).hostname;
      domainTLD = hostname.split('.').pop() || '';
    } catch { /* ignore */ }
  }

  const prompt = `You are a Holistic SEO strategist specializing in the five-component framework: Central Entity (CE), Source Context (SC), Central Search Intent (CSI), Core Section (CS), and Author Section (AS).

Given the following business context, derive the optimal SEO pillars.

BUSINESS CONTEXT:
- Seed Keyword / Core Topic: "${seedKeyword}"
- Industry: "${industry}"
- Value Proposition: "${valueProp}"
- Target Audience: "${audience}"
- Domain: "${domain || 'not specified'}"${domainTLD ? ` (TLD: .${domainTLD})` : ''}
- Language (if known): "${language || 'detect from content'}"
- Target Market (if known): "${targetMarket || 'detect from content'}"${region ? `\n- Region: "${region}"` : ''}

LANGUAGE & REGION DETECTION — CRITICAL:
First, detect the website's language and target region from ALL available signals:
1. The VALUE PROPOSITION text — what language is it written in?
2. The TARGET AUDIENCE text — what language?
3. The domain TLD (.nl = Netherlands, .de = Germany, .fr = France, .be = Belgium, .es = Spain, .uk = United Kingdom, etc.)
4. The explicitly provided language/market fields (if non-empty and not "en"/"United States")
Only default to "en" / "Global" if there are absolutely no signals.

PILLAR SUGGESTIONS — must be in the DETECTED language (not English, unless the detected language IS English):
1. **Central Entity (CE)**: The single unambiguous entity this website should be the definitive source for. Must be a noun or noun phrase (not a keyword). Write in the website's language.

2. **Source Context (SC)**: The authority type — how the website positions itself as a source. Write in the website's language (e.g., for Dutch: "B2B dienstverlener", for German: "B2B-Dienstleister").

3. **Central Search Intent (CSI)**: The primary search predicates users combine with the CE. Predicates must be in the website's language.

4. **SC Attribute Priorities**: Key authority attributes in the website's language.

Return JSON:
{
  "centralEntity": "string — the CE noun/phrase in the website's language",
  "sourceContext": "string — the SC authority type in the website's language",
  "centralSearchIntent": "string — one-sentence CSI description in the website's language",
  "csiPredicates": ["verb1", "verb2", "verb3", "verb4", "verb5"],
  "scPriorities": ["priority1", "priority2", "priority3"],
  "reasoning": "Brief explanation (in English) of why these pillars are optimal",
  "detectedLanguage": "ISO 639-1 language code (e.g., 'nl', 'de', 'en', 'fr', 'es')",
  "detectedRegion": "Country name (e.g., 'Netherlands', 'Germany', 'United States')"
}`;

  const fallback: PillarSuggestionResult = {
    centralEntity: seedKeyword || '',
    sourceContext: industry ? `${industry} provider` : '',
    centralSearchIntent: '',
    csiPredicates: [],
    scPriorities: [],
    reasoning: 'Fallback — AI suggestion unavailable',
    detectedLanguage: language || '',
    detectedRegion: targetMarket || region || '',
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
      detectedLanguage: result.detectedLanguage || fallback.detectedLanguage,
      detectedRegion: result.detectedRegion || fallback.detectedRegion,
    };
  } catch (err) {
    console.warn('[pillarSuggestion] AI suggestion failed, using fallback:', err);
    return fallback;
  }
}
