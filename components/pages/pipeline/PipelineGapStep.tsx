import React, { useState } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import { runQueryNetworkAudit } from '../../../services/ai/queryNetworkAudit';
import type {
  QueryNetworkAnalysisResult,
  QueryNetworkAuditConfig,
  CompetitorEAV,
  ContentGap,
  QueryNetworkNode,
  HeadingHierarchy,
  InformationDensityScore,
} from '../../../types';

// ──── Helper Functions ────

function scoreColor(score: number): 'green' | 'blue' | 'amber' | 'red' {
  if (score >= 80) return 'green';
  if (score >= 60) return 'blue';
  if (score >= 40) return 'amber';
  return 'red';
}

function computeGapScores(results: QueryNetworkAnalysisResult): {
  overallHealth: number;
  contentQuality: number;
  pageStructure: number; // -1 means N/A
  informationDensity: number;
} {
  // Content Quality /100
  let contentQuality = 100;
  const highGaps = results.contentGaps.filter(g => g.priority === 'high');
  const medGaps = results.contentGaps.filter(g => g.priority === 'medium');
  contentQuality -= Math.min(highGaps.length * 5, 40);
  contentQuality -= Math.min(medGaps.length * 2, 20);
  const ownDensity = results.informationDensity.own;
  const compAvgDensity = results.informationDensity.competitorAverage;
  if (ownDensity && compAvgDensity && ownDensity.densityScore < compAvgDensity.densityScore) {
    const diff = compAvgDensity.densityScore - ownDensity.densityScore;
    const penalty = Math.min(Math.round((diff / compAvgDensity.densityScore) * 20), 20);
    contentQuality -= penalty;
  }
  if (!ownDensity) {
    contentQuality = Math.min(contentQuality, 50);
  }
  contentQuality = Math.max(0, contentQuality);

  // Page Structure /100
  let pageStructure = -1; // N/A
  if (results.headingAnalysis.length > 0) {
    const total = results.headingAnalysis.reduce((sum, h) => sum + h.hierarchyScore, 0);
    pageStructure = Math.round(total / results.headingAnalysis.length);
  }

  // Information Density /100
  let informationDensity: number;
  if (ownDensity) {
    informationDensity = Math.round(ownDensity.densityScore);
  } else {
    informationDensity = Math.round(compAvgDensity.densityScore);
  }

  // Overall Health /100 — weighted average of available components
  let totalWeight = 0;
  let weightedSum = 0;
  // Content Quality: 40%
  weightedSum += contentQuality * 40;
  totalWeight += 40;
  // Page Structure: 30% (if available)
  if (pageStructure >= 0) {
    weightedSum += pageStructure * 30;
    totalWeight += 30;
  }
  // Info Density: 30%
  weightedSum += informationDensity * 30;
  totalWeight += 30;

  const overallHealth = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return { overallHealth, contentQuality, pageStructure, informationDensity };
}

function deriveEntityType(
  entityName: string,
  eavs: CompetitorEAV[],
  businessDomain?: string,
): string {
  const lowerName = entityName.toLowerCase();
  // Check if entity matches business domain or name
  if (businessDomain) {
    try {
      const hostname = new URL(
        businessDomain.startsWith('http') ? businessDomain : `https://${businessDomain}`,
      ).hostname.replace(/^www\./, '');
      if (lowerName.includes(hostname.split('.')[0]) || hostname.includes(lowerName.replace(/\s+/g, ''))) {
        return 'Organization';
      }
    } catch {
      // Not a valid URL, try direct match
      if (lowerName.includes(businessDomain.toLowerCase())) {
        return 'Organization';
      }
    }
  }

  const entityEavs = eavs.filter(e => e.entity === entityName);
  const attrs = entityEavs.map(e => e.attribute.toLowerCase());

  const personAttrs = ['founder', 'ceo', 'author', 'born', 'nationality', 'age', 'biography', 'role'];
  if (attrs.some(a => personAttrs.some(p => a.includes(p)))) return 'Person';

  const conceptAttrs = ['definition', 'type', 'classification', 'category', 'meaning', 'synonym'];
  if (attrs.some(a => conceptAttrs.some(c => a.includes(c)))) return 'Concept';

  const productAttrs = ['price', 'features', 'specifications', 'cost', 'plan', 'tier', 'model', 'version'];
  if (attrs.some(a => productAttrs.some(p => a.includes(p)))) return 'Service/Product';

  const orgAttrs = ['headquarters', 'employees', 'revenue', 'founded', 'website', 'industry', 'subsidiary'];
  if (attrs.some(a => orgAttrs.some(o => a.includes(o)))) return 'Organization';

  return 'Entity';
}

