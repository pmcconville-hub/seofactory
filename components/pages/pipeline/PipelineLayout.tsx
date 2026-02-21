import React, { useState } from 'react';
import { Outlet, useParams, Link } from 'react-router-dom';
import { usePipeline } from '../../../hooks/usePipeline';
import PipelineStepBar from '../../pipeline/PipelineStepBar';

/**
 * PipelineLayout - Layout wrapper for all pipeline step pages.
 * Renders the PipelineStepBar at the top, step title + subtitle, and an <Outlet />
 * for the active step's content. Follows the same pattern as SetupWizardLayout.
 */
const PipelineLayout: React.FC = () => {
  const { projectId, mapId } = useParams<{ projectId: string; mapId: string }>();
  const {
    isActive,
    steps,
    currentStep,
    currentStepState,
    progressPercent,
    completedSteps,
    setCurrentStep,
    activeMap,
  } = usePipeline();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const basePath = `/p/${projectId}/m/${mapId}/pipeline`;

  // ──── Inactive pipeline state ────

  if (!isActive) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-8">
          <svg
            className="w-12 h-12 text-gray-500 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <h2 className="text-lg font-medium text-gray-300 mb-2">Pipeline not started</h2>
          <p className="text-gray-400 text-sm mb-4">
            Start a pipeline from the map selection screen to use the guided SEO workflow.
          </p>
          <Link
            to={`/p/${projectId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            Go to Map Selection
          </Link>
        </div>
      </div>
    );
  }

  // ──── Active pipeline layout ────

  const stepNumber = steps.findIndex(s => s.step === currentStep) + 1;

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Step bar */}
      <div className="mb-6">
        <PipelineStepBar
          steps={steps}
          currentStep={currentStep}
          basePath={basePath}
          onStepClick={(step) => setCurrentStep(step)}
        />
      </div>

      {/* Progress indicator with ring (J5) */}
      <div className="mb-4 flex items-center gap-3">
        <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 36 36">
          <circle
            cx="18" cy="18" r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-gray-700"
          />
          <circle
            cx="18" cy="18" r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="text-emerald-500 transition-all duration-500"
            strokeDasharray={`${2 * Math.PI * 14}`}
            strokeDashoffset={`${2 * Math.PI * 14 * (1 - progressPercent / 100)}`}
            transform="rotate(-90 18 18)"
          />
          <text x="18" y="19" textAnchor="middle" dominantBaseline="middle" className="fill-gray-300 text-[8px] font-semibold">
            {progressPercent}%
          </text>
        </svg>
        <div className="text-xs text-gray-500">
          Step {stepNumber} of {steps.length}
          <span className="ml-2 text-gray-600">
            ({completedSteps.length} step{completedSteps.length !== 1 ? 's' : ''} done)
          </span>
        </div>
      </div>

      {/* J4: Resume intelligence banner */}
      {!bannerDismissed && completedSteps.length > 0 && completedSteps.length < steps.length && (() => {
        const pendingSteps = steps.filter(s => s.status !== 'completed' && !s.autoSkipped);
        const nextAction = currentStepState?.status === 'pending_approval'
          ? 'Review and approve'
          : currentStepState?.status === 'in_progress'
            ? 'Continue working on'
            : 'Start';

        // Build summary of what's done
        const topicCount = activeMap?.topics?.length ?? 0;
        const eavCount = activeMap?.eavs?.length ?? 0;
        const briefCount = activeMap?.briefs ? Object.keys(activeMap.briefs).length : 0;
        const summaryParts: string[] = [];
        if (topicCount > 0) summaryParts.push(`${topicCount} pages planned`);
        if (eavCount > 0) summaryParts.push(`${eavCount} business facts`);
        if (briefCount > 0) summaryParts.push(`${briefCount} content specs`);

        return (
          <div className="mb-4 bg-blue-900/15 border border-blue-700/30 rounded-lg px-5 py-3 flex items-center gap-4">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-blue-200">
                <span className="font-medium">{nextAction}:</span>{' '}
                {currentStepState?.label ?? 'current step'}.{' '}
                <span className="text-blue-300/70">
                  {completedSteps.length} of {steps.filter(s => !s.autoSkipped).length} steps done
                  {summaryParts.length > 0 && ` \u2014 ${summaryParts.join(', ')}`}.
                  {pendingSteps.length > 0 && ` ${pendingSteps.length} step${pendingSteps.length > 1 ? 's' : ''} remaining.`}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              className="text-blue-400/60 hover:text-blue-300 flex-shrink-0 transition-colors"
              title="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })()}

      {/* Step title + subtitle */}
      {currentStepState && (
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-200">{currentStepState.label}</h1>
          <p className="text-sm text-gray-400 mt-1">{currentStepState.subtitle}</p>
        </div>
      )}

      {/* Step content */}
      <Outlet />
    </div>
  );
};

export default PipelineLayout;
