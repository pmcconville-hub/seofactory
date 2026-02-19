import React from 'react';
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
  } = usePipeline();

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

      {/* Progress indicator */}
      <div className="mb-4 text-xs text-gray-500">
        Step {stepNumber} of {steps.length} &mdash; {progressPercent}% complete
        <span className="ml-2 text-gray-600">
          ({completedSteps.length} step{completedSteps.length !== 1 ? 's' : ''} done)
        </span>
      </div>

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
