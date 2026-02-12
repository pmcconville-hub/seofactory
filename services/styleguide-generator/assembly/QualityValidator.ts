// services/styleguide-generator/assembly/QualityValidator.ts
// Post-generation validation checks for the assembled HTML document.

import type { QualityReport, DesignTokenSet } from '../types';

/**
 * Validate an assembled styleguide HTML document.
 * Returns a QualityReport with structural, content, and visual checks.
 */
export function validateDocument(
  html: string,
  tokens: DesignTokenSet,
  brandName: string,
  expectedSections: number = 48,
): QualityReport {
  const issues: string[] = [];

  // ─── Structural checks ───────────────────────────────────────────────
  const openDivs = (html.match(/<div[\s>]/g) || []).length;
  const closeDivs = (html.match(/<\/div>/g) || []).length;
  const divBalanced = openDivs === closeDivs;
  if (!divBalanced) {
    issues.push(`Div imbalance: ${openDivs} opening vs ${closeDivs} closing tags`);
  }

  const sectionMatches = html.match(/class="sg-section"/g) || [];
  const sectionCount = sectionMatches.length;
  const sectionsMatch = sectionCount >= expectedSections;
  if (!sectionsMatch) {
    issues.push(`Expected ${expectedSections} sections, found ${sectionCount}`);
  }

  const fileSizeKB = Math.round(new Blob([html]).size / 1024);
  const lineCount = html.split('\n').length;

  // Find empty sections (sections with no sg-demo content)
  const emptySections: string[] = [];
  const sectionRegex = /id="(section-\d+)"[\s\S]*?(?=<div class="sg-section"|<\/main>|$)/g;
  let match;
  while ((match = sectionRegex.exec(html)) !== null) {
    const sectionHtml = match[0];
    const sectionId = match[1];
    if (!sectionHtml.includes('sg-demo')) {
      emptySections.push(sectionId);
    }
  }
  if (emptySections.length > 0) {
    issues.push(`Empty sections (no demo): ${emptySections.join(', ')}`);
  }

  // ─── Content checks ──────────────────────────────────────────────────
  const prefix = tokens.prefix;
  const classMatches = html.match(new RegExp(`\\.${prefix}-[a-z][a-z0-9-]*`, 'g')) || [];
  const uniqueClasses = new Set(classMatches);
  const uniqueClassCount = uniqueClasses.size;

  // Check prefix consistency: find classes that look like brand prefixes but aren't ours
  const allPrefixedClasses = html.match(/\.[a-z]{2,4}-[a-z]/g) || [];
  const foreignClasses = allPrefixedClasses.filter(cls => {
    const clsPrefix = cls.match(/^\.([a-z]{2,4})-/)?.[1];
    return clsPrefix && clsPrefix !== prefix && clsPrefix !== 'sg' && clsPrefix !== 'fa';
  });
  const prefixConsistency = foreignClasses.length === 0;
  if (!prefixConsistency) {
    const unique = [...new Set(foreignClasses)].slice(0, 5);
    issues.push(`Foreign class prefixes found: ${unique.join(', ')}`);
  }

  // Brand name check
  const brandNameCorrect = html.includes(brandName);
  if (!brandNameCorrect) {
    issues.push(`Brand name "${brandName}" not found in document`);
  }

  // Color match check: ensure primary-400 hex appears
  const primaryHex = tokens.colors.primary[400].toLowerCase();
  const colorsMatch = html.toLowerCase().includes(primaryHex);
  if (!colorsMatch) {
    issues.push(`Primary brand color ${primaryHex} not found in document`);
  }

  // ─── Visual checks ───────────────────────────────────────────────────
  const hasColorSwatches = html.includes('sg-demo') && (
    html.includes(tokens.colors.primary[50]) ||
    html.includes(tokens.colors.primary[400])
  );
  const hasButtonDemos = html.includes('btn-primary') || html.includes('btn-secondary') || html.includes('button');
  const hasCardDemos = html.includes('card') && html.includes('sg-demo');
  const hasTypographyHierarchy = html.includes('H1') && html.includes('H2') && html.includes('BODY');
  const hasCodeBlocks = (html.match(/<pre><code>/g) || []).length > 0;
  const hasNavigationLinks = html.includes('sg-nav-link');

  if (!hasColorSwatches) issues.push('Missing color swatches in demos');
  if (!hasCodeBlocks) issues.push('Missing CSS code blocks');
  if (!hasNavigationLinks) issues.push('Missing navigation links');

  // ─── Score calculation ────────────────────────────────────────────────
  let score = 100;

  // Structural penalties
  if (!divBalanced) score -= 15;
  if (!sectionsMatch) score -= Math.min(20, (expectedSections - sectionCount) * 2);
  if (emptySections.length > 5) score -= 10;

  // Content penalties
  if (!prefixConsistency) score -= 5;
  if (!brandNameCorrect) score -= 5;
  if (!colorsMatch) score -= 10;
  if (uniqueClassCount < 20) score -= 10;

  // Visual penalties
  if (!hasColorSwatches) score -= 5;
  if (!hasCodeBlocks) score -= 5;
  if (!hasNavigationLinks) score -= 5;
  if (!hasTypographyHierarchy) score -= 5;

  return {
    structural: {
      divBalance: { open: openDivs, close: closeDivs, passed: divBalanced },
      sectionCount: { found: sectionCount, expected: expectedSections, passed: sectionsMatch },
      fileSizeKB,
      lineCount,
      emptySections,
    },
    content: {
      uniqueClassCount,
      prefixConsistency,
      noCrossContamination: foreignClasses.length > 0 ? [...new Set(foreignClasses)] : [],
      brandNameCorrect,
      colorsMatch,
    },
    visual: {
      hasColorSwatches,
      hasButtonDemos,
      hasCardDemos,
      hasTypographyHierarchy,
      hasCodeBlocks,
      hasNavigationLinks,
    },
    overallScore: Math.max(0, score),
    issues,
  };
}
