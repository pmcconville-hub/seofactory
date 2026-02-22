/**
 * Google API Orchestrator
 *
 * Coordinates all Google API services for the pipeline gap analysis step.
 * Checks which services are available (keys configured, accounts connected),
 * runs them in parallel with Promise.allSettled(), and returns combined enrichment.
 *
 * Each service is wrapped in try/catch and returns null on failure.
 * Emits narrative events for progress tracking.
 */

import type { BusinessInfo } from '../types';
import type { UrlInspectionResult, IndexationSummary } from './googleUrlInspectionService';
import type { EntitySalienceResult, CentralEntityProminence } from './googleCloudNlpService';
import type { TrendsData, SeasonalityPattern } from './googleTrendsService';
import type { Ga4PageMetrics } from './googleGa4Service';
import type { KnowledgeGraphEntityResult } from '../types';

import { inspectUrls, getIndexationSummary } from './googleUrlInspectionService';
import { analyzeEntitySalience, measureCentralEntityProminence } from './googleCloudNlpService';
import { getTrendsData, getSeasonalityPattern } from './googleTrendsService';
import { getGa4PageMetrics, getGa4Summary } from './googleGa4Service';
import { getKnowledgeGraphEntity } from './googleKnowledgeGraphService';

export interface AnalysisEvent {
  type: string;
  message: string;
  detail?: string;
  timestamp?: number;
}

export interface GoogleApiEnrichment {
  urlInspection?: {
    results: UrlInspectionResult[];
    summary: IndexationSummary;
  };
  entitySalience?: {
    entities: EntitySalienceResult[];
    prominence: CentralEntityProminence | null;
  };
  trends?: {
    data: TrendsData;
    seasonality: SeasonalityPattern;
  };
  ga4?: {
    metrics: Ga4PageMetrics[];
    summary: { totalSessions: number; avgBounceRate: number; topPages: string[] };
  };
  knowledgeGraph?: {
    entity: KnowledgeGraphEntityResult | null;
    found: boolean;
    authorityScore: number;
  };
}

export interface OrchestratorConfig {
  businessInfo: BusinessInfo;
  siteUrl: string;
  siteInventory?: Array<{ url: string; title?: string }>;
  projectId: string;
  accountId?: string;
  supabase?: any;
  onProgress: (event: AnalysisEvent) => void;
}

function emit(onProgress: (e: AnalysisEvent) => void, type: string, message: string, detail?: string) {
  onProgress({ type, message, detail, timestamp: Date.now() });
}

/**
 * Fetch all available Google API data in parallel.
 * Returns combined enrichment data. Each service fails gracefully.
 */
