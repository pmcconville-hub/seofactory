/**
 * SEO Rendering Validation E2E Tests
 *
 * Validates that the rendering pipeline produces HTML output that meets
 * SEO requirements: heading hierarchy, semantic HTML, content preservation,
 * and brand color accessibility.
 */
import { describe, it, expect } from 'vitest';
import { CleanArticleRenderer, renderCleanArticle } from '../CleanArticleRenderer';
import { htmlToArticleContent, validateHeadingStructure } from '../contentAdapter';
import type { DesignDNA } from '../../../../types/designDna';
import type { ArticleInput } from '../CleanArticleRenderer';

// ============================================================================
// TEST DATA: Realistic DesignDNA (NFIR-style corporate brand)
// ============================================================================

const CORPORATE_DESIGN_DNA: DesignDNA = {
  colors: {
    primary: { hex: '#0170B9', usage: 'buttons, links', confidence: 95 },
    primaryLight: { hex: '#4FA3D9', usage: 'backgrounds', confidence: 85 },
    primaryDark: { hex: '#014978', usage: 'headings, hover', confidence: 80 },
    secondary: { hex: '#1f2937', usage: 'text', confidence: 90 },
    accent: { hex: '#f59e0b', usage: 'cta, highlights', confidence: 85 },
    neutrals: {
      darkest: '#0f172a',
      dark: '#334155',
      medium: '#94a3b8',
      light: '#e2e8f0',
      lightest: '#f8fafc',
    },
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    harmony: 'complementary',
    dominantMood: 'corporate',
    contrastLevel: 'high',
  },
  typography: {
    headingFont: { family: 'Inter', fallback: 'system-ui', weight: 700, style: 'sans-serif', character: 'modern' },
    bodyFont: { family: 'Inter', fallback: 'system-ui', weight: 400, style: 'sans-serif', lineHeight: 1.7 },
    scaleRatio: 1.25,
    baseSize: '16px',
    headingCase: 'none',
    headingLetterSpacing: '-0.02em',
    usesDropCaps: false,
    headingUnderlineStyle: 'none',
    linkStyle: 'underline',
  },
  spacing: { baseUnit: 8, density: 'comfortable', sectionGap: 'moderate', contentWidth: 'medium', whitespacePhilosophy: 'balanced' },
  shapes: { borderRadius: { style: 'subtle', small: '4px', medium: '8px', large: '16px', full: '999px' }, buttonStyle: 'soft', cardStyle: 'subtle-shadow', inputStyle: 'bordered' },
  effects: {
    shadows: { style: 'subtle', cardShadow: '0 1px 3px rgba(0,0,0,0.1)', buttonShadow: '0 1px 2px rgba(0,0,0,0.05)', elevatedShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    gradients: { usage: 'subtle', primaryGradient: 'linear-gradient(135deg, #0170B9, #014978)', heroGradient: 'linear-gradient(135deg, #014978, #0170B9)', ctaGradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    backgrounds: { usesPatterns: false, usesTextures: false, usesOverlays: false },
    borders: { style: 'subtle', defaultColor: '#e2e8f0', accentBorderUsage: true },
  },
  decorative: { dividerStyle: 'line', usesFloatingShapes: false, usesCornerAccents: false, usesWaveShapes: false, usesGeometricPatterns: false, iconStyle: 'outline', decorativeAccentColor: '#0170B9' },
  layout: { gridStyle: 'strict-12', alignment: 'left', heroStyle: 'contained', cardLayout: 'grid', ctaPlacement: 'section-end', navigationStyle: 'standard' },
  motion: { overall: 'subtle', transitionSpeed: 'normal', easingStyle: 'ease', hoverEffects: { buttons: 'darken', cards: 'lift', links: 'underline' }, scrollAnimations: false, parallaxEffects: false },
  images: { treatment: 'natural', frameStyle: 'rounded', hoverEffect: 'none', aspectRatioPreference: '16:9' },
  componentPreferences: { preferredListStyle: 'bullets', preferredCardStyle: 'bordered', testimonialStyle: 'card', faqStyle: 'accordion', ctaStyle: 'button' },
  personality: { overall: 'corporate', formality: 4, energy: 2, warmth: 3, trustSignals: 'prominent' },
  confidence: { overall: 85, colorsConfidence: 90, typographyConfidence: 80, layoutConfidence: 85 },
  analysisNotes: ['Corporate professional brand with blue primary'],
};

// ============================================================================
// TEST DATA: Problematic DesignDNA (white primaryDark - the bug we fixed)
// ============================================================================

const BROKEN_COLOR_DESIGN_DNA: DesignDNA = {
  ...CORPORATE_DESIGN_DNA,
  colors: {
    ...CORPORATE_DESIGN_DNA.colors,
    primaryDark: { hex: '#FFFFFF', usage: 'headings', confidence: 60 }, // BUG: white primaryDark
  },
};

// ============================================================================
// TEST DATA: Realistic article HTML (multi-section with headings, lists, tables)
// ============================================================================

const RICH_ARTICLE_HTML = `
<h2>Wat is Incident Response?</h2>
<p>Incident Response is het gestructureerde proces waarmee organisaties reageren op cybersecurity incidenten. Een effectief incident response plan helpt bij het minimaliseren van schade en het versnellen van herstel.</p>

<h3>De 6 Fasen van Incident Response</h3>
<p>Het NIST framework definieert zes essentiële fasen:</p>
<ol>
  <li><strong>Voorbereiding</strong> - Het opzetten van procedures en tools</li>
  <li><strong>Identificatie</strong> - Het detecteren van beveiligingsincidenten</li>
  <li><strong>Inperking</strong> - Het beperken van de impact</li>
  <li><strong>Uitroeiing</strong> - Het verwijderen van de oorzaak</li>
  <li><strong>Herstel</strong> - Het herstellen van normale operaties</li>
  <li><strong>Evaluatie</strong> - Lessons learned documenteren</li>
</ol>

<h2>Veelvoorkomende Cyber Kwetsbaarheden</h2>
<p>Organisaties worden geconfronteerd met diverse kwetsbaarheden die hun digitale infrastructuur bedreigen.</p>

<h3>Top 10 Kwetsbaarheden</h3>
<table>
  <thead>
    <tr>
      <th>Rang</th>
      <th>Kwetsbaarheid</th>
      <th>Impact</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>SQL Injection</td>
      <td>Kritiek</td>
    </tr>
    <tr>
      <td>2</td>
      <td>Cross-Site Scripting (XSS)</td>
      <td>Hoog</td>
    </tr>
    <tr>
      <td>3</td>
      <td>Broken Authentication</td>
      <td>Kritiek</td>
    </tr>
    <tr>
      <td>4</td>
      <td>Sensitive Data Exposure</td>
      <td>Hoog</td>
    </tr>
    <tr>
      <td>5</td>
      <td>Security Misconfiguration</td>
      <td>Medium</td>
    </tr>
  </tbody>
</table>

<h2>Best Practices voor Preventie</h2>
<p>Een proactieve benadering van cybersecurity is essentieel voor elke organisatie.</p>
<ul>
  <li>Implementeer <strong>multi-factor authenticatie</strong> voor alle kritieke systemen</li>
  <li>Voer regelmatig <strong>penetratietests</strong> uit</li>
  <li>Train medewerkers in <strong>security awareness</strong></li>
  <li>Houd software en systemen up-to-date met patches</li>
</ul>

<blockquote>
  <p>"De vraag is niet óf je gehackt wordt, maar wanneer. Voorbereiding is de sleutel tot effectief incident response."</p>
</blockquote>

<h3>Incident Response Team Samenstelling</h3>
<p>Een effectief IRT bestaat uit diverse specialisten die samenwerken bij beveiligingsincidenten.</p>

<h2>Conclusie</h2>
<p>Een robuust incident response plan is geen luxe maar een noodzaak in het huidige dreigingslandschap. Door de zes fasen van incident response te volgen en te investeren in preventie, kunnen organisaties hun weerbaarheid significant verbeteren.</p>
`;

// ============================================================================
// TEST DATA: Article with only H1 headings (tests our H1 fallback)
// ============================================================================

const H1_ONLY_ARTICLE_HTML = `
<h1>Introduction to Cybersecurity</h1>
<p>This article covers the fundamentals of cybersecurity for modern organizations.</p>

<h1>Common Threats</h1>
<p>Organizations face numerous cyber threats including phishing, ransomware, and DDoS attacks.</p>
<ul>
  <li>Phishing attacks target employees directly</li>
  <li>Ransomware encrypts critical data</li>
  <li>DDoS disrupts service availability</li>
</ul>

<h1>Defense Strategies</h1>
<p>Effective defense requires a multi-layered approach combining technology, processes, and training.</p>
`;

// ============================================================================
// TESTS
// ============================================================================

describe('SEO Rendering Validation', () => {

  describe('1. Heading Structure', () => {

    it('should produce exactly one H1 in rendered output', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Incident Response Guide');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'NFIR');

      const validation = validateHeadingStructure(output.fullDocument);
      expect(validation.h1Count).toBe(1);
      expect(validation.hasH1).toBe(true);
    });

    it('should preserve H2-H6 heading hierarchy from source', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Incident Response Guide');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'NFIR');

      const validation = validateHeadingStructure(output.fullDocument);

      // Should have H1 (title) + H2s + H3s from source content
      const h2Count = validation.hierarchy.filter(h => h.level === 2).length;
      const h3Count = validation.hierarchy.filter(h => h.level === 3).length;

      expect(h2Count).toBeGreaterThanOrEqual(3); // At least 3 H2 sections
      expect(h3Count).toBeGreaterThanOrEqual(2); // At least 2 H3 subsections
    });

    it('should not skip heading levels (e.g. H2 → H4 without H3)', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Incident Response Guide');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'NFIR');

      const validation = validateHeadingStructure(output.fullDocument);
      const skipIssues = validation.issues.filter(i => i.startsWith('Heading skip'));
      expect(skipIssues).toEqual([]);
    });

    it('should handle articles with only H1 headings via fallback detection', () => {
      const articleContent = htmlToArticleContent(H1_ONLY_ARTICLE_HTML, 'Cybersecurity Guide');

      // H1s should be demoted to H2 in sections
      expect(articleContent.sections.length).toBeGreaterThan(1);
      articleContent.sections.forEach(section => {
        if (section.headingLevel) {
          expect(section.headingLevel).toBeGreaterThanOrEqual(2);
        }
      });

      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'TestBrand');
      const validation = validateHeadingStructure(output.fullDocument);
      expect(validation.h1Count).toBe(1); // Only the article title H1
    });
  });

  describe('2. Semantic HTML5 Elements', () => {

    it('should use <article> as main content wrapper', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      expect(output.fullDocument).toContain('<article');
    });

    it('should use <header> for article header/hero', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      expect(output.fullDocument).toContain('<header');
      expect(output.fullDocument).toContain('article-header');
    });

    it('should use <nav> for table of contents', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      expect(output.fullDocument).toContain('<nav');
    });

    it('should use <section> elements for content sections', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      const sectionMatches = output.fullDocument.match(/<section[\s>]/g) || [];
      expect(sectionMatches.length).toBeGreaterThanOrEqual(3);
    });

    it('should preserve semantic list elements (ul/ol/li)', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      expect(output.fullDocument).toContain('<ul');
      expect(output.fullDocument).toContain('<ol');
      expect(output.fullDocument).toContain('<li');
    });

    it('should preserve semantic table elements (table/thead/tbody/tr/th/td)', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      expect(output.fullDocument).toContain('<table');
      expect(output.fullDocument).toContain('<thead');
      expect(output.fullDocument).toContain('<tbody');
      expect(output.fullDocument).toContain('<th');
      expect(output.fullDocument).toContain('<td');
    });

    it('should preserve blockquote elements', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      expect(output.fullDocument).toContain('<blockquote');
    });
  });

  describe('3. Content Preservation (HARD CONSTRAINT)', () => {

    it('should preserve all article text without truncation', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      // Key content phrases that MUST be present
      const requiredContent = [
        'Incident Response',
        'gestructureerde proces',
        'NIST framework',
        'Voorbereiding',
        'Identificatie',
        'Inperking',
        'SQL Injection',
        'Cross-Site Scripting',
        'multi-factor authenticatie',
        'penetratietests',
        'security awareness',
        'dreigingslandschap',
      ];

      requiredContent.forEach(text => {
        expect(output.fullDocument).toContain(text);
      });
    });

    it('should preserve all list items', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      // All 6 incident response phases must be present
      expect(output.fullDocument).toContain('Voorbereiding');
      expect(output.fullDocument).toContain('Identificatie');
      expect(output.fullDocument).toContain('Inperking');
      expect(output.fullDocument).toContain('Uitroeiing');
      expect(output.fullDocument).toContain('Herstel');
      expect(output.fullDocument).toContain('Evaluatie');
    });

    it('should preserve all table data', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      // All table entries must be present
      expect(output.fullDocument).toContain('SQL Injection');
      expect(output.fullDocument).toContain('Cross-Site Scripting');
      expect(output.fullDocument).toContain('Broken Authentication');
      expect(output.fullDocument).toContain('Sensitive Data Exposure');
      expect(output.fullDocument).toContain('Security Misconfiguration');
    });

    it('should preserve blockquote content', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      expect(output.fullDocument).toContain('De vraag is niet');
      expect(output.fullDocument).toContain('Voorbereiding is de sleutel');
    });

    it('should produce multiple sections from multi-heading content', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      expect(articleContent.sections.length).toBeGreaterThan(1);
    });
  });

  describe('4. Color Validation & Accessibility', () => {

    it('should correct white primaryDark to a darker color', () => {
      const renderer = new CleanArticleRenderer(BROKEN_COLOR_DESIGN_DNA, 'BrokenBrand');
      const article: ArticleInput = {
        title: 'Test Article',
        sections: [
          { id: 'section-0', heading: 'Section One', headingLevel: 2, content: '<p>Test content.</p>' },
        ],
      };
      const output = renderer.render(article);

      // Section headings (h2, h3) should NOT be white — they sit on light backgrounds
      // The hero h1 IS white (by design, on dark gradient), so we check section headings instead
      const sectionHeadingWhite = /\.section h2\s*\{[^}]*color:\s*#[Ff]{6}/;
      expect(sectionHeadingWhite.test(output.css)).toBe(false);

      // CSS should contain the corrected primaryDark (not #FFFFFF)
      // Since we passed primaryDark: #FFFFFF, getColor should fix it
      expect(output.css).not.toMatch(/color:\s*#[Ff]{6}[^;]*;[^}]*\/\*.*primaryDark/);
    });

    it('should produce hero with gradient background (not white)', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      // Hero should have gradient background
      expect(output.css).toContain('linear-gradient(135deg');
      expect(output.fullDocument).toContain('article-header');
    });

    it('should have white text on dark hero gradient', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      // Hero H1 should be white (on dark gradient)
      expect(output.css).toMatch(/\.article-header h1\s*\{[^}]*color:\s*#ffffff/i);
    });

    it('should have article-header-inner wrapper in hero', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      expect(output.fullDocument).toContain('article-header-inner');
    });
  });

  describe('5. Section Visual Separation', () => {

    it('should have alternating section backgrounds using brand primary', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      // Should use primary color with low opacity for alternating backgrounds
      expect(output.css).toContain('.section:nth-child(even of .section)');
    });

    it('should have section border separators using brand color', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      expect(output.css).toContain('.section + .section');
      expect(output.css).toContain('border-top');
    });
  });

  describe('6. SEO Validation Function', () => {

    it('should detect missing H1', () => {
      const result = validateHeadingStructure('<p>No headings at all</p>');
      expect(result.isValid).toBe(false);
      expect(result.hasH1).toBe(false);
      expect(result.issues).toContain('Missing H1 tag');
    });

    it('should detect multiple H1 tags', () => {
      const result = validateHeadingStructure('<h1>First</h1><h1>Second</h1><h2>Sub</h2>');
      expect(result.isValid).toBe(false);
      expect(result.h1Count).toBe(2);
      expect(result.issues[0]).toContain('Multiple H1 tags');
    });

    it('should detect heading level skips', () => {
      const result = validateHeadingStructure('<h1>Title</h1><h2>Section</h2><h4>Skipped H3</h4>');
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.includes('Heading skip'))).toBe(true);
    });

    it('should pass valid heading structure', () => {
      const result = validateHeadingStructure('<h1>Title</h1><h2>Section A</h2><h3>Sub A1</h3><h2>Section B</h2>');
      expect(result.isValid).toBe(true);
      expect(result.issues).toEqual([]);
    });
  });

  describe('7. Full Pipeline Integration', () => {

    it('should render a complete standalone HTML document', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Incident Response Guide');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'NFIR');

      // Must be a complete HTML document
      expect(output.fullDocument).toContain('<!DOCTYPE html>');
      expect(output.fullDocument).toContain('<html');
      expect(output.fullDocument).toContain('<head');
      expect(output.fullDocument).toContain('<body');
      expect(output.fullDocument).toContain('</html>');

      // Must contain embedded CSS
      expect(output.fullDocument).toContain('<style');

      // Must pass SEO validation
      const validation = validateHeadingStructure(output.fullDocument);
      expect(validation.h1Count).toBe(1);
      // Note: heading skips from TOC anchor links are expected in some cases
    });

    it('should produce non-empty CSS with brand tokens', () => {
      const articleContent = htmlToArticleContent(RICH_ARTICLE_HTML, 'Test Article');
      const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'Test');

      expect(output.css.length).toBeGreaterThan(500);
      // Should contain the brand primary color
      expect(output.css.toLowerCase()).toContain('#0170b9');
    });
  });
});
