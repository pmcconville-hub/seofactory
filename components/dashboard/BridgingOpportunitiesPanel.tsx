/**
 * BridgingOpportunitiesPanel
 *
 * Intelligent dashboard view of bridging opportunities.
 * Shows ONE best recommendation with full pre-filled topic data.
 *
 * Intelligence:
 * - Transforms node IDs to human-readable names
 * - Generates proper topic title based on gap context
 * - Determines optimal placement (parent topic)
 * - Provides clear SEO reasoning
 * - Deduplicates identical suggestions
 */

import React, { useMemo } from 'react';
import { KnowledgeGraph, StructuralHole } from '../../lib/knowledgeGraph';
import { SemanticTriple, SEOPillars, EnrichedTopic, AttributeCategory } from '../../types';
import { Button } from '../ui/Button';

/**
 * Pre-filled topic data for creating a bridge topic
 */
export interface BridgeTopicSuggestion {
  title: string;
  description: string;
  placement: {
    type: 'core' | 'outer' | 'child';
    parentTopicId?: string;
    parentTopicTitle?: string;
  };
  reasoning: string;
  seoImpact: string;
  clustersConnected: {
    clusterA: string[];
    clusterB: string[];
  };
}

interface BridgingOpportunitiesPanelProps {
  knowledgeGraph: KnowledgeGraph | null;
  eavs: SemanticTriple[];
  pillars?: SEOPillars;
  topics: EnrichedTopic[];
  onSelectTopic?: (topicId: string) => void;
  onCreateBridgeTopic?: (suggestion: BridgeTopicSuggestion) => void;
}

// Attribute category weights for scoring
const CATEGORY_WEIGHTS: Record<AttributeCategory, number> = {
  UNIQUE: 1.0,
  ROOT: 0.8,
  RARE: 0.5,
  COMMON: 0.2,
};

/**
 * Transform node ID to human-readable name
 * node_vve_beheer -> VVE Beheer
 * node_property_management_service -> Property Management Service
 */
