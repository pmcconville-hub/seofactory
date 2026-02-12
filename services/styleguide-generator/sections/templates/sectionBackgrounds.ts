// Section 3: Section Backgrounds
// Demonstrates section-level background treatments using the color system.
// Provides composable classes for light, dark, primary-tinted, gradient, and overlay backgrounds.

import type { SectionGeneratorContext, RenderedSection } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';

interface BgVariant {
  name: string;
  className: string;
  bgStyle: string;
  textColor: string;
  description: string;
}

function sectionBackgroundsGenerator(ctx: SectionGeneratorContext): RenderedSection {
  const { tokens } = ctx;
  const p = tokens.prefix;
  const primary = tokens.colors.primary;
  const gray = tokens.colors.gray;

  const variants: BgVariant[] = [
    {
      name: 'White',
      className: `${p}-section-white`,
      bgStyle: `background: #ffffff;`,
      textColor: gray[900],
      description: 'Default clean section background.',
    },
    {
      name: 'Light Gray',
      className: `${p}-section-light`,
      bgStyle: `background: ${gray[50]};`,
      textColor: gray[900],
      description: 'Subtle alternating section background for visual rhythm.',
    },
    {
      name: 'Primary Tint',
      className: `${p}-section-primary-tint`,
      bgStyle: `background: ${primary[50]};`,
      textColor: gray[900],
      description: 'Lightly brand-tinted background for featured sections.',
    },
    {
      name: 'Primary',
      className: `${p}-section-primary`,
      bgStyle: `background: ${primary[400]};`,
      textColor: '#ffffff',
      description: 'Bold brand section for CTAs, key messages.',
    },
    {
      name: 'Dark',
      className: `${p}-section-dark`,
      bgStyle: `background: ${gray[900]};`,
      textColor: gray[100],
      description: 'Dark section for contrast, footer areas, or dramatic content.',
    },
    {
      name: 'Gradient Primary',
      className: `${p}-section-gradient`,
      bgStyle: `background: linear-gradient(135deg, ${primary[400]}, ${primary[600]});`,
      textColor: '#ffffff',
      description: 'Gradient section for hero areas or emphasis blocks.',
    },
    {
      name: 'Gradient Dark',
      className: `${p}-section-gradient-dark`,
      bgStyle: `background: linear-gradient(180deg, ${gray[800]}, ${gray[900]});`,
      textColor: gray[100],
      description: 'Dark gradient for premium or dramatic sections.',
    },
    {
      name: 'Warm Gray',
      className: `${p}-section-warm`,
      bgStyle: `background: ${gray[100]};`,
      textColor: gray[800],
      description: 'Slightly warmer neutral for softer visual tone.',
    },
  ];

  const demoHtml = variants.map(v => {
    return `<div style="${v.bgStyle} color: ${v.textColor}; padding: 32px 24px; margin-bottom: 12px; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${v.name}</div>
          <div style="font-size: 13px; opacity: 0.85;">${v.description}</div>
        </div>
        <code style="font-size: 12px; padding: 4px 8px; background: rgba(0,0,0,0.15); border-radius: 4px; font-family: monospace;">.${v.className}</code>
      </div>
    </div>`;
  }).join('\n');

  const cssCode = variants.map(v => {
    return `.${v.className} {
  ${v.bgStyle}
  color: ${v.textColor};
  padding: ${tokens.spacing['2xl']} ${tokens.spacing.lg};
}`;
  }).join('\n\n');

  const classRefs = variants.map(v => v.className);

  const html = wrapSection(3, 'Section Backgrounds', 'foundation', {
    description: 'Predefined section-level background treatments. Use these to create visual rhythm by alternating white and light sections, emphasize CTAs with primary backgrounds, or add drama with dark/gradient variants.',
    tip: 'Alternate white and light-gray sections for readability. Use primary backgrounds sparingly for CTAs. Dark backgrounds work best for footers and premium content areas.',
    demoHtml,
    classRefs,
    cssCode,
    warning: 'When using dark or primary backgrounds, ensure all text and interactive elements use appropriate contrast colors. Check with WCAG 2.1 AA standards.',
  });

  return {
    id: 3,
    anchorId: 'section-3',
    title: 'Section Backgrounds',
    category: 'foundation',
    html,
    classesGenerated: classRefs,
  };
}

registerSection(3, sectionBackgroundsGenerator);

export { sectionBackgroundsGenerator };
