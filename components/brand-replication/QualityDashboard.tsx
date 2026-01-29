/**
 * Quality Dashboard
 *
 * Displays Phase 4 validation results with quality scores and wow-factor checklist.
 * Shows visual gauges for each scoring dimension and improvement suggestions.
 */

import React from 'react';
import { Button } from '../ui/Button';
import { ProgressCircle } from '../ui/ProgressCircle';
import type {
  ValidationOutput,
  ScoreBreakdown,
  WowFactorItem,
} from '../../services/brand-replication/interfaces';

// ============================================================================
// Types
// ============================================================================

export interface QualityDashboardProps {
  /** Validation output from Phase 4 */
  validationResult?: ValidationOutput;
  /** Quality thresholds for pass/fail */
  thresholds?: {
    brandMatch: number;
    designQuality: number;
    userExperience: number;
    overall: number;
  };
  /** Callback when approved */
  onApprove?: () => void;
  /** Callback to re-run validation */
  onRevalidate?: () => void;
  /** Loading state */
  isLoading?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const scoreColor = (score: number, threshold: number): string => {
  if (score >= threshold) return 'text-green-400';
  if (score >= threshold - 10) return 'text-yellow-400';
  return 'text-red-400';
};

const scoreRingColor = (score: number, threshold: number): string => {
  if (score >= threshold) return '#4ade80'; // green-400
  if (score >= threshold - 10) return '#facc15'; // yellow-400
  return '#f87171'; // red-400
};

// ============================================================================
// Component
// ============================================================================

export const QualityDashboard: React.FC<QualityDashboardProps> = ({
  validationResult,
  thresholds = { brandMatch: 85, designQuality: 80, userExperience: 80, overall: 82 },
  onApprove,
  onRevalidate,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p>Validating quality...</p>
        </div>
      </div>
    );
  }

  if (!validationResult) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <p className="text-lg mb-4">No validation results yet</p>
        <p className="text-sm">Run Phase 4 Validation to score the output</p>
      </div>
    );
  }

  const { scores, wowFactorChecklist, passesThreshold, suggestions } = validationResult;

  return (
    <div className="space-y-6">
      {/* Overall Score Banner */}
      <div className={`
        p-4 rounded-lg border flex items-center justify-between
        ${passesThreshold
          ? 'bg-green-900/20 border-green-800 text-green-300'
          : 'bg-red-900/20 border-red-800 text-red-300'
        }
      `}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{passesThreshold ? '\u2713' : '\u2717'}</span>
          <div>
            <div className="font-semibold text-lg">
              {passesThreshold ? 'Quality Standards Met' : 'Below Quality Threshold'}
            </div>
            <div className="text-sm opacity-80">
              Overall Score: {scores.overall}% (threshold: {thresholds.overall}%)
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {onRevalidate && (
            <Button onClick={onRevalidate} variant="outline" size="sm">
              Re-validate
            </Button>
          )}
          {onApprove && passesThreshold && (
            <Button onClick={onApprove} variant="primary" size="sm">
              Approve & Continue
            </Button>
          )}
        </div>
      </div>

      {/* Score Gauges */}
      <div className="grid grid-cols-3 gap-4">
        <ScoreGauge
          label="Brand Match"
          score={scores.brandMatch}
          threshold={thresholds.brandMatch}
        />
        <ScoreGauge
          label="Design Quality"
          score={scores.designQuality}
          threshold={thresholds.designQuality}
        />
        <ScoreGauge
          label="User Experience"
          score={scores.userExperience}
          threshold={thresholds.userExperience}
        />
      </div>

      {/* Wow Factor Checklist */}
      <div className="border border-zinc-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-700">
          <h4 className="font-medium text-white">Wow Factor Checklist</h4>
        </div>
        <div className="divide-y divide-zinc-800">
          {wowFactorChecklist.map(item => (
            <WowFactorRow key={item.id} item={item} />
          ))}
        </div>
        <div className="px-4 py-2 bg-zinc-800/30 text-xs text-zinc-500">
          {wowFactorChecklist.filter(i => i.passed).length} / {wowFactorChecklist.length} checks passed
          {' \u2022 '}
          {wowFactorChecklist.filter(i => i.required && !i.passed).length} required items failing
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="border border-zinc-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-700">
            <h4 className="font-medium text-white">Improvement Suggestions</h4>
          </div>
          <ul className="p-4 space-y-2">
            {suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-yellow-400">\u2192</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Score Details Accordion */}
      <div className="space-y-2">
        <ScoreDetails label="Brand Match Details" score={scores.brandMatch} />
        <ScoreDetails label="Design Quality Details" score={scores.designQuality} />
        <ScoreDetails label="User Experience Details" score={scores.userExperience} />
      </div>
    </div>
  );
};

// ============================================================================
// ScoreGauge Sub-component
// ============================================================================

interface ScoreGaugeProps {
  label: string;
  score: ScoreBreakdown;
  threshold: number;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ label, score, threshold }) => {
  const percentage = score.percentage;
  const color = scoreRingColor(percentage, threshold);

  return (
    <div className="bg-zinc-900/60 border border-zinc-700 rounded-lg p-4 text-center">
      {/* Use ProgressCircle component */}
      <div className="flex justify-center">
        <ProgressCircle
          percentage={percentage}
          size={96}
          strokeWidth={8}
          color={color}
        />
      </div>

      <div className="mt-2">
        <div className="font-medium text-white text-sm">{label}</div>
        <div className="text-xs text-zinc-500">Target: {threshold}%</div>
      </div>
    </div>
  );
};

// ============================================================================
// WowFactorRow Sub-component
// ============================================================================

interface WowFactorRowProps {
  item: WowFactorItem;
}

const WowFactorRow: React.FC<WowFactorRowProps> = ({ item }) => {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Status Icon */}
      <span className={`text-lg ${item.passed ? 'text-green-400' : 'text-red-400'}`}>
        {item.passed ? '\u2713' : '\u2717'}
      </span>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white text-sm">{item.label}</span>
          {item.required && (
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-orange-900/30 text-orange-400">
              Required
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
        {item.details && (
          <p className="text-xs text-zinc-400 mt-1 italic">{item.details}</p>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// ScoreDetails Sub-component
// ============================================================================

interface ScoreDetailsProps {
  label: string;
  score: ScoreBreakdown;
}

const ScoreDetails: React.FC<ScoreDetailsProps> = ({ label, score }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (score.details.length === 0 && score.suggestions.length === 0) {
    return null;
  }

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 flex items-center justify-between bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
      >
        <span className="text-sm text-zinc-300">{label}</span>
        <span className="text-zinc-500">{isOpen ? '\u25BC' : '\u25B6'}</span>
      </button>
      {isOpen && (
        <div className="p-4 space-y-3 bg-zinc-900/30">
          {score.details.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">Observations:</div>
              <ul className="space-y-1">
                {score.details.map((detail, i) => (
                  <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                    <span className="text-zinc-600">\u2022</span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {score.suggestions.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">Suggestions:</div>
              <ul className="space-y-1">
                {score.suggestions.map((suggestion, i) => (
                  <li key={i} className="text-sm text-yellow-300 flex items-start gap-2">
                    <span className="text-yellow-500">\u2192</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QualityDashboard;
