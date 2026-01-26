/**
 * TopicBridgingContext
 *
 * Shows bridging opportunities specific to a topic in the Content Brief modal.
 * Displays which structural holes this topic could help bridge and provides
 * AI-generated suggestions for bridge content.
 */

import React, { useState, useMemo } from 'react';
import { KnowledgeGraph, StructuralHole } from '../../lib/knowledgeGraph';
import { generateBridgeSuggestions, BridgeSuggestion, BridgeSuggestionInput } from '../../services/ai/bridgeSuggestionService';
import { EnrichedTopic, SemanticTriple, SEOPillars } from '../../types';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { Card } from '../ui/Card';

interface TopicBridgingContextProps {
  topic: EnrichedTopic;
  knowledgeGraph: KnowledgeGraph | null;
  eavs: SemanticTriple[];
  pillars?: SEOPillars;
  allTopics: EnrichedTopic[];
}

// Priority colors
const priorityColors = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};

export const TopicBridgingContext: React.FC<TopicBridgingContextProps> = ({
  topic,
  knowledgeGraph,
  eavs,
  pillars,
  allTopics,
}) => {
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<BridgeSuggestion | null>(null);
  const [selectedHole, setSelectedHole] = useState<StructuralHole | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Find structural holes that this topic could help bridge
  const relevantHoles = useMemo(() => {
    if (!knowledgeGraph) return [];

    try {
      const allHoles = knowledgeGraph.identifyStructuralHoles(0.15);
      const topicTitle = topic.title.toLowerCase();
      const topicKeywords = topicTitle.split(/\s+/);

      // Find holes where:
      // 1. Topic title matches entities in either cluster
      // 2. Topic title matches bridge candidates
      // 3. Topic has semantic overlap with cluster entities
      return allHoles.filter(hole => {
        const allEntities = [...hole.clusterA, ...hole.clusterB, ...hole.bridgeCandidates];
        const entitiesLower = allEntities.map(e => e.toLowerCase());

        // Direct match
        if (entitiesLower.some(e => e.includes(topicTitle) || topicTitle.includes(e))) {
          return true;
        }

        // Keyword overlap
        const hasKeywordOverlap = topicKeywords.some(keyword =>
          keyword.length > 3 && entitiesLower.some(e => e.includes(keyword))
        );

        return hasKeywordOverlap;
      });
    } catch (err) {
      console.error('Failed to find relevant holes:', err);
      return [];
    }
  }, [knowledgeGraph, topic.title]);

  // Determine bridging role for this topic
  const bridgingRole = useMemo(() => {
    if (relevantHoles.length === 0) return null;

    const topicTitle = topic.title.toLowerCase();
    const roles: string[] = [];

    for (const hole of relevantHoles) {
      const inClusterA = hole.clusterA.some(e => e.toLowerCase().includes(topicTitle) || topicTitle.includes(e.toLowerCase()));
      const inClusterB = hole.clusterB.some(e => e.toLowerCase().includes(topicTitle) || topicTitle.includes(e.toLowerCase()));
      const isBridgeCandidate = hole.bridgeCandidates.some(e => e.toLowerCase().includes(topicTitle) || topicTitle.includes(e.toLowerCase()));

      if (isBridgeCandidate) {
        roles.push('Bridge Candidate');
      } else if (inClusterA && !inClusterB) {
        roles.push('Cluster A');
      } else if (inClusterB && !inClusterA) {
        roles.push('Cluster B');
      }
    }

    return [...new Set(roles)];
  }, [relevantHoles, topic.title]);

  // Get suggested internal links based on bridging opportunities
  const suggestedLinks = useMemo(() => {
    if (relevantHoles.length === 0) return [];

    const links: { topic: EnrichedTopic; reason: string }[] = [];
    const topicTitle = topic.title.toLowerCase();

    for (const hole of relevantHoles) {
      // If this topic is in Cluster A, suggest links to Cluster B topics
      const inClusterA = hole.clusterA.some(e => e.toLowerCase().includes(topicTitle) || topicTitle.includes(e.toLowerCase()));
      const inClusterB = hole.clusterB.some(e => e.toLowerCase().includes(topicTitle) || topicTitle.includes(e.toLowerCase()));

      const targetCluster = inClusterA ? hole.clusterB : inClusterB ? hole.clusterA : [];

      for (const entity of targetCluster) {
        const matchingTopic = allTopics.find(t =>
          t.id !== topic.id &&
          (t.title.toLowerCase().includes(entity.toLowerCase()) ||
           entity.toLowerCase().includes(t.title.toLowerCase()))
        );

        if (matchingTopic && !links.find(l => l.topic.id === matchingTopic.id)) {
          links.push({
            topic: matchingTopic,
            reason: `Bridges gap to ${inClusterA ? 'Cluster B' : 'Cluster A'}`,
          });
        }
      }
    }

    return links.slice(0, 5); // Limit to 5 suggestions
  }, [relevantHoles, topic, allTopics]);

  const handleGetSuggestions = async (hole: StructuralHole) => {
    setIsLoadingSuggestions(true);
    setError(null);
    setSelectedHole(hole);

    try {
      const input: BridgeSuggestionInput = {
        structuralHole: hole,
        eavs,
        sourceContext: pillars?.sourceContext,
        centralSearchIntent: pillars?.centralSearchIntent,
        focusTopic: topic.title,
      };
      const result = await generateBridgeSuggestions(input, false);
      setSuggestions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  if (!knowledgeGraph) {
    return null;
  }

  if (relevantHoles.length === 0) {
    return null; // Don't show section if no relevant bridging opportunities
  }

  return (
    <Card className="p-4 bg-emerald-950/20 border border-emerald-800/50">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <h3 className="font-semibold text-lg text-emerald-300">Bridging Opportunities</h3>
        {bridgingRole && bridgingRole.length > 0 && (
          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
            {bridgingRole.join(' | ')}
          </span>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-4">
        This topic can help connect disconnected content clusters in your topical map.
      </p>

      {/* Relevant structural holes */}
      <div className="space-y-3 mb-4">
        <h4 className="text-sm font-medium text-gray-300">Content Gaps This Topic Can Bridge</h4>
        {relevantHoles.map((hole, idx) => (
          <div
            key={idx}
            className={`p-3 rounded border ${priorityColors[hole.priority]}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase">
                {hole.priority} priority gap
              </span>
              <span className="text-xs opacity-70">
                {(hole.connectionStrength * 100).toFixed(0)}% connected
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-blue-400 font-medium">Cluster A:</span>
                <div className="text-gray-400 mt-1">
                  {hole.clusterA.slice(0, 3).join(', ')}
                  {hole.clusterA.length > 3 && ` +${hole.clusterA.length - 3}`}
                </div>
              </div>
              <div>
                <span className="text-purple-400 font-medium">Cluster B:</span>
                <div className="text-gray-400 mt-1">
                  {hole.clusterB.slice(0, 3).join(', ')}
                  {hole.clusterB.length > 3 && ` +${hole.clusterB.length - 3}`}
                </div>
              </div>
            </div>

            {/* AI Suggestions button */}
            <div className="mt-3">
              {selectedHole === hole && suggestions ? (
                <div className="space-y-2">
                  {suggestions.researchQuestions.length > 0 && (
                    <div>
                      <span className="text-xs text-amber-400 font-medium">Research Questions:</span>
                      <ul className="mt-1 space-y-1">
                        {suggestions.researchQuestions.slice(0, 2).map((q, i) => (
                          <li key={i} className="text-xs text-gray-300 flex items-start gap-1">
                            <span className="text-amber-500">?</span> {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  onClick={() => handleGetSuggestions(hole)}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  disabled={isLoadingSuggestions && selectedHole === hole}
                >
                  {isLoadingSuggestions && selectedHole === hole ? (
                    <>
                      <Loader size="sm" className="mr-1" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Get Bridge Content Ideas
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Suggested internal links */}
      {suggestedLinks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Suggested Internal Links (Bridge Building)</h4>
          <div className="space-y-2">
            {suggestedLinks.map((link, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-gray-800/50 rounded border border-gray-700/50"
              >
                <div>
                  <span className="text-sm text-white">{link.topic.title}</span>
                  <span className="text-xs text-gray-500 ml-2">({link.reason})</span>
                </div>
                <span className="text-xs text-emerald-400">
                  Link recommended
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 rounded p-2 mt-3">
          {error}
        </div>
      )}
    </Card>
  );
};

export default TopicBridgingContext;
