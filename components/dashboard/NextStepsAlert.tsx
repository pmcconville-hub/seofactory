/**
 * NextStepsAlert
 *
 * A slim alert banner (~48px) for critical/high-priority recommendations only.
 * Shows inline above the topical map for urgent actions.
 */

import React, { useState } from 'react';
import { Recommendation, RecommendationType } from '../../services/recommendationEngine';

interface NextStepsAlertProps {
  recommendations: Recommendation[];
  onAction: (type: RecommendationType) => void;
}

const NextStepsAlert: React.FC<NextStepsAlertProps> = ({ recommendations, onAction }) => {
  const [expanded, setExpanded] = useState(false);

  // Only show CRITICAL and HIGH priority
  const urgent = recommendations.filter(r => r.priority === 'CRITICAL' || r.priority === 'HIGH');

  if (urgent.length === 0) return null;

  const primary = urgent[0];
  const remaining = urgent.slice(1);
  const isCritical = primary.priority === 'CRITICAL';

  const borderColor = isCritical ? 'border-red-500/60' : 'border-blue-500/60';
  const bgColor = isCritical ? 'bg-red-900/15' : 'bg-blue-900/15';
  const iconColor = isCritical ? 'text-red-400' : 'text-blue-400';
  const btnColor = isCritical
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <div className={`border ${borderColor} ${bgColor} rounded-lg`}>
      {/* Primary recommendation */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <svg className={`w-4 h-4 flex-shrink-0 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{primary.title}</span>
          <span className="text-xs text-gray-400 truncate hidden sm:inline">{primary.description}</span>
        </div>

        <button
          onClick={() => onAction(primary.type)}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors flex-shrink-0 ${btnColor}`}
        >
          {primary.actionLabel}
        </button>

        {remaining.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-white flex-shrink-0 transition-colors"
          >
            +{remaining.length} more {expanded ? '\u25B4' : '\u25BE'}
          </button>
        )}
      </div>

      {/* Expanded remaining items */}
      {expanded && remaining.length > 0 && (
        <div className="border-t border-gray-700/50 px-4 py-2 space-y-1.5">
          {remaining.map(rec => (
            <div key={rec.id} className="flex items-center gap-3">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                rec.priority === 'CRITICAL' ? 'bg-red-400' : 'bg-blue-400'
              }`} />
              <span className="text-xs text-gray-300 flex-1 truncate">{rec.title}</span>
              <button
                onClick={() => onAction(rec.type)}
                className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0 transition-colors"
              >
                {rec.actionLabel} &rarr;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NextStepsAlert;
