/**
 * BulkExportModal Component
 *
 * Export entire social media campaign with all posts and instructions.
 */

import React, { useState } from 'react';
import type { SocialCampaign, SocialPost, SocialMediaPlatform } from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG } from '../../../types/social';

interface BulkExportModalProps {
  campaign: SocialCampaign;
  posts: SocialPost[];
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat, options: ExportOptions) => Promise<void>;
}

type ExportFormat = 'json' | 'zip' | 'markdown';

interface ExportOptions {
  includeInstructions: boolean;
  includeImageSpecs: boolean;
  includeUtmLinks: boolean;
  platformsToInclude: SocialMediaPlatform[];
  groupByPlatform: boolean;
}

export const BulkExportModal: React.FC<BulkExportModalProps> = ({
  campaign,
  posts,
  isOpen,
  onClose,
  onExport
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('zip');
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    includeInstructions: true,
    includeImageSpecs: true,
    includeUtmLinks: true,
    platformsToInclude: [...new Set(posts.map(p => p.platform))],
    groupByPlatform: true
  });

  if (!isOpen) return null;

  const platforms = [...new Set(posts.map(p => p.platform))];
  const hubPost = posts.find(p => p.is_hub);
  const spokePosts = posts.filter(p => !p.is_hub);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(selectedFormat, options);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const togglePlatform = (platform: SocialMediaPlatform) => {
    setOptions(prev => ({
      ...prev,
      platformsToInclude: prev.platformsToInclude.includes(platform)
        ? prev.platformsToInclude.filter(p => p !== platform)
        : [...prev.platformsToInclude, platform]
    }));
  };

  const formatDescriptions: Record<ExportFormat, { label: string; description: string; icon: string }> = {
    json: {
      label: 'JSON',
      description: 'Machine-readable format with all data',
      icon: '{ }'
    },
    zip: {
      label: 'ZIP Package',
      description: 'Organized folders per platform with all assets',
      icon: '📦'
    },
    markdown: {
      label: 'Markdown',
      description: 'Human-readable document with all content',
      icon: '📄'
    }
  };

  const selectedPlatformPosts = posts.filter(p => options.platformsToInclude.includes(p.platform));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Export Campaign</h2>
              <p className="text-sm text-gray-400">
                {campaign.campaign_name || 'Untitled Campaign'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
          {/* Format Selection */}
          <div>
            <h3 className="text-sm font-medium text-white mb-3">Export Format</h3>
            <div className="grid grid-cols-3 gap-3">
              {(Object.entries(formatDescriptions) as [ExportFormat, typeof formatDescriptions[ExportFormat]][]).map(([format, info]) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setSelectedFormat(format)}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    selectedFormat === format
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-2">{info.icon}</div>
                  <p className="text-sm font-medium text-white">{info.label}</p>
                  <p className="text-xs text-gray-400 mt-1">{info.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Platform Selection */}
          <div>
            <h3 className="text-sm font-medium text-white mb-3">Platforms to Include</h3>
            <div className="flex flex-wrap gap-2">
              {platforms.map(platform => {
                const config = SOCIAL_PLATFORM_CONFIG[platform];
                const isSelected = options.platformsToInclude.includes(platform);
                const postCount = posts.filter(p => p.platform === platform).length;

                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ backgroundColor: config.color }}
                    >
                      <span className="text-white text-xs font-bold">
                        {config.name.charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-300">{config.name}</span>
                    <span className="text-xs text-gray-500">({postCount})</span>
                    {isSelected && (
                      <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Export Options */}
          <div>
            <h3 className="text-sm font-medium text-white mb-3">Options</h3>
            <div className="space-y-3">
              {[
                { key: 'includeInstructions', label: 'Include posting instructions', description: 'Step-by-step guides for each platform' },
                { key: 'includeImageSpecs', label: 'Include image specifications', description: 'Dimensions and format requirements' },
                { key: 'includeUtmLinks', label: 'Include UTM-tagged links', description: 'Full URLs with tracking parameters' },
                { key: 'groupByPlatform', label: 'Group by platform', description: 'Organize content into platform folders' }
              ].map(option => (
                <label
                  key={option.key}
                  className="flex items-start gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={options[option.key as keyof ExportOptions] as boolean}
                    onChange={(e) => setOptions(prev => ({
                      ...prev,
                      [option.key]: e.target.checked
                    }))}
                    className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm text-gray-300">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-3">Export Preview</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Total Posts</p>
                <p className="text-white font-medium">{selectedPlatformPosts.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Platforms</p>
                <p className="text-white font-medium">{options.platformsToInclude.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Hub Post</p>
                <p className="text-white font-medium">
                  {hubPost && options.platformsToInclude.includes(hubPost.platform) ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Spoke Posts</p>
                <p className="text-white font-medium">
                  {spokePosts.filter(p => options.platformsToInclude.includes(p.platform)).length}
                </p>
              </div>
            </div>

            {selectedFormat === 'zip' && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-500 mb-2">Package structure:</p>
                <pre className="text-xs text-gray-400 font-mono">
{`campaign-${campaign.id?.slice(0, 8) || 'export'}/
├── README.md
├── campaign-summary.json
${options.platformsToInclude.map(p => `├── ${p}/
│   ├── post${posts.filter(post => post.platform === p).length > 1 ? 's' : ''}.txt
│   ${options.includeInstructions ? '├── instructions.md\n│   ' : ''}${options.includeImageSpecs ? '└── image-requirements.md' : ''}`).join('\n')}
└── assets/
    └── links.json`}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || options.platformsToInclude.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Export {formatDescriptions[selectedFormat].label}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkExportModal;
