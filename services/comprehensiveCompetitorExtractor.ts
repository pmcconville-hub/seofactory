/**
 * Comprehensive Competitor Extractor Service
 *
 * Extracts complete data from competitor pages with multi-provider fallback.
 * Handles failures gracefully and reports warnings to users.
 *
 * Created: January 2026
 *
 * @module services/comprehensiveCompetitorExtractor
 */

import {
  ComprehensiveExtraction,
  FailedExtraction,
  ExtractionResult,
  FetchStatus,
  ContentMetrics,
  ContentStructure,
  VisualAnalysis,
  TechnicalSeoAnalysis,
  SemanticAnalysis,
  LinkSummary,
  ImageInventoryItem,
  ClassifiedSemanticTriple,
  AnalysisWarning,
} from '../types/competitiveIntelligence';
import { extractPageContentWithHtml, JinaExtractionWithHtml } from './jinaService';
import { cacheService } from './cacheService';
import { API_ENDPOINTS } from '../config/apiEndpoints';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Extraction options
 */
export interface ExtractionOptions {
  jinaApiKey?: string;
  firecrawlApiKey?: string;
  proxyConfig?: {
    supabaseUrl: string;
    supabaseAnonKey: string;
  };
  includeRawContent?: boolean;
  onWarning?: (url: string, warnings: string[]) => void;
  onProgress?: (url: string, stage: string) => void;
}

// =============================================================================
// MAIN EXTRACTION FUNCTION
// =============================================================================

/**
 * Extract comprehensive data from a competitor URL with fallbacks
 */
export async function extractComprehensive(
  url: string,
  options: ExtractionOptions
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const domain = extractDomain(url);

  // Check cache first
  const cacheKey = `comprehensive:${url}`;
  const cached = await cacheService.get<ComprehensiveExtraction>(cacheKey);
  if (cached) {
    options.onProgress?.(url, 'Using cached data');
    return cached;
  }

  options.onProgress?.(url, 'Fetching content');

  // STEP 1: Fetch content with fallbacks
  let html: string | null = null;
  let markdown: string | null = null;
  let provider: FetchStatus['provider'] = 'failed';
  let fetchWarnings: string[] = [];

  // Try Jina first
  if (options.jinaApiKey) {
    try {
      const jinaResult = await extractPageContentWithHtml(
        url,
        options.jinaApiKey,
        options.proxyConfig
      );
      html = jinaResult.html || null;
      markdown = jinaResult.content || null;
      provider = 'jina';
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      fetchWarnings.push(`Jina failed: ${errorMsg}`);

      // Try Firecrawl fallback
      if (options.firecrawlApiKey) {
        try {
          const firecrawlResult = await fetchWithFirecrawl(url, options.firecrawlApiKey);
          html = firecrawlResult.html || null;
          markdown = firecrawlResult.markdown || null;
          provider = 'firecrawl';
        } catch (firecrawlError) {
          const fcErrorMsg = firecrawlError instanceof Error ? firecrawlError.message : String(firecrawlError);
          fetchWarnings.push(`Firecrawl failed: ${fcErrorMsg}`);
        }
      }
    }
  }

  // Final fallback: direct fetch (for HTML only)
  if (!html && !markdown) {
    try {
      html = await directFetch(url, options.proxyConfig);
      provider = 'direct';
      fetchWarnings.push('Using direct fetch (may be limited)');
    } catch (directError) {
      const directErrorMsg = directError instanceof Error ? directError.message : String(directError);
      fetchWarnings.push(`Direct fetch failed: ${directErrorMsg}`);
    }
  }

  // If all fetches failed, return failed extraction
  if (!html && !markdown) {
    const failedResult: FailedExtraction = {
      url,
      domain,
      fetchedAt: new Date(),
      fetchStatus: {
        htmlSuccess: false,
        markdownSuccess: false,
        provider: 'failed',
        warnings: fetchWarnings,
        fetchedAt: new Date(),
        responseTimeMs: Date.now() - startTime,
      },
      error: 'All fetch methods failed: ' + fetchWarnings.join('; '),
    };

    options.onWarning?.(url, fetchWarnings);
    return failedResult;
  }

  warnings.push(...fetchWarnings);
  options.onProgress?.(url, 'Extracting content metrics');

  // STEP 2: Extract content metrics
  const content = extractContentMetrics(html, markdown, warnings);

  options.onProgress?.(url, 'Analyzing structure');

  // STEP 3: Extract structure
  const structure = extractContentStructure(html, markdown, warnings);

  options.onProgress?.(url, 'Analyzing visuals');

  // STEP 4: Extract visuals
  const visuals = extractVisualAnalysis(html, markdown, warnings);

  options.onProgress?.(url, 'Analyzing technical SEO');

  // STEP 5: Extract technical SEO
  const technical = extractTechnicalSeo(html, warnings);

  options.onProgress?.(url, 'Analyzing semantics');

  // STEP 6: Extract semantic data (simplified - heading proxy)
  const semantic = extractSemanticAnalysis(html, markdown, structure, warnings);

  options.onProgress?.(url, 'Analyzing links');

  // STEP 7: Extract link summary
  const links = extractLinkSummary(html, warnings);

  // Build result
  const result: ComprehensiveExtraction = {
    url,
    domain,
    fetchedAt: new Date(),
    fetchStatus: {
      htmlSuccess: !!html,
      markdownSuccess: !!markdown,
      provider,
      warnings,
      fetchedAt: new Date(),
      responseTimeMs: Date.now() - startTime,
    },
    content,
    structure,
    visuals,
    technical,
    semantic,
    links,
    raw: options.includeRawContent ? { html: html || undefined, markdown: markdown || undefined } : undefined,
  };

  // Cache the result
  await cacheService.set(cacheKey, result, CACHE_TTL_SECONDS);

  // Notify of warnings
  if (warnings.length > 0) {
    options.onWarning?.(url, warnings);
  }

  options.onProgress?.(url, 'Complete');
  return result;
}

