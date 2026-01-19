/**
 * ThreadEditor Component
 *
 * Editor for X/Twitter threads with segment management.
 */

import React, { useState, useCallback } from 'react';
import type { ThreadSegment } from '../../../types/social';
import { CharacterCounterCircle } from './CharacterCounter';

interface ThreadEditorProps {
  segments: ThreadSegment[];
  onChange: (segments: ThreadSegment[]) => void;
  maxSegments?: number;
  charLimit?: number;
}

const TWITTER_CHAR_LIMIT = 280;

export const ThreadEditor: React.FC<ThreadEditorProps> = ({
  segments,
  onChange,
  maxSegments = 25,
  charLimit = TWITTER_CHAR_LIMIT
}) => {
  const [activeSegment, setActiveSegment] = useState(0);

  const updateSegment = useCallback((index: number, text: string) => {
    const updated = segments.map((s, i) =>
      i === index ? { ...s, text } : s
    );
    onChange(updated);
  }, [segments, onChange]);

  const addSegment = useCallback(() => {
    if (segments.length >= maxSegments) return;

    const newSegment: ThreadSegment = {
      index: segments.length,
      text: ''
    };
    onChange([...segments, newSegment]);
    setActiveSegment(segments.length);
  }, [segments, onChange, maxSegments]);

  const removeSegment = useCallback((index: number) => {
    if (segments.length <= 1) return;

    const updated = segments
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, index: i }));

    onChange(updated);
    setActiveSegment(Math.max(0, Math.min(activeSegment, updated.length - 1)));
  }, [segments, onChange, activeSegment]);

  const moveSegment = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= segments.length) return;

    const updated = [...segments];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((s, i) => s.index = i);

    onChange(updated);
    setActiveSegment(newIndex);
  }, [segments, onChange]);

  const splitSegment = useCallback((index: number) => {
    const segment = segments[index];
    if (!segment || segment.text.length <= charLimit) return;

    // Find a good split point (sentence or word boundary)
    const text = segment.text;
    let splitPoint = charLimit;

    // Try to find sentence boundary
    for (let i = charLimit; i > charLimit / 2; i--) {
      if (['.', '!', '?', '\n'].includes(text[i])) {
        splitPoint = i + 1;
        break;
      }
    }

    // Fallback to word boundary
    if (splitPoint === charLimit) {
      for (let i = charLimit; i > charLimit / 2; i--) {
        if (text[i] === ' ') {
          splitPoint = i;
          break;
        }
      }
    }

    const firstPart = text.substring(0, splitPoint).trim();
    const secondPart = text.substring(splitPoint).trim();

    const updated = [
      ...segments.slice(0, index),
      { ...segment, text: firstPart },
      { index: index + 1, text: secondPart },
      ...segments.slice(index + 1).map(s => ({ ...s, index: s.index + 1 }))
    ];

    onChange(updated);
  }, [segments, onChange, charLimit]);

  // Calculate total thread length and character stats
  const totalChars = segments.reduce((sum, s) => sum + s.text.length, 0);
  const overLimitSegments = segments.filter(s => s.text.length > charLimit).length;

  return (
    <div className="space-y-4">
      {/* Thread overview */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-300">
            Thread ({segments.length} tweets)
          </span>
          {overLimitSegments > 0 && (
            <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
              {overLimitSegments} over limit
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {totalChars.toLocaleString()} total characters
        </span>
      </div>

      {/* Segment list */}
      <div className="space-y-2">
        {segments.map((segment, index) => {
          const isOverLimit = segment.text.length > charLimit;
          const isActive = index === activeSegment;

          return (
            <div
              key={index}
              className={`rounded-lg border transition-all ${
                isActive
                  ? 'border-blue-500 bg-gray-800'
                  : isOverLimit
                    ? 'border-red-500/50 bg-gray-900'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
              }`}
            >
              {/* Segment header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400">
                    {index + 1}/{segments.length}
                  </span>
                  {index === 0 && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                      Thread start
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Character counter */}
                  <CharacterCounterCircle
                    current={segment.text.length}
                    limit={charLimit}
                    size={24}
                  />

                  {/* Split button for over-limit segments */}
                  {isOverLimit && (
                    <button
                      type="button"
                      onClick={() => splitSegment(index)}
                      className="p-1 text-yellow-400 hover:bg-yellow-500/10 rounded"
                      title="Split into multiple tweets"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01" />
                      </svg>
                    </button>
                  )}

                  {/* Move up */}
                  <button
                    type="button"
                    onClick={() => moveSegment(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rounded"
                    title="Move up"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 15l7-7 7 7" />
                    </svg>
                  </button>

                  {/* Move down */}
                  <button
                    type="button"
                    onClick={() => moveSegment(index, 'down')}
                    disabled={index === segments.length - 1}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rounded"
                    title="Move down"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => removeSegment(index)}
                    disabled={segments.length <= 1}
                    className="p-1 text-gray-400 hover:text-red-400 disabled:opacity-30 rounded"
                    title="Remove tweet"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Segment content */}
              <div className="p-3">
                <textarea
                  value={segment.text}
                  onChange={(e) => updateSegment(index, e.target.value)}
                  onFocus={() => setActiveSegment(index)}
                  placeholder={index === 0 ? 'Start your thread...' : 'Continue your thread...'}
                  className={`w-full bg-transparent border-none outline-none text-white text-sm resize-none placeholder-gray-500 ${
                    isOverLimit ? 'text-red-300' : ''
                  }`}
                  rows={4}
                />

                {/* Character count text */}
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${
                    isOverLimit ? 'text-red-400' : 'text-gray-500'
                  }`}>
                    {segment.text.length}/{charLimit}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add segment button */}
      {segments.length < maxSegments && (
        <button
          type="button"
          onClick={addSegment}
          className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          Add tweet to thread
        </button>
      )}

      {/* Tips */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>Tips for better threads:</p>
        <ul className="list-disc list-inside space-y-0.5 text-gray-600">
          <li>Hook readers with a strong first tweet</li>
          <li>Number your tweets for easy navigation (1/10, 2/10...)</li>
          <li>End with a call-to-action or summary</li>
          <li>Use 1-2 hashtags only in the first tweet</li>
        </ul>
      </div>
    </div>
  );
};

export default ThreadEditor;
