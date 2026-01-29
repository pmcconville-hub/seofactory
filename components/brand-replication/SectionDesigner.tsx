/**
 * Section Designer
 *
 * Displays Phase 3 design decisions for each article section.
 * Allows users to review AI decisions and override component/layout choices.
 *
 * @module components/brand-replication/SectionDesigner
 */

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import type {
  SectionDesignDecision,
  BrandComponent,
  ArticleSection,
} from '../../services/brand-replication/interfaces';

// ============================================================================
// Types
// ============================================================================

export interface SectionDesignerProps {
  /** Article sections */
  sections: ArticleSection[];
  /** Design decisions from Phase 3 */
  decisions: SectionDesignDecision[];
  /** Available components from Phase 2 */
  componentLibrary: BrandComponent[];
  /** Callback when decision is updated */
  onUpdateDecision?: (sectionId: string, changes: Partial<SectionDesignDecision>) => void;
  /** Callback when all decisions are accepted */
  onAcceptAll?: () => void;
  /** Currently selected section */
  selectedSectionId?: string;
  /** Callback when section is selected */
  onSelectSection?: (sectionId: string) => void;
  /** Loading state */
  isLoading?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const emphasisColors: Record<string, string> = {
  hero: 'text-yellow-400 bg-yellow-900/30',
  featured: 'text-blue-400 bg-blue-900/30',
  standard: 'text-zinc-300 bg-zinc-800',
  supporting: 'text-zinc-500 bg-zinc-800/50',
  minimal: 'text-zinc-600 bg-zinc-900/50',
};

const widthLabels: Record<string, string> = {
  narrow: 'Narrow (600px)',
  medium: 'Medium (800px)',
  wide: 'Wide (1000px)',
  full: 'Full Width',
};

const columnOptions = [1, 2, 3, 4] as const;
const widthOptions = ['narrow', 'medium', 'wide', 'full'] as const;
const emphasisOptions = ['hero', 'featured', 'standard', 'supporting', 'minimal'] as const;

// ============================================================================
// Component
// ============================================================================

export const SectionDesigner: React.FC<SectionDesignerProps> = ({
  sections,
  decisions,
  componentLibrary,
  onUpdateDecision,
  onAcceptAll,
  selectedSectionId,
  onSelectSection,
  isLoading = false,
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Map sections to their decisions
  const sectionDecisionPairs = sections.map(section => ({
    section,
    decision: decisions.find(d => d.sectionId === section.id),
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p>Analyzing sections...</p>
        </div>
      </div>
    );
  }

  if (sectionDecisionPairs.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <p className="text-lg mb-4">No sections to design</p>
        <p className="text-sm">Run Phase 3 Intelligence to analyze the article</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Section Layout ({sectionDecisionPairs.length} sections)
        </h3>
        {onAcceptAll && (
          <Button onClick={onAcceptAll} variant="primary" size="sm">
            Accept All Decisions
          </Button>
        )}
      </div>

      {/* Overall Strategy */}
      {decisions.length > 0 && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 text-sm text-blue-300">
          <span className="font-medium">Strategy: </span>
          Using {new Set(decisions.map(d => d.component)).size} component types
          with {decisions.filter(d => d.layout.emphasis === 'hero' || d.layout.emphasis === 'featured').length} emphasis sections
        </div>
      )}

      {/* Section List */}
      <div className="space-y-2">
        {sectionDecisionPairs.map(({ section, decision }, index) => (
          <SectionDecisionCard
            key={section.id}
            section={section}
            decision={decision}
            index={index}
            isSelected={selectedSectionId === section.id}
            isExpanded={expandedSection === section.id}
            componentLibrary={componentLibrary}
            onSelect={() => onSelectSection?.(section.id)}
            onToggleExpand={() => setExpandedSection(
              expandedSection === section.id ? null : section.id
            )}
            onUpdateDecision={(changes) => onUpdateDecision?.(section.id, changes)}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// SectionDecisionCard Sub-component
// ============================================================================

interface SectionDecisionCardProps {
  section: ArticleSection;
  decision?: SectionDesignDecision;
  index: number;
  isSelected: boolean;
  isExpanded: boolean;
  componentLibrary: BrandComponent[];
  onSelect: () => void;
  onToggleExpand: () => void;
  onUpdateDecision: (changes: Partial<SectionDesignDecision>) => void;
}

const SectionDecisionCard: React.FC<SectionDecisionCardProps> = ({
  section,
  decision,
  index,
  isSelected,
  isExpanded,
  componentLibrary,
  onSelect,
  onToggleExpand,
  onUpdateDecision,
}) => {
  const emphasisStyle = decision
    ? emphasisColors[decision.layout.emphasis] || emphasisColors.standard
    : emphasisColors.standard;

  return (
    <div
      onClick={onSelect}
      className={`
        border rounded-lg overflow-hidden transition-all cursor-pointer
        ${isSelected
          ? 'border-blue-500 ring-1 ring-blue-500/50'
          : 'border-zinc-700 hover:border-zinc-600'
        }
        bg-zinc-900/60
      `}
    >
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Section Number */}
          <span className="flex-shrink-0 w-6 h-6 rounded bg-zinc-800 text-zinc-400 text-xs flex items-center justify-center">
            {index + 1}
          </span>

          {/* Section Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-white text-sm truncate">
              {section.heading || `Section ${index + 1}`}
            </h4>

            {decision ? (
              <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                <span className={`px-1.5 py-0.5 rounded ${emphasisStyle}`}>
                  {decision.layout.emphasis}
                </span>
                <span className="text-zinc-600">&middot;</span>
                <span className="text-zinc-400">{decision.component}</span>
                <span className="text-zinc-600">&middot;</span>
                <span className="text-zinc-400">{decision.layout.columns} col</span>
                <span className="text-zinc-600">&middot;</span>
                <span className="text-zinc-400">{decision.layout.width}</span>
              </div>
            ) : (
              <span className="text-xs text-zinc-500 italic">No decision yet</span>
            )}
          </div>

          {/* Confidence */}
          {decision && (
            <span className="text-xs text-zinc-500">
              {Math.round(decision.confidence * 100)}% conf
            </span>
          )}
        </div>

        {/* Reasoning */}
        {decision?.reasoning && !isExpanded && (
          <p className="mt-2 text-xs text-zinc-500 italic line-clamp-1 ml-9">
            &ldquo;{decision.reasoning}&rdquo;
          </p>
        )}

        {/* Toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          className="mt-2 ml-9 text-xs text-blue-400 hover:text-blue-300"
        >
          {isExpanded ? 'Hide Details' : 'Edit Layout'}
        </button>
      </div>

      {/* Expanded Editor */}
      {isExpanded && decision && (
        <div className="border-t border-zinc-800 p-4 bg-zinc-950/50 space-y-4">
          {/* Reasoning */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">AI Reasoning</label>
            <p className="text-sm text-zinc-300 italic">&ldquo;{decision.reasoning}&rdquo;</p>
          </div>

          {/* Component Selector */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Component</label>
            <select
              value={decision.componentId}
              onChange={(e) => {
                const comp = componentLibrary.find(c => c.id === e.target.value);
                if (comp) {
                  onUpdateDecision({
                    componentId: comp.id,
                    component: comp.name,
                    reasoning: `Manual override: Selected ${comp.name}`,
                  });
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
            >
              {componentLibrary.map(comp => (
                <option key={comp.id} value={comp.id}>
                  {comp.name} - {comp.purpose}
                </option>
              ))}
              <option value="prose">Prose (Default)</option>
            </select>
          </div>

          {/* Layout Controls */}
          <div className="grid grid-cols-3 gap-3">
            {/* Columns */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Columns</label>
              <select
                value={decision.layout.columns}
                onChange={(e) => onUpdateDecision({
                  layout: { ...decision.layout, columns: Number(e.target.value) as 1|2|3|4 }
                })}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
              >
                {columnOptions.map(n => (
                  <option key={n} value={n}>{n} column{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>

            {/* Width */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Width</label>
              <select
                value={decision.layout.width}
                onChange={(e) => onUpdateDecision({
                  layout: { ...decision.layout, width: e.target.value as 'narrow' | 'medium' | 'wide' | 'full' }
                })}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
              >
                {widthOptions.map(w => (
                  <option key={w} value={w}>{widthLabels[w]}</option>
                ))}
              </select>
            </div>

            {/* Emphasis */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Emphasis</label>
              <select
                value={decision.layout.emphasis}
                onChange={(e) => onUpdateDecision({
                  layout: { ...decision.layout, emphasis: e.target.value as 'hero' | 'featured' | 'standard' | 'supporting' | 'minimal' }
                })}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
              >
                {emphasisOptions.map(e => (
                  <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Semantic Role */}
          <div className="text-xs text-zinc-500">
            Semantic Role: <span className="text-zinc-400">{decision.semanticRole}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionDesigner;
