import type { BusinessInfo } from '../../types';
import type { AppAction } from '../../state/appState';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { dispatchToProvider } from './providerDispatcher';

export interface DetectedPageResult {
  inventoryId: string;
  url: string;
  detectedCE?: string;
  detectedSC?: string;
  detectedCSI?: string;
  language?: string;
}

export interface PillarSuggestion {
  centralEntity: string;
  centralEntityConfidence: number;
  centralEntityEvidence: string[];
  sourceContext: string;
  sourceContextConfidence: number;
  centralSearchIntent: string;
  centralSearchIntentConfidence: number;
  alternativeSuggestions: {
    centralEntity: string[];
    sourceContext: string[];
    centralSearchIntent: string[];
  };
  detectedLanguage: string;
  detectedRegion: string;
}

export class PillarDetectionService {
  aggregateFromDetections(results: DetectedPageResult[]): PillarSuggestion {
    const ceFreq = this.countFrequencies(results, 'detectedCE');
    const scFreq = this.countFrequencies(results, 'detectedSC');
    const csiFreq = this.countFrequencies(results, 'detectedCSI');
    const langFreq = this.countFrequencies(results, 'language');

    const totalWithCE = results.filter(r => r.detectedCE).length;
    const totalWithSC = results.filter(r => r.detectedSC).length;
    const totalWithCSI = results.filter(r => r.detectedCSI).length;

    const primaryCE = ceFreq[0]?.[0] || 'Unknown';
    const primarySC = scFreq[0]?.[0] || 'Unknown';
    const primaryCSI = csiFreq[0]?.[0] || 'Unknown';
    const primaryLang = langFreq[0]?.[0] || 'en';

    const ceConfidence = totalWithCE > 0 ? Math.round((ceFreq[0]?.[1] || 0) / totalWithCE * 100) : 0;
    const scConfidence = totalWithSC > 0 ? Math.round((scFreq[0]?.[1] || 0) / totalWithSC * 100) : 0;
    const csiConfidence = totalWithCSI > 0 ? Math.round((csiFreq[0]?.[1] || 0) / totalWithCSI * 100) : 0;

    const ceEvidence = results
      .filter(r => r.detectedCE === primaryCE)
      .map(r => r.url)
      .slice(0, 10);

    const altCE = ceFreq.slice(1, 4).map(([val]) => val);
    const altSC = scFreq.slice(1, 4).map(([val]) => val);
    const altCSI = csiFreq.slice(1, 4).map(([val]) => val);

    const detectedRegion = this.detectRegionFromUrls(results.map(r => r.url));

    return {
      centralEntity: primaryCE,
      centralEntityConfidence: ceConfidence,
      centralEntityEvidence: ceEvidence,
      sourceContext: primarySC,
      sourceContextConfidence: scConfidence,
      centralSearchIntent: primaryCSI,
      centralSearchIntentConfidence: csiConfidence,
      alternativeSuggestions: {
        centralEntity: altCE,
        sourceContext: altSC,
        centralSearchIntent: altCSI,
      },
      detectedLanguage: primaryLang,
      detectedRegion,
    };
  }

  /**
   * Use AI to refine the aggregated pillar suggestion into canonical, well-formed pillars.
   */
  async suggestPillarsWithAI(
    aggregation: PillarSuggestion,
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<AppAction>
  ): Promise<PillarSuggestion> {
    const prompt = `You are a Holistic SEO strategist. Given the detected semantic signals from analyzing an existing website, suggest the optimal SEO Pillars.

DETECTED FROM WEBSITE ANALYSIS:
- Most common Central Entity: "${aggregation.centralEntity}" (${aggregation.centralEntityConfidence}% of pages)
- Alternative CEs: ${aggregation.alternativeSuggestions.centralEntity.join(', ') || 'none'}
- Most common Source Context: "${aggregation.sourceContext}" (${aggregation.sourceContextConfidence}% of pages)
- Most common Search Intent: "${aggregation.centralSearchIntent}" (${aggregation.centralSearchIntentConfidence}% of pages)
- Detected language: ${aggregation.detectedLanguage}
- Detected region: ${aggregation.detectedRegion}

BUSINESS CONTEXT:
- Domain: ${businessInfo.domain}
- Industry: ${businessInfo.industry}
- Audience: ${businessInfo.audience}

TASK: Suggest the OPTIMAL pillars for this website. The CE must be a single unambiguous entity (not a keyword). The SC must describe the authority type. The CSI must be in [VERB] + [OBJECT] format.

Return JSON:
{
  "centralEntity": "string",
  "sourceContext": "string",
  "centralSearchIntent": "string",
  "reasoning": "string explaining why these are optimal"
}`;

    const fallback = {
      centralEntity: aggregation.centralEntity,
      sourceContext: aggregation.sourceContext,
      centralSearchIntent: aggregation.centralSearchIntent,
      reasoning: 'Used detected values as-is (AI refinement failed)',
    };

    try {
      const result = await dispatchToProvider<typeof fallback>(businessInfo, {
        gemini: () => geminiService.generateJson(prompt, businessInfo, dispatch, fallback),
        openai: () => openAiService.generateJson(prompt, businessInfo, dispatch, fallback),
        anthropic: () => anthropicService.generateJson(prompt, businessInfo, dispatch, fallback),
        perplexity: () => perplexityService.generateJson(prompt, businessInfo, dispatch, fallback),
        openrouter: () => openRouterService.generateJson(prompt, businessInfo, dispatch, fallback),
      });

      return {
        ...aggregation,
        centralEntity: result.centralEntity || aggregation.centralEntity,
        sourceContext: result.sourceContext || aggregation.sourceContext,
        centralSearchIntent: result.centralSearchIntent || aggregation.centralSearchIntent,
      };
    } catch (err) {
      console.warn('[PillarDetectionService] AI refinement failed, using detected values:', err);
      return aggregation;
    }
  }

  private countFrequencies(
    results: DetectedPageResult[],
    field: keyof DetectedPageResult
  ): [string, number][] {
    const freq = new Map<string, number>();
    for (const r of results) {
      const val = r[field] as string | undefined;
      if (val) {
        freq.set(val, (freq.get(val) || 0) + 1);
      }
    }
    return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
  }

  private detectRegionFromUrls(urls: string[]): string {
    const tldCount = new Map<string, number>();
    for (const url of urls) {
      try {
        const hostname = new URL(url).hostname;
        const tld = hostname.split('.').pop() || '';
        const regionMap: Record<string, string> = {
          nl: 'Netherlands', de: 'Germany', fr: 'France', es: 'Spain',
          uk: 'United Kingdom', be: 'Belgium', it: 'Italy',
        };
        if (regionMap[tld]) {
          tldCount.set(regionMap[tld], (tldCount.get(regionMap[tld]) || 0) + 1);
        }
      } catch { /* ignore invalid URLs */ }
    }

    if (tldCount.size === 0) return 'Global';
    return Array.from(tldCount.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }
}
