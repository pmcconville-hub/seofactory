// services/audit/SiteMetadataCollector.ts
// Pre-audit data collector: robots.txt, sitemap URLs.
// Runs once per domain before batch audit starts.

import type { ProxyConfig } from '../sitemapService';

export interface SiteMetadata {
  robotsTxt?: string;
  sitemapUrls?: string[];
  sitemapDiscoveryErrors?: string[];
}

export class SiteMetadataCollector {
  constructor(private proxyConfig?: ProxyConfig) {}

  async collect(domain: string): Promise<SiteMetadata> {
    const [robotsResult, sitemapResult] = await Promise.allSettled([
      this.fetchRobotsTxt(domain),
      this.fetchSitemapUrls(domain),
    ]);

    return {
      robotsTxt: robotsResult.status === 'fulfilled' ? robotsResult.value : undefined,
      sitemapUrls: sitemapResult.status === 'fulfilled' ? sitemapResult.value.urls : undefined,
      sitemapDiscoveryErrors: sitemapResult.status === 'fulfilled' ? sitemapResult.value.errors : undefined,
    };
  }

  private async fetchRobotsTxt(domain: string): Promise<string> {
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    const robotsUrl = `${baseUrl.replace(/\/$/, '')}/robots.txt`;

    const result = await this.fetchViaProxy(robotsUrl);
    if (!result.ok || !result.body) {
      throw new Error(`Failed to fetch robots.txt: ${result.status}`);
    }
    return result.body;
  }

  private async fetchSitemapUrls(
    domain: string,
  ): Promise<{ urls: string[]; errors: string[] }> {
    // Dynamic import to avoid circular deps
    const { discoverSitemap, parseSitemap } = await import('../sitemapService');
    const errors: string[] = [];
    const allUrls: string[] = [];

    try {
      // Discover sitemap locations (checks robots.txt + common paths)
      const sitemapLocations = await discoverSitemap(domain, this.proxyConfig);

      if (sitemapLocations.length === 0) {
        errors.push('No sitemaps discovered');
        return { urls: [], errors };
      }

      // Parse the first discovered sitemap (usually sufficient)
      const parseResult = await parseSitemap(sitemapLocations[0], {
        followSitemapIndex: true,
        maxUrls: 10_000,
        proxyConfig: this.proxyConfig,
      });

      for (const entry of parseResult.urls) {
        allUrls.push(entry.loc);
      }

      if (parseResult.errors.length > 0) {
        errors.push(...parseResult.errors);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }

    return { urls: allUrls, errors };
  }

  private async fetchViaProxy(
    url: string,
  ): Promise<{ ok: boolean; status: number; body?: string }> {
    if (!this.proxyConfig?.supabaseUrl) {
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'HolisticSEO-SiteAnalyzer/1.0' },
        });
        const body = await response.text();
        return { ok: response.ok, status: response.status, body };
      } catch {
        return { ok: false, status: 0 };
      }
    }

    const proxyUrl = `${this.proxyConfig.supabaseUrl}/functions/v1/fetch-proxy`;
    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.proxyConfig.supabaseAnonKey,
          'Authorization': `Bearer ${this.proxyConfig.supabaseAnonKey}`,
        },
        body: JSON.stringify({ url, method: 'GET' }),
      });

      const data = await response.json();
      return {
        ok: data.ok,
        status: data.status,
        body: data.body,
      };
    } catch {
      return { ok: false, status: 0 };
    }
  }
}
