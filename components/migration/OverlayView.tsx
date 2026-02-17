import React, { useState, useMemo } from 'react';
import type {
  OverlayNode,
  OverlayStatusColor,
  OverlayStatus,
  OverlayMatchedPage,
} from '../../services/migration/overlayService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

// ── Props ────────────────────────────────────────────────────────────────────

interface OverlayViewProps {
  nodes: OverlayNode[];
  onSelectNode?: (node: OverlayNode) => void;
  onOpenWorkbench?: (inventoryId: string) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<OverlayStatusColor, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  gray: 'bg-gray-500',
};

const STATUS_RING_COLORS: Record<OverlayStatusColor, string> = {
  green: 'ring-green-500/40',
  yellow: 'ring-yellow-500/40',
  red: 'ring-red-500/40',
  orange: 'ring-orange-500/40',
  gray: 'ring-gray-500/40',
};

const STATUS_LABELS: Record<OverlayStatus, string> = {
  covered_aligned: 'Aligned',
  covered_needs_work: 'Needs Work',
  gap: 'Content Gap',
  orphan: 'Orphan Page',
  cannibalization: 'Cannibalization',
};

const STATUS_DESCRIPTIONS: Record<OverlayStatus, string> = {
  covered_aligned: 'This topic has well-aligned existing content.',
  covered_needs_work:
    'Content exists but needs optimization to better align with the topic.',
  gap: 'No content exists for this topic yet. Consider creating new content.',
  orphan: 'This page is not mapped to any topic in the topical map.',
  cannibalization:
    'Multiple pages compete for this same topic. Consolidate to strengthen ranking.',
};

type FilterKey = 'all' | OverlayStatusColor;

const FILTER_CHIPS: { key: FilterKey; label: string; dot?: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'green', label: 'Aligned', dot: 'bg-green-500' },
  { key: 'yellow', label: 'Needs Work', dot: 'bg-yellow-500' },
  { key: 'red', label: 'Gaps', dot: 'bg-red-500' },
  { key: 'orange', label: 'Cannibalization', dot: 'bg-orange-500' },
  { key: 'gray', label: 'Orphans', dot: 'bg-gray-500' },
];

// ── Component ────────────────────────────────────────────────────────────────

