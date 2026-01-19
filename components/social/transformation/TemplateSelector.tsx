/**
 * TemplateSelector Component
 *
 * Allows users to select and configure templates for each enabled platform.
 */

import React from 'react';
import type {
  SocialMediaPlatform,
  SocialTemplateType,
  PlatformSelection,
  SocialPostTemplate
} from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG } from '../../../types/social';

interface TemplateSelectorProps {
  selections: PlatformSelection[];
  templates: Record<SocialMediaPlatform, SocialPostTemplate[]>;
  onChange: (selections: PlatformSelection[]) => void;
  hubPlatform: SocialMediaPlatform;
}

const TEMPLATE_DESCRIPTIONS: Record<SocialTemplateType, { name: string; description: string }> = {
  hub_announcement: {
    name: 'Hub Announcement',
    description: 'Main article announcement with key takeaways'
  },
  key_takeaway: {
    name: 'Key Takeaway',
    description: 'Single insight from the article'
  },
  entity_spotlight: {
    name: 'Entity Spotlight',
    description: 'Focus on one entity from the content'
  },
  question_hook: {
    name: 'Question Hook',
    description: 'Engagement question to drive discussion'
  },
  stat_highlight: {
    name: 'Stat Highlight',
    description: 'Statistical fact or data point'
  },
  tip_series: {
    name: 'Tip Series',
    description: 'Actionable tips in list format'
  },
  quote_card: {
    name: 'Quote Card',
    description: 'Notable quote from the article'
  },
  listicle: {
    name: 'Listicle',
    description: 'Quick numbered list format'
  },
  spoke_teaser: {
    name: 'Spoke Teaser',
    description: 'Short teaser linking to hub content'
  }
};

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selections,
  templates,
  onChange,
  hubPlatform
}) => {
  const handleTemplateChange = (platform: SocialMediaPlatform, templateType: SocialTemplateType) => {
    const updated = selections.map(s =>
      s.platform === platform
        ? { ...s, template_type: templateType }
        : s
    );
    onChange(updated);
  };

  const enabledSelections = selections.filter(s => s.enabled);

  if (enabledSelections.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No platforms selected.</p>
        <p className="text-sm mt-1">Go back to select platforms first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Configure Templates</h3>
        <span className="text-xs text-gray-500">
          Choose a template for each platform
        </span>
      </div>

      <div className="space-y-4">
        {enabledSelections.map(selection => {
          const platform = selection.platform;
          const config = SOCIAL_PLATFORM_CONFIG[platform];
          const platformTemplates = templates[platform] || [];
          const isHub = platform === hubPlatform;

          return (
            <div
              key={platform}
              className={`rounded-lg border p-4 ${
                isHub
                  ? 'border-blue-500 bg-blue-500/5'
                  : 'border-gray-700 bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: config.color }}
                >
                  <span className="text-white text-sm font-bold">
                    {config.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{config.name}</p>
                  <p className="text-xs text-gray-400">
                    {isHub ? 'Hub platform (1 post)' : `${selection.post_count} spoke post(s)`}
                  </p>
                </div>
                {isHub && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    HUB
                  </span>
                )}
              </div>

              {/* Template selection */}
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-medium">Template:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {platformTemplates.length > 0 ? (
                    platformTemplates.map(template => {
                      const isSelected = selection.template_type === template.template_type;
                      const info = TEMPLATE_DESCRIPTIONS[template.template_type] || {
                        name: template.template_name,
                        description: ''
                      };

                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => handleTemplateChange(platform, template.template_type)}
                          className={`text-left p-3 rounded-lg border transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                              isSelected
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-500'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <path d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${isSelected ? 'text-blue-300' : 'text-gray-200'}`}>
                                {info.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {info.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    // Default template options if none loaded
                    (isHub
                      ? ['hub_announcement', 'key_takeaway', 'question_hook']
                      : ['key_takeaway', 'entity_spotlight', 'question_hook', 'listicle']
                    ).map(templateType => {
                      const type = templateType as SocialTemplateType;
                      const isSelected = selection.template_type === type;
                      const info = TEMPLATE_DESCRIPTIONS[type];

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleTemplateChange(platform, type)}
                          className={`text-left p-3 rounded-lg border transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                              isSelected
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-500'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <path d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${isSelected ? 'text-blue-300' : 'text-gray-200'}`}>
                                {info.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {info.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Preview text */}
              {platformTemplates.length > 0 && (
                <div className="mt-3 p-2 bg-gray-900/50 rounded text-xs text-gray-500">
                  <span className="font-medium">Pattern preview:</span>
                  <p className="mt-1 font-mono text-gray-400 truncate">
                    {platformTemplates.find(t => t.template_type === selection.template_type)?.content_pattern?.substring(0, 100) || '...'}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hub-Spoke explanation */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Hub-Spoke Strategy</h4>
        <p className="text-xs text-gray-500">
          The <span className="text-blue-400">Hub</span> platform receives the main announcement post.
          <span className="text-gray-400"> Spoke</span> platforms get supporting posts that reference and link back to the hub,
          maximizing cross-platform engagement while maintaining semantic coherence.
        </p>
      </div>
    </div>
  );
};

export default TemplateSelector;
