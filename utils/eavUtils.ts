// utils/eavUtils.ts
// Utility functions for extracting structured data from EAV triples

import type { SemanticTriple } from '../types';

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
