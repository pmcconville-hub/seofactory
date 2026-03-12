// components/pipeline/PageInventoryView.tsx
import React, { useState } from 'react';
import type { PageInventory, PageInventoryEntry, EnrichedTopic } from '../../types';

interface PageInventoryViewProps {
  pageInventory: PageInventory;
  topics: EnrichedTopic[];
  onPromoteTopic?: (topicId: string) => void;
  onDemoteTopic?: (topicId: string) => void;
}

const URGENCY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  launch_critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Launch Critical' },
  wave_1: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Wave 1' },
  wave_2: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Wave 2' },
  wave_3: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Wave 3' },
  optional: { bg: 'bg-gray-50', text: 'text-gray-400', label: 'Optional' },
};

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
  return String(vol);
}

export const PageInventoryView: React.FC<PageInventoryViewProps> = ({
  pageInventory,
  topics,
  onPromoteTopic,
  onDemoteTopic,
}) => {
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());

  const toggleExpand = (pageId: string) => {
    setExpandedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {pageInventory.totalTopics} topics &rarr; {pageInventory.totalPages} pages
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({pageInventory.consolidationRatio}x consolidation)
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            pageInventory.researchMode === 'full_api'
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {pageInventory.researchMode === 'full_api' ? 'API Verified' : 'AI Estimated'}
          </span>
        </div>
        {pageInventory.skipped.length > 0 && (
          <span className="text-sm text-gray-400">
            {pageInventory.skipped.length} topics skipped
          </span>
        )}
      </div>

      {/* Page Cards */}
      <div className="grid gap-3">
        {pageInventory.pages.map((page) => {
          const isExpanded = expandedPages.has(page.pageTopicId);
          const urgency = URGENCY_COLORS[page.urgencyLabel] || URGENCY_COLORS.optional;
          const pageTopic = topics.find(t => t.id === page.pageTopicId);

          return (
            <div
              key={page.pageTopicId}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Page Header */}
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
                onClick={() => page.sections.length > 0 && toggleExpand(page.pageTopicId)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-medium text-gray-500 w-6 text-right">
                    #{page.priority}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {page.pageTitle}
                    </div>
                    {pageTopic?.extracted_keyword && (
                      <div className="text-xs text-gray-400 truncate">
                        {pageTopic.extracted_keyword}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Volume Badge */}
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded text-xs font-medium">
                    {formatVolume(page.totalEstimatedVolume)} vol
                  </span>
                  {/* Urgency Label */}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${urgency.bg} ${urgency.text}`}>
                    {urgency.label}
                  </span>
                  {/* Section count */}
                  {page.sections.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {page.sections.length} section{page.sections.length !== 1 ? 's' : ''}
                      <span className="ml-1">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Sections */}
              {isExpanded && page.sections.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 p-3">
                  <div className="space-y-1.5">
                    {page.sections.map((section) => (
                      <div
                        key={section.topicId}
                        className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-white dark:hover:bg-gray-800"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-gray-400 w-16 flex-shrink-0">
                            {section.role === 'h2_section' && 'H2'}
                            {section.role === 'h3_subsection' && 'H3'}
                            {section.role === 'faq_entry' && 'FAQ'}
                            {section.role === 'merged' && 'Merged'}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300 truncate">
                            {section.topicTitle}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {section.estimatedVolume > 0 && (
                            <span className="text-xs text-gray-400">
                              {formatVolume(section.estimatedVolume)}
                            </span>
                          )}
                          {onPromoteTopic && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onPromoteTopic(section.topicId); }}
                              className="text-xs text-blue-500 hover:text-blue-700"
                              title="Promote to standalone page"
                            >
                              &uarr; Promote
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PageInventoryView;