// ──── UI Components ────

function ScoreCard({ label, value, color = 'gray' }: {
  label: string;
  value: string | number;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'gray';
}) {
  const colorMap: Record<string, string> = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    gray: 'text-gray-400',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
      <p className={`text-3xl font-bold ${colorMap[color]}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function SeverityBadge({ priority }: { priority: ContentGap['priority'] }) {
  const config = {
    high: { label: 'CRITICAL', classes: 'bg-red-900/30 text-red-300 border-red-700/40' },
    medium: { label: 'HIGH', classes: 'bg-amber-900/30 text-amber-300 border-amber-700/40' },
    low: { label: 'MEDIUM', classes: 'bg-yellow-900/30 text-yellow-300 border-yellow-700/40' },
  };
  const c = config[priority];
  return (
    <span className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded border ${c.classes}`}>
      {c.label}
    </span>
  );
}

function GapItem({ gap }: { gap: ContentGap }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left"
      >
        <SeverityBadge priority={gap.priority} />
        <span className="text-sm text-gray-200 flex-1">
          {gap.missingAttribute}
          <span className="text-gray-500 ml-2">
            — found in {gap.frequency} competitor{gap.frequency !== 1 ? 's' : ''}
          </span>
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-700 text-xs space-y-2">
          {gap.suggestedContent && (
            <div>
              <span className="text-gray-400 font-medium">Suggested content: </span>
              <span className="text-gray-300">{gap.suggestedContent}</span>
            </div>
          )}
          {gap.foundInCompetitors.length > 0 && (
            <div>
              <span className="text-gray-400 font-medium">Found in: </span>
              <span className="text-gray-300">
                {gap.foundInCompetitors.slice(0, 3).map((url, i) => (
                  <span key={i}>
                    {i > 0 && ', '}
                    {(() => { try { return new URL(url).hostname; } catch { return url; } })()}
                  </span>
                ))}
                {gap.foundInCompetitors.length > 3 && ` +${gap.foundInCompetitors.length - 3} more`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QueryNetworkSummary({ queryNetwork }: { queryNetwork: QueryNetworkNode[] }) {
  if (queryNetwork.length === 0) return null;

  const intentCounts: Record<string, number> = { informational: 0, commercial: 0, transactional: 0, navigational: 0 };
  const allQuestions: string[] = [];
  for (const node of queryNetwork) {
    intentCounts[node.intent] = (intentCounts[node.intent] || 0) + 1;
    allQuestions.push(...node.questions);
  }
  const total = queryNetwork.length;
  const topQuestions = [...new Set(allQuestions)].slice(0, 3);

  const intentColors: Record<string, string> = {
    informational: 'bg-blue-400',
    commercial: 'bg-amber-400',
    transactional: 'bg-green-400',
    navigational: 'bg-purple-400',
  };
  const intentTextColors: Record<string, string> = {
    informational: 'text-blue-300',
    commercial: 'text-amber-300',
    transactional: 'text-green-300',
    navigational: 'text-purple-300',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Query Network Summary</h3>
      <p className="text-xs text-gray-400 mb-3">{total} queries analyzed</p>

      {/* Intent distribution bar */}
      <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden flex mb-3">
        {Object.entries(intentCounts).map(([intent, count]) =>
          count > 0 ? (
            <div
              key={intent}
              className={`${intentColors[intent]} h-full`}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${intent}: ${count}`}
            />
          ) : null,
        )}
      </div>

      {/* Intent legend */}
      <div className="flex flex-wrap gap-3 text-xs mb-4">
        {Object.entries(intentCounts).map(([intent, count]) =>
          count > 0 ? (
            <div key={intent} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${intentColors[intent]}`} />
              <span className={intentTextColors[intent]}>
                {count} {intent}
              </span>
            </div>
          ) : null,
        )}
      </div>

      {/* Top questions */}
      {topQuestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-2">Top User Questions</p>
          <div className="space-y-1.5">
            {topQuestions.map((q, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-blue-400 mt-0.5">?</span>
                <span className="text-gray-300">{q}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DensityComparison({ informationDensity }: {
  informationDensity: {
    own?: InformationDensityScore;
    competitorAverage: InformationDensityScore;
    topCompetitor: InformationDensityScore;
  };
}) {
  const { own, competitorAverage, topCompetitor } = informationDensity;

  const rows: { label: string; ownVal: string; avgVal: string; topVal: string }[] = [
    {
      label: 'Density',
      ownVal: own ? `${Math.round(own.densityScore)}/100` : '—',
      avgVal: `${Math.round(competitorAverage.densityScore)}/100`,
      topVal: `${Math.round(topCompetitor.densityScore)}/100`,
    },
    {
      label: 'Facts/sent',
      ownVal: own ? own.factsPerSentence.toFixed(2) : '—',
      avgVal: competitorAverage.factsPerSentence.toFixed(2),
      topVal: topCompetitor.factsPerSentence.toFixed(2),
    },
    {
      label: 'Entities',
      ownVal: own ? String(own.uniqueEntitiesCount) : '—',
      avgVal: String(competitorAverage.uniqueEntitiesCount),
      topVal: String(topCompetitor.uniqueEntitiesCount),
    },
    {
      label: 'Attributes',
      ownVal: own ? String(own.uniqueAttributesCount) : '—',
      avgVal: String(competitorAverage.uniqueAttributesCount),
      topVal: String(topCompetitor.uniqueAttributesCount),
    },
    {
      label: 'Total EAVs',
      ownVal: own ? String(own.totalEAVs) : '—',
      avgVal: String(competitorAverage.totalEAVs),
      topVal: String(topCompetitor.totalEAVs),
    },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Information Density</h3>
      {!own && (
        <p className="text-xs text-amber-400 mb-3">No own content found in SERPs — showing competitor benchmarks only</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider" />
              {own && (
                <th className="text-center px-4 py-2 text-xs font-medium text-blue-400 uppercase tracking-wider">Your Site</th>
              )}
              <th className="text-center px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Competitor Avg</th>
              <th className="text-center px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Top Competitor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-gray-700/50">
                <td className="px-4 py-2 text-xs text-gray-400 font-medium">{row.label}</td>
                {own && (
                  <td className="px-4 py-2 text-center text-xs text-blue-300 font-medium">{row.ownVal}</td>
                )}
                <td className="px-4 py-2 text-center text-xs text-gray-300">{row.avgVal}</td>
                <td className="px-4 py-2 text-center text-xs text-gray-300">{row.topVal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeadingAnalysisSummary({ headingAnalysis }: { headingAnalysis: HeadingHierarchy[] }) {
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  if (headingAnalysis.length === 0) return null;

  const avgScore = Math.round(
    headingAnalysis.reduce((sum, h) => sum + h.hierarchyScore, 0) / headingAnalysis.length,
  );

  // Deduplicate issues across pages
  const allIssues = [...new Set(headingAnalysis.flatMap(h => h.issues))];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Heading Analysis</h3>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-gray-400">Average hierarchy score:</span>
        <span className={`text-lg font-bold ${scoreColor(avgScore) === 'green' ? 'text-green-400' : scoreColor(avgScore) === 'blue' ? 'text-blue-400' : scoreColor(avgScore) === 'amber' ? 'text-amber-400' : 'text-red-400'}`}>
          {avgScore}/100
        </span>
        <span className="text-xs text-gray-500">across {headingAnalysis.length} page{headingAnalysis.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Common issues */}
      {allIssues.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-400 mb-2">Common Issues</p>
          <div className="space-y-1">
            {allIssues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-amber-400 mt-0.5">!</span>
                <span className="text-gray-300">{issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-page expandable */}
      <div className="space-y-1">
        {headingAnalysis.map((page) => {
          const isExpanded = expandedUrl === page.url;
          let displayUrl: string;
          try { displayUrl = new URL(page.url).pathname; } catch { displayUrl = page.url; }
          return (
            <div key={page.url} className="border border-gray-700/50 rounded">
              <button
                type="button"
                onClick={() => setExpandedUrl(isExpanded ? null : page.url)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-700/30"
              >
                <span className="text-gray-300 truncate mr-2">{displayUrl}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`font-medium ${page.hierarchyScore >= 70 ? 'text-green-400' : page.hierarchyScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                    {page.hierarchyScore}/100
                  </span>
                  <svg
                    className={`w-3 h-3 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-700/50">
                  {page.issues.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {page.issues.map((issue, j) => (
                        <li key={j} className="text-xs text-gray-400 flex items-start gap-1.5">
                          <span className="text-amber-400">-</span> {issue}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-green-400">No issues found</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──── Greenfield Skip Notice ────

function GreenfieldSkipNotice({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
        <svg
          className="w-10 h-10 text-gray-500 mx-auto mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <p className="text-sm text-gray-400">
          No existing site to analyze &mdash; this step was auto-skipped.
        </p>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onContinue}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors"
        >
          Continue to Strategy
        </button>
      </div>
    </div>
  );
}

// ──── Gap Analysis Content ────

function GapAnalysisContent({
  results,
  isGenerating,
  progress,
  error,
  onRunAnalysis,
  businessDomain,
}: {
  results: QueryNetworkAnalysisResult | null;
  isGenerating: boolean;
  progress: string;
  error: string | null;
  onRunAnalysis: () => void;
  businessDomain?: string;
}) {
  const [showAllEntities, setShowAllEntities] = useState(false);

  const allGaps = results?.contentGaps ?? [];
  const criticalCount = allGaps.filter(g => g.priority === 'high').length;
  const highCount = allGaps.filter(g => g.priority === 'medium').length;
  const mediumCount = allGaps.filter(g => g.priority === 'low').length;

  // Compute scores
  const scores = results ? computeGapScores(results) : null;

  // Build entity inventory from competitor EAVs (fixed)
  const entityMap = new Map<string, {
    eavCount: number;
    sources: Set<string>;
    totalConfidence: number;
    categories: Set<string>;
  }>();
  const allEavs = results?.competitorEAVs ?? [];
  for (const eav of allEavs) {
    const key = eav.entity;
    const existing = entityMap.get(key);
    if (existing) {
      existing.eavCount++;
      existing.sources.add(eav.source);
      existing.totalConfidence += eav.confidence;
    } else {
      entityMap.set(key, {
        eavCount: 1,
        sources: new Set([eav.source]),
        totalConfidence: eav.confidence,
        categories: new Set<string>(),
      });
    }
    entityMap.get(key)!.categories.add(eav.category || 'COMMON');
  }

  const allEntities = [...entityMap.entries()].sort((a, b) => b[1].eavCount - a[1].eavCount);
  const visibleEntities = showAllEntities ? allEntities : allEntities.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* 1. Score Cards — /100 scores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard
          label="Overall Health"
          value={scores ? `${scores.overallHealth}/100` : '--'}
          color={scores ? scoreColor(scores.overallHealth) : 'gray'}
        />
        <ScoreCard
          label="Content Quality"
          value={scores ? `${scores.contentQuality}/100` : '--'}
          color={scores ? scoreColor(scores.contentQuality) : 'gray'}
        />
        <ScoreCard
          label="Page Structure"
          value={scores ? (scores.pageStructure >= 0 ? `${scores.pageStructure}/100` : 'N/A') : '--'}
          color={scores ? (scores.pageStructure >= 0 ? scoreColor(scores.pageStructure) : 'gray') : 'gray'}
        />
        <ScoreCard
          label="Info Density"
          value={scores ? `${scores.informationDensity}/100` : '--'}
          color={scores ? scoreColor(scores.informationDensity) : 'gray'}
        />
      </div>

      {/* 2. Error / Progress banners */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {isGenerating && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="animate-spin w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-blue-300">{progress || 'Running gap analysis...'}</p>
        </div>
      )}

      {/* 3. Query Network Summary */}
      {results && <QueryNetworkSummary queryNetwork={results.queryNetwork} />}

      {/* 4. Gap Findings with severity badges */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-2">Gap Findings</h3>
        {results && allGaps.length > 0 && (
          <p className="text-xs text-gray-400 mb-4">
            {criticalCount} critical, {highCount} high, {mediumCount} medium gap{allGaps.length !== 1 ? 's' : ''} found
          </p>
        )}
        <div className="space-y-2">
          {results && allGaps.length > 0 ? (
            allGaps.map((gap, i) => <GapItem key={i} gap={gap} />)
          ) : results && allGaps.length === 0 ? (
            <div className="flex items-center gap-3 text-sm text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <span>No gaps found — good coverage</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
                <span>Run gap analysis to identify issues</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
                <span>Missing content clusters will appear here</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
                <span>Competitor coverage gaps will be highlighted</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 5. Information Density Comparison */}
      {results && <DensityComparison informationDensity={results.informationDensity} />}

      {/* 6. Recommendations (all, not truncated) */}
      {results && results.recommendations.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">
            Recommendations ({results.recommendations.length})
          </h3>
          <div className="space-y-3">
            {results.recommendations.map((rec, i) => (
              <div key={i} className="bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded border ${
                    rec.priority === 'critical'
                      ? 'bg-red-900/20 text-red-300 border-red-700/40'
                      : rec.priority === 'high'
                        ? 'bg-amber-900/20 text-amber-300 border-amber-700/40'
                        : 'bg-yellow-900/20 text-yellow-300 border-yellow-700/40'
                  }`}>
                    {rec.priority}
                  </span>
                  <span className="text-sm font-medium text-gray-200">{rec.title}</span>
                </div>
                <p className="text-xs text-gray-400">{rec.suggestedAction}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Entity Inventory Table (fixed) */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-200">Entity Inventory</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Entity</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Mentions</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">EAV Count</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Consistent?</th>
              </tr>
            </thead>
            <tbody>
              {visibleEntities.length > 0 ? (
                visibleEntities.map(([name, data], i) => {
                  const mentions = data.sources.size;
                  const consistent = (data.totalConfidence / data.eavCount) > 0.7;
                  const entityType = deriveEntityType(name, allEavs, businessDomain);
                  return (
                    <tr key={i} className="border-b border-gray-700/50">
                      <td className="px-6 py-3 text-gray-300 font-medium">{name}</td>
                      <td className="px-6 py-3 text-gray-400">{entityType}</td>
                      <td className="px-6 py-3 text-center text-gray-300">{mentions}</td>
                      <td className="px-6 py-3 text-center text-gray-300">{data.eavCount}</td>
                      <td className="px-6 py-3 text-center">
                        {consistent ? (
                          <span className="text-green-400 text-xs">Yes</span>
                        ) : (
                          <span className="text-amber-400 text-xs">Review</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No entities discovered yet. Run gap analysis to populate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {allEntities.length > 10 && (
          <div className="px-6 py-3 border-t border-gray-700">
            <button
              type="button"
              onClick={() => setShowAllEntities(!showAllEntities)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {showAllEntities ? `Show fewer` : `Show all ${allEntities.length} entities`}
            </button>
          </div>
        )}
      </div>

      {/* 8. Heading Analysis Summary */}
      {results && <HeadingAnalysisSummary headingAnalysis={results.headingAnalysis} />}

      {/* 9. Run Analysis Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onRunAnalysis}
          disabled={isGenerating}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2"
        >
          {isGenerating && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isGenerating ? 'Analyzing...' : results ? 'Re-run Gap Analysis' : 'Run Gap Analysis'}
        </button>
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineGapStep: React.FC = () => {
  const {
    isGreenfield,
    autoApprove,
    advanceStep,
    approveGate,
    rejectGate,
    reviseStep,
    toggleAutoApprove,
    getStepState,
    setCurrentStep,
    setStepStatus,
    activeMap,
  } = usePipeline();
  const { state, dispatch } = useAppState();

  const stepState = getStepState('gap_analysis');
  const gate = stepState?.gate;

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<QueryNetworkAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleContinueToStrategy = () => {
    setCurrentStep('strategy');
  };

  const handleRunAnalysis = async () => {
    const businessInfo = state.businessInfo;
    const pillars = activeMap?.pillars;

    // Central Entity from pillars, or fall back to seedKeyword from business info (set during crawl step)
    const centralEntity = pillars?.centralEntity || businessInfo.seedKeyword;

    if (!centralEntity) {
      setError('Central Entity or Seed Keyword is required. Complete the Crawl step with business context first.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress('Starting gap analysis...');
    setStepStatus('gap_analysis', 'in_progress');

    const config: QueryNetworkAuditConfig = {
      seedKeyword: centralEntity,
      targetDomain: businessInfo.domain,
      maxQueries: 10,
      maxCompetitors: 5,
      includeOwnContent: !!businessInfo.domain,
      includeEntityValidation: false,
      language: businessInfo.language || 'en',
    };

    try {
      const result = await runQueryNetworkAudit(config, businessInfo, (prog) => {
        setProgress(prog.currentStep);
      });
      setResults(result);

      // Persist gap analysis results to map state for downstream steps
      if (state.activeMapId) {
        dispatch({
          type: 'UPDATE_MAP_DATA',
          payload: {
            mapId: state.activeMapId,
            data: {
              analysis_state: {
                ...activeMap?.analysis_state,
                gap_analysis: result,
              },
            } as any,
          },
        });
      }

      setStepStatus('gap_analysis', 'pending_approval');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gap analysis failed';
      setError(message);
      setStepStatus('gap_analysis', 'in_progress');
    } finally {
      setIsGenerating(false);
      setProgress('');
    }
  };

  // Compute scores for ApprovalGate summary metrics
  type MetricColor = 'green' | 'blue' | 'amber' | 'red' | 'gray';
  const scores = results ? computeGapScores(results) : null;
  const summaryMetrics: Array<{ label: string; value: string | number; color?: MetricColor }> = scores
    ? [
        { label: 'Overall Health', value: `${scores.overallHealth}/100`, color: scoreColor(scores.overallHealth) },
        { label: 'Content Quality', value: `${scores.contentQuality}/100`, color: scoreColor(scores.contentQuality) },
        { label: 'Page Structure', value: scores.pageStructure >= 0 ? `${scores.pageStructure}/100` : 'N/A', color: scores.pageStructure >= 0 ? scoreColor(scores.pageStructure) : 'gray' },
        { label: 'Info Density', value: `${scores.informationDensity}/100`, color: scoreColor(scores.informationDensity) },
      ]
    : [
        { label: 'Overall Health', value: '--', color: 'gray' },
        { label: 'Content Quality', value: '--', color: 'gray' },
        { label: 'Page Structure', value: '--', color: 'gray' },
        { label: 'Info Density', value: '--', color: 'gray' },
      ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Gap Analysis</h2>
        <p className="text-sm text-gray-400 mt-1">
          {isGreenfield
            ? 'No existing site to analyze'
            : 'Analyze your existing website against the Holistic SEO framework'}
        </p>
      </div>

      {/* Content */}
      {isGreenfield ? (
        <GreenfieldSkipNotice onContinue={handleContinueToStrategy} />
      ) : (
        <>
          <GapAnalysisContent
            results={results}
            isGenerating={isGenerating}
            progress={progress}
            error={error}
            onRunAnalysis={handleRunAnalysis}
            businessDomain={state.businessInfo.domain}
          />

          {/* Approval Gate */}
          {gate && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
            <ApprovalGate
              step="gap_analysis"
              gate={gate}
              approval={stepState?.approval}
              autoApprove={autoApprove}
              onApprove={() => approveGate('gap_analysis')}
              onReject={(reason) => rejectGate('gap_analysis', reason)}
              onRevise={() => reviseStep('gap_analysis')}
              onToggleAutoApprove={toggleAutoApprove}
              summaryMetrics={summaryMetrics}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PipelineGapStep;
