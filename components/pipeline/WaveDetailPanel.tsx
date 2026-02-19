import React from 'react';

// ──── Types ────

interface WaveData {
  id: string;
  number: number;
  name: string;
  description: string;
  topicIds: string[];
  status: string;
}

interface TopicData {
  id: string;
  title: string;
  slug?: string;
  type?: string;
}

interface WaveDetailPanelProps {
  wave: WaveData;
  topics: TopicData[];
  completedTopicIds?: Set<string>;
  qualityScores?: Map<string, number>;
}

// ──── Type badge colors ────

const TYPE_BADGE_COLORS: Record<string, string> = {
  pillar: 'bg-blue-600/30 text-blue-300',
  cluster: 'bg-purple-600/30 text-purple-300',
  supporting: 'bg-amber-600/30 text-amber-300',
  cornerstone: 'bg-green-600/30 text-green-300',
  hub: 'bg-teal-600/30 text-teal-300',
};

function getTypeBadgeClasses(type?: string): string {
  if (!type) return 'bg-gray-600/30 text-gray-400';
  return TYPE_BADGE_COLORS[type.toLowerCase()] ?? 'bg-gray-600/30 text-gray-400';
}

// ──── Quality score color ────

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-amber-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

// ──── Icons ────

function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function EmptyStateIcon() {
  return (
    <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

// ──── Main Component ────

const WaveDetailPanel: React.FC<WaveDetailPanelProps> = ({
  wave,
  topics,
  completedTopicIds,
  qualityScores,
}) => {
  // Filter topics to only those in this wave
  const waveTopicSet = new Set(wave.topicIds);
  const waveTopics = topics.filter((t) => waveTopicSet.has(t.id));

  const completedCount = completedTopicIds
    ? waveTopics.filter((t) => completedTopicIds.has(t.id)).length
    : 0;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-gray-100">
            Wave {wave.number}: {wave.name}
          </h3>
          <span className="text-xs text-gray-400">
            {completedCount}/{waveTopics.length} completed
          </span>
        </div>
        {wave.description && (
          <p className="text-sm text-gray-400 leading-relaxed">{wave.description}</p>
        )}
      </div>

      {/* Empty state */}
      {waveTopics.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <EmptyStateIcon />
          <p className="text-sm text-gray-400">No topics assigned to this wave yet.</p>
          <p className="text-xs text-gray-500 mt-1">
            Add topics to this wave to begin content generation.
          </p>
        </div>
      ) : (
        /* Topic table */
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quality
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {waveTopics.map((topic) => {
                const isCompleted = completedTopicIds?.has(topic.id) ?? false;
                const score = qualityScores?.get(topic.id);

                return (
                  <tr
                    key={topic.id}
                    className="hover:bg-gray-700/30 transition-colors"
                  >
                    {/* Title */}
                    <td className="px-5 py-3">
                      <div className="text-gray-200 font-medium truncate max-w-xs">
                        {topic.title}
                      </div>
                      {topic.slug && (
                        <div className="text-xs text-gray-500 truncate max-w-xs mt-0.5">
                          /{topic.slug}
                        </div>
                      )}
                    </td>

                    {/* Type badge */}
                    <td className="px-3 py-3">
                      {topic.type ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${getTypeBadgeClasses(topic.type)}`}
                        >
                          {topic.type}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">--</span>
                      )}
                    </td>

                    {/* Quality score */}
                    <td className="px-3 py-3 text-center">
                      {score != null ? (
                        <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
                          {score}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">--</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center">
                        {isCompleted ? <CheckCircleIcon /> : <PendingIcon />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WaveDetailPanel;
