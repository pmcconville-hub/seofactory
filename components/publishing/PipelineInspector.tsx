/**
 * PipelineInspector
 *
 * Collapsible panel showing rendering pipeline decisions for debugging.
 * Displays brand detection, per-section decisions, CSS sources, and warnings.
 */

import React, { useState } from 'react';
import type { PipelineTelemetry } from '../../types/publishing';

interface PipelineInspectorProps {
  telemetry: PipelineTelemetry;
}

export const PipelineInspector: React.FC<PipelineInspectorProps> = ({ telemetry }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const fallbackCount = telemetry.sectionDecisions.filter(d => d.status === 'fallback').length;
  const errorCount = telemetry.sectionDecisions.filter(d => d.status === 'error').length;
  const okCount = telemetry.sectionDecisions.filter(d => d.status === 'ok').length;

  return (
    <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-zinc-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">
            {isExpanded ? '▼' : '▶'}
          </span>
          <span className="text-sm font-medium text-zinc-300">Pipeline Inspector</span>
          <span className="text-xs text-zinc-500">
            {okCount} ok
            {fallbackCount > 0 && <span className="text-yellow-400 ml-1">{fallbackCount} fallback</span>}
            {errorCount > 0 && <span className="text-red-400 ml-1">{errorCount} error</span>}
          </span>
        </div>
        {telemetry.warnings.length > 0 && (
          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs rounded">
            {telemetry.warnings.length} warning{telemetry.warnings.length > 1 ? 's' : ''}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-700">
          {/* Brand Detection */}
          {telemetry.brandInfo && (
            <div className="mt-3">
              <h5 className="text-xs font-medium text-zinc-400 uppercase mb-2">Brand Detection</h5>
              <div className="flex flex-wrap gap-3">
                {telemetry.brandInfo.brandName && (
                  <div className="text-xs text-zinc-300">
                    <span className="text-zinc-500">Brand:</span> {telemetry.brandInfo.brandName}
                  </div>
                )}
                {telemetry.brandInfo.primaryColor && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <div
                      className="w-3 h-3 rounded-sm border border-zinc-600"
                      style={{ backgroundColor: telemetry.brandInfo.primaryColor }}
                    />
                    <span className="text-zinc-500">Primary</span>
                  </div>
                )}
                {telemetry.brandInfo.secondaryColor && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <div
                      className="w-3 h-3 rounded-sm border border-zinc-600"
                      style={{ backgroundColor: telemetry.brandInfo.secondaryColor }}
                    />
                    <span className="text-zinc-500">Secondary</span>
                  </div>
                )}
                {telemetry.brandInfo.accentColor && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <div
                      className="w-3 h-3 rounded-sm border border-zinc-600"
                      style={{ backgroundColor: telemetry.brandInfo.accentColor }}
                    />
                    <span className="text-zinc-500">Accent</span>
                  </div>
                )}
                {telemetry.brandInfo.headingFont && (
                  <div className="text-xs text-zinc-300">
                    <span className="text-zinc-500">Heading:</span> {telemetry.brandInfo.headingFont}
                  </div>
                )}
                {telemetry.brandInfo.bodyFont && (
                  <div className="text-xs text-zinc-300">
                    <span className="text-zinc-500">Body:</span> {telemetry.brandInfo.bodyFont}
                  </div>
                )}
                {telemetry.brandInfo.personality && (
                  <div className="text-xs text-zinc-300">
                    <span className="text-zinc-500">Style:</span> {telemetry.brandInfo.personality}
                  </div>
                )}
                {telemetry.brandInfo.confidence !== undefined && (
                  <div className="text-xs text-zinc-300">
                    <span className="text-zinc-500">Confidence:</span> {Math.round(telemetry.brandInfo.confidence * 100)}%
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CSS Pipeline */}
          <div>
            <h5 className="text-xs font-medium text-zinc-400 uppercase mb-2">CSS Pipeline</h5>
            <div className="flex flex-wrap gap-2">
              <CssSourceBadge
                label="Compiled CSS"
                active={telemetry.cssSources.compiledCss}
                detail={telemetry.cssSources.compiledCssLength ? `${Math.round(telemetry.cssSources.compiledCssLength / 1024)}KB` : undefined}
              />
              <CssSourceBadge label="Component Styles" active={telemetry.cssSources.componentStyles} />
              <CssSourceBadge label="Structural CSS" active={telemetry.cssSources.structural} />
            </div>
          </div>

          {/* Per-Section Decisions */}
          {telemetry.sectionDecisions.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-zinc-400 uppercase mb-2">
                Section Decisions ({telemetry.sectionDecisions.length})
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-700">
                      <th className="text-left py-1.5 pr-3">Section</th>
                      <th className="text-left py-1.5 pr-3">Component</th>
                      <th className="text-left py-1.5 pr-3">Emphasis</th>
                      <th className="text-left py-1.5 pr-3">Width</th>
                      <th className="text-left py-1.5 pr-3">Rendered As</th>
                      <th className="text-left py-1.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {telemetry.sectionDecisions.map((decision, idx) => (
                      <tr key={idx} className="border-b border-zinc-800/50">
                        <td className="py-1.5 pr-3 text-zinc-300 max-w-[200px] truncate" title={decision.heading}>
                          {decision.heading}
                        </td>
                        <td className="py-1.5 pr-3 text-zinc-400">{decision.assignedComponent}</td>
                        <td className="py-1.5 pr-3">
                          <EmphasisBadge level={decision.emphasis} />
                        </td>
                        <td className="py-1.5 pr-3 text-zinc-400">{decision.width}</td>
                        <td className="py-1.5 pr-3 text-zinc-400">
                          {decision.renderedAs !== decision.assignedComponent ? (
                            <span className="text-yellow-400">{decision.renderedAs}</span>
                          ) : (
                            decision.renderedAs
                          )}
                        </td>
                        <td className="py-1.5">
                          <StatusDot status={decision.status} reason={decision.fallbackReason} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Warnings */}
          {telemetry.warnings.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-yellow-400 uppercase mb-2">Warnings</h5>
              <ul className="space-y-1">
                {telemetry.warnings.map((warning, idx) => (
                  <li key={idx} className="text-xs text-yellow-300/80 flex items-start gap-1.5">
                    <span className="text-yellow-400 mt-0.5">-</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CssSourceBadge: React.FC<{ label: string; active: boolean; detail?: string }> = ({ label, active, detail }) => (
  <span className={`px-2 py-1 rounded text-xs ${
    active
      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
      : 'bg-zinc-700/50 text-zinc-500 border border-zinc-700'
  }`}>
    {active ? '✓' : '✗'} {label}
    {detail && <span className="ml-1 opacity-70">({detail})</span>}
  </span>
);

const EmphasisBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors: Record<string, string> = {
    hero: 'bg-purple-500/20 text-purple-300',
    featured: 'bg-blue-500/20 text-blue-300',
    standard: 'bg-zinc-600/30 text-zinc-400',
    supporting: 'bg-zinc-700/30 text-zinc-500',
    minimal: 'bg-zinc-800/30 text-zinc-600',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs ${colors[level] || colors.standard}`}>
      {level}
    </span>
  );
};

const StatusDot: React.FC<{ status: 'ok' | 'fallback' | 'error'; reason?: string }> = ({ status, reason }) => {
  const colors = {
    ok: 'bg-green-400',
    fallback: 'bg-yellow-400',
    error: 'bg-red-400',
  };
  return (
    <span className="flex items-center gap-1.5" title={reason}>
      <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span className={`${
        status === 'ok' ? 'text-green-400' :
        status === 'fallback' ? 'text-yellow-400' : 'text-red-400'
      }`}>
        {status}
      </span>
    </span>
  );
};

export default PipelineInspector;
