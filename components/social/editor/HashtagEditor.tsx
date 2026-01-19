/**
 * HashtagEditor Component
 *
 * Manage hashtags for social posts with suggestions and validation.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { SocialMediaPlatform } from '../../../types/social';

interface HashtagEditorProps {
  hashtags: string[];
  onChange: (hashtags: string[]) => void;
  platform: SocialMediaPlatform;
  suggestions?: string[];
  maxHashtags?: number;
}

const PLATFORM_HASHTAG_LIMITS: Record<SocialMediaPlatform, number> = {
  linkedin: 5,
  twitter: 2,
  facebook: 3,
  instagram: 30, // Instagram allows up to 30 but 5-10 is recommended
  pinterest: 0   // Pinterest doesn't use hashtags
};

const PLATFORM_RECOMMENDATIONS: Record<SocialMediaPlatform, string> = {
  linkedin: 'Use 3-5 professional hashtags',
  twitter: 'Keep to 1-2 hashtags for best engagement',
  facebook: 'Use 2-3 relevant hashtags',
  instagram: 'Use 3-5 hashtags (up to 30 allowed)',
  pinterest: 'Pinterest uses keywords instead of hashtags'
};

export const HashtagEditor: React.FC<HashtagEditorProps> = ({
  hashtags,
  onChange,
  platform,
  suggestions = [],
  maxHashtags
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const limit = maxHashtags ?? PLATFORM_HASHTAG_LIMITS[platform];
  const recommendation = PLATFORM_RECOMMENDATIONS[platform];
  const isAtLimit = hashtags.length >= limit;

  // Filter out already-used suggestions
  const availableSuggestions = useMemo(() => {
    return suggestions.filter(s => !hashtags.includes(s.toLowerCase().replace(/^#/, '')));
  }, [suggestions, hashtags]);

  const normalizeHashtag = (tag: string): string => {
    // Remove # prefix, spaces, and special chars
    return tag
      .toLowerCase()
      .replace(/^#/, '')
      .replace(/[^a-z0-9_]/g, '')
      .trim();
  };

  const validateHashtag = (tag: string): string | null => {
    if (!tag) return 'Hashtag cannot be empty';
    if (tag.length < 2) return 'Hashtag too short';
    if (tag.length > 100) return 'Hashtag too long';
    if (hashtags.includes(tag)) return 'Hashtag already added';
    if (/^\d+$/.test(tag)) return 'Hashtag cannot be only numbers';
    return null;
  };

  const addHashtag = useCallback((rawTag: string) => {
    const tag = normalizeHashtag(rawTag);
    const validationError = validateHashtag(tag);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (isAtLimit) {
      setError(`Maximum ${limit} hashtags allowed for ${platform}`);
      return;
    }

    setError(null);
    onChange([...hashtags, tag]);
    setInputValue('');
  }, [hashtags, onChange, isAtLimit, limit, platform]);

  const removeHashtag = useCallback((tag: string) => {
    onChange(hashtags.filter(h => h !== tag));
    setError(null);
  }, [hashtags, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addHashtag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && hashtags.length > 0) {
      removeHashtag(hashtags[hashtags.length - 1]);
    }
  };

  // Pinterest doesn't use hashtags
  if (platform === 'pinterest') {
    return (
      <div className="text-sm text-gray-500 italic">
        {recommendation}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Input area */}
      <div className={`flex flex-wrap gap-2 p-2 bg-gray-900 border rounded-lg ${
        error ? 'border-red-500' : 'border-gray-600'
      } focus-within:border-blue-500 transition-colors`}>
        {/* Existing hashtags */}
        {hashtags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-sm"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeHashtag(tag)}
              className="hover:text-red-400 transition-colors"
              aria-label={`Remove hashtag ${tag}`}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}

        {/* Input */}
        {!isAtLimit && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) {
                addHashtag(inputValue);
              }
            }}
            placeholder={hashtags.length === 0 ? 'Add hashtags...' : ''}
            className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-white text-sm placeholder-gray-500"
          />
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Counter and recommendation */}
      <div className="flex items-center justify-between text-xs">
        <span className={`${
          isAtLimit ? 'text-yellow-400' : 'text-gray-500'
        }`}>
          {hashtags.length}/{limit} hashtags
        </span>
        <span className="text-gray-500">{recommendation}</span>
      </div>

      {/* Suggestions */}
      {availableSuggestions.length > 0 && !isAtLimit && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500 font-medium">Suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.slice(0, 10).map(suggestion => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addHashtag(suggestion)}
                className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs hover:bg-gray-700 hover:text-white transition-colors"
              >
                #{normalizeHashtag(suggestion)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HashtagEditor;
