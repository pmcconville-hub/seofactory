/**
 * CharacterCounter Component
 *
 * Platform-aware character limit indicator for social posts.
 */

import React from 'react';
import type { SocialMediaPlatform } from '../../../types/social';

interface CharacterCounterProps {
  current: number;
  limit: number;
  platform?: SocialMediaPlatform;
  showWarningAt?: number; // Percentage at which to show warning color
}

const PLATFORM_LIMITS: Record<SocialMediaPlatform, { main: number; preview?: number }> = {
  linkedin: { main: 3000, preview: 210 },
  twitter: { main: 280 },
  facebook: { main: 63206, preview: 80 },
  instagram: { main: 2200, preview: 125 },
  pinterest: { main: 500, preview: 100 }
};

export const CharacterCounter: React.FC<CharacterCounterProps> = ({
  current,
  limit,
  platform,
  showWarningAt = 90
}) => {
  const percentage = (current / limit) * 100;
  const remaining = limit - current;
  const isOverLimit = current > limit;
  const isNearLimit = percentage >= showWarningAt;

  // Determine color based on status
  const getColor = () => {
    if (isOverLimit) return 'text-red-400';
    if (isNearLimit) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getProgressColor = () => {
    if (isOverLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  // Get platform preview limit info
  const platformInfo = platform ? PLATFORM_LIMITS[platform] : null;

  return (
    <div className="flex items-center gap-3">
      {/* Progress bar */}
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${getProgressColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Counter */}
      <div className={`text-sm font-medium ${getColor()} min-w-[80px] text-right`}>
        {current.toLocaleString()}/{limit.toLocaleString()}
      </div>

      {/* Remaining indicator */}
      {isOverLimit ? (
        <span className="text-xs text-red-400 font-medium">
          -{Math.abs(remaining).toLocaleString()} over
        </span>
      ) : remaining <= 50 && remaining > 0 ? (
        <span className="text-xs text-yellow-400">
          {remaining} left
        </span>
      ) : null}

      {/* Preview truncation warning */}
      {platformInfo?.preview && current > platformInfo.preview && !isOverLimit && (
        <span className="text-xs text-gray-500">
          (preview truncated)
        </span>
      )}
    </div>
  );
};

/**
 * Compact inline counter variant
 */
export const CharacterCounterInline: React.FC<CharacterCounterProps> = ({
  current,
  limit
}) => {
  const isOverLimit = current > limit;
  const percentage = (current / limit) * 100;
  const isNearLimit = percentage >= 90;

  return (
    <span className={`text-xs font-medium ${
      isOverLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-gray-500'
    }`}>
      {current}/{limit}
    </span>
  );
};

/**
 * Circle progress counter variant
 */
export const CharacterCounterCircle: React.FC<CharacterCounterProps & { size?: number }> = ({
  current,
  limit,
  size = 32
}) => {
  const percentage = Math.min((current / limit) * 100, 100);
  const isOverLimit = current > limit;
  const isNearLimit = percentage >= 90;
  const remaining = limit - current;

  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (isOverLimit) return '#f87171'; // red-400
    if (isNearLimit) return '#facc15'; // yellow-400
    return '#3b82f6'; // blue-500
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth="3"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isOverLimit ? (
          <span className="text-[10px] text-red-400 font-bold">!</span>
        ) : remaining <= 20 ? (
          <span className={`text-[10px] font-medium ${isNearLimit ? 'text-yellow-400' : 'text-gray-400'}`}>
            {remaining}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default CharacterCounter;
