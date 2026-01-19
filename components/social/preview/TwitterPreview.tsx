/**
 * TwitterPreview Component
 *
 * Renders an X/Twitter-style post preview mockup.
 * Supports both single tweets and threads.
 */

import React from 'react';
import type { SocialPost } from '../../../types/social';

interface TwitterPreviewProps {
  post: SocialPost;
  expanded?: boolean;
}

export const TwitterPreview: React.FC<TwitterPreviewProps> = ({
  post,
  expanded = false
}) => {
  const isThread = post.post_type === 'thread' && post.content_thread && post.content_thread.length > 1;
  const charLimit = 280;

  const renderTweet = (content: string, index?: number, total?: number) => {
    const isTruncated = !expanded && content.length > charLimit;
    const displayContent = isTruncated ? content.substring(0, charLimit) + '...' : content;

    return (
      <div className="bg-black text-white p-4 font-sans">
        {/* Thread indicator */}
        {index !== undefined && total !== undefined && (
          <div className="flex items-center mb-2">
            <div className="w-0.5 h-4 bg-gray-700 mr-3 ml-5" />
            <span className="text-xs text-gray-500">
              {index + 1}/{total}
            </span>
          </div>
        )}

        {/* Author header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm text-white">Author Name</span>
              <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.04 4.25l-3.75-3.75 1.41-1.41 2.34 2.34 5.09-5.09 1.41 1.41-6.5 6.5z"/>
              </svg>
              <span className="text-gray-500 text-sm">@author</span>
              <span className="text-gray-500 text-sm">·</span>
              <span className="text-gray-500 text-sm">1h</span>
            </div>

            {/* Tweet content */}
            <p className="text-[15px] leading-5 mt-1 whitespace-pre-wrap">
              {displayContent}
            </p>

            {/* Link preview card */}
            {post.link_url && index === undefined && (
              <div className="mt-3 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="h-32 bg-gray-900 flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="p-3 bg-gray-900">
                  <p className="text-xs text-gray-500 truncate">
                    {post.link_url.replace(/^https?:\/\//, '').split('/')[0]}
                  </p>
                  <p className="text-sm text-white truncate mt-0.5">
                    Article Title
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    Description preview text...
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-between mt-3 max-w-md">
              {[
                { icon: 'M14.046 2.242l-4.148-.01h-.002c-4.374 0-7.8 3.427-7.8 7.802 0 4.098 3.186 7.206 7.465 7.37v3.828c0 .108.044.286.12.403.142.225.384.347.632.347.138 0 .277-.038.402-.118 4.364-2.693 6.38-5.22 7.17-6.867C20.144 10.668 18.367 5.21 14.046 2.242zM10.686 16.13v-2.707c0-.322-.262-.584-.584-.584h-.348c-3.385 0-6.143-2.759-6.143-6.143 0-3.093 2.367-5.637 5.38-5.943h.002c3.795.006 6.804 3.149 6.643 6.943-.038.982-.34 1.93-.89 2.783-.566.882-1.432 1.79-2.572 2.692-.723.572-1.51 1.113-2.355 1.614l-.833.484v1.861z', count: 12 },
                { icon: 'M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z', count: 5 },
                { icon: 'M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12z', count: 42 },
                { icon: 'M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z', count: null },
                { icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2z', count: null }
              ].map((action, i) => (
                <button
                  key={i}
                  type="button"
                  className="flex items-center gap-1 text-gray-500 hover:text-blue-400 text-sm group"
                >
                  <div className="p-2 rounded-full group-hover:bg-blue-400/10">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d={action.icon} />
                    </svg>
                  </div>
                  {action.count && <span>{action.count}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isThread && post.content_thread) {
    const threadToShow = expanded
      ? post.content_thread
      : post.content_thread.slice(0, 2);

    return (
      <div className="divide-y divide-gray-800">
        {threadToShow.map((segment, i) => (
          <React.Fragment key={i}>
            {renderTweet(segment.text, i, post.content_thread!.length)}
          </React.Fragment>
        ))}
        {!expanded && post.content_thread.length > 2 && (
          <div className="bg-black text-center py-3">
            <span className="text-sm text-blue-400">
              +{post.content_thread.length - 2} more tweets in thread
            </span>
          </div>
        )}
      </div>
    );
  }

  return renderTweet(post.content_text);
};

export default TwitterPreview;
