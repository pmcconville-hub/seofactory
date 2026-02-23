// services/ai/queryNetworkAudit.ts
// Query Network Audit Service for competitive content analysis and gap identification

import type {
  BusinessInfo,
  QueryIntent,
  QueryNetworkNode,
  SerpCompetitorData,
  CompetitorEAV,
  InformationDensityScore,
  ContentGap,
  HeadingHierarchy,
  QueryNetworkAnalysisResult,
  QueryNetworkRecommendation,
  QueryNetworkAuditConfig,
  QueryNetworkAuditProgress,
  AttributeCategory,
  GscInsight,
  GscRow,
} from '../../types';

import { GoogleGenAI } from "@google/genai";
import { fetchSerpResults } from '../serpApiService';
import { extractPageContent } from '../jinaService';
import { validateEntityAuthority } from '../googleKnowledgeGraphService';
import { sanitizeTextInput, validateUrl } from '../../utils/inputValidation';
import { API_ENDPOINTS } from '../../config/apiEndpoints';
import { getDefaultModel } from '../../config/serviceRegistry';
import { CompetitorTracker } from '../competitorTracker';
import { detectIndustryType, getHighPriorityMissing, getMissingPredicates } from './eavService';
import type { IndustryType } from './eavService';
export type { CompetitorSnapshot, CompetitorComparisonReport } from '../competitorTracker';

// Progress callback type
type ProgressCallback = (progress: QueryNetworkAuditProgress) => void;

/**
 * Execute a prompt against the configured AI provider and return raw text response
 */
async function executePrompt(prompt: string, businessInfo: BusinessInfo): Promise<string> {
  const provider = businessInfo.aiProvider || 'gemini';

  switch (provider) {
    case 'gemini': {
      if (!businessInfo.geminiApiKey) {
        throw new Error('Gemini API key not configured');
      }
      const ai = new GoogleGenAI({ apiKey: businessInfo.geminiApiKey });
      const model = businessInfo.aiModel || 'gemini-2.5-flash';
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          maxOutputTokens: 8192,
          responseMimeType: 'text/plain',
        },
      });
      return response.text || '';
    }

    case 'anthropic': {
      if (!businessInfo.anthropicApiKey || !businessInfo.supabaseUrl) {
        throw new Error('Anthropic API key or Supabase URL not configured');
      }
      const proxyUrl = `${businessInfo.supabaseUrl}/functions/v1/anthropic-proxy`;
      const model = businessInfo.aiModel || 'claude-sonnet-4-5-20250929';

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-anthropic-api-key': businessInfo.anthropicApiKey,
          'apikey': businessInfo.supabaseAnonKey || '',
          'Authorization': `Bearer ${businessInfo.supabaseAnonKey || ''}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json();
      const textBlock = data.content?.find((b: any) => b.type === 'text');
      return textBlock?.text || '';
    }

    case 'openai': {
      if (!businessInfo.openAiApiKey) {
        throw new Error('OpenAI API key not configured');
      }
      const model = businessInfo.aiModel || getDefaultModel('openai');
      const response = await fetch(API_ENDPOINTS.OPENAI, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${businessInfo.openAiApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 8192,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }

    case 'openrouter': {
      if (!businessInfo.openRouterApiKey) {
        throw new Error('OpenRouter API key not configured');
      }
      const model = businessInfo.aiModel || 'anthropic/claude-3.5-sonnet';
      const response = await fetch(API_ENDPOINTS.OPENROUTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${businessInfo.openRouterApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 8192,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }

    case 'perplexity': {
      if (!businessInfo.perplexityApiKey) {
        throw new Error('Perplexity API key not configured');
      }
      const model = businessInfo.aiModel || 'llama-3.1-sonar-large-128k-online';
      const response = await fetch(API_ENDPOINTS.PERPLEXITY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${businessInfo.perplexityApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 8192,
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * Generate a network of related queries from a seed keyword
 */
export async function generateQueryNetwork(
  seedKeyword: string,
  businessInfo: BusinessInfo,
  maxQueries: number = 20,
  pillars?: QueryNetworkAuditConfig['pillars'],
  existingEavs?: QueryNetworkAuditConfig['existingEavs']
): Promise<QueryNetworkNode[]> {
  // Sanitize external seed keyword input
  seedKeyword = sanitizeTextInput(seedKeyword, 200);

  const centralEntity = pillars?.centralEntity || seedKeyword;
  const contentAreaBlock = pillars?.contentAreas?.length
    ? `\n## Content Areas\n${pillars.contentAreas.map((ca, i) => `- ${ca} (${pillars.contentAreaTypes?.[i] === 'revenue' ? 'Core Section' : 'Author Section'})`).join('\n')}`
    : '';
  const eavBlock = existingEavs?.length
    ? `\n## Known Entity Facts (EAV Triples)\n${existingEavs.slice(0, 20).map(e => `- ${e.subject} → ${e.predicate}: ${e.object}`).join('\n')}`
    : '';

  const prompt = `You are a Semantic SEO specialist using the Cost of Retrieval framework.
Analyze the competitive landscape for this business entity.

## Business Entity
- Central Entity (CE): "${centralEntity}"
- Source Context (SC): "${pillars?.sourceContext || businessInfo.valueProp || ''}"
  (How this business creates value / monetizes)
- Central Search Intent (CSI): "${pillars?.centralSearchIntent || ''}"
  (The core action connecting the entity to its audience)
${pillars?.csiPredicates?.length ? `- CSI Predicates: ${pillars.csiPredicates.join(', ')}` : ''}
- Industry: ${businessInfo.industry}
- Target Market: ${businessInfo.targetMarket}
- Language: ${businessInfo.language}
${contentAreaBlock}
${eavBlock}

## Task
Generate ${maxQueries} search queries representing the COMPETITIVE LANDSCAPE.
These are queries where competitors rank and this business needs to compete.

Query categories (at least 2 per category):
1. **Attribute queries** — queries about specific attributes competitors publish
   (pricing, specifications, materials, certifications, service areas)
2. **Process expertise** — queries proving domain mastery
   (how-to, installation, troubleshooting, maintenance)
3. **Comparison/commercial** — queries from buyers comparing options
   ("[entity] vs [alternative]", "best [industry] in [region]", "[service] reviews")
4. **CSI-aligned** — queries matching the Central Search Intent predicates
   ${pillars?.csiPredicates?.length ? `(${pillars.csiPredicates.join(', ')})` : '(action verbs connecting entity to audience)'}
5. **Trust/authority** — queries signaling expertise
   (certifications, case studies, team credentials, warranties)

RULES:
- Do NOT generate basic "What is X?" definitional queries
- Every query must represent a CONTENT OPPORTUNITY the business can act on
- All queries in ${businessInfo.language}
- Include intent classification per query

For each query, provide:
1. The query text
2. Search intent classification: "informational", "commercial", "transactional", or "navigational"
3. Related variations (2-3 similar queries)
4. Questions users might ask (2-3 questions)

Return as JSON array:
[
  {
    "query": "the search query",
    "intent": "informational",
    "relatedQueries": ["variation 1", "variation 2"],
    "questions": ["question 1?", "question 2?"]
  }
]`;

  try {
    const response = await executePrompt(prompt, businessInfo);

    // Parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[QueryNetworkAudit] Failed to parse query network response');
      return [];
    }

    const queries = JSON.parse(jsonMatch[0]) as QueryNetworkNode[];

    // Add search volume and difficulty placeholders (would come from DataForSEO)
    return queries.map(q => ({
      ...q,
      searchVolume: undefined,
      difficulty: undefined
    }));
  } catch (error) {
    console.error('[QueryNetworkAudit] Error generating query network:', error);
    return [];
  }
}

