/**
 * Capture rendered HTML for SEO audit.
 * Saves the full document to scratchpad for analysis by semantic-seo skill.
 */
import { describe, it, expect } from 'vitest';
import { renderCleanArticle } from '../CleanArticleRenderer';
import { htmlToArticleContent, validateHeadingStructure } from '../contentAdapter';
import type { DesignDNA } from '../../../../types/designDna';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.resolve('C:/Users/DHR~1.KOE/AppData/Local/Temp/claude/D--www-cost-of-retreival-reducer/a8857725-e74c-49cd-a528-85bd6b47d0fa/scratchpad');

const CORPORATE_DESIGN_DNA: DesignDNA = {
  colors: {
    primary: { hex: '#0170B9', usage: 'buttons, links', confidence: 95 },
    primaryLight: { hex: '#4FA3D9', usage: 'backgrounds', confidence: 85 },
    primaryDark: { hex: '#014978', usage: 'headings, hover', confidence: 80 },
    secondary: { hex: '#1f2937', usage: 'text', confidence: 90 },
    accent: { hex: '#f59e0b', usage: 'cta, highlights', confidence: 85 },
    neutrals: { darkest: '#0f172a', dark: '#334155', medium: '#94a3b8', light: '#e2e8f0', lightest: '#f8fafc' },
    semantic: { success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
    harmony: 'complementary', dominantMood: 'corporate', contrastLevel: 'high',
  },
  typography: {
    headingFont: { family: 'Inter', fallback: 'system-ui', weight: 700, style: 'sans-serif', character: 'modern' },
    bodyFont: { family: 'Inter', fallback: 'system-ui', weight: 400, style: 'sans-serif', lineHeight: 1.7 },
    scaleRatio: 1.25, baseSize: '16px', headingCase: 'none', headingLetterSpacing: '-0.02em',
    usesDropCaps: false, headingUnderlineStyle: 'none', linkStyle: 'underline',
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
    <tr><th>Rang</th><th>Kwetsbaarheid</th><th>Impact</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>SQL Injection</td><td>Kritiek</td></tr>
    <tr><td>2</td><td>Cross-Site Scripting (XSS)</td><td>Hoog</td></tr>
    <tr><td>3</td><td>Broken Authentication</td><td>Kritiek</td></tr>
    <tr><td>4</td><td>Sensitive Data Exposure</td><td>Hoog</td></tr>
    <tr><td>5</td><td>Security Misconfiguration</td><td>Medium</td></tr>
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

describe('Capture Rendered SEO Output', () => {
  it('should render and save full HTML document for SEO audit', () => {
    const articleContent = htmlToArticleContent(
      RICH_ARTICLE_HTML,
      'Incident Response: Hoe Bescherm Je Jouw Organisatie Tegen Cyber Dreigingen'
    );
    const output = renderCleanArticle(articleContent, CORPORATE_DESIGN_DNA, 'NFIR');
    const validation = validateHeadingStructure(output.fullDocument);

    // Ensure output dir exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Save rendered HTML
    fs.writeFileSync(path.join(OUTPUT_DIR, 'seo_rendered_output.html'), output.fullDocument, 'utf-8');

    // Save validation report
    fs.writeFileSync(path.join(OUTPUT_DIR, 'seo_validation_report.json'), JSON.stringify({
      validation,
      articleSections: articleContent.sections.length,
      cssLength: output.css.length,
      htmlLength: output.html.length,
      fullDocumentLength: output.fullDocument.length,
    }, null, 2), 'utf-8');

    // Log results
    console.log('\n=== SEO VALIDATION REPORT ===');
    console.log(`H1 count: ${validation.h1Count}`);
    console.log(`Has H1: ${validation.hasH1}`);
    console.log(`Is Valid: ${validation.isValid}`);
    console.log(`Issues: ${validation.issues.length > 0 ? validation.issues.join(', ') : 'NONE'}`);
    console.log(`Sections: ${articleContent.sections.length}`);
    console.log(`Heading hierarchy:`);
    validation.hierarchy.forEach(h => console.log(`  h${h.level}: ${h.text}`));
    console.log(`\nFiles saved to: ${OUTPUT_DIR}`);

    // Assertions
    expect(validation.h1Count).toBe(1);
    expect(validation.hasH1).toBe(true);
    expect(articleContent.sections.length).toBeGreaterThan(1);
    expect(output.fullDocument).toContain('<!DOCTYPE html>');
  });
});
