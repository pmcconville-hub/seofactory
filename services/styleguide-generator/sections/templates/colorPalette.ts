// Section 1: Color Palette
// Shows all color scales (primary, secondary, accent, gray, semantic) with inline-styled swatches.

import type { SectionGeneratorContext, RenderedSection, ColorScale } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';
import { hexToHSL } from '../../tokens/ColorScaleGenerator';

function contrastColor(hex: string): string {
  const { l } = hexToHSL(hex);
  return l > 55 ? '#1a1a1a' : '#ffffff';
}

function renderColorScale(label: string, scale: ColorScale, prefix: string): string {
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
  const swatches = steps.map(step => {
    const hex = scale[step];
    const textColor = contrastColor(hex);
    const isBrand = step === 400;
    const border = isBrand ? `; border: 3px solid ${textColor}` : '';
    return `<div style="background: ${hex}; color: ${textColor}; padding: 12px 16px; min-width: 90px; text-align: center; font-family: monospace; font-size: 13px${border}">
      <div style="font-weight: 600">${step}${isBrand ? ' ★' : ''}</div>
      <div>${hex}</div>
    </div>`;
  }).join('\n      ');

  return `<div style="margin-bottom: 24px;">
    <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 8px; text-transform: capitalize;">${label}</h3>
    <div style="display: flex; flex-wrap: wrap; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      ${swatches}
    </div>
  </div>`;
}

function renderSemanticColors(semantic: Record<string, string>, prefix: string): string {
  const entries = Object.entries(semantic);
  const swatches = entries.map(([name, hex]) => {
    const textColor = contrastColor(hex);
    return `<div style="background: ${hex}; color: ${textColor}; padding: 16px 20px; min-width: 120px; text-align: center; border-radius: 8px; font-size: 13px; font-family: monospace;">
      <div style="font-weight: 600; text-transform: capitalize; margin-bottom: 4px;">${name}</div>
      <div>${hex}</div>
    </div>`;
  }).join('\n      ');

  return `<div style="margin-bottom: 24px;">
    <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Semantic / Functional</h3>
    <div style="display: flex; flex-wrap: wrap; gap: 12px;">
      ${swatches}
    </div>
  </div>`;
}

function generateCssVars(tokens: SectionGeneratorContext['tokens']): string {
  const { prefix, colors } = tokens;
  const lines: string[] = [':root {'];

  // Primary scale
  for (const [step, hex] of Object.entries(colors.primary)) {
    lines.push(`  --${prefix}-primary-${step}: ${hex};`);
  }

  // Secondary scale
  if (colors.secondary) {
    for (const [step, hex] of Object.entries(colors.secondary)) {
      lines.push(`  --${prefix}-secondary-${step}: ${hex};`);
    }
  }

  // Accent scale
  if (colors.accent) {
    for (const [step, hex] of Object.entries(colors.accent)) {
      lines.push(`  --${prefix}-accent-${step}: ${hex};`);
    }
  }

  // Gray scale
  for (const [step, hex] of Object.entries(colors.gray)) {
    lines.push(`  --${prefix}-gray-${step}: ${hex};`);
  }

  // Semantic
  for (const [name, hex] of Object.entries(colors.semantic)) {
    lines.push(`  --${prefix}-${name}: ${hex};`);
  }

  lines.push('}');
  return lines.join('\n');
}

function colorPaletteGenerator(ctx: SectionGeneratorContext): RenderedSection {
  const { tokens } = ctx;
  const p = tokens.prefix;

  const demos: string[] = [];
  demos.push(renderColorScale('Primary', tokens.colors.primary, p));
  if (tokens.colors.secondary) {
    demos.push(renderColorScale('Secondary', tokens.colors.secondary, p));
  }
  if (tokens.colors.accent) {
    demos.push(renderColorScale('Accent', tokens.colors.accent, p));
  }
  demos.push(renderColorScale('Gray', tokens.colors.gray, p));
  demos.push(renderSemanticColors(tokens.colors.semantic as unknown as Record<string, string>, p));

  const classRefs: string[] = [
    `${p}-primary-{50-900}`, `${p}-gray-{50-900}`,
    `${p}-bg-primary-{50-900}`, `${p}-text-primary-{50-900}`,
  ];

  if (tokens.colors.secondary) classRefs.push(`${p}-secondary-{50-900}`);
  if (tokens.colors.accent) classRefs.push(`${p}-accent-{50-900}`);

  const html = wrapSection(1, 'Color Palette', 'foundation', {
    description: 'Complete color system with 50-900 scales for each brand color. Step 400 (★) is the exact brand color. Use lighter steps for backgrounds, darker steps for text and hover states.',
    tip: 'Use CSS custom properties (e.g., var(--' + p + '-primary-400)) for easy theming. Apply utility classes for quick prototyping.',
    demoHtml: demos.join('\n'),
    classRefs,
    cssCode: generateCssVars(tokens),
    warning: 'Always test color combinations for WCAG 2.1 AA contrast (4.5:1 for body text, 3:1 for large text). Use steps 700-900 on light backgrounds, steps 50-200 on dark backgrounds.',
  });

  return {
    id: 1,
    anchorId: 'section-1',
    title: 'Color Palette',
    category: 'foundation',
    html,
    classesGenerated: classRefs,
  };
}

registerSection(1, colorPaletteGenerator);

export { colorPaletteGenerator };
