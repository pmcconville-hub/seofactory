// Section 20: Breadcrumbs
// Navigation breadcrumb component with separator styling.

import type { SectionGeneratorContext, RenderedSection } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';

function breadcrumbsGenerator(ctx: SectionGeneratorContext): RenderedSection {
  const { tokens } = ctx;
  const p = tokens.prefix;

  const crumbStyle = `font-size: 14px; font-family: ${tokens.typography.bodyFont};`;
  const linkColor = tokens.colors.primary[400];
  const textColor = tokens.colors.gray[500];
  const sepColor = tokens.colors.gray[300];

  const demoHtml = `<nav style="${crumbStyle} padding: 12px 0;">
    <span style="color: ${linkColor}; text-decoration: none; cursor: pointer;">Home</span>
    <span style="color: ${sepColor}; margin: 0 8px;">›</span>
    <span style="color: ${linkColor}; text-decoration: none; cursor: pointer;">Services</span>
    <span style="color: ${sepColor}; margin: 0 8px;">›</span>
    <span style="color: ${linkColor}; text-decoration: none; cursor: pointer;">Roofing</span>
    <span style="color: ${sepColor}; margin: 0 8px;">›</span>
    <span style="color: ${textColor}; font-weight: 500;">Flat Roof Repair</span>
  </nav>
  <nav style="${crumbStyle} padding: 12px 0; margin-top: 12px;">
    <span style="color: ${linkColor};">Home</span>
    <span style="color: ${sepColor}; margin: 0 8px;">/</span>
    <span style="color: ${linkColor};">Blog</span>
    <span style="color: ${sepColor}; margin: 0 8px;">/</span>
    <span style="color: ${textColor}; font-weight: 500;">Article Title</span>
  </nav>`;

  const cssCode = `.${p}-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
  font-size: 14px;
  font-family: ${tokens.typography.bodyFont};
  padding: 12px 0;
}

.${p}-breadcrumb a,
.${p}-breadcrumb-link {
  color: ${linkColor};
  text-decoration: none;
  transition: color ${tokens.transitions.fast};
}

.${p}-breadcrumb a:hover,
.${p}-breadcrumb-link:hover {
  color: ${tokens.colors.primary[600]};
  text-decoration: underline;
}

.${p}-breadcrumb-sep {
  color: ${sepColor};
  margin: 0 8px;
}

.${p}-breadcrumb-current {
  color: ${textColor};
  font-weight: 500;
}`;

  const classRefs = [`${p}-breadcrumb`, `${p}-breadcrumb-link`, `${p}-breadcrumb-sep`, `${p}-breadcrumb-current`];

  const html = wrapSection(20, 'Breadcrumbs', 'extension', {
    description: 'Breadcrumb navigation for hierarchical page structures. Shows the user\'s location within the site and enables quick navigation up the hierarchy.',
    tip: 'Use with schema.org BreadcrumbList markup for SEO. The last item (current page) should not be a link. Use "›" or "/" as separators.',
    demoHtml,
    classRefs,
    cssCode,
    warning: 'Breadcrumbs are critical for SEO and accessibility. Always include structured data markup alongside visual breadcrumbs.',
  });

  return { id: 20, anchorId: 'section-20', title: 'Breadcrumbs', category: 'extension', html, classesGenerated: classRefs };
}

registerSection(20, breadcrumbsGenerator);
export { breadcrumbsGenerator };