function humanizeNodeId(nodeId: string): string {
  if (!nodeId || typeof nodeId !== 'string') return '';

  return nodeId
    .replace(/^node_/, '')           // Remove node_ prefix
    .replace(/_/g, ' ')              // Replace underscores with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Find the best parent topic for a bridge topic
 */
function findBestParent(
  clusterA: string[],
  clusterB: string[],
  topics: EnrichedTopic[]
): { parentTopic: EnrichedTopic | null; reason: string } {
  // Find topics that match either cluster
  const coreTopics = topics.filter(t => t.topic_type === 'core');

  for (const coreTopic of coreTopics) {
    const titleLower = (coreTopic.title || '').toLowerCase();

    // Check if this core topic relates to either cluster
    const matchesA = clusterA.some(e => {
      const humanized = humanizeNodeId(e).toLowerCase();
      return titleLower.includes(humanized) || humanized.includes(titleLower.split(':')[0]);
    });

    const matchesB = clusterB.some(e => {
      const humanized = humanizeNodeId(e).toLowerCase();
      return titleLower.includes(humanized) || humanized.includes(titleLower.split(':')[0]);
    });

    if (matchesA || matchesB) {
      return {
        parentTopic: coreTopic,
        reason: `Under "${coreTopic.title}" because it relates to ${matchesA ? 'the first' : 'the second'} topic cluster`,
      };
    }
  }

  // Default: suggest as outer topic under first core topic
  if (coreTopics.length > 0) {
    return {
      parentTopic: coreTopics[0],
      reason: `Under "${coreTopics[0].title}" as a supporting topic`,
    };
  }

  return { parentTopic: null, reason: 'As a new outer topic' };
}

/**
 * Generate intelligent topic title
 */
function generateBridgeTitle(
  clusterA: string[],
  clusterB: string[],
  bridgeCandidates: string[],
  pillars?: SEOPillars
): string {
  // Get human-readable names for clusters
  const clusterANames = clusterA.slice(0, 2).map(humanizeNodeId).filter(Boolean);
  const clusterBNames = clusterB.slice(0, 2).map(humanizeNodeId).filter(Boolean);

  // If there's a bridge candidate, use it as the main topic
  if (bridgeCandidates.length > 0) {
    const mainTopic = humanizeNodeId(bridgeCandidates[0]);

    // Create a title that explains the connection
    if (clusterANames.length > 0 && clusterBNames.length > 0) {
      // Pick the most specific terms
      const termA = clusterANames[0];
      const termB = clusterBNames[0];

      // Check if main topic is related to CSI
      if (pillars?.centralSearchIntent && Array.isArray(pillars.centralSearchIntent)) {
        const csiTerm = pillars.centralSearchIntent[0];
        if (csiTerm && mainTopic.toLowerCase().includes(csiTerm.toLowerCase())) {
          return `${mainTopic}: ${termA} en ${termB}`;
        }
      }

      return `${mainTopic} voor ${termA} en ${termB}`;
    }

    return mainTopic;
  }

  // No bridge candidate - create connection title
  if (clusterANames.length > 0 && clusterBNames.length > 0) {
    return `${clusterANames[0]} en ${clusterBNames[0]}: De Verbinding`;
  }

  return 'Bridge Content';
}

/**
 * Generate description explaining why this topic is needed
 */
function generateDescription(
  clusterANames: string[],
  clusterBNames: string[],
  pillars?: SEOPillars
): string {
  const a = clusterANames.slice(0, 2).join(' en ');
  const b = clusterBNames.slice(0, 2).join(' en ');

  let desc = `Dit artikel verbindt twee belangrijke onderwerpen binnen uw topical map: ${a} en ${b}. `;
  desc += `Door deze onderwerpen te verbinden versterkt u de interne linkstructuur en toont u expertise over het volledige domein. `;

  if (pillars?.centralEntity) {
    desc += `Dit draagt bij aan uw autoriteit rondom "${pillars.centralEntity}".`;
  }

  return desc;
}

/**
 * Generate SEO impact explanation
 */
function generateSeoImpact(
  clusterANames: string[],
  clusterBNames: string[],
  entityCount: number
): string {
  return `Verbindt ${entityCount} gerelateerde entiteiten. Versterkt topical authority door ${clusterANames[0] || 'cluster A'} te koppelen aan ${clusterBNames[0] || 'cluster B'}.`;
}

interface ScoredOpportunity {
  suggestion: BridgeTopicSuggestion;
  score: number;
  impactLevel: 'critical' | 'high' | 'medium';
  existingBridge?: EnrichedTopic;
}

/**
 * Analyze and score bridging opportunities
 */
function analyzeOpportunities(
  holes: StructuralHole[],
  eavs: SemanticTriple[],
  topics: EnrichedTopic[],
  pillars?: SEOPillars
): ScoredOpportunity | null {
  if (holes.length === 0) return null;

  const scored: ScoredOpportunity[] = [];
  const seenTitles = new Set<string>();

  for (const hole of holes) {
    const clusterA = (hole.clusterA || []).filter(Boolean);
    const clusterB = (hole.clusterB || []).filter(Boolean);
    const bridgeCandidates = (hole.bridgeCandidates || []).filter(Boolean);

    if (clusterA.length === 0 || clusterB.length === 0) continue;

    // Human-readable names
    const clusterANames = clusterA.map(humanizeNodeId).filter(Boolean);
    const clusterBNames = clusterB.map(humanizeNodeId).filter(Boolean);

    // Generate title
    const title = generateBridgeTitle(clusterA, clusterB, bridgeCandidates, pillars);

    // Deduplicate by title
    if (seenTitles.has(title.toLowerCase())) continue;
    seenTitles.add(title.toLowerCase());

    // Check if existing topic could bridge
    const existingBridge = topics.find(topic => {
      if (!topic.title) return false;
      const titleLower = topic.title.toLowerCase();
      return clusterANames.some(n => titleLower.includes(n.toLowerCase())) &&
             clusterBNames.some(n => titleLower.includes(n.toLowerCase()));
    });

    // Calculate score
    let score = 0;

    // Priority score
    if (hole.priority === 'critical') score += 40;
    else if (hole.priority === 'high') score += 30;
    else if (hole.priority === 'medium') score += 20;
    else score += 10;

    // EAV importance
    const clusterEntities = [...clusterA, ...clusterB];
    eavs.forEach(eav => {
      if (!eav.entity) return;
      const eavLower = eav.entity.toLowerCase();
      if (clusterEntities.some(e => humanizeNodeId(e).toLowerCase().includes(eavLower))) {
        score += (CATEGORY_WEIGHTS[eav.category] || 0.2) * 5;
      }
    });

    // CSI alignment
    if (pillars?.centralSearchIntent && Array.isArray(pillars.centralSearchIntent)) {
      const csiRelevant = pillars.centralSearchIntent.some(intent => {
        if (!intent) return false;
        const intentLower = intent.toLowerCase();
        return clusterANames.some(n => n.toLowerCase().includes(intentLower)) ||
               clusterBNames.some(n => n.toLowerCase().includes(intentLower));
      });
      if (csiRelevant) score += 15;
    }

    // Find best parent
    const { parentTopic, reason: placementReason } = findBestParent(clusterA, clusterB, topics);

    // Create suggestion
    const suggestion: BridgeTopicSuggestion = {
      title,
      description: generateDescription(clusterANames, clusterBNames, pillars),
      placement: {
        type: parentTopic ? 'outer' : 'outer',
        parentTopicId: parentTopic?.id,
        parentTopicTitle: parentTopic?.title,
      },
      reasoning: placementReason,
      seoImpact: generateSeoImpact(clusterANames, clusterBNames, clusterA.length + clusterB.length),
      clustersConnected: {
        clusterA: clusterANames,
        clusterB: clusterBNames,
      },
    };

    const impactLevel: 'critical' | 'high' | 'medium' =
      score >= 50 ? 'critical' : score >= 30 ? 'high' : 'medium';

    scored.push({
      suggestion,
      score,
      impactLevel,
      existingBridge,
    });
  }

  // Return only the BEST opportunity
  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

const BridgingOpportunitiesPanel: React.FC<BridgingOpportunitiesPanelProps> = ({
  knowledgeGraph,
  eavs,
  pillars,
  topics,
  onSelectTopic,
  onCreateBridgeTopic,
}) => {
  // Analyze and get the SINGLE BEST opportunity
  const opportunity = useMemo(() => {
    if (!knowledgeGraph) return null;

    try {
      const holes = knowledgeGraph.identifyStructuralHoles(0.15);
      return analyzeOpportunities(holes, eavs, topics, pillars);
    } catch (err) {
      console.error('Failed to analyze bridging opportunities:', err);
      return null;
    }
  }, [knowledgeGraph, eavs, topics, pillars]);

  if (!knowledgeGraph) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">Add EAVs to detect content gaps</p>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="text-center py-4">
        <svg className="w-6 h-6 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-green-400">No content gaps detected</p>
        <p className="text-xs text-gray-500 mt-1">Your topic clusters are well connected</p>
      </div>
    );
  }

  const { suggestion, impactLevel, existingBridge } = opportunity;

  const impactColors = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500' },
    high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500' },
    medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500' },
  };
  const colors = impactColors[impactLevel];

  return (
    <div className="space-y-3">
      {/* If existing bridge exists, show that first */}
      {existingBridge ? (
        <div className="p-3 rounded-lg border bg-green-500/10 border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-green-400">Existing Bridge Found</span>
          </div>
          <p className="text-sm text-gray-300 mb-2">
            "{existingBridge.title}" can bridge these clusters. Add internal links to strengthen the connection.
          </p>
          {onSelectTopic && (
            <Button
              onClick={() => onSelectTopic(existingBridge.id)}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              View & Add Links
            </Button>
          )}
        </div>
      ) : (
        /* Show the recommendation */
        <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${colors.badge}`} />
              <span className={`text-xs font-medium uppercase ${colors.text}`}>
                {impactLevel} priority gap
              </span>
            </div>
          </div>

          {/* Suggested Title */}
          <h4 className="text-white font-medium mb-2">{suggestion.title}</h4>

          {/* Clusters being connected */}
          <p className="text-sm text-gray-400 mb-3">
            Verbindt{' '}
            <span className="text-blue-400">{suggestion.clustersConnected.clusterA.slice(0, 2).join(', ')}</span>
            {' '}met{' '}
            <span className="text-purple-400">{suggestion.clustersConnected.clusterB.slice(0, 2).join(', ')}</span>
          </p>

          {/* Placement recommendation */}
          <div className="bg-gray-800/50 rounded p-2 mb-3">
            <p className="text-xs text-gray-400">
              <span className="text-gray-500">Plaatsing:</span> {suggestion.reasoning}
            </p>
          </div>

          {/* SEO Impact */}
          <p className="text-xs text-gray-500 mb-3">
            <span className="text-emerald-400">SEO Impact:</span> {suggestion.seoImpact}
          </p>

          {/* Action */}
          {onCreateBridgeTopic && (
            <Button
              onClick={() => onCreateBridgeTopic(suggestion)}
              variant="primary"
              size="sm"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Bridge Topic
            </Button>
          )}
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-gray-500">
        Bridge topics connect isolated content clusters, improving internal linking and demonstrating comprehensive expertise.
      </p>
    </div>
  );
};

export default BridgingOpportunitiesPanel;
