// components/contextualEditor/QuickInstructionInput.tsx
/**
 * Compact inline component for adding custom instructions to AI rewrites.
 * Provides quick-insert buttons for common business-context instructions.
 */

import React from 'react';
import { BusinessInfo } from '../../types';

export interface QuickInstructionInputProps {
  businessInfo: BusinessInfo;
  instruction: string;
  onInstructionChange: (instruction: string) => void;
}

interface QuickInsertButton {
  label: string;
  getInstruction: (businessInfo: BusinessInfo) => string;
  isAvailable: (businessInfo: BusinessInfo) => boolean;
}

const QUICK_INSERT_BUTTONS: QuickInsertButton[] = [
  {
    label: 'Use company name',
    getInstruction: (info) => `Use "${info.projectName}" instead of generic terms`,
    isAvailable: (info) => !!info.projectName,
  },
  {
    label: 'Add location',
    getInstruction: (info) => `Include location: ${info.region}`,
    isAvailable: (info) => !!info.region,
  },
  {
    label: 'Mention service',
    getInstruction: (info) => {
      const firstOffering = info.offerings?.[0];
      return firstOffering ? `Mention the service: ${firstOffering}` : '';
    },
    isAvailable: (info) => !!(info.offerings && info.offerings.length > 0),
  },
];

export const QuickInstructionInput: React.FC<QuickInstructionInputProps> = ({
  businessInfo,
  instruction,
  onInstructionChange,
}) => {
  const handleQuickInsert = (button: QuickInsertButton) => {
    const newInstruction = button.getInstruction(businessInfo);
    if (!newInstruction) return;

    // Append to existing instruction with separator if needed
    const separator = instruction.trim() ? '. ' : '';
    onInstructionChange(instruction.trim() + separator + newInstruction);
  };

  const availableButtons = QUICK_INSERT_BUTTONS.filter((btn) =>
    btn.isAvailable(businessInfo)
  );

  const hasBusinessContext = businessInfo.projectName || businessInfo.region;

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-3">
      {/* Business context summary */}
      {hasBusinessContext && (
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <span className="text-slate-500">Business:</span>
          {businessInfo.projectName && (
            <span className="text-slate-300">{businessInfo.projectName}</span>
          )}
          {businessInfo.projectName && businessInfo.region && (
            <span className="text-slate-600">|</span>
          )}
          {businessInfo.region && (
            <span className="text-slate-300">{businessInfo.region}</span>
          )}
        </div>
      )}

      {/* Divider */}
      {hasBusinessContext && availableButtons.length > 0 && (
        <div className="border-t border-slate-700 my-2" />
      )}

      {/* Quick-insert buttons */}
      {availableButtons.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="text-xs text-slate-500 mr-1">Quick add:</span>
          {availableButtons.map((button) => (
            <button
              key={button.label}
              type="button"
              onClick={() => handleQuickInsert(button)}
              className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-slate-100 rounded transition-colors border border-slate-600"
            >
              {button.label}
            </button>
          ))}
        </div>
      )}

      {/* Text input */}
      <input
        type="text"
        value={instruction}
        onChange={(e) => onInstructionChange(e.target.value)}
        placeholder="Additional instruction (optional)..."
        className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded px-3 py-2 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
      />
    </div>
  );
};
