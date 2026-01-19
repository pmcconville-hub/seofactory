/**
 * CampaignCard Component
 *
 * Card displaying a social campaign summary.
 */

import React from 'react';
import type { SocialCampaign, SocialPost, SocialMediaPlatform } from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG, TARGET_COMPLIANCE_SCORE } from '../../../types/social';

interface CampaignCardProps {
  campaign: SocialCampaign;
  posts: SocialPost[];
  onClick?: () => void;
  onExport?: () => void;
  compact?: boolean;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Draft' },
  ready: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Ready' },
  exported: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Exported' },
  partially_posted: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Partial' },
  completed: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Complete' }
};

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  posts,
  onClick,
  onExport,
  compact = false
}) => {
  const hubPost = posts.find(p => p.is_hub);
  const spokePosts = posts.filter(p => !p.is_hub);

  // Get unique platforms
  const platforms = [...new Set(posts.map(p => p.platform))];

  // Group posts by platform
  const postsByPlatform = posts.reduce((acc, post) => {
    if (!acc[post.platform]) acc[post.platform] = [];
    acc[post.platform].push(post);
    return acc;
  }, {} as Record<SocialMediaPlatform, SocialPost[]>);

  const statusStyle = STATUS_STYLES[campaign.status] || STATUS_STYLES.draft;
  const complianceScore = campaign.overall_compliance_score || 0;
  const isGoodCompliance = complianceScore >= TARGET_COMPLIANCE_SCORE;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">
              {campaign.campaign_name || 'Untitled Campaign'}
            </p>
            <p className="text-xs text-gray-500">
              {posts.length} posts • {platforms.length} platforms
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white truncate">
                {campaign.campaign_name || 'Untitled Campaign'}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                {statusStyle.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Created {new Date(campaign.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Compliance badge */}
          {complianceScore > 0 && (
            <div className={`text-right ${isGoodCompliance ? 'text-green-400' : 'text-yellow-400'}`}>
              <span className="text-lg font-bold">{Math.round(complianceScore)}%</span>
              <p className="text-xs opacity-70">Compliance</p>
            </div>
          )}
        </div>
      </div>

      {/* Platform breakdown */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex flex-wrap gap-2">
          {platforms.map(platform => {
            const config = SOCIAL_PLATFORM_CONFIG[platform];
            const platformPosts = postsByPlatform[platform] || [];
            const hasHub = platformPosts.some(p => p.is_hub);

            return (
              <div
                key={platform}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-700/50"
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center"
                  style={{ backgroundColor: config.color }}
                >
                  <span className="text-white text-[10px] font-bold">
                    {config.name.charAt(0)}
                  </span>
                </div>
                <span className="text-xs text-gray-300">
                  {platformPosts.length}
                </span>
                {hasHub && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1 rounded">
                    Hub
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-lg font-bold text-white">{posts.length}</p>
          <p className="text-xs text-gray-500">Total Posts</p>
        </div>
        <div>
          <p className="text-lg font-bold text-white">{hubPost ? 1 : 0}</p>
          <p className="text-xs text-gray-500">Hub Post</p>
        </div>
        <div>
          <p className="text-lg font-bold text-white">{spokePosts.length}</p>
          <p className="text-xs text-gray-500">Spoke Posts</p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 flex gap-2">
        <button
          type="button"
          onClick={onClick}
          className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
        >
          View Campaign
        </button>
        {onExport && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExport();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Export
          </button>
        )}
      </div>

      {/* UTM preview */}
      {campaign.utm_campaign && (
        <div className="px-4 pb-4">
          <p className="text-[10px] text-gray-500">
            UTM: {campaign.utm_campaign}
          </p>
        </div>
      )}
    </div>
  );
};

export default CampaignCard;