// =============================================================================
// CONTENT METRICS EXTRACTION
// =============================================================================

function extractContentMetrics(
  html: string | null,
  markdown: string | null,
  warnings: string[]
): ContentMetrics {
  let wordCount = 0;
  let wordCountSource: ContentMetrics['wordCountSource'] = 'estimated';
  let paragraphCount = 0;
  let sentenceCount = 0;

  // Try HTML first for accurate word count
  if (html) {
    const textContent = stripHtmlTags(html);
    wordCount = countWords(textContent);
    wordCountSource = 'html';
    paragraphCount = (html.match(/<p[\s>]/gi) || []).length;
    sentenceCount = countSentences(textContent);
  } else if (markdown) {
    const textContent = stripMarkdown(markdown);
    wordCount = countWords(textContent);
    wordCountSource = 'markdown';
    warnings.push('Word count from markdown (may differ from actual)');
    paragraphCount = (markdown.match(/\n\n/g) || []).length + 1;
    sentenceCount = countSentences(textContent);
  } else {
    wordCount = 1500; // Default fallback
    wordCountSource = 'estimated';
    warnings.push('Word count estimated (fetch failed)');
    paragraphCount = 20;
    sentenceCount = 80;
  }

  const avgSentenceLength = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 18;

  // Estimate reading level based on average sentence length
  const readingLevel = estimateReadingLevel(avgSentenceLength, wordCount);
  const audienceLevel = estimateAudienceLevel(readingLevel);

  return {
    wordCount,
    wordCountSource,
    paragraphCount,
    sentenceCount,
    avgSentenceLength,
    readingLevel,
    audienceLevel,
  };
}

// =============================================================================
// STRUCTURE EXTRACTION
// =============================================================================

