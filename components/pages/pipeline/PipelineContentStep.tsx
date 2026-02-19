import React, { useState } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import ApprovalGate from '../../pipeline/ApprovalGate';

// TODO: Integrate contentGeneration orchestrator.ts

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

// ──── Wave Progress Bar ────

function WaveProgressBar({ completed, total }: { completed: number; total: number }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-200">Overall Progress</h3>
        <span className="text-sm font-medium text-gray-300">
          {completed}/{total} pages complete
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3">
        <div
          className="bg-blue-500 h-3 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">{percent}% of content generated</p>
    </div>
  );
}

// ──── Wave Card ────

function WaveCard({ waveNumber, done, total, color, active }: {
  waveNumber: number;
  done: number;
  total: number;
  color: string;
  active: boolean;
}) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className={`bg-gray-800 border rounded-lg p-4 ${active ? color : 'border-gray-700 opacity-60'}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-200">Wave {waveNumber}</h4>
        <span className="text-xs text-gray-400">{done}/{total}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5 mb-3">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <button
        type="button"
        disabled={!active}
        className={`w-full text-xs font-medium px-3 py-1.5 rounded transition-colors ${
          active
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        {done === total && total > 0 ? 'Complete' : `Generate Wave ${waveNumber}`}
      </button>
    </div>
  );
}

// ──── Quality Score Badge ────

function QualityBadge({ status }: { status: 'PASS' | 'REVIEW' }) {
  const styles: Record<string, string> = {
    PASS: 'bg-green-600/20 text-green-300 border-green-500/30',
    REVIEW: 'bg-amber-600/20 text-amber-300 border-amber-500/30',
  };

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${styles[status]}`}>
      {status}
    </span>
  );
}

// ──── Quality Scores Table ────

function QualityScoresTable() {
  // Placeholder data — will be populated from content generation jobs
  const pages: Array<{
    name: string;
    score: number;
    words: number;
    status: 'PASS' | 'REVIEW';
  }> = [];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-200">Quality Scores</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Page Name</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Score</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Words</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {pages.length > 0 ? (
              pages.map((page, i) => (
                <tr key={i} className="border-b border-gray-700/50">
                  <td className="px-6 py-3 text-gray-300">{page.name}</td>
                  <td className="px-6 py-3 text-center text-gray-300">{page.score}/100</td>
                  <td className="px-6 py-3 text-center text-gray-400">{page.words.toLocaleString()}</td>
                  <td className="px-6 py-3 text-center">
                    <QualityBadge status={page.status} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
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
                        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                      />
                    </svg>
                    <p className="text-sm text-gray-500">Generate content to see quality scores</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──── Content Preview Panel ────

function ContentPreviewPanel() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Content Preview</h3>
      <div className="bg-gray-900 border border-gray-700 rounded-md p-4 min-h-[300px] flex items-center justify-center">
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
              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-sm text-gray-500">Select a page to preview rendered article</p>
          <p className="text-xs text-gray-600 mt-1">
            Full article preview with heading structure, content blocks, and schema markup
          </p>
        </div>
      </div>
    </div>
  );
}

// ──── Cross-Validation Results ────

function CrossValidationResults() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Cross-Validation Results</h3>
      <div className="space-y-3">
        {['Cannibalization check', 'Internal link consistency', 'EAV coverage across pages', 'Semantic distance validation'].map((check) => (
          <div key={check} className="flex items-center gap-3">
            <svg
              className="w-4 h-4 text-gray-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-gray-400">{check}</span>
            <span className="ml-auto text-xs text-gray-600">Pending</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineContentStep: React.FC = () => {
  const {
    autoApprove,
    advanceStep,
    rejectGate,
    toggleAutoApprove,
    getStepState,
  } = usePipeline();

  const stepState = getStepState('content');
  const gate = stepState?.gate;

  // Placeholder: track which wave is active (sequential generation)
  const [activeWave] = useState(1);

  // Placeholder wave data
  const waves = [
    { waveNumber: 1, done: 0, total: 0, color: 'border-green-500/50' },
    { waveNumber: 2, done: 0, total: 0, color: 'border-blue-500/50' },
    { waveNumber: 3, done: 0, total: 0, color: 'border-amber-500/50' },
    { waveNumber: 4, done: 0, total: 0, color: 'border-purple-500/50' },
  ];

  const totalDone = waves.reduce((sum, w) => sum + w.done, 0);
  const totalPages = waves.reduce((sum, w) => sum + w.total, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Content Writing</h2>
        <p className="text-sm text-gray-400 mt-1">
          Multi-pass content generation with wave-based orchestration and quality scoring
        </p>
      </div>

      {/* Overall Wave Progress */}
      <WaveProgressBar completed={totalDone} total={totalPages} />

      {/* Wave Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {waves.map((wave) => (
          <WaveCard
            key={wave.waveNumber}
            waveNumber={wave.waveNumber}
            done={wave.done}
            total={wave.total}
            color={wave.color}
            active={wave.waveNumber === activeWave}
          />
        ))}
      </div>

      {/* Quality Scores Table */}
      <QualityScoresTable />

      {/* Content Preview + Cross-Validation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContentPreviewPanel />
        <CrossValidationResults />
      </div>

      {/* Approval Gate */}
      {gate && (
        <ApprovalGate
          step="content"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => advanceStep('content')}
          onReject={(reason) => rejectGate('content', reason)}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Pages Complete', value: `${totalDone}/${totalPages}`, color: 'gray' },
            { label: 'Avg. Quality', value: '--', color: 'gray' },
            { label: 'Total Words', value: 0, color: 'gray' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineContentStep;
