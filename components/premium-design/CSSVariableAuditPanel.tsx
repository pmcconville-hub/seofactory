// components/premium-design/CSSVariableAuditPanel.tsx
/**
 * CSS Variable Audit Panel
 *
 * Displays CSS variable audit results in a table with:
 * - Color-coded severity (green=defined, red=undefined, yellow=suggested fix)
 * - Per-variable "Fix" button for individual fixes
 * - "Auto-fix all" button for bulk fixes
 * - Health score badge
 */

import React, { useState, useMemo } from 'react';
import type { CSSVariableAuditResult, UndefinedVariable } from '../../services/design-analysis/CSSVariableAudit';

// ============================================================================
// Types
// ============================================================================

interface CSSVariableAuditPanelProps {
  auditResult: CSSVariableAuditResult;
  onAutoFix: (fixes: Map<string, string>) => void;
  onFixSingle: (varName: string, fixValue: string) => void;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface HealthScoreBadgeProps {
  score: number;
}

const HealthScoreBadge: React.FC<HealthScoreBadgeProps> = ({ score }) => {
  const colorClass =
    score >= 90 ? 'bg-green-900/40 text-green-400 border-green-500/30' :
    score >= 70 ? 'bg-yellow-900/40 text-yellow-400 border-yellow-500/30' :
    'bg-red-900/40 text-red-400 border-red-500/30';

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorClass}`}>
      <span className="text-xs font-medium">CSS Health</span>
      <span className="text-sm font-bold">{score}%</span>
    </div>
  );
};

interface StatusBadgeProps {
  status: 'defined' | 'undefined' | 'suggested';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = {
    defined: { label: 'Defined', className: 'bg-green-900/30 text-green-400 border-green-500/30' },
    undefined: { label: 'Undefined', className: 'bg-red-900/30 text-red-400 border-red-500/30' },
    suggested: { label: 'Fix Available', className: 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30' },
  };

  const { label, className } = config[status];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${className}`}>
      {label}
    </span>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const CSSVariableAuditPanel: React.FC<CSSVariableAuditPanelProps> = ({
  auditResult,
  onAutoFix,
  onFixSingle,
}) => {
  const [expandedVar, setExpandedVar] = useState<string | null>(null);

  const hasIssues = auditResult.undefinedVars.length > 0 ||
    auditResult.unusedVars.length > 0 ||
    auditResult.circularRefs.length > 0;

  // Collect all fixable variables with their suggested fixes
  const fixableVars = useMemo(() => {
    const fixes = new Map<string, string>();
    for (const uv of auditResult.undefinedVars) {
      if (uv.suggestedFix) {
        fixes.set(uv.name, uv.suggestedFix);
      }
    }
    return fixes;
  }, [auditResult.undefinedVars]);

  const handleAutoFixAll = () => {
    if (fixableVars.size > 0) {
      onAutoFix(fixableVars);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-semibold text-white">CSS Variable Audit</h4>
          <HealthScoreBadge score={auditResult.healthScore} />
        </div>
        {fixableVars.size > 0 && (
          <button
            type="button"
            onClick={handleAutoFixAll}
            className="px-3 py-1.5 text-xs font-medium bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors"
          >
            Auto-fix all ({fixableVars.size})
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="flex gap-3 flex-wrap">
        <div className="px-3 py-1.5 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
          <span className="text-[10px] text-zinc-400 block">Total Vars</span>
          <span className="text-sm font-semibold text-zinc-200">{auditResult.totalVars}</span>
        </div>
        <div className="px-3 py-1.5 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
          <span className="text-[10px] text-zinc-400 block">Defined</span>
          <span className="text-sm font-semibold text-green-400">{auditResult.totalDefined}</span>
        </div>
        <div className="px-3 py-1.5 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
          <span className="text-[10px] text-zinc-400 block">Undefined</span>
          <span className={`text-sm font-semibold ${auditResult.undefinedVars.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {auditResult.undefinedVars.length}
          </span>
        </div>
        <div className="px-3 py-1.5 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
          <span className="text-[10px] text-zinc-400 block">Unused</span>
          <span className={`text-sm font-semibold ${auditResult.unusedVars.length > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
            {auditResult.unusedVars.length}
          </span>
        </div>
        {auditResult.circularRefs.length > 0 && (
          <div className="px-3 py-1.5 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
            <span className="text-[10px] text-zinc-400 block">Circular</span>
            <span className="text-sm font-semibold text-red-400">{auditResult.circularRefs.length}</span>
          </div>
        )}
      </div>

      {/* No issues state */}
      {!hasIssues && (
        <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-xl text-center">
          <p className="text-sm text-green-300 font-medium">All CSS variables are healthy</p>
          <p className="text-xs text-zinc-400 mt-1">No undefined, unused, or circular variables detected.</p>
        </div>
      )}

      {/* Undefined Variables Table */}
      {auditResult.undefinedVars.length > 0 && (
        <div className="border border-zinc-700/50 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-800/40 border-b border-zinc-700/50">
            <h5 className="text-xs font-medium text-zinc-300">Undefined Variables</h5>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {auditResult.undefinedVars.map((uv: UndefinedVariable) => (
              <UndefinedVariableRow
                key={uv.name}
                variable={uv}
                isExpanded={expandedVar === uv.name}
                onToggle={() => setExpandedVar(expandedVar === uv.name ? null : uv.name)}
                onFix={uv.suggestedFix ? () => onFixSingle(uv.name, uv.suggestedFix!) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unused Variables List */}
      {auditResult.unusedVars.length > 0 && (
        <div className="border border-zinc-700/50 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-800/40 border-b border-zinc-700/50">
            <h5 className="text-xs font-medium text-zinc-300">Unused Variables (defined but never referenced)</h5>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {auditResult.unusedVars.map((varName: string) => (
                <span
                  key={varName}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg bg-yellow-900/20 border border-yellow-500/20 text-xs text-yellow-300 font-mono"
                >
                  {varName}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Circular References */}
      {auditResult.circularRefs.length > 0 && (
        <div className="border border-red-500/30 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-red-900/20 border-b border-red-500/30">
            <h5 className="text-xs font-medium text-red-300">Circular References (require manual fix)</h5>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {auditResult.circularRefs.map((varName: string) => (
                <span
                  key={varName}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-900/20 border border-red-500/20 text-xs text-red-300 font-mono"
                >
                  {varName}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Row Component
// ============================================================================

interface UndefinedVariableRowProps {
  variable: UndefinedVariable;
  isExpanded: boolean;
  onToggle: () => void;
  onFix?: () => void;
}

const UndefinedVariableRow: React.FC<UndefinedVariableRowProps> = ({
  variable,
  isExpanded,
  onToggle,
  onFix,
}) => {
  const status = variable.suggestedFix ? 'suggested' : 'undefined';

  return (
    <div>
      <div
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/30 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        {/* Variable Name */}
        <span className="text-xs font-mono text-zinc-200 flex-1 min-w-0 truncate">
          {variable.name}
        </span>

        {/* Status Badge */}
        <StatusBadge status={status} />

        {/* Suggested Fix Preview */}
        {variable.suggestedFix && (
          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline truncate max-w-[200px]">
            {variable.suggestedFix}
          </span>
        )}

        {/* Fix Button */}
        {onFix && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFix();
            }}
            className="px-2 py-1 text-[10px] font-medium bg-yellow-700/60 hover:bg-yellow-600/60 text-yellow-200 rounded transition-colors flex-shrink-0"
          >
            Fix
          </button>
        )}

        {/* Expand Arrow */}
        <span className={`text-zinc-500 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          &#9660;
        </span>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 py-3 bg-zinc-900/40 border-t border-zinc-800/50">
          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Used in selectors:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {variable.usedIn.map((selector, idx) => (
                  <code
                    key={idx}
                    className="text-[10px] text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded font-mono"
                  >
                    {selector}
                  </code>
                ))}
              </div>
            </div>
            {variable.suggestedFix && (
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Suggested fix:</span>
                <code className="ml-2 text-[10px] text-yellow-300 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
                  {variable.suggestedFix}
                </code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CSSVariableAuditPanel;
