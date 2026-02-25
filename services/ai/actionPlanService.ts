/**
 * Action Plan Service
 *
 * Provides AI-powered topic action type suggestion, rationale generation,
 * and strategic summary for the Content Briefs pipeline step.
 *
 * Created: 2026-02-25 - Content Briefs redesign
 *
 * @module services/ai/actionPlanService
 */

import type { EnrichedTopic, BusinessInfo, SEOPillars, SemanticTriple } from '../../types';
import type { ActionType } from '../../types/migration';
import type { ActionPlanEntry, ActionPriority } from '../../types/actionPlan';
import { dispatchToProvider } from './providerDispatcher';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import {
  getLanguageAndRegionInstruction,
  businessContext,
  jsonResponseInstruction,
} from '../../config/prompts/_common';
import React from 'react';

// ============================================================================
// PURE LOGIC — suggestActionType (no AI needed)
// ============================================================================

/**
 * Suggest an action type for a topic based on its properties.
 * Pure logic — no AI call. Used as initial assignment before AI enrichment.
 */
export function suggestActionType(topic: EnrichedTopic): ActionType {
  // If topic has a target_url, it's an existing page
  if (topic.target_url) {
    // Check metadata for performance signals
    const meta = topic.metadata ?? {};
    const impressions = typeof meta.gsc_impressions === 'number' ? meta.gsc_impressions : undefined;
    const clicks = typeof meta.gsc_clicks === 'number' ? meta.gsc_clicks : undefined;
    const wordCount = typeof meta.word_count === 'number' ? meta.word_count : undefined;

    // Low-performing pages with thin content → REWRITE
    if (wordCount !== undefined && wordCount < 300 && impressions !== undefined && impressions < 10) {
      return 'REWRITE';
    }

    // Very low performance → consider PRUNE
    if (impressions !== undefined && impressions < 5 && clicks !== undefined && clicks === 0) {
      return 'PRUNE_410';
    }

    // Has content, reasonable performance → OPTIMIZE
    return 'OPTIMIZE';
  }

  // No target_url = new content
  return 'CREATE_NEW';
}

/**
 * Suggest priority based on topic type and class.
 */
export function suggestPriority(topic: EnrichedTopic): ActionPriority {
  if (topic.cluster_role === 'pillar') return 'critical';
  if (topic.type === 'core' && topic.topic_class === 'monetization') return 'high';
  if (topic.type === 'core') return 'medium';
  return 'low';
}

/**
 * Create initial action plan entries from topics (no AI).
 * Fast, deterministic initialization.
 */
export function createInitialEntries(
  topics: EnrichedTopic[],
  waveAssignment: Map<string, 1 | 2 | 3 | 4>
): ActionPlanEntry[] {
  return topics.map(topic => ({
    topicId: topic.id,
    actionType: suggestActionType(topic),
    priority: suggestPriority(topic),
    wave: waveAssignment.get(topic.id) ?? 1,
    rationale: '',
  }));
}

// ============================================================================
// AI-POWERED — Topic Rationales
// ============================================================================

const BATCH_SIZE = 15;

interface RationaleResult {
  topicId: string;
  actionType: ActionType;
  priority: ActionPriority;
  suggestedWave: 1 | 2 | 3 | 4;
  rationale: string;
}

/**
 * Build the prompt for generating topic rationales in batch.
 */
