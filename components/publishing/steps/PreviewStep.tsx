/**
 * Preview Step
 *
 * Step 3 of Style & Publish modal.
 * Live preview with device frames and SEO validation.
 * Includes collapsible panels for layout and blueprint adjustments.
 *
 * @module components/publishing/steps/PreviewStep
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '../../ui/Button';
import { LayoutPanel } from '../panels/LayoutPanel';
import { BlueprintPanel } from '../panels/BlueprintPanel';
import { BrandMatchIndicator } from '../BrandMatchIndicator';
import { DesignQualityAssessment, type DesignIssue } from '../DesignQualityAssessment';
import { PipelineInspector } from '../PipelineInspector';
import type {
  StyledContentOutput,
  DevicePreview,
  SeoWarning,
  LayoutConfiguration,
  ContentTypeTemplate,
  PipelineTelemetry,
} from '../../../types/publishing';
import type { LayoutBlueprint } from '../../../services/publishing';

// ============================================================================
// Types
// ============================================================================

/**
 * Blueprint quality analysis result
 */
interface BlueprintQuality {
  coherence: {
    score: number;
    issues: {
      type: 'spacing' | 'background' | 'emphasis' | 'weight' | 'divider';
      severity: 'warning' | 'error';
      message: string;
      sectionIndex: number;
    }[];
    suggestions: {
      sectionIndex: number;
      property: string;
      currentValue: unknown;
      suggestedValue: unknown;
      reason: string;
    }[];
  };
  report: string;
  overallScore: number;
}

/**
 * Rendering metadata about how content was rendered
 */
interface RenderingMetadata {
  rendererUsed: string;
  fallbackReason?: string;
  brandScore?: number;
  unresolvedImageCount?: number;
  // Clear user messaging
  renderMessage?: string;
  renderReason?: string;
  renderLevel?: 'info' | 'warning' | 'error';
  renderDetails?: {
    brandExtractionUsed?: boolean;
    layoutBlueprintUsed?: boolean;
    aiLayoutUsed?: boolean;
    compiledCssUsed?: boolean;
    componentsDetected?: number;
    fallbackTriggered?: boolean;
  };
  pipelineTelemetry?: PipelineTelemetry;
}

/**
 * Visual quality check result from AI analysis
 */
interface VisualQualityCheck {
  score: number; // 0-100
  isAcceptable: boolean;
  issues: string[];
  recommendation: 'publish' | 'review' | 'rework';
  details: string;
}

interface PreviewStepProps {
  preview: StyledContentOutput | null;
  isGenerating: boolean;
  onRegenerate: () => void;
  seoWarnings: SeoWarning[];
  onCopyHtml?: (html: string) => void;
  onCopyCss?: (css: string) => void;
  // Layout configuration
  layout?: LayoutConfiguration;
  onLayoutChange?: (updates: Partial<LayoutConfiguration>) => void;
  onTemplateChange?: (template: ContentTypeTemplate) => void;
  // Blueprint configuration
  blueprint?: LayoutBlueprint | null;
  onBlueprintChange?: (blueprint: LayoutBlueprint) => void;
  isBlueprintGenerating?: boolean;
  onRegenerateBlueprint?: () => void;
  // Brand validation
  brandMatchScore?: number;
  brandAssessment?: string;
  onShowBrandDetails?: () => void;
  // Quality/fallback notifications
  blueprintQuality?: BlueprintQuality | null;
  renderingMetadata?: RenderingMetadata | null;
  // Visual quality check
  onRequestQualityCheck?: () => Promise<VisualQualityCheck>;
  onReworkOutput?: () => void;
  // API key for quality check
  geminiApiKey?: string;
  // Business/content context for design assessment
  businessContext?: {
    industry?: string;
    model?: string;
    audience?: string;
    valueProp?: string;
  };
  contentContext?: {
    title?: string;
    intent?: string;
    isCoreTopic?: boolean;
  };
  // AI-assisted fix handlers
  onAutoFixIssue?: (issue: DesignIssue) => Promise<void>;
  onRegenerateWithInstructions?: (instructions: string) => Promise<void>;
  // Semantic Layout Engine toggle
  useSemanticLayoutEngine?: boolean;
  onSemanticLayoutEngineChange?: (enabled: boolean) => void;
  // Renderer path selector
  rendererPath?: 'auto' | 'brand-templates' | 'clean-components';
  onRendererPathChange?: (path: 'auto' | 'brand-templates' | 'clean-components') => void;
}

