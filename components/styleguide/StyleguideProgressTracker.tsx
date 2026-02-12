// components/styleguide/StyleguideProgressTracker.tsx
// Shows phase-by-phase progress during styleguide generation.

import React from 'react';
import type { StyleguideProgress, StyleguidePhase } from '../../services/styleguide-generator/types';

interface StyleguideProgressTrackerProps {
  progress: StyleguideProgress;
}

interface PhaseStep {
  phase: StyleguidePhase;
  label: string;
}

const PHASES: PhaseStep[] = [
  { phase: 'extracting', label: 'Extracting site data' },
  { phase: 'analyzing', label: 'Analyzing brand' },
  { phase: 'generating-tokens', label: 'Building color scales' },
  { phase: 'generating-sections', label: 'Generating sections' },
  { phase: 'assembling', label: 'Assembling document' },
  { phase: 'validating', label: 'Validating quality' },
  { phase: 'storing', label: 'Saving styleguide' },
];

function getPhaseIndex(phase: StyleguidePhase): number {
  const idx = PHASES.findIndex(p => p.phase === phase);
  if (phase === 'complete') return PHASES.length;
  if (phase === 'error') return -1;
  return idx;
}

export const StyleguideProgressTracker: React.FC<StyleguideProgressTrackerProps> = ({ progress }) => {
  const currentIndex = getPhaseIndex(progress.phase);
  const percentage = progress.sectionsTotal > 0
    ? Math.round((progress.sectionsCompleted / progress.sectionsTotal) * 100)
    : 0;

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
          {progress.sectionsCompleted}/{progress.sectionsTotal}
        </span>
      </div>

      {/* Phase label */}
      <p className="text-xs text-blue-400 flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        {progress.phaseLabel}
      </p>

      {/* Batch indicator */}
      {progress.currentBatch && (
        <p className="text-xs text-gray-500 pl-[18px]">
          {progress.currentBatch}
        </p>
      )}

      {/* Phase checklist */}
      <div className="space-y-0.5 mt-1">
        {PHASES.map((step, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={step.phase} className="flex items-center gap-1.5 text-xs">
              {isDone ? (
                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : isCurrent ? (
                <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="w-3 h-3 rounded-full border border-gray-600" />
              )}
              <span className={isDone ? 'text-gray-500' : isCurrent ? 'text-blue-400' : 'text-gray-600'}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
