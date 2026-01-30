/**
 * Pipeline Error Banner Component
 *
 * Displays actionable error messages for the Brand Replication Pipeline.
 * Shows error details, suggestions, and recovery options.
 *
 * @module components/brand-replication/PipelineErrorBanner
 */

import React from 'react';
import { Button } from '../ui/Button';
import type { PipelineError, ErrorCode } from '../../hooks/useBrandReplicationPipeline';

// ============================================================================
// Types
// ============================================================================

export interface PipelineErrorBannerProps {
  /** Error object from the pipeline hook */
  error: PipelineError;
  /** Callback to retry the failed operation */
  onRetry?: () => void;
  /** Callback to dismiss the error */
  onDismiss?: () => void;
  /** Callback to reset and start over */
  onReset?: () => void;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const phaseLabels: Record<string, string> = {
  discovery: 'Discovery',
  codegen: 'Code Generation',
  intelligence: 'Intelligence',
  validation: 'Validation',
};

const errorIcons: Record<ErrorCode, string> = {
  PIPELINE_NOT_INITIALIZED: '\u2699',
  MISSING_API_KEY: '\uD83D\uDD11',
  PREVIOUS_PHASE_REQUIRED: '\u23F3',
  NETWORK_ERROR: '\uD83C\uDF10',
  AI_RESPONSE_ERROR: '\uD83E\uDD16',
  TIMEOUT_ERROR: '\u23F1',
  CANCELLED: '\u2716',
  VALIDATION_FAILED: '\u26A0',
  SCREENSHOT_ERROR: '\uD83D\uDCF7',
  UNKNOWN_ERROR: '\u2753',
};

// ============================================================================
// Component
// ============================================================================

export const PipelineErrorBanner: React.FC<PipelineErrorBannerProps> = ({
  error,
  onRetry,
  onDismiss,
  onReset,
  isRetrying = false,
  compact = false,
}) => {
  const icon = errorIcons[error.code] || errorIcons.UNKNOWN_ERROR;
  const phaseLabel = phaseLabels[error.phase] || error.phase;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800 rounded text-sm">
        <span className="text-red-400">{icon}</span>
        <span className="text-red-300 flex-1 truncate">{error.message}</span>
        {error.recoverable && onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="text-red-400 hover:text-red-300 text-xs underline"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-500 hover:text-red-400"
          >
            \u2715
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-red-900/20 border border-red-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-red-900/30 border-b border-red-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <h4 className="font-medium text-red-300">{error.message}</h4>
            <p className="text-xs text-red-400">
              Failed in {phaseLabel} phase
              {error.code !== 'UNKNOWN_ERROR' && ` (${error.code})`}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-500 hover:text-red-400 p-1"
            aria-label="Dismiss error"
          >
            \u2715
          </button>
        )}
      </div>

      {/* Details */}
      <div className="px-4 py-3 space-y-3">
        {/* Suggestion */}
        <div className="flex items-start gap-2">
          <span className="text-yellow-400 mt-0.5">\u2192</span>
          <p className="text-sm text-zinc-300">{error.suggestion}</p>
        </div>

        {/* Technical Details */}
        {error.details && (
          <details className="group">
            <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
              Show technical details
            </summary>
            <pre className="mt-2 p-2 bg-zinc-900/50 rounded text-xs text-zinc-400 overflow-x-auto whitespace-pre-wrap">
              {error.details}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {error.recoverable && onRetry && (
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              variant="primary"
              size="sm"
            >
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
          )}
          {onReset && (
            <Button
              onClick={onReset}
              variant="outline"
              size="sm"
            >
              Start Over
            </Button>
          )}
        </div>

        {/* Non-recoverable warning */}
        {!error.recoverable && (
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded text-xs">
            <span className="text-orange-400">\u26A0</span>
            <span className="text-zinc-400">
              This error requires manual intervention. Please check the suggestion above.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PipelineErrorBanner;
