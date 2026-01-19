/**
 * CampaignList Component
 *
 * List of social campaigns for a topic.
 */

import React, { useState } from 'react';
import type { SocialCampaign, SocialPost, SocialCampaignStatus } from '../../../types/social';
import { CampaignCard } from './CampaignCard';

interface CampaignListProps {
  campaigns: Array<{ campaign: SocialCampaign; posts: SocialPost[] }>;
  onSelect?: (campaign: SocialCampaign) => void;
  onExport?: (campaign: SocialCampaign, posts: SocialPost[]) => void;
  onCreateNew?: () => void;
  emptyMessage?: string;
}

export const CampaignList: React.FC<CampaignListProps> = ({
  campaigns,
  onSelect,
  onExport,
  onCreateNew,
  emptyMessage = 'No social campaigns yet'
}) => {
  const [filter, setFilter] = useState<SocialCampaignStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'score'>('recent');

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(({ campaign }) => {
    if (filter === 'all') return true;
    return campaign.status === filter;
  });

  // Sort campaigns
  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    if (sortBy === 'score') {
      return (b.campaign.overall_compliance_score || 0) - (a.campaign.overall_compliance_score || 0);
    }
    return new Date(b.campaign.created_at).getTime() - new Date(a.campaign.created_at).getTime();
  });

  // Status counts
  const statusCounts = campaigns.reduce((acc, { campaign }) => {
    acc[campaign.status] = (acc[campaign.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </div>
        <p className="text-gray-400 mb-4">{emptyMessage}</p>
        {onCreateNew && (
          <button
            type="button"
            onClick={onCreateNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Campaign
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Filter:</span>
          <div className="flex gap-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'draft', label: 'Draft' },
              { key: 'ready', label: 'Ready' },
              { key: 'exported', label: 'Exported' }
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key as SocialCampaignStatus | 'all')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {label}
                {key !== 'all' && statusCounts[key] > 0 && (
                  <span className="ml-1 text-[10px] opacity-70">({statusCounts[key]})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-xs bg-gray-700 border-none rounded px-2 py-1 text-gray-300"
          >
            <option value="recent">Most Recent</option>
            <option value="score">Compliance Score</option>
          </select>
        </div>
      </div>

      {/* Campaign grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedCampaigns.map(({ campaign, posts }) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            posts={posts}
            onClick={() => onSelect?.(campaign)}
            onExport={() => onExport?.(campaign, posts)}
          />
        ))}
      </div>

      {/* Create new button */}
      {onCreateNew && (
        <div className="text-center pt-4">
          <button
            type="button"
            onClick={onCreateNew}
            className="px-4 py-2 border border-dashed border-gray-600 text-gray-400 rounded-lg hover:border-gray-500 hover:text-white transition-colors"
          >
            + Create New Campaign
          </button>
        </div>
      )}
    </div>
  );
};

export default CampaignList;
