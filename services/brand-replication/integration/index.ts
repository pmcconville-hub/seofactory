/**
 * Brand Replication Integration Module
 *
 * Provides integration utilities for connecting the brand replication
 * pipeline to existing rendering infrastructure.
 *
 * @module services/brand-replication/integration
 */

export {
  mapDecisionsToBlueprint,
  mergeDecisionsWithBlueprint,
  extractBrandCss,
} from './decisionMapper';

export type {
  ArticleContent,
  DecisionMapperOptions,
} from './decisionMapper';
