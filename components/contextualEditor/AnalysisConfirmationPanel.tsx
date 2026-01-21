// components/contextualEditor/AnalysisConfirmationPanel.tsx
/**
 * Side panel for reviewing AI-detected items and marking them as keep/fix/remove.
 * Used when actions like 'fix_accuracy' require user confirmation before applying.
 */

import React from 'react';
import { BusinessInfo } from '../../types';
import {
  AnalysisForConfirmation,
  DetectedItem,
} from '../../types/contextualEditor';
import { QuickInstructionInput } from './QuickInstructionInput';

export interface AnalysisConfirmationPanelProps {
  selectedText: string;
  analysis: AnalysisForConfirmation;
  businessInfo: BusinessInfo;
  customInstruction: string;
  isProcessing: boolean;
  onItemDecisionChange: (
    itemId: string,
    decision: 'keep' | 'fix' | 'remove',
    correction?: string
  ) => void;
  onInstructionChange: (instruction: string) => void;
  onApply: () => void;
  onCancel: () => void;
}

// Map AI assessment to display config
const ASSESSMENT_CONFIG: Record<
  DetectedItem['aiAssessment'],
  { icon: string; label: string; className: string }
> = {
  potentially_incorrect: {
    icon: '!',
    label: 'May be incorrect',
    className: 'text-amber-400',
  },
  unverified: {
    icon: '?',
    label: 'Not in your services',
    className: 'text-amber-400',
  },
  needs_review: {
    icon: '*',
    label: 'Matches your service',
    className: 'text-green-400',
  },
};

// Map item type to readable labels
const ITEM_TYPE_LABELS: Record<DetectedItem['itemType'], string> = {
  service_mention: 'Service Mention',
  factual_claim: 'Factual Claim',
  unverified_statement: 'Unverified Statement',
};

interface DetectedItemCardProps {
  item: DetectedItem;
  onDecisionChange: (
    decision: 'keep' | 'fix' | 'remove',
    correction?: string
  ) => void;
}

const DetectedItemCard: React.FC<DetectedItemCardProps> = ({
  item,
  onDecisionChange,
}) => {
  const assessmentConfig = ASSESSMENT_CONFIG[item.aiAssessment];

  const handleCorrectionChange = (correction: string) => {
    onDecisionChange('fix', correction);
  };

  return (
    <div className="bg-slate-900/70 rounded-lg border border-slate-700 p-3">
      {/* Text fragment */}
      <div className="text-sm text-slate-200 mb-2 font-medium">
        "{item.textFragment}"
      </div>

      {/* AI Assessment */}
      <div className="flex items-center gap-2 text-xs mb-3">
        <span
          className={`w-4 h-4 flex items-center justify-center rounded-full border ${assessmentConfig.className} border-current font-bold`}
        >
          {assessmentConfig.icon}
        </span>
        <span className={assessmentConfig.className}>
          {assessmentConfig.label}
        </span>
        {item.reason && (
          <span className="text-slate-500 ml-1">- {item.reason}</span>
        )}
      </div>

      {/* Decision buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onDecisionChange('keep')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            item.userDecision === 'keep'
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <span>&#10003;</span>
          Keep
        </button>
        <button
          type="button"
          onClick={() => onDecisionChange('fix', item.userCorrection || '')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            item.userDecision === 'fix'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <span>&#9998;</span>
          Fix
        </button>
        <button
          type="button"
          onClick={() => onDecisionChange('remove')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            item.userDecision === 'remove'
              ? 'bg-red-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <span>&#10005;</span>
          Remove
        </button>
      </div>

      {/* Correction input - shows only when Fix is selected */}
      {item.userDecision === 'fix' && (
        <div className="mt-3">
          <input
            type="text"
            value={item.userCorrection || ''}
            onChange={(e) => handleCorrectionChange(e.target.value)}
            placeholder="Enter the correct text..."
            className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded px-3 py-2 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
          />
        </div>
      )}
    </div>
  );
};

export const AnalysisConfirmationPanel: React.FC<
  AnalysisConfirmationPanelProps
> = ({
  selectedText,
  analysis,
  businessInfo,
  customInstruction,
  isProcessing,
  onItemDecisionChange,
  onInstructionChange,
  onApply,
  onCancel,
}) => {
  const hasAnyDecision = analysis.detectedItems.some(
    (item) => item.userDecision !== null
  );

  // Determine panel title based on action type
  const getPanelTitle = () => {
    switch (analysis.action) {
      case 'fix_accuracy':
        return 'Review Service Mentions';
      default:
        return 'Review Detected Items';
    }
  };

  return (
    <div
      data-contextual-editor="analysis-panel"
      className="fixed right-0 top-0 h-full w-96 bg-slate-800 border-l border-slate-600 shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-600 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{getPanelTitle()}</h3>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-white transition-colors p-1"
          aria-label="Close panel"
        >
          &#10005;
        </button>
      </div>

      {/* Selected text preview */}
      <div className="p-4 border-b border-slate-700 bg-slate-900/50">
        <div className="text-xs text-slate-400 mb-1">Selected:</div>
        <div className="text-sm text-slate-200 max-h-20 overflow-y-auto">
          "{selectedText.slice(0, 200)}
          {selectedText.length > 200 ? '...' : ''}"
        </div>
      </div>

      {/* Summary if available */}
      {analysis.summary && (
        <div className="px-4 py-3 border-b border-slate-700 bg-blue-500/5">
          <div className="text-xs text-blue-400">{analysis.summary}</div>
        </div>
      )}

      {/* Detected items list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-xs text-slate-400 mb-3">
          Found {analysis.detectedItems.length} item
          {analysis.detectedItems.length !== 1 ? 's' : ''}:
        </div>

        <div className="space-y-3">
          {analysis.detectedItems.map((item) => (
            <DetectedItemCard
              key={item.id}
              item={item}
              onDecisionChange={(decision, correction) =>
                onItemDecisionChange(item.id, decision, correction)
              }
            />
          ))}
        </div>

        {analysis.detectedItems.length === 0 && (
          <div className="text-sm text-slate-500 text-center py-8">
            No items detected that require review.
          </div>
        )}
      </div>

      {/* QuickInstructionInput */}
      <div className="p-4 border-t border-slate-700">
        <div className="text-xs text-slate-400 mb-2">
          Additional guidance (optional):
        </div>
        <QuickInstructionInput
          businessInfo={businessInfo}
          instruction={customInstruction}
          onInstructionChange={onInstructionChange}
        />
      </div>

      {/* Action buttons */}
      <div className="p-4 border-t border-slate-600 flex items-center justify-between gap-3">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onApply}
          disabled={isProcessing || !hasAnyDecision}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Applying...' : 'Apply Changes'}
        </button>
      </div>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
          <div className="flex items-center gap-2 text-white">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        </div>
      )}
    </div>
  );
};
