/**
 * Pipeline Progress Component
 *
 * Displays real-time progress across all 4 phases of the Brand Replication Pipeline.
 * Shows visual progress bars, status icons, current step descriptions, and elapsed time.
 *
 * @module components/brand-replication/PipelineProgress
 */

import React, { useState, useEffect } from 'react';
import type { PipelineStatus } from '../../services/brand-replication';
import type { ModuleStatus } from '../../services/brand-replication/interfaces';

// ============================================================================
// Types
// ============================================================================

export interface PhaseStep {
  id: string;
  label: string;
  description: string;
}

export interface PhaseConfig {
  id: 'discovery' | 'codegen' | 'intelligence' | 'validation';
  name: string;
  description: string;
  steps: PhaseStep[];
  icon: string;
}

export interface PipelineProgressProps {
  /** Current pipeline status */
  status: PipelineStatus;
  /** Current phase being executed */
  currentPhase: string | null;
  /** Whether pipeline is running */
  isRunning: boolean;
  /** Error message if any */
  error: string | null;
  /** Callback to cancel the operation */
  onCancel?: () => void;
  /** Callback to retry after error */
  onRetry?: () => void;
  /** Whether cancel is in progress */
  isCancelling?: boolean;
  /** Timestamp when pipeline started */
  startTime?: Date | null;
  /** Show detailed view by default */
  defaultExpanded?: boolean;
}

// ============================================================================
// Phase Configuration
// ============================================================================

const PHASE_CONFIG: PhaseConfig[] = [
  {
    id: 'discovery',
    name: 'Discovery',
    description: 'Capturing and analyzing brand visuals',
    icon: '\uD83D\uDD0D',
    steps: [
      { id: 'screenshots', label: 'Screenshots', description: 'Capturing page screenshots' },
      { id: 'analysis', label: 'Analysis', description: 'Analyzing visual patterns' },
      { id: 'extraction', label: 'Extraction', description: 'Extracting design tokens' },
    ],
  },
  {
    id: 'codegen',
    name: 'CodeGen',
    description: 'Generating brand-matched code',
    icon: '\uD83D\uDCBB',
    steps: [
      { id: 'css', label: 'CSS', description: 'Generating CSS styles' },
      { id: 'components', label: 'Components', description: 'Creating HTML components' },
      { id: 'validation', label: 'Validation', description: 'Validating output' },
    ],
  },
  {
    id: 'intelligence',
    name: 'Intelligence',
    description: 'Matching content to components',
    icon: '\uD83E\uDDE0',
    steps: [
      { id: 'sections', label: 'Sections', description: 'Analyzing article sections' },
      { id: 'matching', label: 'Matching', description: 'Matching components to content' },
      { id: 'layout', label: 'Layout', description: 'Planning section layouts' },
    ],
  },
  {
    id: 'validation',
    name: 'Validation',
    description: 'Scoring quality and brand match',
    icon: '\u2705',
    steps: [
      { id: 'brand', label: 'Brand', description: 'Scoring brand alignment' },
      { id: 'quality', label: 'Quality', description: 'Checking design quality' },
      { id: 'wow', label: 'Wow Factor', description: 'Evaluating wow factors' },
    ],
  },
];

// ============================================================================
// Helpers
// ============================================================================

const getPhaseIndex = (phaseId: string): number => {
  return PHASE_CONFIG.findIndex(p => p.id === phaseId);
};

const getModuleStatus = (status: PipelineStatus, phaseId: string): ModuleStatus => {
  switch (phaseId) {
    case 'discovery': return status.phase1;
    case 'codegen': return status.phase2;
    case 'intelligence': return status.phase3;
    case 'validation': return status.phase4;
    default: return status.phase1;
  }
};

