/**
 * Template Performance Dashboard Component
 *
 * Displays analytics and performance metrics for content templates.
 * Shows usage statistics, audit scores, and recommendation accuracy.
 *
 * Created: 2026-01-18 - Content Template Routing Task 24
 *
 * @module components/analytics/TemplatePerformanceDashboard
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SmartLoader } from '../ui/FunLoaders';
import {
  getTemplatePerformanceStats,
  getRecommendationAccuracyStats,
  getUserTemplateHistory,
  TemplateStats,
} from '../../services/templateAnalyticsService';
import { getABTestResults, listABTests, ABTest } from '../../services/templateABTestService';
import { CONTENT_TEMPLATES } from '../../config/contentTemplates';
import { TemplateName } from '../../types/contentTemplates';

// =============================================================================
// Types
// =============================================================================

interface TemplatePerformanceDashboardProps {
  /** Optional class name */
  className?: string;
}

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

// =============================================================================
// Constants
// =============================================================================

const DATE_RANGES: DateRange[] = [
  {
    label: 'Last 7 days',
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
  },
  {
    label: 'Last 30 days',
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  },
  {
    label: 'Last 90 days',
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    end: new Date(),
  },
  {
    label: 'All time',
    start: new Date(0),
    end: new Date(),
  },
];

// =============================================================================
// Helper Components
// =============================================================================

