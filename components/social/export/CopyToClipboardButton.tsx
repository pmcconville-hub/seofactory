/**
 * CopyToClipboardButton Component
 *
 * Button to copy social post content to clipboard.
 */

import React, { useState, useCallback } from 'react';
import type { SocialPost } from '../../../types/social';

interface CopyToClipboardButtonProps {
  post: SocialPost;
  includeHashtags?: boolean;
  includeLink?: boolean;
  variant?: 'button' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
  onCopy?: (success: boolean) => void;
}

export const CopyToClipboardButton: React.FC<CopyToClipboardButtonProps> = ({
  post,
  includeHashtags = true,
  includeLink = true,
  variant = 'button',
  size = 'md',
  onCopy
}) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const buildContent = useCallback(() => {
    let content = post.content_text;

    // Add hashtags
    if (includeHashtags && post.hashtags && post.hashtags.length > 0) {
      const hashtagStr = post.hashtags.map(h => `#${h}`).join(' ');
      // Check if hashtags already in content
      if (!content.includes(hashtagStr)) {
        content += '\n\n' + hashtagStr;
      }
    }

    // Add link
    if (includeLink && post.link_url) {
      content += '\n\n' + post.link_url;
    }

    return content.trim();
  }, [post, includeHashtags, includeLink]);

  const handleCopy = useCallback(async () => {
    const content = buildContent();

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      setError(false);
      onCopy?.(true);

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError(true);
      onCopy?.(false);

      setTimeout(() => setError(false), 2000);
    }
  }, [buildContent, onCopy]);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className={`p-1.5 rounded transition-colors ${
          copied
            ? 'text-green-400 bg-green-500/10'
            : error
              ? 'text-red-400 bg-red-500/10'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
        }`}
        title={copied ? 'Copied!' : error ? 'Failed to copy' : 'Copy to clipboard'}
      >
        {copied ? (
          <svg className={iconSizes[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" />
          </svg>
        ) : error ? (
          <svg className={iconSizes[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className={iconSizes[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
        )}
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className={`${sizeClasses[size]} ${
          copied
            ? 'text-green-400'
            : error
              ? 'text-red-400'
              : 'text-blue-400 hover:text-blue-300'
        }`}
      >
        {copied ? 'Copied!' : error ? 'Failed' : 'Copy'}
      </button>
    );
  }

  // Button variant
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center ${sizeClasses[size]} rounded-lg font-medium transition-colors ${
        copied
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : error
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600 hover:text-white'
      }`}
    >
      {copied ? (
        <>
          <svg className={iconSizes[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : error ? (
        <>
          <svg className={iconSizes[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
          Failed
        </>
      ) : (
        <>
          <svg className={iconSizes[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
};

export default CopyToClipboardButton;
