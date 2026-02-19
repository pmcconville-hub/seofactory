import React, { useState } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import ApprovalGate from '../../pipeline/ApprovalGate';

// TODO: Integrate briefGeneration.ts and BulkBriefProgress.tsx

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

// ──── Status Badge ────

function StatusBadge({ status }: { status: 'Pending' | 'Generated' | 'Reviewed' }) {
  const styles: Record<string, string> = {
    Pending: 'bg-gray-600/20 text-gray-400 border-gray-600/30',
    Generated: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
    Reviewed: 'bg-green-600/20 text-green-300 border-green-500/30',
  };

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${styles[status]}`}>
      {status}
    </span>
  );
}

// ──── Brief Row ────

function BriefRow({ title, sections, wordTarget, status }: {
  title: string;
  sections: number;
  wordTarget: number;
  status: 'Pending' | 'Generated' | 'Reviewed';
}) {
  return (
    <div className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-300 truncate">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {sections} sections &middot; {wordTarget.toLocaleString()} words target
        </p>
      </div>
      <StatusBadge status={status} />
    </div>
  );
}

// ──── Wave Brief Group ────

function WaveBriefGroup({ waveNumber, briefs }: {
  waveNumber: number;
  briefs: Array<{ title: string; sections: number; wordTarget: number; status: 'Pending' | 'Generated' | 'Reviewed' }>;
}) {
  const [expanded, setExpanded] = useState(waveNumber === 1);

  const waveColors: Record<number, string> = {
    1: 'border-green-500/50',
    2: 'border-blue-500/50',
    3: 'border-amber-500/50',
    4: 'border-purple-500/50',
  };

  return (
    <div className={`border rounded-lg ${waveColors[waveNumber] || 'border-gray-700'}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <h4 className="text-sm font-medium text-gray-200">Wave {waveNumber}</h4>
          <span className="text-xs text-gray-500">{briefs.length} briefs</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Trigger wave-level brief generation
          }}
          className="text-xs bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded px-2.5 py-1 hover:bg-blue-600/30 transition-colors"
        >
          Generate All Briefs
        </button>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {briefs.length > 0 ? (
            briefs.map((brief, i) => (
              <BriefRow key={i} {...brief} />
            ))
          ) : (
            <p className="text-xs text-gray-500 text-center py-6">
              No pages assigned to Wave {waveNumber} yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ──── Brief Preview Panel ────

function BriefPreviewPanel() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Brief Preview</h3>
      <div className="bg-gray-900 border border-gray-700 rounded-md p-4 min-h-[200px] flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-10 h-10 text-gray-600 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <p className="text-sm text-gray-500">Select a brief to preview heading hierarchy</p>
          <p className="text-xs text-gray-600 mt-1">
            Outline structure, section breakdown, and EAV assignments will display here
          </p>
        </div>
      </div>
    </div>
  );
}

// ──── Validation Checklist ────

function ValidationChecklist() {
  const items = [
    'All headings logical',
    'EAV consistency',
    'Link targets exist',
    'No duplicate macros',
    'FS targets defined',
    'Schema specified',
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Validation Checklist</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-3">
            <svg
              className="w-4 h-4 text-gray-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-400">{item}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4">
        Checks run automatically after brief generation
      </p>
    </div>
  );
}

// ──── Main Component ────

const PipelineBriefsStep: React.FC = () => {
  const {
    autoApprove,
    advanceStep,
    rejectGate,
    toggleAutoApprove,
    getStepState,
  } = usePipeline();

  const stepState = getStepState('briefs');
  const gate = stepState?.gate;

  // Placeholder wave data — will be populated from topical map data
  const waveData: Array<{
    waveNumber: number;
    briefs: Array<{ title: string; sections: number; wordTarget: number; status: 'Pending' | 'Generated' | 'Reviewed' }>;
  }> = [
    { waveNumber: 1, briefs: [] },
    { waveNumber: 2, briefs: [] },
    { waveNumber: 3, briefs: [] },
    { waveNumber: 4, briefs: [] },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Content Briefs</h2>
        <p className="text-sm text-gray-400 mt-1">
          Wave-grouped content briefs with heading hierarchy, EAV assignments, and link targets
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Hub Briefs" value="0/0" color="gray" />
        <MetricCard label="Spoke Briefs" value="0/0" color="gray" />
      </div>

      {/* Wave-grouped Brief List + Preview Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Brief list — 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-4">
          {waveData.map((wave) => (
            <WaveBriefGroup
              key={wave.waveNumber}
              waveNumber={wave.waveNumber}
              briefs={wave.briefs}
            />
          ))}
        </div>

        {/* Preview panel — right side */}
        <div className="space-y-4">
          <BriefPreviewPanel />
          <ValidationChecklist />
        </div>
      </div>

      {/* Approval Gate (optional gate for content manager) */}
      {gate && (
        <ApprovalGate
          step="briefs"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => advanceStep('briefs')}
          onReject={(reason) => rejectGate('briefs', reason)}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Hub Briefs', value: '0/0', color: 'gray' },
            { label: 'Spoke Briefs', value: '0/0', color: 'gray' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineBriefsStep;
