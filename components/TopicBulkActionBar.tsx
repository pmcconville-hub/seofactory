import React, { useState, useRef, useEffect } from 'react';
import { EnrichedTopic } from '../types';

interface TopicBulkActionBarProps {
  selectedTopicIds: string[];
  allTopics: EnrichedTopic[];
  briefs: Record<string, unknown>;
  coreTopics: EnrichedTopic[];

  onBulkGenerateBriefs: () => void;
  onMerge: () => void;
  onBulkPromote: () => void;
  onBulkDemote: (parentCoreId: string) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;

  canGenerateBriefs: boolean;
  isMerging: boolean;
}

export const TopicBulkActionBar: React.FC<TopicBulkActionBarProps> = ({
  selectedTopicIds,
  allTopics,
  briefs,
  coreTopics,
  onBulkGenerateBriefs,
  onMerge,
  onBulkPromote,
  onBulkDemote,
  onBulkDelete,
  onClearSelection,
  canGenerateBriefs,
  isMerging,
}) => {
  const [demoteOpen, setDemoteOpen] = useState(false);
  const demoteRef = useRef<HTMLDivElement>(null);

  // Close demote dropdown on outside click
  useEffect(() => {
    if (!demoteOpen) return;
    const handler = (e: MouseEvent) => {
      if (demoteRef.current && !demoteRef.current.contains(e.target as Node)) {
        setDemoteOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [demoteOpen]);

  const selectedSet = new Set(selectedTopicIds);
  const selectedTopics = allTopics.filter(t => selectedSet.has(t.id));

  // Count selected topics that lack briefs
  const needsBriefCount = selectedTopics.filter(t => !briefs[t.id]).length;

  // Check if any selected topic is outer (can be promoted)
  const hasOuterSelected = selectedTopics.some(t => t.type === 'outer');

  // Check if any selected topic is core (can be demoted)
  const hasCoreSelected = selectedTopics.some(t => t.type === 'core');

  // Safety: at least 1 core topic must remain unselected after demote
  const unselectedCoreCount = coreTopics.filter(t => !selectedSet.has(t.id)).length;
  const canDemote = hasCoreSelected && unselectedCoreCount >= 1;

  // Available parent targets for demote (core topics NOT being demoted)
  const demoteTargets = coreTopics.filter(t => !selectedSet.has(t.id));

  if (selectedTopicIds.length === 0) return null;

  return (
    <div className="sticky bottom-0 z-20 bg-gray-800/95 backdrop-blur border-t border-blue-500/30 px-4 py-2.5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: selection count */}
        <span className="text-sm text-gray-300 font-medium shrink-0">
          {selectedTopicIds.length} topic{selectedTopicIds.length !== 1 ? 's' : ''} selected
        </span>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Generate Briefs */}
          {needsBriefCount > 0 && (
            <button
              onClick={onBulkGenerateBriefs}
              disabled={!canGenerateBriefs}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Generate Briefs ({needsBriefCount})
            </button>
          )}

          {/* Merge */}
          {selectedTopicIds.length >= 2 && (
            <button
              onClick={onMerge}
              disabled={isMerging}
              className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isMerging ? 'Analyzing...' : `Merge (${selectedTopicIds.length})`}
            </button>
          )}

          {/* Promote to Core */}
          {hasOuterSelected && (
            <button
              onClick={onBulkPromote}
              className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Promote to Core
            </button>
          )}

          {/* Demote to Outer (with parent picker dropdown) */}
          {canDemote && (
            <div ref={demoteRef} className="relative">
              <button
                onClick={() => setDemoteOpen(prev => !prev)}
                className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
              >
                Demote to Outer {demoteOpen ? '\u25B4' : '\u25BE'}
              </button>
              {demoteOpen && (
                <div className="absolute bottom-full mb-1 right-0 w-64 max-h-48 overflow-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-30 py-1">
                  <p className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider">Select parent core topic</p>
                  {demoteTargets.map(core => (
                    <button
                      key={core.id}
                      onClick={() => {
                        onBulkDemote(core.id);
                        setDemoteOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 truncate"
                    >
                      Under: {core.title}
                    </button>
                  ))}
                  {demoteTargets.length === 0 && (
                    <p className="px-3 py-2 text-xs text-gray-500">No available parent topics</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Delete Selected */}
          <button
            onClick={onBulkDelete}
            className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Delete Selected
          </button>

          {/* Clear Selection */}
          <button
            onClick={onClearSelection}
            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
            aria-label="Clear selection"
          >
            {'\u2715'} Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopicBulkActionBar;
