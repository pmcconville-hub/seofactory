// components/contextualEditor/InlineDiff.tsx
/**
 * Inline diff display showing old text (strikethrough) and new text (highlighted).
 */

import React from 'react';
import { RewriteResult } from '../../types/contextualEditor';

interface InlineDiffProps {
  result: RewriteResult;
  onAccept: () => void;
  onReject: () => void;
  onRetry: () => void;
}

export const InlineDiff: React.FC<InlineDiffProps> = ({
  result,
  onAccept,
  onReject,
  onRetry,
}) => {
  const { originalText, rewrittenText, changesDescription, complianceScore } = result;

  return (
    <div
      data-contextual-editor="diff"
      className="bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-300">
          {changesDescription}
        </span>
        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
          Score: {complianceScore}%
        </span>
      </div>

      {/* Diff display */}
      <div className="text-sm leading-relaxed mb-4">
        {/* Original - strikethrough red */}
        <span className="line-through text-red-400 bg-red-500/10 px-1 rounded">
          {originalText}
        </span>

        {/* Arrow */}
        <span className="mx-2 text-slate-500">→</span>

        {/* New - highlighted green */}
        <span className="text-green-400 bg-green-500/10 px-1 rounded">
          {rewrittenText}
        </span>
      </div>

      {/* Word count delta */}
      {result.wordCountDelta !== 0 && (
        <div className="text-xs text-slate-400 mb-3">
          {result.wordCountDelta > 0 ? '+' : ''}{result.wordCountDelta} words
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onAccept}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded transition-colors"
        >
          Accept
        </button>
        <button
          onClick={onReject}
          className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium rounded transition-colors"
        >
          Reject
        </button>
        <button
          onClick={onRetry}
          className="px-3 py-1.5 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
        >
          ↻ Try Again
        </button>
      </div>
    </div>
  );
};
