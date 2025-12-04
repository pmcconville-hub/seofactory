import React, { useState } from 'react';
import { SemanticActionItem, BusinessInfo } from '../../types';
import { generateSmartFix } from '../../services/ai/semanticAnalysis';
import { SimpleMarkdown } from './SimpleMarkdown';
import { AppAction } from '../../state/appState';

interface SmartFixButtonProps {
  action: SemanticActionItem;
  pageContent: string;
  businessInfo: BusinessInfo;
  dispatch: React.Dispatch<AppAction>;
  onFixGenerated?: (fix: string) => void;
}

export const SmartFixButton: React.FC<SmartFixButtonProps> = ({
  action,
  pageContent,
  businessInfo,
  dispatch,
  onFixGenerated
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFix, setGeneratedFix] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateFix = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const fix = await generateSmartFix(action, pageContent, businessInfo, dispatch);
      setGeneratedFix(fix);
      setIsExpanded(true);

      if (onFixGenerated) {
        onFixGenerated(fix);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate fix';
      setError(message);
      dispatch({
        type: 'LOG_EVENT',
        payload: {
          service: 'SmartFixButton',
          message: `Error generating fix: ${message}`,
          status: 'failure',
          timestamp: Date.now(),
          data: err
        }
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="mt-3">
      {/* Button */}
      {!generatedFix ? (
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
          {isGenerating ? (
            <>
              <span className="animate-spin inline-block">⚙</span>
              <span>Generating Fix...</span>
            </>
          ) : (
            <>
              <span>✨</span>
              <span>Get Smart Fix</span>
            </>
          )}
        </button>
      ) : (
        <button
          onClick={toggleExpanded}
          className="
            bg-purple-500/20 text-purple-400 border border-purple-500/30
            px-4 py-2 rounded-md text-sm font-medium
            hover:bg-purple-500/30 hover:border-purple-500/50
            transition-all duration-200
            flex items-center gap-2
          "
        >
          <span>{isExpanded ? '▼' : '▶'}</span>
          <span>{isExpanded ? 'Hide Fix' : 'Show Fix'}</span>
        </button>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-2 p-3 bg-red-900/20 border border-red-500/30 rounded-md text-red-400 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Fix Panel */}
      {generatedFix && isExpanded && (
        <div className="
          mt-3 p-4
          bg-purple-900/20 border border-purple-500/30
          rounded-md
          text-gray-300 text-sm
          max-h-96 overflow-y-auto
        ">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-500/20">
            <span className="text-purple-400 font-semibold">AI-Generated Fix</span>
            <span className="text-xs text-purple-500/60">for {action.title}</span>
          </div>

          <SimpleMarkdown content={generatedFix} />
        </div>
      )}
    </div>
  );
};
