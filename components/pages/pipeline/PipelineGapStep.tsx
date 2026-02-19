import React from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import ApprovalGate from '../../pipeline/ApprovalGate';

// TODO: Wire queryNetworkAudit.ts gap analysis service

// ──── Metric Card ────

function ScoreCard({ label, value, color = 'gray' }: {
  label: string;
  value: string | number;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'gray';
}) {
  const colorMap: Record<string, string> = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    gray: 'text-gray-400',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
      <p className={`text-3xl font-bold ${colorMap[color]}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

// ──── Greenfield Skip Notice ────

function GreenfieldSkipNotice({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
        <svg
          className="w-10 h-10 text-gray-500 mx-auto mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <p className="text-sm text-gray-400">
          No existing site to analyze &mdash; this step was auto-skipped.
        </p>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onContinue}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors"
        >
          Continue to Strategy
        </button>
      </div>
    </div>
  );
}

// ──── Gap Analysis Content ────

function GapAnalysisContent() {
  return (
    <div className="space-y-6">
      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard label="Overall Health" value="--" color="gray" />
        <ScoreCard label="Content Quality" value="--" color="gray" />
        <ScoreCard label="Link Architecture" value="--" color="gray" />
        <ScoreCard label="Technical" value="--" color="gray" />
      </div>

      {/* Critical Gaps */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Critical Gaps</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
            <span>Run gap analysis to identify critical issues</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
            <span>Missing content clusters will appear here</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
            <span>Competitor coverage gaps will be highlighted</span>
          </div>
        </div>
      </div>

      {/* Entity Inventory Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-200">Entity Inventory</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Entity</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Mentions</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">EAV Count</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Consistent?</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                  No entities discovered yet. Run gap analysis to populate.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Run Analysis Button */}
      <div className="flex justify-center">
        <button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors"
        >
          Run Gap Analysis
        </button>
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineGapStep: React.FC = () => {
  const {
    isGreenfield,
    autoApprove,
    advanceStep,
    rejectGate,
    toggleAutoApprove,
    getStepState,
    setCurrentStep,
  } = usePipeline();

  const stepState = getStepState('gap_analysis');
  const gate = stepState?.gate;

  const handleContinueToStrategy = () => {
    setCurrentStep('strategy');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Gap Analysis</h2>
        <p className="text-sm text-gray-400 mt-1">
          {isGreenfield
            ? 'No existing site to analyze'
            : 'Analyze your existing website against the Holistic SEO framework'}
        </p>
      </div>

      {/* Content */}
      {isGreenfield ? (
        <GreenfieldSkipNotice onContinue={handleContinueToStrategy} />
      ) : (
        <>
          <GapAnalysisContent />

          {/* Approval Gate */}
          {gate && (
            <ApprovalGate
              step="gap_analysis"
              gate={gate}
              approval={stepState?.approval}
              autoApprove={autoApprove}
              onApprove={() => advanceStep('gap_analysis')}
              onReject={(reason) => rejectGate('gap_analysis', reason)}
              onToggleAutoApprove={toggleAutoApprove}
              summaryMetrics={[
                { label: 'Overall Health', value: '--', color: 'gray' },
                { label: 'Content Quality', value: '--', color: 'gray' },
                { label: 'Link Architecture', value: '--', color: 'gray' },
                { label: 'Technical', value: '--', color: 'gray' },
              ]}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PipelineGapStep;
