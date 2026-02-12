// Section 24: Responsive Utilities
// Visibility and layout utility classes for responsive breakpoints.

import type { SectionGeneratorContext, RenderedSection } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';

function responsiveUtilsGenerator(ctx: SectionGeneratorContext): RenderedSection {
  const { tokens } = ctx;
  const p = tokens.prefix;

  const demoHtml = `<div style="overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; font-family: ${tokens.typography.bodyFont};">
      <thead>
        <tr style="background: ${tokens.colors.gray[50]};">
          <th style="text-align: left; padding: 10px 16px; border-bottom: 2px solid ${tokens.colors.gray[200]};">Class</th>
          <th style="text-align: left; padding: 10px 16px; border-bottom: 2px solid ${tokens.colors.gray[200]};">Breakpoint</th>
          <th style="text-align: left; padding: 10px 16px; border-bottom: 2px solid ${tokens.colors.gray[200]};">Behavior</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};"><code>.${p}-hide-mobile</code></td><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};">&lt; 768px</td><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};">Hidden on mobile</td></tr>
        <tr><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};"><code>.${p}-hide-tablet</code></td><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};">768px – 1024px</td><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};">Hidden on tablet</td></tr>
        <tr><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};"><code>.${p}-hide-desktop</code></td><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};">&gt; 1024px</td><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};">Hidden on desktop</td></tr>
        <tr><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};"><code>.${p}-only-mobile</code></td><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};">&lt; 768px</td><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};">Visible only on mobile</td></tr>
        <tr><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};"><code>.${p}-only-desktop</code></td><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};">&gt; 1024px</td><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};">Visible only on desktop</td></tr>
        <tr><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};"><code>.${p}-text-center-mobile</code></td><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};">&lt; 768px</td><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};">Center text on mobile</td></tr>
        <tr><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};"><code>.${p}-stack-mobile</code></td><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};">&lt; 768px</td><td style="padding: 8px 16px; border-bottom: 1px solid ${tokens.colors.gray[100]};">Flex row → column on mobile</td></tr>
      </tbody>
    </table>
  </div>`;

  const cssCode = `/* Breakpoints: mobile < 768px, tablet 768-1024px, desktop > 1024px */

.${p}-hide-mobile { }
@media (max-width: 767px) {
  .${p}-hide-mobile { display: none !important; }
}

.${p}-hide-tablet { }
@media (min-width: 768px) and (max-width: 1024px) {
  .${p}-hide-tablet { display: none !important; }
}

.${p}-hide-desktop { }
@media (min-width: 1025px) {
  .${p}-hide-desktop { display: none !important; }
}

.${p}-only-mobile { display: none !important; }
@media (max-width: 767px) {
  .${p}-only-mobile { display: block !important; }
}

.${p}-only-desktop { display: none !important; }
@media (min-width: 1025px) {
  .${p}-only-desktop { display: block !important; }
}

@media (max-width: 767px) {
  .${p}-text-center-mobile { text-align: center !important; }
  .${p}-stack-mobile { flex-direction: column !important; }
}

/* Container utility */
.${p}-container {
  width: 100%;
  max-width: ${tokens.containers['2xl']};
  margin-left: auto;
  margin-right: auto;
  padding-left: ${tokens.spacing.md};
  padding-right: ${tokens.spacing.md};
}`;

  const classRefs = [
    `${p}-hide-mobile`, `${p}-hide-tablet`, `${p}-hide-desktop`,
    `${p}-only-mobile`, `${p}-only-desktop`,
    `${p}-text-center-mobile`, `${p}-stack-mobile`, `${p}-container`,
  ];

  const html = wrapSection(24, 'Responsive Utilities', 'extension', {
    description: 'Utility classes for responsive visibility, text alignment, and layout stacking. Based on three breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px).',
    tip: 'Apply visibility classes to show/hide content at different breakpoints. Use stack-mobile on flex containers to automatically switch from row to column on small screens.',
    demoHtml,
    classRefs,
    cssCode,
  });

  return { id: 24, anchorId: 'section-24', title: 'Responsive Utilities', category: 'extension', html, classesGenerated: classRefs };
}

registerSection(24, responsiveUtilsGenerator);
export { responsiveUtilsGenerator };
