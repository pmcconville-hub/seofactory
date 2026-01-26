/**
 * BridgingOpportunitiesPanel
 *
 * Displays structural holes in the knowledge graph at the topical map level.
 * Shows content gaps between topic clusters and suggests bridge content.
 */

import React, { useState, useMemo } from 'react';
import { KnowledgeGraph, StructuralHole } from '../../lib/knowledgeGraph';
import { generateBridgeSuggestions, BridgeSuggestion, BridgeSuggestionInput } from '../../services/ai/bridgeSuggestionService';
import { SemanticTriple, SEOPillars, EnrichedTopic } from '../../types';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';

interface BridgingOpportunitiesPanelProps {
  knowledgeGraph: KnowledgeGraph | null;
  eavs: SemanticTriple[];
  pillars?: SEOPillars;
  topics: EnrichedTopic[];
  onCreateBridgeTopic?: (title: string, parentId?: string) => void;
}

// Priority colors and labels
const priorityConfig = {
  critical: { color: 'bg-red-500', textColor: 'text-red-400', label: 'Critical Gap' },
  high: { color: 'bg-orange-500', textColor: 'text-orange-400', label: 'High Priority' },
  medium: { color: 'bg-yellow-500', textColor: 'text-yellow-400', label: 'Medium Priority' },
  low: { color: 'bg-blue-500', textColor: 'text-blue-400', label: 'Low Priority' },
};

interface StructuralHoleCardProps {
  hole: StructuralHole;
  index: number;
  eavs: SemanticTriple[];
  pillars?: SEOPillars;
  onCreateBridgeTopic?: (title: string, parentId?: string) => void;
}

