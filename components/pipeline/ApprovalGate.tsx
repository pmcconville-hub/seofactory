import React, { useState, useEffect, useRef } from 'react';
import { PipelineStep, GateDefinition, StepApproval } from '../../state/slices/pipelineSlice';
import StepSummaryCard from './StepSummaryCard';

// ──── Contextual Gate Text (Decision 9) ────

const GATE_TEXT: Record<PipelineStep, { approve: string; revise: string }> = {
  crawl: { approve: 'Confirm Business Profile', revise: 'Edit Business Profile' },
  gap_analysis: { approve: 'Confirm Competitive Analysis', revise: 'Adjust Analysis' },
  strategy: { approve: 'Approve Strategy', revise: 'Adjust Strategy' },
  eavs: { approve: 'Confirm Business Facts', revise: 'Edit Business Facts' },
  map_planning: { approve: 'Approve Content Plan', revise: 'Modify Content Plan' },
  briefs: { approve: 'Approve Content Specs', revise: 'Edit Content Specs' },
  content: { approve: 'Approve Articles', revise: 'Edit Articles' },
  audit: { approve: 'Accept Audit Results', revise: 'Review Findings' },
  tech_spec: { approve: 'Approve Technical Specs', revise: 'Edit Technical Specs' },
  export: { approve: 'Complete', revise: 'Review' },
};

// ──── Types ────

interface ApprovalGateProps {
  step: PipelineStep;
  gate: GateDefinition;
  approval?: StepApproval;
  autoApprove: boolean;
  summaryMetrics?: Array<{
    label: string;
    value: string | number;
    color?: 'green' | 'blue' | 'amber' | 'red' | 'gray';
  }>;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRevise: () => void;
  onToggleAutoApprove: (value: boolean) => void;
  children?: React.ReactNode;
}

// ──── Helpers ────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// ──── Sub-components ────

function InteractiveCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          checked
            ? 'bg-green-600 border-green-500'
            : 'bg-transparent border-gray-500 group-hover:border-gray-400'
        }`}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span className={`text-sm transition-colors ${checked ? 'text-green-300' : 'text-gray-300'}`}>
        {label}
      </span>
    </label>
  );
}

function AutoApproveToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span className="text-xs text-gray-400">Auto-approve</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
          checked ? 'bg-blue-600' : 'bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

// ──── Auto-Approve Countdown (J3) ────

const AUTO_APPROVE_DELAY = 3000;

function AutoApproveCountdown({
  summaryMetrics,
  approveLabel,
  onApprove,
  onPause,
}: {
  summaryMetrics?: ApprovalGateProps['summaryMetrics'];
  approveLabel: string;
  onApprove: () => void;
  onPause: () => void;
}) {
  const [remaining, setRemaining] = useState(AUTO_APPROVE_DELAY);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const left = Math.max(0, AUTO_APPROVE_DELAY - elapsed);
      setRemaining(left);
      if (left <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        onApprove();
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [onApprove]);

  const progress = 1 - remaining / AUTO_APPROVE_DELAY;
  const secondsLeft = Math.ceil(remaining / 1000);

  return (
    <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="bg-blue-600 text-xs font-bold text-white px-2 py-0.5 rounded">
            AUTO-APPROVE
          </span>
          <span className="text-sm text-gray-300">
            Advancing in {secondsLeft}s...
          </span>
        </div>
        <button
          type="button"
          onClick={onPause}
          className="border border-amber-600/50 text-amber-300 hover:bg-amber-900/20 px-3 py-1.5 rounded text-xs font-medium transition-colors"
        >
          Pause &amp; Review
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-1.5 mb-4">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all duration-75"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Summary metrics */}
      {summaryMetrics && summaryMetrics.length > 0 && (
        <StepSummaryCard title="Step Output Summary" metrics={summaryMetrics} />
      )}
    </div>
  );
}

// ──── Pending State ────

function PendingGate({
  gate,
  summaryMetrics,
  autoApprove,
  approveLabel,
  reviseLabel,
  onApprove,
  onReject,
  onToggleAutoApprove,
  children,
}: Omit<ApprovalGateProps, 'step' | 'approval' | 'onRevise'> & { approveLabel: string; reviseLabel: string }) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const allChecked = gate.reviewItems.length === 0 ||
    gate.reviewItems.every(item => checkedItems[item]);

  const toggleItem = (item: string, checked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [item]: checked }));
  };

  const handleSubmitRejection = () => {
    const trimmed = rejectionReason.trim();
    if (trimmed) {
      onReject(trimmed);
      setShowRejectInput(false);
      setRejectionReason('');
    }
  };

  return (
    <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-6">
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="bg-amber-600 text-xs font-bold text-white px-2 py-0.5 rounded">
            REVIEW GATE
          </span>
          <span className="text-sm text-gray-300">
            Confirm each item below before proceeding
          </span>
        </div>
        <AutoApproveToggle checked={autoApprove} onChange={onToggleAutoApprove} />
      </div>

      {/* Reviewer */}
      <p className="text-sm text-gray-400 mb-4">
        Reviewer: {gate.reviewer}
      </p>

      {/* Review items — interactive checkboxes */}
      {gate.reviewItems.length > 0 && (
        <div className="space-y-3 mb-4">
          {gate.reviewItems.map((item) => (
            <InteractiveCheckbox
              key={item}
              label={item}
              checked={!!checkedItems[item]}
              onChange={(checked) => toggleItem(item, checked)}
            />
          ))}
        </div>
      )}

      {/* Summary metrics card */}
      {summaryMetrics && summaryMetrics.length > 0 && (
        <div className="mb-4">
          <StepSummaryCard title="Step Output Summary" metrics={summaryMetrics} />
        </div>
      )}

      {/* Additional review content */}
      {children && <div className="mb-4">{children}</div>}

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-6">
        <button
          type="button"
          onClick={onApprove}
          disabled={!allChecked}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            allChecked
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {approveLabel}
        </button>
        {!showRejectInput && (
          <button
            type="button"
            onClick={() => setShowRejectInput(true)}
            className="border border-gray-600 text-gray-300 hover:bg-gray-800 px-4 py-2 rounded-md transition-colors"
          >
            {reviseLabel}
          </button>
        )}
        {!allChecked && gate.reviewItems.length > 0 && (
          <span className="text-xs text-amber-400">
            Check all {gate.reviewItems.length} items to enable approval
          </span>
        )}
      </div>

      {/* Rejection input */}
      {showRejectInput && (
        <div className="mt-4 space-y-3">
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Describe what needs to be changed..."
            rows={3}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmitRejection}
              disabled={!rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Submit Rejection
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRejectInput(false);
                setRejectionReason('');
              }}
              className="text-sm text-gray-400 hover:text-gray-300 px-3 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ──── Approved State ────

function ApprovedGate({ approval, onProceed }: { approval: StepApproval; onProceed: () => void }) {
  const approvedText = [
    'Approved',
    approval.approvedBy ? ` by ${approval.approvedBy}` : '',
    approval.approvedAt ? ` \u2014 ${formatDate(approval.approvedAt)}` : '',
  ].join('');

  return (
    <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="bg-green-600 text-xs font-bold text-white px-2 py-0.5 rounded">
          APPROVED
        </span>
        <span className="text-sm text-gray-300">{approvedText}</span>
      </div>
      <button
        type="button"
        onClick={onProceed}
        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
      >
        Proceed to Next Step
      </button>
    </div>
  );
}

// ──── Rejected State ────

function RejectedGate({ approval, reviseLabel, onRevise }: { approval: StepApproval; reviseLabel: string; onRevise: () => void }) {
  return (
    <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="bg-red-600 text-xs font-bold text-white px-2 py-0.5 rounded">
          CHANGES REQUESTED
        </span>
      </div>

      {approval.rejectionReason && (
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-1">Reason:</p>
          <p className="text-sm text-gray-200 bg-gray-900/50 border border-gray-700 rounded-md px-3 py-2">
            {approval.rejectionReason}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onRevise}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
      >
        {reviseLabel}
      </button>
    </div>
  );
}

// ──── Main Component ────

const ApprovalGate: React.FC<ApprovalGateProps> = ({
  step,
  gate,
  approval,
  autoApprove,
  summaryMetrics,
  onApprove,
  onReject,
  onRevise,
  onToggleAutoApprove,
  children,
}) => {
  const gateText = GATE_TEXT[step] || { approve: 'Approve & Continue', revise: 'Request Changes' };
  const [paused, setPaused] = useState(false);

  // Determine gate state
  const status = approval?.status ?? 'pending';

  if (status === 'approved' && approval) {
    return <ApprovedGate approval={approval} onProceed={onApprove} />;
  }

  if (status === 'rejected' && approval) {
    return <RejectedGate approval={approval} reviseLabel={gateText.revise} onRevise={onRevise} />;
  }

  // J3: Auto-approve with 3-second review window
  if (autoApprove && !paused) {
    return (
      <AutoApproveCountdown
        summaryMetrics={summaryMetrics}
        approveLabel={gateText.approve}
        onApprove={onApprove}
        onPause={() => setPaused(true)}
      />
    );
  }

  // Default: pending (manual review)
  return (
    <PendingGate
      gate={gate}
      summaryMetrics={summaryMetrics}
      autoApprove={autoApprove}
      approveLabel={gateText.approve}
      reviseLabel={gateText.revise}
      onApprove={onApprove}
      onReject={onReject}
      onToggleAutoApprove={onToggleAutoApprove}
    >
      {children}
    </PendingGate>
  );
};

export default ApprovalGate;
