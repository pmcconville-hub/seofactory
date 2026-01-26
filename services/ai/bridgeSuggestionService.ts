/**
 * Bridge Suggestion Service
 *
 * Generates AI-powered suggestions for bridging structural holes between topic clusters.
 * Uses the Holistic SEO framework to create:
 * - EAV-structured research questions
 * - Topic titles with CSI (Central Search Intent) predicates
 * - Optional content brief outlines with internal linking strategies
 */

import { BusinessInfo } from '../../types';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';

// =============================================================================
// TYPES
// =============================================================================

export interface BridgeSuggestionInput {
  clusterATerms: string[];
  clusterBTerms: string[];
  centralEntity: string;
  sourceContext: string;
  centralSearchIntent: string[];
  businessInfo?: BusinessInfo;
}

export interface ResearchQuestion {
  question: string;
  targetAttribute: 'unique' | 'root' | 'rare';
  entityA: string;
  entityB: string;
}

export interface TopicSuggestion {
  title: string;
  predicates: string[];
  bridgesEntities: [string, string];
}

export interface BridgeBriefOutline {
  centralEntity: string;
  sourceContextConnection: string;
  attributePrioritization: {
    unique: string[];
    root: string[];
    rare: string[];
  };
  headingVector: string[];
  internalLinks: {
    from: string[];
    to: string[];
  };
}

