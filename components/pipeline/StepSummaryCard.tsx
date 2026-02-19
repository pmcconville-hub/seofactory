import React from 'react';

// ──── Types ────

interface MetricItem {
  label: string;
  value: string | number;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'gray';
}

interface StepSummaryCardProps {
  title: string;
  metrics: MetricItem[];
  children?: React.ReactNode;
}

// ──── Color mapping ────

const VALUE_COLOR_MAP: Record<string, string> = {
  green: 'text-green-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  gray: 'text-gray-400',
};

// ──── Component ────

const StepSummaryCard: React.FC<StepSummaryCardProps> = ({ title, metrics, children }) => {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-300 mb-3">{title}</h4>

      <div className="flex flex-wrap gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-[80px]">
            <div className={`text-lg font-bold ${VALUE_COLOR_MAP[metric.color ?? 'gray']}`}>
              {metric.value}
            </div>
            <div className="text-xs text-gray-500">{metric.label}</div>
          </div>
        ))}
      </div>

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
};

export default StepSummaryCard;
