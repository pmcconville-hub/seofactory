// utils/eavUtils.ts
// Utility functions for extracting structured data from EAV triples

import type { SemanticTriple, EnrichedTopic } from '../types';

/**
 * Service-related predicate patterns.
 * Matches predicates that indicate the entity offers/provides a service or product.
 */
const SERVICE_PREDICATE_PATTERNS = [
  'offers', 'provides', 'specializes', 'service', 'performs',
  'has_feature', 'solution', 'delivers', 'supplies', 'installs',
];

const SERVICE_PREDICATE_EXACT = [
  'offers_service', 'provides_solution', 'has_feature', 'specializes_in',
  'offers_product', 'provides_service', 'performs_service',
];

const SERVICE_CLASSIFICATIONS = new Set(['COMPONENT', 'BENEFIT']);

/**
 * Extract business services/products from EAV triples.
 *
 * Strategy:
 * 1. Exact predicate match (offers_service, provides_solution, etc.)
 * 2. Predicate contains service keyword (offers, provides, etc.)
 * 3. COMPONENT/BENEFIT classification where subject matches CE
 * 4. Deduplicate by normalized object value
 */
export function extractServicesFromEavs(
  eavs: SemanticTriple[],
  centralEntity: string
): string[] {
  if (!eavs || eavs.length === 0) return [];

  const ceLower = centralEntity.toLowerCase();
  const seen = new Set<string>();
  const services: string[] = [];

  const addService = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (normalized && normalized.length > 1 && !seen.has(normalized)) {
      seen.add(normalized);
      services.push(value.trim());
    }
  };

  for (const eav of eavs) {
    const predicate = (eav.predicate?.relation || eav.attribute || '').toLowerCase();
    const objectValue = String(eav.object?.value ?? eav.value ?? '');
    const subjectLabel = (eav.subject?.label || eav.entity || '').toLowerCase();
    const classification = eav.predicate?.classification || eav.classification;

    if (!objectValue.trim()) continue;

    // 1. Exact predicate match
    if (SERVICE_PREDICATE_EXACT.some(p => predicate === p)) {
      addService(objectValue);
      continue;
    }

    // 2. Predicate contains service keyword
    if (SERVICE_PREDICATE_PATTERNS.some(p => predicate.includes(p))) {
      addService(objectValue);
      continue;
    }

    // 3. COMPONENT/BENEFIT classification where subject matches CE
    if (
      classification &&
      SERVICE_CLASSIFICATIONS.has(classification) &&
      (subjectLabel.includes(ceLower) || ceLower.includes(subjectLabel))
    ) {
      addService(objectValue);
    }
  }

  return services;
}

/**
 * Summarize EAVs for prompt inclusion.
 * Prioritizes UNIQUE/RARE over COMMON/ROOT to preserve differentiating attributes.
 *
 * - For ≤30 EAVs: include all
 * - For >30 EAVs: all UNIQUE/RARE + first 20 COMMON/ROOT
 */
export function summarizeEavsForPrompt(eavs: SemanticTriple[]): string {
  if (!eavs || eavs.length === 0) return '[]';

  if (eavs.length <= 30) {
    return JSON.stringify(eavs, null, 2);
  }

  const priorityCategories = new Set(['UNIQUE', 'RARE', 'CORE_DEFINITION', 'SEARCH_DEMAND']);
  const priority: SemanticTriple[] = [];
  const standard: SemanticTriple[] = [];

  for (const eav of eavs) {
    const category = eav.predicate?.category || eav.category || 'UNCLASSIFIED';
    if (priorityCategories.has(category)) {
      priority.push(eav);
    } else {
      standard.push(eav);
    }
  }

  const result = [...priority, ...standard.slice(0, 20)];
  return JSON.stringify(result, null, 2);
}

// ── Stop words to exclude from slug matching ──
const SLUG_STOP_WORDS = new Set([
  'the', 'and', 'for', 'van', 'het', 'een', 'des', 'der', 'die', 'das',
  'mit', 'und', 'fur', 'les', 'des', 'aux', 'pour', 'con', 'del', 'los',
  'wat', 'hoe', 'over', 'met', 'bij', 'naar', 'uit', 'als',
  'what', 'how', 'about', 'with', 'from', 'your', 'our', 'best', 'top',
]);

/**
 * Extract meaningful words from a URL path or slug.
 * Splits on slashes and hyphens, filters short/stop words.
 */
function extractPathWords(path: string): string[] {
  return path
    .toLowerCase()
    .split(/[/\-_]+/)
    .filter(w => w.length > 2 && !SLUG_STOP_WORDS.has(w));
}

/**
 * Match topics to existing crawled URLs by slug similarity
 * and set `target_url` on matched topics (mutates in-place).
 *
 * Matching strategy (mirrors ExistingPageMappingPanel logic):
 * 1. Exact slug match → set target_url
 * 2. Partial match (≥2 meaningful word overlap) → set target_url to best match
 */
export function matchTopicsToExistingUrls(
  topics: EnrichedTopic[],
  crawledUrls: string[],
  domain?: string
): void {
  if (!crawledUrls.length) return;

  // Parse crawled URLs into pathname + word tokens
  const crawledEntries = crawledUrls.map(url => {
    let pathname: string;
    try {
      pathname = new URL(url).pathname.replace(/\/$/, '').toLowerCase();
    } catch {
      pathname = url.replace(/\/$/, '').toLowerCase();
    }
    return { url, pathname, words: extractPathWords(pathname) };
  });

  // Build a Set of normalized pathnames for fast exact-match lookup
  const crawledPathSet = new Set(crawledEntries.map(e => e.pathname));

  for (const topic of topics) {
    // Skip topics that already have a target_url
    if (topic.target_url) continue;

    const slug = topic.slug;
    if (!slug) continue;

    const normalizedSlug = `/${slug.replace(/^\//, '')}`.toLowerCase();

    // 1. Exact match
    if (crawledPathSet.has(normalizedSlug)) {
      const matched = crawledEntries.find(e => e.pathname === normalizedSlug);
      if (matched) {
        topic.target_url = matched.url;
        continue;
      }
    }

    // 2. Partial match — find best crawled URL by word overlap
    const slugWords = extractPathWords(slug);
    if (slugWords.length < 2) continue; // Need at least 2 words to partial-match

    let bestMatch: { url: string; overlap: number } | null = null;
    for (const entry of crawledEntries) {
      if (entry.words.length === 0) continue;
      const overlap = slugWords.filter(w => entry.words.includes(w)).length;
      if (overlap >= 2 && (!bestMatch || overlap > bestMatch.overlap)) {
        bestMatch = { url: entry.url, overlap };
      }
    }

    if (bestMatch) {
      topic.target_url = bestMatch.url;
    }
  }
}
