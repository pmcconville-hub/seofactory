// Section 47: Quick Reference Table
// Summary table of all CSS class names organized by category.

import type { SectionGeneratorContext, RenderedSection } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';

interface ClassCategory {
  category: string;
  classes: string[];
}

function quickReferenceGenerator(ctx: SectionGeneratorContext): RenderedSection {
  const { tokens } = ctx;
  const p = tokens.prefix;

  const categories: ClassCategory[] = [
    { category: 'Colors', classes: [`${p}-primary-{50-900}`, `${p}-secondary-{50-900}`, `${p}-gray-{50-900}`, `${p}-bg-primary-*`, `${p}-text-primary-*`] },
    { category: 'Typography', classes: [`${p}-h1`, `${p}-h2`, `${p}-h3`, `${p}-h4`, `${p}-h5`, `${p}-h6`, `${p}-body`, `${p}-small`, `${p}-label`, `${p}-caption`] },
    { category: 'Sections', classes: [`${p}-section-white`, `${p}-section-light`, `${p}-section-primary`, `${p}-section-dark`, `${p}-section-gradient`] },
    { category: 'Buttons', classes: [`${p}-btn-primary`, `${p}-btn-secondary`, `${p}-btn-outline`, `${p}-btn-ghost`, `${p}-btn-sm`, `${p}-btn-lg`] },
    { category: 'Cards', classes: [`${p}-card`, `${p}-card-bordered`, `${p}-card-elevated`, `${p}-card-horizontal`] },
    { category: 'Images', classes: [`${p}-img-rounded`, `${p}-img-circle`, `${p}-img-shadow`, `${p}-img-framed`, `${p}-img-cover`] },
    { category: 'Badges', classes: [`${p}-badge-primary`, `${p}-badge-success`, `${p}-badge-error`, `${p}-badge-warning`, `${p}-badge-info`] },
    { category: 'Hover', classes: [`${p}-hover-lift`, `${p}-hover-shadow`, `${p}-hover-grow`, `${p}-hover-glow`, `${p}-hover-border`] },
    { category: 'Animation', classes: [`${p}-anim-fade-up`, `${p}-anim-fade-in`, `${p}-anim-slide-left`, `${p}-anim-scale-in`, `${p}-anim-bounce`] },
    { category: 'Responsive', classes: [`${p}-hide-mobile`, `${p}-hide-desktop`, `${p}-only-mobile`, `${p}-stack-mobile`, `${p}-container`] },
    { category: 'Forms', classes: [`${p}-input`, `${p}-input-error`, `${p}-input-success`, `${p}-btn-loading`] },
    { category: 'Accessibility', classes: [`${p}-skip-link`, `${p}-sr-only`, `${p}-focus-visible`] },
  ];

  const headerBg = tokens.colors.gray[50];
  const borderColor = tokens.colors.gray[200];

  const demoHtml = `<div style="overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; font-family: ${tokens.typography.bodyFont};">
      <thead>
        <tr style="background: ${headerBg};">
          <th style="text-align: left; padding: 10px 16px; border-bottom: 2px solid ${borderColor}; width: 140px;">Category</th>
          <th style="text-align: left; padding: 10px 16px; border-bottom: 2px solid ${borderColor};">Classes</th>
        </tr>
      </thead>
      <tbody>
        ${categories.map(cat => `<tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]}; font-weight: 600; vertical-align: top; color: ${tokens.colors.gray[700]};">${cat.category}</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]}; font-family: monospace; font-size: 12px; line-height: 1.8;">
            ${cat.classes.map(c => `<code style="background: ${tokens.colors.gray[100]}; padding: 2px 6px; border-radius: 3px; margin-right: 6px; white-space: nowrap;">.${c}</code>`).join(' ')}
          </td>
        </tr>`).join('\n        ')}
      </tbody>
    </table>
  </div>`;

  const html = wrapSection(47, 'Quick Reference Table', 'reference', {
    description: 'Quick-lookup table of all CSS class names organized by component category. Use this as a cheat sheet during development.',
    tip: 'Bookmark this section for quick access. All classes use the .' + p + '- prefix for namespace safety.',
    demoHtml,
    classRefs: [],
  });

  return { id: 47, anchorId: 'section-47', title: 'Quick Reference Table', category: 'reference', html, classesGenerated: [] };
}

registerSection(47, quickReferenceGenerator);
export { quickReferenceGenerator };
