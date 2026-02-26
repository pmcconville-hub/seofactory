import React, { useState } from 'react';
import type { ActionType } from '../../../../types/actionPlan';
import { ACTION_TYPE_CONFIGS } from '../../../../types/actionPlan';

interface BulkActionBarProps {
  selectedCount: number;
  onMoveToWave: (wave: number) => void;
  onChangeAction: (actionType: ActionType) => void;
  onRemove: () => void;
  onClearSelection: () => void;
  waveNumbers?: number[];
}

export function BulkActionBar({
  selectedCount,
  onMoveToWave,
  onChangeAction,
  onRemove,
  onClearSelection,
  waveNumbers = [1, 2, 3, 4],
}: BulkActionBarProps) {
  const [showActionMenu, setShowActionMenu] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-10">
      <div className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 shadow-xl flex items-center gap-3">
        <span className="text-xs text-gray-300 font-medium">
          {selectedCount} selected
        </span>

        <div className="h-4 w-px bg-gray-700" />

        {/* Move to Wave */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500 mr-1">Move to:</span>
          {waveNumbers.map(wave => (
            <button
              key={wave}
              type="button"
              onClick={() => onMoveToWave(wave)}
              className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition-colors"
            >
              W{wave}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-gray-700" />

        {/* Change Action Type */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowActionMenu(!showActionMenu)}
            className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition-colors flex items-center gap-1"
          >
            Change Action
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showActionMenu && (
            <div className="absolute bottom-full left-0 mb-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[160px]">
              {(Object.entries(ACTION_TYPE_CONFIGS) as [ActionType, typeof ACTION_TYPE_CONFIGS[ActionType]][]).map(
                ([action, config]) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => {
                      onChangeAction(action);
                      setShowActionMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${config.bgColor.replace('/20', '')}`} />
                    {config.label}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-gray-700" />

        {/* Remove */}
        <button
          type="button"
          onClick={onRemove}
          className="text-[10px] bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-500/30 px-2 py-1 rounded transition-colors"
        >
          Remove
        </button>

        {/* Clear selection */}
        <button
          type="button"
          onClick={onClearSelection}
          className="text-[10px] text-gray-500 hover:text-gray-300 ml-auto transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
