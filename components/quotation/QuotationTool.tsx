/**
 * QuotationTool - Main Wizard Container
 *
 * Multi-step wizard for creating SEO service quotes.
 */

import React from 'react';
import { useAppState } from '../../state/appState';
import { AppStep } from '../../types';
import { useQuotation } from '../../hooks/useQuotation';

// Step Components
import { UrlInputStep } from './steps/UrlInputStep';
import { AnalysisResultStep } from './steps/AnalysisResultStep';
import { QuestionnaireStep } from './steps/QuestionnaireStep';
import { PackageStep } from './steps/PackageStep';
import { ModuleStep } from './steps/ModuleStep';
import { QuoteStep } from './steps/QuoteStep';

// UI Components
import { Button } from '../ui/Button';

// =============================================================================
// Step Progress Indicator
// =============================================================================

interface StepIndicatorProps {
  currentStep: string;
  steps: { key: string; label: string }[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, steps }) => {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => {
        const isActive = step.key === currentStep;
        const isComplete = index < currentIndex;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isComplete
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {isComplete ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`mt-2 text-xs ${
                  isActive ? 'text-blue-400' : isComplete ? 'text-green-400' : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-2 ${
                  index < currentIndex ? 'bg-green-600' : 'bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

interface QuotationToolProps {
  onClose?: () => void;
}

export const QuotationTool: React.FC<QuotationToolProps> = ({ onClose }) => {
  const { dispatch } = useAppState();
  const quotation = useQuotation();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION });
    }
  };

  const steps = [
    { key: 'url_input', label: 'URL' },
    { key: 'analysis_result', label: 'Analysis' },
    { key: 'questionnaire', label: 'Goals' },
    { key: 'package_selection', label: 'Package' },
    { key: 'module_customization', label: 'Customize' },
    { key: 'quote_preview', label: 'Quote' },
  ];

  // Filter steps based on flow (skip customization if package selected)
  const visibleSteps = quotation.wizardState.selectedPackageId
    ? steps.filter((s) => s.key !== 'module_customization')
    : steps;

  const renderStep = () => {
    switch (quotation.currentStep) {
      case 'url_input':
        return (
          <UrlInputStep
            url={quotation.wizardState.url}
            onUrlChange={quotation.setUrl}
            onAnalyze={quotation.startAnalysis}
            onQuickAnalyze={quotation.useQuickAnalysis}
            isAnalyzing={quotation.isAnalyzing}
            progress={quotation.analysisProgress}
            error={quotation.error}
          />
        );

      case 'analysis_result':
        return (
          <AnalysisResultStep
            analysisResult={quotation.wizardState.analysisResult!}
            onContinue={quotation.goNext}
            onReanalyze={() => quotation.goToStep('url_input')}
          />
        );

      case 'questionnaire':
        return (
          <QuestionnaireStep
            responses={quotation.wizardState.questionnaireResponses}
            onResponseChange={quotation.setQuestionnaireResponse}
            onContinue={quotation.goNext}
            onBack={quotation.goBack}
          />
        );

      case 'package_selection':
        return (
          <PackageStep
            analysisResult={quotation.wizardState.analysisResult}
            selectedPackageId={quotation.wizardState.selectedPackageId}
            recommendedPackageId={quotation.recommendedPackageId}
            onSelectPackage={quotation.selectPackage}
            onCustomize={() => {
              quotation.clearPackageSelection();
              quotation.goToStep('module_customization');
            }}
            onContinue={quotation.goNext}
            onBack={quotation.goBack}
          />
        );

      case 'module_customization':
        return (
          <ModuleStep
            availableModules={quotation.availableModules}
            selectedModuleIds={quotation.wizardState.selectedModuleIds}
            onToggleModule={quotation.toggleModule}
            lineItems={quotation.lineItems}
            quoteTotal={quotation.quoteTotal}
            onContinue={quotation.goNext}
            onBack={quotation.goBack}
          />
        );

      case 'quote_preview':
        return (
          <QuoteStep
            wizardState={quotation.wizardState}
            lineItems={quotation.lineItems}
            quoteTotal={quotation.quoteTotal}
            kpiProjections={quotation.kpiProjections}
            roiCalculation={quotation.roiCalculation}
            clientInfo={quotation.wizardState.clientInfo}
            onClientInfoChange={quotation.setClientInfo}
            onGenerateQuote={quotation.generateQuote}
            onBack={quotation.goBack}
            onStartOver={quotation.resetWizard}
          />
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">SEO Quote Generator</h1>
            <p className="text-sm text-gray-400 mt-1">
              Analyze a website and create a customized SEO service proposal
            </p>
          </div>
          <Button variant="ghost" onClick={handleClose}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </Button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="max-w-4xl mx-auto pt-8 px-6">
        <StepIndicator currentStep={quotation.currentStep} steps={visibleSteps} />
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-6 pb-12">{renderStep()}</div>
    </div>
  );
};

export default QuotationTool;
