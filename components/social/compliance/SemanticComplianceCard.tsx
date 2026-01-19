/**
 * SemanticComplianceCard Component
 *
 * Displays overall semantic compliance score with visual gauge.
 */

import React from 'react';
import type { PostComplianceReport, CampaignComplianceReport } from '../../../types/social';
import { TARGET_COMPLIANCE_SCORE } from '../../../types/social';

interface SemanticComplianceCardProps {
  report: PostComplianceReport | CampaignComplianceReport;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const SemanticComplianceCard: React.FC<SemanticComplianceCardProps> = ({
  report,
  showDetails = true,
  size = 'md'
}) => {
  const score = report.overall_score;
  const isTarget = score >= TARGET_COMPLIANCE_SCORE;
  const isWarning = score >= 70 && score < TARGET_COMPLIANCE_SCORE;
  const isCritical = score < 70;

  // Gauge dimensions based on size
  const gaugeSize = size === 'sm' ? 80 : size === 'md' ? 120 : 160;
  const strokeWidth = size === 'sm' ? 6 : size === 'md' ? 8 : 10;
  const fontSize = size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-4xl';

  // Calculate gauge arc
  const radius = (gaugeSize - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half circle
  const progress = (score / 100) * circumference;

  const getColor = () => {
    if (isTarget) return '#34d399'; // green-400
    if (isWarning) return '#facc15'; // yellow-400
    return '#f87171'; // red-400
  };

  const getGradientId = `compliance-gradient-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className={`bg-gray-800/50 rounded-lg border ${
      isTarget ? 'border-green-500/30' : isWarning ? 'border-yellow-500/30' : 'border-red-500/30'
    } p-4`}>
      <div className="flex items-start gap-4">
        {/* Gauge */}
        <div className="flex-shrink-0">
          <svg width={gaugeSize} height={gaugeSize / 2 + 10} className="overflow-visible">
            <defs>
              <linearGradient id={getGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="50%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>

            {/* Background arc */}
            <path
              d={`M ${strokeWidth / 2} ${gaugeSize / 2} A ${radius} ${radius} 0 0 1 ${gaugeSize - strokeWidth / 2} ${gaugeSize / 2}`}
              fill="none"
              stroke="#374151"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Progress arc */}
            <path
              d={`M ${strokeWidth / 2} ${gaugeSize / 2} A ${radius} ${radius} 0 0 1 ${gaugeSize - strokeWidth / 2} ${gaugeSize / 2}`}
              fill="none"
              stroke={getColor()}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              className="transition-all duration-500"
            />

            {/* Target indicator */}
            {size !== 'sm' && (
              <g transform={`translate(${gaugeSize / 2}, ${gaugeSize / 2})`}>
                <line
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={-radius + strokeWidth}
                  stroke="#6b7280"
                  strokeWidth={2}
                  strokeDasharray="3,3"
                  transform={`rotate(${-180 + (TARGET_COMPLIANCE_SCORE / 100) * 180})`}
                />
              </g>
            )}

            {/* Score text */}
            <text
              x={gaugeSize / 2}
              y={gaugeSize / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className={`${fontSize} font-bold fill-white`}
            >
              {Math.round(score)}%
            </text>
          </svg>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white flex items-center gap-2">
            Semantic Compliance
            {isTarget && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                Target Met
              </span>
            )}
          </h4>

          <p className="text-xs text-gray-400 mt-1">
            {isTarget
              ? 'Content meets semantic SEO requirements'
              : isWarning
                ? `${TARGET_COMPLIANCE_SCORE - Math.round(score)}% below target`
                : 'Significant improvements needed'}
          </p>

          {/* Score breakdown */}
          {showDetails && (
            <div className="mt-3 space-y-1.5">
              {report.checks?.slice(0, 4).map((check, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    check.passed ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className="text-xs text-gray-400 flex-1 truncate">{check.rule}</span>
                  <span className="text-xs text-gray-500">
                    {check.score}/{check.max_score}
                  </span>
                </div>
              ))}
              {report.checks && report.checks.length > 4 && (
                <p className="text-xs text-gray-500">
                  +{report.checks.length - 4} more checks
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Target legend */}
      {size !== 'sm' && (
        <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
          <span>0%</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-gray-500" style={{ marginTop: '-1px' }} />
            Target: {TARGET_COMPLIANCE_SCORE}%
          </span>
          <span>100%</span>
        </div>
      )}
    </div>
  );
};

export default SemanticComplianceCard;
