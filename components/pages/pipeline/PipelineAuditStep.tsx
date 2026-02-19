import React from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import ApprovalGate from '../../pipeline/ApprovalGate';

// TODO: Integrate UnifiedAuditOrchestrator.ts and UnifiedAuditDashboard.tsx

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

// ──── Compliance by Cluster ────

function ComplianceByCluster() {
  // Placeholder clusters — will be populated from audit results
  const clusters: Array<{ name: string; score: number }> = [
    { name: 'Cluster 1', score: 0 },
    { name: 'Cluster 2', score: 0 },
    { name: 'Cluster 3', score: 0 },
    { name: 'Cluster 4', score: 0 },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Compliance by Cluster</h3>
      <div className="space-y-3">
        {clusters.map((cluster) => (
          <div key={cluster.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-300">{cluster.name}</span>
              <span className="text-xs text-gray-500">{cluster.score}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${cluster.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4">Run audit to populate cluster compliance scores</p>
    </div>
  );
}

// ──── Severity Badge ────

function SeverityBadge({ severity, count }: {
  severity: 'Critical' | 'High' | 'Medium';
  count: number;
}) {
  const styles: Record<string, string> = {
    Critical: 'bg-red-600/20 text-red-300 border-red-500/30',
    High: 'bg-amber-600/20 text-amber-300 border-amber-500/30',
    Medium: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30',
  };

  return (
    <div className={`flex items-center gap-2 border rounded-lg px-4 py-3 ${styles[severity]}`}>
      <span className="text-sm font-medium">{severity}</span>
      <span className="text-lg font-semibold ml-auto">{count}</span>
    </div>
  );
}

// ──── Role Badge ────

function RoleBadge({ role }: { role: 'BUSINESS' | 'DEV' | 'CONTENT' }) {
  const styles: Record<string, string> = {
    BUSINESS: 'bg-purple-600/20 text-purple-300 border-purple-500/30',
    DEV: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
    CONTENT: 'bg-green-600/20 text-green-300 border-green-500/30',
  };

  return (
    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${styles[role]}`}>
      {role}
    </span>
  );
}

// ──── Action Items List ────

function ActionItemsList() {
  // Placeholder items — will be populated from audit findings
  const items: Array<{
    title: string;
    description: string;
    role: 'BUSINESS' | 'DEV' | 'CONTENT';
    severity: 'critical' | 'high' | 'medium';
  }> = [];

  const severityColors: Record<string, string> = {
    critical: 'border-l-red-500',
    high: 'border-l-amber-500',
    medium: 'border-l-yellow-500',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Action Items</h3>
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className={`bg-gray-900 border border-gray-700 border-l-4 ${severityColors[item.severity]} rounded-md px-4 py-3`}
            >
              <div className="flex items-center gap-2 mb-1">
                <RoleBadge role={item.role} />
                <span className="text-sm font-medium text-gray-200">{item.title}</span>
              </div>
              <p className="text-xs text-gray-400 ml-0.5">{item.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8">
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
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-gray-500">Run audit to generate action items</p>
        </div>
      )}
    </div>
  );
}

// ──── Auto-Fix Results ────

function AutoFixResults() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Auto-Fix Results</h3>
      <div className="bg-gray-900 border border-gray-700 rounded-md p-4 min-h-[120px] flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-8 h-8 text-gray-600 mx-auto mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.42 15.17l-5.04-3.02a.75.75 0 01.34-1.42h2.53l.94-4.22a.75.75 0 011.44 0l.94 4.22h2.53a.75.75 0 01.34 1.42l-5.04 3.02a.75.75 0 01-.88 0z"
            />
          </svg>
          <p className="text-xs text-gray-500">Auto-fix suggestions will appear after audit completes</p>
          <p className="text-xs text-gray-600 mt-1">
            Automatic corrections for common issues: meta tags, schema, heading hierarchy
          </p>
        </div>
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineAuditStep: React.FC = () => {
  const {
    autoApprove,
    advanceStep,
    rejectGate,
    toggleAutoApprove,
    getStepState,
  } = usePipeline();

  const stepState = getStepState('audit');
  const gate = stepState?.gate;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Audit &amp; Validation</h2>
        <p className="text-sm text-gray-400 mt-1">
          Unified content audit across 15 phases with auto-fix and role-based action items
        </p>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Semantic Compliance" value="--%"  color="gray" />
        <MetricCard label="KG Health" value="--/5" color="gray" />
        <MetricCard label="On-Page Score" value="--/100" color="gray" />
      </div>

      {/* Action Items Summary */}
      <div className="grid grid-cols-3 gap-4">
        <SeverityBadge severity="Critical" count={0} />
        <SeverityBadge severity="High" count={0} />
        <SeverityBadge severity="Medium" count={0} />
      </div>

      {/* Compliance + Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplianceByCluster />
        <ActionItemsList />
      </div>

      {/* Auto-Fix Results */}
      <AutoFixResults />

      {/* Run Audit Button */}
      <div className="flex justify-center">
        <button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors"
        >
          Run Full Audit
        </button>
      </div>

      {/* Approval Gate */}
      {gate && (
        <ApprovalGate
          step="audit"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => advanceStep('audit')}
          onReject={(reason) => rejectGate('audit', reason)}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Semantic Compliance', value: '--%', color: 'gray' },
            { label: 'KG Health', value: '--/5', color: 'gray' },
            { label: 'On-Page Score', value: '--/100', color: 'gray' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineAuditStep;