export interface BridgeSuggestion {
  researchQuestions: ResearchQuestion[];
  topicSuggestions: TopicSuggestion[];
  briefOutline?: BridgeBriefOutline;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Build the prompt for AI to generate bridge suggestions
 */
function buildBridgeSuggestionPrompt(input: BridgeSuggestionInput, includeOutline: boolean): string {
  const {
    clusterATerms,
    clusterBTerms,
    centralEntity,
    sourceContext,
    centralSearchIntent,
    businessInfo,
  } = input;

  const clusterAList = clusterATerms.length > 0 ? clusterATerms.join(', ') : 'No terms';
  const clusterBList = clusterBTerms.length > 0 ? clusterBTerms.join(', ') : 'No terms';
  const intentList = centralSearchIntent.join('; ');

  let businessContext = '';
  if (businessInfo) {
    businessContext = `
Business Context:
- Industry: ${businessInfo.industry}
- Target Audience: ${businessInfo.audience}
- Value Proposition: ${businessInfo.valueProp}
- Expertise Area: ${businessInfo.expertise}
`;
  }

  let outlineInstructions = '';
  if (includeOutline) {
    outlineInstructions = `

4. "briefOutline" - A content brief outline object with:
   - "centralEntity": The main entity this content centers on
   - "sourceContextConnection": How the source context connects to the bridge topic
   - "attributePrioritization": Object with "unique", "root", and "rare" arrays of attribute focuses
   - "headingVector": Array of suggested H2 headings for the content
   - "internalLinks": Object with "from" (topics linking TO this bridge) and "to" (topics this bridge links TO)`;
  }

  return `You are a semantic SEO expert specializing in topical map architecture and structural hole bridging.

## Task
Analyze the following structural hole between two topic clusters and generate bridge content suggestions.

## Structural Hole Analysis

**Cluster A Terms:** ${clusterAList}
**Cluster B Terms:** ${clusterBList}
**Central Entity:** ${centralEntity}
**Source Context:** ${sourceContext}
**Central Search Intent:** ${intentList}
${businessContext}
## Requirements

Generate suggestions to bridge the structural hole between these clusters. A structural hole is a gap in the knowledge graph where two clusters have weak or no connections, representing a content opportunity.

Your response must be valid JSON with:

1. "researchQuestions" - Array of 2-4 research questions that would uncover bridge content. Each question must have:
   - "question": A specific question exploring the relationship between cluster entities
   - "targetAttribute": One of "unique", "root", or "rare" (EAV attribute categories)
   - "entityA": An entity from Cluster A or the central entity
   - "entityB": An entity from Cluster B or the central entity

2. "topicSuggestions" - Array of 2-3 topic suggestions that bridge the clusters. Each must have:
   - "title": A compelling topic title that connects both clusters
   - "predicates": Array of 2-4 verb predicates (CSI predicates like "uses", "enables", "transforms")
   - "bridgesEntities": Array of exactly 2 strings [entityFromClusterA, entityFromClusterB]

3. Focus on semantic relationships that would naturally connect these clusters in a knowledge graph.
${outlineInstructions}

## Response Format
Return ONLY valid JSON, no markdown code blocks or explanations.

Example structure:
{
  "researchQuestions": [
    {
      "question": "How does [Entity A] integrate with [Entity B] for [purpose]?",
      "targetAttribute": "unique",
      "entityA": "Entity A",
      "entityB": "Entity B"
    }
  ],
  "topicSuggestions": [
    {
      "title": "Connecting [A] and [B]: A Complete Guide",
      "predicates": ["connects", "enables", "optimizes"],
      "bridgesEntities": ["Entity A", "Entity B"]
    }
  ]${includeOutline ? `,
  "briefOutline": {
    "centralEntity": "${centralEntity}",
    "sourceContextConnection": "Description of connection",
    "attributePrioritization": {
      "unique": ["unique attribute 1"],
      "root": ["root attribute 1"],
      "rare": ["rare attribute 1"]
    },
    "headingVector": ["Heading 1", "Heading 2", "Heading 3"],
    "internalLinks": {
      "from": ["Topic linking to this"],
      "to": ["Topic this links to"]
    }
  }` : ''}
}`;
}

/**
 * Generate fallback suggestions when AI fails
 */
function generateFallbackSuggestions(input: BridgeSuggestionInput, includeOutline: boolean): BridgeSuggestion {
  const { clusterATerms, clusterBTerms, centralEntity, sourceContext } = input;

  // Pick representative entities from each cluster
  const entityA = clusterATerms[0] || centralEntity;
  const entityB = clusterBTerms[0] || centralEntity;

  const researchQuestions: ResearchQuestion[] = [
    {
      question: `How does ${entityA} relate to ${entityB} in the context of ${sourceContext}?`,
      targetAttribute: 'root',
      entityA,
      entityB,
    },
    {
      question: `What unique attributes connect ${centralEntity} to both ${entityA} and ${entityB}?`,
      targetAttribute: 'unique',
      entityA: centralEntity,
      entityB: entityA !== centralEntity ? entityA : entityB,
    },
  ];

  const topicSuggestions: TopicSuggestion[] = [
    {
      title: `Understanding ${entityA} and ${entityB}: A ${sourceContext} Perspective`,
      predicates: ['connects', 'relates', 'influences'],
      bridgesEntities: [entityA, entityB],
    },
    {
      title: `How ${centralEntity} Bridges ${entityA} and ${entityB}`,
      predicates: ['bridges', 'unifies', 'integrates'],
      bridgesEntities: [entityA, entityB],
    },
  ];

  const result: BridgeSuggestion = {
    researchQuestions,
    topicSuggestions,
  };

  if (includeOutline) {
    result.briefOutline = {
      centralEntity,
      sourceContextConnection: `${sourceContext} provides the framework for understanding how ${entityA} and ${entityB} interact.`,
      attributePrioritization: {
        unique: [`${centralEntity}'s distinctive approach`],
        root: [`Core relationship between ${entityA} and ${entityB}`],
        rare: [`Uncommon applications bridging both domains`],
      },
      headingVector: [
        `Introduction to ${entityA} and ${entityB}`,
        `How ${centralEntity} Connects Both Domains`,
        `Practical Applications and Integration`,
      ],
      internalLinks: {
        from: clusterATerms.slice(0, 2),
        to: clusterBTerms.slice(0, 2),
      },
    };
  }

  return result;
}

/**
 * Validate and normalize target attribute
 */
function normalizeTargetAttribute(value: string): 'unique' | 'root' | 'rare' {
  const validValues = ['unique', 'root', 'rare'];
  const normalized = value?.toLowerCase?.();
  if (validValues.includes(normalized)) {
    return normalized as 'unique' | 'root' | 'rare';
  }
  return 'root'; // Default fallback
}

/**
 * Validate and normalize bridges entities to exactly 2 elements
 */
function normalizeBridgesEntities(entities: unknown[], fallbackA: string, fallbackB: string): [string, string] {
  if (!Array.isArray(entities) || entities.length < 2) {
    return [fallbackA, fallbackB];
  }
  return [String(entities[0]), String(entities[1])];
}

/**
 * Parse and validate AI response
 */
function parseAIResponse(
  responseText: string,
  input: BridgeSuggestionInput,
  includeOutline: boolean
): BridgeSuggestion {
  try {
    // Try to extract JSON from response (in case AI wraps it in markdown)
    let jsonText = responseText.trim();

    // Remove markdown code blocks if present
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonText);

    // Validate and normalize research questions
    const researchQuestions: ResearchQuestion[] = [];
    if (Array.isArray(parsed.researchQuestions)) {
      for (const q of parsed.researchQuestions) {
        if (q && q.question && q.entityA && q.entityB) {
          researchQuestions.push({
            question: String(q.question),
            targetAttribute: normalizeTargetAttribute(q.targetAttribute),
            entityA: String(q.entityA),
            entityB: String(q.entityB),
          });
        }
      }
    }

    // Validate and normalize topic suggestions
    const topicSuggestions: TopicSuggestion[] = [];
    const fallbackA = input.clusterATerms[0] || input.centralEntity;
    const fallbackB = input.clusterBTerms[0] || input.centralEntity;

    if (Array.isArray(parsed.topicSuggestions)) {
      for (const t of parsed.topicSuggestions) {
        if (t && t.title) {
          topicSuggestions.push({
            title: String(t.title),
            predicates: Array.isArray(t.predicates) ? t.predicates.map(String) : ['relates'],
            bridgesEntities: normalizeBridgesEntities(t.bridgesEntities, fallbackA, fallbackB),
          });
        }
      }
    }

    // If we got no valid questions or suggestions, use fallback
    if (researchQuestions.length === 0 && topicSuggestions.length === 0) {
      return generateFallbackSuggestions(input, includeOutline);
    }

    // Build result
    const result: BridgeSuggestion = {
      researchQuestions: researchQuestions.length > 0
        ? researchQuestions
        : generateFallbackSuggestions(input, false).researchQuestions,
      topicSuggestions: topicSuggestions.length > 0
        ? topicSuggestions
        : generateFallbackSuggestions(input, false).topicSuggestions,
    };

    // Include brief outline if requested and available
    if (includeOutline && parsed.briefOutline) {
      const bo = parsed.briefOutline;
      result.briefOutline = {
        centralEntity: String(bo.centralEntity || input.centralEntity),
        sourceContextConnection: String(bo.sourceContextConnection || ''),
        attributePrioritization: {
          unique: Array.isArray(bo.attributePrioritization?.unique)
            ? bo.attributePrioritization.unique.map(String)
            : [],
          root: Array.isArray(bo.attributePrioritization?.root)
            ? bo.attributePrioritization.root.map(String)
            : [],
          rare: Array.isArray(bo.attributePrioritization?.rare)
            ? bo.attributePrioritization.rare.map(String)
            : [],
        },
        headingVector: Array.isArray(bo.headingVector) ? bo.headingVector.map(String) : [],
        internalLinks: {
          from: Array.isArray(bo.internalLinks?.from) ? bo.internalLinks.from.map(String) : [],
          to: Array.isArray(bo.internalLinks?.to) ? bo.internalLinks.to.map(String) : [],
        },
      };
    }

    return result;
  } catch (error) {
    // JSON parsing failed, return fallback
    console.warn('[BridgeSuggestionService] Failed to parse AI response, using fallback:', error);
    return generateFallbackSuggestions(input, includeOutline);
  }
}

