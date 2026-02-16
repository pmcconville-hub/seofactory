// services/pageSpeedService.ts
// Google PageSpeed Insights + CrUX API integration for Core Web Vitals data.

import { SERVICE_REGISTRY } from '../config/serviceRegistry';
import { logAiUsage } from './telemetryService';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProxyConfig } from './sitemapService';

export interface PageSpeedResult {
  // Lighthouse metrics
  lcp?: number;      // ms
  fcp?: number;      // ms
  cls?: number;      // score
  tbt?: number;      // ms
  speedIndex?: number; // ms
  inp?: number;      // ms (from CrUX if available)
  ttfb?: number;     // ms
  // Resource metrics
  domNodes?: number;
  jsPayloadKb?: number;
  cssPayloadKb?: number;
  totalJsKb?: number;
  thirdPartyJsKb?: number;
  renderBlockingCount?: number;
  // HTTP metadata
  statusCode?: number;
  responseTimeMs?: number;
  httpHeaders?: Record<string, string>;
}

/**
 * Fetches Core Web Vitals and performance data from Google PageSpeed Insights API.
 *
 * The PSI API works without a key (rate-limited) but with a key allows 25K requests/day.
 * CrUX API requires a key.
 */
export class PageSpeedService {
  private readonly proxyConfig?: ProxyConfig;
  private readonly apiKey?: string;
  private readonly supabase?: SupabaseClient;
  private readonly projectId?: string;
  private readonly mapId?: string;

  constructor(options: {
    proxyConfig?: ProxyConfig;
    apiKey?: string;
    supabase?: SupabaseClient;
    projectId?: string;
    mapId?: string;
  } = {}) {
    this.proxyConfig = options.proxyConfig;
    this.apiKey = options.apiKey;
    this.supabase = options.supabase;
    this.projectId = options.projectId;
    this.mapId = options.mapId;
  }

  /**
   * Analyze a URL using PageSpeed Insights API.
   * Routes through fetch-proxy to avoid CORS.
   */
  async analyze(url: string): Promise<PageSpeedResult> {
    const psiEndpoint = SERVICE_REGISTRY.services.google.endpoints.pageSpeedInsights;
    const params = new URLSearchParams({
      url,
      strategy: 'mobile',
      category: 'performance',
    });
    if (this.apiKey) {
      params.set('key', this.apiKey);
    }

    const psiUrl = `${psiEndpoint}?${params.toString()}`;
    const start = Date.now();

    const data = await this.fetchViaProxy(psiUrl);
    const durationMs = Date.now() - start;

    const result = this.extractLighthouseMetrics(data);

    // Optionally fetch CrUX data for real-user INP/CLS/LCP p75 data
    if (this.apiKey) {
      try {
        const cruxData = await this.fetchCruxData(url);
        if (cruxData) {
          // CrUX provides real-user p75 values — prefer them over lab data
          if (cruxData.inp != null) result.inp = cruxData.inp;
          if (cruxData.cls != null) result.cls = cruxData.cls;
          if (cruxData.lcp != null) result.lcp = cruxData.lcp;
        }
      } catch {
        // CrUX is optional — may not have data for low-traffic URLs
      }
    }

    result.responseTimeMs = durationMs;

    // Log to telemetry
    logAiUsage({
      provider: 'google',
      model: 'pagespeed-insights',
      operation: 'audit-cwv',
      operationDetail: url,
      tokensIn: 0,
      tokensOut: 0,
      durationMs,
      success: true,
      context: { projectId: this.projectId, mapId: this.mapId },
    }, this.supabase).catch(() => { /* telemetry is non-fatal */ });

    return result;
  }

