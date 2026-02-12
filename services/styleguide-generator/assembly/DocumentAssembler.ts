// services/styleguide-generator/assembly/DocumentAssembler.ts
// Combines all rendered sections into a complete, self-contained HTML document.

import type { DesignTokenSet, BrandAnalysis, RenderedSection } from '../types';
import { buildNavItems, renderNavigation } from './NavigationBuilder';

export interface AssemblyOptions {
  tokens: DesignTokenSet;
  analysis: BrandAnalysis;
  sections: RenderedSection[];
  version?: number;
}

/**
 * Assemble a complete styleguide HTML document from rendered sections.
 * Produces a self-contained HTML file with inline styles, Google Fonts, and navigation.
 */
export function assembleDocument(options: AssemblyOptions): string {
  const { tokens, analysis, sections, version = 1 } = options;
  const p = tokens.prefix;
  const sortedSections = [...sections].sort((a, b) => a.id - b.id);

  const head = buildHead(tokens, analysis);
  const header = buildHeader(analysis, tokens, sortedSections.length, version);
  const nav = renderNavigation(buildNavItems(sortedSections), p);
  const body = sortedSections.map(s => s.html).join('\n\n');
  const footer = buildFooter(analysis, version);

  return `<!DOCTYPE html>
<html lang="${analysis.domain?.endsWith('.nl') ? 'nl' : 'en'}">
${head}
<body>
${header}
${nav}
<main class="sg-main">
${body}
</main>
${footer}
</body>
</html>`;
}

// ============================================================================
// HEAD
// ============================================================================

function buildHead(tokens: DesignTokenSet, analysis: BrandAnalysis): string {
  const p = tokens.prefix;
  const googleFontsLink = tokens.typography.googleFontsUrl
    ? `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${tokens.typography.googleFontsUrl}" rel="stylesheet">`
    : '';

  return `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${analysis.brandName} — CSS Design System</title>
  ${googleFontsLink}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
${buildStyleguidePageCss(tokens)}
  </style>
</head>`;
}

// ============================================================================
// STYLEGUIDE PAGE CSS (layout, navigation, section chrome — not component CSS)
// ============================================================================

