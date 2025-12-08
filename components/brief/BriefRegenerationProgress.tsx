// components/brief/BriefRegenerationProgress.tsx
// Visual progress indicator for multi-pass brief regeneration

import React from 'react';
import { RegenerationProgress } from '../../hooks/useBriefEditor';

interface BriefRegenerationProgressProps {
  progress: RegenerationProgress;
  error?: string | null;
}

const CheckIcon = () => (
  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-4 h-4 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const CircleIcon = () => (
  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
  </svg>
);

// Pass names for display
const PASS_DISPLAY_NAMES: Record<string, string> = {
  'Meta & Strategy': 'Title, description, key takeaways',
  'Linking & Bridge': 'Internal links, contextual bridge, visual semantics',
  'Assembly': 'Combining all parts, validating coherence',
};

export const BriefRegenerationProgress: React.FC<BriefRegenerationProgressProps> = ({
  progress,
  error
}) => {
  // Generate the list of all passes
  const allPasses = [];
  for (let i = 1; i <= progress.totalPasses; i++) {
    let passName = '';
    let passDescription = '';

    if (i === 1) {
      passName = 'Meta & Strategy';
      passDescription = 'Title, description, key takeaways';
    } else if (i === progress.totalPasses) {
      passName = 'Assembly';
      passDescription = 'Combining all parts';
    } else if (i === progress.totalPasses - 1) {
      passName = 'Linking & Bridge';
      passDescription = 'Internal links, contextual bridge';
    } else {
      const batchNum = i - 1;
      passName = `Sections (batch ${batchNum})`;
      passDescription = 'Processing section outlines';
    }

    let status: 'completed' | 'in_progress' | 'pending' = 'pending';
    if (i < progress.currentPass) {
      status = 'completed';
    } else if (i === progress.currentPass) {
      status = 'in_progress';
    }

    allPasses.push({ num: i, name: passName, description: passDescription, status });
  }

  return (
    <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
        <SpinnerIcon />
        Regenerating Brief...
      </h4>

      {/* Overall Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1 text-slate-300">
          <span>
            Pass {progress.currentPass} of {progress.totalPasses}: {progress.passName}
          </span>
          <span>{progress.percentComplete}%</span>
        </div>
        <div className="w-full bg-slate-600 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress.percentComplete}%` }}
          />
        </div>
      </div>

      {/* Current Pass Description */}
      <div className="mb-4 p-3 bg-slate-800/50 rounded text-sm text-slate-300">
        {progress.passDescription}
        {progress.totalSections > 0 && progress.sectionsProcessed > 0 && (
          <span className="ml-2 text-slate-400">
            ({progress.sectionsProcessed}/{progress.totalSections} sections)
          </span>
        )}
      </div>

      {/* Pass List */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {allPasses.map((pass) => (
          <div key={pass.num} className="flex items-center gap-2 text-sm">
            {pass.status === 'completed' ? (
              <CheckIcon />
            ) : pass.status === 'in_progress' ? (
              <SpinnerIcon />
            ) : (
              <CircleIcon />
            )}
            <span className={
              pass.status === 'completed'
                ? 'text-slate-400'
                : pass.status === 'in_progress'
                  ? 'text-white font-medium'
                  : 'text-slate-500'
            }>
              {pass.name}
            </span>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Info Note */}
      <div className="mt-4 text-xs text-slate-400">
        Multi-pass regeneration ensures all sections are processed completely without truncation.
      </div>
    </div>
  );
};

export default BriefRegenerationProgress;