function extractContentStructure(
  html: string | null,
  markdown: string | null,
  warnings: string[]
): ContentStructure {
  let title = '';
  let h1 = '';
  const headings: { level: number; text: string }[] = [];

  if (html) {
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : '';

    // Extract h1
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    h1 = h1Match ? decodeHtmlEntities(h1Match[1].trim()) : '';

    // Extract all headings
    const headingRegex = /<h([1-6])[^>]*>([^<]+)<\/h\1>/gi;
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
      headings.push({
        level: parseInt(match[1], 10),
        text: decodeHtmlEntities(match[2].trim()),
      });
    }
  } else if (markdown) {
    // Extract from markdown
    const lines = markdown.split('\n');
    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        headings.push({ level, text });
        if (level === 1 && !h1) {
          h1 = text;
        }
      }
    }
  }

  const h2Count = headings.filter(h => h.level === 2).length;
  const h3Count = headings.filter(h => h.level === 3).length;

  // Detect heading pattern
  const headingPattern = detectHeadingPattern(headings);

  // Detect content template
  const contentTemplate = detectContentTemplate(headings, html, markdown);

  // Check for TOC and FAQ
  const hasTableOfContents = !!(
    html?.toLowerCase().includes('table of contents') ||
    html?.toLowerCase().includes('toc') ||
    html?.match(/id=["']toc["']/i)
  );

  const hasFaq = !!(
    html?.toLowerCase().includes('frequently asked') ||
    html?.toLowerCase().includes('faq') ||
    headings.some(h => h.text.toLowerCase().includes('faq'))
  );

  return {
    title,
    h1,
    headings,
    h2Count,
    h3Count,
    headingPattern,
    hasTableOfContents,
    hasFaq,
    contentTemplate,
  };
}

// =============================================================================
// VISUAL ANALYSIS EXTRACTION
// =============================================================================

function extractVisualAnalysis(
  html: string | null,
  markdown: string | null,
  warnings: string[]
): VisualAnalysis {
  const images: ImageInventoryItem[] = [];
  let hasVideo = false;
  const videoSources: string[] = [];
  let tableCount = 0;
  let listCount = 0;

  if (html) {
    // Extract images
    const imgRegex = /<img[^>]+>/gi;
    let imgMatch;
    let imgIndex = 0;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      const imgTag = imgMatch[0];
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
      const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
      const titleMatch = imgTag.match(/title=["']([^"']+)["']/i);
      const widthMatch = imgTag.match(/width=["']?(\d+)["']?/i);
      const heightMatch = imgTag.match(/height=["']?(\d+)["']?/i);

      const src = srcMatch ? srcMatch[1] : '';
      const alt = altMatch ? altMatch[1] : '';

      images.push({
        src,
        alt,
        title: titleMatch ? titleMatch[1] : undefined,
        type: classifyImageType(src, alt),
        position: imgIndex === 0 ? 'hero' : 'inline',
        hasAlt: !!alt && alt.length > 0,
        width: widthMatch ? parseInt(widthMatch[1], 10) : undefined,
        height: heightMatch ? parseInt(heightMatch[1], 10) : undefined,
      });

      imgIndex++;
    }

    // Check for video
    hasVideo = !!(
      html.match(/<video/i) ||
      html.match(/youtube\.com|youtu\.be|vimeo\.com/i) ||
      html.match(/<iframe[^>]+src=["'][^"']*(?:youtube|vimeo)[^"']*["']/i)
    );

    if (hasVideo) {
      const youtubeMatches = html.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/gi) || [];
      const vimeoMatches = html.match(/vimeo\.com\/video\/(\d+)/gi) || [];
      videoSources.push(...youtubeMatches, ...vimeoMatches);
    }

    // Count tables and lists
    tableCount = (html.match(/<table/gi) || []).length;
    listCount = (html.match(/<ul|<ol/gi) || []).length;
  } else if (markdown) {
    // Extract from markdown
    const imgMatches = markdown.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
    imgMatches.forEach((match, index) => {
      const altMatch = match.match(/!\[([^\]]*)\]/);
      const srcMatch = match.match(/\]\(([^)]+)\)/);
      const alt = altMatch ? altMatch[1] : '';
      const src = srcMatch ? srcMatch[1] : '';

      images.push({
        src,
        alt,
        type: classifyImageType(src, alt),
        position: index === 0 ? 'hero' : 'inline',
        hasAlt: !!alt && alt.length > 0,
      });
    });

    // Estimate tables and lists from markdown
    tableCount = (markdown.match(/\|.*\|/g) || []).length > 2 ? 1 : 0;
    listCount = (markdown.match(/^[-*]\s/gm) || []).length > 0 ? 1 : 0;

    warnings.push('Visual analysis from markdown (may be incomplete)');
  }

  // Calculate alt text quality
  const withAlt = images.filter(img => img.hasAlt).length;
  const withoutAlt = images.length - withAlt;
  const descriptive = images.filter(img => img.alt && img.alt.length > 10).length;
  const keywordStuffed = images.filter(img => img.alt && img.alt.split(' ').length > 10).length;
  const altTextScore = images.length > 0
    ? Math.round((withAlt / images.length) * 100)
    : 100;

  const heroImage = images.find(img => img.position === 'hero');

  return {
    imageCount: images.length,
    imageCountSource: html ? 'html' : markdown ? 'markdown' : 'estimated',
    images,
    heroImage,
    hasVideo,
    videoSources,
    tableCount,
    listCount,
    altTextQuality: {
      score: altTextScore,
      withAlt,
      withoutAlt,
      descriptive,
      keywordStuffed,
    },
  };
}

// =============================================================================
// TECHNICAL SEO EXTRACTION
// =============================================================================

function extractTechnicalSeo(
  html: string | null,
  warnings: string[]
): TechnicalSeoAnalysis {
  const schemaTypes: string[] = [];
  let schemaSource: TechnicalSeoAnalysis['schemaSource'] = 'none';
  const schemaEntities: TechnicalSeoAnalysis['schemaEntities'] = [];
  let hasAboutMentions = false;
  let hasBreadcrumbs = false;
  let breadcrumbStructure: string[] | undefined;
  const semanticTags: string[] = [];
  const metaTags: TechnicalSeoAnalysis['metaTags'] = {};

  if (!html) {
    warnings.push('Technical analysis unavailable (no HTML)');
    return {
      schemaTypes,
      schemaSource,
      schemaEntities,
      hasAboutMentions,
      hasBreadcrumbs,
      semanticTags,
      metaTags,
    };
  }

  // Extract JSON-LD schema
  const schemaRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let schemaMatch;
  while ((schemaMatch = schemaRegex.exec(html)) !== null) {
    try {
      const schemaData = JSON.parse(schemaMatch[1]);
      const schemas = Array.isArray(schemaData) ? schemaData : [schemaData];

      for (const schema of schemas) {
        if (schema['@type']) {
          const types = Array.isArray(schema['@type']) ? schema['@type'] : [schema['@type']];
          schemaTypes.push(...types);
          schemaSource = 'json-ld';
        }

        // Check for about property
        if (schema.about) {
          hasAboutMentions = true;
          const aboutEntities = Array.isArray(schema.about) ? schema.about : [schema.about];
          for (const entity of aboutEntities) {
            if (entity.name || entity['@id']) {
              schemaEntities.push({
                name: entity.name || '',
                type: entity['@type'] || 'Thing',
                wikidataId: extractWikidataId(entity.sameAs || entity['@id']),
              });
            }
          }
        }

        // Check for breadcrumbs
        if (schema['@type'] === 'BreadcrumbList' && schema.itemListElement) {
          hasBreadcrumbs = true;
          breadcrumbStructure = schema.itemListElement.map((item: any) => item.name || item.item?.name || '');
        }
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }

  // Deduplicate schema types
  const uniqueSchemaTypes = [...new Set(schemaTypes)];

  // Extract semantic HTML tags
  const semanticTagNames = ['article', 'main', 'aside', 'nav', 'header', 'footer', 'section'];
  for (const tag of semanticTagNames) {
    if (new RegExp(`<${tag}[\\s>]`, 'i').test(html)) {
      semanticTags.push(tag);
    }
  }

  // Extract meta tags
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  metaTags.title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : undefined;

  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  metaTags.description = descMatch ? decodeHtmlEntities(descMatch[1]) : undefined;

  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  metaTags.canonical = canonicalMatch ? canonicalMatch[1] : undefined;

  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  metaTags.ogTitle = ogTitleMatch ? decodeHtmlEntities(ogTitleMatch[1]) : undefined;

  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  metaTags.ogDescription = ogDescMatch ? decodeHtmlEntities(ogDescMatch[1]) : undefined;

  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  metaTags.ogImage = ogImageMatch ? ogImageMatch[1] : undefined;

  return {
    schemaTypes: uniqueSchemaTypes,
    schemaSource,
    schemaEntities,
    hasAboutMentions,
    hasBreadcrumbs,
    breadcrumbStructure,
    semanticTags,
    metaTags,
  };
}

// =============================================================================
// SEMANTIC ANALYSIS EXTRACTION
// =============================================================================

function extractSemanticAnalysis(
  html: string | null,
  markdown: string | null,
  structure: ContentStructure,
  warnings: string[]
): SemanticAnalysis {
  // Use heading proxy for EAV extraction (simplified approach)
  // In production, this would call AI-powered EAV extraction
  const eavTriples: ClassifiedSemanticTriple[] = [];
  const topicsDiscussed: string[] = [];
  const uniqueAngles: string[] = [];
  const keyPhrases: string[] = [];

  // Extract topics from headings
  for (const heading of structure.headings) {
    if (heading.level === 2) {
      topicsDiscussed.push(heading.text);

      // Create a simplified EAV triple from heading using correct SemanticTriple structure
      eavTriples.push({
        subject: {
          label: structure.h1 || structure.title,
          type: 'Topic',
        },
        predicate: {
          relation: heading.text,
          type: 'section',
          category: 'COMMON' as const,
          classification: 'TYPE' as const,
        },
        object: {
          value: '',
          type: 'text',
        },
        attributeRarity: 'unknown',
      });
    }
  }

  // Extract key phrases from text
  const text = html ? stripHtmlTags(html) : markdown ? stripMarkdown(markdown) : '';
  if (text) {
    // Simple key phrase extraction (words that appear multiple times)
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      if (word.length > 4) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    const sortedWords = [...wordCounts.entries()]
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    keyPhrases.push(...sortedWords.map(([word]) => word));
  }

  warnings.push('EAV extraction uses heading proxy (simplified)');

  return {
    eavTriples,
    eavSource: 'heading-proxy',
    topicsDiscussed,
    uniqueAngles,
    keyPhrases,
  };
}

// =============================================================================
// LINK SUMMARY EXTRACTION
// =============================================================================

function extractLinkSummary(
  html: string | null,
  warnings: string[]
): LinkSummary {
  if (!html) {
    return {
      internalCount: 0,
      externalCount: 0,
      authorityLinks: [],
      noFollowCount: 0,
    };
  }

  const links: { href: string; isNoFollow: boolean }[] = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const isNoFollow = /rel=["'][^"']*nofollow[^"']*["']/i.test(match[0]);
    links.push({ href, isNoFollow });
  }

  // Get base domain from first link that looks internal
  const internalLinks = links.filter(link =>
    link.href.startsWith('/') ||
    link.href.startsWith('#') ||
    !link.href.startsWith('http')
  );

  const externalLinks = links.filter(link =>
    link.href.startsWith('http') &&
    !link.href.startsWith('/')
  );

  // Find authority links
  const authorityPatterns = ['.edu', '.gov', 'wikipedia.org', 'britannica.com'];
  const authorityLinks = externalLinks
    .filter(link => authorityPatterns.some(pattern => link.href.includes(pattern)))
    .map(link => link.href);

  const noFollowCount = links.filter(link => link.isNoFollow).length;

  return {
    internalCount: internalLinks.length,
    externalCount: externalLinks.length,
    authorityLinks,
    noFollowCount,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function stripHtmlTags(html: string): string {
  // Remove script and style content
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode HTML entities
  text = decodeHtmlEntities(text);
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function stripMarkdown(markdown: string): string {
  let text = markdown;
  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`[^`]+`/g, '');
  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove images
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
  // Remove headings markers
  text = text.replace(/^#{1,6}\s+/gm, '');
  // Remove bold/italic
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function countWords(text: string): number {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

function countSentences(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  return sentences.length;
}

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&mdash;': '—',
    '&ndash;': '–',
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'gi'), char);
  }

  // Handle numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));

  return decoded;
}

function estimateReadingLevel(avgSentenceLength: number, wordCount: number): string {
  // Simplified Flesch-Kincaid approximation
  if (avgSentenceLength < 12) return 'Grade 6-8';
  if (avgSentenceLength < 17) return 'Grade 9-12';
  if (avgSentenceLength < 21) return 'College';
  return 'Post-Graduate';
}

function estimateAudienceLevel(readingLevel: string): ContentMetrics['audienceLevel'] {
  if (readingLevel.includes('6-8')) return 'beginner';
  if (readingLevel.includes('9-12')) return 'intermediate';
  if (readingLevel.includes('College')) return 'intermediate';
  return 'expert';
}

function detectHeadingPattern(headings: { level: number; text: string }[]): ContentStructure['headingPattern'] {
  const h2s = headings.filter(h => h.level === 2).map(h => h.text.toLowerCase());

  if (h2s.some(h => h.includes('?') || h.startsWith('what') || h.startsWith('how') || h.startsWith('why'))) {
    return 'question-based';
  }
  if (h2s.some(h => h.startsWith('step') || h.includes('how to'))) {
    return 'how-to';
  }
  if (h2s.some(h => /^\d+\.?\s/.test(h) || h.includes('best') || h.includes('top'))) {
    return 'numbered-list';
  }

  return 'descriptive';
}

function detectContentTemplate(
  headings: { level: number; text: string }[],
  html: string | null,
  markdown: string | null
): ContentStructure['contentTemplate'] {
  const text = (html || markdown || '').toLowerCase();
  const headingTexts = headings.map(h => h.text.toLowerCase());

  if (headingTexts.some(h => h.includes('pros') || h.includes('cons') || h.includes('vs') || h.includes('comparison'))) {
    return 'comparison';
  }
  if (headingTexts.some(h => h.includes('price') || h.includes('buy') || h.includes('specifications'))) {
    return 'product';
  }
  if (headingTexts.some(h => h.includes('step') || /^\d+\./.test(h))) {
    return 'how-to';
  }
  if (text.includes('faq') || headingTexts.some(h => h.includes('frequently asked'))) {
    return 'faq';
  }
  if (headingTexts.filter(h => /^\d+/.test(h)).length >= 3) {
    return 'listicle';
  }
  if (headingTexts.some(h => h.includes('review') || h.includes('rating'))) {
    return 'review';
  }

  return 'guide';
}

function classifyImageType(src: string, alt: string): ImageInventoryItem['type'] {
  const combined = (src + ' ' + alt).toLowerCase();

  if (combined.includes('diagram') || combined.includes('flow') || combined.includes('process')) {
    return 'diagram';
  }
  if (combined.includes('infographic') || combined.includes('stats') || combined.includes('statistics')) {
    return 'infographic';
  }
  if (combined.includes('chart') || combined.includes('graph') || combined.includes('pie')) {
    return 'chart';
  }
  if (combined.includes('screenshot') || combined.includes('screen')) {
    return 'screenshot';
  }
  if (combined.includes('icon') || combined.includes('logo')) {
    return 'icon';
  }
  if (combined.includes('photo') || combined.includes('image')) {
    return 'photo';
  }

  return 'unknown';
}

function extractWikidataId(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const match = url.match(/wikidata\.org\/(?:wiki|entity)\/(Q\d+)/i);
  return match ? match[1] : undefined;
}

// =============================================================================
// FALLBACK FETCH FUNCTIONS
// =============================================================================

async function fetchWithFirecrawl(
  url: string,
  apiKey: string
): Promise<{ html: string; markdown: string }> {
  // Firecrawl API integration
  const response = await fetch(API_ENDPOINTS.FIRECRAWL_SCRAPE_V0, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      pageOptions: {
        onlyMainContent: false,
        includeHtml: true,
        waitFor: 3000,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Firecrawl API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    html: data.data?.html || '',
    markdown: data.data?.markdown || data.data?.content || '',
  };
}

async function directFetch(
  url: string,
  proxyConfig?: ExtractionOptions['proxyConfig']
): Promise<string> {
  let response: Response;

  if (proxyConfig?.supabaseUrl) {
    // Use Supabase proxy
    const proxyUrl = `${proxyConfig.supabaseUrl}/functions/v1/fetch-proxy`;
    response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': proxyConfig.supabaseAnonKey,
        'Authorization': `Bearer ${proxyConfig.supabaseAnonKey}`,
      },
      body: JSON.stringify({
        url,
        method: 'GET',
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Proxy request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.body || '';
  } else {
    // Direct fetch (may fail due to CORS in browser)
    response = await fetch(url, {
      headers: {
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      throw new Error(`Direct fetch failed: ${response.status}`);
    }

    return await response.text();
  }
}

// =============================================================================
// BATCH EXTRACTION
// =============================================================================

/**
 * Extract data from multiple URLs with rate limiting
 */
export async function extractMultiple(
  urls: string[],
  options: ExtractionOptions & { delayMs?: number }
): Promise<Map<string, ExtractionResult>> {
  const results = new Map<string, ExtractionResult>();
  const delayMs = options.delayMs ?? 500;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    try {
      const result = await extractComprehensive(url, options);
      results.set(url, result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const failedResult: FailedExtraction = {
        url,
        domain: extractDomain(url),
        fetchedAt: new Date(),
        fetchStatus: {
          htmlSuccess: false,
          markdownSuccess: false,
          provider: 'failed',
          warnings: [`Extraction failed: ${errorMsg}`],
          fetchedAt: new Date(),
        },
        error: errorMsg,
      };
      results.set(url, failedResult);
    }

    // Rate limiting delay between requests
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