function buildStyleguidePageCss(tokens: DesignTokenSet): string {
  const p = tokens.prefix;
  return `    /* ============================================
       STYLEGUIDE PAGE LAYOUT
       ============================================ */
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: ${tokens.typography.bodyFont};
      font-size: 16px;
      line-height: 1.6;
      color: ${tokens.colors.gray[800]};
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
    }

    /* ─── Header ─── */
    .sg-header {
      background: linear-gradient(135deg, ${tokens.colors.primary[400]}, ${tokens.colors.primary[600]});
      color: #ffffff;
      padding: 48px 32px;
      text-align: center;
    }
    .sg-header h1 {
      font-family: ${tokens.typography.headingFont};
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .sg-header .sg-subtitle {
      font-size: 1.125rem;
      opacity: 0.9;
    }
    .sg-header .sg-stats {
      display: flex;
      justify-content: center;
      gap: 32px;
      margin-top: 24px;
      flex-wrap: wrap;
    }
    .sg-header .sg-stat {
      text-align: center;
    }
    .sg-header .sg-stat-value {
      font-size: 1.5rem;
      font-weight: 700;
    }
    .sg-header .sg-stat-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.8;
    }
    .sg-version-badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-top: 12px;
    }

    /* ─── Navigation ─── */
    .sg-nav {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: ${tokens.colors.gray[900]};
      padding: 0;
      overflow-x: auto;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .sg-nav-inner {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 16px;
      min-width: max-content;
    }
    .sg-nav-link {
      color: ${tokens.colors.gray[300]};
      text-decoration: none;
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 4px;
      white-space: nowrap;
      transition: background 150ms, color 150ms;
    }
    .sg-nav-link:hover {
      background: rgba(255,255,255,0.1);
      color: #ffffff;
    }
    .sg-nav-category {
      color: ${tokens.colors.primary[400]};
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 6px 8px;
      white-space: nowrap;
    }
    .sg-nav-divider {
      color: ${tokens.colors.gray[600]};
      padding: 0 4px;
    }

    /* ─── Main Content ─── */
    .sg-main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }

    /* ─── Sections ─── */
    .sg-section {
      padding: 48px 0;
      border-bottom: 1px solid ${tokens.colors.gray[200]};
    }
    .sg-section:last-child {
      border-bottom: none;
    }
    .sg-section-title {
      font-family: ${tokens.typography.headingFont};
      font-size: 1.75rem;
      font-weight: 700;
      color: ${tokens.colors.gray[900]};
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 3px solid ${tokens.colors.primary[400]};
      display: inline-block;
    }
    .sg-description {
      font-size: 1rem;
      color: ${tokens.colors.gray[600]};
      margin-bottom: 24px;
      max-width: 800px;
      line-height: 1.6;
    }

    /* ─── Section Components ─── */
    .sg-tip {
      background: ${tokens.colors.primary[50]};
      border-left: 4px solid ${tokens.colors.primary[400]};
      padding: 12px 16px;
      margin-bottom: 24px;
      border-radius: 0 ${tokens.radius.md} ${tokens.radius.md} 0;
      font-size: 14px;
      color: ${tokens.colors.gray[700]};
    }
    .sg-demo {
      margin-bottom: 24px;
      padding: 24px;
      background: ${tokens.colors.gray[50]};
      border: 1px solid ${tokens.colors.gray[200]};
      border-radius: ${tokens.radius.lg};
    }
    .sg-class-ref {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    .sg-class-ref code {
      background: ${tokens.colors.gray[100]};
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 13px;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      color: ${tokens.colors.primary[700]};
    }
    .sg-code {
      margin-bottom: 16px;
    }
    .sg-code pre {
      background: ${tokens.colors.gray[900]};
      color: ${tokens.colors.gray[100]};
      padding: 20px;
      border-radius: ${tokens.radius.md};
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.5;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    }
    .sg-warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 0 ${tokens.radius.md} ${tokens.radius.md} 0;
      font-size: 14px;
      color: #92400e;
    }

    /* ─── Footer ─── */
    .sg-footer {
      background: ${tokens.colors.gray[50]};
      border-top: 1px solid ${tokens.colors.gray[200]};
      padding: 32px;
      text-align: center;
      font-size: 13px;
      color: ${tokens.colors.gray[500]};
    }

    /* ─── Print ─── */
    @media print {
      .sg-nav { display: none; }
      .sg-section { page-break-inside: avoid; }
    }

    /* ─── Responsive ─── */
    @media (max-width: 768px) {
      .sg-header { padding: 32px 16px; }
      .sg-header h1 { font-size: 1.75rem; }
      .sg-main { padding: 0 16px; }
      .sg-section { padding: 32px 0; }
      .sg-demo { padding: 16px; }
    }`;
}

// ============================================================================
// HEADER
// ============================================================================

function buildHeader(
  analysis: BrandAnalysis,
  tokens: DesignTokenSet,
  sectionCount: number,
  version: number,
): string {
  const now = new Date().toISOString().split('T')[0];

  return `<header class="sg-header">
  <h1>${escHtml(analysis.brandName)}</h1>
  <div class="sg-subtitle">CSS Design System &amp; Brand Styleguide</div>
  <div class="sg-version-badge">v${version} &middot; ${now} &middot; .${tokens.prefix}-* prefix</div>
  <div class="sg-stats">
    <div class="sg-stat">
      <div class="sg-stat-value">${sectionCount}</div>
      <div class="sg-stat-label">Sections</div>
    </div>
    <div class="sg-stat">
      <div class="sg-stat-value">${Object.keys(tokens.colors.primary).length * (tokens.colors.secondary ? 3 : 2) + 10}</div>
      <div class="sg-stat-label">Colors</div>
    </div>
    <div class="sg-stat">
      <div class="sg-stat-value">.${tokens.prefix}-*</div>
      <div class="sg-stat-label">Prefix</div>
    </div>
    <div class="sg-stat">
      <div class="sg-stat-value">${escHtml(analysis.domain)}</div>
      <div class="sg-stat-label">Source</div>
    </div>
  </div>
</header>`;
}

// ============================================================================
// FOOTER
// ============================================================================

function buildFooter(analysis: BrandAnalysis, version: number): string {
  const now = new Date().toISOString().split('T')[0];

  return `<footer class="sg-footer">
  <p>
    ${escHtml(analysis.brandName)} CSS Design System v${version}
    &middot; Generated ${now}
    &middot; Source: ${escHtml(analysis.domain)}
    &middot; Method: ${analysis.extractionMethod}
  </p>
  <p style="margin-top: 8px; font-size: 11px; opacity: 0.7;">
    Generated by Brand Styleguide Generator
  </p>
</footer>`;
}

// ============================================================================
// UTIL
// ============================================================================

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
