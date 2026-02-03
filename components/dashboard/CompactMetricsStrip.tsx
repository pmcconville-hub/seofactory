/**
 * CompactMetricsStrip
 *
 * A single-row horizontal strip (~44px) showing key strategy metrics.
 * Replaces the expanded StrategyOverview as the above-the-fold summary.
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { SEOPillars, EnrichedTopic, ContentBrief, SemanticTriple } from '../../types';
import { KnowledgeGraph } from '../../lib/knowledgeGraph';
import { calculateStrategyMetrics, calculatePillarStatus, StrategyMetrics } from '../../utils/strategyMetrics';

export interface CompactMetricsStripProps {
  pillars?: SEOPillars;
  topics: EnrichedTopic[];
  briefs: Record<string, ContentBrief>;
  eavs?: SemanticTriple[];
  knowledgeGraph?: KnowledgeGraph | null;
  onEditPillars?: () => void;
  onEditEavs?: () => void;
  onEditCompetitors?: () => void;
  onJumpToPanel?: (panelId: string) => void;
}

type PopoverType = 'ready' | 'domain' | 'eav' | 'context' | null;

const CompactMetricsStrip: React.FC<CompactMetricsStripProps> = ({
  pillars,
  topics,
  briefs,
  eavs = [],
  knowledgeGraph,
  onEditPillars,
  onEditEavs,
  onEditCompetitors,
  onJumpToPanel,
}) => {
  const [activePopover, setActivePopover] = useState<PopoverType>(null);
  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const metrics = useMemo(
    () => calculateStrategyMetrics(topics, briefs, eavs, knowledgeGraph),
    [topics, briefs, eavs, knowledgeGraph],
  );

  const pillarStatus = useMemo(
    () => calculatePillarStatus(pillars),
    [pillars],
  );

  // Close overflow menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false);
      }
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const statusDot = (value: number, thresholds: [number, number]) => {
    if (value >= thresholds[0]) return 'bg-green-400';
    if (value >= thresholds[1]) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const eavNum = Number(metrics.eavDensity);

  return (
    <div className="relative">
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-800/40 border border-gray-700/50 rounded-lg overflow-x-auto">
        {/* Pillar Badge */}
        <button
          onClick={onEditPillars}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-gray-700/50 transition-colors flex-shrink-0"
          title="Edit SEO Pillars"
        >
          <span className="text-gray-500">Pillars:</span>
          <span className={`font-medium ${pillarStatus.defined ? 'text-green-400' : 'text-yellow-400'}`}>
            {pillarStatus.summary}
          </span>
          {pillarStatus.defined && (
            <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        <Divider />

        {/* Ready metric */}
        <MetricChip
          dot={statusDot(metrics.briefQualityPercent, [80, 50])}
          value={`${metrics.briefQualityPercent}%`}
          label="Ready"
          active={activePopover === 'ready'}
          onClick={() => setActivePopover(activePopover === 'ready' ? null : 'ready')}
        />

        <Divider />

        {/* Domain metric */}
        <MetricChip
          dot={statusDot(metrics.domainCoverage, [70, 40])}
          value={`${metrics.domainCoverage}%`}
          label="Domain"
          active={activePopover === 'domain'}
          onClick={() => setActivePopover(activePopover === 'domain' ? null : 'domain')}
        />

        <Divider />

        {/* EAV metric */}
        <MetricChip
          dot={statusDot(eavNum >= 3 ? 80 : eavNum >= 1 ? 50 : 0, [80, 50])}
          value={metrics.eavDensity}
          label="EAV"
          active={activePopover === 'eav'}
          onClick={() => setActivePopover(activePopover === 'eav' ? null : 'eav')}
        />

        <Divider />

        {/* Context metric */}
        <MetricChip
          dot={statusDot(metrics.contextCoverage, [80, 50])}
          value={`${metrics.contextCoverage}%`}
          label="Context"
          active={activePopover === 'context'}
          onClick={() => setActivePopover(activePopover === 'context' ? null : 'context')}
        />

        {/* Brief Health Pills */}
        {metrics.briefStats.withBriefs > 0 && (
          <>
            <Divider />
            <div className="flex items-center gap-1.5 flex-shrink-0 text-xs">
              <span className="text-gray-500">Brief:</span>
              {metrics.briefStats.complete > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
                  {metrics.briefStats.complete}
                </span>
              )}
              {metrics.briefStats.partial > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">
                  {metrics.briefStats.partial}
                </span>
              )}
              {metrics.briefStats.empty > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
                  {metrics.briefStats.empty}
                </span>
              )}
            </div>
          </>
        )}

        {/* Overflow menu trigger - dropdown renders outside overflow-x-auto container */}
        <div className="ml-auto flex-shrink-0" ref={overflowRef}>
          <button
            onClick={() => setShowOverflow(!showOverflow)}
            className="px-2 py-1 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors text-sm"
            title="Quick actions"
          >
            ...
          </button>
        </div>
      </div>

      {/* Overflow dropdown - rendered outside the overflow-x-auto container */}
      {showOverflow && (
        <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-50 min-w-[200px]">
          {onEditPillars && (
            <OverflowItem label="Edit Pillars" onClick={() => { setShowOverflow(false); onEditPillars(); }} />
          )}
          {onEditEavs && (
            <OverflowItem label="Manage EAVs" onClick={() => { setShowOverflow(false); onEditEavs(); }} />
          )}
          {onEditCompetitors && (
            <OverflowItem label="Competitors" onClick={() => { setShowOverflow(false); onEditCompetitors(); }} />
          )}
          {onJumpToPanel && (
            <>
              <div className="border-t border-gray-700 my-1" />
              <div className="px-3 py-1 text-xs text-gray-500 font-medium uppercase tracking-wider">Analysis Panels</div>
              <OverflowItem label="Strategy Details" onClick={() => { setShowOverflow(false); onJumpToPanel('strategy-overview'); }} />
              <OverflowItem label="Semantic Authority Score" onClick={() => { setShowOverflow(false); onJumpToPanel('semantic-authority'); }} />
              <OverflowItem label="Bridging Opportunities" onClick={() => { setShowOverflow(false); onJumpToPanel('bridging-opportunities'); }} />
              <OverflowItem label="Content Priority Tiers" onClick={() => { setShowOverflow(false); onJumpToPanel('priority-tiers'); }} />
              <OverflowItem label="Next Steps" onClick={() => { setShowOverflow(false); onJumpToPanel('next-steps'); }} />
            </>
          )}
        </div>
      )}

      {/* Popover Detail */}
      {activePopover && (
        <div ref={popoverRef} className="absolute left-0 right-0 top-full mt-1 z-40">
          <MetricPopover
            type={activePopover}
            metrics={metrics}
            onClose={() => setActivePopover(null)}
            onEditEavs={onEditEavs}
            onJumpToPanel={onJumpToPanel}
          />
        </div>
      )}
    </div>
  );
};

