/**
 * ExportPanel Component
 *
 * Panel for exporting social posts in various formats.
 */

import React, { useState } from 'react';
import type {
  SocialPost,
  SocialCampaign,
  ExportFormat
} from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG } from '../../../types/social';
import { CopyToClipboardButton } from './CopyToClipboardButton';
import { DownloadButton, DownloadFormatSelector } from './DownloadButton';
import { PostingInstructions } from './PostingInstructions';

interface ExportPanelProps {
  post?: SocialPost;
  campaign?: SocialCampaign;
  posts?: SocialPost[];
  onExport?: (format: ExportFormat, data: string) => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  post,
  campaign,
  posts = [],
  onExport
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('clipboard');
  const [showInstructions, setShowInstructions] = useState(false);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeLink, setIncludeLink] = useState(true);
  const [includeInstructions, setIncludeInstructions] = useState(false);

  const isSinglePost = !!post;
  const availableFormats: ExportFormat[] = isSinglePost
    ? ['clipboard', 'json', 'txt']
    : ['json', 'txt', 'zip'];

  // Build export content based on format
  const buildExportContent = (format: ExportFormat): string => {
    if (format === 'clipboard' && post) {
      let content = post.content_text;
      if (includeHashtags && post.hashtags?.length) {
        content += '\n\n' + post.hashtags.map(h => `#${h}`).join(' ');
      }
      if (includeLink && post.link_url) {
        content += '\n\n' + post.link_url;
      }
      return content;
    }

    if (format === 'json') {
      const data = isSinglePost ? { post } : { campaign, posts };
      return JSON.stringify(data, null, 2);
    }

    if (format === 'txt') {
      if (isSinglePost && post) {
        return buildTextExport(post);
      }
      return posts.map(p => buildTextExport(p)).join('\n\n---\n\n');
    }

    return '';
  };

  const buildTextExport = (p: SocialPost): string => {
    const config = SOCIAL_PLATFORM_CONFIG[p.platform];
    let content = `# ${config.name} Post\n\n`;
    content += p.content_text;

    if (includeHashtags && p.hashtags?.length) {
      content += '\n\n## Hashtags\n' + p.hashtags.map(h => `#${h}`).join(' ');
    }

    if (includeLink && p.link_url) {
      content += '\n\n## Link\n' + p.link_url;
    }

    if (includeInstructions && p.posting_instructions) {
      content += '\n\n## Instructions\n' + p.posting_instructions;
    }

    return content;
  };

  const getFilename = (format: ExportFormat): string => {
    const timestamp = new Date().toISOString().slice(0, 10);

    if (isSinglePost && post) {
      const platform = post.platform;
      return `post-${platform}-${timestamp}.${format === 'txt' ? 'md' : format}`;
    }

    const slug = campaign?.campaign_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'campaign';
    return `${slug}-${timestamp}.${format === 'txt' ? 'md' : format}`;
  };

  const getMimeType = (format: ExportFormat): string => {
    switch (format) {
      case 'json': return 'application/json';
      case 'txt': return 'text/markdown';
      case 'zip': return 'application/zip';
      default: return 'text/plain';
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-medium text-white">
          {isSinglePost ? 'Export Post' : `Export Campaign (${posts.length} posts)`}
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Download or copy your content for manual posting
        </p>
      </div>

      {/* Format selection */}
      <div className="p-4 border-b border-gray-700">
        <p className="text-xs text-gray-500 font-medium mb-2">Format</p>
        <DownloadFormatSelector
          availableFormats={availableFormats}
          selectedFormat={selectedFormat}
          onChange={setSelectedFormat}
        />
      </div>

      {/* Options */}
      <div className="p-4 border-b border-gray-700 space-y-2">
        <p className="text-xs text-gray-500 font-medium mb-2">Include</p>
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={includeHashtags}
            onChange={(e) => setIncludeHashtags(e.target.checked)}
            className="rounded border-gray-600"
          />
          Hashtags
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={includeLink}
            onChange={(e) => setIncludeLink(e.target.checked)}
            className="rounded border-gray-600"
          />
          Links with UTM
        </label>
        {selectedFormat !== 'clipboard' && (
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeInstructions}
              onChange={(e) => setIncludeInstructions(e.target.checked)}
              className="rounded border-gray-600"
            />
            Posting instructions
          </label>
        )}
      </div>

      {/* Preview (for clipboard) */}
      {selectedFormat === 'clipboard' && post && (
        <div className="p-4 border-b border-gray-700">
          <p className="text-xs text-gray-500 font-medium mb-2">Preview</p>
          <pre className="text-xs text-gray-300 bg-gray-900 rounded p-3 max-h-40 overflow-y-auto whitespace-pre-wrap">
            {buildExportContent('clipboard')}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 flex flex-wrap gap-3">
        {selectedFormat === 'clipboard' && post ? (
          <CopyToClipboardButton
            post={post}
            includeHashtags={includeHashtags}
            includeLink={includeLink}
            variant="button"
            size="md"
            onCopy={(success) => {
              if (success) onExport?.('clipboard', buildExportContent('clipboard'));
            }}
          />
        ) : (
          <DownloadButton
            content={buildExportContent(selectedFormat)}
            filename={getFilename(selectedFormat)}
            mimeType={getMimeType(selectedFormat)}
            format={selectedFormat}
            label={`Download .${selectedFormat === 'txt' ? 'md' : selectedFormat}`}
            onDownload={() => onExport?.(selectedFormat, buildExportContent(selectedFormat))}
          />
        )}

        {isSinglePost && post && (
          <button
            type="button"
            onClick={() => setShowInstructions(!showInstructions)}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {showInstructions ? 'Hide' : 'Show'} instructions
          </button>
        )}
      </div>

      {/* Instructions panel */}
      {showInstructions && post && (
        <div className="border-t border-gray-700">
          <PostingInstructions post={post} variant="full" />
        </div>
      )}
    </div>
  );
};

export default ExportPanel;
