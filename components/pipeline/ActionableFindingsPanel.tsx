// components/pipeline/ActionableFindingsPanel.tsx
import React from 'react';

export interface ActionableFinding {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  details: string;
  affectedItems: string[];
  actions: FindingAction[];
}

export interface FindingAction {
  label: string;
  variant: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
}

interface ActionableFindingsPanelProps {
  findings: ActionableFinding[];
  maxVisible?: number;
}

const SEVERITY_STYLES: Record<string, { border: string; icon: string; bg: string }> = {
  critical: { border: 'border-red-300', icon: '!!', bg: 'bg-red-50' },
  high: { border: 'border-orange-300', icon: '!', bg: 'bg-orange-50' },
  medium: { border: 'border-yellow-300', icon: '~', bg: 'bg-yellow-50' },
  low: { border: 'border-gray-200', icon: 'i', bg: 'bg-gray-50' },
};

const ACTION_STYLES: Record<string, string> = {
  primary: 'bg-blue-500 text-white hover:bg-blue-600',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  danger: 'bg-red-500 text-white hover:bg-red-600',
};

export const ActionableFindingsPanel: React.FC<ActionableFindingsPanelProps> = ({
  findings,
  maxVisible = 8,
}) => {
  if (findings.length === 0) return null;

  const visible = findings.slice(0, maxVisible);
  const remaining = findings.length - maxVisible;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Findings ({findings.length})
      </div>
      {visible.map((finding, idx) => {
        const style = SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.low;
        return (
          <div
            key={`${finding.category}-${idx}`}
            className={`rounded-lg border ${style.border} ${style.bg} dark:bg-gray-800 p-3`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-500 uppercase">
                    {finding.severity}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {finding.title}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {finding.details}
                </p>
              </div>
              {finding.actions.length > 0 && (
                <div className="flex gap-1.5 flex-shrink-0">
                  {finding.actions.map((action, actionIdx) => (
                    <button
                      key={actionIdx}
                      onClick={action.onClick}
                      className={`px-2.5 py-1 text-xs font-medium rounded ${ACTION_STYLES[action.variant] || ACTION_STYLES.secondary}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {remaining > 0 && (
        <div className="text-xs text-gray-400 text-center py-1">
          +{remaining} more finding{remaining !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default ActionableFindingsPanel;
