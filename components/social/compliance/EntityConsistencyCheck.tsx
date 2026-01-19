/**
 * EntityConsistencyCheck Component
 *
 * Displays entity consistency validation results across posts.
 */

import React from 'react';
import type { PostComplianceReport } from '../../../types/social';

interface EntityConsistencyCheckProps {
  report: PostComplianceReport;
  expanded?: boolean;
}

export const EntityConsistencyCheck: React.FC<EntityConsistencyCheckProps> = ({
  report,
  expanded = false
}) => {
  const { entity_consistency } = report;
  const isPassing = entity_consistency.score >= 80;
  const hasAmbiguousPronouns = entity_consistency.ambiguous_pronouns.length > 0;

  return (
    <div className={`rounded-lg border p-4 ${
      isPassing ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isPassing ? 'bg-green-500/20' : 'bg-yellow-500/20'
          }`}>
            {isPassing ? (
              <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">Entity Consistency</h4>
            <p className="text-xs text-gray-400">
              {isPassing ? 'Entities clearly referenced' : 'Review entity references'}
            </p>
          </div>
        </div>

        <div className={`text-lg font-bold ${isPassing ? 'text-green-400' : 'text-yellow-400'}`}>
          {Math.round(entity_consistency.score)}%
        </div>
      </div>

      {/* Entities found */}
      {entity_consistency.entities_found.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1.5">Entities mentioned:</p>
          <div className="flex flex-wrap gap-1.5">
            {entity_consistency.entities_found.map((entity, i) => (
              <span
                key={i}
                className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded"
              >
                {entity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ambiguous pronouns warning */}
      {hasAmbiguousPronouns && (
        <div className="mt-3 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
          <p className="text-xs text-yellow-400 font-medium mb-1">
            Ambiguous pronouns found:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {entity_consistency.ambiguous_pronouns.map((pronoun, i) => (
              <span
                key={i}
                className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded"
              >
                "{pronoun}"
              </span>
            ))}
          </div>
          <p className="text-[10px] text-yellow-400/70 mt-2">
            Replace these with explicit entity names for better semantic clarity.
          </p>
        </div>
      )}

      {/* Suggestions */}
      {expanded && !isPassing && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-400 font-medium mb-2">Improvement suggestions:</p>
          <ul className="space-y-1 text-xs text-gray-500">
            <li className="flex items-start gap-1.5">
              <span className="text-blue-400">•</span>
              Explicitly name entities instead of using pronouns
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-blue-400">•</span>
              Use the same entity name consistently throughout
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-blue-400">•</span>
              Avoid "it", "this", "that" when referring to main topics
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Campaign-level entity consistency across all posts
 */
interface CampaignEntityConsistencyProps {
  postReports: PostComplianceReport[];
  hubEntityNames?: string[];
}

export const CampaignEntityConsistency: React.FC<CampaignEntityConsistencyProps> = ({
  postReports,
  hubEntityNames = []
}) => {
  // Collect all entities across posts
  const allEntities = new Map<string, number>();
  postReports.forEach(report => {
    report.entity_consistency.entities_found.forEach(entity => {
      const normalized = entity.toLowerCase();
      allEntities.set(normalized, (allEntities.get(normalized) || 0) + 1);
    });
  });

  // Find inconsistent entities (appear only once)
  const inconsistent = [...allEntities.entries()]
    .filter(([_, count]) => count === 1)
    .map(([entity]) => entity);

  // Find consistent entities
  const consistent = [...allEntities.entries()]
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  const isGood = inconsistent.length === 0 || consistent.length >= inconsistent.length;

  return (
    <div className="rounded-lg border border-gray-700 p-4 bg-gray-800/50">
      <h4 className="text-sm font-medium text-white mb-3">Cross-Post Entity Consistency</h4>

      {/* Consistent entities */}
      {consistent.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1.5">
            <span className="text-green-400">✓</span> Consistently used ({consistent.length}):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {consistent.slice(0, 8).map(([entity, count]) => (
              <span
                key={entity}
                className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded"
              >
                {entity} <span className="text-green-400/60">×{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Inconsistent entities */}
      {inconsistent.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1.5">
            <span className="text-yellow-400">!</span> Only mentioned once ({inconsistent.length}):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {inconsistent.slice(0, 8).map(entity => (
              <span
                key={entity}
                className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded"
              >
                {entity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hub entity coverage */}
      {hubEntityNames.length > 0 && (
        <div className="pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-500 mb-1.5">Hub entity coverage:</p>
          <div className="flex flex-wrap gap-1.5">
            {hubEntityNames.map(entity => {
              const isCovered = allEntities.has(entity.toLowerCase());
              return (
                <span
                  key={entity}
                  className={`text-xs px-2 py-0.5 rounded ${
                    isCovered
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {entity} {isCovered ? '✓' : '✗'}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityConsistencyCheck;