  private extractLighthouseMetrics(data: Record<string, unknown>): PageSpeedResult {
    const result: PageSpeedResult = {};

    // Navigate into lighthouseResult.audits
    const lhr = data.lighthouseResult as Record<string, unknown> | undefined;
    if (!lhr) return result;

    const audits = lhr.audits as Record<string, Record<string, unknown>> | undefined;
    if (!audits) return result;

    // Core Web Vitals from Lighthouse
    result.lcp = this.getNumericValue(audits, 'largest-contentful-paint');
    result.fcp = this.getNumericValue(audits, 'first-contentful-paint');
    result.cls = this.getNumericValue(audits, 'cumulative-layout-shift');
    result.tbt = this.getNumericValue(audits, 'total-blocking-time');
    result.speedIndex = this.getNumericValue(audits, 'speed-index');
    result.ttfb = this.getNumericValue(audits, 'server-response-time');
    result.inp = this.getNumericValue(audits, 'interaction-to-next-paint');

    // DOM stats
    const domSize = audits['dom-size'];
    if (domSize?.numericValue != null) {
      result.domNodes = domSize.numericValue as number;
    }

    // JS payload
    const jsPayload = audits['total-byte-weight'];
    if (jsPayload?.numericValue != null) {
      result.totalJsKb = Math.round((jsPayload.numericValue as number) / 1024);
    }

    // Render blocking resources
    const renderBlocking = audits['render-blocking-resources'];
    if (renderBlocking?.details) {
      const details = renderBlocking.details as Record<string, unknown>;
      const items = details.items as unknown[];
      result.renderBlockingCount = items?.length ?? 0;
    }

    // Third-party JS
    const thirdParty = audits['third-party-summary'];
    if (thirdParty?.details) {
      const details = thirdParty.details as Record<string, unknown>;
      const summary = details.summary as Record<string, unknown> | undefined;
      if (summary?.wastedBytes != null) {
        result.thirdPartyJsKb = Math.round((summary.wastedBytes as number) / 1024);
      }
    }

    // Status code from the final URL response
    const finalUrl = audits['redirects'];
    if (finalUrl?.numericValue != null) {
      result.statusCode = 200; // If Lighthouse ran, the page loaded
    }

    return result;
  }

  private getNumericValue(
    audits: Record<string, Record<string, unknown>>,
    key: string,
  ): number | undefined {
    const audit = audits[key];
    if (!audit) return undefined;
    const val = audit.numericValue;
    return typeof val === 'number' ? val : undefined;
  }

  private async fetchCruxData(
    url: string,
  ): Promise<{ inp?: number; cls?: number; lcp?: number } | null> {
    const cruxEndpoint = SERVICE_REGISTRY.services.google.endpoints.cruxApi;
    const cruxUrl = `${cruxEndpoint}?key=${this.apiKey}`;

    const data = await this.fetchViaProxy(cruxUrl, 'POST', {
      url,
      formFactor: 'PHONE',
      metrics: [
        'interaction_to_next_paint',
        'cumulative_layout_shift',
        'largest_contentful_paint',
      ],
    });

    const record = data?.record as Record<string, unknown> | undefined;
    if (!record) return null;

    const metrics = record.metrics as Record<string, Record<string, unknown>> | undefined;
    if (!metrics) return null;

    return {
      inp: this.getCruxP75(metrics, 'interaction_to_next_paint'),
      cls: this.getCruxP75(metrics, 'cumulative_layout_shift'),
      lcp: this.getCruxP75(metrics, 'largest_contentful_paint'),
    };
  }

  private getCruxP75(
    metrics: Record<string, Record<string, unknown>>,
    key: string,
  ): number | undefined {
    const metric = metrics[key];
    if (!metric) return undefined;
    const percentiles = metric.percentiles as Record<string, unknown> | undefined;
    const p75 = percentiles?.p75;
    return typeof p75 === 'number' ? p75 : undefined;
  }

  private async fetchViaProxy(
    url: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown,
  ): Promise<Record<string, unknown>> {
    if (!this.proxyConfig?.supabaseUrl) {
      // Direct fetch (works in Node/Deno, not browser)
      const opts: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) opts.body = JSON.stringify(body);
      const response = await fetch(url, opts);
      if (!response.ok) throw new Error(`PageSpeed API error: ${response.status}`);
      return response.json() as Promise<Record<string, unknown>>;
    }

    // Use Supabase Edge Function proxy
    const proxyUrl = `${this.proxyConfig.supabaseUrl}/functions/v1/fetch-proxy`;
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.proxyConfig.supabaseAnonKey,
        'Authorization': `Bearer ${this.proxyConfig.supabaseAnonKey}`,
      },
      body: JSON.stringify({
        url,
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      }),
    });

    const proxyResult = await response.json();
    if (!proxyResult.ok) {
      throw new Error(`PageSpeed API error: ${proxyResult.status} ${proxyResult.error || ''}`);
    }

    // Proxy returns body as string — parse it
    const parsed = typeof proxyResult.body === 'string'
      ? JSON.parse(proxyResult.body)
      : proxyResult.body;
    return parsed;
  }
}
