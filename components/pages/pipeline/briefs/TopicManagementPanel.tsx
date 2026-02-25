import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { EnrichedTopic } from '../../../../types';
import type { ActionPlanEntry, ActionPlan, ActionType } from '../../../../types/actionPlan';
import { WaveColumn } from './WaveColumn';
import { BulkActionBar } from './BulkActionBar';
import { ActionTypeBadge } from './ActionTypeBadge';

interface TopicManagementPanelProps {
  actionPlan: ActionPlan;
  topics: EnrichedTopic[];
  onUpdate: (topicId: string, updates: Partial<ActionPlanEntry>) => void;
  onRemove: (topicId: string) => void;
  onMoveToWave: (topicIds: string[], wave: 1 | 2 | 3 | 4) => void;
  onChangeActionType: (topicIds: string[], actionType: ActionType) => void;
  onRebalance: () => void;
  onApprove: () => void;
  isApproved: boolean;
}

export function TopicManagementPanel({
  actionPlan,
  topics,
  onUpdate,
  onRemove,
  onMoveToWave,
  onChangeActionType,
  onRebalance,
  onApprove,
  isApproved,
}: TopicManagementPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsedWaves, setCollapsedWaves] = useState<Set<number>>(new Set());
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Active entries by wave
  const entriesByWave = useMemo(() => {
    const result: Record<1 | 2 | 3 | 4, ActionPlanEntry[]> = {
      1: [], 2: [], 3: [], 4: [],
    };
    for (const entry of actionPlan.entries) {
      if (!entry.removed) {
        result[entry.wave].push(entry);
      }
    }
    return result;
  }, [actionPlan.entries]);

  // Selection handlers
  const handleSelect = useCallback((topicId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Bulk actions
  const handleBulkMoveToWave = useCallback((wave: 1 | 2 | 3 | 4) => {
    onMoveToWave([...selectedIds], wave);
    clearSelection();
  }, [selectedIds, onMoveToWave, clearSelection]);

  const handleBulkChangeAction = useCallback((actionType: ActionType) => {
    onChangeActionType([...selectedIds], actionType);
    clearSelection();
  }, [selectedIds, onChangeActionType, clearSelection]);

  const handleBulkRemove = useCallback(() => {
    for (const id of selectedIds) onRemove(id);
    clearSelection();
  }, [selectedIds, onRemove, clearSelection]);

  // Wave collapse toggle
  const toggleWave = useCallback((wave: number) => {
    setCollapsedWaves(prev => {
      const next = new Set(prev);
      if (next.has(wave)) next.delete(wave);
      else next.add(wave);
      return next;
    });
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const overId = over.id as string;

    // Check if dropped on a wave droppable
    if (overId.startsWith('wave-')) {
      const wave = parseInt(overId.replace('wave-', '')) as 1 | 2 | 3 | 4;
      if ([1, 2, 3, 4].includes(wave)) {
        onUpdate(active.id as string, { wave, pinned: true });
      }
      return;
    }

    // If dropped on another topic in a different wave, move to that wave
    const overEntry = actionPlan.entries.find(e => e.topicId === overId);
    const activeEntry = actionPlan.entries.find(e => e.topicId === active.id);
    if (overEntry && activeEntry && overEntry.wave !== activeEntry.wave) {
      onUpdate(active.id as string, { wave: overEntry.wave, pinned: true });
    }
  }, [actionPlan.entries, onUpdate]);

  // Drag overlay content
  const draggedEntry = activeDragId
    ? actionPlan.entries.find(e => e.topicId === activeDragId)
    : null;
  const draggedTopic = activeDragId
    ? topics.find(t => t.id === activeDragId)
    : null;

  return (
    <div className="space-y-4">
      {/* Header with rebalance + approve */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Topic Management</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Drag topics between waves, edit actions, or use bulk operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRebalance}
            disabled={isApproved}
            className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 px-3 py-1.5 rounded transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Rebalance
          </button>
          {!isApproved && (
            <button
              type="button"
              onClick={onApprove}
              className="text-xs bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded font-medium transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Approve Plan
            </button>
          )}
        </div>
      </div>

      {/* DnD Context with 4 wave columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-3">
          {([1, 2, 3, 4] as const).map(wave => (
            <WaveColumn
              key={wave}
              waveNumber={wave}
              entries={entriesByWave[wave]}
              topics={topics}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onUpdate={onUpdate}
              onRemove={onRemove}
              isCollapsed={collapsedWaves.has(wave)}
              onToggle={() => toggleWave(wave)}
            />
          ))}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {draggedEntry && draggedTopic && (
            <div className="bg-gray-800 border border-blue-500/50 rounded-md px-3 py-2 shadow-xl flex items-center gap-2 opacity-90">
              <span className="text-xs text-gray-300">{draggedTopic.title}</span>
              <ActionTypeBadge actionType={draggedEntry.actionType} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onMoveToWave={handleBulkMoveToWave}
        onChangeAction={handleBulkChangeAction}
        onRemove={handleBulkRemove}
        onClearSelection={clearSelection}
      />
    </div>
  );
}
