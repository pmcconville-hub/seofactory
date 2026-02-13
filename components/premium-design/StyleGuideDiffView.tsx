// =============================================================================
// StyleGuideDiffView — Side-by-side comparison of two style guide versions
// =============================================================================

import React, { useState } from 'react';
import type { StyleGuideDiff, ElementDiff, ColorDiff } from '../../services/design-analysis/styleGuideDiff';

// =============================================================================
// Types
// =============================================================================

interface StyleGuideDiffViewProps {
  diff: StyleGuideDiff;
  onClose: () => void;
}

type FilterStatus = 'all' | 'added' | 'removed' | 'modified' | 'unchanged';

// =============================================================================
// Sub-components
// =============================================================================

const StatusBadge: React.FC<{ status: ElementDiff['status'] }> = ({ status }) => {
  const styles: Record<string, string> = {
    added: 'bg-green-600/20 text-green-400 border-green-500/30',
    removed: 'bg-red-600/20 text-red-400 border-red-500/30',
    modified: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
    unchanged: 'bg-zinc-700/30 text-zinc-500 border-zinc-600/30',
  };
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${styles[status]}`}>
      {status}
    </span>
  );
};

const ElementDiffCard: React.FC<{ diff: ElementDiff }> = ({ diff: d }) => {
  const [expanded, setExpanded] = useState(false);

  const borderColor: Record<string, string> = {
    added: 'border-l-green-500',
    removed: 'border-l-red-500',
    modified: 'border-l-yellow-500',
    unchanged: 'border-l-zinc-700',
  };

  return (
    <div
      className={`border-l-2 ${borderColor[d.status]} rounded-r-lg bg-zinc-800/30 px-3 py-2`}
    >
      <div className="flex items-center gap-2">
        <StatusBadge status={d.status} />
        <span className="text-[11px] text-zinc-300 font-medium truncate flex-1">
          {d.label}
        </span>
        <span className="text-[10px] text-zinc-500">
          {d.category}/{d.subcategory}
        </span>
        {d.status === 'modified' && d.changes && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {expanded ? 'collapse' : 'details'}
          </button>
        )}
      </div>

      {/* Change details for modified elements */}
      {d.status === 'modified' && d.changes && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {d.changes.htmlChanged && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-600/15 text-blue-400">
              HTML changed
            </span>
          )}
          {d.changes.cssChanged && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-600/15 text-purple-400">
              CSS changed
            </span>
          )}
          {d.changes.qualityScoreChange !== undefined && d.changes.qualityScoreChange !== 0 && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${
              d.changes.qualityScoreChange > 0
                ? 'bg-green-600/15 text-green-400'
                : 'bg-red-600/15 text-red-400'
            }`}>
              Score {d.changes.qualityScoreChange > 0 ? '+' : ''}{d.changes.qualityScoreChange}
            </span>
          )}
          {d.changes.approvalChanged && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-600/15 text-orange-400">
              Approval changed
            </span>
          )}
        </div>
      )}

      {/* Expanded details — old vs new approval/score */}
      {expanded && d.status === 'modified' && d.oldElement && d.newElement && (
        <div className="mt-2 pt-2 border-t border-zinc-700/50 space-y-1 text-[10px]">
          {d.changes?.approvalChanged && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 w-20">Approval:</span>
              <span className="text-red-400/70">{d.oldElement.approvalStatus}</span>
              <span className="text-zinc-600">&rarr;</span>
              <span className="text-green-400/70">{d.newElement.approvalStatus}</span>
            </div>
          )}
          {d.oldElement.qualityScore !== undefined && d.newElement.qualityScore !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 w-20">Quality:</span>
              <span className="text-zinc-400">{d.oldElement.qualityScore}%</span>
              <span className="text-zinc-600">&rarr;</span>
              <span className="text-zinc-300">{d.newElement.qualityScore}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ColorDiffSwatch: React.FC<{ diff: ColorDiff }> = ({ diff: d }) => {
  const borderStyles: Record<string, string> = {
    added: 'ring-2 ring-green-500/50',
    removed: 'ring-2 ring-red-500/50 opacity-60',
    unchanged: '',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded ${borderStyles[d.status]}`}
        style={{ backgroundColor: d.hex }}
        title={`${d.hex} (${d.status})`}
      />
      <div className="flex flex-col">
        <span className="text-[10px] text-zinc-400">{d.hex}</span>
        {d.usage && <span className="text-[9px] text-zinc-600">{d.usage}</span>}
      </div>
      {d.status !== 'unchanged' && (
        <span className={`text-[9px] ${
          d.status === 'added' ? 'text-green-400' : 'text-red-400'
        }`}>
          {d.status === 'added' ? '+' : '-'}
        </span>
      )}
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const StyleGuideDiffView: React.FC<StyleGuideDiffViewProps> = ({ diff, onClose }) => {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [showUnchanged, setShowUnchanged] = useState(false);

  const filteredDiffs = diff.elementDiffs.filter(d => {
    if (filter === 'all') {
      // In "all" mode, hide unchanged unless explicitly shown
      return d.status !== 'unchanged' || showUnchanged;
    }
    return d.status === filter;
  });

  const hasColorChanges = diff.summary.colorsAdded > 0 || diff.summary.colorsRemoved > 0;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-zinc-200">
            v{diff.oldVersion} &rarr; v{diff.newVersion}
          </h4>
          <div className="flex items-center gap-2 mt-1 text-[11px]">
            {diff.summary.added > 0 && (
              <span className="text-green-400">+{diff.summary.added} added</span>
            )}
            {diff.summary.removed > 0 && (
              <span className="text-red-400">-{diff.summary.removed} removed</span>
            )}
            {diff.summary.modified > 0 && (
              <span className="text-yellow-400">~{diff.summary.modified} modified</span>
            )}
            {diff.summary.unchanged > 0 && (
              <span className="text-zinc-500">{diff.summary.unchanged} unchanged</span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Close diff view"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1">
        {(['all', 'added', 'removed', 'modified', 'unchanged'] as FilterStatus[]).map(f => {
          const count = f === 'all'
            ? diff.elementDiffs.length
            : diff.elementDiffs.filter(d => d.status === f).length;
          if (count === 0 && f !== 'all') return null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                filter === f
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f} {count > 0 && <span className="opacity-60">({count})</span>}
            </button>
          );
        })}

        {/* Toggle unchanged visibility */}
        {filter === 'all' && diff.summary.unchanged > 0 && (
          <button
            onClick={() => setShowUnchanged(!showUnchanged)}
            className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            {showUnchanged ? 'Hide' : 'Show'} unchanged
          </button>
        )}
      </div>

      {/* Element diffs */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {filteredDiffs.length > 0 ? (
          filteredDiffs.map(d => (
            <ElementDiffCard key={d.id} diff={d} />
          ))
        ) : (
          <p className="text-[11px] text-zinc-500 text-center py-4">
            No elements match this filter.
          </p>
        )}
      </div>

      {/* Color palette diff */}
      {hasColorChanges && (
        <div className="pt-3 border-t border-zinc-700/50">
          <h5 className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Color Palette Changes
          </h5>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {diff.colorDiffs.filter(c => c.status !== 'unchanged').map((c, i) => (
              <ColorDiffSwatch key={`${c.hex}-${i}`} diff={c} />
            ))}
          </div>
          {diff.summary.colorsAdded > 0 && (
            <p className="text-[10px] text-green-400/70 mt-1">+{diff.summary.colorsAdded} new color{diff.summary.colorsAdded !== 1 ? 's' : ''}</p>
          )}
          {diff.summary.colorsRemoved > 0 && (
            <p className="text-[10px] text-red-400/70 mt-0.5">-{diff.summary.colorsRemoved} removed color{diff.summary.colorsRemoved !== 1 ? 's' : ''}</p>
          )}
        </div>
      )}

      {/* Brand overview change indicator */}
      {diff.brandOverviewChanged && (
        <div className="pt-3 border-t border-zinc-700/50">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400">Brand Overview:</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-600/15 text-yellow-400 border border-yellow-500/20">
              Changed
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleGuideDiffView;
