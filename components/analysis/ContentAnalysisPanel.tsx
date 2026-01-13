/**
 * Content Analysis Panel
 *
 * A comprehensive debugging UI for analyzing content generation quality.
 * Shows brief data, output analysis, comparisons, and issues.
 *
 * Created: January 13, 2026
 */

import React, { useState, useMemo } from 'react';
import { ContentBrief, ContentGenerationSection } from '../../types';

// =============================================================================
// Icons (inline SVG to avoid external dependencies)
// =============================================================================

const AlertTriangle = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckCircle = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircle = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Info = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const FileText = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ImageIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const Link2 = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const BarChart3 = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const Layers = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const AlertOctagon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const ChevronDown = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronRight = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
import {
  analyzeContent,
  type ContentAnalysisReport,
  type BriefAnalysisSummary,
  type OutputAnalysisSummary,
  type RequirementComparison,
} from '../../services/contentAnalyzer';

// =============================================================================
// Types
// =============================================================================

interface ContentAnalysisPanelProps {
  brief: ContentBrief;
  draft: string;
  sections?: ContentGenerationSection[];
  job?: { id: string; draft_content?: string; status?: string; current_pass?: number };
  businessInfo?: { seedKeyword?: string; language?: string };
  onExport?: (format: 'json' | 'clipboard') => void;
  className?: string;
}

type TabId = 'overview' | 'brief' | 'output' | 'comparison' | 'issues';

// =============================================================================
// Sub-components
// =============================================================================

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? 'text-green-600 bg-green-100' :
    score >= 60 ? 'text-yellow-600 bg-yellow-100' :
    'text-red-600 bg-red-100';

  return (
    <div className={`px-3 py-2 rounded-lg ${color}`}>
      <div className="text-2xl font-bold">{score}%</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: 'critical' | 'warning' | 'info' }) {
  switch (severity) {
    case 'critical':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'info':
      return <Info className="w-4 h-4 text-blue-500" />;
  }
}

function ExpandableSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50"
      >
        <span className="font-medium">{title}</span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {isOpen && <div className="px-4 py-3 border-t bg-gray-50">{children}</div>}
    </div>
  );
}

// =============================================================================
// Tab: Overview
// =============================================================================

