import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { EnrichedTopic } from '../../../../types';
import type { ActionPlanEntry, ActionType, ActionPriority } from '../../../../types/actionPlan';
import { ActionTypeBadge } from './ActionTypeBadge';

interface TopicRowProps {
  entry: ActionPlanEntry;
  topic: EnrichedTopic | undefined;
  isSelected: boolean;
  onSelect: (topicId: string) => void;
  onUpdate: (topicId: string, updates: Partial<ActionPlanEntry>) => void;
  onRemove: (topicId: string) => void;
}

const PRIORITY_COLORS: Record<ActionPriority, string> = {
  critical: 'text-red-400',
  high: 'text-amber-400',
  medium: 'text-blue-400',
  low: 'text-gray-500',
};

const PRIORITY_ICONS: Record<ActionPriority, string> = {
  critical: '!!!',
  high: '!!',
  medium: '!',
  low: '-',
};

export function TopicRow({
  entry,
  topic,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
}: TopicRowProps) {
  const [showRationale, setShowRationale] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.topicId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const title = topic?.title ?? entry.topicId;
  const topicType = topic?.type ?? 'core';
  const topicClass = topic?.topic_class;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gray-900 border rounded-md px-3 py-2 transition-colors ${
        isSelected ? 'border-blue-500/50 bg-blue-900/10' : 'border-gray-700/50'
      } ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 flex-shrink-0"
          {...attributes}
          {...listeners}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
          </svg>
        </button>

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(entry.topicId)}
          className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-0 focus:ring-offset-0 flex-shrink-0"
        />

        {/* Title + metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-300 truncate">{title}</span>
            <span className="text-[8px] text-gray-600 flex-shrink-0">
              ({topicType}{topicClass ? `/${topicClass}` : ''})
            </span>
          </div>
        </div>

        {/* Priority indicator */}
        <span className={`text-[9px] font-mono flex-shrink-0 ${PRIORITY_COLORS[entry.priority]}`}>
          {PRIORITY_ICONS[entry.priority]}
        </span>

        {/* Action type badge */}
        <ActionTypeBadge actionType={entry.actionType} />

        {/* Wave dropdown */}
        <select
          value={entry.wave}
          onChange={(e) => onUpdate(entry.topicId, {
            wave: Number(e.target.value) as 1 | 2 | 3 | 4,
            pinned: true,
          })}
          className="text-[10px] bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-400 focus:outline-none focus:border-gray-600 flex-shrink-0 w-14"
        >
          <option value={1}>W1</option>
          <option value={2}>W2</option>
          <option value={3}>W3</option>
          <option value={4}>W4</option>
        </select>

        {/* Rationale toggle */}
        {entry.rationale && (
          <button
            type="button"
            onClick={() => setShowRationale(!showRationale)}
            className="text-gray-600 hover:text-gray-400 flex-shrink-0"
            title="Show rationale"
          >
            <svg className={`w-3 h-3 transition-transform ${showRationale ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        {/* Remove button */}
        <button
          type="button"
          onClick={() => onRemove(entry.topicId)}
          className="text-gray-600 hover:text-red-400 flex-shrink-0"
          title="Remove from plan"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Expanded rationale */}
      {showRationale && entry.rationale && (
        <p className="text-[10px] text-gray-500 mt-1.5 pl-9 leading-relaxed">
          {entry.rationale}
        </p>
      )}
    </div>
  );
}
