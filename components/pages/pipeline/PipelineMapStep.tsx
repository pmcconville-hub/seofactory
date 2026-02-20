import React, { useState } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import { generateInitialTopicalMap } from '../../../services/ai/mapGeneration';
import type { EnrichedTopic } from '../../../types';
import { getSupabaseClient } from '../../../services/supabaseClient';

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

function HubSpokeSection({ coreTopics, outerTopics }: {
  coreTopics: EnrichedTopic[];
  outerTopics: EnrichedTopic[];
}) {
  const [expandedHubs, setExpandedHubs] = useState<Record<string, boolean>>({});
  const INITIAL_SPOKES = 5;

  const hubs = coreTopics.filter(t => t.cluster_role === 'pillar');
  // Group spokes by parent_topic_id
  const spokesByHub = outerTopics.reduce<Record<string, EnrichedTopic[]>>((acc, spoke) => {
    const key = spoke.parent_topic_id ?? '_unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(spoke);
    return acc;
  }, {});

  const toggleHub = (hubId: string) =>
    setExpandedHubs(prev => ({ ...prev, [hubId]: !prev[hubId] }));

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-200">Page Structure</h3>
        <span className="text-xs text-gray-500">{hubs.length} hubs, {outerTopics.length} spokes</span>
      </div>

      {hubs.length === 0 ? (
        <p className="text-xs text-gray-500 text-center pt-2">
          Generate topical map to populate cluster architecture
        </p>
      ) : (
        <div className="space-y-2">
          {hubs.map(hub => {
            const spokes = spokesByHub[hub.id] ?? [];
            const isExpanded = expandedHubs[hub.id] ?? false;
            const visibleSpokes = isExpanded ? spokes : spokes.slice(0, INITIAL_SPOKES);
            const hiddenCount = spokes.length - INITIAL_SPOKES;

            return (
              <div key={hub.id} className="bg-gray-900 border border-gray-700 rounded-md overflow-hidden">
                {/* Hub row */}
                <button
                  type="button"
                  onClick={() => toggleHub(hub.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-semibold text-purple-300">H</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{hub.title}</p>
                    {hub.slug && (
                      <p className="text-[11px] text-gray-500 font-mono truncate">/{hub.slug}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">{spokes.length} spokes</span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Spokes list (always show first few, expand for rest) */}
                {spokes.length > 0 && (isExpanded || visibleSpokes.length > 0) && (
                  <div className="border-t border-gray-700/50 px-4 py-2 space-y-1">
                    {visibleSpokes.map(spoke => (
                      <div key={spoke.id} className="flex items-center gap-2 py-1 pl-4">
                        <div className="w-4 h-4 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-[8px] font-semibold text-blue-300">S</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 truncate">{spoke.title}</p>
                          {spoke.slug && (
                            <p className="text-[10px] text-gray-600 font-mono truncate">/{spoke.slug}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {!isExpanded && hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleHub(hub.id)}
                        className="text-[11px] text-blue-400 hover:text-blue-300 pl-4 py-1"
                      >
                        Show {hiddenCount} more
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unassigned spokes */}
          {(spokesByHub['_unassigned']?.length ?? 0) > 0 && (
            <div className="bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
              <p className="text-xs text-gray-500">
                {spokesByHub['_unassigned'].length} spokes without hub assignment
              </p>
            </div>
          )}
        </div>
      )}
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

function PublishingWavesPanel({ coreTopics, outerTopics }: {
  coreTopics: EnrichedTopic[];
  outerTopics: EnrichedTopic[];
}) {
  const [expandedWaves, setExpandedWaves] = useState<Record<number, boolean>>({});

  // Classify topics into waves based on topic_class.
  // topic_class is typed as 'monetization' | 'informational' but may carry
  // additional legacy string values at runtime; cast for flexible comparisons.
  const allTopics = [...coreTopics, ...outerTopics];
  const wave1 = allTopics.filter(t => t.topic_class === 'monetization');
  const wave2 = allTopics.filter(t => t.topic_class === 'informational');
  // Outer topics without a classified topic_class fall into wave 3/4 buckets
  const wave3 = allTopics.filter(t => !t.topic_class && t.type === 'outer').slice(0, Math.ceil(allTopics.length / 4));
  const wave4 = allTopics.filter(t => !t.topic_class && t.type === 'outer').slice(Math.ceil(allTopics.length / 4));

  const waves = [
    {
      number: 1,
      name: 'Wave 1: CS Monetization',
      description: 'CS monetization (first) -- Revenue-driving pages targeting commercial search intent with highest conversion potential.',
      color: 'border-green-500/50 bg-green-900/10',
      count: wave1.length,
      topics: wave1,
    },
    {
      number: 2,
      name: 'Wave 2: CS Knowledge',
      description: 'CS knowledge clusters -- Informational content supporting commercial topics, building topical depth.',
      color: 'border-blue-500/50 bg-blue-900/10',
      count: wave2.length,
      topics: wave2,
    },
    {
      number: 3,
      name: 'Wave 3: Regional',
      description: 'Regional pages -- Location-specific content for geographic targeting and local authority.',
      color: 'border-amber-500/50 bg-amber-900/10',
      count: wave3.length,
      topics: wave3,
    },
    {
      number: 4,
      name: 'Wave 4: AS Authority',
      description: 'AS authority pages -- Author Section expertise pages that build entity authority and E-E-A-T signals.',
      color: 'border-purple-500/50 bg-purple-900/10',
      count: wave4.length,
      topics: wave4,
    },
  ];

  const total = coreTopics.length + outerTopics.length;
  const WAVE_INITIAL = 8;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Publishing Waves</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {waves.map((wave) => {
          const percent = total > 0 ? Math.round((wave.count / total) * 100) : 0;
          const isExpanded = expandedWaves[wave.number] ?? false;
          const visibleTopics = isExpanded ? wave.topics : wave.topics.slice(0, WAVE_INITIAL);
          const hiddenCount = wave.topics.length - WAVE_INITIAL;

          return (
            <div
              key={wave.number}
              className={`border rounded-lg p-4 ${wave.color}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-200">{wave.name}</h4>
                <span className="text-xs text-gray-400">{wave.count} pages</span>
              </div>
              <p className="text-xs text-gray-400">{wave.description}</p>
              <div className="mt-3">
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div className="bg-gray-500 h-1.5 rounded-full" style={{ width: `${percent}%` }} />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {wave.count > 0 ? `${wave.count} topics assigned` : 'Not started'}
                </p>
              </div>

              {/* Expandable topic list */}
              {wave.topics.length > 0 && (
                <div className="mt-3 border-t border-gray-700/40 pt-2">
                  <button
                    type="button"
                    onClick={() => setExpandedWaves(prev => ({ ...prev, [wave.number]: !prev[wave.number] }))}
                    className="text-[11px] text-blue-400 hover:text-blue-300 mb-1.5 flex items-center gap-1"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    {isExpanded ? 'Hide topics' : `Show ${wave.topics.length} topics`}
                  </button>
                  {(isExpanded || visibleTopics.length <= WAVE_INITIAL) && isExpanded && (
                    <div className="space-y-1">
                      {visibleTopics.map(t => (
                        <div key={t.id} className="text-[11px] text-gray-400 py-0.5 pl-1">
                          <span className="truncate block">{t.title}</span>
                          {t.slug && (
                            <span className="text-[10px] text-gray-600 font-mono block truncate">/{t.slug}</span>
                          )}
                        </div>
                      ))}
                      {!isExpanded && hiddenCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedWaves(prev => ({ ...prev, [wave.number]: true }))}
                          className="text-[10px] text-blue-400 hover:text-blue-300 pl-1"
                        >
                          Show {hiddenCount} more
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──── Topic List ────

function TopicList({ topics, label, allCoreTopics }: {
  topics: EnrichedTopic[];
  label: string;
  allCoreTopics?: EnrichedTopic[];
}) {
  const [expanded, setExpanded] = useState(false);
  const display = expanded ? topics : topics.slice(0, 5);

  // Build a lookup for parent hub names
  const hubNameById = (allCoreTopics ?? []).reduce<Record<string, string>>((acc, t) => {
    if (t.cluster_role === 'pillar') acc[t.id] = t.title;
    return acc;
  }, {});

  if (topics.length === 0) return null;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-200">{label}</h4>
        <span className="text-xs text-gray-500">{topics.length} topics</span>
      </div>
      <div className="space-y-1">
        {display.map((t, i) => {
          const parentName = t.parent_topic_id ? hubNameById[t.parent_topic_id] : null;
          return (
            <div key={i} className="bg-gray-900 rounded px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  t.cluster_role === 'pillar' ? 'bg-purple-400' : 'bg-blue-400'
                }`} />
                <span className="truncate">{t.title}</span>
                {t.topic_class && (
                  <span className="ml-auto text-gray-600 flex-shrink-0">{t.topic_class}</span>
                )}
              </div>
              {(t.slug || parentName) && (
                <div className="flex items-center gap-2 pl-4 mt-0.5">
                  {t.slug && (
                    <span className="text-[10px] text-gray-600 font-mono truncate">/{t.slug}</span>
                  )}
                  {parentName && (
                    <span className="text-[10px] text-gray-600 truncate">
                      <span className="text-gray-700 mx-1">&rarr;</span>Hub: {parentName}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {topics.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-400 hover:text-blue-300 mt-2"
        >
          {expanded ? 'Show less' : `Show ${topics.length - 5} more`}
        </button>
      )}
    </div>
  );
}

// ──── Main Component ────

const PipelineMapStep: React.FC = () => {
  const {
    autoApprove,
    advanceStep,
    approveGate,
    rejectGate,
    reviseStep,
    toggleAutoApprove,
    getStepState,
    setStepStatus,
    activeMap,
  } = usePipeline();
  const { state, dispatch } = useAppState();

  const stepState = getStepState('map_planning');
  const gate = stepState?.gate;

  // Load existing topics from the active map
  const existingTopics = activeMap?.topics ?? [];
  const existingCore = existingTopics.filter(t => t.type === 'core');
  const existingOuter = existingTopics.filter(t => t.type === 'outer');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCore, setGeneratedCore] = useState<EnrichedTopic[]>([]);
  const [generatedOuter, setGeneratedOuter] = useState<EnrichedTopic[]>([]);
  const [error, setError] = useState<string | null>(null);

  const coreTopics = existingCore.length > 0 ? existingCore : generatedCore;
  const outerTopics = existingOuter.length > 0 ? existingOuter : generatedOuter;
  const totalTopics = coreTopics.length + outerTopics.length;

  // Count clusters (pillars)
  const clusterCount = coreTopics.filter(t => t.cluster_role === 'pillar').length;

  // Count internal links estimate (each spoke -> hub = 1 link, each hub -> spoke = max 15)
  const internalLinksEstimate = outerTopics.length * 2; // Each spoke has at least 2 links (to/from hub)

  const handleGenerateMap = async () => {
    const businessInfo = state.businessInfo;
    const pillars = activeMap?.pillars;

    if (!pillars?.centralEntity) {
      setError('Central Entity is required. Complete the Strategy step first.');
      return;
    }

    const eavs = activeMap?.eavs ?? [];
    const competitors = activeMap?.competitors ?? [];

    setError(null);
    setIsGenerating(true);
    setStepStatus('map_planning', 'in_progress');

    try {
      const result = await generateInitialTopicalMap(
        businessInfo,
        pillars,
        eavs,
        competitors,
        dispatch
      );

      const { coreTopics: newCore, outerTopics: newOuter } = result;

      setGeneratedCore(newCore);
      setGeneratedOuter(newOuter);

      // Persist to state and Supabase
      if (state.activeMapId) {
        const allTopics = [...newCore, ...newOuter];
        dispatch({
          type: 'UPDATE_MAP_DATA',
          payload: {
            mapId: state.activeMapId,
            data: { topics: allTopics },
          },
        });

        try {
          const supabase = getSupabaseClient(
            businessInfo.supabaseUrl,
            businessInfo.supabaseAnonKey
          );
          await supabase
            .from('topical_maps')
            .update({ topics: allTopics } as any)
            .eq('id', state.activeMapId);
        } catch (err) {
          console.warn('[MapGeneration] Supabase save failed:', err);
        }
      }

      setStepStatus('map_planning', 'pending_approval');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Map generation failed';
      setError(message);
      setStepStatus('map_planning', 'in_progress');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Topical Map</h2>
        <p className="text-sm text-gray-400 mt-1">
          Hub-spoke architecture, internal linking rules, and publishing wave strategy
        </p>
      </div>

      {/* Prerequisite check */}
      {!activeMap?.pillars?.centralEntity && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-amber-300">
            Complete the Strategy step first — Central Entity and pillars are required to generate a topical map.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Generating progress */}
      {isGenerating && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="animate-spin w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-blue-300">Generating topical map with AI — this may take a moment...</p>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Clusters" value={clusterCount} color={clusterCount > 0 ? 'blue' : 'gray'} />
        <MetricCard label="Total Pages" value={totalTopics} color={totalTopics > 0 ? 'green' : 'gray'} />
        <MetricCard label="Internal Links" value={internalLinksEstimate > 0 ? `~${internalLinksEstimate}` : 0} color={internalLinksEstimate > 0 ? 'amber' : 'gray'} />
      </div>

      {/* Review: Page Structure */}
      <HubSpokeSection coreTopics={coreTopics} outerTopics={outerTopics} />

      {/* Review: URL Slugs */}
      {totalTopics > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">URL Slugs</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopicList topics={coreTopics} label="Core Topics (Hub Pages)" allCoreTopics={coreTopics} />
            <TopicList topics={outerTopics} label="Outer Topics (Spoke Pages)" allCoreTopics={coreTopics} />
          </div>
        </div>
      )}

      {/* Review: Link Architecture */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">Link Architecture</p>
        <LinkFlowRulesPanel />
      </div>

      {/* Review: Publishing Waves */}
      <PublishingWavesPanel coreTopics={coreTopics} outerTopics={outerTopics} />

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleGenerateMap}
          disabled={isGenerating || !activeMap?.pillars?.centralEntity}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2"
        >
          {isGenerating && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isGenerating
            ? 'Generating...'
            : totalTopics > 0
              ? 'Regenerate Topical Map'
              : 'Generate Topical Map'}
        </button>
      </div>

      {/* Approval Gate */}
      {gate && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
        <ApprovalGate
          step="map_planning"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => approveGate('map_planning')}
          onReject={(reason) => rejectGate('map_planning', reason)}
          onRevise={() => reviseStep('map_planning')}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Clusters', value: clusterCount, color: clusterCount > 0 ? 'green' : 'gray' },
            { label: 'Total Pages', value: totalTopics, color: totalTopics > 0 ? 'green' : 'gray' },
            { label: 'Internal Links', value: internalLinksEstimate > 0 ? `~${internalLinksEstimate}` : 0, color: internalLinksEstimate > 0 ? 'amber' : 'gray' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineMapStep;