const StructuralHoleCard: React.FC<StructuralHoleCardProps> = ({
  hole,
  index,
  eavs,
  pillars,
  onCreateBridgeTopic,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<BridgeSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const config = priorityConfig[hole.priority];

  const handleGetSuggestions = async () => {
    setIsLoadingSuggestions(true);
    setError(null);
    try {
      const input: BridgeSuggestionInput = {
        structuralHole: hole,
        eavs,
        sourceContext: pillars?.sourceContext,
        centralSearchIntent: pillars?.centralSearchIntent,
      };
      const result = await generateBridgeSuggestions(input, false);
      setSuggestions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Get human-readable cluster names (first 3 entities)
  const clusterALabel = hole.clusterA.slice(0, 3).join(', ') + (hole.clusterA.length > 3 ? '...' : '');
  const clusterBLabel = hole.clusterB.slice(0, 3).join(', ') + (hole.clusterB.length > 3 ? '...' : '');

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-start gap-3 hover:bg-gray-700/30 transition-colors text-left"
      >
        {/* Priority indicator */}
        <div className={`w-2 h-2 rounded-full ${config.color} mt-1.5 flex-shrink-0`} />

        <div className="flex-1 min-w-0">
          {/* Priority label and connection strength */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium ${config.textColor}`}>
              {config.label}
            </span>
            <span className="text-xs text-gray-500">
              Connection: {(hole.connectionStrength * 100).toFixed(0)}%
            </span>
          </div>

          {/* Cluster summary */}
          <div className="text-sm text-gray-300">
            <span className="text-blue-400">{hole.clusterA.length} topics</span>
            <span className="text-gray-500 mx-2">⟷</span>
            <span className="text-purple-400">{hole.clusterB.length} topics</span>
          </div>

          {/* Brief description */}
          <p className="text-xs text-gray-500 mt-1 truncate">
            Gap between "{clusterALabel}" and "{clusterBLabel}"
          </p>
        </div>

        {/* Expand icon */}
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-700/50">
          {/* Clusters detail */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <h5 className="text-xs font-medium text-blue-400 mb-1">Cluster A ({hole.clusterA.length})</h5>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {hole.clusterA.map((entity, i) => (
                  <div key={i} className="text-xs text-gray-400 truncate">
                    {entity}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-xs font-medium text-purple-400 mb-1">Cluster B ({hole.clusterB.length})</h5>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {hole.clusterB.map((entity, i) => (
                  <div key={i} className="text-xs text-gray-400 truncate">
                    {entity}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bridge candidates */}
          {hole.bridgeCandidates.length > 0 && (
            <div className="mt-3">
              <h5 className="text-xs font-medium text-green-400 mb-1">
                Bridge Candidates ({hole.bridgeCandidates.length})
              </h5>
              <div className="flex flex-wrap gap-1">
                {hole.bridgeCandidates.map((candidate, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20"
                  >
                    {candidate}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Suggestions */}
          <div className="mt-3">
            {!suggestions && !isLoadingSuggestions && (
              <Button
                onClick={handleGetSuggestions}
                variant="secondary"
                size="sm"
                className="w-full"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Get AI Bridge Suggestions
              </Button>
            )}

            {isLoadingSuggestions && (
              <div className="flex items-center justify-center py-3">
                <Loader size="sm" />
                <span className="ml-2 text-sm text-gray-400">Generating suggestions...</span>
              </div>
            )}

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 rounded p-2 mt-2">
                {error}
              </div>
            )}

            {suggestions && (
              <div className="space-y-3 mt-2">
                {/* Research Questions */}
                {suggestions.researchQuestions.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-amber-400 mb-1">Research Questions</h5>
                    <ul className="space-y-1">
                      {suggestions.researchQuestions.map((q, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">?</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Topic Suggestions */}
                {suggestions.topicSuggestions.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-cyan-400 mb-1">Suggested Bridge Topics</h5>
                    <div className="space-y-2">
                      {suggestions.topicSuggestions.map((topic, i) => (
                        <div key={i} className="bg-gray-700/30 rounded p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-200">{topic.title}</span>
                            {onCreateBridgeTopic && (
                              <Button
                                onClick={() => onCreateBridgeTopic(topic.title)}
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                              >
                                + Add
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{topic.rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const BridgingOpportunitiesPanel: React.FC<BridgingOpportunitiesPanelProps> = ({
  knowledgeGraph,
  eavs,
  pillars,
  topics,
  onCreateBridgeTopic,
}) => {
  // Detect structural holes from knowledge graph
  const structuralHoles = useMemo(() => {
    if (!knowledgeGraph) return [];
    try {
      return knowledgeGraph.identifyStructuralHoles(0.15);
    } catch (err) {
      console.error('Failed to identify structural holes:', err);
      return [];
    }
  }, [knowledgeGraph]);

  // Sort by priority
  const sortedHoles = useMemo(() => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...structuralHoles].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [structuralHoles]);

  // Count by priority
  const priorityCounts = useMemo(() => {
    return structuralHoles.reduce(
      (acc, hole) => {
        acc[hole.priority]++;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 }
    );
  }, [structuralHoles]);

  if (!knowledgeGraph) {
    return (
      <div className="text-center py-6 text-gray-500">
        <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <p className="text-sm">Add EAVs to your topical map to detect bridging opportunities</p>
      </div>
    );
  }

  if (structuralHoles.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <svg className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-green-400">No content gaps detected</p>
        <p className="text-xs mt-1">Your topic clusters are well connected</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary stats */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-gray-400">
          {structuralHoles.length} gap{structuralHoles.length !== 1 ? 's' : ''} detected
        </span>
        {priorityCounts.critical > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-red-400">{priorityCounts.critical} critical</span>
          </span>
        )}
        {priorityCounts.high > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-orange-400">{priorityCounts.high} high</span>
          </span>
        )}
      </div>

      {/* Structural hole cards */}
      <div className="space-y-2">
        {sortedHoles.map((hole, index) => (
          <StructuralHoleCard
            key={index}
            hole={hole}
            index={index}
            eavs={eavs}
            pillars={pillars}
            onCreateBridgeTopic={onCreateBridgeTopic}
          />
        ))}
      </div>

      {/* Help text */}
      <div className="text-xs text-gray-500 border-t border-gray-700/50 pt-3">
        <strong className="text-gray-400">What are bridging opportunities?</strong>
        <p className="mt-1">
          These are gaps between topic clusters in your knowledge graph. Creating bridge content
          connects isolated topics, improving topical authority and internal linking.
        </p>
      </div>
    </div>
  );
};

export default BridgingOpportunitiesPanel;
