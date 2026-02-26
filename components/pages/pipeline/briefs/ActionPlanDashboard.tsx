import React from 'react';
import type { ActionPlanStats, ActionPlan } from '../../../../types/actionPlan';
import { ActionDistributionChart } from './ActionDistributionChart';
import { WaveBalanceChart } from './WaveBalanceChart';
import { StrategicRationaleCard } from './StrategicRationaleCard';

interface ActionPlanDashboardProps {
  actionPlan: ActionPlan | null;
  stats: ActionPlanStats;
  isGenerating: boolean;
  generationProgress: string;
  onGenerate: () => void;
  onReset: () => void;
  topicCount: number;
}

function QuickStatCard({ label, value, color = 'gray' }: {
  label: string;
  value: string | number;
  color?: 'emerald' | 'blue' | 'amber' | 'red' | 'gray' | 'purple';
}) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    gray: 'text-gray-400',
    purple: 'text-purple-400',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-semibold ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

export function ActionPlanDashboard({
  actionPlan,
  stats,
  isGenerating,
  generationProgress,
  onGenerate,
  onReset,
  topicCount,
}: ActionPlanDashboardProps) {
  const hasData = actionPlan && actionPlan.status !== 'draft';
  const isApproved = actionPlan?.status === 'approved';

  return (
    <div className="space-y-4">
      {/* Header with generate button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Strategic Action Plan</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {hasData
              ? `${stats.total} pages planned across ${actionPlan?.waveDefinitions?.length ?? Object.keys(stats.byWave).length} waves`
              : `${topicCount} topics ready for strategic analysis`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasData && !isApproved && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Reset
            </button>
          )}
          {!hasData && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating || topicCount === 0}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-medium px-4 py-2 rounded-md transition-colors"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Generate Action Plan
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Generation progress */}
      {isGenerating && generationProgress && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 flex items-center gap-2">
          <svg className="animate-spin w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-xs text-blue-300">{generationProgress}</p>
        </div>
      )}

      {/* Dashboard content */}
      {hasData && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickStatCard
              label="Total Pages"
              value={stats.total}
              color="gray"
            />
            <QuickStatCard
              label="New Pages"
              value={stats.newPages}
              color="emerald"
            />
            <QuickStatCard
              label="Optimize Existing"
              value={stats.existingPages}
              color="blue"
            />
            <QuickStatCard
              label="Remove / Redirect"
              value={stats.removals}
              color={stats.removals > 0 ? 'red' : 'gray'}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Action Distribution
              </h4>
              <ActionDistributionChart stats={stats} />
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Wave Balance
              </h4>
              <WaveBalanceChart stats={stats} />
            </div>
          </div>

          {/* Strategic Rationale */}
          <StrategicRationaleCard
            summary={actionPlan.strategicSummary}
            isGenerating={isGenerating}
          />

          {/* Status badge */}
          {isApproved && (
            <div className="flex items-center gap-2 bg-green-900/10 border border-green-500/20 rounded-lg px-4 py-2">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-green-300 font-medium">Plan approved — brief generation is enabled</span>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!hasData && !isGenerating && (
        <div className="bg-gray-800/50 border border-gray-700/50 border-dashed rounded-lg p-8 text-center">
          <svg className="w-10 h-10 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
          </svg>
          <p className="text-sm text-gray-400">
            Click "Generate Action Plan" to analyze your {topicCount} topics and create a strategic publishing plan
          </p>
          <p className="text-xs text-gray-600 mt-1">
            AI will determine the action type, priority, and wave assignment for each topic
          </p>
        </div>
      )}
    </div>
  );
}
