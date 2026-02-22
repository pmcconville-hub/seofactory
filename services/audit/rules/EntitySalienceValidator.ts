/**
 * EntitySalienceValidator
 *
 * Validates that the Central Entity has sufficient salience in page content
 * using Google Cloud NLP entity salience analysis results.
 *
 * Rules:
 *   rule-371 - Central Entity must have top-3 salience
 *   rule-372 - Central Entity salience below threshold (<0.15)
 */

export interface EntitySalienceInput {
  /** Central Entity name */
  centralEntity: string;
  /** NLP entity salience results */
  entities: Array<{
    name: string;
    type: string;
    salience: number;
  }>;
}

export interface EntitySalienceIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

const SALIENCE_THRESHOLD = 0.15;
const TOP_RANK_THRESHOLD = 3;

export class EntitySalienceValidator {
  validate(input: EntitySalienceInput): EntitySalienceIssue[] {
    const issues: EntitySalienceIssue[] = [];

    if (!input.entities?.length || !input.centralEntity) {
      return issues;
    }

    // Sort entities by salience descending
    const sorted = [...input.entities].sort((a, b) => b.salience - a.salience);

    // Find CE in the entity list (case-insensitive)
    const ceLower = input.centralEntity.toLowerCase();
    const ceIndex = sorted.findIndex(
      (e) => e.name.toLowerCase() === ceLower || e.name.toLowerCase().includes(ceLower) || ceLower.includes(e.name.toLowerCase())
    );

    if (ceIndex === -1) {
      // CE not found at all in NLP entities — critical
      issues.push({
        ruleId: 'rule-371',
        severity: 'critical',
        title: 'Central Entity not detected by NLP analysis',
        description:
          `The Central Entity "${input.centralEntity}" was not found among the ${sorted.length} entities ` +
          'detected by Natural Language Processing analysis. This means search engines may not ' +
          'recognize your primary entity as a significant topic on this page.',
        affectedElement: input.centralEntity,
        exampleFix:
          'Ensure the Central Entity is explicitly named (not pronoun-referenced) in the first paragraph, ' +
          'headings, and throughout the content. Use the exact entity name consistently.',
      });
      return issues;
    }

    const ceEntity = sorted[ceIndex];
    const rank = ceIndex + 1;

    // Rule 371: CE must be in top 3 by salience
    if (rank > TOP_RANK_THRESHOLD) {
      issues.push({
        ruleId: 'rule-371',
        severity: 'high',
        title: `Central Entity ranked #${rank} in salience (should be top ${TOP_RANK_THRESHOLD})`,
        description:
          `"${input.centralEntity}" is ranked #${rank} out of ${sorted.length} entities by salience ` +
          `(score: ${(ceEntity.salience * 100).toFixed(1)}%). The top entities are: ` +
          sorted.slice(0, 3).map((e, i) => `#${i + 1} "${e.name}" (${(e.salience * 100).toFixed(1)}%)`).join(', ') +
          '. The Central Entity should dominate page salience to establish clear topical focus.',
        affectedElement: input.centralEntity,
        exampleFix:
          'Increase Central Entity prominence by: (1) naming it explicitly in more sentences, ' +
          '(2) using it as the subject of EAV triples, (3) reducing competing entity mentions, ' +
          '(4) placing it in headings and the first sentence of each section.',
      });
    }

    // Rule 372: CE salience below threshold
    if (ceEntity.salience < SALIENCE_THRESHOLD) {
      issues.push({
        ruleId: 'rule-372',
        severity: rank <= TOP_RANK_THRESHOLD ? 'medium' : 'high',
        title: `Central Entity salience too low (${(ceEntity.salience * 100).toFixed(1)}%)`,
        description:
          `"${input.centralEntity}" has a salience score of ${(ceEntity.salience * 100).toFixed(1)}%, ` +
          `which is below the ${(SALIENCE_THRESHOLD * 100).toFixed(0)}% threshold. Low salience means ` +
          'the entity is not semantically prominent enough for search engines to associate ' +
          'the page strongly with this topic.',
        affectedElement: `${input.centralEntity} (salience: ${(ceEntity.salience * 100).toFixed(1)}%)`,
        exampleFix:
          'Strengthen entity salience by: (1) using the entity name as the grammatical subject ' +
          'in more sentences, (2) adding definitive EAV statements about the entity, ' +
          '(3) reducing dilution from off-topic entities.',
      });
    }

    return issues;
  }
}
