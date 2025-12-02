// components/AuditDashboard.tsx
// Unified Audit Dashboard - Phase 6
// Displays audit results across all categories with fix capabilities

import React, { useState, useMemo } from 'react';
import {
  UnifiedAuditResult,
  UnifiedAuditIssue,
  AuditCategoryResult,
  AuditSeverity,
  AuditFix,
} from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';
import { InfoTooltip } from './ui/InfoTooltip';
import { SEVERITY_COLORS, AUDIT_CATEGORIES } from '../config/auditRules';
import AuditIssueCard from './AuditIssueCard';
import AuditHistoryPanel from './AuditHistoryPanel';

interface AuditDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  result: UnifiedAuditResult | null;
  isLoading: boolean;
  onRunAudit: () => void;
  onApplyFix: (issue: UnifiedAuditIssue, fix?: AuditFix) => Promise<void>;
  onApplyAllFixes: (issues: UnifiedAuditIssue[], fixes: AuditFix[]) => Promise<void>;
  isApplyingFix: boolean;
  historyEntries?: any[];
  onUndoFix?: (historyId: string) => Promise<void>;
}

// Severity order for sorting
const SEVERITY_ORDER: Record<AuditSeverity, number> = {
  critical: 0,
  warning: 1,
  suggestion: 2,
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
};

const getScoreRingColor = (score: number): string => {
  if (score >= 80) return 'stroke-green-500';
  if (score >= 60) return 'stroke-yellow-500';
  if (score >= 40) return 'stroke-orange-500';
  return 'stroke-red-500';
};

