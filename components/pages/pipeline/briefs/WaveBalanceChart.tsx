import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { ActionPlanStats } from '../../../../types/actionPlan';

interface WaveBalanceChartProps {
  stats: ActionPlanStats;
}

export function WaveBalanceChart({ stats }: WaveBalanceChartProps) {
  const waveNumbers = Object.keys(stats.byWave).map(Number).sort((a, b) => a - b);
  const data = waveNumbers.map(wave => ({
    name: `Wave ${wave}`,
    'Create New': stats.byWaveAndAction[wave]?.CREATE_NEW ?? 0,
    'Optimize': stats.byWaveAndAction[wave]?.OPTIMIZE ?? 0,
    'Rewrite': stats.byWaveAndAction[wave]?.REWRITE ?? 0,
    'Other': (stats.byWave[wave] ?? 0)
      - (stats.byWaveAndAction[wave]?.CREATE_NEW ?? 0)
      - (stats.byWaveAndAction[wave]?.OPTIMIZE ?? 0)
      - (stats.byWaveAndAction[wave]?.REWRITE ?? 0),
  }));

  // Check for imbalance: warn if any wave has >50% of total
  const maxWave = Math.max(...Object.values(stats.byWave));
  const isImbalanced = stats.total > 0 && maxWave > stats.total * 0.5;

  return (
    <div>
      {isImbalanced && (
        <div className="mb-2 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="text-[10px] text-amber-400">
            Wave distribution is imbalanced. Consider using Rebalance.
          </span>
        </div>
      )}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={25}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                fontSize: '11px',
                color: '#d1d5db',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '10px' }} iconSize={8} />
            <Bar dataKey="Create New" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Optimize" stackId="a" fill="#60a5fa" />
            <Bar dataKey="Rewrite" stackId="a" fill="#fbbf24" />
            <Bar dataKey="Other" stackId="a" fill="#6b7280" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
