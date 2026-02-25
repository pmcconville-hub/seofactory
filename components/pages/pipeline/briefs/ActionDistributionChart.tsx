import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { ActionPlanStats } from '../../../../types/actionPlan';
import { ACTION_TYPE_CONFIGS } from '../../../../types/actionPlan';
import type { ActionType } from '../../../../types/actionPlan';

interface ActionDistributionChartProps {
  stats: ActionPlanStats;
}

const CHART_COLORS: Record<ActionType, string> = {
  CREATE_NEW: '#34d399',
  OPTIMIZE: '#60a5fa',
  REWRITE: '#fbbf24',
  KEEP: '#9ca3af',
  MERGE: '#a78bfa',
  REDIRECT_301: '#fb923c',
  PRUNE_410: '#f87171',
  CANONICALIZE: '#22d3ee',
};

export function ActionDistributionChart({ stats }: ActionDistributionChartProps) {
  const data = (Object.entries(stats.byAction) as [ActionType, number][])
    .filter(([, count]) => count > 0)
    .map(([action, count]) => ({
      name: ACTION_TYPE_CONFIGS[action].label,
      value: count,
      color: CHART_COLORS[action],
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        No actions assigned yet
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={35}
            outerRadius={65}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              fontSize: '12px',
              color: '#d1d5db',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }}
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
