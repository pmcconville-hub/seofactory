// Section 8: Badges & Tags
// Small label components for status, categories, and metadata.

import type { SectionGeneratorContext, RenderedSection } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';

function badgesGenerator(ctx: SectionGeneratorContext): RenderedSection {
  const { tokens } = ctx;
  const p = tokens.prefix;
  const sem = tokens.colors.semantic;

  const badgeBase = `display: inline-block; padding: 4px 12px; border-radius: ${tokens.radius.full}; font-size: 12px; font-weight: 600; font-family: ${tokens.typography.bodyFont}; letter-spacing: 0.02em;`;

  const variants = [
    { name: 'Primary', cls: `${p}-badge-primary`, bg: tokens.colors.primary[100], color: tokens.colors.primary[700] },
    { name: 'Success', cls: `${p}-badge-success`, bg: '#d1fae5', color: sem.success },
    { name: 'Error', cls: `${p}-badge-error`, bg: '#fee2e2', color: sem.error },
    { name: 'Warning', cls: `${p}-badge-warning`, bg: '#fef3c7', color: '#92400e' },
    { name: 'Info', cls: `${p}-badge-info`, bg: '#dbeafe', color: sem.info },
    { name: 'Gray', cls: `${p}-badge-gray`, bg: tokens.colors.gray[100], color: tokens.colors.gray[700] },
    { name: 'Outline', cls: `${p}-badge-outline`, bg: 'transparent', color: tokens.colors.primary[400], border: `1px solid ${tokens.colors.primary[400]}` },
  ];

  const demoHtml = `<div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
    ${variants.map(v => {
      const borderStyle = v.border ? `border: ${v.border};` : '';
      return `<span style="${badgeBase} background: ${v.bg}; color: ${v.color}; ${borderStyle}">${v.name}</span>`;
    }).join('\n    ')}
  </div>
  <div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
    <span style="${badgeBase} background: ${tokens.colors.primary[100]}; color: ${tokens.colors.primary[700]}; border-radius: ${tokens.radius.sm};">Tag Squared</span>
    <span style="${badgeBase} background: ${tokens.colors.primary[400]}; color: #ffffff;">Solid Primary</span>
    <span style="${badgeBase} background: ${tokens.colors.gray[800]}; color: #ffffff;">Dark Tag</span>
  </div>`;

  const cssCode = variants.map(v => {
    const border = v.border ? `\n  border: ${v.border};` : '';
    return `.${v.cls} {\n  ${badgeBase.replace(/;\s/g, ';\n  ')}\n  background: ${v.bg};\n  color: ${v.color};${border}\n}`;
  }).join('\n\n');

  const classRefs = variants.map(v => v.cls);

  const html = wrapSection(8, 'Badges & Tags', 'foundation', {
    description: 'Small inline labels for status indicators, categories, tags, and metadata. Available in semantic colors and outline variants.',
    tip: 'Use badges on any inline element. Pair with cards or list items for category labels. Combine outline variant with hover effects for interactive tags.',
    demoHtml,
    classRefs,
    cssCode,
  });

  return { id: 8, anchorId: 'section-8', title: 'Badges & Tags', category: 'foundation', html, classesGenerated: classRefs };
}

registerSection(8, badgesGenerator);
export { badgesGenerator };
