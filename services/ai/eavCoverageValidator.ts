import { EnrichedTopic, SemanticTriple } from '../../types';

export interface EAVCoverageResult {
  coveragePercentage: number;
  coveredTriples: Array<{ triple: SemanticTriple; coveredBy: string[] }>;
  uncoveredTriples: SemanticTriple[];
  categoryBreakdown: {
    ROOT: { total: number; covered: number };
    UNIQUE: { total: number; covered: number };
    RARE: { total: number; covered: number };
    COMMON: { total: number; covered: number };
  };
  warnings: string[];
}

/**
 * Validate how well topics cover the discovered EAV triples.
 * Checks topic titles, descriptions, canonical queries, and query networks
 * against EAV subject labels, predicate relations, and object values.
 */
export function validateEAVCoverage(
  topics: EnrichedTopic[],
  eavs: SemanticTriple[]
): EAVCoverageResult {
  if (!eavs || eavs.length === 0) {
    return {
      coveragePercentage: 100,
      coveredTriples: [],
      uncoveredTriples: [],
      categoryBreakdown: {
        ROOT: { total: 0, covered: 0 },
        UNIQUE: { total: 0, covered: 0 },
        RARE: { total: 0, covered: 0 },
        COMMON: { total: 0, covered: 0 },
      },
      warnings: ['No EAVs provided for coverage validation'],
    };
  }

  // Build searchable text corpus from all topics
  const topicTexts = topics.map(t => {
    const parts = [
      t.title,
      t.description,
      t.canonical_query,
      ...(t.query_network || []),
      t.attribute_focus,
    ].filter(Boolean).map(s => s!.toLowerCase());
    return { topic: t, searchText: parts.join(' ') };
  });

  const coveredTriples: EAVCoverageResult['coveredTriples'] = [];
  const uncoveredTriples: SemanticTriple[] = [];

  const categoryBreakdown = {
    ROOT: { total: 0, covered: 0 },
    UNIQUE: { total: 0, covered: 0 },
    RARE: { total: 0, covered: 0 },
    COMMON: { total: 0, covered: 0 },
  };

  for (const eav of eavs) {
    const category = (eav.predicate?.category || 'COMMON') as keyof typeof categoryBreakdown;
    if (categoryBreakdown[category]) {
      categoryBreakdown[category].total++;
    }

    // Build search terms from the EAV
    const searchTerms = [
      eav.subject?.label,
      eav.predicate?.relation,
      typeof eav.object?.value === 'string' ? eav.object.value : undefined,
      ...(eav.lexical?.synonyms || []),
    ].filter(Boolean).map(s => s!.toLowerCase());

    // Check if any topic covers this EAV (at least 2 of the 3 components match)
    const coveringTopics: string[] = [];
    for (const { topic, searchText } of topicTexts) {
      let matchCount = 0;
      for (const term of searchTerms) {
        if (term.length >= 3 && searchText.includes(term)) {
          matchCount++;
        }
      }
      if (matchCount >= 2) {
        coveringTopics.push(topic.title);
      }
    }

    if (coveringTopics.length > 0) {
      coveredTriples.push({ triple: eav, coveredBy: coveringTopics });
      if (categoryBreakdown[category]) {
        categoryBreakdown[category].covered++;
      }
    } else {
      uncoveredTriples.push(eav);
    }
  }

  const coveragePercentage = eavs.length > 0
    ? Math.round((coveredTriples.length / eavs.length) * 100)
    : 100;

  // Generate warnings
  const warnings: string[] = [];
  if (coveragePercentage < 70) {
    warnings.push(`Low EAV coverage: only ${coveragePercentage}% of semantic triples are represented in topics`);
  }
  if (categoryBreakdown.UNIQUE.total > 0 && categoryBreakdown.UNIQUE.covered / categoryBreakdown.UNIQUE.total < 0.5) {
    warnings.push(`Only ${categoryBreakdown.UNIQUE.covered}/${categoryBreakdown.UNIQUE.total} UNIQUE attributes covered — these are your competitive differentiators`);
  }
  if (categoryBreakdown.ROOT.total > 0 && categoryBreakdown.ROOT.covered / categoryBreakdown.ROOT.total < 0.5) {
    warnings.push(`Only ${categoryBreakdown.ROOT.covered}/${categoryBreakdown.ROOT.total} ROOT attributes covered — these are foundational definitions`);
  }

  return {
    coveragePercentage,
    coveredTriples,
    uncoveredTriples,
    categoryBreakdown,
    warnings,
  };
}