/**
 * Classify query intent using AI
 */
export async function classifyQueryIntent(
  query: string,
  businessInfo: BusinessInfo
): Promise<QueryIntent> {
  // Sanitize external query input
  query = sanitizeTextInput(query, 200);

  const prompt = `Classify the search intent of this query: "${query}"

Context: Industry is "${businessInfo.industry || 'general'}", target market is "${businessInfo.targetMarket || 'general'}".

Return ONLY one of these values:
- informational (user wants to learn/understand)
- commercial (user is researching before purchase)
- transactional (user wants to buy/sign up now)
- navigational (user looking for specific site/page)

Response:`;

  try {
    const response = await executePrompt(prompt, businessInfo);
    const intent = response.toLowerCase().trim() as QueryIntent;

    if (['informational', 'commercial', 'transactional', 'navigational'].includes(intent)) {
      return intent;
    }

    return 'informational'; // Default
  } catch (error) {
    console.error('[QueryNetworkAudit] Error classifying intent:', error);
    return 'informational';
  }
}

/**
 * Fetch SERP results for a query and extract competitor data
 */
export async function fetchCompetitorData(
  query: string,
  businessInfo: BusinessInfo,
  maxCompetitors: number = 10
): Promise<SerpCompetitorData[]> {
  if (!businessInfo.dataforseoLogin || !businessInfo.dataforseoPassword) {
    console.warn('[QueryNetworkAudit] DataForSEO credentials not configured');
    return [];
  }

  try {
    const serpResults = await fetchSerpResults(
      query,
      businessInfo.dataforseoLogin,
      businessInfo.dataforseoPassword,
      businessInfo.targetMarket || 'United States',
      businessInfo.language || 'en',
      { supabaseUrl: businessInfo.supabaseUrl, supabaseAnonKey: businessInfo.supabaseAnonKey }
    );

    return serpResults.slice(0, maxCompetitors)
      .filter(result => validateUrl(result.link)) // Validate external SERP URLs
      .map((result, index) => ({
        url: result.link,
        title: result.title,
        position: index + 1,
        domain: new URL(result.link).hostname,
        featuredSnippet: false // Not captured in current SERP API response
      }));
  } catch (error) {
    console.error('[QueryNetworkAudit] Error fetching SERP results:', error);
    return [];
  }
}

/**
 * Extract page content and analyze heading hierarchy
 */
export async function analyzePageStructure(
  url: string,
  businessInfo: BusinessInfo
): Promise<HeadingHierarchy | null> {
  // Validate external competitor URL
  if (!validateUrl(url)) {
    console.warn('[QueryNetworkAudit] Invalid URL provided for page structure analysis:', url);
    return null;
  }

  if (!businessInfo.jinaApiKey) {
    console.warn('[QueryNetworkAudit] Jina API key not configured');
    return null;
  }

  try {
    const content = await extractPageContent(url, businessInfo.jinaApiKey, {
      supabaseUrl: businessInfo.supabaseUrl,
      supabaseAnonKey: businessInfo.supabaseAnonKey
    });

    // Calculate hierarchy score
    let hierarchyScore = 100;
    const issues: string[] = [];

    // Check for H1
    const h1s = content.headings.filter(h => h.level === 1);
    if (h1s.length === 0) {
      hierarchyScore -= 20;
      issues.push('Missing H1 heading');
    } else if (h1s.length > 1) {
      hierarchyScore -= 10;
      issues.push('Multiple H1 headings detected');
    }

    // Check heading hierarchy (no skipping levels)
    let prevLevel = 1;
    for (const heading of content.headings) {
      if (heading.level > prevLevel + 1) {
        hierarchyScore -= 5;
        issues.push(`Heading level skipped: H${prevLevel} to H${heading.level}`);
      }
      prevLevel = heading.level;
    }

    // Check for reasonable number of headings
    if (content.headings.length < 3) {
      hierarchyScore -= 15;
      issues.push('Too few headings for content length');
    }

    return {
      url,
      headings: content.headings.map(h => ({
        level: h.level,
        text: h.text,
        wordCount: content.wordCount || 0
      })),
      hierarchyScore: Math.max(0, hierarchyScore),
      issues
    };
  } catch (error) {
    console.error('[QueryNetworkAudit] Error analyzing page structure:', error);
    return null;
  }
}

/**
 * Extract EAVs (Entity-Attribute-Value triples) from competitor content
 */
export async function extractCompetitorEAVs(
  url: string,
  content: string,
  businessInfo: BusinessInfo,
  seedEntity: string,
  pillars?: QueryNetworkAuditConfig['pillars']
): Promise<CompetitorEAV[]> {
  const centralEntity = pillars?.centralEntity || seedEntity;
  const prompt = `Extract Entity-Attribute-Value (EAV) semantic triples from this competitor content.

Central Entity being analyzed: "${centralEntity}"
${pillars?.sourceContext ? `Source Context: "${pillars.sourceContext}"` : ''}

Content:
${content.substring(0, 8000)}

Extract factual claims as triples. Focus on:
- ROOT attributes (essential definitions: what it is, where, who)
- UNIQUE attributes (differentiators specific to this source)
- SPECIFICATION attributes (measurable facts: price, size, duration)

For each fact found, extract:
1. Entity: The subject being described
2. Attribute: The property or characteristic
3. Value: The specific value or description
4. Confidence: 0-1 based on how explicit the information is

Do NOT assign categories — return "UNCLASSIFIED" for category. Categories will be computed from cross-page frequency.

Return as JSON array:
[
  {
    "entity": "entity name",
    "attribute": "attribute name",
    "value": "the value",
    "confidence": 0.9,
    "category": "UNCLASSIFIED"
  }
]

Extract 10-20 EAVs focusing on factual, specific information.`;

  try {
    const response = await executePrompt(prompt, businessInfo);

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const eavs = JSON.parse(jsonMatch[0]) as Array<{
      entity: string;
      attribute: string;
      value: string;
      confidence: number;
      category: string;
    }>;

    return eavs.map(eav => ({
      entity: eav.entity,
      attribute: eav.attribute,
      value: eav.value,
      source: url,
      confidence: eav.confidence,
      category: eav.category as AttributeCategory
    }));
  } catch (error) {
    console.error('[QueryNetworkAudit] Error extracting EAVs:', error);
    return [];
  }
}

