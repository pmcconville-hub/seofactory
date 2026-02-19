import React from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import ApprovalGate from '../../pipeline/ApprovalGate';

// TODO: Integrate TopicalMapDisplay.tsx and mapGeneration.ts

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

// ──── Hub-Spoke Architecture ────

function HubSpokeSection() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Hub-Spoke Architecture</h3>
      <div className="space-y-3">
        <div className="bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                <span className="text-xs font-semibold text-purple-300">H</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300">Hub pages</p>
                <p className="text-xs text-gray-500">Cluster pillar pages</p>
              </div>
            </div>
            <span className="text-xs text-gray-500">0 pages</span>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <span className="text-xs font-semibold text-blue-300">S</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300">Spoke pages</p>
                <p className="text-xs text-gray-500">Supporting topic pages</p>
              </div>
            </div>
            <span className="text-xs text-gray-500">0 pages</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center pt-2">
          Generate topical map to populate cluster architecture
        </p>
      </div>
    </div>
  );
}

// ──── Link Flow Rules ────

function LinkFlowRulesPanel() {
  const rules = [
    {
      code: 'SPOKE -> HUB',
      description: 'Every spoke links back to its hub page',
    },
    {
      code: 'HUB -> SPOKE (max 15)',
      description: 'Hub links to all spokes, max 15 contextual links',
    },
    {
      code: 'SPOKE -/-> SPOKE (other cluster)',
      description: 'No direct cross-cluster spoke links',
    },
    {
      code: 'HUB <-> HUB (semantic)',
      description: 'Inter-hub links only when semantic distance 0.3-0.7',
    },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Link Flow Rules</h3>
      <div className="space-y-3">
        {rules.map((rule, i) => (
          <div key={i} className="flex items-start gap-3">
            <code className="bg-gray-900 text-green-400 border border-gray-700 rounded px-2 py-1 text-xs font-mono whitespace-nowrap flex-shrink-0">
              {rule.code}
            </code>
            <p className="text-sm text-gray-400 pt-0.5">{rule.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Publishing Waves ────

function PublishingWavesPanel() {
  const waves: Array<{
    number: number;
    name: string;
    description: string;
    color: string;
  }> = [
    {
      number: 1,
      name: 'Wave 1: CS Monetization',
      description: 'CS monetization (first) -- Revenue-driving pages targeting commercial search intent with highest conversion potential.',
      color: 'border-green-500/50 bg-green-900/10',
    },
    {
      number: 2,
      name: 'Wave 2: CS Knowledge',
      description: 'CS knowledge clusters -- Informational content supporting commercial topics, building topical depth.',
      color: 'border-blue-500/50 bg-blue-900/10',
    },
    {
      number: 3,
      name: 'Wave 3: Regional',
      description: 'Regional pages -- Location-specific content for geographic targeting and local authority.',
      color: 'border-amber-500/50 bg-amber-900/10',
    },
    {
      number: 4,
      name: 'Wave 4: AS Authority',
      description: 'AS authority pages -- Author Section expertise pages that build entity authority and E-E-A-T signals.',
      color: 'border-purple-500/50 bg-purple-900/10',
    },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Publishing Waves</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {waves.map((wave) => (
          <div
            key={wave.number}
            className={`border rounded-lg p-4 ${wave.color}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-200">{wave.name}</h4>
              <span className="text-xs text-gray-500">0 pages</span>
            </div>
            <p className="text-xs text-gray-400">{wave.description}</p>
            <div className="mt-3">
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div className="bg-gray-600 h-1.5 rounded-full" style={{ width: '0%' }} />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Not started</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineMapStep: React.FC = () => {
  const {
    autoApprove,
    advanceStep,
    rejectGate,
    toggleAutoApprove,
    getStepState,
  } = usePipeline();

  const stepState = getStepState('map_planning');
  const gate = stepState?.gate;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Topical Map</h2>
        <p className="text-sm text-gray-400 mt-1">
          Hub-spoke architecture, internal linking rules, and publishing wave strategy
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Clusters" value={0} color="gray" />
        <MetricCard label="Total Pages" value={0} color="gray" />
        <MetricCard label="Internal Links" value={0} color="gray" />
      </div>

      {/* Hub-Spoke Architecture */}
      <HubSpokeSection />

      {/* Link Flow Rules */}
      <LinkFlowRulesPanel />

      {/* Publishing Waves */}
      <PublishingWavesPanel />

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors"
        >
          Generate Topical Map
        </button>
      </div>

      {/* Approval Gate */}
      {gate && (
        <ApprovalGate
          step="map_planning"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => advanceStep('map_planning')}
          onReject={(reason) => rejectGate('map_planning', reason)}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Clusters', value: 0, color: 'gray' },
            { label: 'Total Pages', value: 0, color: 'gray' },
            { label: 'Internal Links', value: 0, color: 'gray' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineMapStep;
