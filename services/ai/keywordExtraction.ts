// services/ai/keywordExtraction.ts
// Extracts core 2-4 word searchable keywords from topic titles

import type { BusinessInfo, EnrichedTopic } from '../../types';
import { dispatchToProvider } from './providerDispatcher';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { KEYWORD_EXTRACTION_PROMPT } from '../../config/prompts/keywordExtraction';
import React from 'react';

const BATCH_SIZE = 30;

interface KeywordResult {
  id: string;
  keyword: string;
}

/**
 * Extract core searchable keywords from topic titles.
 * Batches topics in groups of 30 for AI processing.
 * Returns Map<topicId, keyword>.
 */
export async function extractKeywords(
  topics: EnrichedTopic[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Process in batches
  for (let i = 0; i < topics.length; i += BATCH_SIZE) {
    const batch = topics.slice(i, i + BATCH_SIZE);
    const batchInput = batch.map(t => ({ id: t.id, title: t.title }));
    const prompt = KEYWORD_EXTRACTION_PROMPT(batchInput, businessInfo);

    try {
      const batchResults = await dispatchToProvider<KeywordResult[]>(businessInfo, {
        gemini: () => geminiService.generateJson<KeywordResult[]>(prompt, businessInfo, dispatch, []),
        openai: () => openAiService.generateJson<KeywordResult[]>(prompt, businessInfo, dispatch, []),
        anthropic: () => anthropicService.generateJson<KeywordResult[]>(prompt, businessInfo, dispatch, []),
        perplexity: () => perplexityService.generateJson<KeywordResult[]>(prompt, businessInfo, dispatch, []),
        openrouter: () => openRouterService.generateJson<KeywordResult[]>(prompt, businessInfo, dispatch, []),
      });

      if (Array.isArray(batchResults)) {
        for (const r of batchResults) {
          if (r.id && r.keyword) {
            results.set(r.id, r.keyword);
          }
        }
      }
    } catch (err) {
      console.warn(`[keywordExtraction] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, err);
      // Fallback: extract keywords heuristically
      for (const t of batch) {
        results.set(t.id, extractKeywordHeuristic(t.title));
      }
    }

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'KeywordExtraction',
        message: `Extracted keywords for batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(topics.length / BATCH_SIZE)} (${Math.min(i + BATCH_SIZE, topics.length)}/${topics.length} topics)`,
        status: 'info',
        timestamp: Date.now(),
      },
    });
  }

  return results;
}

/**
 * Heuristic keyword extraction (fallback when AI fails).
 * Strips common filler words and takes the first 4 content words.
 */
function extractKeywordHeuristic(title: string): string {
  const fillerPrefixes = [
    'understanding', 'guide to', 'complete guide to', 'how to',
    'what is', 'what are', 'why', 'the importance of', 'benefits of',
    'introduction to', 'a comprehensive', 'an overview of', 'overview of',
    'everything you need to know about', 'all about',
  ];

  let cleaned = title.toLowerCase().trim();
  for (const prefix of fillerPrefixes) {
    if (cleaned.startsWith(prefix + ' ')) {
      cleaned = cleaned.slice(prefix.length).trim();
    }
  }

  // Remove trailing year patterns
  cleaned = cleaned.replace(/\s+(?:in\s+)?\d{4}$/i, '').trim();
  // Remove trailing "for [audience]" patterns
  cleaned = cleaned.replace(/\s+for\s+\w+(\s+\w+)?$/i, '').trim();

  const words = cleaned.split(/\s+/).filter(w => w.length > 1);
  return words.slice(0, 4).join(' ');
}
