// Section 15: Dividers
// Horizontal rule variants for visual separation between content blocks.

import type { SectionGeneratorContext, RenderedSection } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';

function dividersGenerator(ctx: SectionGeneratorContext): RenderedSection {
  const { tokens } = ctx;
  const p = tokens.prefix;

  const variants = [
    { name: 'Default', cls: `${p}-divider`, style: `border: none; border-top: 1px solid ${tokens.colors.gray[200]}; margin: 24px 0;` },
    { name: 'Thick', cls: `${p}-divider-thick`, style: `border: none; border-top: 3px solid ${tokens.colors.gray[200]}; margin: 32px 0;` },
    { name: 'Primary', cls: `${p}-divider-primary`, style: `border: none; border-top: 2px solid ${tokens.colors.primary[400]}; margin: 24px 0;` },
    { name: 'Dashed', cls: `${p}-divider-dashed`, style: `border: none; border-top: 2px dashed ${tokens.colors.gray[300]}; margin: 24px 0;` },
    { name: 'Dotted', cls: `${p}-divider-dotted`, style: `border: none; border-top: 2px dotted ${tokens.colors.gray[300]}; margin: 24px 0;` },
    { name: 'Gradient', cls: `${p}-divider-gradient`, style: `border: none; height: 2px; background: linear-gradient(90deg, transparent, ${tokens.colors.primary[400]}, transparent); margin: 32px 0;` },
    { name: 'Short Center', cls: `${p}-divider-short`, style: `border: none; border-top: 3px solid ${tokens.colors.primary[400]}; width: 60px; margin: 24px auto;` },
  ];

  const demoHtml = variants.map(v =>
    `<div style="margin-bottom: 8px;">
      <div style="font-size: 12px; font-family: monospace; color: ${tokens.colors.gray[500]}; margin-bottom: 4px;">${v.name}</div>
      <div style="${v.style}"></div>
    </div>`
  ).join('\n');

  const cssCode = variants.map(v => `.${v.cls} {\n  ${v.style.split(';').filter(Boolean).map(s => s.trim() + ';').join('\n  ')}\n}`).join('\n\n');
  const classRefs = variants.map(v => v.cls);

  const html = wrapSection(15, 'Dividers', 'extension', {
    description: 'Horizontal rule variants for separating content sections. From subtle thin lines to branded gradient dividers.',
    tip: 'Apply to <hr> elements or empty <div> elements. Use the short-center variant below section headings for decorative emphasis.',
    demoHtml,
    classRefs,
    cssCode,
  });

  return { id: 15, anchorId: 'section-15', title: 'Dividers', category: 'extension', html, classesGenerated: classRefs };
}

registerSection(15, dividersGenerator);
export { dividersGenerator };
