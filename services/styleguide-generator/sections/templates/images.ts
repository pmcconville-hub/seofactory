// Section 6: Images
// Image treatment classes: rounded, framed, shadow, circle, cover, etc.

import type { SectionGeneratorContext, RenderedSection } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';

function imagesGenerator(ctx: SectionGeneratorContext): RenderedSection {
  const { tokens } = ctx;
  const p = tokens.prefix;

  const placeholderBg = tokens.colors.gray[200];
  const placeholderText = tokens.colors.gray[500];
  const imgPlaceholder = (w: string, h: string, label: string) =>
    `<div style="width: ${w}; height: ${h}; background: ${placeholderBg}; color: ${placeholderText}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-family: monospace;">${label}</div>`;

  const variants = [
    { name: 'Rounded', cls: `${p}-img-rounded`, style: `border-radius: ${tokens.radius.lg};`, desc: 'Standard rounded image' },
    { name: 'Circle', cls: `${p}-img-circle`, style: 'border-radius: 50%;', desc: 'Perfect circle — use for avatars' },
    { name: 'Shadow', cls: `${p}-img-shadow`, style: `border-radius: ${tokens.radius.md}; box-shadow: ${tokens.shadows.md};`, desc: 'Elevated image with shadow' },
    { name: 'Framed', cls: `${p}-img-framed`, style: `border: 3px solid ${tokens.colors.gray[200]}; border-radius: ${tokens.radius.md}; padding: 4px;`, desc: 'Photo-frame border treatment' },
    { name: 'Cover', cls: `${p}-img-cover`, style: 'width: 100%; height: 200px; object-fit: cover; border-radius: ' + tokens.radius.md + ';', desc: 'Full-width cover with aspect ratio' },
    { name: 'Grayscale Hover', cls: `${p}-img-grayscale`, style: `filter: grayscale(100%); transition: ${tokens.transitions.base}; border-radius: ${tokens.radius.md};`, desc: 'Grayscale → color on hover' },
  ];

  const demoHtml = `<div style="display: flex; flex-wrap: wrap; gap: 20px; align-items: start;">
    ${variants.map(v => `<div style="text-align: center;">
      <div style="width: 150px; height: 150px; background: ${placeholderBg}; ${v.style} overflow: hidden; display: flex; align-items: center; justify-content: center; color: ${placeholderText}; font-size: 11px; font-family: monospace;">
        ${v.name}
      </div>
      <code style="font-size: 11px; display: block; margin-top: 8px;">.${v.cls}</code>
    </div>`).join('\n    ')}
  </div>`;

  const cssCode = variants.map(v => `.${v.cls} {\n  ${v.style.split(';').filter(Boolean).map(s => s.trim() + ';').join('\n  ')}\n}`).join('\n\n') +
    `\n\n.${p}-img-grayscale:hover {\n  filter: grayscale(0%);\n}`;

  const classRefs = variants.map(v => v.cls);

  const html = wrapSection(6, 'Images', 'foundation', {
    description: 'Reusable image treatment classes for consistent visual styling across all images. Combine with hover effects for interactive galleries.',
    tip: 'Apply directly to <img> elements or their wrapper containers. Circle treatment works best on square images.',
    demoHtml,
    classRefs,
    cssCode,
  });

  return { id: 6, anchorId: 'section-6', title: 'Images', category: 'foundation', html, classesGenerated: classRefs };
}

registerSection(6, imagesGenerator);
export { imagesGenerator };
