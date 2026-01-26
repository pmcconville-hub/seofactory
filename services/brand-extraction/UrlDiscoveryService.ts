import { PageCrawler, type PageCaptureResult } from './PageCrawler';

export interface UrlSuggestion {
  url: string;
  pageType: 'homepage' | 'service' | 'article' | 'contact' | 'other';
  discoveredFrom: 'sitemap' | 'nav_link' | 'hero_cta' | 'featured_content' | 'footer';
  prominenceScore: number;
  visualContext: string;
}

interface ExtractedLink {
  url: string;
  context: UrlSuggestion['discoveredFrom'];
  anchorText: string;
}

interface PageCrawlerLike {
  capturePage(url: string): Promise<PageCaptureResult>;
  close(): Promise<void>;
}

export class UrlDiscoveryService {
  private crawlerFactory: () => PageCrawlerLike;

  constructor(crawlerFactory?: () => PageCrawlerLike) {
    this.crawlerFactory = crawlerFactory || (() => new PageCrawler({ headless: true, timeout: 15000 }));
  }

  /**
   * Discover URLs from a domain with prominence-based scoring
   */
  async discoverUrls(domain: string): Promise<UrlSuggestion[]> {
    const normalizedDomain = this.normalizeDomain(domain);
    const suggestions: UrlSuggestion[] = [];

    // Add homepage as first suggestion (using sitemap as discovery source since it's infrastructure-based)
    suggestions.push({
      url: normalizedDomain,
      pageType: 'homepage',
      discoveredFrom: 'sitemap',
      prominenceScore: 100,
      visualContext: 'Homepage - primary entry point'
    });

    // Try sitemap first
    const sitemapSuggestions = await this.trySitemap(normalizedDomain);
    suggestions.push(...sitemapSuggestions);

    // Crawl homepage for prominent links
    const homepageLinks = await this.crawlHomepageLinks(normalizedDomain);
    suggestions.push(...homepageLinks);

    // Dedupe and rank
    const ranked = this.dedupeAndRank(suggestions);

    // Return top 10
    return ranked.slice(0, 10);
  }

  /**
   * Normalize domain to full URL format
   */
  normalizeDomain(domain: string): string {
    let normalized = domain.trim();

    // Remove trailing slash
    normalized = normalized.replace(/\/+$/, '');

    // Add https if no protocol
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }

