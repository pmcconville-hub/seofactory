/**
 * CampaignStatusBadge Component
 *
 * Display campaign status with appropriate styling.
 */

import React from 'react';
import type { SocialCampaignStatus } from '../../../types/social';

interface CampaignStatusBadgeProps {
  status: SocialCampaignStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<SocialCampaignStatus, {
  label: string;
  bgColor: string;
  textColor: string;
  icon: React.ReactNode;
}> = {
  draft: {
    label: 'Draft',
    bgColor: 'bg-gray-500/20',
    textColor: 'text-gray-400',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    )
  },
  ready: {
    label: 'Ready',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  exported: {
    label: 'Exported',
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-400',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
    )
  },
  partially_posted: {
    label: 'Partial',
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-400',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    )
  },
  completed: {
    label: 'Complete',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-400',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
    )
  }
};

const SIZE_CLASSES = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-3 py-1'
};

export const CampaignStatusBadge: React.FC<CampaignStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = false
}) => {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${config.bgColor} ${config.textColor} ${SIZE_CLASSES[size]}`}
    >
      {showIcon && config.icon}
      {config.label}
    </span>
  );
};

/**
 * Post status badge
 */
interface PostStatusBadgeProps {
  status: 'draft' | 'ready' | 'exported' | 'posted';
  size?: 'sm' | 'md' | 'lg';
}

const POST_STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  draft: { label: 'Draft', bgColor: 'bg-gray-500/20', textColor: 'text-gray-400' },
  ready: { label: 'Ready', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  exported: { label: 'Exported', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
  posted: { label: 'Posted', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400' }
};

export const PostStatusBadge: React.FC<PostStatusBadgeProps> = ({
  status,
  size = 'md'
}) => {
  const config = POST_STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center rounded font-medium ${config.bgColor} ${config.textColor} ${SIZE_CLASSES[size]}`}
    >
      {config.label}
    </span>
  );
};

/**
 * Hub/Spoke badge
 */
interface HubSpokeBadgeProps {
  isHub: boolean;
  spokePosition?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const HubSpokeBadge: React.FC<HubSpokeBadgeProps> = ({
  isHub,
  spokePosition,
  size = 'md'
}) => {
  if (isHub) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded font-medium bg-blue-500/20 text-blue-400 ${SIZE_CLASSES[size]}`}
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        Hub
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium bg-gray-500/20 text-gray-400 ${SIZE_CLASSES[size]}`}
    >
      Spoke {spokePosition && `#${spokePosition}`}
    </span>
  );
};

/**
 * Compliance score badge
 */
interface ComplianceScoreBadgeProps {
  score: number;
  target?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const ComplianceScoreBadge: React.FC<ComplianceScoreBadgeProps> = ({
  score,
  target = 85,
  size = 'md'
}) => {
  const isGood = score >= target;
  const isWarning = score >= target - 15 && score < target;

  let colorClasses: string;
  if (isGood) {
    colorClasses = 'bg-green-500/20 text-green-400';
  } else if (isWarning) {
    colorClasses = 'bg-yellow-500/20 text-yellow-400';
  } else {
    colorClasses = 'bg-red-500/20 text-red-400';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${colorClasses} ${SIZE_CLASSES[size]}`}
    >
      {Math.round(score)}%
    </span>
  );
};

export default CampaignStatusBadge;