const Divider = () => (
  <div className="w-px h-5 bg-gray-700/50 flex-shrink-0 mx-1" />
);

interface MetricChipProps {
  dot: string;
  value: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

const MetricChip: React.FC<MetricChipProps> = ({ dot, value, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors flex-shrink-0 ${
      active ? 'bg-gray-700/70 ring-1 ring-blue-500/50' : 'hover:bg-gray-700/50'
    }`}
  >
    <span className={`w-2 h-2 rounded-full ${dot}`} />
    <span className="font-medium text-white">{value}</span>
    <span className="text-gray-400">{label}</span>
  </button>
);

const OverflowItem: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
  >
    {label}
  </button>
);

/**
 * Metric detail popover - shows summary with link to full details panel below
 */
const MetricPopover: React.FC<{
  type: PopoverType;
  metrics: StrategyMetrics;
  onClose: () => void;
  onEditEavs?: () => void;
  onJumpToPanel?: (panelId: string) => void;
}> = ({ type, metrics, onClose, onEditEavs, onJumpToPanel }) => {

  const handleJump = (panelId: string) => {
    onClose();
    onJumpToPanel?.(panelId);
  };

  const renderContent = () => {
    switch (type) {
      case 'ready':
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-white text-sm">Brief Readiness</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-green-500/10 border border-green-500/30 rounded p-2 text-center">
                <div className="text-base font-bold text-green-400">{metrics.briefStats.complete}</div>
                <div className="text-green-300">Complete</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-center">
                <div className="text-base font-bold text-yellow-400">{metrics.briefStats.partial}</div>
                <div className="text-yellow-300">Partial</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded p-2 text-center">
                <div className="text-base font-bold text-red-400">{metrics.briefStats.empty}</div>
                <div className="text-red-300">Failed</div>
              </div>
            </div>
            {metrics.topicsNeedingBriefs.length > 0 && (
              <div className="text-xs text-gray-400">
                {metrics.topicsNeedingBriefs.length} topics need briefs
              </div>
            )}
            {onJumpToPanel && (
              <button onClick={() => handleJump('strategy-overview')} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                View full strategy details &darr;
              </button>
            )}
          </div>
        );
      case 'domain':
        return (
          <div className="space-y-2">
            <h4 className="font-semibold text-white text-sm">Domain Coverage</h4>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 text-sm text-blue-300">
              <strong>{metrics.domainCoverage}%</strong> coverage based on Knowledge Graph nodes vs topic count
            </div>
            {onJumpToPanel && (
              <button onClick={() => handleJump('semantic-authority')} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                View Semantic Authority Score &darr;
              </button>
            )}
          </div>
        );
      case 'eav':
        return (
          <div className="space-y-2">
            <h4 className="font-semibold text-white text-sm">Semantic Triples (EAV)</h4>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2 text-sm">
              <div className="flex justify-between text-purple-300">
                <span>Total EAVs:</span>
                <span className="font-bold">{metrics.totalEavs}</span>
              </div>
              <div className="flex justify-between text-purple-300 mt-1">
                <span>Avg per Topic:</span>
                <span className="font-bold">{metrics.eavDensity}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEditEavs && (
                <button
                  onClick={() => { onClose(); onEditEavs(); }}
                  className="flex-1 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                >
                  Manage Semantic Triples
                </button>
              )}
              {onJumpToPanel && (
                <button onClick={() => handleJump('semantic-authority')} className="text-xs text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap">
                  Full analysis &darr;
                </button>
              )}
            </div>
          </div>
        );
      case 'context':
        return (
          <div className="space-y-2">
            <h4 className="font-semibold text-white text-sm">Internal Linking Context</h4>
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded p-2 text-sm text-cyan-300">
              <strong>{metrics.contextCoverage}%</strong> of briefs have internal links
            </div>
            {metrics.topicsWithoutContext.length > 0 && (
              <div className="text-xs text-gray-400">
                {metrics.topicsWithoutContext.length} briefs missing context
              </div>
            )}
            {onJumpToPanel && (
              <button onClick={() => handleJump('bridging-opportunities')} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                View Bridging Opportunities &darr;
              </button>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl max-w-md">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">{renderContent()}</div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-lg leading-none ml-3"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default CompactMetricsStrip;
