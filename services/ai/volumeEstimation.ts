// services/ai/volumeEstimation.ts
// AI-based search volume estimation (free path, no API keys needed)

import type { BusinessInfo, EnrichedTopic } from '../../types';
import { dispatchToProvider } from './providerDispatcher';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { VOLUME_ESTIMATION_PROMPT, VolumeEstimationInput } from '../../config/prompts/volumeEstimation';
import React from 'react';

const BATCH_SIZE = 40;

export interface VolumeEstimate {
  keyword: string;
  estimatedMonthlyVolume: number;
  intent: 'informational' | 'navigational' | 'transactional' | 'commercial';
  estimatedContentDepth: number;
  confidence: number;
}

/**
 * Estimate search volumes using AI (free path).
 * Batches keywords in groups of 40.
 * Returns Map<keyword, VolumeEstimate>.
 */
export async function estimateVolumes(
  topics: EnrichedTopic[],
  keywordMap: Map<string, string>,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<Map<string, VolumeEstimate>> {
  const results = new Map<string, VolumeEstimate>();

  // Build input with keywords
  const allInputs: (VolumeEstimationInput & { topicId: string })[] = [];
  for (const topic of topics) {
    const keyword = keywordMap.get(topic.id);
    if (!keyword) continue;

    const parent = topics.find(t => t.id === topic.parent_topic_id);
    allInputs.push({
      topicId: topic.id,
      keyword,
      title: topic.title,
      parentTitle: parent?.title,
    });
  }

  // Process in batches
  for (let i = 0; i < allInputs.length; i += BATCH_SIZE) {
    const batch = allInputs.slice(i, i + BATCH_SIZE);
    const prompt = VOLUME_ESTIMATION_PROMPT(batch, businessInfo);

    try {
      const batchResults = await dispatchToProvider<VolumeEstimate[]>(businessInfo, {
        gemini: () => geminiService.generateJson<VolumeEstimate[]>(prompt, businessInfo, dispatch, []),
        openai: () => openAiService.generateJson<VolumeEstimate[]>(prompt, businessInfo, dispatch, []),
        anthropic: () => anthropicService.generateJson<VolumeEstimate[]>(prompt, businessInfo, dispatch, []),
        perplexity: () => perplexityService.generateJson<VolumeEstimate[]>(prompt, businessInfo, dispatch, []),
        openrouter: () => openRouterService.generateJson<VolumeEstimate[]>(prompt, businessInfo, dispatch, []),
      });

      if (Array.isArray(batchResults)) {
        for (const r of batchResults) {
          if (r.keyword) {
            results.set(r.keyword, {
              keyword: r.keyword,
              estimatedMonthlyVolume: typeof r.estimatedMonthlyVolume === 'number' ? r.estimatedMonthlyVolume : 50,
              intent: ['informational', 'navigational', 'transactional', 'commercial'].includes(r.intent)
                ? r.intent
                : 'informational',
              estimatedContentDepth: typeof r.estimatedContentDepth === 'number' ? r.estimatedContentDepth : 800,
              confidence: typeof r.confidence === 'number' ? Math.min(1, Math.max(0, r.confidence)) : 0.5,
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[volumeEstimation] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, err);
      // Fallback: assign default estimates
      for (const input of batch) {
        results.set(input.keyword, {
          keyword: input.keyword,
          estimatedMonthlyVolume: 50,
          intent: 'informational',
          estimatedContentDepth: 800,
          confidence: 0.1,
        });
      }
    }

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'VolumeEstimation',
        message: `Estimated volumes for batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allInputs.length / BATCH_SIZE)}`,
        status: 'info',
        timestamp: Date.now(),
      },
    });
  }

  return results;
}
