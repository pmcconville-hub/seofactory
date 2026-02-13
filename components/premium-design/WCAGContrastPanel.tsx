// =============================================================================
// WCAGContrastPanel — Display and fix WCAG contrast issues
// =============================================================================

import React, { useState } from 'react';
import type { WCAGContrastIssue, WCAGAuditResult } from '../../services/design-analysis/WCAGContrastService';

interface WCAGContrastPanelProps {
  auditResult: WCAGAuditResult;
  onFixSingle: (elementId: string, fixedColor: string) => void;
  onFixAll: () => void;
  onUndoSingle: (elementId: string, originalColor: string) => void;
  onUndoAll: () => void;
}

// Track which issues have been fixed
interface FixState {
  fixedIds: Set<string>;
}

const ContrastBadge: React.FC<{ passes: boolean; level: string }> = ({ passes, level }) => (
  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
    passes
      ? 'bg-green-500/20 text-green-400'
      : 'bg-red-500/20 text-red-400'
  }`}>
    {level} {passes ? 'Pass' : 'Fail'}
  </span>
);

const ColorSwatch: React.FC<{ fg: string; bg: string; label?: string }> = ({ fg, bg, label }) => (
  <div
    className="flex items-center justify-center rounded border border-zinc-600 px-2 py-1 text-xs font-medium"
    style={{ backgroundColor: bg, color: fg, minWidth: 60 }}
  >
    {label || 'Aa'}
  </div>
);

const IssueCard: React.FC<{
  issue: WCAGContrastIssue;
  isFixed: boolean;
  onFix: () => void;
  onUndo: () => void;
}> = ({ issue, isFixed, onFix, onUndo }) => {
  const [expanded, setExpanded] = useState(false);
  const passesAA = issue.level !== 'AA'; // If level is AAA, it passes AA
  const passesAAA = false; // If it's an issue, it fails at its level

  // Compute new ratio from suggested fix
  // (ratio is stored on the issue; for the fix preview we show the suggested fix)
  const fixedRatioEstimate = issue.suggestedFix !== issue.foreground
    ? `${issue.requiredRatio}:1+`
    : `${issue.ratio}:1`;

  return (
    <div className={`rounded-lg border ${
      isFixed ? 'border-green-500/30 bg-green-900/10' : 'border-zinc-700 bg-zinc-800/50'
    } p-3 transition-all`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
          >
            {expanded ? '\u25BC' : '\u25B6'}
          </button>
          <span className="text-xs text-zinc-200 truncate font-medium">
            {issue.elementLabel}
          </span>
          {issue.isLargeText && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/60 text-zinc-400 shrink-0">
              Large
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ContrastBadge passes={passesAA} level="AA" />
          <ContrastBadge passes={passesAAA} level="AAA" />
        </div>
      </div>

      {/* Compact info row */}
      <div className="flex items-center gap-3 mt-2">
        <ColorSwatch fg={issue.foreground} bg={issue.background} />
        <div className="text-[11px] text-zinc-400">
          <span className={issue.level === 'AA' ? 'text-red-400 font-medium' : 'text-amber-400 font-medium'}>
            {issue.ratio}:1
          </span>
          {' '}(needs {issue.requiredRatio}:1 for {issue.level})
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-zinc-700/50 space-y-2">
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-zinc-500">Current:</div>
            <ColorSwatch fg={issue.foreground} bg={issue.background} />
            <code className="text-[10px] text-zinc-500 font-mono">{issue.foreground}</code>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-zinc-500">Suggested:</div>
            <ColorSwatch fg={issue.suggestedFix} bg={issue.background} />
            <code className="text-[10px] text-zinc-500 font-mono">{issue.suggestedFix}</code>
            <span className="text-[10px] text-green-400">{fixedRatioEstimate}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 mt-2">
        {isFixed ? (
          <button
            onClick={onUndo}
            className="px-2 py-0.5 text-[10px] rounded bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Undo
          </button>
        ) : (
          <button
            onClick={onFix}
            className="px-2 py-0.5 text-[10px] rounded bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors"
          >
            Fix
          </button>
        )}
      </div>
    </div>
  );
};

export const WCAGContrastPanel: React.FC<WCAGContrastPanelProps> = ({
  auditResult,
  onFixSingle,
  onFixAll,
  onUndoSingle,
  onUndoAll,
}) => {
  const [fixState, setFixState] = useState<FixState>({ fixedIds: new Set() });

  const { issues, passCount, failCount, score } = auditResult;

  const aaIssues = issues.filter(i => i.level === 'AA');
  const aaaIssues = issues.filter(i => i.level === 'AAA');

  const handleFixSingle = (issue: WCAGContrastIssue) => {
    onFixSingle(issue.elementId, issue.suggestedFix);
    setFixState(prev => {
      const next = new Set(prev.fixedIds);
      next.add(issue.elementId);
      return { fixedIds: next };
    });
  };

  const handleUndoSingle = (issue: WCAGContrastIssue) => {
    onUndoSingle(issue.elementId, issue.originalForeground);
    setFixState(prev => {
      const next = new Set(prev.fixedIds);
      next.delete(issue.elementId);
      return { fixedIds: next };
    });
  };

  const handleFixAll = () => {
    onFixAll();
    setFixState({
      fixedIds: new Set(issues.map(i => i.elementId)),
    });
  };

  const handleUndoAll = () => {
    onUndoAll();
    setFixState({ fixedIds: new Set() });
  };

  const hasAnyFixed = fixState.fixedIds.size > 0;
  const allFixed = issues.length > 0 && issues.every(i => fixState.fixedIds.has(i.elementId));

  return (
    <div className="space-y-4">
      {/* Score header */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-zinc-200">WCAG Contrast Audit</h4>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {passCount + failCount} elements checked
            </p>
          </div>
          <div className={`text-2xl font-bold ${
            score >= 90 ? 'text-green-400' :
            score >= 70 ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {score}%
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mt-3 text-[11px]">
          <span className="text-green-400">{passCount} passing</span>
          {aaIssues.length > 0 && (
            <span className="text-red-400">{aaIssues.length} AA failures</span>
          )}
          {aaaIssues.length > 0 && (
            <span className="text-amber-400">{aaaIssues.length} AAA only</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              score >= 90 ? 'bg-green-500' :
              score >= 70 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Bulk actions */}
      {issues.length > 0 && (
        <div className="flex items-center gap-2">
          {!allFixed ? (
            <button
              onClick={handleFixAll}
              className="px-3 py-1.5 text-[11px] rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/20 transition-colors"
            >
              Fix All ({issues.length} issues)
            </button>
          ) : (
            <button
              onClick={handleUndoAll}
              className="px-3 py-1.5 text-[11px] rounded-lg bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 border border-zinc-600/30 transition-colors"
            >
              Undo All
            </button>
          )}
          {hasAnyFixed && !allFixed && (
            <button
              onClick={handleUndoAll}
              className="px-3 py-1.5 text-[11px] rounded-lg bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 border border-zinc-600/30 transition-colors"
            >
              Undo All
            </button>
          )}
        </div>
      )}

      {/* AA Issues (critical) */}
      {aaIssues.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-red-400 uppercase tracking-wider">
            AA Failures ({aaIssues.length})
          </h5>
          {aaIssues.map(issue => (
            <IssueCard
              key={`${issue.elementId}-aa`}
              issue={issue}
              isFixed={fixState.fixedIds.has(issue.elementId)}
              onFix={() => handleFixSingle(issue)}
              onUndo={() => handleUndoSingle(issue)}
            />
          ))}
        </div>
      )}

      {/* AAA Issues (warnings) */}
      {aaaIssues.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-amber-400 uppercase tracking-wider">
            AAA Warnings ({aaaIssues.length})
          </h5>
          {aaaIssues.map(issue => (
            <IssueCard
              key={`${issue.elementId}-aaa`}
              issue={issue}
              isFixed={fixState.fixedIds.has(issue.elementId)}
              onFix={() => handleFixSingle(issue)}
              onUndo={() => handleUndoSingle(issue)}
            />
          ))}
        </div>
      )}

      {/* All passing */}
      {issues.length === 0 && (
        <div className="text-center py-8">
          <div className="text-3xl mb-2">&#10003;</div>
          <p className="text-sm text-green-400 font-medium">All elements pass WCAG contrast requirements</p>
          <p className="text-xs text-zinc-500 mt-1">Both AA and AAA levels satisfied</p>
        </div>
      )}
    </div>
  );
};

export default WCAGContrastPanel;
