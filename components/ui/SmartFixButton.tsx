import React, { useState } from 'react';
import { SemanticActionItem, BusinessInfo, SmartFixResult, SEOPillars } from '../../types';
import { generateSmartFix, generateStructuredFix } from '../../services/ai/semanticAnalysis';
import { SimpleMarkdown } from './SimpleMarkdown';
import { AppAction } from '../../state/appState';

interface SmartFixButtonProps {
  action: SemanticActionItem;
  pageContent: string;
  businessInfo: BusinessInfo;
  dispatch: React.Dispatch<AppAction>;
  pillars?: SEOPillars;
  onFixGenerated?: (fix: string) => void;
  onApplyFix?: (fix: SmartFixResult, actionId: string) => boolean | void;
  onStoreGeneratedFix?: (actionId: string, fix: SmartFixResult) => void;
  isAutoGenerating?: boolean;
}

export const SmartFixButton: React.FC<SmartFixButtonProps> = ({
  action,
  pageContent,
  businessInfo,
  dispatch,
  pillars,
  onFixGenerated,
  onApplyFix,
  onStoreGeneratedFix,
  isAutoGenerating
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const structuredFix = action.structuredFix;
  const hasReadyFix = !!structuredFix && !structuredFix.applied;
  const isApplied = !!structuredFix?.applied;

  const handleGenerateFix = async () => {
    setIsGenerating(true);
    setError(null);
    setApplyError(null);

    try {
      const fix = await generateStructuredFix(action, pageContent, businessInfo, dispatch, pillars);

      // Also generate legacy prose fix for backward compat
      if (onFixGenerated) {
        const proseFix = await generateSmartFix(action, pageContent, businessInfo, dispatch, pillars);
        onFixGenerated(proseFix);
      }

      // Store fix via state update (not direct prop mutation)
      if (onStoreGeneratedFix) {
        onStoreGeneratedFix(action.id, fix);
      } else {
        // Fallback: direct mutation for backward compat
        action.structuredFix = fix;
      }
      setIsExpanded(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate fix';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyFix = () => {
    if (structuredFix && onApplyFix) {
      setApplyError(null);
      const result = onApplyFix(structuredFix, action.id);
      // If applyFix returns false, the fix could not be applied (text not found)
      if (result === false) {
        setApplyError('Could not find target text in content. A previous fix may have modified it. Try regenerating this fix.');
      }
    }
  };

  const showGenerating = isGenerating || (isAutoGenerating && !structuredFix);

  // State 1: Generating
  if (showGenerating) {
    return (
      <div className="mt-3">
        <div className="flex items-center gap-2 text-purple-400 text-sm">
          <span className="animate-spin inline-block">&#9881;</span>
          <span>Generating fix...</span>
        </div>
      </div>
    );
  }

  // State 3: Applied
  if (isApplied) {
    return (
      <div className="mt-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Applied
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            {isExpanded ? 'Hide details' : 'Show details'}
          </button>
        </div>
        {isExpanded && structuredFix && (
          <div className="mt-2 p-3 bg-green-900/10 border border-green-500/20 rounded text-xs text-gray-300">
            <p className="text-green-400/80 mb-1">{structuredFix.explanation as string}</p>
          </div>
        )}
      </div>
    );
  }

  // State 2: Ready to Apply (has structuredFix)
  if (hasReadyFix && structuredFix) {
    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleApplyFix}
            className="bg-green-600/20 text-green-400 border border-green-500/30 px-3 py-1.5 rounded text-xs font-medium hover:bg-green-600/30 hover:border-green-500/50 transition-all duration-200 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Apply Fix
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5"
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {/* Compact before/after preview (always shown) */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded p-2 text-xs">
          <div className="flex gap-2 items-start">
            <span className="text-red-400/70 flex-shrink-0 mt-0.5">-</span>
            <span className="text-red-300/60 line-through break-words">{(structuredFix.searchText as string).substring(0, 120)}{(structuredFix.searchText as string).length > 120 ? '...' : ''}</span>
          </div>
          <div className="flex gap-2 items-start mt-1">
            <span className="text-green-400/70 flex-shrink-0 mt-0.5">+</span>
            <span className="text-green-300/80 break-words">{(structuredFix.replacementText as string).substring(0, 120)}{(structuredFix.replacementText as string).length > 120 ? '...' : ''}</span>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="p-3 bg-purple-900/10 border border-purple-500/20 rounded text-xs text-gray-300 space-y-2">
            <p className="text-purple-300/80">{structuredFix.explanation as string}</p>
            <div>
              <p className="text-gray-500 mb-1">Full replacement:</p>
              <pre className="bg-gray-900/50 p-2 rounded text-xs text-gray-300 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">{structuredFix.replacementText as string}</pre>
            </div>
          </div>
        )}

        {(error || applyError) && (
          <div className="p-2 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-xs">
            {applyError || error}
          </div>
        )}
      </div>
    );
  }

  // No fix yet — show generate button
  return (
    <div className="mt-3">
      <button
        onClick={handleGenerateFix}
        disabled={isGenerating}
        className="
          bg-purple-500/20 text-purple-400 border border-purple-500/30
          px-4 py-2 rounded-md text-sm font-medium
          hover:bg-purple-500/30 hover:border-purple-500/50
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          flex items-center gap-2
        "
      >
        <span>&#10024;</span>
        <span>Get Smart Fix</span>
      </button>

      {error && (
        <div className="mt-2 p-3 bg-red-900/20 border border-red-500/30 rounded-md text-red-400 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};
