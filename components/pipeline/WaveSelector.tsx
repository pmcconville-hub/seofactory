import React from 'react';

// ──── Types ────

interface WaveData {
  id: string;
  number: 1 | 2 | 3 | 4;
  name: string;
  description: string;
  topicIds: string[];
  status: string;
}

interface WaveSelectorProps {
  waves: WaveData[];
  activeWaveId: string | null;
  onSelectWave: (waveId: string) => void;
  completedTopicIds?: Set<string>;
}

// ──── Wave color palette ────

const WAVE_COLORS: Record<number, { badge: string; ring: string; bar: string; text: string }> = {
  1: {
    badge: 'bg-green-600 text-white',
    ring: 'ring-green-500',
    bar: 'bg-green-500',
    text: 'text-green-400',
  },
  2: {
    badge: 'bg-blue-600 text-white',
    ring: 'ring-blue-500',
    bar: 'bg-blue-500',
    text: 'text-blue-400',
  },
  3: {
    badge: 'bg-amber-600 text-white',
    ring: 'ring-amber-500',
    bar: 'bg-amber-500',
    text: 'text-amber-400',
  },
  4: {
    badge: 'bg-purple-600 text-white',
    ring: 'ring-purple-500',
    bar: 'bg-purple-500',
    text: 'text-purple-400',
  },
};

// ──── Status badge config ────

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  planning: { bg: 'bg-gray-600/50', text: 'text-gray-300', label: 'Planning' },
  briefing: { bg: 'bg-blue-600/30', text: 'text-blue-300', label: 'Briefing' },
  drafting: { bg: 'bg-amber-600/30', text: 'text-amber-300', label: 'Drafting' },
  auditing: { bg: 'bg-purple-600/30', text: 'text-purple-300', label: 'Auditing' },
  ready: { bg: 'bg-green-600/30', text: 'text-green-300', label: 'Ready' },
  published: { bg: 'bg-emerald-600/30', text: 'text-emerald-300', label: 'Published' },
};

function getStatusBadge(status: string) {
  const config = STATUS_BADGE[status] ?? STATUS_BADGE.planning;
  return config;
}

// ──── Progress helpers ────

function computeProgress(topicIds: string[], completedTopicIds?: Set<string>): number {
  if (!completedTopicIds || topicIds.length === 0) return 0;
  const completed = topicIds.filter((id) => completedTopicIds.has(id)).length;
  return Math.round((completed / topicIds.length) * 100);
}

// ──── Wave Card ────

function WaveCard({
  wave,
  isActive,
  onSelect,
  completedTopicIds,
}: {
  wave: WaveData;
  isActive: boolean;
  onSelect: () => void;
  completedTopicIds?: Set<string>;
}) {
  const colors = WAVE_COLORS[wave.number] ?? WAVE_COLORS[1];
  const statusBadge = getStatusBadge(wave.status);
  const progress = computeProgress(wave.topicIds, completedTopicIds);
  const completedCount = completedTopicIds
    ? wave.topicIds.filter((id) => completedTopicIds.has(id)).length
    : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        w-full text-left rounded-lg border p-4 transition-all duration-150
        bg-gray-800/60 hover:bg-gray-800
        ${isActive ? `border-blue-500 ring-2 ring-blue-500/30` : 'border-gray-700 hover:border-gray-600'}
      `}
    >
      {/* Top row: badge + status */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${colors.badge}`}
        >
          {wave.number}
        </span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge.bg} ${statusBadge.text}`}
        >
          {statusBadge.label}
        </span>
      </div>

      {/* Name */}
      <h4 className="text-sm font-medium text-gray-200 truncate mb-1">{wave.name}</h4>

      {/* Topic count */}
      <p className="text-xs text-gray-400 mb-3">
        {completedCount}/{wave.topicIds.length} topics
      </p>

      {/* Mini progress bar */}
      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colors.bar}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </button>
  );
}

// ──── Main Component ────

const WaveSelector: React.FC<WaveSelectorProps> = ({
  waves,
  activeWaveId,
  onSelectWave,
  completedTopicIds,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {waves.map((wave) => (
        <WaveCard
          key={wave.id}
          wave={wave}
          isActive={wave.id === activeWaveId}
          onSelect={() => onSelectWave(wave.id)}
          completedTopicIds={completedTopicIds}
        />
      ))}
    </div>
  );
};

export default WaveSelector;
