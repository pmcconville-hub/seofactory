// components/publishing/panels/BlueprintPanel.tsx
/**
 * Blueprint Panel
 *
 * Collapsible panel for section-level blueprint adjustments.
 * Simplified version of BlueprintStep for embedding in Preview.
 */
import React, { useState } from 'react';
import { Select } from '../../ui/Select';
import type { LayoutBlueprint, SectionDesign } from '../../../services/publishing';

interface BlueprintPanelProps {
  blueprint: LayoutBlueprint | null;
  onBlueprintChange: (blueprint: LayoutBlueprint) => void;
  isGenerating?: boolean;
  onRegenerate?: () => void;
}

export const BlueprintPanel: React.FC<BlueprintPanelProps> = ({
  blueprint,
  onBlueprintChange,
  isGenerating,
  onRegenerate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!blueprint) {
    return null;
  }

  const updateSection = (sectionId: string, updates: Partial<SectionDesign['presentation']>) => {
    const updatedSections = blueprint.sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          presentation: {
            ...section.presentation,
            ...updates,
          },
        };
      }
      return section;
    });

    onBlueprintChange({
      ...blueprint,
      sections: updatedSections,
    });
  };

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>🏗️</span>
          <span className="font-medium text-white">Adjust Sections</span>
          <span className="text-xs text-gray-500">({blueprint.sections.length} sections)</span>
        </div>
        <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3 border-t border-gray-700 max-h-80 overflow-y-auto">
          {blueprint.sections.map((section, index) => (
            <div key={section.id} className="p-3 bg-gray-800/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white truncate">
                  {section.heading || `Section ${index + 1}`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={section.presentation.emphasis}
                  onChange={(e) => updateSection(section.id, { emphasis: e.target.value as SectionDesign['presentation']['emphasis'] })}
                  className="text-xs"
                >
                  <option value="normal">Normal</option>
                  <option value="featured">Featured</option>
                  <option value="background">Background</option>
                  <option value="hero-moment">Hero Moment</option>
                </Select>
                <Select
                  value={section.presentation.spacing}
                  onChange={(e) => updateSection(section.id, { spacing: e.target.value as SectionDesign['presentation']['spacing'] })}
                  className="text-xs"
                >
                  <option value="tight">Tight</option>
                  <option value="normal">Normal</option>
                  <option value="breathe">Breathe</option>
                </Select>
              </div>
            </div>
          ))}

          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isGenerating}
              className="w-full mt-2 p-2 text-sm text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/10 transition-colors disabled:opacity-50"
            >
              {isGenerating ? 'Regenerating...' : '↻ Regenerate Blueprint'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
