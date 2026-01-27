/**
 * CannibalizationWarnings Component
 *
 * Displays warnings when topics are too semantically similar (distance < 0.2),
 * indicating potential keyword cannibalization risk.
 *
 * Based on semantic distance calculations from lib/knowledgeGraph.ts
 */

import React, { useState, useMemo } from 'react';
import { EnrichedTopic } from '../../types';
import { KnowledgeGraph } from '../../lib/knowledgeGraph';
import { findCannibalizationRisks } from '../../services/ai/clustering';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface CannibalizationWarningsProps {
  topics: EnrichedTopic[];
  knowledgeGraph: KnowledgeGraph | null;
  onSelectTopic?: (topicId: string) => void;
  collapsed?: boolean;
}

const CannibalizationWarnings: React.FC<CannibalizationWarningsProps> = ({
  topics,
  knowledgeGraph,
  onSelectTopic,
  collapsed = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(!collapsed);

  const risks = useMemo(() => {
    if (!knowledgeGraph || topics.length < 2) return [];
    return findCannibalizationRisks(topics, knowledgeGraph);
  }, [topics, knowledgeGraph]);

  // Don't render if no risks
  if (risks.length === 0) return null;

  const severityColor = (distance: number) => {
    if (distance < 0.1) return 'text-red-400 bg-red-900/30 border-red-700/50';
    return 'text-amber-400 bg-amber-900/30 border-amber-700/50';
  };

  const severityLabel = (distance: number) => {
    if (distance < 0.1) return 'High Risk';
    return 'Moderate Risk';
  };

  return (
    <Card className="border-amber-700/50 bg-amber-900/10">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between text-left hover:bg-amber-900/20 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-amber-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </span>
          <div>
            <h3 className="text-sm font-semibold text-amber-300">
              Cannibalization Warnings
            </h3>
            <p className="text-xs text-amber-400/70">
              {risks.length} topic pair{risks.length !== 1 ? 's' : ''} with overlapping content
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-amber-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-3 pt-0 space-y-2">
          <p className="text-xs text-gray-400 mb-3">
            Topics with semantic distance &lt;0.2 may compete for the same keywords.
            Consider merging or differentiating them.
          </p>

          {risks.slice(0, 5).map((risk, index) => (
            <div
              key={`${risk.topicA.id}-${risk.topicB.id}`}
              className={`p-3 rounded border ${severityColor(risk.distance)}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {severityLabel(risk.distance)}
                </span>
                <span className="text-xs opacity-70">
                  Distance: {(risk.distance * 100).toFixed(0)}%
                </span>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => onSelectTopic?.(risk.topicA.id)}
                  className="w-full text-left text-sm text-white hover:underline truncate"
                >
                  {risk.topicA.title}
                </button>
                <div className="flex items-center gap-2 pl-2">
                  <span className="text-gray-500">↔</span>
                </div>
                <button
                  onClick={() => onSelectTopic?.(risk.topicB.id)}
                  className="w-full text-left text-sm text-white hover:underline truncate"
                >
                  {risk.topicB.title}
                </button>
              </div>

              {risk.recommendation && (
                <p className="text-[10px] text-gray-400 mt-2 italic">
                  {risk.recommendation}
                </p>
              )}
            </div>
          ))}

          {risks.length > 5 && (
            <p className="text-xs text-amber-400/70 text-center pt-2">
              +{risks.length - 5} more warning{risks.length - 5 !== 1 ? 's' : ''}
            </p>
          )}

          <div className="pt-2 border-t border-amber-700/30">
            <p className="text-[10px] text-gray-500">
              <strong>Recommended actions:</strong> Merge similar topics, differentiate by adding unique EAVs,
              or adjust URL slugs to target different keyword intents.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CannibalizationWarnings;