const StatCard: React.FC<{
  label: string;
  value: string | number;
  subtitle?: string;
  color?: 'default' | 'green' | 'yellow' | 'red' | 'cyan';
}> = ({ label, value, subtitle, color = 'default' }) => {
  const colorClasses = {
    default: 'text-white',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    cyan: 'text-cyan-400',
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <p className="text-sm text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
};

const ProgressBar: React.FC<{ value: number; max: number; color?: string }> = ({
  value,
  max,
  color = 'bg-cyan-500',
}) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-300`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const TemplatePerformanceDashboard: React.FC<TemplatePerformanceDashboardProps> = ({
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<DateRange>(DATE_RANGES[1]); // Last 30 days
  const [templateStats, setTemplateStats] = useState<Record<string, TemplateStats>>({});
  const [recommendationStats, setRecommendationStats] = useState<{
    totalSelections: number;
    acceptedRecommendations: number;
    overriddenRecommendations: number;
    avgScoreWhenAccepted: number;
    avgScoreWhenOverridden: number;
  } | null>(null);
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [statsResult, recResult, testsResult, historyResult] = await Promise.all([
          getTemplatePerformanceStats(undefined, {
            start: selectedRange.start,
            end: selectedRange.end,
          }),
          getRecommendationAccuracyStats(),
          listABTests(true),
          getUserTemplateHistory(10),
        ]);

        if (statsResult.success) {
          setTemplateStats(statsResult.stats);
        }
        if (recResult.success && recResult.stats) {
          setRecommendationStats(recResult.stats);
        }
        setAbTests(testsResult);
        if (historyResult.success && historyResult.data) {
          setRecentHistory(historyResult.data);
        }
      } catch (error) {
        console.error('[Dashboard] Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedRange]);

  // Calculate aggregate stats
  const aggregateStats = useMemo(() => {
    const templates = Object.entries(templateStats);
    if (templates.length === 0) {
      return {
        totalGenerations: 0,
        avgAuditScore: 0,
        avgGenerationTime: 0,
        topTemplate: null as string | null,
      };
    }

    let total = 0;
    let totalScore = 0;
    let totalTime = 0;
    let topCount = 0;
    let topTemplate: string | null = null;

    templates.forEach(([name, stats]) => {
      total += stats.count;
      totalScore += stats.avgAuditScore * stats.count;
      totalTime += stats.avgGenerationTime * stats.count;
      if (stats.count > topCount) {
        topCount = stats.count;
        topTemplate = name;
      }
    });

    return {
      totalGenerations: total,
      avgAuditScore: total > 0 ? Math.round(totalScore / total) : 0,
      avgGenerationTime: total > 0 ? Math.round(totalTime / total / 1000) : 0, // Convert to seconds
      topTemplate,
    };
  }, [templateStats]);

  // Get score color
  const getScoreColor = (score: number): 'green' | 'yellow' | 'red' => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <SmartLoader context="analyzing" size="lg" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Template Performance</h2>
          <p className="text-sm text-slate-400">Analytics for content template usage and quality</p>
        </div>
        <div className="flex items-center gap-2">
          {DATE_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => setSelectedRange(range)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedRange.label === range.label
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Generations"
          value={aggregateStats.totalGenerations}
          color="cyan"
        />
        <StatCard
          label="Avg Audit Score"
          value={`${aggregateStats.avgAuditScore}%`}
          color={getScoreColor(aggregateStats.avgAuditScore)}
        />
        <StatCard
          label="Avg Generation Time"
          value={`${aggregateStats.avgGenerationTime}s`}
        />
        <StatCard
          label="Most Used Template"
          value={aggregateStats.topTemplate?.replace(/_/g, ' ') || 'N/A'}
          subtitle={aggregateStats.topTemplate ? `${templateStats[aggregateStats.topTemplate]?.count || 0} uses` : undefined}
        />
      </div>

      {/* Template Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Template Usage & Performance</h3>
        {Object.keys(templateStats).length === 0 ? (
          <p className="text-slate-400 text-center py-8">No template data available for this period</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(templateStats)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([name, stats]) => {
                const template = CONTENT_TEMPLATES[name as TemplateName];
                return (
                  <div key={name} className="border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-white">{name.replace(/_/g, ' ')}</span>
                        <span className="ml-2 text-sm text-slate-500">
                          {template?.label || ''}
                        </span>
                      </div>
                      <span className="text-sm text-slate-400">{stats.count} generations</span>
                    </div>
                    <ProgressBar
                      value={stats.count}
                      max={aggregateStats.totalGenerations}
                      color="bg-cyan-500"
                    />
                    <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-slate-500">Audit Score:</span>
                        <span className={`ml-2 font-medium text-${getScoreColor(stats.avgAuditScore)}-400`}>
                          {stats.avgAuditScore}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Compliance:</span>
                        <span className={`ml-2 font-medium text-${getScoreColor(stats.avgComplianceScore)}-400`}>
                          {stats.avgComplianceScore}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Avg Words:</span>
                        <span className="ml-2 font-medium text-white">{stats.avgWordCount}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Override Rate:</span>
                        <span className="ml-2 font-medium text-white">{stats.overrideRate}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      {/* AI Recommendation Accuracy */}
      {recommendationStats && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">AI Recommendation Accuracy</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">Recommendations Accepted</span>
                <span className="text-green-400 font-medium">
                  {recommendationStats.acceptedRecommendations} / {recommendationStats.totalSelections}
                </span>
              </div>
              <ProgressBar
                value={recommendationStats.acceptedRecommendations}
                max={recommendationStats.totalSelections}
                color="bg-green-500"
              />
              <p className="text-sm text-slate-500 mt-2">
                Avg audit score when accepted: <span className="text-white">{recommendationStats.avgScoreWhenAccepted}%</span>
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">Recommendations Overridden</span>
                <span className="text-yellow-400 font-medium">
                  {recommendationStats.overriddenRecommendations} / {recommendationStats.totalSelections}
                </span>
              </div>
              <ProgressBar
                value={recommendationStats.overriddenRecommendations}
                max={recommendationStats.totalSelections}
                color="bg-yellow-500"
              />
              <p className="text-sm text-slate-500 mt-2">
                Avg audit score when overridden: <span className="text-white">{recommendationStats.avgScoreWhenOverridden}%</span>
              </p>
            </div>
          </div>
          {recommendationStats.totalSelections > 10 && (
            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-300">
                {recommendationStats.avgScoreWhenAccepted > recommendationStats.avgScoreWhenOverridden ? (
                  <>
                    AI recommendations produce <span className="text-green-400 font-medium">
                      {recommendationStats.avgScoreWhenAccepted - recommendationStats.avgScoreWhenOverridden}% higher
                    </span> audit scores on average.
                  </>
                ) : recommendationStats.avgScoreWhenOverridden > recommendationStats.avgScoreWhenAccepted ? (
                  <>
                    User overrides produce <span className="text-yellow-400 font-medium">
                      {recommendationStats.avgScoreWhenOverridden - recommendationStats.avgScoreWhenAccepted}% higher
                    </span> audit scores on average.
                  </>
                ) : (
                  <>AI recommendations and user overrides produce similar audit scores.</>
                )}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Active A/B Tests */}
      {abTests.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Active A/B Tests</h3>
          <div className="space-y-4">
            {abTests.map((test) => (
              <div key={test.id} className="border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-medium text-white">{test.name}</span>
                    {test.description && (
                      <p className="text-sm text-slate-500 mt-1">{test.description}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    test.isActive ? 'bg-green-900/30 text-green-400' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {test.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-800/50 rounded p-3">
                    <p className="text-slate-500 mb-1">Control</p>
                    <p className="text-white font-medium">{test.controlTemplate.replace(/_/g, ' ')}</p>
                    {test.controlCount !== undefined && (
                      <p className="text-xs text-slate-500 mt-1">
                        {test.controlCount} samples • Avg: {test.controlAvgAuditScore || 0}%
                      </p>
                    )}
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <p className="text-slate-500 mb-1">Variant</p>
                    <p className="text-white font-medium">{test.variantTemplate.replace(/_/g, ' ')}</p>
                    {test.variantCount !== undefined && (
                      <p className="text-xs text-slate-500 mt-1">
                        {test.variantCount} samples • Avg: {test.variantAvgAuditScore || 0}%
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      {recentHistory.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Template Selections</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 text-slate-400 font-medium">Template</th>
                  <th className="text-left py-2 text-slate-400 font-medium">Depth</th>
                  <th className="text-center py-2 text-slate-400 font-medium">Confidence</th>
                  <th className="text-center py-2 text-slate-400 font-medium">Audit Score</th>
                  <th className="text-right py-2 text-slate-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.map((item, i) => (
                  <tr key={i} className="border-b border-slate-800">
                    <td className="py-2 text-white">
                      {item.selected_template?.replace(/_/g, ' ') || 'Unknown'}
                    </td>
                    <td className="py-2 text-slate-400">
                      {item.depth_mode?.replace('-', ' ') || '-'}
                    </td>
                    <td className="py-2 text-center">
                      {item.template_confidence ? (
                        <span className={`text-${getScoreColor(item.template_confidence)}-400`}>
                          {item.template_confidence}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-2 text-center">
                      {item.final_audit_score ? (
                        <span className={`text-${getScoreColor(item.final_audit_score)}-400`}>
                          {item.final_audit_score}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-2 text-right text-slate-500">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TemplatePerformanceDashboard;
