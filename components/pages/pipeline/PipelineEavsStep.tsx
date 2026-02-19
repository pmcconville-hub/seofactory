import React from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import ApprovalGate from '../../pipeline/ApprovalGate';

// TODO: Integrate EavDiscoveryWizard.tsx

// ──── Metric Card ────

function MetricCard({ label, value, color = 'gray' }: {
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
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

// ──── EAV Table ────

function EavInventoryTable() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">EAV Inventory</h3>
        <span className="text-xs text-gray-500">0 triples</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Entity</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Attribute</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Confidence</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Pages</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <svg
                    className="w-10 h-10 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                    />
                  </svg>
                  <p className="text-sm text-gray-500">Generate EAV inventory from strategy</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──── Data Requests Panel ────

function DataRequestsPanel() {
  const placeholderQuestions = [
    'What are the unique specifications of your top 5 products/services?',
    'Do you have proprietary data, certifications, or awards to reference?',
    'What are the most common customer objections or misconceptions?',
    'Which attributes differentiate you from your top 3 competitors?',
    'What numeric values (prices, measurements, ratings) should be included?',
  ];

  return (
    <div className="bg-gray-900 border border-amber-700/50 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-5 h-5 text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <h3 className="text-sm font-semibold text-amber-300">Data Requests</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        These questions need answers from the business to complete the EAV inventory accurately.
      </p>
      <div className="space-y-2">
        {placeholderQuestions.map((question, i) => (
          <div key={i} className="flex items-start gap-3 bg-gray-800/50 rounded-md px-4 py-3">
            <span className="text-xs text-amber-400 font-mono mt-0.5">Q{i + 1}</span>
            <p className="text-sm text-gray-300">{question}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineEavsStep: React.FC = () => {
  const {
    autoApprove,
    advanceStep,
    rejectGate,
    toggleAutoApprove,
    getStepState,
  } = usePipeline();

  const stepState = getStepState('eavs');
  const gate = stepState?.gate;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">EAV Inventory</h2>
        <p className="text-sm text-gray-400 mt-1">
          Entity-Attribute-Value triples that define your semantic content strategy
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Total Triples" value={0} color="gray" />
        <MetricCard label="Consistent" value={0} color="gray" />
        <MetricCard label="Need Confirmation" value={0} color="amber" />
      </div>

      {/* EAV Table */}
      <EavInventoryTable />

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors"
        >
          Generate EAVs
        </button>
      </div>

      {/* Data Requests */}
      <DataRequestsPanel />

      {/* Approval Gate */}
      {gate && (
        <ApprovalGate
          step="eavs"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => advanceStep('eavs')}
          onReject={(reason) => rejectGate('eavs', reason)}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Total Triples', value: 0, color: 'gray' },
            { label: 'Consistent', value: 0, color: 'gray' },
            { label: 'Need Confirmation', value: 0, color: 'amber' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineEavsStep;
