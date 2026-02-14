import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/Button';
import { InfoTooltip } from './ui/InfoTooltip';

interface TopicToolbarProps {
  // Search
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchResultCount: number | null;
  totalTopicCount: number;

  // View mode
  viewMode: 'list' | 'table' | 'graph';
  onViewModeChange: (m: 'list' | 'table' | 'graph') => void;

  // Hierarchy mode
  hierarchyMode: 'seo' | 'business';
  onHierarchyModeChange: (m: 'seo' | 'business') => void;

  // Sort
  sortOption: string;
  onSortChange: (opt: string) => void;

  // Expand/Collapse
  onExpandAll: () => void;
  onCollapseAll: () => void;

  // Pipeline filter
  pipelineFilter: string;
  onPipelineFilterChange: (f: string) => void;
  pipelineFilterCounts: Record<string, number>;

  // "More" dropdown actions (all optional)
  onRepairSectionLabels?: () => void;
  isRepairingLabels?: boolean;
  onRepairFoundationPages?: () => void;
  isRepairingFoundation?: boolean;
  onOpenNavigation?: () => void;
  onGenerateReport?: () => void;
  onShowUsageReport?: () => void;

  hasTopics: boolean;
}

export const TopicToolbar: React.FC<TopicToolbarProps> = ({
  searchQuery,
  onSearchChange,
  searchResultCount,
  totalTopicCount,
  viewMode,
  onViewModeChange,
  hierarchyMode,
  onHierarchyModeChange,
  sortOption,
  onSortChange,
  onExpandAll,
  onCollapseAll,
  pipelineFilter,
  onPipelineFilterChange,
  pipelineFilterCounts,
  onRepairSectionLabels,
  isRepairingLabels,
  onRepairFoundationPages,
  isRepairingFoundation,
  onOpenNavigation,
  onGenerateReport,
  onShowUsageReport,
  hasTopics,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close "More" dropdown on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  const hasMoreActions = !!(onRepairSectionLabels || onRepairFoundationPages || onOpenNavigation || onGenerateReport || onShowUsageReport);

  const pipelineChips: { key: string; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'needs-brief', label: 'Needs Brief' },
    { key: 'needs-draft', label: 'Needs Draft' },
    { key: 'needs-audit', label: 'Needs Audit' },
  ];

  return (
    <div className="space-y-3">
      {/* Row 1: Title, Search, View toggles */}
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="text-2xl font-bold text-white shrink-0">Topical Map</h2>

        {/* Search input */}
        {hasTopics && (
          <div className="relative flex-1 max-w-xs min-w-[180px]">
            {/* Magnifying glass icon */}
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search topics..."
              className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg pl-8 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            />
            {/* Clear button */}
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {/* Result count */}
            {searchResultCount !== null && (
              <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 whitespace-nowrap">
                {searchResultCount} of {totalTopicCount}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Hierarchy Mode Toggle (only in card/list view) */}
          {viewMode === 'list' && (
            <div className="flex rounded-lg bg-gray-700 p-1" role="tablist" aria-label="Hierarchy mode" title="SEO View shows behavioral hierarchy (affects SEO). Business View shows visual groupings (for presentations).">
              <Button
                onClick={() => onHierarchyModeChange('seo')}
                variant={hierarchyMode === 'seo' ? 'primary' : 'secondary'}
                className="!py-1 !px-3 text-sm"
                role="tab"
                aria-selected={hierarchyMode === 'seo'}
              >
                SEO View
              </Button>
              <Button
                onClick={() => onHierarchyModeChange('business')}
                variant={hierarchyMode === 'business' ? 'primary' : 'secondary'}
                className="!py-1 !px-3 text-sm"
                role="tab"
                aria-selected={hierarchyMode === 'business'}
              >
                Business View
              </Button>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="flex rounded-lg bg-gray-700 p-1" role="tablist" aria-label="View mode">
            <Button onClick={() => onViewModeChange('list')} variant={viewMode === 'list' ? 'primary' : 'secondary'} className="!py-1 !px-3 text-sm" role="tab" aria-selected={viewMode === 'list'} aria-controls="topic-view-panel">Cards</Button>
            <Button onClick={() => onViewModeChange('table')} variant={viewMode === 'table' ? 'primary' : 'secondary'} className="!py-1 !px-3 text-sm" role="tab" aria-selected={viewMode === 'table'} aria-controls="topic-view-panel">Table</Button>
            <Button onClick={() => onViewModeChange('graph')} variant={viewMode === 'graph' ? 'primary' : 'secondary'} className="!py-1 !px-3 text-sm" role="tab" aria-selected={viewMode === 'graph'} aria-controls="topic-view-panel">Graph</Button>
          </div>
        </div>
      </div>

      {/* Row 2: Pipeline filters, Sort, Expand/Collapse, More */}
      {hasTopics && (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Pipeline Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="Pipeline filter">
            {pipelineChips.map(chip => (
              <button
                key={chip.key}
                role="tab"
                aria-selected={pipelineFilter === chip.key}
                onClick={() => onPipelineFilterChange(chip.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  pipelineFilter === chip.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {chip.label} ({pipelineFilterCounts[chip.key] ?? 0})
              </button>
            ))}
          </div>

          {/* Separator */}
          {(viewMode === 'list' || viewMode === 'table') && (
            <span className="text-gray-700 hidden sm:inline">|</span>
          )}

          {/* Sort + Expand/Collapse (only for list/table view) */}
          {(viewMode === 'list' || viewMode === 'table') && (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={sortOption}
                onChange={(e) => onSortChange(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-gray-200 text-xs rounded py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="created_desc">Newest first</option>
                <option value="created_asc">Oldest first</option>
                <option value="title_asc">Title A-Z</option>
                <option value="title_desc">Title Z-A</option>
                <option value="updated_desc">Recently updated</option>
                <option value="updated_asc">Least recently updated</option>
              </select>
              <Button onClick={onExpandAll} variant="secondary" className="!py-1 !px-3 text-xs">Expand All</Button>
              <Button onClick={onCollapseAll} variant="secondary" className="!py-1 !px-3 text-xs">Collapse All</Button>
            </div>
          )}

          {/* More dropdown */}
          {hasMoreActions && (viewMode === 'list' || viewMode === 'table') && (
            <div ref={moreRef} className="relative">
              <Button
                onClick={() => setMoreOpen(prev => !prev)}
                variant="secondary"
                className="!py-1 !px-3 text-xs"
              >
                More {moreOpen ? '\u25B4' : '\u25BE'}
              </Button>
              {moreOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-30 py-1">
                  {onRepairSectionLabels && (
                    <button
                      onClick={() => { onRepairSectionLabels(); setMoreOpen(false); }}
                      disabled={isRepairingLabels}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <span>{isRepairingLabels ? 'Classifying...' : 'Repair Section Labels'}</span>
                        <InfoTooltip text="Uses AI to classify topics into Core Section (monetization/service pages) or Author Section (informational/trust pages). Also verifies and fixes topic type misclassifications." />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">AI-classify Core vs Author sections</p>
                    </button>
                  )}
                  {onRepairFoundationPages && (
                    <button
                      onClick={() => { onRepairFoundationPages(); setMoreOpen(false); }}
                      disabled={isRepairingFoundation}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>{isRepairingFoundation ? 'Generating...' : 'Foundation Pages'}</span>
                      <p className="text-xs text-gray-500 mt-0.5">Generate Homepage, About, Contact, Privacy, Terms</p>
                    </button>
                  )}
                  {onOpenNavigation && (
                    <button
                      onClick={() => { onOpenNavigation(); setMoreOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      Navigation
                      <p className="text-xs text-gray-500 mt-0.5">Edit website navigation structure</p>
                    </button>
                  )}
                  {onGenerateReport && (
                    <button
                      onClick={() => { onGenerateReport(); setMoreOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      Generate Report
                      <p className="text-xs text-gray-500 mt-0.5">Export topical map report</p>
                    </button>
                  )}
                  {onShowUsageReport && (
                    <button
                      onClick={() => { onShowUsageReport(); setMoreOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      AI Usage
                      <p className="text-xs text-gray-500 mt-0.5">View AI API usage and costs</p>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TopicToolbar;
