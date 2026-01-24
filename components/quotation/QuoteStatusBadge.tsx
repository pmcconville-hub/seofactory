/**
 * QuoteStatusBadge - Visual status indicator for quotes
 */

import React from 'react';
import { QuoteStatus } from '../../types/quotation';

interface QuoteStatusBadgeProps {
  status: QuoteStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig: Record<QuoteStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  draft: {
    label: 'Draft',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  },
  sent: {
    label: 'Sent',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
  },
  viewed: {
    label: 'Viewed',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  },
  accepted: {
    label: 'Accepted',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  expired: {
    label: 'Expired',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const QuoteStatusBadge: React.FC<QuoteStatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bgColor} ${config.color} ${sizeClasses[size]}`}
    >
      {showIcon && (
        <svg
          className={iconSizes[size]}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
        </svg>
      )}
      {config.label}
    </span>
  );
};

export default QuoteStatusBadge;
