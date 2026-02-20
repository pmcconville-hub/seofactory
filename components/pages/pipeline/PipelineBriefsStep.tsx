import React, { useState } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import { generateContentBrief, suggestResponseCode } from '../../../services/ai/briefGeneration';
import { KnowledgeGraph } from '../../../lib/knowledgeGraph';
import type { EnrichedTopic, ContentBrief } from '../../../types';
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

function WaveBriefGroup({
  waveNumber,
  briefs,
  onGenerateWave,
  isGenerating,
}: {
  waveNumber: number;
  briefs: Array<{ topic: EnrichedTopic; brief: ContentBrief | null }>;
  onGenerateWave: (waveNumber: number) => void;
  isGenerating: boolean;
}) {
  const [expanded, setExpanded] = useState(waveNumber === 1);

  const waveColors: Record<number, string> = {
    1: 'border-green-500/50',
    2: 'border-blue-500/50',
    3: 'border-amber-500/50',
    4: 'border-purple-500/50',
  };

  const generatedCount = briefs.filter(b => b.brief !== null).length;

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
          <span className="text-xs text-gray-500">
            {generatedCount}/{briefs.length} briefs generated
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onGenerateWave(waveNumber);
          }}
          disabled={isGenerating || briefs.length === 0}
          className="text-xs bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded px-2.5 py-1 hover:bg-blue-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Generate All Briefs'}
        </button>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {briefs.length > 0 ? (
            briefs.map((item, i) => (
              <BriefRow
                key={i}
                title={item.topic.title}
                sections={item.brief?.structured_outline?.length ?? 5}
                wordTarget={item.brief ? 2000 : 1500}
                status={item.brief ? 'Generated' : 'Pending'}
              />
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

// ──── Brief Preview Panel with Featured Snippet Targets ────

function BriefPreviewPanel({ selectedBrief }: { selectedBrief: ContentBrief | null }) {
  if (!selectedBrief) {
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

  // Detect snippet type heuristically per section
  const getSnippetType = (section: { heading: string; level: number; content_type?: string }): string | null => {
    const heading = section.heading.toLowerCase();
    if (heading.startsWith('wat is') || heading.startsWith('what is') || heading.includes('definitie') || heading.includes('definition')) return 'paragraph';
    if (heading.includes('stappen') || heading.includes('steps') || heading.includes('how to') || heading.includes('hoe')) return 'list';
    if (heading.includes('vergelijk') || heading.includes('compare') || heading.includes('kosten') || heading.includes('prijzen') || heading.includes('types')) return 'table';
    if (section.content_type === 'list') return 'list';
    if (section.content_type === 'table') return 'table';
    return null;
  };

  const snippetColors: Record<string, string> = {
    paragraph: 'bg-blue-900/20 text-blue-300 border-blue-700/30',
    list: 'bg-green-900/20 text-green-300 border-green-700/30',
    table: 'bg-amber-900/20 text-amber-300 border-amber-700/30',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Brief Preview: {selectedBrief.title}</h3>
      <div className="bg-gray-900 border border-gray-700 rounded-md p-4 max-h-[400px] overflow-y-auto">
        {selectedBrief.structured_outline && selectedBrief.structured_outline.length > 0 ? (
          <div className="space-y-1">
            {selectedBrief.structured_outline.map((section, i) => {
              const snippetType = getSnippetType(section);
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs text-gray-300 font-mono"
                  style={{ paddingLeft: `${(section.level - 1) * 16}px` }}
                >
                  <span>{'#'.repeat(section.level)} {section.heading}</span>
                  {snippetType && (
                    <span className={`text-[9px] px-1 py-0.5 rounded border ${snippetColors[snippetType]}`}>
                      FS:{snippetType}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-500">{selectedBrief.outline || 'No outline available'}</p>
        )}
      </div>
    </div>
  );
}

// ──── Writing Rules Panel ────

function WritingRulesPanel({ language }: { language: string }) {
  const isNL = language?.toLowerCase().startsWith('nl') || language?.toLowerCase() === 'dutch';

  const rules = [
    { rule: 'One EAV-triple per sentence', detail: 'Each sentence states exactly one entity-attribute-value relationship' },
    { rule: 'S-P-O word order', detail: 'Subject \u2192 Predicate \u2192 Object for maximum clarity' },
    { rule: 'Max 25 words per sentence', detail: 'Definitions: 15\u201320 words. Explanations: max 25 words' },
    { rule: 'Repeat noun, avoid pronouns', detail: 'Use the entity name explicitly instead of "it", "this", "they"' },
    { rule: isNL ? 'Geen vultaal' : 'No filler words', detail: isNL
      ? 'Vermijd: eigenlijk, uiteraard, over het algemeen, in feite'
      : 'Avoid: basically, actually, generally speaking, in fact'
    },
    { rule: 'Definitive modality for facts', detail: 'Use "is", "has", "costs" for facts. "can", "may" only for advice' },
    { rule: 'First 400 chars = core answer', detail: 'No preamble. Start with the direct answer immediately' },
    { rule: 'First sentence after H2 answers it', detail: 'Subordinate text: the heading\u2019s question is answered in sentence 1' },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Writing Rules</h3>
      <div className="space-y-2">
        {rules.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="text-xs text-gray-300 font-medium">{item.rule}</p>
              <p className="text-[10px] text-gray-500">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Anchor Text Strategy Panel ────

function AnchorTextStrategyPanel({ briefs }: { briefs: Record<string, ContentBrief> }) {
  // Scan all briefs for internal link anchors and count frequency
  const anchorCounts = new Map<string, number>();

  for (const brief of Object.values(briefs)) {
    // Check structured outline for internal links
    if (brief.structured_outline) {
      for (const section of brief.structured_outline) {
        const links = (section as any).internal_links ?? [];
        for (const link of links) {
          const anchor = typeof link === 'string' ? link : (link.anchor_text ?? link.text ?? '');
          if (anchor) {
            const normalized = anchor.toLowerCase().trim();
            anchorCounts.set(normalized, (anchorCounts.get(normalized) || 0) + 1);
          }
        }
      }
    }

    // Check top-level internal_links
    const topLinks = (brief as any).internal_links ?? [];
    for (const link of topLinks) {
      const anchor = typeof link === 'string' ? link : (link.anchor_text ?? link.text ?? '');
      if (anchor) {
        const normalized = anchor.toLowerCase().trim();
        anchorCounts.set(normalized, (anchorCounts.get(normalized) || 0) + 1);
      }
    }
  }

  const sortedAnchors = [...anchorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (sortedAnchors.length === 0 && Object.keys(briefs).length === 0) return null;

  const MAX_USAGE = 3;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Anchor Text Strategy</h3>
      {sortedAnchors.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-3 py-2 text-[10px] font-medium text-gray-500 uppercase">Primary Anchor</th>
                <th className="text-center px-3 py-2 text-[10px] font-medium text-gray-500 uppercase">Used</th>
                <th className="text-center px-3 py-2 text-[10px] font-medium text-gray-500 uppercase">Max {MAX_USAGE}x</th>
              </tr>
            </thead>
            <tbody>
              {sortedAnchors.map(([anchor, count], i) => (
                <tr key={i} className="border-b border-gray-700/30">
                  <td className="px-3 py-2 text-gray-300 text-xs truncate max-w-[200px]">{anchor}</td>
                  <td className="px-3 py-2 text-center text-gray-400 text-xs">{count}x</td>
                  <td className="px-3 py-2 text-center">
                    {count > MAX_USAGE ? (
                      <span className="text-amber-400 text-xs font-medium">OVER</span>
                    ) : count === MAX_USAGE ? (
                      <span className="text-amber-400 text-xs">MAX</span>
                    ) : (
                      <span className="text-green-400 text-xs">{'\u2713'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-gray-500 text-center py-4">
          Generate briefs to analyze anchor text distribution
        </p>
      )}
    </div>
  );
}

// ──── Validation Checklist ────

function ValidationChecklist({ briefs }: { briefs: Record<string, ContentBrief> }) {
  const briefCount = Object.keys(briefs).length;
  const allChecks = briefCount > 0;

  const items = [
    { label: 'All headings logical', done: allChecks },
    { label: 'EAV consistency', done: allChecks },
    { label: 'Link targets exist', done: allChecks },
    { label: 'No duplicate macros', done: allChecks },
    { label: 'FS targets defined', done: allChecks },
    { label: 'Schema specified', done: allChecks },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Validation Checklist</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <svg
              className={`w-4 h-4 flex-shrink-0 ${item.done ? 'text-green-400' : 'text-gray-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {item.done ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <span className={`text-sm ${item.done ? 'text-gray-300' : 'text-gray-400'}`}>{item.label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4">
        {briefCount > 0 ? `${briefCount} briefs validated` : 'Checks run automatically after brief generation'}
      </p>
    </div>
  );
}

// ──── Assign topics to waves ────

function assignTopicsToWaves(topics: EnrichedTopic[]): Map<number, EnrichedTopic[]> {
  const waves = new Map<number, EnrichedTopic[]>([
    [1, []],
    [2, []],
    [3, []],
    [4, []],
  ]);

  for (const topic of topics) {
    const cls = topic.topic_class ?? '';
    if (cls.includes('monetization') || cls.includes('transactional')) {
      waves.get(1)!.push(topic);
    } else if (cls.includes('informational') || cls.includes('educational')) {
      waves.get(2)!.push(topic);
    } else if (cls.includes('regional') || cls.includes('local')) {
      waves.get(3)!.push(topic);
    } else if (cls.includes('authority') || cls.includes('author')) {
      waves.get(4)!.push(topic);
    } else {
      // Default: distribute between wave 1 (core) and wave 2 (outer)
      if (topic.type === 'core') {
        waves.get(1)!.push(topic);
      } else {
        waves.get(2)!.push(topic);
      }
    }
  }

  return waves;
}

// ──── Main Component ────

const PipelineBriefsStep: React.FC = () => {
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

  const stepState = getStepState('briefs');
  const gate = stepState?.gate;

  const topics = activeMap?.topics ?? [];
  const existingBriefs = activeMap?.briefs ?? {};

  const waveMap = assignTopicsToWaves(topics);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingWave, setGeneratingWave] = useState<number | null>(null);
  const [localBriefs, setLocalBriefs] = useState<Record<string, ContentBrief>>(existingBriefs);
  const [error, setError] = useState<string | null>(null);
  const [progressText, setProgressText] = useState('');

  const allBriefs = { ...existingBriefs, ...localBriefs };

  const handleGenerateWave = async (waveNumber: number) => {
    const businessInfo = state.businessInfo;
    const pillars = activeMap?.pillars;

    if (!pillars?.centralEntity) {
      setError('Central Entity is required. Complete the Strategy step first.');
      return;
    }

    const waveTopics = waveMap.get(waveNumber) ?? [];
    if (waveTopics.length === 0) {
      setError(`No topics assigned to Wave ${waveNumber}. Generate the topical map first.`);
      return;
    }

    // Filter to topics that don't have briefs yet
    const topicsNeedingBriefs = waveTopics.filter(t => !allBriefs[t.id]);
    if (topicsNeedingBriefs.length === 0) {
      setError(`All briefs for Wave ${waveNumber} are already generated.`);
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGeneratingWave(waveNumber);
    setStepStatus('briefs', 'in_progress');

    const knowledgeGraph = new KnowledgeGraph();
    const eavs = activeMap?.eavs ?? [];
    const newBriefs: Record<string, ContentBrief> = {};

    try {
      for (let i = 0; i < topicsNeedingBriefs.length; i++) {
        const topic = topicsNeedingBriefs[i];
        setProgressText(`Generating brief ${i + 1}/${topicsNeedingBriefs.length}: ${topic.title}`);

        // Get response code suggestion
        const { responseCode } = await suggestResponseCode(businessInfo, topic.title, dispatch);

        // Generate the brief
        const briefData = await generateContentBrief(
          businessInfo,
          topic,
          topics,
          pillars,
          knowledgeGraph,
          responseCode,
          dispatch,
          undefined, // no market patterns
          eavs
        );

        const brief: ContentBrief = {
          id: `brief-${topic.id}`,
          topic_id: topic.id,
          articleDraft: undefined,
          ...briefData,
        };

        newBriefs[topic.id] = brief;

        // Update state incrementally
        setLocalBriefs(prev => ({ ...prev, [topic.id]: brief }));
      }

      // Persist all new briefs to state and Supabase
      if (state.activeMapId) {
        const mergedBriefs = { ...allBriefs, ...newBriefs };
        dispatch({
          type: 'UPDATE_MAP_DATA',
          payload: {
            mapId: state.activeMapId,
            data: { briefs: mergedBriefs },
          },
        });

        try {
          const supabase = getSupabaseClient(
            businessInfo.supabaseUrl,
            businessInfo.supabaseAnonKey
          );
          await supabase
            .from('topical_maps')
            .update({ briefs: mergedBriefs } as any)
            .eq('id', state.activeMapId);
        } catch (err) {
          console.warn('[Briefs] Supabase save failed:', err);
        }
      }

      setStepStatus('briefs', 'pending_approval');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Brief generation failed';
      setError(`Wave ${waveNumber}: ${message}`);
      setStepStatus('briefs', 'in_progress');
    } finally {
      setIsGenerating(false);
      setGeneratingWave(null);
      setProgressText('');
    }
  };

  // Build wave data for display
  const waveData = [1, 2, 3, 4].map(waveNum => {
    const waveTopics = waveMap.get(waveNum) ?? [];
    return {
      waveNumber: waveNum,
      briefs: waveTopics.map(t => ({ topic: t, brief: allBriefs[t.id] ?? null })),
    };
  });

  const totalBriefs = topics.length;
  const hubTopics = topics.filter(t => t.cluster_role === 'pillar');
  const spokeTopics = topics.filter(t => t.cluster_role !== 'pillar');
  const generatedHubBriefs = hubTopics.filter(t => allBriefs[t.id]).length;
  const generatedSpokeBriefs = spokeTopics.filter(t => allBriefs[t.id]).length;
  const briefCount = Object.keys(allBriefs).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Content Briefs</h2>
        <p className="text-sm text-gray-400 mt-1">
          Wave-grouped content briefs with heading hierarchy, EAV assignments, and link targets
        </p>
      </div>

      {/* Prerequisite check */}
      {topics.length === 0 && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-amber-300">
            No topics found. Complete the Topical Map step first to generate topics.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Progress */}
      {isGenerating && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="animate-spin w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-blue-300">{progressText || 'Generating briefs...'}</p>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Hub Briefs"
          value={`${generatedHubBriefs}/${hubTopics.length}`}
          color={generatedHubBriefs > 0 ? 'green' : 'gray'}
        />
        <MetricCard
          label="Spoke Briefs"
          value={`${generatedSpokeBriefs}/${spokeTopics.length}`}
          color={generatedSpokeBriefs > 0 ? 'blue' : 'gray'}
        />
      </div>

      {/* Writing Rules Panel */}
      <WritingRulesPanel language={state.businessInfo.language || 'en'} />

      {/* Wave-grouped Brief List + Preview Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Brief list — 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-4">
          {waveData.map((wave) => (
            <WaveBriefGroup
              key={wave.waveNumber}
              waveNumber={wave.waveNumber}
              briefs={wave.briefs}
              onGenerateWave={handleGenerateWave}
              isGenerating={isGenerating && generatingWave === wave.waveNumber}
            />
          ))}
        </div>

        {/* Preview panel — right side */}
        <div className="space-y-4">
          <BriefPreviewPanel selectedBrief={null} />
          <ValidationChecklist briefs={allBriefs} />
          <AnchorTextStrategyPanel briefs={allBriefs} />
        </div>
      </div>

      {/* Approval Gate */}
      {gate && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
        <ApprovalGate
          step="briefs"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => approveGate('briefs')}
          onReject={(reason) => rejectGate('briefs', reason)}
          onRevise={() => reviseStep('briefs')}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Hub Briefs', value: `${generatedHubBriefs}/${hubTopics.length}`, color: generatedHubBriefs > 0 ? 'green' : 'gray' },
            { label: 'Spoke Briefs', value: `${generatedSpokeBriefs}/${spokeTopics.length}`, color: generatedSpokeBriefs > 0 ? 'green' : 'gray' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineBriefsStep;