/**
 * Get the generateText function for the specified AI provider
 */
function getGenerateTextForProvider(
  provider: string | undefined
): (prompt: string, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>) => Promise<string> {
  switch (provider) {
    case 'openai':
      return openAiService.generateText;
    case 'anthropic':
      return anthropicService.generateText;
    case 'perplexity':
      return perplexityService.generateText;
    case 'openrouter':
      return openRouterService.generateText;
    case 'gemini':
    default:
      return geminiService.generateText;
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Generate bridge suggestions for a structural hole between topic clusters.
 *
 * Uses AI to analyze the gap between two topic clusters and suggest:
 * - Research questions that explore the connection
 * - Topic titles that bridge the clusters
 * - Optional content brief outline
 *
 * @param input - The structural hole context
 * @param includeOutline - Whether to include a content brief outline
 * @returns Bridge suggestions with research questions and topic titles
 */
export async function generateBridgeSuggestions(
  input: BridgeSuggestionInput,
  includeOutline: boolean = false
): Promise<BridgeSuggestion> {
  const businessInfo = input.businessInfo;

  // If no businessInfo, return fallback immediately
  if (!businessInfo) {
    return generateFallbackSuggestions(input, includeOutline);
  }

  try {
    const prompt = buildBridgeSuggestionPrompt(input, includeOutline);
    const generateText = getGenerateTextForProvider(businessInfo.aiProvider);

    // Create a no-op dispatch since we're not tracking progress here
    const noopDispatch = () => {};

    const response = await generateText(prompt, businessInfo, noopDispatch);

    return parseAIResponse(response, input, includeOutline);
  } catch (error) {
    console.error('[BridgeSuggestionService] AI call failed:', error);
    return generateFallbackSuggestions(input, includeOutline);
  }
}

/**
 * Generate bridge suggestions for multiple structural holes.
 *
 * Processes each input sequentially to avoid rate limiting.
 *
 * @param inputs - Array of structural hole contexts
 * @param includeOutlines - Whether to include content brief outlines
 * @returns Array of bridge suggestions
 */
export async function batchGenerateBridgeSuggestions(
  inputs: BridgeSuggestionInput[],
  includeOutlines: boolean = false
): Promise<BridgeSuggestion[]> {
  if (inputs.length === 0) {
    return [];
  }

  const results: BridgeSuggestion[] = [];

  for (const input of inputs) {
    const result = await generateBridgeSuggestions(input, includeOutlines);
    results.push(result);
  }

  return results;
}