/**
 * Calculate information density score for content.
 * When content is empty, uses a per-source sentence estimate to avoid inflated scores.
 */
export function calculateInformationDensity(
  content: string,
  eavs: CompetitorEAV[],
  estimatedSentenceCount?: number
): InformationDensityScore {
  // Count unique entities and attributes
  const uniqueEntities = new Set(eavs.map(e => e.entity.toLowerCase()));
  const uniqueAttributes = new Set(eavs.map(e => e.attribute.toLowerCase()));

  // Determine sentence count
  let sentenceCount: number;
  if (content && content.trim().length > 0) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    sentenceCount = Math.max(1, sentences.length);
  } else if (estimatedSentenceCount && estimatedSentenceCount > 0) {
    sentenceCount = estimatedSentenceCount;
  } else {
    // Estimate: ~2 EAVs per page on average, ~50 sentences per page typical
    const sourceCount = new Set(eavs.map(e => e.source)).size;
    sentenceCount = Math.max(1, sourceCount * 50);
  }

  // Calculate facts per sentence
  const factsPerSentence = eavs.length / sentenceCount;

  // Calculate density score (0-100)
  // Target: ~0.5 facts per sentence is optimal
  let densityScore = Math.min(100, factsPerSentence * 200);

  // Bonus for unique information
  const uniqueEAVs = eavs.filter(e => e.category === 'UNIQUE' || e.category === 'RARE');
  densityScore += Math.min(20, uniqueEAVs.length * 2);

  return {
    factsPerSentence: Math.round(factsPerSentence * 100) / 100,
    uniqueEntitiesCount: uniqueEntities.size,
    uniqueAttributesCount: uniqueAttributes.size,
    totalEAVs: eavs.length,
    densityScore: Math.min(100, Math.round(densityScore))
  };
}

/**
 * Assign EAV categories algorithmically based on unique source count per attribute.
 * Categories cannot be determined from a single page — only from distribution across sources.
 * Uses unique source count (not raw frequency) to avoid skew from pages with many EAVs for one attribute.
 */
function assignEavCategories(allEavs: CompetitorEAV[]): CompetitorEAV[] {
  // Count unique sources per attribute (not raw frequency)
  const attrSourceCount = new Map<string, Set<string>>();
  for (const eav of allEavs) {
    const key = eav.attribute.toLowerCase();
    if (!attrSourceCount.has(key)) {
      attrSourceCount.set(key, new Set());
    }
    attrSourceCount.get(key)!.add(eav.source);
  }
  const totalSources = new Set(allEavs.map(e => e.source)).size;

  return allEavs.map(eav => {
    if (eav.category && (eav.category as string) !== 'PENDING' && eav.category !== 'UNCLASSIFIED') return eav;
    const sourceCount = attrSourceCount.get(eav.attribute.toLowerCase())?.size || 0;
    const ratio = totalSources > 0 ? sourceCount / totalSources : 0;
    let category: AttributeCategory;
    if (ratio >= 0.7) category = 'ROOT';       // 70%+ of competitors have this
    else if (ratio >= 0.3) category = 'COMMON'; // 30-70% of competitors
    else if (sourceCount >= 2) category = 'RARE'; // At least 2 sources
    else category = 'UNIQUE';                     // Only 1 source
    return { ...eav, category };
  });
}

/**
 * Normalize text into comparable tokens for semantic matching
 */
function normalizeTokens(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\sàáâãäåæçèéêëìíîïñòóôõöùúûüý]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

/**
 * Check if two entity:attribute keys have semantic overlap (not just exact match)
 */
function hasSemanticOverlap(ownKey: string, compKey: string): boolean {
  const ownTokens = normalizeTokens(ownKey);
  const compTokens = normalizeTokens(compKey);
  if (ownTokens.length === 0 || compTokens.length === 0) return false;
  const overlap = ownTokens.filter(t => compTokens.some(ct =>
    ct === t || ct.startsWith(t) || t.startsWith(ct)
  ));
  return overlap.length / Math.min(ownTokens.length, compTokens.length) >= 0.5;
}

/**
 * Identify content gaps between own content and competitors.
 * Uses semantic token overlap instead of exact string matching.
 * Optionally matches against user's strategic EAVs.
 */
export function identifyContentGaps(
  ownEAVs: CompetitorEAV[],
  competitorEAVs: CompetitorEAV[],
  strategicEavs?: Array<{ subject: string; predicate: string; object: string; category?: string }>
): ContentGap[] {
  // Build own attribute keys (from crawled content)
  const ownKeys = ownEAVs.map(e => `${e.entity.toLowerCase()}:${e.attribute.toLowerCase()}`);

  // Also include user's strategic EAVs if provided
  if (strategicEavs?.length) {
    for (const eav of strategicEavs) {
      ownKeys.push(`${eav.subject.toLowerCase()}:${eav.predicate.toLowerCase()}`);
    }
  }

  // Group competitor EAVs by entity:attribute
  const competitorAttributeMap = new Map<string, CompetitorEAV[]>();

  for (const eav of competitorEAVs) {
    const key = `${eav.entity.toLowerCase()}:${eav.attribute.toLowerCase()}`;
    if (!competitorAttributeMap.has(key)) {
      competitorAttributeMap.set(key, []);
    }
    competitorAttributeMap.get(key)!.push(eav);
  }

  const gaps: ContentGap[] = [];

  for (const [key, eavs] of competitorAttributeMap) {
    // Check semantic overlap against all own keys (not just exact match)
    const hasMatch = ownKeys.some(ownKey => ownKey === key || hasSemanticOverlap(ownKey, key));
    if (hasMatch) continue;

    const [entity, attribute] = key.split(':');
    const sources = [...new Set(eavs.map(e => e.source))];
    const frequency = sources.length;

    // Category-weighted priority: ROOT/UNIQUE always important
    const category = eavs[0]?.category || 'COMMON';
    let priority: 'high' | 'medium' | 'low';
    if (category === 'ROOT' || category === 'UNIQUE') {
      priority = frequency >= 2 ? 'high' : 'medium';
    } else if (frequency >= 5) {
      priority = 'high';
    } else if (frequency >= 2) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    gaps.push({
      missingAttribute: `${entity} - ${attribute}`,
      foundInCompetitors: sources,
      frequency,
      priority,
      suggestedContent: eavs[0]?.value
    });
  }

  // Sort by priority then frequency
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  gaps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || b.frequency - a.frequency);

  return gaps;
}