export const OverlayView: React.FC<OverlayViewProps> = ({
  nodes,
  onSelectNode,
  onOpenWorkbench,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  // Summary counts by color
  const summaryCounts = useMemo(() => {
    const counts: Record<OverlayStatusColor, number> = {
      green: 0,
      yellow: 0,
      red: 0,
      orange: 0,
      gray: 0,
    };
    for (const node of nodes) {
      counts[node.statusColor]++;
    }
    return counts;
  }, [nodes]);

  // Filtered node list
  const filteredNodes = useMemo(() => {
    if (activeFilter === 'all') return nodes;
    return nodes.filter((n) => n.statusColor === activeFilter);
  }, [nodes, activeFilter]);

  // Currently selected node
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  const handleSelectNode = (node: OverlayNode) => {
    setSelectedNodeId(node.id);
    onSelectNode?.(node);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Summary bar */}
      <div className="flex items-center gap-4 flex-wrap bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">
          Overlay
        </span>
        {(Object.keys(summaryCounts) as OverlayStatusColor[]).map((color) => (
          <span key={color} className="flex items-center gap-1.5 text-sm">
            <span
              className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[color]}`}
            />
            <span className="text-white font-bold">{summaryCounts[color]}</span>
          </span>
        ))}
        <span className="text-xs text-gray-500 ml-auto">
          {nodes.length} total
        </span>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilter === chip.key;
          const count =
            chip.key === 'all'
              ? nodes.length
              : summaryCounts[chip.key as OverlayStatusColor];
          return (
            <button
              key={chip.key}
              onClick={() => setActiveFilter(chip.key)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                transition-colors border
                ${
                  isActive
                    ? 'bg-gray-700 border-gray-500 text-white'
                    : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }
              `}
            >
              {chip.dot && (
                <span className={`w-2 h-2 rounded-full ${chip.dot}`} />
              )}
              {chip.label}
              <span className="text-gray-500 ml-0.5">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Main grid: topic list + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Topic list (left, 1 col) */}
        <div className="lg:col-span-1 overflow-y-auto pr-1 space-y-1 max-h-[60vh] lg:max-h-full">
          {filteredNodes.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              No topics match this filter.
            </div>
          ) : (
            filteredNodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              return (
                <button
                  key={node.id}
                  onClick={() => handleSelectNode(node)}
                  className={`
                    w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3
                    transition-colors border
                    ${
                      isSelected
                        ? `bg-gray-800 border-gray-600 ring-2 ${STATUS_RING_COLORS[node.statusColor]}`
                        : 'bg-gray-800/30 border-transparent hover:bg-gray-800/60 hover:border-gray-700'
                    }
                  `}
                >
                  {/* Status dot */}
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[node.statusColor]}`}
                  />

                  {/* Title */}
                  <span className="flex-1 text-sm text-gray-200 truncate">
                    {node.title}
                  </span>

                  {/* Page count badge */}
                  {node.matchedPages.length > 0 && (
                    <span className="flex-shrink-0 bg-gray-700 text-gray-300 text-[10px] font-mono px-1.5 py-0.5 rounded">
                      {node.matchedPages.length}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Detail panel (right, 2 cols) */}
        <div className="lg:col-span-2">
          {selectedNode ? (
            <DetailPanel
              node={selectedNode}
              onOpenWorkbench={onOpenWorkbench}
            />
          ) : (
            <Card className="h-full flex items-center justify-center p-8">
              <p className="text-gray-500 text-sm text-center">
                Select a topic from the list to view details.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Detail Panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  node: OverlayNode;
  onOpenWorkbench?: (inventoryId: string) => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ node, onOpenWorkbench }) => {
  const statusLabel = STATUS_LABELS[node.status];
  const statusDescription = STATUS_DESCRIPTIONS[node.status];
  const dotClass = STATUS_COLORS[node.statusColor];

  return (
    <Card className="p-5 h-full overflow-y-auto">
      {/* Header with status */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`w-3 h-3 rounded-full ${dotClass}`} />
          <span className="text-sm font-bold text-white uppercase tracking-wide">
            {statusLabel}
          </span>
          {node.alignmentScore != null && (
            <span className="ml-auto text-xs text-gray-400 font-mono">
              Alignment: {node.alignmentScore}%
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">{node.title}</h3>
        <p className="text-sm text-gray-400">{statusDescription}</p>
        <span className="inline-block mt-2 text-[10px] uppercase tracking-wider text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
          {node.type}
        </span>
      </div>

      {/* Status-specific content */}
      {node.status === 'gap' && <GapContent />}
      {node.status === 'cannibalization' && (
        <CannibalizationContent
          pages={node.matchedPages}
          onOpenWorkbench={onOpenWorkbench}
        />
      )}
      {(node.status === 'covered_aligned' ||
        node.status === 'covered_needs_work' ||
        node.status === 'orphan') && (
        <MatchedPagesContent
          pages={node.matchedPages}
          onOpenWorkbench={onOpenWorkbench}
        />
      )}
    </Card>
  );
};

// ── Gap Content ──────────────────────────────────────────────────────────────

const GapContent: React.FC = () => (
  <div className="bg-red-900/10 border border-red-800/30 rounded-lg p-4 text-center">
    <div className="text-red-400 text-sm font-medium mb-2">
      No existing content covers this topic
    </div>
    <p className="text-xs text-gray-500 mb-4">
      Creating dedicated content for this topic will help establish topical
      authority and fill the gap in your site coverage.
    </p>
    <Button variant="outline" size="sm" disabled>
      Create Content (coming soon)
    </Button>
  </div>
);

// ── Cannibalization Content ──────────────────────────────────────────────────

interface CannibalizationContentProps {
  pages: OverlayMatchedPage[];
  onOpenWorkbench?: (inventoryId: string) => void;
}

const CannibalizationContent: React.FC<CannibalizationContentProps> = ({
  pages,
  onOpenWorkbench,
}) => (
  <div>
    <div className="bg-orange-900/10 border border-orange-800/30 rounded-lg p-3 mb-4">
      <p className="text-xs text-orange-300">
        {pages.length} pages are competing for this topic. Consider
        consolidating them to concentrate ranking signals.
      </p>
    </div>
    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
      Competing Pages
    </div>
    <div className="space-y-2">
      {pages.map((page) => (
        <PageRow
          key={page.inventoryId}
          page={page}
          onOpenWorkbench={onOpenWorkbench}
        />
      ))}
    </div>
  </div>
);

// ── Matched Pages Content ────────────────────────────────────────────────────

interface MatchedPagesContentProps {
  pages: OverlayMatchedPage[];
  onOpenWorkbench?: (inventoryId: string) => void;
}

const MatchedPagesContent: React.FC<MatchedPagesContentProps> = ({
  pages,
  onOpenWorkbench,
}) => {
  if (pages.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Matched Pages
      </div>
      <div className="space-y-2">
        {pages.map((page) => (
          <PageRow
            key={page.inventoryId}
            page={page}
            onOpenWorkbench={onOpenWorkbench}
          />
        ))}
      </div>
    </div>
  );
};

// ── Page Row ─────────────────────────────────────────────────────────────────

interface PageRowProps {
  page: OverlayMatchedPage;
  onOpenWorkbench?: (inventoryId: string) => void;
}

const PageRow: React.FC<PageRowProps> = ({ page, onOpenWorkbench }) => {
  const alignColor =
    page.alignmentScore >= 70
      ? 'text-green-400'
      : page.alignmentScore >= 40
        ? 'text-yellow-400'
        : 'text-red-400';

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 flex items-center gap-3">
      {/* URL */}
      <div className="flex-1 min-w-0">
        <a
          href={page.url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 hover:underline text-xs font-mono truncate block"
          title={page.url}
        >
          {page.url}
        </a>
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-3 flex-shrink-0 text-[11px]">
        <span className={`font-mono font-bold ${alignColor}`}>
          {page.alignmentScore}%
        </span>
        <span className="text-gray-500" title="GSC Clicks">
          {page.gscClicks} clicks
        </span>
      </div>

      {/* Open in Workbench */}
      {onOpenWorkbench && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenWorkbench(page.inventoryId)}
          className="flex-shrink-0 text-xs px-2 py-1"
          title="Open in Workbench"
        >
          Workbench
        </Button>
      )}
    </div>
  );
};
