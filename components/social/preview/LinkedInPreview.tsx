/**
 * LinkedInPreview Component
 *
 * Renders a LinkedIn-style post preview mockup.
 */

import React from 'react';
import type { SocialPost } from '../../../types/social';

interface LinkedInPreviewProps {
  post: SocialPost;
  expanded?: boolean;
}

export const LinkedInPreview: React.FC<LinkedInPreviewProps> = ({
  post,
  expanded = false
}) => {
  const previewLimit = 210; // LinkedIn shows ~210 chars before "...see more"
  const content = post.content_text;
  const shouldTruncate = !expanded && content.length > previewLimit;
  const displayContent = shouldTruncate
    ? content.substring(0, previewLimit) + '...'
    : content;

  return (
    <div className="bg-white text-gray-900 p-4 font-sans">
      {/* Author header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-semibold">A</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900">Author Name</p>
          <p className="text-xs text-gray-500 truncate">Professional Title | Company</p>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <span>Now</span>
            <span>•</span>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </p>
        </div>
        <button type="button" className="text-gray-400">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </button>
      </div>

      {/* Post content */}
      <div className="mb-3">
        <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800">
          {displayContent}
        </p>
        {shouldTruncate && (
          <button type="button" className="text-gray-500 text-sm font-medium hover:underline">
            ...see more
          </button>
        )}
      </div>

      {/* Hashtags */}
      {post.hashtags && post.hashtags.length > 0 && (
        <div className="mb-3">
          <span className="text-sm text-[#0a66c2]">
            {post.hashtags.map(h => `#${h}`).join(' ')}
          </span>
        </div>
      )}

      {/* Link preview card */}
      {post.link_url && (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
          <div className="h-32 bg-gray-100 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="p-3 bg-gray-50">
            <p className="text-xs text-gray-500 truncate">
              {post.link_url.replace(/^https?:\/\//, '').split('/')[0]}
            </p>
            <p className="text-sm font-medium text-gray-900 truncate mt-0.5">
              Article Title
            </p>
          </div>
        </div>
      )}

      {/* Engagement bar */}
      <div className="border-t border-gray-200 pt-2 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <div className="w-4 h-4 rounded-full bg-blue-500 border border-white" />
            <div className="w-4 h-4 rounded-full bg-green-500 border border-white" />
          </div>
          <span>42</span>
        </div>
        <span>5 comments • 2 reposts</span>
      </div>

      {/* Action buttons */}
      <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between">
        {['Like', 'Comment', 'Repost', 'Send'].map(action => (
          <button
            key={action}
            type="button"
            className="flex items-center gap-1 px-4 py-2 text-gray-500 hover:bg-gray-100 rounded font-medium text-sm"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LinkedInPreview;