/**
 * Generate actionable recommendations from analysis.
 * References EAV categories and framework concepts (CE, SC, CSI).
 */
export function generateRecommendations(
  result: Partial<QueryNetworkAnalysisResult>,
  pillars?: QueryNetworkAuditConfig['pillars'],
  businessInfo?: BusinessInfo,
  existingEavs?: QueryNetworkAuditConfig['existingEavs']
): QueryNetworkRecommendation[] {
  const recommendations: QueryNetworkRecommendation[] = [];
  const ce = pillars?.centralEntity || result.seedKeyword || 'your entity';

  // Content gap recommendations (when own content was analyzed)
  if (result.contentGaps?.length) {
    const highPriorityGaps = result.contentGaps.filter(g => g.priority === 'high');

    if (highPriorityGaps.length > 0) {
      // Categorize gaps by type for more specific advice
      const rootGaps = highPriorityGaps.filter(g => {
        const attr = g.missingAttribute.toLowerCase();
        return attr.includes('price') || attr.includes('location') || attr.includes('service') || attr.includes('hour');
      });
      const description = rootGaps.length > 0
        ? `${highPriorityGaps.length} critical gaps found. ${rootGaps.length} are ROOT attributes (essential facts about "${ce}" that most competitors publish).`
        : `${highPriorityGaps.length} attributes covered by most competitors are missing from your content about "${ce}".`;

      recommendations.push({
        type: 'content_gap',
        priority: 'critical',
        title: 'Address Critical EAV Gaps',
        description,
        affectedQueries: [],
        estimatedImpact: 'High - ROOT attributes are expected by search engines for entity comprehension',
        suggestedAction: `Add EAV triples for: ${highPriorityGaps.slice(0, 5).map(g => g.missingAttribute).join(', ')}`
      });
    }

    const mediumPriorityGaps = result.contentGaps.filter(g => g.priority === 'medium');
    if (mediumPriorityGaps.length > 0) {
      recommendations.push({
        type: 'content_gap',
        priority: 'high',
        title: 'Fill RARE/UNIQUE Attribute Gaps',
        description: `${mediumPriorityGaps.length} differentiating attributes found in some competitors. These are opportunities to build topical authority for "${ce}".`,
        affectedQueries: [],
        estimatedImpact: 'Medium - UNIQUE attributes reduce Cost of Retrieval for your entity',
        suggestedAction: `Consider adding: ${mediumPriorityGaps.slice(0, 5).map(g => g.missingAttribute).join(', ')}`
      });
    }
  }

  // Competitor insights recommendations (always generate based on competitor data)
  if (result.competitorEAVs?.length) {
    // Identify ROOT attributes across competitors
    const rootEAVs = result.competitorEAVs.filter(e => e.category === 'ROOT');
    const commonEAVs = result.competitorEAVs.filter(e => e.category === 'COMMON');

    if (rootEAVs.length > 0) {
      const rootAttributes = [...new Set(rootEAVs.map(e => e.attribute))].slice(0, 5);
      recommendations.push({
        type: 'content_gap',
        priority: 'high',
        title: 'Ensure ROOT Attribute Coverage',
        description: `${rootAttributes.length} ROOT attributes are published by 70%+ of competitors. These are essential facts about "${ce}" that search engines expect.`,
        affectedQueries: [],
        estimatedImpact: 'High - Missing ROOT attributes signals incomplete entity coverage',
        suggestedAction: `Verify your content includes: ${rootAttributes.join(', ')}`
      });
    }

    // Find UNIQUE/RARE EAVs - opportunities for differentiation
    const uniqueEAVs = result.competitorEAVs.filter(e => e.category === 'UNIQUE' || e.category === 'RARE');
    if (uniqueEAVs.length > 0) {
      const uniqueAttributes = [...new Set(uniqueEAVs.map(e => e.attribute))].slice(0, 5);
      recommendations.push({
        type: 'new_topic',
        priority: 'medium',
        title: 'UNIQUE Attribute Opportunities',
        description: `Found ${uniqueEAVs.length} unique/rare attributes from competitors. Publishing these about "${ce}" builds authority that competitors lack.`,
        affectedQueries: [],
        estimatedImpact: 'Medium - UNIQUE attributes are the highest-value differentiators',
        suggestedAction: `Consider covering: ${uniqueAttributes.join(', ')}`
      });
    }

    if (commonEAVs.length > 0 && rootEAVs.length === 0) {
      const commonAttributes = [...new Set(commonEAVs.map(e => e.attribute))].slice(0, 5);
      recommendations.push({
        type: 'content_gap',
        priority: 'high',
        title: 'Cover Key Competitor Attributes',
        description: `${commonAttributes.length} COMMON attributes are covered by multiple competitors for "${ce}".`,
        affectedQueries: [],
        estimatedImpact: 'High - These represent industry-standard content expectations',
        suggestedAction: `Key attributes to cover: ${commonAttributes.join(', ')}`
      });
    }
  }

  // Source Context recommendation
  if (pillars?.sourceContext && result.competitorEAVs?.length) {
    recommendations.push({
      type: 'new_topic',
      priority: 'medium',
      title: 'Align Content with Source Context',
      description: `Your Source Context is "${pillars.sourceContext}". Ensure gap-filling content reinforces how "${ce}" creates value for its audience.`,
      affectedQueries: [],
      estimatedImpact: 'Medium - Source Context alignment improves relevance for commercial queries',
      suggestedAction: `Frame new content through the lens of: ${pillars.sourceContext}`
    });
  }

  // Information density recommendations
  if (result.informationDensity) {
    const own = result.informationDensity.own;
    const avg = result.informationDensity.competitorAverage;

    if (own && own.densityScore < avg.densityScore - 10) {
      recommendations.push({
        type: 'density_improvement',
        priority: 'high',
        title: 'Increase Semantic Density',
        description: `Your content density score (${own.densityScore}) is below competitor average (${avg.densityScore}). This means competitors pack more facts per sentence about "${ce}".`,
        affectedQueries: [],
        estimatedImpact: 'High - Higher fact density reduces Cost of Retrieval for search engines',
        suggestedAction: 'Add more specific EAV triples: prices, specifications, measurements, certifications, and process details.'
      });
    } else if (!own) {
      recommendations.push({
        type: 'density_improvement',
        priority: 'medium',
        title: 'Target Competitor Semantic Density',
        description: `Top competitors average ${avg.totalEAVs} EAV triples with ${avg.factsPerSentence} facts per sentence. Use this as your content benchmark.`,
        affectedQueries: [],
        estimatedImpact: 'Medium - Matching competitor density establishes baseline',
        suggestedAction: `Aim for at least ${avg.totalEAVs} distinct facts in your content with ~${avg.factsPerSentence} facts per sentence.`
      });
    }

    if (own && own.uniqueEntitiesCount < avg.uniqueEntitiesCount * 0.7) {
      recommendations.push({
        type: 'density_improvement',
        priority: 'medium',
        title: 'Increase Entity Coverage',
        description: `Your content covers fewer unique entities (${own.uniqueEntitiesCount}) than competitors (${avg.uniqueEntitiesCount}).`,
        affectedQueries: [],
        estimatedImpact: 'Medium - Broader entity coverage improves topical authority',
        suggestedAction: 'Mention more related entities and concepts within your content.'
      });
    }
  }

  // Structure recommendations
  if (result.headingAnalysis?.length) {
    const poorStructure = result.headingAnalysis.filter(h => h.hierarchyScore < 70);

    if (poorStructure.length > result.headingAnalysis.length * 0.3) {
      recommendations.push({
        type: 'structure_fix',
        priority: 'medium',
        title: 'Improve Content Structure',
        description: `${poorStructure.length} pages have suboptimal heading hierarchies.`,
        affectedQueries: [],
        estimatedImpact: 'Medium - Clear structure aids both users and search engines',
        suggestedAction: 'Ensure proper H1-H6 hierarchy without skipping levels.'
      });
    }
  }

  // Query coverage recommendations
  if (result.queryNetwork?.length) {
    // Gather all questions from queries
    const allQuestions = result.queryNetwork.flatMap(q => q.questions);

    if (allQuestions.length > 0) {
      recommendations.push({
        type: 'new_topic',
        priority: 'high',
        title: 'Answer User Questions',
        description: `Found ${allQuestions.length} questions users are asking. Answering these can capture featured snippets.`,
        affectedQueries: result.queryNetwork.filter(q => q.questions.length > 0).map(q => q.query),
        estimatedImpact: 'High - Direct answers to questions improve rankings and featured snippet eligibility',
        suggestedAction: `Create FAQ content or dedicated sections answering: "${allQuestions.slice(0, 3).join('", "')}"`
      });
    }

    // Intent-based recommendations
    const intentCounts = {
      informational: result.queryNetwork.filter(q => q.intent === 'informational').length,
      commercial: result.queryNetwork.filter(q => q.intent === 'commercial').length,
      transactional: result.queryNetwork.filter(q => q.intent === 'transactional').length,
      navigational: result.queryNetwork.filter(q => q.intent === 'navigational').length,
    };

    const dominantIntent = Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0];

    if (dominantIntent[1] > result.queryNetwork.length * 0.4) {
      const intentStrategies: Record<string, string> = {
        informational: 'Create comprehensive educational content with definitions, guides, and how-tos.',
        commercial: 'Develop comparison content, reviews, and buying guides.',
        transactional: 'Optimize landing pages with clear CTAs and conversion elements.',
        navigational: 'Ensure strong brand presence and site structure.'
      };

      recommendations.push({
        type: 'new_topic',
        priority: 'medium',
        title: `Optimize for ${dominantIntent[0].charAt(0).toUpperCase() + dominantIntent[0].slice(1)} Intent`,
        description: `${Math.round((dominantIntent[1] / result.queryNetwork.length) * 100)}% of queries have ${dominantIntent[0]} intent.`,
        affectedQueries: result.queryNetwork.filter(q => q.intent === dominantIntent[0]).map(q => q.query),
        estimatedImpact: 'Medium - Aligning content with dominant intent improves relevance',
        suggestedAction: intentStrategies[dominantIntent[0]]
      });
    }
  }

  // Industry-specific recommendations using eavService
  if (businessInfo) {
    try {
      const industryType = detectIndustryType(businessInfo);
      // Convert existing EAVs to SemanticTriple format for eavService compatibility
      const semanticTriples = (existingEavs || []).map(eav => ({
        subject: { label: eav.subject, type: 'Entity' as const },
        predicate: { relation: eav.predicate, type: 'Property' as const, category: (eav.category || 'COMMON') as any },
        object: { value: eav.object, type: 'Value' as const },
      }));

      const highPriorityMissing = getHighPriorityMissing(semanticTriples, industryType);
      if (highPriorityMissing.length > 0) {
        recommendations.push({
          type: 'content_gap',
          priority: 'high',
          title: `${highPriorityMissing.length} Industry-Standard Attributes Missing`,
          description: `For ${industryType} businesses, these attributes are essential but not in your EAV set — and no competitor covers them either. This is a differentiation opportunity.`,
          affectedQueries: [],
          estimatedImpact: 'High - Industry-standard attributes are expected by search engines and users',
          suggestedAction: `Add these attributes for "${ce}": ${highPriorityMissing.slice(0, 5).map(p => p.relation.replace(/_/g, ' ')).join(', ')}`,
        });
      }

      const allMissing = getMissingPredicates(semanticTriples, industryType);
      const lowPriorityMissing = allMissing.filter(p => p.priority !== 'high' && !highPriorityMissing.includes(p));
      if (lowPriorityMissing.length > 0 && highPriorityMissing.length === 0) {
        recommendations.push({
          type: 'new_topic',
          priority: 'medium',
          title: `${lowPriorityMissing.length} Optional Industry Attributes`,
          description: `Additional ${industryType} attributes that could deepen your entity coverage for "${ce}".`,
          affectedQueries: [],
          estimatedImpact: 'Medium - Deeper attribute coverage builds topical authority',
          suggestedAction: `Consider adding: ${lowPriorityMissing.slice(0, 5).map(p => p.relation.replace(/_/g, ' ')).join(', ')}`,
        });
      }
    } catch {
      // Non-fatal — continue without industry recommendations
    }
  }

  // GSC-specific recommendations
  if (result.gscInsights?.length) {
    const quickWins = result.gscInsights.filter(i => i.type === 'quick_win');
    const lowCtr = result.gscInsights.filter(i => i.type === 'low_ctr');

    if (quickWins.length > 0) {
      const topQuickWins = quickWins.slice(0, 5);
      recommendations.push({
        type: 'content_gap',
        priority: 'critical',
        title: `${quickWins.length} Quick Win Opportunities (GSC Data)`,
        description: `You're ranking positions 4-20 for ${quickWins.length} queries with real search traffic. These are the fastest wins.`,
        affectedQueries: topQuickWins.map(q => q.query),
        estimatedImpact: 'High - Moving from page 2 to page 1 can 10x traffic',
        suggestedAction: `Prioritize content optimization for: ${topQuickWins.map(q => q.query).join(', ')}`,
      });
    }

    if (lowCtr.length > 0) {
      recommendations.push({
        type: 'density_improvement',
        priority: 'high',
        title: `${lowCtr.length} Low-CTR Queries Need Better Titles`,
        description: `You rank in top 5 for ${lowCtr.length} queries but CTR is below 3%. Users see your listing but don't click.`,
        affectedQueries: lowCtr.map(q => q.query),
        estimatedImpact: 'High - Improving CTR at these positions can double organic traffic',
        suggestedAction: `Review and improve title tags and meta descriptions for these queries.`,
      });
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

/**
 * Enrich query network nodes with real GSC search volume data
 */
export function enrichQueryNetworkWithGsc(
  queryNetwork: QueryNetworkNode[],
  gscData: GscRow[],
): QueryNetworkNode[] {
  const gscByQuery = new Map<string, GscRow>();
  for (const row of gscData) {
    const key = row.query.toLowerCase().trim();
    const existing = gscByQuery.get(key);
    if (!existing || row.impressions > existing.impressions) {
      gscByQuery.set(key, row);
    }
  }

  return queryNetwork.map(node => {
    const match = gscByQuery.get(node.query.toLowerCase().trim());
    if (match) {
      return {
        ...node,
        searchVolume: match.impressions,
        difficulty: match.position <= 3 ? 20 : match.position <= 10 ? 50 : 80,
      };
    }
    return node;
  });
}

/**
 * Extract GSC-based insights: quick wins, low CTR, zero-click queries
 */
export function extractGscInsights(gscData: GscRow[]): GscInsight[] {
  const insights: GscInsight[] = [];

  for (const row of gscData) {
    // Quick wins: positions 4-20 with decent impressions
    if (row.position >= 4 && row.position <= 20 && row.impressions >= 50) {
      insights.push({
        type: 'quick_win',
        query: row.query,
        impressions: row.impressions,
        clicks: row.clicks,
        ctr: row.ctr,
        position: row.position,
        recommendation: row.position <= 10
          ? `Position ${Math.round(row.position)} — optimize on-page content to reach top 3`
          : `Position ${Math.round(row.position)} — build topical depth to break into page 1`,
      });
    }

    // Low CTR: ranking well but users aren't clicking
    if (row.position <= 5 && row.impressions >= 100 && row.ctr < 0.03) {
      insights.push({
        type: 'low_ctr',
        query: row.query,
        impressions: row.impressions,
        clicks: row.clicks,
        ctr: row.ctr,
        position: row.position,
        recommendation: `Top ${Math.round(row.position)} position but only ${(row.ctr * 100).toFixed(1)}% CTR — improve title tag and meta description`,
      });
    }

    // Zero clicks despite impressions
    if (row.clicks === 0 && row.impressions >= 200) {
      insights.push({
        type: 'zero_clicks',
        query: row.query,
        impressions: row.impressions,
        clicks: 0,
        ctr: 0,
        position: row.position,
        recommendation: `${row.impressions} impressions with zero clicks — featured snippet may be capturing all traffic, or title needs improvement`,
      });
    }
  }

  // Sort by impressions (highest opportunity first)
  insights.sort((a, b) => b.impressions - a.impressions);

  return insights;
}

/**
 * Run a complete Query Network Audit
 */
export async function runQueryNetworkAudit(
  config: QueryNetworkAuditConfig,
  businessInfo: BusinessInfo,
  onProgress?: ProgressCallback
): Promise<QueryNetworkAnalysisResult> {
  const updateProgress = (
    phase: QueryNetworkAuditProgress['phase'],
    currentStep: string,
    completedSteps: number,
    totalSteps: number
  ) => {
    if (onProgress) {
      onProgress({
        phase,
        currentStep,
        totalSteps,
        completedSteps,
        progress: Math.round((completedSteps / totalSteps) * 100)
      });
    }
  };

  const maxQueries = config.maxQueries || 10;
  const maxCompetitors = config.maxCompetitors || 8;
  const hasGsc = !!(config.gscData && config.gscData.length > 0);
  const totalSteps = hasGsc ? 6 : 5;

  // Sanitize external config inputs at the system boundary
  config = {
    ...config,
    seedKeyword: sanitizeTextInput(config.seedKeyword, 200),
    targetDomain: config.targetDomain ? sanitizeTextInput(config.targetDomain, 253) : config.targetDomain,
  };

  try {
    // Step 1: Generate Query Network
    updateProgress('generating_network', 'Generating query network...', 0, totalSteps);
    let queryNetwork = await generateQueryNetwork(
      config.seedKeyword,
      businessInfo,
      maxQueries,
      config.pillars,
      config.existingEavs
    );

    // Enrich query network with GSC search volume data
    if (hasGsc) {
      queryNetwork = enrichQueryNetworkWithGsc(queryNetwork, config.gscData!);
    }

    // Step 2: Fetch SERP Results
    updateProgress('fetching_serps', 'Fetching SERP results...', 1, totalSteps);
    const serpResults = new Map<string, SerpCompetitorData[]>();

    for (const query of queryNetwork.slice(0, maxQueries)) {
      const competitors = await fetchCompetitorData(query.query, businessInfo, maxCompetitors);
      serpResults.set(query.query, competitors);

      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Step 3: Extract EAVs from top competitors
    updateProgress('extracting_eavs', 'Extracting competitor information...', 2, totalSteps);
    const allCompetitorEAVs: CompetitorEAV[] = [];
    const headingAnalysis: HeadingHierarchy[] = [];

    // Get unique competitor URLs
    const uniqueUrls = new Set<string>();
    for (const competitors of serpResults.values()) {
      for (const comp of competitors.slice(0, 5)) { // Top 5 per query
        uniqueUrls.add(comp.url);
      }
    }

    for (const url of [...uniqueUrls].slice(0, maxCompetitors)) {
      // Validate external competitor URLs before processing
      if (!validateUrl(url)) {
        console.warn(`[QueryNetworkAudit] Skipping invalid URL: ${url}`);
        continue;
      }

      try {
        // Extract page content
        if (businessInfo.jinaApiKey) {
          const content = await extractPageContent(url, businessInfo.jinaApiKey, {
            supabaseUrl: businessInfo.supabaseUrl,
            supabaseAnonKey: businessInfo.supabaseAnonKey
          });

          // Extract EAVs
          const eavs = await extractCompetitorEAVs(
            url,
            content.content,
            businessInfo,
            config.seedKeyword,
            config.pillars
          );
          allCompetitorEAVs.push(...eavs);

          // Analyze heading structure
          const hierarchy = await analyzePageStructure(url, businessInfo);
          if (hierarchy) {
            headingAnalysis.push(hierarchy);
          }
        }
      } catch (error) {
        console.error(`[QueryNetworkAudit] Error processing ${url}:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Assign EAV categories algorithmically based on cross-page frequency
    const categorizedCompetitorEAVs = assignEavCategories(allCompetitorEAVs);
    // Replace the mutable array contents with categorized versions
    allCompetitorEAVs.length = 0;
    allCompetitorEAVs.push(...categorizedCompetitorEAVs);

    // Step 4: Analyze own content (if configured)
    updateProgress('analyzing_gaps', 'Analyzing content gaps...', 3, totalSteps);
    let ownEAVs: CompetitorEAV[] | undefined;

    // Strategy A: Use crawled site inventory from Discover step (comprehensive)
    if (config.siteInventory && config.siteInventory.length > 0 && businessInfo.jinaApiKey) {
      try {
        ownEAVs = [];
        // Analyze up to 10 pages from the inventory for broad coverage
        const inventoryPages = config.siteInventory.slice(0, 10);
        for (const page of inventoryPages) {
          try {
            const content = await extractPageContent(
              page.url,
              businessInfo.jinaApiKey,
              {
                supabaseUrl: businessInfo.supabaseUrl,
                supabaseAnonKey: businessInfo.supabaseAnonKey
              }
            );

            const pageEavs = await extractCompetitorEAVs(
              page.url,
              content.content,
              businessInfo,
              config.seedKeyword,
              config.pillars
            );
            ownEAVs.push(...pageEavs);

            // Also analyze heading structure for own pages
            const hierarchy = await analyzePageStructure(page.url, businessInfo);
            if (hierarchy) {
              headingAnalysis.push(hierarchy);
            }
          } catch (pageError) {
            console.warn(`[QueryNetworkAudit] Error analyzing own page ${page.url}:`, pageError);
          }
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        if (ownEAVs.length === 0) ownEAVs = undefined;
      } catch (error) {
        console.error('[QueryNetworkAudit] Error analyzing site inventory:', error);
      }
    }
    // Strategy B: Fall back to finding own content in SERP results (legacy)
    else if (config.includeOwnContent && config.targetDomain && businessInfo.jinaApiKey) {
      try {
        // Collect ALL own pages found in SERPs (not just the first one)
        const ownUrls = new Set<string>();
        for (const competitors of serpResults.values()) {
          for (const c of competitors) {
            if (c.domain.includes(config.targetDomain!)) {
              ownUrls.add(c.url);
            }
          }
        }

        if (ownUrls.size > 0) {
          ownEAVs = [];
          for (const url of [...ownUrls].slice(0, 5)) {
            try {
              const content = await extractPageContent(
                url,
                businessInfo.jinaApiKey,
                {
                  supabaseUrl: businessInfo.supabaseUrl,
                  supabaseAnonKey: businessInfo.supabaseAnonKey
                }
              );

              const pageEavs = await extractCompetitorEAVs(
                url,
                content.content,
                businessInfo,
                config.seedKeyword,
                config.pillars
              );
              ownEAVs.push(...pageEavs);
            } catch (pageError) {
              console.warn(`[QueryNetworkAudit] Error analyzing own SERP page ${url}:`, pageError);
            }
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          if (ownEAVs.length === 0) ownEAVs = undefined;
        }
      } catch (error) {
        console.error('[QueryNetworkAudit] Error analyzing own content:', error);
      }
    }

    // Calculate information density
    const competitorAvgDensity = calculateInformationDensity(
      '', // Content not needed for average
      allCompetitorEAVs
    );

    // Find top competitor by EAV count
    const eavsByUrl = new Map<string, CompetitorEAV[]>();
    for (const eav of allCompetitorEAVs) {
      if (!eavsByUrl.has(eav.source)) {
        eavsByUrl.set(eav.source, []);
      }
      eavsByUrl.get(eav.source)!.push(eav);
    }

    let topCompetitorUrl = '';
    let maxEAVs = 0;
    for (const [url, eavs] of eavsByUrl) {
      if (eavs.length > maxEAVs) {
        maxEAVs = eavs.length;
        topCompetitorUrl = url;
      }
    }

    const topCompetitorDensity = calculateInformationDensity(
      '',
      eavsByUrl.get(topCompetitorUrl) || []
    );

    // Identify content gaps (semantic matching + user's strategic EAVs)
    const contentGaps = ownEAVs
      ? identifyContentGaps(ownEAVs, allCompetitorEAVs, config.existingEavs)
      : [];

    // Step 5: Entity validation (if configured)
    updateProgress('validating_entities', 'Validating entity authority...', 4, totalSteps);

    if (config.includeEntityValidation && businessInfo.googleKnowledgeGraphApiKey) {
      await validateEntityAuthority(
        config.seedKeyword,
        config.targetDomain,
        businessInfo.googleKnowledgeGraphApiKey,
        config.language,
        { supabaseUrl: businessInfo.supabaseUrl, supabaseAnonKey: businessInfo.supabaseAnonKey }
      );
    }

    // Step 5.5: Enrich with GSC insights (if GSC data available)
    let gscInsights: GscInsight[] | undefined;
    if (hasGsc) {
      updateProgress('enriching_gsc', 'Analyzing search performance data...', hasGsc ? 5 : 4, totalSteps);
      gscInsights = extractGscInsights(config.gscData!);
    }

    // Build site inventory summary (when available)
    let siteInventorySummary: QueryNetworkAnalysisResult['siteInventorySummary'];
    if (config.siteInventory && config.siteInventory.length > 0) {
      const pages = config.siteInventory;
      const wordCounts = pages.filter(p => p.word_count).map(p => p.word_count!);
      const avgWordCount = wordCounts.length > 0 ? Math.round(wordCounts.reduce((s, w) => s + w, 0) / wordCounts.length) : 0;
      const pagesWithH1 = pages.filter(p => p.page_h1 || (p.headings && p.headings.some(h => h.level === 1))).length;
      // Extract topics from H1/titles
      const topicsCovered = [...new Set(
        pages
          .map(p => p.page_h1 || p.title || '')
          .filter(Boolean)
      )];
      siteInventorySummary = {
        totalPages: pages.length,
        totalTopics: topicsCovered.length,
        avgWordCount,
        pagesWithH1,
        topicsCovered,
      };
    }

    // Build result
    const result: QueryNetworkAnalysisResult = {
      seedKeyword: config.seedKeyword,
      queryNetwork,
      serpResults,
      competitorEAVs: allCompetitorEAVs,
      ownContentEAVs: ownEAVs,
      contentGaps,
      informationDensity: {
        own: ownEAVs
          ? calculateInformationDensity('', ownEAVs)
          : undefined,
        competitorAverage: competitorAvgDensity,
        topCompetitor: topCompetitorDensity
      },
      headingAnalysis,
      recommendations: [],
      gscInsights,
      hasGscData: hasGsc,
      siteInventorySummary,
      timestamp: new Date().toISOString()
    };

    // Generate recommendations (includes GSC-specific ones + framework context + industry EAVs)
    result.recommendations = generateRecommendations(result, config.pillars, businessInfo, config.existingEavs);

    updateProgress('complete', 'Audit complete', totalSteps, totalSteps);

    return result;
  } catch (error) {
    console.error('[QueryNetworkAudit] Audit failed:', error);

    if (onProgress) {
      onProgress({
        phase: 'error',
        currentStep: 'Audit failed',
        totalSteps: 5,
        completedSteps: 0,
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    throw error;
  }
}

/**
 * Generate a summary report suitable for business stakeholders
 */
export function generateBusinessSummary(result: QueryNetworkAnalysisResult): string {
  const criticalRecs = result.recommendations.filter(r => r.priority === 'critical');
  const highRecs = result.recommendations.filter(r => r.priority === 'high');

  let summary = `# Query Network Analysis: ${result.seedKeyword}\n\n`;

  // Executive summary
  summary += `## Executive Summary\n\n`;
  summary += `Analyzed **${result.queryNetwork.length}** related queries and **${result.competitorEAVs.length}** competitor data points.\n\n`;

  if (criticalRecs.length > 0) {
    summary += `**${criticalRecs.length} critical issues** require immediate attention.\n`;
  }

  if (result.contentGaps.length > 0) {
    const highGaps = result.contentGaps.filter(g => g.priority === 'high');
    summary += `Found **${highGaps.length} high-priority content gaps** where competitors outperform your content.\n\n`;
  }

  // Key metrics
  summary += `## Key Metrics\n\n`;
  summary += `| Metric | Your Content | Competitor Avg | Top Competitor |\n`;
  summary += `|--------|--------------|----------------|----------------|\n`;

  if (result.informationDensity.own) {
    summary += `| Information Density | ${result.informationDensity.own.densityScore} | `;
  } else {
    summary += `| Information Density | N/A | `;
  }
  summary += `${result.informationDensity.competitorAverage.densityScore} | `;
  summary += `${result.informationDensity.topCompetitor.densityScore} |\n`;

  // Priority actions
  summary += `\n## Priority Actions\n\n`;

  for (const rec of [...criticalRecs, ...highRecs].slice(0, 5)) {
    summary += `### ${rec.title}\n`;
    summary += `**Priority:** ${rec.priority.toUpperCase()}\n\n`;
    summary += `${rec.description}\n\n`;
    summary += `**Recommended Action:** ${rec.suggestedAction}\n\n`;
  }

  return summary;
}

/**
 * Generate a detailed technical report
 */
export function generateTechnicalReport(result: QueryNetworkAnalysisResult): string {
  let report = `# Technical Audit Report: ${result.seedKeyword}\n\n`;
  report += `Generated: ${result.timestamp}\n\n`;

  // Query Network Analysis
  report += `## Query Network Analysis\n\n`;
  report += `| Query | Intent | Related Queries | Questions |\n`;
  report += `|-------|--------|-----------------|------------|\n`;

  for (const query of result.queryNetwork.slice(0, 20)) {
    report += `| ${query.query} | ${query.intent} | ${query.relatedQueries.length} | ${query.questions.length} |\n`;
  }

  // Competitor EAV Breakdown
  report += `\n## Competitor EAV Analysis\n\n`;
  report += `Total EAVs extracted: ${result.competitorEAVs.length}\n\n`;

  const eavsByCategory = new Map<string, number>();
  for (const eav of result.competitorEAVs) {
    const cat = eav.category || 'UNKNOWN';
    eavsByCategory.set(cat, (eavsByCategory.get(cat) || 0) + 1);
  }

  report += `| Category | Count |\n`;
  report += `|----------|-------|\n`;
  for (const [cat, count] of eavsByCategory) {
    report += `| ${cat} | ${count} |\n`;
  }

  // Content Gaps Detail
  report += `\n## Content Gaps (Detailed)\n\n`;

  for (const gap of result.contentGaps.slice(0, 20)) {
    report += `### ${gap.missingAttribute}\n`;
    report += `- Priority: ${gap.priority}\n`;
    report += `- Found in ${gap.frequency} competitors\n`;
    report += `- Sources: ${gap.foundInCompetitors.slice(0, 3).join(', ')}\n`;
    if (gap.suggestedContent) {
      report += `- Example value: ${gap.suggestedContent}\n`;
    }
    report += `\n`;
  }

  // Heading Hierarchy Analysis
  report += `## Page Structure Analysis\n\n`;

  for (const page of result.headingAnalysis) {
    report += `### ${page.url}\n`;
    report += `- Hierarchy Score: ${page.hierarchyScore}/100\n`;
    if (page.issues.length > 0) {
      report += `- Issues: ${page.issues.join('; ')}\n`;
    }
    report += `\n`;
  }

  return report;
}

// --- Wired Intelligence Services ---

/**
 * Compare your topics against competitor topics for longitudinal tracking.
 */
export function compareCompetitorTopics(
  yourTopics: string[],
  competitorTopicsMap: Map<string, string[]>
) {
  return CompetitorTracker.compare(yourTopics, competitorTopicsMap);
}

// Re-export CompetitorTracker for direct use by hooks/UI
export { CompetitorTracker };
