import React from 'react';
import { NavLink } from 'react-router-dom';
import { PipelineStepState, PipelineStep } from '../../state/slices/pipelineSlice';

// ──── Step path mapping ────

const STEP_PATH_MAP: Record<PipelineStep, string> = {
  crawl: 'crawl',
  gap_analysis: 'gap',
  strategy: 'strategy',
  eavs: 'eavs',
  map_planning: 'map',
  briefs: 'briefs',
  content: 'content',
  audit: 'audit',
  tech_spec: 'tech',
  export: 'export',
};

// ──── Props ────

interface PipelineStepBarProps {
  steps: PipelineStepState[];
  currentStep: PipelineStep;
  basePath: string; // e.g. /p/{projectId}/m/{mapId}/pipeline
  onStepClick?: (step: PipelineStep) => void;
}

// ──── Status rendering helpers ────

function getCircleClasses(status: PipelineStepState['status']): string {
  switch (status) {
    case 'locked':
      return 'bg-gray-700 border-gray-600 text-gray-500';
    case 'available':
      return 'border-blue-400 text-blue-400';
    case 'in_progress':
      return 'bg-blue-600 border-blue-600 text-white';
    case 'pending_approval':
      return 'bg-amber-600 border-amber-600 text-white';
    case 'approved':
    case 'completed':
      return 'bg-green-600 border-green-600 text-white';
    default:
      return 'border-gray-600 text-gray-600';
  }
}

function getLabelClasses(status: PipelineStepState['status'], isCurrent: boolean): string {
  if (isCurrent) return 'text-blue-400 font-medium';
  switch (status) {
    case 'locked':
      return 'text-gray-500';
    case 'available':
      return 'text-blue-400';
    case 'in_progress':
      return 'text-blue-300';
    case 'pending_approval':
      return 'text-amber-400';
    case 'approved':
    case 'completed':
      return 'text-green-400';
    default:
      return 'text-gray-500';
  }
}

// ──── Icon SVGs ────

function LockIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function ExclamationIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function SpinningDot() {
  return (
    <span className="flex items-center justify-center">
      <span className="w-2 h-2 rounded-full bg-white animate-spin-slow relative">
        <span className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin" />
      </span>
    </span>
  );
}

function StepCircleContent({ stepState, index }: { stepState: PipelineStepState; index: number }) {
  switch (stepState.status) {
    case 'locked':
      return <LockIcon />;
    case 'available':
      return <span className="text-xs font-bold">{index + 1}</span>;
    case 'in_progress':
      return <SpinningDot />;
    case 'pending_approval':
      return <ExclamationIcon />;
    case 'approved':
    case 'completed':
      return <CheckIcon />;
    default:
      return <span className="text-xs font-bold">{index + 1}</span>;
  }
}

// ──── Connecting line helpers ────

function isCompletedOrApproved(status: PipelineStepState['status']): boolean {
  return status === 'completed' || status === 'approved';
}

function ConnectingLine({
  leftStep,
  rightStep,
}: {
  leftStep: PipelineStepState;
  rightStep: PipelineStepState;
}) {
  const isGreen = isCompletedOrApproved(leftStep.status) && isCompletedOrApproved(rightStep.status);
  const lineColor = isGreen ? 'bg-green-600' : 'bg-gray-700';
  const hasGate = !!leftStep.gate;

  if (!hasGate) {
    return <div className={`flex-1 h-px mx-1 ${lineColor}`} />;
  }

  // Line with gate diamond
  const diamondColor = isGreen ? 'border-green-600 text-green-600' : 'border-gray-600 text-gray-500';

  return (
    <div className="flex-1 flex items-center mx-1">
      <div className={`flex-1 h-px ${lineColor}`} />
      <span
        className={`w-3 h-3 border rotate-45 mx-0.5 flex-shrink-0 ${diamondColor}`}
        title={`Gate: ${leftStep.gate!.reviewer}`}
      />
      <div className={`flex-1 h-px ${lineColor}`} />
    </div>
  );
}

// ──── Main Component ────

const PipelineStepBar: React.FC<PipelineStepBarProps> = ({
  steps,
  currentStep,
  basePath,
  onStepClick,
}) => {
  const isClickable = (status: PipelineStepState['status']): boolean => {
    return status !== 'locked';
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-[640px] px-2 py-3">
        {steps.map((stepState, idx) => {
          const isCurrent = stepState.step === currentStep;
          const stepPath = STEP_PATH_MAP[stepState.step];
          const clickable = isClickable(stepState.status);

          const circle = (
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-colors ${getCircleClasses(
                stepState.status,
              )}`}
            >
              <StepCircleContent stepState={stepState} index={idx} />
            </span>
          );

          const label = (
            <span
              className={`hidden sm:block text-[11px] mt-1 text-center leading-tight whitespace-nowrap ${getLabelClasses(
                stepState.status,
                isCurrent,
              )}`}
            >
              {stepState.label}
            </span>
          );

          return (
            <React.Fragment key={stepState.step}>
              {/* Step circle + label */}
              <div className="flex flex-col items-center flex-shrink-0">
                {clickable ? (
                  <NavLink
                    to={`${basePath}/${stepPath}`}
                    onClick={() => onStepClick?.(stepState.step)}
                    className="flex flex-col items-center"
                  >
                    {circle}
                    {label}
                  </NavLink>
                ) : (
                  <span className="flex flex-col items-center cursor-not-allowed">
                    {circle}
                    {label}
                  </span>
                )}
              </div>

              {/* Connecting line (between steps, not after last) */}
              {idx < steps.length - 1 && (
                <ConnectingLine leftStep={stepState} rightStep={steps[idx + 1]} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineStepBar;