function buildRationalePrompt(
  topics: EnrichedTopic[],
  businessInfo: BusinessInfo,
  pillars: SEOPillars,
  eavs: SemanticTriple[]
): string {
  const languageInstruction = getLanguageAndRegionInstruction(
    businessInfo.language,
    businessInfo.region
  );

  const topicList = topics.map((t, i) => {
    const actionHint = t.target_url ? 'EXISTING PAGE' : 'NEW CONTENT';
    const classLabel = t.topic_class === 'monetization' ? 'Revenue' : 'Authority';
    return `${i + 1}. "${t.title}" [${t.type}/${classLabel}] [${actionHint}]${t.target_url ? ` URL: ${t.target_url}` : ''}`;
  }).join('\n');

  return `
${languageInstruction}

You are a Holistic SEO strategist creating a strategic action plan for a content production pipeline.

${businessContext(businessInfo)}
**SEO Pillars:**
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}
- Central Search Intent: ${pillars.centralSearchIntent}

**EAV Coverage:** ${eavs.length} semantic triples defined

**Topics to analyze:**
${topicList}

For each topic, determine:
1. **actionType** — One of: CREATE_NEW, OPTIMIZE, REWRITE, MERGE, REDIRECT_301, PRUNE_410, CANONICALIZE, KEEP
   - Topics marked [NEW CONTENT] should typically be CREATE_NEW
   - Topics marked [EXISTING PAGE] should be OPTIMIZE, REWRITE, or KEEP based on strategic value
2. **priority** — One of: critical, high, medium, low
   - Pillar pages = critical
   - Core monetization = high
   - Core informational = medium
   - Outer/authority = low
3. **suggestedWave** — 1, 2, 3, or 4
   - Wave 1: Foundation (pillars + monetization hubs)
   - Wave 2: Knowledge depth (informational support)
   - Wave 3: Regional/variant extension
   - Wave 4: Authority expansion (outer topics)
4. **rationale** — 1-2 sentence explanation of WHY this action and wave assignment make strategic sense for the business.

${jsonResponseInstruction}
Return a JSON array of objects:
[
  {
    "topicIndex": 1,
    "actionType": "CREATE_NEW",
    "priority": "high",
    "suggestedWave": 1,
    "rationale": "This pillar page establishes topical authority for the core monetization cluster..."
  }
]
`;
}

/**
 * Generate AI-powered rationales for a batch of topics.
 * Returns enriched action plan entries with rationales.
 */
export async function generateTopicRationales(
  topics: EnrichedTopic[],
  businessInfo: BusinessInfo,
  pillars: SEOPillars,
  eavs: SemanticTriple[],
  dispatch: React.Dispatch<any>
): Promise<RationaleResult[]> {
  const results: RationaleResult[] = [];

  // Process in batches of BATCH_SIZE
  for (let i = 0; i < topics.length; i += BATCH_SIZE) {
    const batch = topics.slice(i, i + BATCH_SIZE);
    const prompt = buildRationalePrompt(batch, businessInfo, pillars, eavs);

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'ActionPlan',
        message: `Analyzing topics ${i + 1}-${Math.min(i + BATCH_SIZE, topics.length)} of ${topics.length}...`,
        status: 'info',
        timestamp: Date.now(),
      },
    });

    try {
      const response = await dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateText(prompt, businessInfo, dispatch),
        openai: () => openAiService.generateText(prompt, businessInfo, dispatch),
        anthropic: () => anthropicService.generateText(prompt, businessInfo, dispatch),
        perplexity: () => perplexityService.generateText(prompt, businessInfo, dispatch),
        openrouter: () => openRouterService.generateText(prompt, businessInfo, dispatch),
      });

      // Parse JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<{
          topicIndex: number;
          actionType: string;
          priority: string;
          suggestedWave: number;
          rationale: string;
        }>;

        for (const item of parsed) {
          const topicIdx = (item.topicIndex ?? 1) - 1;
          const topic = batch[topicIdx];
          if (!topic) continue;

          const validActions: ActionType[] = [
            'KEEP', 'OPTIMIZE', 'REWRITE', 'MERGE',
            'REDIRECT_301', 'PRUNE_410', 'CANONICALIZE', 'CREATE_NEW',
          ];
          const validPriorities: ActionPriority[] = ['critical', 'high', 'medium', 'low'];

          results.push({
            topicId: topic.id,
            actionType: validActions.includes(item.actionType as ActionType)
              ? (item.actionType as ActionType)
              : suggestActionType(topic),
            priority: validPriorities.includes(item.priority as ActionPriority)
              ? (item.priority as ActionPriority)
              : suggestPriority(topic),
            suggestedWave: ([1, 2, 3, 4].includes(item.suggestedWave)
              ? item.suggestedWave
              : 1) as 1 | 2 | 3 | 4,
            rationale: (item.rationale || '').trim(),
          });
        }
      }
    } catch (error) {
      console.warn(`[ActionPlan] Batch ${i / BATCH_SIZE + 1} failed, using defaults:`, error);
      // Fall back to pure-logic defaults for this batch
      for (const topic of batch) {
        results.push({
          topicId: topic.id,
          actionType: suggestActionType(topic),
          priority: suggestPriority(topic),
          suggestedWave: 1,
          rationale: '',
        });
      }
    }
  }

  return results;
}

