/**
 * PinterestPreview Component
 *
 * Renders a Pinterest-style pin preview mockup.
 */

import React from 'react';
import type { SocialPost } from '../../../types/social';

interface PinterestPreviewProps {
  post: SocialPost;
  expanded?: boolean;
}

export const PinterestPreview: React.FC<PinterestPreviewProps> = ({
  post,
  expanded = false
}) => {
  const previewLimit = 100; // Pinterest shows ~100 chars in preview
  const content = post.content_text;
  const shouldTruncate = !expanded && content.length > previewLimit;
  const displayContent = shouldTruncate
    ? content.substring(0, previewLimit) + '...'
    : content;

  return (
    <div className="bg-white rounded-xl overflow-hidden font-sans max-w-xs mx-auto">
      {/* Pin image - 2:3 aspect ratio */}
      <div className="relative aspect-[2/3] bg-gray-100 flex items-center justify-center">
        {/* Save button */}
        <div className="absolute top-3 right-3">
          <button
            type="button"
            className="bg-red-600 text-white px-4 py-2 rounded-full font-semibold text-sm hover:bg-red-700"
          >
            Save
          </button>
        </div>

        {/* Image placeholder */}
        <div className="text-center px-4">
          <svg className="w-16 h-16 text-gray-300 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {post.image_instructions && (
            <p className="text-gray-400 text-xs mt-2 line-clamp-3">
              {post.image_instructions.description}
            </p>
          )}
          <p className="text-gray-300 text-[10px] mt-2">
            1000 x 1500 px (2:3)
          </p>
        </div>

        {/* Bottom actions overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow"
          >
            <svg className="w-4 h-4 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow"
          >
            <svg className="w-4 h-4 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow"
          >
            <svg className="w-4 h-4 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Pin details */}
      <div className="p-4">
        {/* Title (first line of content or explicit title) */}
        <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-2">
          {content.split('\n')[0]}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed">
          {displayContent}
        </p>
        {shouldTruncate && (
          <button type="button" className="text-gray-500 text-sm font-medium mt-1">
            More
          </button>
        )}

        {/* Link source */}
        {post.link_url && (
          <div className="mt-3 flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
            <span className="text-xs text-gray-500 truncate flex-1">
              {post.link_url.replace(/^https?:\/\//, '').split('/')[0]}
            </span>
          </div>
        )}

        {/* Author */}
        <div className="mt-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
            <span className="text-white text-xs font-semibold">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Author Name</p>
            <p className="text-xs text-gray-500">1.2k followers</p>
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium text-gray-900"
          >
            Follow
          </button>
        </div>
      </div>

      {/* Comments section */}
      <div className="px-4 pb-4 border-t border-gray-100 pt-3">
        <p className="text-sm text-gray-500">
          5 comments
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200" />
          <input
            type="text"
            placeholder="Add a comment"
            className="flex-1 text-sm bg-gray-100 rounded-full px-4 py-2 focus:outline-none"
            disabled
          />
        </div>
      </div>
    </div>
  );
};

export default PinterestPreview;
