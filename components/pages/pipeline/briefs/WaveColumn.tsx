import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { EnrichedTopic } from '../../../../types';
import type { ActionPlanEntry } from '../../../../types/actionPlan';
import { TopicRow } from './TopicRow';

interface WaveColumnProps {
  waveNumber: 1 | 2 | 3 | 4;
  entries: ActionPlanEntry[];
  topics: EnrichedTopic[];
  selectedIds: Set<string>;
  onSelect: (topicId: string) => void;
  onUpdate: (topicId: string, updates: Partial<ActionPlanEntry>) => void;
  onRemove: (topicId: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const WAVE_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: 'Foundation Hubs',
  2: 'Knowledge Clusters',
  3: 'Regional & Variants',
  4: 'Authority Expansion',
};

const WAVE_COLORS: Record<1 | 2 | 3 | 4, string> = {
  1: 'border-emerald-500/40',
  2: 'border-blue-500/40',
  3: 'border-amber-500/40',
  4: 'border-sky-500/40',
};

const WAVE_HEADER_COLORS: Record<1 | 2 | 3 | 4, string> = {
  1: 'text-emerald-400',
  2: 'text-blue-400',
  3: 'text-amber-400',
  4: 'text-sky-400',
};

export function WaveColumn({
  waveNumber,
  entries,
  topics,
  selectedIds,
  onSelect,
  onUpdate,
  onRemove,
  isCollapsed,
  onToggle,
}: WaveColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `wave-${waveNumber}`,
    data: { wave: waveNumber },
  });

  const topicMap = new Map(topics.map(t => [t.id, t]));

  // Count action types in this wave
  const actionCounts = entries.reduce((acc, e) => {
    acc[e.actionType] = (acc[e.actionType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topActionTypes = Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([action, count]) => `${count} ${action.toLowerCase().replace('_', ' ')}`)
    .join(', ');

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-lg transition-colors ${WAVE_COLORS[waveNumber]} ${
        isOver ? 'bg-blue-900/10 border-blue-400/50' : ''
      }`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800/30 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-3.5 h-3.5 text-gray-500 transition-transform ${!isCollapsed ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${WAVE_HEADER_COLORS[waveNumber]}`}>
                Wave {waveNumber}
              </span>
              <span className="text-xs text-gray-500">{WAVE_NAMES[waveNumber]}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-gray-600">
                {entries.length} topic{entries.length !== 1 ? 's' : ''}
              </span>
              {topActionTypes && (
                <>
                  <span className="text-gray-700 text-[10px]">&middot;</span>
                  <span className="text-[10px] text-gray-600">{topActionTypes}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-3 pb-3 space-y-1.5">
          {entries.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-600">
              Drop topics here or use Rebalance
            </div>
          ) : (
            <SortableContext
              items={entries.map(e => e.topicId)}
              strategy={verticalListSortingStrategy}
            >
              {entries.map(entry => (
                <TopicRow
                  key={entry.topicId}
                  entry={entry}
                  topic={topicMap.get(entry.topicId)}
                  isSelected={selectedIds.has(entry.topicId)}
                  onSelect={onSelect}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                />
              ))}
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}
