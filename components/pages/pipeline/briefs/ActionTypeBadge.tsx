import React from 'react';
import type { ActionType } from '../../../../types/actionPlan';
import { ACTION_TYPE_CONFIGS } from '../../../../types/actionPlan';

interface ActionTypeBadgeProps {
  actionType: ActionType;
  size?: 'sm' | 'md';
}

export function ActionTypeBadge({ actionType, size = 'sm' }: ActionTypeBadgeProps) {
  const config = ACTION_TYPE_CONFIGS[actionType];
  if (!config) return null;

  const sizeClasses = size === 'sm'
    ? 'text-[9px] px-1.5 py-0.5'
    : 'text-xs px-2 py-1';

  return (
    <span className={`${sizeClasses} rounded border font-medium ${config.bgColor} ${config.color} ${config.borderColor}`}>
      {config.shortLabel}
    </span>
  );
}