const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 120 }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${getScoreRingColor(score)} transition-all duration-500`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
      </div>
    </div>
  );
};

const AuditDashboard: React.FC<AuditDashboardProps> = ({
  isOpen,
  onClose,
  result,
  isLoading,
  onRunAudit,
  onApplyFix,
  onApplyAllFixes,
  isApplyingFix,
  historyEntries = [],
  onUndoFix,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'history'>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | 'all'>('all');

  // Filter and sort issues
  const filteredIssues = useMemo(() => {
    if (!result) return [];

    let issues = result.categories.flatMap(c => c.issues);

    // Filter by category
    if (selectedCategory) {
      issues = issues.filter(i => i.category === selectedCategory);
    }

    // Filter by severity
    if (severityFilter !== 'all') {
      issues = issues.filter(i => i.severity === severityFilter);
    }

    // Sort by severity
    return issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }, [result, selectedCategory, severityFilter]);

  // Get auto-fixable issues
  const autoFixableIssues = useMemo(() => {
    return filteredIssues.filter(i => i.autoFixable);
  }, [filteredIssues]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-gray-900/95 backdrop-blur-sm"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-800/90 backdrop-blur-sm p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">Health Check Dashboard</h2>
            {result && (
              <span className="text-sm text-gray-400">
                Last run: {new Date(result.runAt).toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={onRunAudit}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {isLoading ? <Loader className="w-4 h-4" /> : 'Run Audit'}
            </Button>
            <button
              onClick={onClose}
              className="text-gray-400 text-2xl leading-none hover:text-white"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('issues')}
              className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'issues'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Issues
              {result && result.totalIssues > 0 && (
                <span className="px-2 py-0.5 text-xs bg-gray-700 rounded-full">
                  {result.totalIssues}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Fix History
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader className="w-12 h-12 mb-4" />
              <p className="text-gray-400">Running audit...</p>
            </div>
          ) : !result ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-gray-400 mb-4">No audit results yet.</p>
              <Button onClick={onRunAudit} className="bg-blue-600 hover:bg-blue-500">
                Run Audit
              </Button>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Score Summary */}
                  <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-6">
                    <div className="flex items-center gap-8">
                      <ScoreRing score={result.overallScore} />
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Overall Health</h3>
                        <p className="text-gray-400 text-sm">
                          {result.overallScore >= 80
                            ? 'Your topical map is in great shape!'
                            : result.overallScore >= 60
                            ? 'Some improvements recommended.'
                            : 'Significant issues need attention.'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-red-400">{result.criticalCount}</p>
                        <p className="text-xs text-gray-400">Critical</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-400">{result.warningCount}</p>
                        <p className="text-xs text-gray-400">Warnings</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-400">{result.suggestionCount}</p>
                        <p className="text-xs text-gray-400">Suggestions</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-400">{result.autoFixableCount}</p>
                        <p className="text-xs text-gray-400">Auto-fixable</p>
                      </div>
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Category Breakdown</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {result.categories.map(category => (
                        <div
                          key={category.categoryId}
                          className="bg-gray-800/50 rounded-lg p-4 cursor-pointer hover:bg-gray-800/70 transition-colors"
                          onClick={() => {
                            setSelectedCategory(category.categoryId);
                            setActiveTab('issues');
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-white">{category.categoryName}</h4>
                            <span className={`text-lg font-bold ${getScoreColor(category.score)}`}>
                              {category.score}
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                category.score >= 80
                                  ? 'bg-green-500'
                                  : category.score >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${category.score}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>{category.issueCount} issues</span>
                            <span>{category.autoFixableCount} auto-fixable</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'issues' && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      {/* Category Filter */}
                      <select
                        value={selectedCategory || ''}
                        onChange={e => setSelectedCategory(e.target.value || null)}
                        className="bg-gray-700 text-white rounded-md px-3 py-1.5 text-sm border border-gray-600"
                      >
                        <option value="">All Categories</option>
                        {result.categories.map(c => (
                          <option key={c.categoryId} value={c.categoryId}>
                            {c.categoryName} ({c.issueCount})
                          </option>
                        ))}
                      </select>

                      {/* Severity Filter */}
                      <div className="flex items-center gap-2">
                        {(['all', 'critical', 'warning', 'suggestion'] as const).map(sev => (
                          <button
                            key={sev}
                            onClick={() => setSeverityFilter(sev)}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${
                              severityFilter === sev
                                ? sev === 'all'
                                  ? 'bg-gray-600 text-white'
                                  : sev === 'critical'
                                  ? 'bg-red-900/50 text-red-300'
                                  : sev === 'warning'
                                  ? 'bg-yellow-900/50 text-yellow-300'
                                  : 'bg-blue-900/50 text-blue-300'
                                : 'bg-gray-700 text-gray-400 hover:text-white'
                            }`}
                          >
                            {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fix All Button */}
                    {autoFixableIssues.length > 0 && (
                      <Button
                        onClick={() => onApplyAllFixes(autoFixableIssues, [])}
                        disabled={isApplyingFix}
                        className="bg-green-600 hover:bg-green-500"
                      >
                        {isApplyingFix ? (
                          <Loader className="w-4 h-4" />
                        ) : (
                          `Fix All (${autoFixableIssues.length})`
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Issues List */}
                  {filteredIssues.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      {selectedCategory || severityFilter !== 'all'
                        ? 'No issues match the current filters.'
                        : 'No issues found. Great job!'}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredIssues.map(issue => (
                        <AuditIssueCard
                          key={issue.id}
                          issue={issue}
                          onApplyFix={onApplyFix}
                          isApplying={isApplyingFix}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <AuditHistoryPanel
                  entries={historyEntries}
                  onUndo={onUndoFix}
                  isLoading={isApplyingFix}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {result && activeTab === 'issues' && autoFixableIssues.length > 0 && (
          <div className="sticky bottom-0 bg-gray-800/90 backdrop-blur-sm p-4 border-t border-gray-700 flex justify-between items-center flex-shrink-0">
            <div className="text-sm text-gray-400">
              Showing {filteredIssues.length} issues
              {selectedCategory && ` in ${result.categories.find(c => c.categoryId === selectedCategory)?.categoryName}`}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {autoFixableIssues.length} issues can be auto-fixed
              </span>
              <Button
                onClick={() => onApplyAllFixes(autoFixableIssues, [])}
                disabled={isApplyingFix}
                className="bg-green-600 hover:bg-green-500"
              >
                {isApplyingFix ? <Loader className="w-4 h-4" /> : 'Apply All Fixes'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditDashboard;