interface DeviceFrameProps {
  device: DevicePreview;
  children: React.ReactNode;
}

/**
 * Build a complete HTML document for iframe srcdoc from preview output.
 * Handles both full documents (<!DOCTYPE html>) and HTML fragments.
 */
function buildIframeSrcdoc(html: string, css: string): string {
  const isFullDocument = html.trim().startsWith('<!DOCTYPE') || html.trim().startsWith('<html');

  if (isFullDocument) {
    // Already a full document - return as-is (CSS is already embedded)
    return html;
  }

  // Fragment - wrap in a document with CSS
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${css}</style>
</head>
<body style="margin:0;padding:0;">
${html}
</body>
</html>`;
}

// ============================================================================
// Device Frame Component
// ============================================================================

const DEVICE_SIZES: Record<DevicePreview, { width: number; height: number; label: string; scale: number }> = {
  desktop: { width: 1200, height: 900, label: 'Desktop', scale: 0.85 },
  tablet: { width: 768, height: 1024, label: 'Tablet', scale: 0.65 },
  mobile: { width: 375, height: 700, label: 'Mobile', scale: 0.85 },
};

const DeviceFrame: React.FC<DeviceFrameProps> = ({ device, children }) => {
  const size = DEVICE_SIZES[device];
  const scale = size.scale;

  return (
    <div
      className="relative mx-auto"
      style={{
        width: size.width * scale,
        height: size.height * scale,
      }}
    >
      {/* Device frame */}
      <div
        className={`
          absolute inset-0 rounded-xl border-2 border-gray-600 bg-gray-900 overflow-hidden shadow-2xl
          ${device === 'mobile' ? 'rounded-3xl border-4 border-gray-700' : ''}
        `}
      >
        {/* Browser chrome for desktop/tablet */}
        {device !== 'mobile' && (
          <div className="h-8 bg-gradient-to-b from-gray-750 to-gray-800 border-b border-gray-700 flex items-center px-3 gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm" />
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
            <div className="flex-1 mx-4">
              <div className="h-5 bg-gray-700/80 rounded-md text-xs text-gray-400 flex items-center justify-center px-4">
                preview.yoursite.com
              </div>
            </div>
          </div>
        )}

        {/* Mobile notch */}
        {device === 'mobile' && (
          <div className="h-5 bg-gray-900 flex items-center justify-center">
            <div className="w-16 h-2 bg-gray-800 rounded-full" />
          </div>
        )}

        {/* Content area - iframe is scaled down to fit the device frame */}
        <div
          className="overflow-hidden"
          style={{
            height: device === 'mobile'
              ? size.height * scale - 20 - 16
              : size.height * scale - 32 - 8,
            backgroundColor: '#ffffff',
          }}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: size.width,
              height: Math.round((device === 'mobile'
                ? size.height * scale - 20 - 16
                : size.height * scale - 32 - 8) / scale),
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Component
// ============================================================================

export const PreviewStep: React.FC<PreviewStepProps> = ({
  preview,
  isGenerating,
  onRegenerate,
  seoWarnings,
  onCopyHtml,
  onCopyCss,
  // Layout props
  layout,
  onLayoutChange,
  onTemplateChange,
  // Blueprint props
  blueprint,
  onBlueprintChange,
  isBlueprintGenerating,
  onRegenerateBlueprint,
  // Brand validation props
  brandMatchScore,
  brandAssessment,
  onShowBrandDetails,
  // Quality/fallback props
  blueprintQuality,
  renderingMetadata,
  // Quality check props
  onRequestQualityCheck,
  onReworkOutput,
  geminiApiKey,
  // Business/content context
  businessContext,
  contentContext,
  // AI fix handlers
  onAutoFixIssue,
  onRegenerateWithInstructions,
  // Semantic Layout Engine toggle
  useSemanticLayoutEngine,
  onSemanticLayoutEngineChange,
  // Renderer path selector
  rendererPath,
  onRendererPathChange,
}) => {
  const [device, setDevice] = useState<DevicePreview>('desktop');
  const [showRawHtml, setShowRawHtml] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFixingDesign, setIsFixingDesign] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // Handle AI fix for individual design issue
  const handleAutoFixIssue = useCallback(async (issue: DesignIssue) => {
    if (!onAutoFixIssue) return;
    setIsFixingDesign(true);
    try {
      await onAutoFixIssue(issue);
    } finally {
      setIsFixingDesign(false);
    }
  }, [onAutoFixIssue]);

  // Handle regenerate with all fix instructions
  const handleRegenerateWithInstructions = useCallback(async (instructions: string) => {
    if (!onRegenerateWithInstructions) return;
    setIsFixingDesign(true);
    try {
      await onRegenerateWithInstructions(instructions);
    } finally {
      setIsFixingDesign(false);
    }
  }, [onRegenerateWithInstructions]);

  // SEO warning counts
  const warningCounts = useMemo(() => ({
    error: seoWarnings.filter(w => w.severity === 'error').length,
    warning: seoWarnings.filter(w => w.severity === 'warning').length,
    info: seoWarnings.filter(w => w.severity === 'info').length,
  }), [seoWarnings]);

  // Design quality score reported by DesignQualityAssessment
  const [designScore, setDesignScore] = useState<{
    overall: number;
    criticalCount: number;
    recommendation: string;
  } | null>(null);

  // Auto-expand details when design quality is poor
  const handleDesignScoreCalculated = useCallback((result: {
    overallScore: number;
    issues: { severity: string }[];
    recommendation: string;
  }) => {
    const criticalCount = result.issues.filter(i => i.severity === 'critical').length;
    setDesignScore({
      overall: result.overallScore,
      criticalCount,
      recommendation: result.recommendation,
    });
    // Auto-expand details when quality is poor or there are critical issues
    if (result.overallScore < 50 || criticalCount > 0) {
      setShowDetails(true);
    }
  }, []);

  // Helper: build interactivity-enhanced HTML bundle for copy/download
  const buildBundle = useCallback((forDownload = false) => {
    if (!preview) return '';
    const isFullDocument = preview.html.trim().startsWith('<!DOCTYPE') || preview.html.trim().startsWith('<html');
    const interactivityScript = `
<script>
document.querySelectorAll('.ctc-faq-trigger').forEach(function(trigger) {
  trigger.addEventListener('click', function() {
    var answer = document.getElementById(trigger.getAttribute('aria-controls'));
    var isExpanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', !isExpanded);
    if (answer) answer.hidden = isExpanded;
  });
});
document.querySelectorAll('.ctc-toc a[href^="#"]').forEach(function(link) {
  link.addEventListener('click', function(e) {
    var target = document.querySelector(this.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});
</script>`;

    if (isFullDocument) {
      return preview.html.replace('</body>', `${interactivityScript}\n</body>`);
    }

    const title = forDownload ? (contentContext?.title || 'Styled Article') : 'Styled Article';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>\n${preview.css}\n  </style>
</head>
<body>
${preview.html}
${interactivityScript}
</body>
</html>`;
  }, [preview, contentContext?.title]);

  // Render loading state
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-zinc-400">
        <div className="animate-spin w-8 h-8 border-2 border-zinc-500 border-t-transparent rounded-full mb-4" />
        <p>Generating styled preview...</p>
      </div>
    );
  }

  // Render empty state
  if (!preview) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <p className="mb-4">No preview available</p>
        <Button variant="secondary" onClick={onRegenerate}>
          Generate Preview
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ================================================================ */}
      {/* CONTROLS BAR                                                     */}
      {/* ================================================================ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Device selector */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            {(Object.keys(DEVICE_SIZES) as DevicePreview[]).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                className={`
                  px-2.5 py-1 text-sm rounded-md transition-colors
                  ${device === d
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white'
                  }
                `}
              >
                {d === 'desktop' ? '💻' : d === 'tablet' ? '📱' : '📱'}
                <span className="ml-1 hidden sm:inline">{DEVICE_SIZES[d].label}</span>
              </button>
            ))}
          </div>

          {/* Renderer path selector */}
          {onRendererPathChange && (
            <select
              value={rendererPath || 'auto'}
              onChange={(e) => onRendererPathChange(e.target.value as 'auto' | 'brand-templates' | 'clean-components')}
              className="px-2 py-1.5 text-xs bg-gray-800 text-gray-300 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              title="Choose which rendering engine to use"
            >
              <option value="auto">Renderer: Auto</option>
              <option value="clean-components">Renderer: Clean Components</option>
              <option value="brand-templates">Renderer: Brand Templates</option>
            </select>
          )}

          {/* Semantic Layout Engine toggle */}
          {onSemanticLayoutEngineChange && (
            <label className="flex items-center gap-2 cursor-pointer group" title="AI-driven layout that transforms prose into visual components (cards, timelines, stats) based on content analysis">
              <input
                type="checkbox"
                checked={useSemanticLayoutEngine || false}
                onChange={(e) => onSemanticLayoutEngineChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-9 h-5 bg-gray-700 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">
                AI Layout
              </span>
            </label>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowRawHtml(!showRawHtml)}
            className={`px-2.5 py-1.5 text-xs rounded-md transition-colors ${
              showRawHtml ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {showRawHtml ? 'Preview' : '</>'}
          </button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const bundle = buildBundle(false);
              if (bundle) {
                navigator.clipboard.writeText(bundle);
                if (onCopyHtml) onCopyHtml(bundle);
              }
            }}
          >
            Copy
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const bundle = buildBundle(true);
              if (!bundle) return;
              const filename = (contentContext?.title || 'article')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
                .substring(0, 50) + '.html';
              const blob = new Blob([bundle], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            Download
          </Button>

          <Button variant="ghost" size="sm" onClick={onRegenerate}>
            Regenerate
          </Button>

          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="px-2.5 py-1.5 text-xs rounded-md transition-colors bg-zinc-700 text-white hover:bg-zinc-600"
            title="Open fullscreen preview"
          >
            Expand
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* CRITICAL BANNERS (errors + fixing state only)                    */}
      {/* ================================================================ */}
      {renderingMetadata?.renderLevel === 'error' && renderingMetadata?.renderMessage && (
        <div className="px-3 py-2 bg-red-900/30 rounded-lg border border-red-500/30 flex items-center gap-2">
          <span className="text-red-400 text-sm">Error:</span>
          <span className="text-sm text-red-300">{renderingMetadata.renderMessage}</span>
        </div>
      )}

      {isFixingDesign && (
        <div className="px-3 py-2 bg-blue-900/30 rounded-lg border border-blue-500/30 flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="text-sm text-blue-300">AI is improving your design...</span>
        </div>
      )}

      {/* ================================================================ */}
      {/* PREVIEW - PRIMARY CONTENT AREA                                   */}
      {/* ================================================================ */}
      <div className="bg-gray-900 rounded-xl p-4 overflow-auto shadow-2xl" style={{ minHeight: '70vh' }}>
        {showRawHtml ? (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">HTML</h4>
              <pre className="bg-gray-950 p-4 rounded-lg overflow-auto text-xs text-gray-300 max-h-[60vh]">
                <code>{preview.html}</code>
              </pre>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">CSS</h4>
              <pre className="bg-gray-950 p-4 rounded-lg overflow-auto text-xs text-gray-300 max-h-[60vh]">
                <code>{preview.css}</code>
              </pre>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">CSS Variables</h4>
              <pre className="bg-gray-950 p-4 rounded-lg overflow-auto text-xs text-gray-300 max-h-[60vh]">
                <code>{JSON.stringify(preview.cssVariables, null, 2)}</code>
              </pre>
            </div>
          </div>
        ) : (
          <DeviceFrame device={device}>
            <iframe
              ref={iframeRef}
              srcDoc={buildIframeSrcdoc(preview.html, preview.css)}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: '#ffffff',
              }}
              sandbox="allow-same-origin allow-scripts"
              title="Article preview"
            />
          </DeviceFrame>
        )}
      </div>

      {/* ================================================================ */}
      {/* STATUS STRIP - Key metrics at a glance                           */}
      {/* ================================================================ */}
      <div className="space-y-2">
        {/* Design quality alert - always visible when score is poor */}
        {designScore && designScore.overall < 50 && (
          <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${
            designScore.overall < 30
              ? 'bg-red-900/30 border-red-500/30'
              : 'bg-yellow-900/30 border-yellow-500/30'
          }`}>
            <div className="flex items-center gap-3">
              <span className={`text-lg font-bold ${
                designScore.overall < 30 ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {designScore.overall}%
              </span>
              <div>
                <span className={`text-sm font-medium ${
                  designScore.overall < 30 ? 'text-red-300' : 'text-yellow-300'
                }`}>
                  Design Quality
                  {designScore.criticalCount > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-red-500/20 text-red-300 text-xs rounded">
                      {designScore.criticalCount} critical
                    </span>
                  )}
                </span>
                <p className={`text-xs mt-0.5 ${
                  designScore.overall < 30 ? 'text-red-400/70' : 'text-yellow-400/70'
                }`}>
                  {designScore.recommendation === 'rework-recommended'
                    ? 'Output needs rework before publishing'
                    : 'Improvements recommended - expand details below'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                designScore.overall < 30
                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                  : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
              }`}
            >
              View Issues
            </button>
          </div>
        )}

        {/* Compact metrics row */}
        <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-4 py-2">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Design quality score */}
            {designScore && (
              <span className="flex items-center gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full ${
                  designScore.overall >= 70 ? 'bg-green-400' : designScore.overall >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                }`} />
                <span className={`${
                  designScore.overall < 50 ? 'text-red-400 font-medium' : 'text-zinc-400'
                }`}>
                  Quality {designScore.overall}%
                </span>
                {designScore.criticalCount > 0 && (
                  <span className="text-red-400 font-medium">
                    ({designScore.criticalCount} critical)
                  </span>
                )}
              </span>
            )}

            {/* Brand score */}
            {brandMatchScore !== undefined && (
              <span className="flex items-center gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full ${
                  brandMatchScore >= 70 ? 'bg-green-400' : brandMatchScore >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                }`} />
                <span className="text-zinc-400">Brand {brandMatchScore}%</span>
              </span>
            )}

            {/* SEO summary */}
            {seoWarnings.length > 0 && (
              <span className="text-xs text-zinc-400">
                SEO:
                {warningCounts.error > 0 && <span className="text-red-400 ml-1">{warningCounts.error} err</span>}
                {warningCounts.warning > 0 && <span className="text-yellow-400 ml-1">{warningCounts.warning} warn</span>}
                {warningCounts.error === 0 && warningCounts.warning === 0 && <span className="text-green-400 ml-1">OK</span>}
              </span>
            )}

            {/* Renderer + component info */}
            <span className="text-xs text-zinc-500">
              {renderingMetadata?.rendererUsed && <>{renderingMetadata.rendererUsed} · </>}
              {preview.components.length} components
              {' '}
              {preview.seoValidation.headingStructure.hasH1 ? '✓' : '✗'} H1
              {' '}
              {preview.seoValidation.schemaPreserved ? '✓' : '✗'} Schema
            </span>

            {/* Pipeline telemetry summary */}
            {renderingMetadata?.pipelineTelemetry && (() => {
              const t = renderingMetadata.pipelineTelemetry!;
              const fb = t.sectionDecisions.filter(d => d.status === 'fallback').length;
              const er = t.sectionDecisions.filter(d => d.status === 'error').length;
              return (fb > 0 || er > 0) ? (
                <span className="text-xs">
                  {fb > 0 && <span className="text-yellow-400">{fb} fallback</span>}
                  {er > 0 && <span className="text-red-400 ml-1">{er} error</span>}
                </span>
              ) : null;
            })()}
          </div>

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <span className="text-[10px]">{showDetails ? '▼' : '▶'}</span>
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* DESIGN QUALITY (always mounted so score callback fires)          */}
      {/* ================================================================ */}
      <div className={showDetails ? '' : 'hidden'}>
        {preview?.html && (
          <DesignQualityAssessment
            html={preview.html}
            css={preview.css || ''}
            businessContext={businessContext}
            contentContext={contentContext}
            onAutoFix={onAutoFixIssue ? handleAutoFixIssue : undefined}
            onRegenerateWithInstructions={onRegenerateWithInstructions ? handleRegenerateWithInstructions : undefined}
            isFixing={isFixingDesign}
            onScoreCalculated={handleDesignScoreCalculated}
          />
        )}
      </div>

      {/* ================================================================ */}
      {/* EXPANDABLE DETAILS & DIAGNOSTICS                                 */}
      {/* ================================================================ */}
      {showDetails && (
        <div className="space-y-3 bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/50">
          {/* Rendering Status Notification */}
          {renderingMetadata?.renderMessage && renderingMetadata.renderLevel !== 'error' && (
            <div className={`p-3 rounded-lg border ${
              renderingMetadata.renderLevel === 'warning'
                ? 'bg-yellow-900/30 border-yellow-500/30'
                : 'bg-blue-900/30 border-blue-500/30'
            }`}>
              <div className="flex items-start gap-2">
                <span className={renderingMetadata.renderLevel === 'warning' ? 'text-yellow-400' : 'text-blue-400'}>
                  {renderingMetadata.renderLevel === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    renderingMetadata.renderLevel === 'warning' ? 'text-yellow-300' : 'text-blue-300'
                  }`}>
                    {renderingMetadata.renderMessage}
                  </p>
                  {renderingMetadata.renderReason && (
                    <p className={`text-xs mt-0.5 ${
                      renderingMetadata.renderLevel === 'warning' ? 'text-yellow-400/80' : 'text-blue-400/80'
                    }`}>
                      {renderingMetadata.renderReason}
                    </p>
                  )}
                  {renderingMetadata.renderDetails && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {renderingMetadata.renderDetails.brandExtractionUsed && (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded">Brand Extraction</span>
                      )}
                      {renderingMetadata.renderDetails.compiledCssUsed && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">AI-Generated CSS</span>
                      )}
                      {renderingMetadata.renderDetails.layoutBlueprintUsed && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">Layout Blueprint</span>
                      )}
                      {renderingMetadata.renderDetails.aiLayoutUsed && (
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded">AI Layout Planning</span>
                      )}
                      {renderingMetadata.renderDetails.fallbackTriggered && (
                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 text-xs rounded">Fallback Used</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Legacy Rendering Fallback Warning */}
          {!renderingMetadata?.renderMessage && renderingMetadata?.rendererUsed === 'BlueprintRenderer' && renderingMetadata.fallbackReason && (
            <div className="p-3 bg-yellow-900/30 rounded-lg border border-yellow-500/30">
              <div className="flex items-start gap-2">
                <span className="text-yellow-400">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-yellow-300">Brand styling limited</p>
                  <p className="text-xs text-yellow-400/80 mt-0.5">
                    {renderingMetadata.fallbackReason || 'Full brand extraction not available. Using design tokens instead.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Brand Match Indicator */}
          {brandMatchScore !== undefined && (
            <BrandMatchIndicator
              score={brandMatchScore}
              assessmentText={brandAssessment}
              onShowDetails={onShowBrandDetails}
            />
          )}

          {/* Unresolved Images Warning */}
          {renderingMetadata?.unresolvedImageCount != null && renderingMetadata.unresolvedImageCount > 0 && (
            <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
              <div className="flex items-start gap-2">
                <span className="text-blue-400">🖼️</span>
                <div>
                  <p className="text-sm font-medium text-blue-300">
                    {renderingMetadata.unresolvedImageCount} image placeholder{renderingMetadata.unresolvedImageCount > 1 ? 's' : ''} need attention
                  </p>
                  <p className="text-xs text-blue-400/80 mt-0.5">
                    Generate images in the Image Management panel to replace placeholders.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Blueprint Quality Warning */}
          {blueprintQuality && blueprintQuality.overallScore < 70 && (
            <div className="p-3 bg-amber-900/30 rounded-lg border border-amber-500/30">
              <div className="flex items-start gap-2">
                <span className="text-amber-400">📐</span>
                <div>
                  <p className="text-sm font-medium text-amber-300">
                    Layout coherence: {blueprintQuality.overallScore}%
                  </p>
                  {blueprintQuality.coherence.issues.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {blueprintQuality.coherence.issues.slice(0, 3).map((issue, idx) => (
                        <li key={idx} className="text-xs text-amber-400/80 flex items-start gap-1">
                          <span>{issue.severity === 'error' ? '•' : '○'}</span>
                          <span>{issue.message}</span>
                        </li>
                      ))}
                      {blueprintQuality.coherence.issues.length > 3 && (
                        <li className="text-xs text-amber-400/60 ml-3">
                          +{blueprintQuality.coherence.issues.length - 3} more issues
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pipeline Inspector */}
          {renderingMetadata?.pipelineTelemetry && (
            <PipelineInspector telemetry={renderingMetadata.pipelineTelemetry} />
          )}

          {/* SEO Validation */}
          {seoWarnings.length > 0 && (
            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-sm font-medium text-white">SEO Validation</span>
                {warningCounts.error > 0 && (
                  <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs rounded">
                    {warningCounts.error} error{warningCounts.error > 1 ? 's' : ''}
                  </span>
                )}
                {warningCounts.warning > 0 && (
                  <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 text-xs rounded">
                    {warningCounts.warning} warning{warningCounts.warning > 1 ? 's' : ''}
                  </span>
                )}
                {warningCounts.info > 0 && (
                  <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-xs rounded">
                    {warningCounts.info} info
                  </span>
                )}
              </div>
              <ul className="space-y-1">
                {seoWarnings.map((warning, index) => (
                  <li
                    key={index}
                    className={`text-xs flex items-start gap-2 ${warning.severity === 'error' ? 'text-red-400' :
                      warning.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                    }`}
                  >
                    <span>
                      {warning.severity === 'error' ? '❌' :
                        warning.severity === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                    <span>
                      {warning.message}
                      {warning.suggestion && (
                        <span className="text-gray-500 ml-1">— {warning.suggestion}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* ADJUSTMENT PANELS                                                */}
      {/* ================================================================ */}
      {(layout || blueprint) && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 italic">
            Preview looks good? Click "Next" to publish. Want changes? Expand panels below.
          </p>

          {layout && onLayoutChange && onTemplateChange && (
            <LayoutPanel
              layout={layout}
              onChange={onLayoutChange}
              onTemplateChange={onTemplateChange}
            />
          )}

          {blueprint && onBlueprintChange && (
            <BlueprintPanel
              blueprint={blueprint}
              onBlueprintChange={onBlueprintChange}
              isGenerating={isBlueprintGenerating}
              onRegenerate={onRegenerateBlueprint}
            />
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* FULLSCREEN PREVIEW MODAL                                         */}
      {/* ================================================================ */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFullscreen(false);
          }}
        >
          <div className="flex items-center justify-between p-3 bg-zinc-900 border-b border-zinc-800">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-white">Full Preview</h3>
              <span className="text-sm text-zinc-400">
                Check layout, typography, and visual hierarchy at actual size
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onReworkOutput && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsFullscreen(false);
                    onReworkOutput();
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Regenerate
                </Button>
              )}
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-white">
            <iframe
              srcDoc={buildIframeSrcdoc(preview.html, preview.css)}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: '#ffffff',
              }}
              sandbox="allow-same-origin allow-scripts"
              title="Article fullscreen preview"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewStep;
