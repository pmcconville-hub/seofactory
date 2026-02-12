// Manual test script — generates a sample styleguide HTML for B&M Dak-Totaal
// Run with: npx tsx services/styleguide-generator/__tests__/manual-test-output.ts

import { buildTokenSet } from '../tokens/TokenSetBuilder';
import { assembleDocument } from '../assembly/DocumentAssembler';
import { validateDocument } from '../assembly/QualityValidator';
import { generateTemplateSections } from '../sections/SectionRegistry';
import type { BrandAnalysis, SectionGeneratorContext } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import all template sections
import '../sections/templates/index';

const analysis: BrandAnalysis = {
  brandName: 'B&M Dak-Totaal',
  domain: 'benmdaktotaal.nl',
  tagline: 'Uw dakspecialist',
  industry: 'construction',
  colors: {
    primary: '#6EB544',
    secondary: '#2B4C9B',
    accent: '#F5A623',
    textDark: '#1a1a1a',
    textBody: '#333333',
    backgroundLight: '#ffffff',
    backgroundDark: '#1a1a1a',
    allExtracted: [
      { hex: '#6EB544', usage: 'buttons, CTA', frequency: 15 },
      { hex: '#2B4C9B', usage: 'headings', frequency: 8 },
      { hex: '#F5A623', usage: 'accents', frequency: 5 },
    ],
  },
  typography: {
    headingFont: { family: 'Montserrat', weights: [600, 700], googleFontsUrl: '' },
    bodyFont: { family: 'Open Sans', weights: [400, 500, 600], googleFontsUrl: '' },
    sizes: {
      h1: '2.5rem', h2: '2rem', h3: '1.75rem', h4: '1.5rem',
      h5: '1.25rem', h6: '1.125rem', body: '1rem', small: '0.875rem',
    },
    lineHeights: { heading: 1.25, body: 1.6 },
    letterSpacing: { h1: '-0.02em', h2: '-0.015em', h3: '-0.01em', body: '0' },
  },
  spacing: {
    sectionPadding: { desktop: '80px', mobile: '40px' },
    cardPadding: '24px',
    containerMaxWidth: '1200px',
    gaps: ['16px', '24px', '32px'],
  },
  shapes: {
    buttonRadius: '8px',
    cardRadius: '12px',
    imageRadius: '8px',
    inputRadius: '6px',
    shadows: {
      card: '0 2px 8px rgba(0,0,0,0.1)',
      button: '0 1px 3px rgba(0,0,0,0.12)',
      elevated: '0 10px 25px rgba(0,0,0,0.15)',
    },
  },
  components: [],
  personality: {
    overall: 'professional but approachable',
    formality: 3,
    energy: 3,
    warmth: 4,
    toneOfVoice: 'Friendly, expert, Dutch-speaking',
  },
  extractionMethod: 'http-fetch',
  confidence: 0.85,
  pagesAnalyzed: ['https://benmdaktotaal.nl/'],
};

// Build
const tokens = buildTokenSet(analysis);
const ctx: SectionGeneratorContext = { tokens, analysis, language: 'nl' };
const sections = generateTemplateSections(ctx);
const html = assembleDocument({ tokens, analysis, sections });

// Validate
const report = validateDocument(html, tokens, 'B&M Dak-Totaal', 17);

// Output
const outDir = path.resolve(__dirname, '../../../../tmp/styleguide');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'phase1-test-output.html');
fs.writeFileSync(outPath, html, 'utf-8');

console.log(`\n=== Phase 1 Test Output ===`);
console.log(`File: ${outPath}`);
console.log(`Size: ${Math.round(html.length / 1024)} KB`);
console.log(`Lines: ${html.split('\n').length}`);
console.log(`Sections: ${sections.length}`);
console.log(`\n=== Quality Report ===`);
console.log(`Score: ${report.overallScore}/100`);
console.log(`Divs balanced: ${report.structural.divBalance.passed}`);
console.log(`Section count: ${report.structural.sectionCount.found}/${report.structural.sectionCount.expected}`);
console.log(`Unique classes: ${report.content.uniqueClassCount}`);
console.log(`Prefix consistent: ${report.content.prefixConsistency}`);
console.log(`Brand name found: ${report.content.brandNameCorrect}`);
console.log(`Colors match: ${report.content.colorsMatch}`);
console.log(`Has color swatches: ${report.visual.hasColorSwatches}`);
console.log(`Has code blocks: ${report.visual.hasCodeBlocks}`);
console.log(`Has navigation: ${report.visual.hasNavigationLinks}`);
if (report.issues.length > 0) {
  console.log(`\nIssues:`);
  report.issues.forEach(i => console.log(`  - ${i}`));
} else {
  console.log(`\nNo issues found!`);
}
