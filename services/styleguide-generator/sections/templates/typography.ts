// Section 2: Typography
// Shows the full type hierarchy with inline-styled demos for each heading level + body text.

import type { SectionGeneratorContext, RenderedSection } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';

function typographyGenerator(ctx: SectionGeneratorContext): RenderedSection {
  const { tokens, analysis } = ctx;
  const p = tokens.prefix;
  const headingFont = tokens.typography.headingFont;
  const bodyFont = tokens.typography.bodyFont;

  // Font info display
  const fontInfoHtml = `<div style="display: flex; gap: 32px; flex-wrap: wrap; margin-bottom: 32px; padding: 20px; background: ${tokens.colors.gray[50]}; border-radius: 8px;">
    <div>
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: ${tokens.colors.gray[500]}; margin-bottom: 4px;">Heading Font</div>
      <div style="font-family: ${headingFont}; font-size: 24px; font-weight: 700;">${analysis.typography.headingFont.family || 'System UI'}</div>
      <div style="font-size: 13px; color: ${tokens.colors.gray[500]};">Weights: ${analysis.typography.headingFont.weights.join(', ') || '400, 600, 700'}</div>
    </div>
    <div>
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: ${tokens.colors.gray[500]}; margin-bottom: 4px;">Body Font</div>
      <div style="font-family: ${bodyFont}; font-size: 24px; font-weight: 400;">${analysis.typography.bodyFont.family || 'System UI'}</div>
      <div style="font-size: 13px; color: ${tokens.colors.gray[500]};">Weights: ${analysis.typography.bodyFont.weights.join(', ') || '400, 500, 600'}</div>
    </div>
  </div>`;

  // Type hierarchy demos
  const levels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'small', 'label', 'caption'] as const;
  const sampleTexts: Record<string, string> = {
    h1: 'Main Page Heading',
    h2: 'Section Heading',
    h3: 'Subsection Heading',
    h4: 'Card or Block Title',
    h5: 'Small Section Title',
    h6: 'Smallest Heading',
    body: 'Body text is used for paragraphs and general content. It should be highly readable at comfortable sizes with good line height and letter spacing for extended reading.',
    small: 'Small text for captions, footnotes, and secondary information.',
    label: 'FORM LABEL TEXT',
    caption: 'Image caption or metadata text',
  };

  const hierarchyHtml = levels.map(level => {
    const spec = tokens.typography.sizes[level];
    const isHeading = level.startsWith('h');
    const font = isHeading ? headingFont : bodyFont;
    const specLabel = `${spec.size} / ${spec.weight} / ${spec.lineHeight} / ${spec.letterSpacing || '0'}`;

    return `<div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid ${tokens.colors.gray[200]};">
      <div style="display: flex; align-items: baseline; gap: 16px; margin-bottom: 8px;">
        <span style="font-family: monospace; font-size: 12px; color: ${tokens.colors.primary[400]}; min-width: 60px; font-weight: 600;">${level.toUpperCase()}</span>
        <span style="font-family: monospace; font-size: 11px; color: ${tokens.colors.gray[400]};">${specLabel}</span>
      </div>
      <div style="font-family: ${font}; font-size: ${spec.size}; font-weight: ${spec.weight}; line-height: ${spec.lineHeight}; letter-spacing: ${spec.letterSpacing}; color: ${tokens.colors.gray[900]};">
        ${sampleTexts[level]}
      </div>
    </div>`;
  }).join('\n');

  // CSS code block
  const cssCode = levels.map(level => {
    const spec = tokens.typography.sizes[level];
    const isHeading = level.startsWith('h');
    const font = isHeading ? headingFont : bodyFont;
    return `.${p}-${level} {
  font-family: ${font};
  font-size: ${spec.size};
  font-weight: ${spec.weight};
  line-height: ${spec.lineHeight};
  letter-spacing: ${spec.letterSpacing};
}`;
  }).join('\n\n');

  // Google Fonts import
  const fontsImport = tokens.typography.googleFontsUrl
    ? `/* Google Fonts */\n@import url('${tokens.typography.googleFontsUrl}');\n\n`
    : '';

  const classRefs = levels.map(l => `${p}-${l}`);

  const html = wrapSection(2, 'Typography', 'foundation', {
    description: 'Complete typographic hierarchy from H1 to caption. Heading and body fonts are defined separately for visual contrast and readability.',
    tip: 'Apply heading classes to any element for consistent sizing. Use body font classes for content areas. Import Google Fonts via the provided URL.',
    demoHtml: fontInfoHtml + hierarchyHtml,
    classRefs,
    cssCode: fontsImport + cssCode,
  });

  return {
    id: 2,
    anchorId: 'section-2',
    title: 'Typography',
    category: 'foundation',
    html,
    classesGenerated: classRefs,
  };
}

registerSection(2, typographyGenerator);

export { typographyGenerator };
