/**
 * PostPreviewCard Component
 *
 * Generic preview card wrapper for social posts.
 * Displays post content with platform styling and compliance info.
 */

import React, { useState } from 'react';
import type { SocialPost, PostComplianceReport } from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG, TARGET_COMPLIANCE_SCORE } from '../../../types/social';
import { LinkedInPreview } from './LinkedInPreview';
import { TwitterPreview } from './TwitterPreview';
import { FacebookPreview } from './FacebookPreview';
import { InstagramPreview } from './InstagramPreview';
import { PinterestPreview } from './PinterestPreview';

interface PostPreviewCardProps {
  post: SocialPost;
  complianceReport?: PostComplianceReport;
  onEdit?: () => void;
  isHub?: boolean;
  showFullContent?: boolean;
}

export const PostPreviewCard: React.FC<PostPreviewCardProps> = ({
  post,
  complianceReport,
  onEdit,
  isHub = false,
  showFullContent = false
}) => {
  const [isExpanded, setIsExpanded] = useState(showFullContent);
  const config = SOCIAL_PLATFORM_CONFIG[post.platform];

  const score = complianceReport?.overall_score || post.semantic_compliance_score || 0;
  const scoreColor = score >= TARGET_COMPLIANCE_SCORE
    ? 'text-green-400'
    : score >= 70
      ? 'text-yellow-400'
      : 'text-red-400';

  const renderPlatformPreview = () => {
    switch (post.platform) {
      case 'linkedin':
        return <LinkedInPreview post={post} expanded={isExpanded} />;
      case 'twitter':
        return <TwitterPreview post={post} expanded={isExpanded} />;
      case 'facebook':
        return <FacebookPreview post={post} expanded={isExpanded} />;
      case 'instagram':
        return <InstagramPreview post={post} expanded={isExpanded} />;
      case 'pinterest':
        return <PinterestPreview post={post} expanded={isExpanded} />;
      default:
        return (
          <div className="p-4 bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {post.content_text}
            </p>
          </div>
        );
    }
  };

  return (
    <div className={`rounded-lg border overflow-hidden ${
      isHub ? 'border-blue-500/50' : 'border-gray-700'
    }`}>
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: config.color }}
          >
            <span className="text-white text-xs font-bold">
              {config.name.charAt(0)}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {config.name}
              {isHub && <span className="ml-2 text-xs text-blue-400">(Hub)</span>}
            </p>
            <p className="text-xs text-gray-400">
              {post.post_type === 'thread' ? 'Thread' :
               post.post_type === 'carousel' ? 'Carousel' :
               post.post_type === 'pin' ? 'Pin' : 'Post'}
              {post.spoke_position && ` • Spoke #${post.spoke_position}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Compliance score badge */}
          {score > 0 && (
            <div className={`text-xs font-medium ${scoreColor} bg-gray-800 px-2 py-0.5 rounded`}>
              {Math.round(score)}%
            </div>
          )}

          {/* Character count */}
          <div className="text-xs text-gray-500">
            {post.content_text.length} chars
          </div>

          {/* Edit button */}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
              title="Edit post"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Platform-specific preview */}
      <div className="bg-gray-900">
        {renderPlatformPreview()}
      </div>

      {/* Footer with metadata */}
      <div className="px-3 py-2 bg-gray-800/50 border-t border-gray-700 space-y-2">
        {/* EAV triple if present */}
        {post.eav_triple && (
          <div className="text-xs">
            <span className="text-gray-500">EAV:</span>{' '}
            <span className="text-gray-300">
              {post.eav_triple.entity} → {post.eav_triple.attribute} → {post.eav_triple.value}
            </span>
            {post.eav_triple.category && (
              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
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

        {/* Entities mentioned */}
        {post.entities_mentioned && post.entities_mentioned.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-gray-500">Entities:</span>
            {post.entities_mentioned.slice(0, 3).map((entity, i) => (
              <span key={i} className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                {entity}
              </span>
            ))}
            {post.entities_mentioned.length > 3 && (
              <span className="text-xs text-gray-500">
                +{post.entities_mentioned.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-gray-500">Tags:</span>
            <span className="text-xs text-blue-400">
              {post.hashtags.slice(0, 5).map(h => `#${h}`).join(' ')}
              {post.hashtags.length > 5 && ` +${post.hashtags.length - 5}`}
            </span>
          </div>
        )}

        {/* Compliance issues */}
        {complianceReport && complianceReport.checks.some(c => !c.passed) && (
          <div className="pt-2 border-t border-gray-700">
            <p className="text-xs text-yellow-400 font-medium mb-1">Issues:</p>
            <ul className="space-y-0.5">
              {complianceReport.checks
                .filter(c => !c.passed)
                .slice(0, 3)
                .map((check, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-start gap-1">
                    <span className="text-yellow-500">•</span>
                    {check.message}
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Expand/collapse for long content */}
        {post.content_text.length > 200 && !showFullContent && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  );
};

export default PostPreviewCard;
