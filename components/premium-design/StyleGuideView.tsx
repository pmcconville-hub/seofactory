// =============================================================================
// StyleGuideView — Main review UI for extracted style guide elements
// =============================================================================

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StyleGuide, StyleGuideCategory, StyleGuideElement, StyleGuideColor, BrandOverview, SavedStyleGuide } from '../../types/styleGuide';
import { StyleGuideElementCard } from './StyleGuideElementCard';
import { ColorPaletteView } from './ColorPaletteView';
import { WCAGContrastPanel } from './WCAGContrastPanel';
import { StyleGuideVersionPanel } from './StyleGuideVersionPanel';
import { StyleGuideDiffView } from './StyleGuideDiffView';
import { auditStyleGuideContrast, autoFixContrastIssues } from '../../services/design-analysis/WCAGContrastService';
import type { WCAGAuditResult } from '../../services/design-analysis/WCAGContrastService';
import { diffStyleGuides } from '../../services/design-analysis/styleGuideDiff';
import type { StyleGuideDiff } from '../../services/design-analysis/styleGuideDiff';

// =============================================================================
// Types
// =============================================================================

interface StyleGuideViewProps {
  styleGuide: StyleGuide;
  onApprove: (guide: StyleGuide) => void;
  onReextract: () => void;
  onExport: () => void;
  onRefineElement?: (elementId: string, commentOverride?: string) => void;
  refiningElementId?: string | null;
  onChange?: (guide: StyleGuide) => void;
  onUndoRefinement?: (elementId: string) => void;
  supabase?: SupabaseClient;
  userId?: string;
}

type TabKey = StyleGuideCategory | 'all' | 'accessibility';

const CATEGORY_TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'typography', label: 'Typography' },
  { key: 'buttons', label: 'Buttons' },
  { key: 'cards', label: 'Cards' },
  { key: 'navigation', label: 'Nav' },
  { key: 'accordions', label: 'Acc.' },
  { key: 'backgrounds', label: 'Bg' },
  { key: 'section-breaks', label: 'Div.' },
  { key: 'images', label: 'Img' },
  { key: 'tables', label: 'Tbl' },
  { key: 'forms', label: 'Forms' },
  { key: 'colors', label: 'Colors' },
  { key: 'accessibility', label: 'A11y' },
];

// =============================================================================
// Brand Overview Sub-component
// =============================================================================

const COLOR_MOOD_LABELS: Record<string, { label: string; color: string }> = {
  warm: { label: 'Warm', color: 'bg-orange-500/20 text-orange-400' },
  cool: { label: 'Cool', color: 'bg-blue-500/20 text-blue-400' },
  neutral: { label: 'Neutral', color: 'bg-zinc-500/20 text-zinc-400' },
  mixed: { label: 'Mixed', color: 'bg-purple-500/20 text-purple-400' },
};

