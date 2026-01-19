/**
 * InstagramPreview Component
 *
 * Renders an Instagram-style post preview mockup.
 * Supports single posts and carousels.
 */

import React, { useState } from 'react';
import type { SocialPost } from '../../../types/social';

interface InstagramPreviewProps {
  post: SocialPost;
  expanded?: boolean;
}

export const InstagramPreview: React.FC<InstagramPreviewProps> = ({
  post,
  expanded = false
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const previewLimit = 125; // Instagram shows ~125 chars before "...more"
  const content = post.content_text;
  const shouldTruncate = !expanded && content.length > previewLimit;
  const displayContent = shouldTruncate
    ? content.substring(0, previewLimit) + '...'
    : content;

  const isCarousel = post.post_type === 'carousel';
  const slideCount = isCarousel ? 10 : 1; // Default carousel assumption

  return (
    <div className="bg-black text-white font-sans">
      {/* Header */}
      <div className="p-3 flex items-center gap-3 border-b border-gray-800">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-0.5">
          <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
            <span className="text-white text-xs font-semibold">A</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">author_name</p>
        </div>
        <button type="button" className="text-white">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </button>
      </div>

      {/* Image area */}
      <div className="relative aspect-[4/5] bg-gray-900 flex items-center justify-center">
        {/* Carousel navigation */}
        {isCarousel && (
          <>
            <button
              type="button"
              onClick={() => setCurrentSlide(s => Math.max(0, s - 1))}
              disabled={currentSlide === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center disabled:opacity-30 z-10"
            >
              <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setCurrentSlide(s => Math.min(slideCount - 1, s + 1))}
              disabled={currentSlide === slideCount - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center disabled:opacity-30 z-10"
            >
              <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* Image placeholder */}
        <div className="text-center">
          <svg className="w-20 h-20 text-gray-700 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {isCarousel && (
            <p className="text-gray-500 text-sm mt-2">
              Slide {currentSlide + 1} of {slideCount}
            </p>
          )}
          {post.image_instructions && (
            <p className="text-gray-600 text-xs mt-2 px-4 line-clamp-2">
              {post.image_instructions.description}
            </p>
          )}
        </div>

        {/* Carousel dots */}
        {isCarousel && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
            {Array.from({ length: Math.min(slideCount, 5) }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentSlide ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              />
            ))}
            {slideCount > 5 && (
              <span className="text-xs text-gray-500">+{slideCount - 5}</span>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button type="button">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          <button type="button">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          <button type="button">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
        <button type="button">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>

      {/* Likes */}
      <div className="px-3 pb-2">
        <p className="text-sm font-semibold">1,234 likes</p>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-sm">
          <span className="font-semibold">author_name</span>{' '}
          <span className="whitespace-pre-wrap">{displayContent}</span>
        </p>
        {shouldTruncate && (
          <button type="button" className="text-gray-500 text-sm">
            more
          </button>
        )}
      </div>

      {/* Hashtags - often in a separate section on Instagram */}
      {post.hashtags && post.hashtags.length > 0 && expanded && (
        <div className="px-3 pb-3">
          <p className="text-sm text-blue-400">
            {post.hashtags.map(h => `#${h}`).join(' ')}
          </p>
        </div>
      )}

      {/* Comments preview */}
      <div className="px-3 pb-3">
        <button type="button" className="text-gray-500 text-sm">
          View all 42 comments
        </button>
      </div>

      {/* Timestamp */}
      <div className="px-3 pb-3">
        <p className="text-xs text-gray-500 uppercase">Just now</p>
      </div>
    </div>
  );
};

export default InstagramPreview;
