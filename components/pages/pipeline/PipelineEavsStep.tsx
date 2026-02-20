import React, { useState } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import {
  detectIndustryType,
  getPredicateSuggestions,
  generateEavTemplate,
  calculateIndustryCoverage,
} from '../../../services/ai/eavService';
import type { SemanticTriple } from '../../../types';
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

// ──── Category Badge ────

function CategoryBadge({ category }: { category?: string }) {
  const cat = category ?? 'COMMON';
  const styles: Record<string, string> = {
    UNIQUE: 'bg-purple-900/20 text-purple-300 border-purple-700/40',
    ROOT: 'bg-blue-900/20 text-blue-300 border-blue-700/40',
    RARE: 'bg-green-900/20 text-green-300 border-green-700/40',
    COMMON: 'bg-gray-700 text-gray-400 border-gray-600',
  };
  return (
    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${styles[cat] || styles.COMMON}`}>
      {cat}
    </span>
  );
}

// ──── Entity-Grouped EAV Display ────

function EntityGroupedEavDisplay({ eavs }: { eavs: Partial<SemanticTriple>[] }) {
  const [expandedEntities, setExpandedEntities] = useState<Record<string, boolean>>({});

  // Group EAVs by entity name
  const entityGroups = new Map<string, {
    eavs: Partial<SemanticTriple>[];
    entityType: string;
    categoryCounts: Record<string, number>;
    completeness: number;
    missing: string[];
  }>();

  for (const eav of eavs) {
    const entityName = eav.subject?.label ?? 'Unknown Entity';
    if (!entityGroups.has(entityName)) {
      entityGroups.set(entityName, {
        eavs: [],
        entityType: eav.subject?.type ?? 'Entity',
        categoryCounts: {},
        completeness: 0,
        missing: [],
      });
    }
    const group = entityGroups.get(entityName)!;
    group.eavs.push(eav);

    const cat = eav.predicate?.category ?? 'COMMON';
    group.categoryCounts[cat] = (group.categoryCounts[cat] || 0) + 1;

    if (!eav.object?.value) {
      group.missing.push(eav.predicate?.relation ?? 'unknown attribute');
    }
  }

  // Calculate completeness for each group
  for (const group of entityGroups.values()) {
    const filled = group.eavs.filter(e => e.object?.value).length;
    group.completeness = group.eavs.length > 0
      ? Math.round((filled / group.eavs.length) * 100)
      : 0;
  }

  const toggleEntity = (name: string) =>
    setExpandedEntities(prev => ({ ...prev, [name]: !prev[name] }));

  const sortedEntities = [...entityGroups.entries()].sort(
    (a, b) => b[1].eavs.length - a[1].eavs.length
  );

  if (eavs.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
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
            d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
          />
        </svg>
        <p className="text-sm text-gray-500">Generate EAV inventory from strategy</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedEntities.map(([entityName, group]) => {
        const isExpanded = expandedEntities[entityName] ?? false;
        const completenessColor = group.completeness >= 80
          ? 'text-green-400'
          : group.completeness >= 50
            ? 'text-amber-400'
            : 'text-red-400';

        return (
          <div key={entityName} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            {/* Entity header */}
            <button
              type="button"
              onClick={() => toggleEntity(entityName)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/30 transition-colors text-left"
            >
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">{entityName}</span>
                  <span className="text-[10px] text-gray-500">({group.entityType})</span>
                </div>
                {/* Category summary */}
                <div className="flex gap-2 mt-1">
                  {Object.entries(group.categoryCounts).map(([cat, count]) => (
                    <span key={cat} className="text-[10px] text-gray-500">
                      {cat}: {count}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-gray-500">{group.eavs.length} attributes</span>
                <span className={`text-xs font-medium ${completenessColor}`}>{group.completeness}%</span>
              </div>
            </button>

            {/* Missing attribute warning */}
            {group.missing.length > 0 && !isExpanded && (
              <div className="px-4 pb-2 -mt-1">
                <p className="text-[10px] text-amber-400">
                  Missing values: {group.missing.slice(0, 3).join(', ')}
                  {group.missing.length > 3 && ` +${group.missing.length - 3} more`}
                </p>
              </div>
            )}

            {/* Expanded EAV rows */}
            {isExpanded && (
              <div className="border-t border-gray-700/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700/50">
                      <th className="text-left px-4 py-2 text-[10px] font-medium text-gray-500 uppercase">Attribute</th>
                      <th className="text-left px-4 py-2 text-[10px] font-medium text-gray-500 uppercase">Value</th>
                      <th className="text-center px-4 py-2 text-[10px] font-medium text-gray-500 uppercase">Category</th>
                      <th className="text-center px-4 py-2 text-[10px] font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.eavs.map((eav, i) => (
                      <tr key={i} className="border-b border-gray-700/30">
                        <td className="px-4 py-2 text-gray-300 font-mono text-xs">
                          {eav.predicate?.relation ?? '\u2014'}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {eav.object?.value
                            ? <span className="text-gray-400">{String(eav.object.value)}</span>
                            : <span className="text-amber-500 italic">needs value</span>
                          }
                        </td>
                        <td className="px-4 py-2 text-center">
                          <CategoryBadge category={eav.predicate?.category} />
                        </td>
                        <td className="px-4 py-2 text-center">
                          {eav.object?.value ? (
                            <span className="text-green-400 text-xs">Ready</span>
                          ) : (
                            <span className="text-amber-400 text-xs">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ──── Flat EAV Table (toggle option) ────

function EavInventoryTable({ eavs }: { eavs: Partial<SemanticTriple>[] }) {
  if (eavs.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
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
            d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
          />
        </svg>
        <p className="text-sm text-gray-500">Generate EAV inventory from strategy</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Entity</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Attribute</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {eavs.map((eav, i) => (
              <tr key={i} className="border-b border-gray-700/50">
                <td className="px-6 py-3 text-gray-300 font-medium truncate max-w-[120px]">
                  {eav.subject?.label ?? '\u2014'}
                </td>
                <td className="px-6 py-3 text-gray-300 font-mono text-xs">
                  {eav.predicate?.relation ?? '\u2014'}
                </td>
                <td className="px-6 py-3 text-gray-400 italic text-xs">
                  {eav.object?.value ? String(eav.object.value) : <span className="text-amber-500">needs value</span>}
                </td>
                <td className="px-6 py-3 text-center">
                  <CategoryBadge category={eav.predicate?.category} />
                </td>
                <td className="px-6 py-3 text-center">
                  {eav.object?.value ? (
                    <span className="text-green-400 text-xs">Ready</span>
                  ) : (
                    <span className="text-amber-400 text-xs">Pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──── Data Requests Panel ────

function DataRequestsPanel({ questions }: { questions: string[] }) {
  const defaultQuestions = [
    'What are the unique specifications of your top 5 products/services?',
    'Do you have proprietary data, certifications, or awards to reference?',
    'What are the most common customer objections or misconceptions?',
    'Which attributes differentiate you from your top 3 competitors?',
    'What numeric values (prices, measurements, ratings) should be included?',
  ];

  const displayQuestions = questions.length > 0 ? questions : defaultQuestions;

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
        {displayQuestions.map((question, i) => (
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
    approveGate,
    rejectGate,
    reviseStep,
    toggleAutoApprove,
    getStepState,
    setStepStatus,
    activeMap,
  } = usePipeline();
  const { state, dispatch } = useAppState();

  const stepState = getStepState('eavs');
  const gate = stepState?.gate;

  // Load existing EAVs from active map or state
  const existingEavs: SemanticTriple[] = activeMap?.eavs ?? state.topicalMaps.find(m => m.id === state.activeMapId)?.eavs ?? [];

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEavs, setGeneratedEavs] = useState<Partial<SemanticTriple>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  // Use existing map EAVs if available, fallback to generated
  const displayEavs = existingEavs.length > 0 ? existingEavs : generatedEavs;

  const handleGenerateEavs = async () => {
    const businessInfo = state.businessInfo;
    const pillars = activeMap?.pillars;

    if (!pillars?.centralEntity) {
      setError('Central Entity is required. Complete the Strategy step first.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setStepStatus('eavs', 'in_progress');

    try {
      // Detect industry type from business info
      const industryType = detectIndustryType(businessInfo);

      // Get predicate suggestions for this industry
      const suggestions = getPredicateSuggestions(industryType);

      // Generate EAV templates for high and medium priority predicates
      const highAndMedium = suggestions.filter(s => s.priority === 'high' || s.priority === 'medium');
      const templates = highAndMedium.map(s => generateEavTemplate(s, pillars.centralEntity));

      setGeneratedEavs(templates);

      // If we have an active map with no existing EAVs, persist the templates
      if (state.activeMapId && existingEavs.length === 0) {
        // Convert partial templates to SemanticTriple format for storage
        const partialTriples = templates.map((t, i) => ({
          id: `eav-${i}`,
          ...t,
          subject: t.subject ?? { label: pillars.centralEntity, type: 'Entity' as const },
          predicate: t.predicate ?? { relation: '', type: 'Property' as const, category: 'COMMON' as const },
          object: t.object ?? { value: '', type: 'Value' as const },
        })) as SemanticTriple[];

        dispatch({
          type: 'UPDATE_MAP_DATA',
          payload: {
            mapId: state.activeMapId,
            data: { eavs: partialTriples },
          },
        });

        // Persist to Supabase
        try {
          const supabase = getSupabaseClient(
            businessInfo.supabaseUrl,
            businessInfo.supabaseAnonKey
          );
          await supabase
            .from('topical_maps')
            .update({ eavs: partialTriples } as any)
            .eq('id', state.activeMapId);
        } catch (err) {
          console.warn('[EAVs] Supabase save failed:', err);
        }
      }

      setStepStatus('eavs', 'pending_approval');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'EAV generation failed';
      setError(message);
      setStepStatus('eavs', 'in_progress');
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate coverage metrics
  const businessInfo = state.businessInfo;
  const industryType = detectIndustryType(businessInfo);
  const coverage = displayEavs.length > 0
    ? calculateIndustryCoverage(displayEavs as SemanticTriple[], industryType)
    : null;

  const totalTriples = displayEavs.length;
  const consistent = displayEavs.filter(e => e.object?.value).length;
  const needConfirmation = displayEavs.filter(e => !e.object?.value).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">EAV Inventory</h2>
        <p className="text-sm text-gray-400 mt-1">
          Entity-Attribute-Value triples that define your semantic content strategy
        </p>
      </div>

      {/* Prerequisite check */}
      {!activeMap?.pillars?.centralEntity && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-amber-300">
            Complete the Strategy step first — Central Entity is required to generate EAVs.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Total Triples"
          value={totalTriples}
          color={totalTriples > 0 ? 'blue' : 'gray'}
        />
        <MetricCard
          label="With Values"
          value={consistent}
          color={consistent > 0 ? 'green' : 'gray'}
        />
        <MetricCard
          label="Need Confirmation"
          value={needConfirmation}
          color={needConfirmation > 0 ? 'amber' : 'gray'}
        />
      </div>

      {/* Industry coverage */}
      {coverage && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Industry Coverage ({industryType})
            </span>
            <span className="text-sm font-semibold text-blue-400">{coverage.score}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${coverage.score}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {coverage.highPriorityCovered}/{coverage.highPriorityTotal} high-priority predicates covered
          </p>
        </div>
      )}

      {/* View Mode Toggle */}
      {displayEavs.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-gray-600">EAV Inventory</p>
          <div className="flex items-center bg-gray-800 border border-gray-700 rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 text-xs transition-colors ${
                viewMode === 'grouped'
                  ? 'bg-blue-600/20 text-blue-300 border-r border-gray-700'
                  : 'text-gray-400 hover:text-gray-300 border-r border-gray-700'
              }`}
            >
              Group by entity
            </button>
            <button
              type="button"
              onClick={() => setViewMode('flat')}
              className={`px-3 py-1.5 text-xs transition-colors ${
                viewMode === 'flat'
                  ? 'bg-blue-600/20 text-blue-300'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Show all
            </button>
          </div>
        </div>
      )}

      {/* EAV Display */}
      {viewMode === 'grouped' ? (
        <EntityGroupedEavDisplay eavs={displayEavs as SemanticTriple[]} />
      ) : (
        <EavInventoryTable eavs={displayEavs as SemanticTriple[]} />
      )}

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleGenerateEavs}
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
            : totalTriples > 0
              ? 'Regenerate EAVs'
              : 'Generate EAVs'}
        </button>
      </div>

      {/* Data Requests */}
      <DataRequestsPanel questions={[]} />

      {/* Approval Gate */}
      {gate && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
        <ApprovalGate
          step="eavs"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => approveGate('eavs')}
          onReject={(reason) => rejectGate('eavs', reason)}
          onRevise={() => reviseStep('eavs')}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Total Triples', value: totalTriples, color: totalTriples > 0 ? 'green' : 'gray' },
            { label: 'With Values', value: consistent, color: consistent > 0 ? 'green' : 'gray' },
            { label: 'Need Confirmation', value: needConfirmation, color: needConfirmation > 0 ? 'amber' : 'gray' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineEavsStep;