export async function fetchAllGoogleApiData(config: OrchestratorConfig): Promise<GoogleApiEnrichment> {
  const { businessInfo, siteUrl, siteInventory, accountId, supabase, onProgress } = config;
  const enrichment: GoogleApiEnrichment = {};

  // Determine which services are available
  const hasGscAccount = !!accountId;
  const hasGoogleApiKey = !!(businessInfo.googleApiKey || businessInfo.googleKnowledgeGraphApiKey);
  const hasCloudNlpKey = !!businessInfo.googleCloudNlpApiKey;
  const hasSerpApiKey = !!businessInfo.serpApiKey;
  const hasGa4 = !!businessInfo.enableGa4Integration && !!supabase;
  const hasUrlInspection = !!businessInfo.enableUrlInspection && hasGscAccount;

  const availableServices: string[] = [];
  if (hasUrlInspection) availableServices.push('URL Inspection');
  if (hasCloudNlpKey) availableServices.push('Entity Salience');
  if (hasSerpApiKey) availableServices.push('Google Trends');
  if (hasGa4) availableServices.push('GA4 Analytics');
  if (hasGoogleApiKey) availableServices.push('Knowledge Graph');

  if (availableServices.length === 0) {
    emit(onProgress, 'warning', 'No Google API services configured', 'Configure API keys in Settings to enable enhanced analysis');
    return enrichment;
  }

  emit(onProgress, 'analyzing', `Fetching data from ${availableServices.length} Google API service${availableServices.length > 1 ? 's' : ''}`, availableServices.join(', '));

  // Build parallel promises
  const promises: Array<Promise<void>> = [];

  // 1. URL Inspection
  if (hasUrlInspection && siteInventory?.length) {
    promises.push((async () => {
      emit(onProgress, 'inspection', 'Inspecting URL index status...', `${Math.min(siteInventory.length, 50)} URLs`);
      try {
        const urls = siteInventory.slice(0, 50).map(p => p.url);
        const results = await inspectUrls(urls, siteUrl, accountId!, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
        const summary = getIndexationSummary(results);
        enrichment.urlInspection = { results, summary };
        emit(onProgress, 'inspection', `URL Inspection complete: ${summary.indexed}/${summary.total} indexed`, `${summary.blocked} blocked, ${summary.errors} errors`);
      } catch (e) {
        emit(onProgress, 'warning', 'URL Inspection failed', (e as Error).message);
      }
    })());
  }

  // 2. Entity Salience (Cloud NLP)
  if (hasCloudNlpKey && siteInventory?.length) {
    promises.push((async () => {
      emit(onProgress, 'nlp', 'Analyzing entity salience via Cloud NLP...', undefined);
      try {
        // Use page titles as a proxy for site content
        const sampleText = siteInventory
          .slice(0, 20)
          .map(p => p.title || '')
          .filter(Boolean)
          .join('. ');

        if (sampleText.length < 50) {
          emit(onProgress, 'warning', 'Insufficient content for entity salience analysis');
          return;
        }

        const entities = await analyzeEntitySalience(
          sampleText,
          businessInfo.language || 'en',
          businessInfo.supabaseUrl,
          businessInfo.supabaseAnonKey,
          businessInfo.googleCloudNlpApiKey
        );

        const prominence = entities.length > 0
          ? await measureCentralEntityProminence(
              sampleText,
              businessInfo.seedKeyword || '',
              businessInfo.language || 'en',
              businessInfo.supabaseUrl,
              businessInfo.supabaseAnonKey,
              businessInfo.googleCloudNlpApiKey
            )
          : null;

        enrichment.entitySalience = { entities, prominence };
        const salienceMsg = prominence
          ? `salience: ${(prominence.salience * 100).toFixed(0)}% (rank #${prominence.rank}/${prominence.totalEntities})`
          : `${entities.length} entities found`;
        emit(onProgress, 'nlp', `Entity salience analysis complete`, salienceMsg);
      } catch (e) {
        emit(onProgress, 'warning', 'Entity salience analysis failed', (e as Error).message);
      }
    })());
  }

  // 3. Google Trends
  if (hasSerpApiKey) {
    promises.push((async () => {
      emit(onProgress, 'trends', 'Fetching Google Trends data...', undefined);
      try {
        const data = await getTrendsData(
          businessInfo.seedKeyword || '',
          businessInfo.region,
          undefined,
          businessInfo.supabaseUrl,
          businessInfo.supabaseAnonKey,
          businessInfo.serpApiKey
        );

        if (data) {
          const seasonality = getSeasonalityPattern(data);
          enrichment.trends = { data, seasonality };
          const peakStr = seasonality.peakMonths.length > 0
            ? `Peak months: ${seasonality.peakMonths.join(', ')}`
            : 'No strong seasonality';
          emit(onProgress, 'trends', 'Google Trends data loaded', peakStr);
        } else {
          emit(onProgress, 'warning', 'No Trends data available for this query');
        }
      } catch (e) {
        emit(onProgress, 'warning', 'Google Trends fetch failed', (e as Error).message);
      }
    })());
  }

  // 4. GA4 Analytics
  if (hasGa4 && supabase) {
    promises.push((async () => {
      emit(onProgress, 'ga4', 'Loading GA4 analytics data...', undefined);
      try {
        // Find the GA4 property ID — look for linked ga4 property
        const { data: properties } = await supabase
          .from('analytics_properties')
          .select('id, property_id, service')
          .eq('service', 'ga4')
          .eq('sync_enabled', true)
          .limit(1);

        if (properties?.length) {
          const metrics = await getGa4PageMetrics(properties[0].id, supabase);
          const summary = getGa4Summary(metrics);
          enrichment.ga4 = { metrics, summary };
          emit(onProgress, 'ga4', `GA4 data loaded: ${summary.totalSessions} sessions`, `Avg bounce rate: ${summary.avgBounceRate}%`);
        } else {
          emit(onProgress, 'warning', 'No GA4 property linked');
        }
      } catch (e) {
        emit(onProgress, 'warning', 'GA4 data fetch failed', (e as Error).message);
      }
    })());
  }

  // 5. Knowledge Graph
  if (hasGoogleApiKey) {
    promises.push((async () => {
      emit(onProgress, 'kg', 'Searching Google Knowledge Graph...', undefined);
      try {
        const apiKey = businessInfo.googleKnowledgeGraphApiKey || businessInfo.googleApiKey || '';
        const entity = await getKnowledgeGraphEntity(
          businessInfo.seedKeyword || '',
          apiKey,
          businessInfo.industry,
          undefined,
          businessInfo.language || 'en',
          { supabaseUrl: businessInfo.supabaseUrl, supabaseAnonKey: businessInfo.supabaseAnonKey }
        );

        const found = !!entity;
        const authorityScore = entity ? Math.min(100, Math.round(entity.resultScore * 10)) : 0;
        enrichment.knowledgeGraph = { entity, found, authorityScore };

        if (found) {
          emit(onProgress, 'kg', `Knowledge Graph entity found: "${entity!.name}"`, `Score: ${authorityScore}/100`);
        } else {
          emit(onProgress, 'kg', 'Entity not found in Knowledge Graph', 'Build authority through structured data and authoritative mentions');
        }
      } catch (e) {
        emit(onProgress, 'warning', 'Knowledge Graph search failed', (e as Error).message);
      }
    })());
  }

  // Run all services in parallel
  await Promise.allSettled(promises);

  // Summary event
  const enrichedCount = Object.keys(enrichment).length;
  if (enrichedCount > 0) {
    emit(onProgress, 'complete', `Google API enrichment complete`, `${enrichedCount} data source${enrichedCount > 1 ? 's' : ''} loaded`);
  }

  return enrichment;
}