    return normalized;
  }

  /**
   * Try to fetch and parse sitemap.xml
   */
  async trySitemap(domain: string): Promise<UrlSuggestion[]> {
    const suggestions: UrlSuggestion[] = [];

    try {
      const sitemapUrl = `${domain}/sitemap.xml`;
      const response = await fetch(sitemapUrl, {
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) return suggestions;

      const xml = await response.text();
      const locMatches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];

      for (const match of locMatches) {
        const url = match.replace(/<\/?loc>/g, '');
        if (url && url.startsWith(domain)) {
          suggestions.push({
            url,
            pageType: this.categorizeUrl(url),
            discoveredFrom: 'sitemap',
            prominenceScore: this.calculateProminence({ url, context: 'sitemap', anchorText: '' }),
            visualContext: 'Discovered from sitemap.xml'
          });
        }
      }
    } catch {
      // Sitemap not available or failed to fetch
    }

    return suggestions;
  }

  /**
   * Crawl homepage using PageCrawler and extract links
   */
  async crawlHomepageLinks(domain: string): Promise<UrlSuggestion[]> {
    let crawler: PageCrawlerLike | null = null;
    try {
      crawler = this.crawlerFactory();
      const result = await crawler.capturePage(domain);
      const links = this.extractLinksWithContext(result.rawHtml, domain);

      return links.map(link => ({
        url: link.url,
        pageType: this.categorizeUrl(link.url),
        discoveredFrom: link.context,
        prominenceScore: this.calculateProminence(link),
        visualContext: this.generateVisualContext(link)
      }));
    } catch {
      return [];
    } finally {
      if (crawler) {
        await crawler.close();
      }
    }
  }

  /**
   * Extract links from HTML with their context (nav, hero, featured, footer)
   */
  extractLinksWithContext(html: string, domain: string): ExtractedLink[] {
    const links: ExtractedLink[] = [];
    const baseUrl = new URL(domain);

    // Parse HTML sections
    const navSection = this.extractSection(html, /<nav[^>]*>([\s\S]*?)<\/nav>/gi);
    const heroSection = this.extractSection(html, /<section[^>]*class="[^"]*hero[^"]*"[^>]*>([\s\S]*?)<\/section>/gi) ||
                        this.extractSection(html, /<div[^>]*class="[^"]*hero[^"]*"[^>]*>([\s\S]*?)<\/div>/gi);
    const featuredSection = this.extractSection(html, /<div[^>]*class="[^"]*featured[^"]*"[^>]*>([\s\S]*?)<\/div>/gi) ||
                           this.extractSection(html, /<section[^>]*class="[^"]*featured[^"]*"[^>]*>([\s\S]*?)<\/section>/gi);
    const footerSection = this.extractSection(html, /<footer[^>]*>([\s\S]*?)<\/footer>/gi);

    // Extract links from a section
    const extractLinks = (section: string, context: ExtractedLink['context']) => {
      const linkRegex = /<a\s+([^>]*)>([\s\S]*?)<\/a>/gi;
      let match;
      while ((match = linkRegex.exec(section)) !== null) {
        const attrs = match[1];
        const anchorText = match[2].replace(/<[^>]*>/g, '').trim();

        // Extract href from attributes
        const hrefMatch = attrs.match(/href="([^"]+)"/i);
        if (!hrefMatch) continue;

        const href = hrefMatch[1];
        const fullUrl = this.resolveUrl(href, baseUrl);

        if (fullUrl && this.isSameDomain(fullUrl, baseUrl.origin)) {
          links.push({ url: fullUrl, context, anchorText });
        }
      }
    };

    // Check for CTA class in hero section for hero_cta detection
    if (heroSection) {
      const linkRegex = /<a\s+([^>]*)>([\s\S]*?)<\/a>/gi;
      let match;
      const ctaUrls = new Set<string>();

      while ((match = linkRegex.exec(heroSection)) !== null) {
        const attrs = match[1];
        const anchorText = match[2].replace(/<[^>]*>/g, '').trim();

        // Check if this link has cta class
        const hasCtaClass = /class="[^"]*cta[^"]*"/i.test(attrs);
        const hrefMatch = attrs.match(/href="([^"]+)"/i);
        if (!hrefMatch) continue;

        const href = hrefMatch[1];
        const fullUrl = this.resolveUrl(href, baseUrl);

        if (fullUrl && this.isSameDomain(fullUrl, baseUrl.origin)) {
          if (hasCtaClass) {
            links.push({ url: fullUrl, context: 'hero_cta', anchorText });
            ctaUrls.add(fullUrl);
          } else {
            // Non-CTA links in hero go to featured_content
            links.push({ url: fullUrl, context: 'featured_content', anchorText });
          }
        }
      }
    }

    if (navSection) extractLinks(navSection, 'nav_link');
    if (featuredSection) extractLinks(featuredSection, 'featured_content');
    if (footerSection) extractLinks(footerSection, 'footer');

    return links;
  }

  /**
   * Extract a section from HTML using regex
   */
  private extractSection(html: string, regex: RegExp): string | null {
    const matches = html.match(regex);
    return matches ? matches.join('') : null;
  }

  /**
   * Resolve relative URLs to absolute
   */
  private resolveUrl(href: string, baseUrl: URL): string | null {
    try {
      if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
        return null;
      }

      if (href.startsWith('http://') || href.startsWith('https://')) {
        return href;
      }

      if (href.startsWith('/')) {
        return `${baseUrl.origin}${href}`;
      }

      return `${baseUrl.origin}/${href}`;
    } catch {
      return null;
    }
  }

  /**
   * Check if URL belongs to the same domain
   */
  private isSameDomain(url: string, origin: string): boolean {
    try {
      const urlOrigin = new URL(url).origin;
      return urlOrigin === origin;
    } catch {
      return false;
    }
  }

  /**
   * Detect the context of a link based on its position in HTML
   */
  detectLinkContext(html: string, position: number): ExtractedLink['context'] {
    const beforePosition = html.substring(0, position);

    // Check what section we're in based on opening tags before position
    const lastNav = beforePosition.lastIndexOf('<nav');
    const lastNavClose = beforePosition.lastIndexOf('</nav>');
    if (lastNav > lastNavClose) return 'nav_link';

    const lastHero = beforePosition.lastIndexOf('hero');
    const heroSectionStart = beforePosition.lastIndexOf('<section', lastHero);
    const heroSectionClose = beforePosition.indexOf('</section>', heroSectionStart);
    if (heroSectionClose === -1 || heroSectionClose > position) {
      // Check if it's a CTA
      const linkStart = beforePosition.lastIndexOf('<a');
      const linkSubstr = html.substring(linkStart, position);
      if (linkSubstr.includes('cta')) return 'hero_cta';
      return 'featured_content';
    }

    const lastFooter = beforePosition.lastIndexOf('<footer');
    const lastFooterClose = beforePosition.lastIndexOf('</footer>');
    if (lastFooter > lastFooterClose) return 'footer';

    const lastFeatured = beforePosition.lastIndexOf('featured');
    if (lastFeatured > -1) {
      const featuredSectionStart = beforePosition.lastIndexOf('<div', lastFeatured);
      const featuredSectionClose = html.indexOf('</div>', featuredSectionStart);
      if (featuredSectionClose > position) return 'featured_content';
    }

    return 'nav_link';
  }

  /**
   * Categorize URL by page type based on path patterns
   */
  categorizeUrl(url: string): UrlSuggestion['pageType'] {
    try {
      const path = new URL(url).pathname.toLowerCase();

      if (path === '/' || path === '' || path === '/index.html') {
        return 'homepage';
      }

      if (path.includes('/services') || path.includes('/diensten') || path.includes('/dienst')) {
        return 'service';
      }

      if (path.includes('/blog') || path.includes('/news') || path.includes('/artikel') ||
          path.includes('/article') || path.includes('/nieuws')) {
        return 'article';
      }

      if (path.includes('/contact') || path.includes('/kontakt')) {
        return 'contact';
      }

      return 'other';
    } catch {
      return 'other';
    }
  }

  /**
   * Calculate prominence score (0-100) based on discovery source
   */
  calculateProminence(link: ExtractedLink): number {
    const baseScores: Record<ExtractedLink['context'], number> = {
      hero_cta: 100,
      featured_content: 80,
      nav_link: 60,
      sitemap: 40,
      footer: 30
    };

    return baseScores[link.context] ?? 50;
  }

  /**
   * Generate visual context description
   */
  private generateVisualContext(link: ExtractedLink): string {
    const contextDescriptions: Record<ExtractedLink['context'], string> = {
      hero_cta: `Hero section CTA - "${link.anchorText || 'Call to action'}"`,
      featured_content: `Featured content section - "${link.anchorText || 'Featured link'}"`,
      nav_link: `Navigation menu - "${link.anchorText || 'Nav link'}"`,
      sitemap: 'Discovered from sitemap.xml',
      footer: `Footer section - "${link.anchorText || 'Footer link'}"`
    };

    return contextDescriptions[link.context] || 'Discovered link';
  }

  /**
   * Dedupe suggestions by URL, keeping highest prominence
   */
  dedupeAndRank(suggestions: UrlSuggestion[]): UrlSuggestion[] {
    const urlMap = new Map<string, UrlSuggestion>();

    for (const suggestion of suggestions) {
      const existing = urlMap.get(suggestion.url);
      if (!existing || suggestion.prominenceScore > existing.prominenceScore) {
        urlMap.set(suggestion.url, suggestion);
      }
    }

    // Sort by prominence score descending
    return Array.from(urlMap.values()).sort((a, b) => b.prominenceScore - a.prominenceScore);
  }
}
