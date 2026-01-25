// components/publishing/panels/LayoutPanel.tsx
/**
 * Layout Panel
 *
 * Collapsible panel for layout configuration.
 * Extracted from LayoutConfigStep for use in Preview step.
 */
import React, { useState } from 'react';
import { Select } from '../../ui/Select';
import type { LayoutConfiguration, ContentTypeTemplate } from '../../../types/publishing';

interface LayoutPanelProps {
  layout: LayoutConfiguration;
  onChange: (updates: Partial<LayoutConfiguration>) => void;
  onTemplateChange: (template: ContentTypeTemplate) => void;
}

export const LayoutPanel: React.FC<LayoutPanelProps> = ({
  layout,
  onChange,
  onTemplateChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleComponent = (key: keyof LayoutConfiguration['components'], enabled: boolean) => {
    onChange({
      components: {
        ...layout.components,
        [key]: {
          ...layout.components[key],
          enabled,
        },
      },
    });
  };

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>📐</span>
          <span className="font-medium text-white">Adjust Layout</span>
        </div>
        <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-gray-700">
          {/* Template selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Template</label>
            <Select
              value={layout.template}
              onChange={(e) => onTemplateChange(e.target.value as ContentTypeTemplate)}
            >
              <option value="blog-article">Blog Article</option>
              <option value="landing-page">Landing Page</option>
              <option value="service-page">Service Page</option>
              <option value="ecommerce-product">Product Page</option>
            </Select>
          </div>

          {/* Component toggles */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Components</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(layout.components).map(([key, config]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => toggleComponent(key as keyof LayoutConfiguration['components'], e.target.checked)}
                    className="rounded border-gray-600"
                  />
                  <span className="text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
