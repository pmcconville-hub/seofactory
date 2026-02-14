/**
 * BulkGenerationSummary
 *
 * Modal shown after bulk brief generation completes.
 * Context-aware: shows batch-specific stats when batchTopicIds is provided,
 * or all-topics stats when null (e.g. "Generate All Briefs").
 */

import React, { useMemo } from 'react';
import { EnrichedTopic, ContentBrief } from '../types';
import { Button } from './ui/Button';
import {
  calculateBriefQualityScore,
  getHealthLevelColor,
  BriefHealthLevel,
} from '../utils/briefQualityScore';

interface BulkGenerationSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  topics: EnrichedTopic[];
  briefs: Record<string, ContentBrief>;
  /** Topic IDs that were in this batch. null = all-topics mode. */
  batchTopicIds?: string[] | null;
  onRegenerateFailed?: (topicIds: string[]) => void;
  onGenerateRemaining?: () => void;
}

interface TopicWithQuality {
  topic: EnrichedTopic;
  quality: ReturnType<typeof calculateBriefQualityScore>;
  hasBrief: boolean;
}

function analyzeTopics(topics: EnrichedTopic[], briefs: Record<string, ContentBrief>) {
  const result: TopicWithQuality[] = topics.map((topic) => {
    const brief = briefs[topic.id];
    const quality = calculateBriefQualityScore(brief);
    return { topic, quality, hasBrief: !!brief };
  });

  const complete = result.filter(t => t.hasBrief && t.quality.level === 'complete');
  const partial = result.filter(t => t.hasBrief && t.quality.level === 'partial');
  const empty = result.filter(t => t.hasBrief && t.quality.level === 'empty');
  const noBrief = result.filter(t => !t.hasBrief);

  return { all: result, complete, partial, empty, noBrief };
}