// ============================================================================
// AI-POWERED — Strategic Summary
// ============================================================================

/**
 * Generate a business-oriented strategic summary of the action plan.
 */
export async function generateStrategicSummary(
  entries: ActionPlanEntry[],
  topics: EnrichedTopic[],
  businessInfo: BusinessInfo,
  pillars: SEOPillars,
  dispatch: React.Dispatch<any>
): Promise<string> {
  const languageInstruction = getLanguageAndRegionInstruction(
    businessInfo.language,
    businessInfo.region
  );

  // Compute stats for the prompt
  const stats = {
    total: entries.length,
    createNew: entries.filter(e => e.actionType === 'CREATE_NEW').length,
    optimize: entries.filter(e => e.actionType === 'OPTIMIZE').length,
    rewrite: entries.filter(e => e.actionType === 'REWRITE').length,
    merge: entries.filter(e => e.actionType === 'MERGE').length,
    redirect: entries.filter(e => e.actionType === 'REDIRECT_301').length,
    prune: entries.filter(e => e.actionType === 'PRUNE_410').length,
    keep: entries.filter(e => e.actionType === 'KEEP').length,
    wave1: entries.filter(e => e.wave === 1).length,
    wave2: entries.filter(e => e.wave === 2).length,
    wave3: entries.filter(e => e.wave === 3).length,
    wave4: entries.filter(e => e.wave === 4).length,
  };

  const prompt = `
${languageInstruction}

You are a senior SEO strategist writing a strategic summary for a client.

${businessContext(businessInfo)}
**SEO Pillars:**
- Central Entity: ${pillars.centralEntity}
- Source Context: ${pillars.sourceContext}
- Central Search Intent: ${pillars.centralSearchIntent}

**Action Plan Statistics:**
- Total pages planned: ${stats.total}
- Create New: ${stats.createNew} | Optimize: ${stats.optimize} | Rewrite: ${stats.rewrite}
- Merge: ${stats.merge} | Redirect: ${stats.redirect} | Prune: ${stats.prune} | Keep: ${stats.keep}
- Wave 1 (Foundation): ${stats.wave1} pages
- Wave 2 (Knowledge): ${stats.wave2} pages
- Wave 3 (Regional): ${stats.wave3} pages
- Wave 4 (Authority): ${stats.wave4} pages

Write a 3-5 sentence strategic summary explaining:
1. The overall strategy and WHY this plan makes sense for the business
2. The key priorities (what gets done first and why)
3. Expected outcomes and timeline implications

Be specific and business-focused. Reference the Central Entity and business context.
Return ONLY the summary text, no JSON wrapping.
`;

  try {
    const response = await dispatchToProvider(businessInfo, {
      gemini: () => geminiService.generateText(prompt, businessInfo, dispatch),
      openai: () => openAiService.generateText(prompt, businessInfo, dispatch),
      anthropic: () => anthropicService.generateText(prompt, businessInfo, dispatch),
      perplexity: () => perplexityService.generateText(prompt, businessInfo, dispatch),
      openrouter: () => openRouterService.generateText(prompt, businessInfo, dispatch),
    });

    return response.trim();
  } catch (error) {
    console.warn('[ActionPlan] Strategic summary generation failed:', error);
    return `This plan covers ${stats.total} pages across 4 waves, with ${stats.createNew} new pages to create and ${stats.optimize} existing pages to optimize.`;
  }
}