const formatElapsedTime = (startTime: Date | null): string => {
  if (!startTime) return '--:--';
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const statusColor = (status: ModuleStatus['status']): string => {
  switch (status) {
    case 'success': return 'text-green-400';
    case 'running': return 'text-blue-400';
    case 'failed': return 'text-red-400';
    case 'partial': return 'text-yellow-400';
    default: return 'text-zinc-500';
  }
};

const statusBgColor = (status: ModuleStatus['status']): string => {
  switch (status) {
    case 'success': return 'bg-green-500';
    case 'running': return 'bg-blue-500';
    case 'failed': return 'bg-red-500';
    case 'partial': return 'bg-yellow-500';
    default: return 'bg-zinc-600';
  }
};

const statusIcon = (status: ModuleStatus['status']): string => {
  switch (status) {
    case 'success': return '\u2713';
    case 'running': return '\u25CF';
    case 'failed': return '\u2717';
    case 'partial': return '\u26A0';
    default: return '\u25CB';
  }
};

// ============================================================================
// Component
// ============================================================================

export const PipelineProgress: React.FC<PipelineProgressProps> = ({
  status,
  currentPhase,
  isRunning,
  error,
  onCancel,
  onRetry,
  isCancelling = false,
  startTime = null,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [elapsedTime, setElapsedTime] = useState('--:--');

  // Update elapsed time every second when running
  useEffect(() => {
    if (!isRunning || !startTime) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(startTime));
    }, 1000);

    // Initial update
    setElapsedTime(formatElapsedTime(startTime));

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  // Calculate overall progress
  const overallProgress = (() => {
    const phases = [status.phase1, status.phase2, status.phase3, status.phase4];
    const totalProgress = phases.reduce((sum, p) => {
      if (p.status === 'success') return sum + 100;
      if (p.status === 'partial') return sum + 50;
      return sum + p.progress;
    }, 0);
    return Math.round(totalProgress / 4);
  })();

  // Get current phase config
  const currentPhaseConfig = currentPhase
    ? PHASE_CONFIG.find(p => p.id === currentPhase)
    : null;

  return (
    <div className="bg-zinc-900/60 border border-zinc-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            {isRunning ? (
              <div className="w-5 h-5 relative">
                <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : status.overall === 'completed' ? (
              <span className="text-green-400 text-lg">\u2713</span>
            ) : status.overall === 'failed' ? (
              <span className="text-red-400 text-lg">\u2717</span>
            ) : (
              <span className="text-zinc-500 text-lg">\u25CB</span>
            )}

            <div>
              <h4 className="font-medium text-white text-sm">
                {isRunning
                  ? `Processing: ${currentPhaseConfig?.name || 'Pipeline'}`
                  : status.overall === 'completed'
                    ? 'Pipeline Complete'
                    : status.overall === 'failed'
                      ? 'Pipeline Failed'
                      : 'Ready to Run'
                }
              </h4>
              <p className="text-xs text-zinc-500">
                {isRunning && currentPhaseConfig
                  ? currentPhaseConfig.description
                  : `${overallProgress}% complete`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Elapsed Time */}
            {(isRunning || status.overall === 'completed') && (
              <span className="text-xs text-zinc-500 font-mono">
                {elapsedTime}
              </span>
            )}

            {/* Cancel Button */}
            {isRunning && onCancel && (
              <button
                onClick={onCancel}
                disabled={isCancelling}
                className={`
                  px-3 py-1 text-xs rounded border
                  ${isCancelling
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-red-900/30 border-red-800 text-red-400 hover:bg-red-900/50'
                  }
                  transition-colors
                `}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel'}
              </button>
            )}

            {/* Retry Button */}
            {!isRunning && status.overall === 'failed' && onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1 text-xs rounded border bg-blue-900/30 border-blue-800 text-blue-400 hover:bg-blue-900/50 transition-colors"
              >
                Retry
              </button>
            )}

            {/* Expand Toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {isExpanded ? '\u25BC' : '\u25B6'}
            </button>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-3 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              status.overall === 'failed'
                ? 'bg-red-500'
                : status.overall === 'completed'
                  ? 'bg-green-500'
                  : 'bg-blue-500'
            }`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-3 bg-red-900/20 border-b border-red-800">
          <div className="flex items-start gap-2">
            <span className="text-red-400 text-lg">\u26A0</span>
            <div className="flex-1">
              <p className="text-sm text-red-300 font-medium">Error</p>
              <p className="text-xs text-red-400 mt-0.5">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Phase Details */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {PHASE_CONFIG.map((phase, index) => {
            const moduleStatus = getModuleStatus(status, phase.id);
            const isCurrentPhase = currentPhase === phase.id;
            const isPastPhase = currentPhase
              ? getPhaseIndex(currentPhase) > index
              : moduleStatus.status === 'success';

            return (
              <PhaseRow
                key={phase.id}
                phase={phase}
                moduleStatus={moduleStatus}
                isCurrentPhase={isCurrentPhase}
                isPastPhase={isPastPhase}
                isRunning={isRunning && isCurrentPhase}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PhaseRow Sub-component
// ============================================================================

interface PhaseRowProps {
  phase: PhaseConfig;
  moduleStatus: ModuleStatus;
  isCurrentPhase: boolean;
  isPastPhase: boolean;
  isRunning: boolean;
}

const PhaseRow: React.FC<PhaseRowProps> = ({
  phase,
  moduleStatus,
  isCurrentPhase,
  isPastPhase,
  isRunning,
}) => {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <div
      className={`
        border rounded-lg overflow-hidden transition-all
        ${isCurrentPhase
          ? 'border-blue-600 bg-blue-900/10'
          : isPastPhase
            ? 'border-zinc-700 bg-zinc-900/30'
            : 'border-zinc-800 bg-zinc-900/20'
        }
      `}
    >
      {/* Phase Header */}
      <div
        className="px-3 py-2 flex items-center gap-3 cursor-pointer hover:bg-zinc-800/30 transition-colors"
        onClick={() => setShowSteps(!showSteps)}
      >
        {/* Status Icon */}
        <span className={`text-lg ${statusColor(moduleStatus.status)}`}>
          {isRunning ? (
            <span className="inline-block animate-pulse">{statusIcon('running')}</span>
          ) : (
            statusIcon(moduleStatus.status)
          )}
        </span>

        {/* Phase Icon & Name */}
        <span className="text-lg">{phase.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isCurrentPhase ? 'text-white' : 'text-zinc-300'}`}>
              {phase.name}
            </span>
            {moduleStatus.message && (
              <span className="text-xs text-zinc-500 truncate">
                {moduleStatus.message}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500">{phase.description}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono ${statusColor(moduleStatus.status)}`}>
            {moduleStatus.status === 'success'
              ? '100%'
              : moduleStatus.status === 'failed'
                ? 'ERR'
                : `${moduleStatus.progress}%`
            }
          </span>
          <span className="text-zinc-600 text-xs">
            {showSteps ? '\u25BC' : '\u25B6'}
          </span>
        </div>
      </div>

      {/* Phase Progress Bar */}
      <div className="h-0.5 bg-zinc-800">
        <div
          className={`h-full transition-all duration-300 ${statusBgColor(moduleStatus.status)}`}
          style={{ width: `${moduleStatus.status === 'success' ? 100 : moduleStatus.progress}%` }}
        />
      </div>

      {/* Step Details */}
      {showSteps && (
        <div className="px-3 py-2 bg-zinc-950/50 space-y-1.5">
          {phase.steps.map((step, stepIndex) => {
            // Estimate which step we're on based on progress
            const stepsCompleted = Math.floor((moduleStatus.progress / 100) * phase.steps.length);
            const isStepComplete = moduleStatus.status === 'success' || stepIndex < stepsCompleted;
            const isStepActive = moduleStatus.status === 'running' && stepIndex === stepsCompleted;

            return (
              <div key={step.id} className="flex items-center gap-2 text-xs">
                <span className={
                  isStepComplete
                    ? 'text-green-400'
                    : isStepActive
                      ? 'text-blue-400 animate-pulse'
                      : 'text-zinc-600'
                }>
                  {isStepComplete ? '\u2713' : isStepActive ? '\u25CF' : '\u25CB'}
                </span>
                <span className={isStepComplete || isStepActive ? 'text-zinc-300' : 'text-zinc-600'}>
                  {step.label}
                </span>
                <span className="text-zinc-600">-</span>
                <span className="text-zinc-500">{step.description}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PipelineProgress;