const StatBlock: React.FC<{
  count: number;
  label: string;
  level: BriefHealthLevel | 'none';
  icon: string;
}> = ({ count, label, level, icon }) => {
  const colors =
    level === 'none'
      ? { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' }
      : getHealthLevelColor(level);

  return (
    <div className={`flex flex-col items-center p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
      <span className="text-2xl mb-0.5">{icon}</span>
      <span className={`text-xl font-bold ${colors.text}`}>{count}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
};

const BulkGenerationSummary: React.FC<BulkGenerationSummaryProps> = ({
  isOpen,
  onClose,
  topics,
  briefs,
  batchTopicIds,
  onRegenerateFailed,
  onGenerateRemaining,
}) => {
  const isBatchMode = batchTopicIds != null;

  // Analyze batch topics (just the ones we processed)
  const batchAnalysis = useMemo(() => {
    if (!isBatchMode) return null;
    const batchTopics = topics.filter(t => batchTopicIds.includes(t.id));
    return analyzeTopics(batchTopics, briefs);
  }, [topics, briefs, batchTopicIds, isBatchMode]);

  // Analyze all topics (overall map progress)
  const overallAnalysis = useMemo(() => {
    return analyzeTopics(topics, briefs);
  }, [topics, briefs]);

  if (!isOpen) return null;

  // Use batch analysis when in batch mode, otherwise overall
  const displayAnalysis = batchAnalysis || overallAnalysis;
  const batchGenerated = displayAnalysis.complete.length + displayAnalysis.partial.length + displayAnalysis.empty.length;
  const overallWithBriefs = overallAnalysis.complete.length + overallAnalysis.partial.length + overallAnalysis.empty.length;
  const remainingCount = overallAnalysis.noBrief.length;

  // Items needing attention in the batch
  const batchPartial = displayAnalysis.partial;
  const batchEmpty = displayAnalysis.empty;
  const batchNeedsAttention = [...batchPartial, ...batchEmpty];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            {batchNeedsAttention.length > 0 ? (
              <>
                <span className="text-yellow-400">!</span>
                Brief Generation Complete
              </>
            ) : (
              <>
                <span className="text-green-400">+</span>
                Brief Generation Complete
              </>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {/* Batch Stats (what we just generated) */}
          {isBatchMode && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">
                This batch ({batchTopicIds.length} selected topics)
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <StatBlock count={displayAnalysis.complete.length} label="Complete" level="complete" icon="+" />
                <StatBlock count={displayAnalysis.partial.length} label="Partial" level="partial" icon="!" />
                <StatBlock count={displayAnalysis.empty.length} label="Failed" level="empty" icon="-" />
              </div>
            </div>
          )}

          {/* All-topics Stats (when not in batch mode) */}
          {!isBatchMode && (
            <div className="mb-4">
              <div className="grid grid-cols-4 gap-3">
                <StatBlock count={overallAnalysis.complete.length} label="Complete" level="complete" icon="+" />
                <StatBlock count={overallAnalysis.partial.length} label="Partial" level="partial" icon="!" />
                <StatBlock count={overallAnalysis.empty.length} label="Failed" level="empty" icon="-" />
                <StatBlock count={overallAnalysis.noBrief.length} label="No Brief" level="none" icon="o" />
              </div>
            </div>
          )}

          {/* Overall progress bar (batch mode only) */}
          {isBatchMode && (
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-400">Overall map progress</span>
                <span className="text-white font-medium">{overallWithBriefs} of {topics.length} topics have briefs</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${topics.length > 0 ? (overallWithBriefs / topics.length) * 100 : 0}%` }}
                />
              </div>
              {remainingCount > 0 && (
                <p className="text-xs text-gray-500 mt-1">{remainingCount} topics still need briefs</p>
              )}
            </div>
          )}

          {/* Summary Text */}
          <div className="text-sm text-gray-400 mb-4">
            {isBatchMode ? (
              <>
                <p>
                  Generated <strong className="text-white">{batchGenerated}</strong> brief{batchGenerated !== 1 ? 's' : ''} for your selected topics.
                  In total, <strong className="text-white">{overallWithBriefs}</strong> of{' '}
                  <strong className="text-white">{topics.length}</strong> topics now have briefs.
                </p>
                {batchPartial.length > 0 && (
                  <p className="mt-2 text-yellow-400/90">
                    {batchPartial.length} brief{batchPartial.length !== 1 ? 's' : ''} have partial information.
                    Review these to ensure the content is complete before generating drafts.
                  </p>
                )}
                {batchEmpty.length > 0 && (
                  <p className="mt-2 text-red-400/90">
                    {batchEmpty.length} brief{batchEmpty.length !== 1 ? 's' : ''} failed to generate properly.
                    You can retry these individually or select them for another bulk generation.
                  </p>
                )}
              </>
            ) : (
              <>
                <p>
                  Generated briefs for <strong className="text-white">{topics.length}</strong> topics.
                </p>
                {(overallAnalysis.empty.length > 0 || overallAnalysis.noBrief.length > 0) && (
                  <p className="mt-2 text-yellow-400">
                    {overallAnalysis.empty.length + overallAnalysis.noBrief.length} topics need attention.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Topics needing attention list */}
          {batchNeedsAttention.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Topics to review:</h3>
              <div className="max-h-32 overflow-y-auto space-y-1 bg-gray-800/50 rounded-lg p-2">
                {batchNeedsAttention.slice(0, 10).map((item) => (
                  <div
                    key={item.topic.id}
                    className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-gray-700/50"
                  >
                    <span className="text-gray-300 truncate">{item.topic.title}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        item.quality.level === 'empty'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {item.quality.level === 'empty' ? 'Failed' : `${item.quality.score}%`}
                    </span>
                  </div>
                ))}
                {batchNeedsAttention.length > 10 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{batchNeedsAttention.length - 10} more topics
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-700 bg-gray-800/30">
          <div className="flex items-center gap-2">
            {/* Retry failed batch items */}
            {batchNeedsAttention.length > 0 && onRegenerateFailed && (
              <Button
                variant="secondary"
                onClick={() => {
                  onRegenerateFailed(batchNeedsAttention.map(t => t.topic.id));
                  onClose();
                }}
              >
                Retry Failed ({batchNeedsAttention.length})
              </Button>
            )}
            {/* Generate remaining (all topics that don't have briefs yet) */}
            {remainingCount > 0 && onGenerateRemaining && (
              <Button
                variant="secondary"
                onClick={() => {
                  onGenerateRemaining();
                  onClose();
                }}
              >
                Generate Remaining ({remainingCount})
              </Button>
            )}
          </div>
          <Button onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkGenerationSummary;