function OverviewTab({ report }: { report: ContentAnalysisReport }) {
  const criticalCount = report.issues.filter(i => i.severity === 'critical').length;
  const warningCount = report.issues.filter(i => i.severity === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Scores */}
      <div className="flex gap-4">
        <ScoreBadge score={report.overallScore} label="Overall" />
        <ScoreBadge score={report.strategyScore} label="Strategy" />
        <ScoreBadge score={report.rulesScore} label="Rules" />
        <ScoreBadge score={report.briefSummary.completenessScore} label="Brief" />
      </div>

      {/* Summary */}
      <div className={`p-4 rounded-lg ${
        criticalCount > 0 ? 'bg-red-50 border border-red-200' :
        warningCount > 0 ? 'bg-yellow-50 border border-yellow-200' :
        'bg-green-50 border border-green-200'
      }`}>
        <p className="font-medium">{report.summary}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500">Words</div>
          <div className="text-lg font-semibold">{report.outputSummary.wordCount.toLocaleString()}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500">Sections</div>
          <div className="text-lg font-semibold">{report.outputSummary.sectionCount}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500">Images</div>
          <div className="text-lg font-semibold">{report.outputSummary.imageCount}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500">Links</div>
          <div className="text-lg font-semibold">{report.outputSummary.internalLinkCount}</div>
        </div>
      </div>

      {/* Top Issues */}
      {report.issues.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Top Issues</h3>
          <div className="space-y-2">
            {report.issues.slice(0, 5).map((issue, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                <SeverityIcon severity={issue.severity} />
                <div className="flex-1 text-sm">
                  <span className="font-medium">{issue.category}:</span> {issue.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Tab: Brief Analysis
// =============================================================================

function BriefTab({ summary }: { summary: BriefAnalysisSummary }) {
  return (
    <div className="space-y-4">
      {/* Brief Header */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-lg">{summary.title}</h3>
        <p className="text-sm text-gray-500">Target: {summary.targetKeyword}</p>
      </div>

      {/* Completeness Score */}
      <div className="flex items-center gap-4">
        <ScoreBadge score={summary.completenessScore} label="Completeness" />
        <p className="text-sm text-gray-600">
          {summary.populatedFields.length} of {summary.populatedFields.length + summary.emptyFields.length} fields populated
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 border rounded-lg">
          <div className="text-sm text-gray-500">Target Word Count</div>
          <div className="font-semibold">{summary.targetWordCount?.toLocaleString() || 'Not specified'}</div>
        </div>
        <div className="p-3 border rounded-lg">
          <div className="text-sm text-gray-500">Search Intent</div>
          <div className="font-semibold">{summary.searchIntent || 'Not specified'}</div>
        </div>
        <div className="p-3 border rounded-lg">
          <div className="text-sm text-gray-500">Sections</div>
          <div className="font-semibold">{summary.sectionCount}</div>
        </div>
        <div className="p-3 border rounded-lg">
          <div className="text-sm text-gray-500">Visual Semantics</div>
          <div className="font-semibold">{summary.visualSemanticsCount}</div>
        </div>
        <div className="p-3 border rounded-lg">
          <div className="text-sm text-gray-500">CTA</div>
          <div className="font-semibold">{summary.ctaPresent ? 'Yes' : 'No'}</div>
        </div>
        <div className="p-3 border rounded-lg">
          <div className="text-sm text-gray-500">Internal Links</div>
          <div className="font-semibold">{summary.internalLinksCount}</div>
        </div>
      </div>

      {/* Field Status */}
      <ExpandableSection title="Populated Fields" defaultOpen={true}>
        <div className="flex flex-wrap gap-2">
          {summary.populatedFields.map(field => (
            <span key={field} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
              {field}
            </span>
          ))}
        </div>
      </ExpandableSection>

      <ExpandableSection title="Empty Fields">
        <div className="flex flex-wrap gap-2">
          {summary.emptyFields.map(field => (
            <span key={field} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
              {field}
            </span>
          ))}
        </div>
      </ExpandableSection>
    </div>
  );
}

// =============================================================================
// Tab: Output Analysis
// =============================================================================

function OutputTab({ summary }: { summary: OutputAnalysisSummary }) {
  return (
    <div className="space-y-4">
      {/* Main Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <FileText className="w-6 h-6 mx-auto text-gray-400 mb-1" />
          <div className="text-2xl font-bold">{summary.wordCount.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Words</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <Layers className="w-6 h-6 mx-auto text-gray-400 mb-1" />
          <div className="text-2xl font-bold">{summary.sectionCount}</div>
          <div className="text-xs text-gray-500">Sections</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <ImageIcon className="w-6 h-6 mx-auto text-gray-400 mb-1" />
          <div className="text-2xl font-bold">{summary.imageCount}</div>
          <div className="text-xs text-gray-500">Images</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <Link2 className="w-6 h-6 mx-auto text-gray-400 mb-1" />
          <div className="text-2xl font-bold">{summary.internalLinkCount}</div>
          <div className="text-xs text-gray-500">Internal Links</div>
        </div>
      </div>

      {/* Heading Structure */}
      <div className="p-4 border rounded-lg">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Heading Structure
        </h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold">{summary.headingStructure.h1Count}</div>
            <div className="text-xs text-gray-500">H1</div>
          </div>
          <div>
            <div className="text-lg font-bold">{summary.headingStructure.h2Count}</div>
            <div className="text-xs text-gray-500">H2</div>
          </div>
          <div>
            <div className="text-lg font-bold">{summary.headingStructure.h3Count}</div>
            <div className="text-xs text-gray-500">H3</div>
          </div>
        </div>
        <div className="mt-2 text-sm">
          {summary.headingStructure.properHierarchy ? (
            <span className="text-green-600 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Proper hierarchy
            </span>
          ) : (
            <span className="text-red-600 flex items-center gap-1">
              <XCircle className="w-4 h-4" /> Hierarchy issues detected
            </span>
          )}
        </div>
      </div>

      {/* CTA Status */}
      <div className="p-4 border rounded-lg">
        <div className="flex items-center gap-2">
          {summary.ctaFound ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
          <span className="font-medium">Call-to-Action</span>
          <span className="text-sm text-gray-500">
            {summary.ctaFound ? 'Detected in content' : 'Not found in content'}
          </span>
        </div>
      </div>

      {/* Duplicate Detection */}
      {summary.duplicateContentDetected && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 font-semibold mb-2">
            <AlertOctagon className="w-5 h-5" />
            Duplicate Content Detected
          </div>
          <p className="text-sm text-red-700">
            Found duplicates in sections: {summary.duplicateSections.join(', ')}
          </p>
        </div>
      )}

      {summary.duplicateImages.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-600 font-semibold mb-2">
            <AlertTriangle className="w-5 h-5" />
            Duplicate Images
          </div>
          <ul className="text-sm text-yellow-700 list-disc list-inside">
            {summary.duplicateImages.map((img, idx) => (
              <li key={idx}>{img}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Tab: Comparison
// =============================================================================

function ComparisonTab({ comparisons }: { comparisons: RequirementComparison[] }) {
  return (
    <div className="space-y-3">
      {comparisons.map((comp, idx) => (
        <div
          key={idx}
          className={`p-3 border rounded-lg ${comp.met ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{comp.requirement}</span>
            {comp.met ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
          <div className="flex gap-4 mt-1 text-sm">
            <span className="text-gray-500">Expected: <strong>{comp.expected}</strong></span>
            <span className="text-gray-500">Actual: <strong>{comp.actual}</strong></span>
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Tab: Issues
// =============================================================================

function IssuesTab({ issues }: { issues: ContentAnalysisReport['issues'] }) {
  const critical = issues.filter(i => i.severity === 'critical');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  return (
    <div className="space-y-6">
      {/* Critical Issues */}
      {critical.length > 0 && (
        <div>
          <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Critical Issues ({critical.length})
          </h4>
          <div className="space-y-2">
            {critical.map((issue, idx) => (
              <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="font-medium text-red-700">{issue.message}</div>
                {issue.location && <div className="text-xs text-red-500 mt-1">Location: {issue.location}</div>}
                <div className="text-sm text-red-600 mt-1">Suggestion: {issue.suggestion}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div>
          <h4 className="font-semibold text-yellow-600 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Warnings ({warnings.length})
          </h4>
          <div className="space-y-2">
            {warnings.map((issue, idx) => (
              <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-medium text-yellow-700">{issue.message}</div>
                <div className="text-sm text-yellow-600 mt-1">Suggestion: {issue.suggestion}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      {infos.length > 0 && (
        <div>
          <h4 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Info ({infos.length})
          </h4>
          <div className="space-y-2">
            {infos.map((issue, idx) => (
              <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-blue-700">{issue.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Clear */}
      {issues.length === 0 && (
        <div className="p-6 text-center bg-green-50 rounded-lg">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
          <h4 className="font-semibold text-green-700">No Issues Found</h4>
          <p className="text-sm text-green-600">Content passed all quality checks.</p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ContentAnalysisPanel({
  brief,
  draft,
  sections,
  job,
  businessInfo,
  onExport,
  className = '',
}: ContentAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Generate analysis report
  const report = useMemo(() => {
    return analyzeContent(brief, draft, sections);
  }, [brief, draft, sections]);

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'brief', label: 'Brief', icon: <FileText className="w-4 h-4" /> },
    { id: 'output', label: 'Output', icon: <Layers className="w-4 h-4" /> },
    { id: 'comparison', label: 'Compare', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'issues', label: `Issues (${report.issues.length})`, icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-700 ${className}`}>
      {/* Header with Export Buttons */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Content Analysis</h3>
        {onExport && (
          <div className="flex gap-2">
            <button
              onClick={() => onExport('clipboard')}
              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded"
            >
              Copy to Clipboard
            </button>
            <button
              onClick={() => onExport('json')}
              className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded"
            >
              Download JSON
            </button>
          </div>
        )}
      </div>
      {/* Tab Bar */}
      <div className="flex border-b border-gray-700 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'overview' && <OverviewTab report={report} />}
        {activeTab === 'brief' && <BriefTab summary={report.briefSummary} />}
        {activeTab === 'output' && <OutputTab summary={report.outputSummary} />}
        {activeTab === 'comparison' && <ComparisonTab comparisons={report.comparison} />}
        {activeTab === 'issues' && <IssuesTab issues={report.issues} />}
      </div>
    </div>
  );
}

export default ContentAnalysisPanel;
