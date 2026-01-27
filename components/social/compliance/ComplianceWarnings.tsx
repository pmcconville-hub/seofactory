/**
 * ComplianceWarnings Component
 *
 * Displays actionable warnings and suggestions for improving compliance.
 */

import React, { useState } from 'react';
import type { PostComplianceReport, CampaignComplianceReport, ComplianceCheckResult } from '../../../types/social';
import { BANNED_FILLER_PHRASES, TARGET_COMPLIANCE_SCORE } from '../../../types/social';

interface ComplianceWarningsProps {
  report: PostComplianceReport | CampaignComplianceReport;
  variant?: 'list' | 'cards' | 'inline';
  maxWarnings?: number;
}

type WarningLevel = 'error' | 'warning' | 'info';

interface ProcessedWarning {
  level: WarningLevel;
  title: string;
  message: string;
  suggestion?: string;
  rule: string;
  score: number;
  maxScore: number;
}

const LEVEL_STYLES: Record<WarningLevel, { bg: string; border: string; text: string; icon: string }> = {
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  warning: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  }
};

function processChecks(checks: ComplianceCheckResult[]): ProcessedWarning[] {
  return checks
    .filter(check => !check.passed || check.score < check.max_score * 0.8)
    .map(check => {
      const scoreRatio = check.score / check.max_score;
      const level: WarningLevel = scoreRatio < 0.5 ? 'error' : scoreRatio < 0.8 ? 'warning' : 'info';

      return {
        level,
        title: check.rule,
        message: check.message,
        suggestion: check.suggestions?.[0],
        rule: check.rule,
        score: check.score,
        maxScore: check.max_score
      };
    })
    .sort((a, b) => {
      // Sort by severity then by score impact
      const levelOrder = { error: 0, warning: 1, info: 2 };
      if (levelOrder[a.level] !== levelOrder[b.level]) {
        return levelOrder[a.level] - levelOrder[b.level];
      }
      return (a.score / a.maxScore) - (b.score / b.maxScore);
    });
}

export const ComplianceWarnings: React.FC<ComplianceWarningsProps> = ({
  report,
  variant = 'list',
  maxWarnings = 5
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only PostComplianceReport has checks, CampaignComplianceReport doesn't
  const checks = 'checks' in report ? report.checks : [];
  const warnings = processChecks(checks || []);
  const displayWarnings = isExpanded ? warnings : warnings.slice(0, maxWarnings);
  const hiddenCount = warnings.length - maxWarnings;

  if (warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
        <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm text-green-400">All compliance checks passed!</span>
      </div>
    );
  }

  if (variant === 'inline') {
    const criticalCount = warnings.filter(w => w.level === 'error').length;
    const warningCount = warnings.filter(w => w.level === 'warning').length;

    return (
      <div className="flex items-center gap-3 text-xs">
        {criticalCount > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={LEVEL_STYLES.error.icon} />
            </svg>
            {criticalCount} critical
          </span>
        )}
        {warningCount > 0 && (
          <span className="flex items-center gap-1 text-yellow-400">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={LEVEL_STYLES.warning.icon} />
            </svg>
            {warningCount} warning{warningCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {displayWarnings.map((warning, i) => {
          const styles = LEVEL_STYLES[warning.level];
          return (
            <div
              key={i}
              className={`${styles.bg} ${styles.border} border rounded-lg p-3`}
            >
              <div className="flex items-start gap-2">
                <svg className={`w-4 h-4 ${styles.text} flex-shrink-0 mt-0.5`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={styles.icon} />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${styles.text}`}>{warning.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{warning.message}</p>
                  {warning.suggestion && (
                    <p className="text-xs text-gray-500 mt-1 italic">
                      Tip: {warning.suggestion}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {warning.score}/{warning.maxScore}
                </span>
              </div>
            </div>
          );
        })}
        {!isExpanded && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-xs text-blue-400 hover:text-blue-300 p-3 border border-dashed border-gray-600 rounded-lg"
          >
            +{hiddenCount} more issue{hiddenCount !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    );
  }

  // List variant (default)
  return (
    <div className="space-y-2">
      {displayWarnings.map((warning, i) => {
        const styles = LEVEL_STYLES[warning.level];
        return (
          <div
            key={i}
            className={`flex items-start gap-3 p-2 ${styles.bg} rounded-lg`}
          >
            <svg className={`w-4 h-4 ${styles.text} flex-shrink-0 mt-0.5`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={styles.icon} />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm ${styles.text}`}>{warning.message}</p>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {warning.score}/{warning.maxScore}
                </span>
              </div>
              {warning.suggestion && (
                <p className="text-xs text-gray-500 mt-0.5">{warning.suggestion}</p>
              )}
            </div>
          </div>
        );
      })}

      {!isExpanded && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full text-center text-xs text-gray-400 hover:text-white py-2"
        >
          Show {hiddenCount} more issue{hiddenCount !== 1 ? 's' : ''}
        </button>
      )}

      {isExpanded && warnings.length > maxWarnings && (
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="w-full text-center text-xs text-gray-400 hover:text-white py-2"
        >
          Show less
        </button>
      )}
    </div>
  );
};

/**
 * Information Density Warning
 * Shows specific issues with banned phrases and filler content
 */
interface InformationDensityWarningProps {
  report: PostComplianceReport;
}

export const InformationDensityWarning: React.FC<InformationDensityWarningProps> = ({
  report
}) => {
  const { information_density } = report;

  if (!information_density) return null;

  const hasBannedPhrases = information_density.banned_phrases_found.length > 0;
  const lowDensity = information_density.facts_per_100_chars < 2;
  const highFiller = information_density.filler_word_ratio > 0.15;

  if (!hasBannedPhrases && !lowDensity && !highFiller) {
    return null;
  }

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
      <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Information Density Issues
      </h4>

      <div className="space-y-3 text-sm">
        {/* Banned phrases */}
        {hasBannedPhrases && (
          <div>
            <p className="text-gray-400 mb-1">Banned filler phrases found:</p>
            <div className="flex flex-wrap gap-1.5">
              {information_density.banned_phrases_found.map((phrase, i) => (
                <span
                  key={i}
                  className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded"
                >
                  "{phrase}"
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Low density */}
        {lowDensity && (
          <div className="flex items-center justify-between text-gray-400">
            <span>Facts per 100 characters:</span>
            <span className="text-yellow-400">
              {information_density.facts_per_100_chars.toFixed(1)} (target: 2+)
            </span>
          </div>
        )}

        {/* High filler */}
        {highFiller && (
          <div className="flex items-center justify-between text-gray-400">
            <span>Filler word ratio:</span>
            <span className="text-yellow-400">
              {(information_density.filler_word_ratio * 100).toFixed(0)}% (max: 15%)
            </span>
          </div>
        )}

        {/* Suggestions */}
        <div className="pt-2 border-t border-yellow-500/20">
          <p className="text-xs text-gray-500">
            Replace filler phrases with concrete facts, data points, or entity-specific information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComplianceWarnings;