const BrandOverviewSection: React.FC<{ overview: BrandOverview }> = ({ overview }) => {
  const [showSections, setShowSections] = useState(false);
  const moodInfo = COLOR_MOOD_LABELS[overview.colorMood] || COLOR_MOOD_LABELS.neutral;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Brand Overview</h4>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${moodInfo.color}`}>
          {moodInfo.label} palette
        </span>
      </div>

      {/* Personality traits */}
      <div className="flex flex-wrap gap-1.5">
        {overview.brandPersonality.split(/,\s*/).map((trait, i) => (
          <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-700/60 text-zinc-300">
            {trait.trim()}
          </span>
        ))}
      </div>

      {/* Overall feel */}
      {overview.overallFeel && (
        <p className="text-xs text-zinc-400 leading-relaxed">{overview.overallFeel}</p>
      )}

      {/* Hero description */}
      {overview.heroDescription && (
        <div className="text-xs text-zinc-500">
          <span className="text-zinc-400 font-medium">Hero: </span>
          {overview.heroDescription}
        </div>
      )}

      {/* Page sections (expandable) */}
      {overview.pageSections.length > 0 && (
        <div>
          <button
            onClick={() => setShowSections(!showSections)}
            className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
          >
            {showSections ? 'Hide' : 'Show'} {overview.pageSections.length} page section{overview.pageSections.length !== 1 ? 's' : ''}
          </button>
          {showSections && (
            <div className="mt-1.5 space-y-1">
              {overview.pageSections.map((section, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] px-2 py-1 rounded bg-zinc-900/50">
                  <span className="text-zinc-300 font-medium shrink-0">{section.name}</span>
                  <span className="text-zinc-500">{section.description}</span>
                  {section.layoutPattern && (
                    <span className="text-zinc-600 shrink-0 ml-auto">{section.layoutPattern}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Component
// =============================================================================

export const StyleGuideView: React.FC<StyleGuideViewProps> = ({
  styleGuide,
  onApprove,
  onReextract,
  onExport,
  onRefineElement,
  refiningElementId,
  onChange,
  onUndoRefinement,
  supabase,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [guide, setGuide] = useState<StyleGuide>(styleGuide);
  const [showVersions, setShowVersions] = useState(false);
  const [diffResult, setDiffResult] = useState<StyleGuideDiff | null>(null);

  // Sync local state when parent styleGuide prop changes (e.g. after AI refinement)
  useEffect(() => {
    setGuide(styleGuide);
  }, [styleGuide]);

  const isRefining = !!refiningElementId;

  // Update local state and notify parent
  const updateGuide = useCallback((updated: StyleGuide) => {
    setGuide(updated);
    onChange?.(updated);
  }, [onChange]);

  // Filter elements by category
  const filteredElements = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'colors' || activeTab === 'accessibility') return guide.elements;
    return guide.elements.filter(el => el.category === activeTab);
  }, [guide.elements, activeTab]);

  // Count elements per category (for tab badges)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: guide.elements.length };
    for (const el of guide.elements) {
      counts[el.category] = (counts[el.category] || 0) + 1;
    }
    counts['colors'] = guide.colors.length;
    return counts;
  }, [guide.elements, guide.colors]);

  // Count issues per category (for issue dots on tabs)
  const categoryIssueCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const el of guide.elements) {
      const hasIssue = (el.visualIssues && el.visualIssues.length > 0) ||
        (el.qualityScore !== undefined && el.qualityScore < 60);
      if (hasIssue) {
        counts[el.category] = (counts[el.category] || 0) + 1;
        counts['all'] = (counts['all'] || 0) + 1;
      }
    }
    return counts;
  }, [guide.elements]);

  // Quality summary stats
  const qualityStats = useMemo(() => {
    const scored = guide.elements.filter(e => e.qualityScore !== undefined);
    const avgScore = scored.length > 0
      ? Math.round(scored.reduce((sum, e) => sum + (e.qualityScore || 0), 0) / scored.length)
      : null;
    const issueCount = guide.elements.filter(e =>
      (e.visualIssues && e.visualIssues.length > 0) ||
      (e.qualityScore !== undefined && e.qualityScore < 60)
    ).length;
    const aiGeneratedCount = guide.elements.filter(e => e.aiGenerated).length;
    return { avgScore, issueCount, aiGeneratedCount, scoredCount: scored.length };
  }, [guide.elements]);

  // Approval stats
  const approvedCount = guide.elements.filter(e => e.approvalStatus === 'approved').length;
  const rejectedCount = guide.elements.filter(e => e.approvalStatus === 'rejected').length;
  const totalCount = guide.elements.length;

  // Element approval handlers
  const handleElementApprove = useCallback((id: string) => {
    const updated = {
      ...guide,
      elements: guide.elements.map(el =>
        el.id === id ? { ...el, approvalStatus: 'approved' as const } : el
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide]);

  const handleElementReject = useCallback((id: string) => {
    const updated = {
      ...guide,
      elements: guide.elements.map(el =>
        el.id === id ? { ...el, approvalStatus: 'rejected' as const } : el
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide]);

  const handleElementComment = useCallback((id: string, comment: string) => {
    const updated = {
      ...guide,
      elements: guide.elements.map(el =>
        el.id === id ? { ...el, userComment: comment } : el
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide]);

  const handleReferenceImage = useCallback((id: string, base64: string) => {
    const updated = {
      ...guide,
      elements: guide.elements.map(el =>
        el.id === id ? { ...el, referenceImageBase64: base64 } : el
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide]);

  const handleReferenceUrl = useCallback((id: string, url: string) => {
    const updated = {
      ...guide,
      elements: guide.elements.map(el =>
        el.id === id ? { ...el, referenceUrl: url } : el
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide]);

  // AI Redo handler — passes comment directly to avoid stale-closure race condition
  const handleAiRedo = useCallback((id: string) => {
    const el = guide.elements.find(e => e.id === id);
    if (!el) return;

    const issues = el.visualIssues?.join(', ') || 'low quality score';
    const redoComment = `AUTO-REDO: Fix visual issues — ${issues}. Regenerate HTML to match the original screenshot more accurately.`;

    // Update guide state with the comment for persistence
    const updated = {
      ...guide,
      elements: guide.elements.map(e =>
        e.id === id ? { ...e, userComment: redoComment } : e
      ),
    };
    updateGuide(updated);
    // Pass comment directly — don't rely on state being committed yet
    onRefineElement?.(id, redoComment);
  }, [guide, updateGuide, onRefineElement]);

  // Bulk approve all elements in current category
  const handleBulkApprove = useCallback(() => {
    if (activeTab === 'all' || activeTab === 'colors') return;
    const updated = {
      ...guide,
      elements: guide.elements.map(el =>
        el.category === activeTab ? { ...el, approvalStatus: 'approved' as const } : el
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide, activeTab]);

  // Bulk reject low quality elements in current category
  const handleBulkRejectLow = useCallback(() => {
    if (activeTab === 'all' || activeTab === 'colors') return;
    const updated = {
      ...guide,
      elements: guide.elements.map(el =>
        el.category === activeTab && el.qualityScore !== undefined && el.qualityScore < 40
          ? { ...el, approvalStatus: 'rejected' as const }
          : el
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide, activeTab]);

  // Color approval handlers
  const handleColorApprove = useCallback((hex: string) => {
    const updated = {
      ...guide,
      colors: guide.colors.map(c =>
        c.hex === hex ? { ...c, approvalStatus: 'approved' as const } : c
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide]);

  const handleColorReject = useCallback((hex: string) => {
    const updated = {
      ...guide,
      colors: guide.colors.map(c =>
        c.hex === hex ? { ...c, approvalStatus: 'rejected' as const } : c
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide]);

  // Approve all handler
  const handleApproveAll = useCallback(() => {
    const finalGuide: StyleGuide = {
      ...guide,
      isApproved: true,
      approvedAt: new Date().toISOString(),
    };
    onApprove(finalGuide);
  }, [guide, onApprove]);

  // Check if current tab has low-quality elements for bulk reject
  const hasLowQualityInTab = activeTab !== 'all' && activeTab !== 'colors' &&
    guide.elements.some(el => el.category === activeTab && el.qualityScore !== undefined && el.qualityScore < 40);

  // WCAG contrast audit
  const wcagAuditResult = useMemo<WCAGAuditResult>(() => {
    return auditStyleGuideContrast(guide.elements);
  }, [guide.elements]);

  // WCAG fix/undo handlers
  const handleWcagFixSingle = useCallback((elementId: string, fixedColor: string) => {
    const updated = {
      ...guide,
      elements: guide.elements.map(el =>
        el.id === elementId
          ? { ...el, computedCss: { ...el.computedCss, color: fixedColor } }
          : el
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide]);

  const handleWcagFixAll = useCallback(() => {
    const fixes = autoFixContrastIssues(wcagAuditResult.issues);
    const fixMap = new Map(fixes.map(f => [f.elementId, f.fixed]));
    const updated = {
      ...guide,
      elements: guide.elements.map(el =>
        fixMap.has(el.id)
          ? { ...el, computedCss: { ...el.computedCss, color: fixMap.get(el.id)! } }
          : el
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide, wcagAuditResult.issues]);

  const handleWcagUndoSingle = useCallback((elementId: string, originalColor: string) => {
    const updated = {
      ...guide,
      elements: guide.elements.map(el =>
        el.id === elementId
          ? { ...el, computedCss: { ...el.computedCss, color: originalColor } }
          : el
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide]);

  const handleWcagUndoAll = useCallback(() => {
    // Restore all original foreground colors from the issues
    const undoMap = new Map(
      wcagAuditResult.issues.map(i => [i.elementId, i.originalForeground])
    );
    const updated = {
      ...guide,
      elements: guide.elements.map(el =>
        undoMap.has(el.id)
          ? { ...el, computedCss: { ...el.computedCss, color: undoMap.get(el.id)! } }
          : el
      ),
    };
    updateGuide(updated);
  }, [guide, updateGuide, wcagAuditResult.issues]);

  // Version panel handlers
  const handleSelectVersion = useCallback((saved: SavedStyleGuide) => {
    setGuide(saved.style_guide);
    onChange?.(saved.style_guide);
    setShowVersions(false);
    setDiffResult(null);
  }, [onChange]);

  const handleCompareVersions = useCallback((oldSaved: SavedStyleGuide, newSaved: SavedStyleGuide) => {
    const diff = diffStyleGuides(oldSaved.style_guide, newSaved.style_guide);
    setDiffResult(diff);
    setShowVersions(false);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3 border-b border-zinc-800">
        <div>
          <h3 className="text-sm font-medium text-zinc-200">
            Style Guide for {guide.hostname}
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {guide.elementCount} elements extracted &middot; {guide.colors.length} colors detected
            &middot; {Math.round(guide.extractionDurationMs / 1000)}s
          </p>
        </div>
        <div className="flex items-center gap-2">
          {guide.version > 0 && supabase && userId && (
            <button
              onClick={() => { setShowVersions(!showVersions); setDiffResult(null); }}
              className={`px-2 py-1 text-[11px] rounded transition-colors ${
                showVersions
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  : 'bg-zinc-700/50 hover:bg-zinc-700 text-zinc-400'
              }`}
            >
              v{guide.version} {showVersions ? '\u25B2' : '\u25BC'}
            </button>
          )}
          <button
            onClick={onReextract}
            className="px-2.5 py-1 text-[11px] bg-zinc-700/50 hover:bg-zinc-700 text-zinc-400 rounded transition-colors"
            disabled={isRefining}
          >
            Re-extract
          </button>
          <button
            onClick={onExport}
            className="px-2.5 py-1 text-[11px] bg-zinc-700/50 hover:bg-zinc-700 text-zinc-400 rounded transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 overflow-x-auto py-2 border-b border-zinc-800">
        {CATEGORY_TABS.map(tab => {
          const count = tab.key === 'accessibility'
            ? wcagAuditResult.issues.length
            : (categoryCounts[tab.key] || 0);
          if (count === 0 && tab.key !== 'all' && tab.key !== 'accessibility') return null;
          const isActive = activeTab === tab.key;
          const issueCount = tab.key === 'accessibility'
            ? wcagAuditResult.issues.filter(i => i.level === 'AA').length
            : (categoryIssueCounts[tab.key] || 0);
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-2.5 py-1 text-[11px] rounded whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1 text-[10px] opacity-60">{count}</span>
              )}
              {issueCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Version panel (collapsible) */}
      {showVersions && supabase && userId && (
        <div className="py-2 px-1 border-b border-zinc-800">
          <StyleGuideVersionPanel
            supabase={supabase}
            userId={userId}
            hostname={guide.hostname}
            currentVersion={guide.version}
            onSelectVersion={handleSelectVersion}
            onCompareVersions={handleCompareVersions}
          />
        </div>
      )}

      {/* Diff view (shown after comparing versions) */}
      {diffResult && (
        <div className="py-2 px-1 border-b border-zinc-800">
          <StyleGuideDiffView
            diff={diffResult}
            onClose={() => setDiffResult(null)}
          />
        </div>
      )}

      {/* Quality summary bar */}
      {qualityStats.scoredCount > 0 && (
        <div className="flex items-center gap-3 px-2 py-1.5 border-b border-zinc-800 text-[11px]">
          <span className={`font-medium ${
            qualityStats.avgScore !== null && qualityStats.avgScore >= 70 ? 'text-green-400' :
            qualityStats.avgScore !== null && qualityStats.avgScore >= 40 ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            Avg: {qualityStats.avgScore}%
          </span>
          {qualityStats.issueCount > 0 && (
            <span className="text-amber-400">
              {qualityStats.issueCount} with issues
            </span>
          )}
          {qualityStats.aiGeneratedCount > 0 && (
            <span className="text-purple-400">
              {qualityStats.aiGeneratedCount} AI-generated
            </span>
          )}
          {refiningElementId && (
            <span className="text-purple-300 animate-pulse">
              Refining element...
            </span>
          )}
          {qualityStats.issueCount > 0 && onRefineElement && (
            <button
              onClick={() => {
                const lowQuality = guide.elements.filter(
                  e => (e.qualityScore !== undefined && e.qualityScore < 60) ||
                       (e.visualIssues && e.visualIssues.length > 0)
                );
                lowQuality.forEach((el, i) => {
                  const issues = el.visualIssues?.join(', ') || 'low quality score';
                  const comment = `AUTO-REFINE: Fix visual issues — ${issues}. Improve element to match brand style.`;
                  setTimeout(() => onRefineElement(el.id, comment), i * 2000);
                });
              }}
              disabled={!!refiningElementId}
              className="px-2 py-0.5 text-[10px] rounded bg-purple-600/15 text-purple-400 hover:bg-purple-600/25 transition-colors disabled:opacity-50"
            >
              Auto-refine {qualityStats.issueCount} with issues
            </button>
          )}

          {/* Bulk actions for specific category tabs */}
          {activeTab !== 'all' && activeTab !== 'colors' && (
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={handleBulkApprove}
                className="px-2 py-0.5 text-[10px] rounded bg-green-600/15 text-green-400 hover:bg-green-600/25 transition-colors"
              >
                Approve all {CATEGORY_TABS.find(t => t.key === activeTab)?.label}
              </button>
              {hasLowQualityInTab && (
                <button
                  onClick={handleBulkRejectLow}
                  className="px-2 py-0.5 text-[10px] rounded bg-red-600/15 text-red-400 hover:bg-red-600/25 transition-colors"
                >
                  Reject low quality
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3">
        {/* Brand Overview — shown at top of "All" tab */}
        {activeTab === 'all' && guide.brandOverview && (
          <BrandOverviewSection overview={guide.brandOverview} />
        )}
        {activeTab === 'accessibility' ? (
          <WCAGContrastPanel
            auditResult={wcagAuditResult}
            onFixSingle={handleWcagFixSingle}
            onFixAll={handleWcagFixAll}
            onUndoSingle={handleWcagUndoSingle}
            onUndoAll={handleWcagUndoAll}
          />
        ) : activeTab === 'colors' ? (
          <ColorPaletteView
            colors={guide.colors}
            onApprove={handleColorApprove}
            onReject={handleColorReject}
          />
        ) : (
          filteredElements.length > 0 ? (
            filteredElements.map(element => (
              <StyleGuideElementCard
                key={element.id}
                element={element}
                onApprove={handleElementApprove}
                onReject={handleElementReject}
                onComment={handleElementComment}
                onRefine={onRefineElement}
                onReferenceImage={handleReferenceImage}
                onReferenceUrl={handleReferenceUrl}
                onAiRedo={handleAiRedo}
                onUndo={onUndoRefinement}
                isRefining={refiningElementId === element.id}
                googleFontsUrls={guide.googleFontsUrls}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-zinc-500">No elements in this category</p>
            </div>
          )
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
        <p className="text-[11px] text-zinc-500">
          {approvedCount}/{totalCount} approved
          {rejectedCount > 0 && <span> &middot; {rejectedCount} rejected</span>}
        </p>
        <button
          onClick={handleApproveAll}
          disabled={isRefining}
          className="px-4 py-2 text-xs bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-lg transition-colors"
        >
          {isRefining ? 'Refining...' : 'Approve & Export Style Guide'}
        </button>
      </div>
    </div>
  );
};

export default StyleGuideView;
