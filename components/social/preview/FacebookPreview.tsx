/**
 * FacebookPreview Component
 *
 * Renders a Facebook-style post preview mockup.
 */

import React from 'react';
import type { SocialPost } from '../../../types/social';

interface FacebookPreviewProps {
  post: SocialPost;
  expanded?: boolean;
}

export const FacebookPreview: React.FC<FacebookPreviewProps> = ({
  post,
  expanded = false
}) => {
  const previewLimit = 80; // Facebook shows ~80 chars before "See more"
  const content = post.content_text;
  const shouldTruncate = !expanded && content.length > previewLimit;
  const displayContent = shouldTruncate
    ? content.substring(0, previewLimit) + '...'
    : content;

  return (
    <div className="bg-white text-gray-900 font-sans">
      {/* Author header */}
      <div className="p-4 pb-2">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-[15px] text-gray-900">Author Name</span>
              <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>Just now</span>
              <span>·</span>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
          </div>
          <button type="button" className="text-gray-400 hover:bg-gray-100 p-2 rounded-full">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Post content */}
      <div className="px-4 pb-3">
        <p className="text-[15px] leading-5 whitespace-pre-wrap">
          {displayContent}
        </p>
        {shouldTruncate && (
          <button type="button" className="text-gray-500 text-[15px] hover:underline">
            See more
          </button>
        )}
      </div>

      {/* Hashtags */}
      {post.hashtags && post.hashtags.length > 0 && (
        <div className="px-4 pb-3">
          <span className="text-[15px] text-blue-600">
            {post.hashtags.map(h => `#${h}`).join(' ')}
          </span>
        </div>
      )}

      {/* Link preview card */}
      {post.link_url && (
        <div className="border-t border-b border-gray-200">
          <div className="h-40 bg-gray-100 flex items-center justify-center">
            <svg className="w-16 h-16 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="p-3 bg-gray-50">
            <p className="text-xs text-gray-500 uppercase truncate">
              {post.link_url.replace(/^https?:\/\//, '').split('/')[0]}
            </p>
            <p className="text-[15px] font-semibold text-gray-900 mt-1 line-clamp-2">
              Article Title Goes Here
            </p>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
              A brief description of the article content...
            </p>
          </div>
        </div>
      )}

      {/* Engagement stats */}
      <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 9h-3V6c0-.6-.4-1-1-1s-1 .4-1 1v4.1l-1.8-.5c-.4-.1-.8 0-1.1.3-.2.2-.3.5-.3.8 0 .2.1.4.2.5l3.5 4.5c.3.4.8.6 1.3.6h3.8c.8 0 1.4-.6 1.4-1.3V12c0-1.7-1.3-3-3-3z"/>
              </svg>
            </div>
            <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
          </div>
          <span className="ml-1">24</span>
        </div>
        <div>
          <span>8 comments</span>
          <span className="mx-2">·</span>
          <span>3 shares</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-1 border-t border-gray-200 flex justify-between">
        {[
          { label: 'Like', icon: 'M14 9h-3V6c0-.6-.4-1-1-1s-1 .4-1 1v4.1l-1.8-.5c-.4-.1-.8 0-1.1.3-.2.2-.3.5-.3.8 0 .2.1.4.2.5l3.5 4.5c.3.4.8.6 1.3.6h3.8c.8 0 1.4-.6 1.4-1.3V12c0-1.7-1.3-3-3-3z' },
          { label: 'Comment', icon: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' },
          { label: 'Share', icon: 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z' }
        ].map(action => (
          <button
            key={action.label}
            type="button"
            className="flex items-center gap-2 px-6 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium text-sm flex-1 justify-center"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d={action.icon} />
            </svg>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FacebookPreview;
