/**
 * HubSpokeVisualizer Component
 *
 * Visual diagram showing hub-spoke relationship between posts.
 */

import React from 'react';
import type { SocialPost, SocialMediaPlatform } from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG } from '../../../types/social';

interface HubSpokeVisualizerProps {
  posts: SocialPost[];
  onPostClick?: (post: SocialPost) => void;
  selectedPostId?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const HubSpokeVisualizer: React.FC<HubSpokeVisualizerProps> = ({
  posts,
  onPostClick,
  selectedPostId,
  size = 'md'
}) => {
  const hubPost = posts.find(p => p.is_hub);
  const spokePosts = posts.filter(p => !p.is_hub).sort((a, b) =>
    (a.spoke_position || 0) - (b.spoke_position || 0)
  );

  // Size configurations
  const sizeConfig = {
    sm: { containerSize: 200, hubSize: 60, spokeSize: 36, radius: 70 },
    md: { containerSize: 300, hubSize: 80, spokeSize: 48, radius: 100 },
    lg: { containerSize: 400, hubSize: 100, spokeSize: 60, radius: 140 }
  };

  const config = sizeConfig[size];
  const center = config.containerSize / 2;

  // Calculate spoke positions in a circle
  const getSpokenPosition = (index: number, total: number): { x: number; y: number } => {
    const angle = (2 * Math.PI * index) / total - Math.PI / 2; // Start from top
    return {
      x: center + config.radius * Math.cos(angle),
      y: center + config.radius * Math.sin(angle)
    };
  };

  const renderPost = (post: SocialPost, x: number, y: number, isHub: boolean) => {
    const postConfig = SOCIAL_PLATFORM_CONFIG[post.platform];
    const postSize = isHub ? config.hubSize : config.spokeSize;
    const isSelected = post.id === selectedPostId;

    return (
      <g key={post.id}>
        {/* Connection line to hub (only for spokes) */}
        {!isHub && hubPost && (
          <line
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke={isSelected ? '#3b82f6' : '#374151'}
            strokeWidth={isSelected ? 2 : 1}
            strokeDasharray={post.semantic_distance_from_hub && post.semantic_distance_from_hub > 0.5 ? '4,4' : undefined}
          />
        )}

        {/* Post circle */}
        <g
          transform={`translate(${x - postSize / 2}, ${y - postSize / 2})`}
          onClick={() => onPostClick?.(post)}
          className={onPostClick ? 'cursor-pointer' : ''}
        >
          {/* Background circle */}
          <rect
            width={postSize}
            height={postSize}
            rx={isHub ? postSize / 4 : postSize / 2}
            fill={isSelected ? '#1e3a5f' : '#1f2937'}
            stroke={isSelected ? '#3b82f6' : isHub ? postConfig.color : '#374151'}
            strokeWidth={isSelected ? 2 : isHub ? 3 : 1}
          />

          {/* Platform color indicator */}
          <rect
            y={postSize - 6}
            width={postSize}
            height={6}
            rx={3}
            fill={postConfig.color}
          />

          {/* Platform letter */}
          <text
            x={postSize / 2}
            y={postSize / 2 - 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={isHub ? 16 : 12}
            fontWeight="bold"
          >
            {postConfig.name.charAt(0)}
          </text>

          {/* Hub badge */}
          {isHub && (
            <g transform={`translate(${postSize - 12}, -4)`}>
              <circle r={10} fill="#3b82f6" />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={8}
                fontWeight="bold"
              >
                H
              </text>
            </g>
          )}

          {/* Spoke number */}
          {!isHub && post.spoke_position && (
            <g transform={`translate(${postSize - 8}, -4)`}>
              <circle r={8} fill="#6b7280" />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={8}
              >
                {post.spoke_position}
              </text>
            </g>
          )}
        </g>
      </g>
    );
  };

  return (
    <div className="relative">
      <svg
        width={config.containerSize}
        height={config.containerSize}
        className="mx-auto"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={config.radius + config.spokeSize / 2 + 10}
          fill="none"
          stroke="#1f2937"
          strokeDasharray="4,4"
        />

        {/* Render spokes first (so lines are behind) */}
        {spokePosts.map((post, index) => {
          const pos = getSpokenPosition(index, spokePosts.length);
          return renderPost(post, pos.x, pos.y, false);
        })}

        {/* Render hub on top */}
        {hubPost && renderPost(hubPost, center, center, true)}

        {/* No hub placeholder */}
        {!hubPost && (
          <g>
            <circle
              cx={center}
              cy={center}
              r={config.hubSize / 2}
              fill="#1f2937"
              stroke="#374151"
              strokeDasharray="4,4"
            />
            <text
              x={center}
              y={center}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#6b7280"
              fontSize={10}
            >
              No Hub
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-blue-600" />
          <span className="text-xs text-gray-400">Hub Post</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-600" />
          <span className="text-xs text-gray-400">Spoke Post</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 border-t-2 border-dashed border-gray-500" />
          <span className="text-xs text-gray-400">High Distance</span>
        </div>
      </div>
    </div>
  );
};

export default HubSpokeVisualizer;
