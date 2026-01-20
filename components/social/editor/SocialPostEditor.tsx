/**
 * SocialPostEditor Component
 *
 * Full editor for social posts with platform-specific features.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type {
  SocialPost,
  SocialMediaPlatform,
  ThreadSegment,
  PostComplianceReport
} from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG } from '../../../types/social';
import { CharacterCounter } from './CharacterCounter';
import { HashtagEditor } from './HashtagEditor';
import { ThreadEditor } from './ThreadEditor';
import { ImageVariationPanel } from './ImageVariationPanel';
import type { VariationResult } from '../../../services/social/transformation/imageVariationService';

interface SocialPostEditorProps {
  post: SocialPost;
  onChange: (post: SocialPost) => void;
  complianceReport?: PostComplianceReport;
  hashtagSuggestions?: string[];
  onSave?: () => void;
  onCancel?: () => void;
  onImageVariationGenerated?: (result: VariationResult) => void;
}

const PLATFORM_CHAR_LIMITS: Record<SocialMediaPlatform, number> = {
  linkedin: 3000,
  twitter: 280,
  facebook: 63206,
  instagram: 2200,
  pinterest: 500
};

export const SocialPostEditor: React.FC<SocialPostEditorProps> = ({
  post,
  onChange,
  complianceReport,
  hashtagSuggestions = [],
  onSave,
  onCancel,
  onImageVariationGenerated
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'hashtags' | 'settings'>('content');

  const config = SOCIAL_PLATFORM_CONFIG[post.platform];
  const charLimit = PLATFORM_CHAR_LIMITS[post.platform];
  const isThread = post.post_type === 'thread';
  const isCarousel = post.post_type === 'carousel';

  // Calculate current content length
  const contentLength = useMemo(() => {
    if (isThread && post.content_thread) {
      return post.content_thread.reduce((sum, s) => sum + s.text.length, 0);
    }
    return post.content_text.length;
  }, [post.content_text, post.content_thread, isThread]);

  const handleContentChange = useCallback((text: string) => {
    onChange({
      ...post,
      content_text: text
    });
  }, [post, onChange]);

  const handleThreadChange = useCallback((segments: ThreadSegment[]) => {
    onChange({
      ...post,
      content_thread: segments,
      // Also update content_text with combined thread text
      content_text: segments.map(s => s.text).join('\n\n')
    });
  }, [post, onChange]);

  const handleHashtagsChange = useCallback((hashtags: string[]) => {
    onChange({
      ...post,
      hashtags
    });
  }, [post, onChange]);

  // Compliance score display
  const scoreColor = complianceReport
    ? complianceReport.overall_score >= 85
      ? 'text-green-400'
      : complianceReport.overall_score >= 70
        ? 'text-yellow-400'
        : 'text-red-400'
    : 'text-gray-400';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: config.color }}
          >
            <span className="text-white font-bold">
              {config.name.charAt(0)}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-white">{config.name} Post</h3>
            <p className="text-xs text-gray-400">
              {post.is_hub ? 'Hub Post' : `Spoke #${post.spoke_position || 1}`}
              {' • '}
              {post.post_type === 'thread' ? 'Thread' :
               post.post_type === 'carousel' ? 'Carousel' :
               post.post_type === 'pin' ? 'Pin' : 'Single Post'}
            </p>
          </div>
        </div>

        {/* Compliance score */}
        {complianceReport && (
          <div className="text-right">
            <span className={`text-lg font-bold ${scoreColor}`}>
              {Math.round(complianceReport.overall_score)}%
            </span>
            <p className="text-xs text-gray-500">Compliance</p>
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-700">
        {(['content', 'hashtags', 'settings'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'content' && (
          <div className="space-y-4">
            {/* Thread editor for Twitter threads */}
            {isThread ? (
              <ThreadEditor
                segments={post.content_thread || [{ index: 0, text: post.content_text }]}
                onChange={handleThreadChange}
              />
            ) : (
              /* Standard text editor */
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Post Content
                </label>
                <textarea
                  value={post.content_text}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Write your post content..."
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white text-sm resize-none focus:border-blue-500 focus:outline-none"
                  rows={10}
                />
                <CharacterCounter
                  current={post.content_text.length}
                  limit={charLimit}
                  platform={post.platform}
                />
              </div>
            )}

            {/* Image variation panel */}
            <ImageVariationPanel
              platform={post.platform}
              imageInstructions={post.image_instructions}
              onVariationGenerated={onImageVariationGenerated}
            />

            {/* Link preview */}
            {post.link_url && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Link</h4>
                <p className="text-sm text-blue-400 break-all">{post.link_url}</p>
                {post.utm_parameters && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(post.utm_parameters).map(([key, value]) => (
                      value && (
                        <span key={key} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                          {key}: {value}
                        </span>
                      )
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'hashtags' && (
          <div className="space-y-4">
            <HashtagEditor
              hashtags={post.hashtags || []}
              onChange={handleHashtagsChange}
              platform={post.platform}
              suggestions={hashtagSuggestions}
            />

            {/* Entity-based suggestions */}
            {post.entities_mentioned && post.entities_mentioned.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-2">From Entities</h4>
                <div className="flex flex-wrap gap-2">
                  {post.entities_mentioned.map(entity => (
                    <span key={entity} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                      {entity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Posting instructions */}
            {post.posting_instructions && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Posting Instructions</h4>
                <p className="text-sm text-gray-400 whitespace-pre-wrap">{post.posting_instructions}</p>
              </div>
            )}

            {/* Optimal time */}
            {post.optimal_posting_time && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Best Time to Post</h4>
                <p className="text-sm text-gray-400">{post.optimal_posting_time}</p>
              </div>
            )}

            {/* EAV Triple */}
            {post.eav_triple && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Semantic Triple (EAV)</h4>
                <div className="flex items-center gap-2 text-sm">
                  <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                    {post.eav_triple.entity}
                  </span>
                  <span className="text-gray-500">→</span>
                  <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                    {post.eav_triple.attribute}
                  </span>
                  <span className="text-gray-500">→</span>
                  <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded">
                    {post.eav_triple.value}
                  </span>
                </div>
                {post.eav_triple.category && (
                  <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${
                    post.eav_triple.category === 'UNIQUE' ? 'bg-purple-500/20 text-purple-300' :
                    post.eav_triple.category === 'RARE' ? 'bg-blue-500/20 text-blue-300' :
                    post.eav_triple.category === 'ROOT' ? 'bg-green-500/20 text-green-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {post.eav_triple.category}
                  </span>
                )}
              </div>
            )}

            {/* Compliance details */}
            {complianceReport && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Compliance Details</h4>
                <div className="space-y-2">
                  {complianceReport.checks.map((check, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{check.rule}</span>
                      <span className={check.passed ? 'text-green-400' : 'text-red-400'}>
                        {check.score}/{check.max_score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      {(onSave || onCancel) && (
        <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SocialPostEditor;
