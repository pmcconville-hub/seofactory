// Section 23: Hover Effects
// Composable hover classes that can be added to any element.

import type { SectionGeneratorContext, RenderedSection } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';

function hoverEffectsGenerator(ctx: SectionGeneratorContext): RenderedSection {
  const { tokens } = ctx;
  const p = tokens.prefix;

  const cardStyle = `width: 140px; height: 100px; background: white; border: 1px solid ${tokens.colors.gray[200]}; border-radius: ${tokens.radius.md}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-family: monospace; color: ${tokens.colors.gray[600]}; cursor: pointer;`;

  const demoHtml = `<p style="font-size: 13px; color: ${tokens.colors.gray[500]}; margin-bottom: 16px;">Hover over the boxes below to see each effect. These classes are composable — combine them on any element.</p>
  <div style="display: flex; flex-wrap: wrap; gap: 16px;">
    <div style="${cardStyle} transition: ${tokens.transitions.base};">lift</div>
    <div style="${cardStyle} transition: ${tokens.transitions.base};">shadow</div>
    <div style="${cardStyle} transition: ${tokens.transitions.base};">grow</div>
    <div style="${cardStyle} transition: ${tokens.transitions.base};">shrink</div>
    <div style="${cardStyle} transition: ${tokens.transitions.base};">glow</div>
    <div style="${cardStyle} transition: ${tokens.transitions.base};">border-color</div>
  </div>`;

  const cssCode = `/* Lift — subtle upward float */
.${p}-hover-lift {
  transition: transform ${tokens.transitions.base}, box-shadow ${tokens.transitions.base};
}
.${p}-hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: ${tokens.shadows.lg};
}

/* Shadow — adds depth on hover */
.${p}-hover-shadow {
  transition: box-shadow ${tokens.transitions.base};
}
.${p}-hover-shadow:hover {
  box-shadow: ${tokens.shadows.lg};
}

/* Grow — scale up slightly */
.${p}-hover-grow {
  transition: transform ${tokens.transitions.base};
}
.${p}-hover-grow:hover {
  transform: scale(1.03);
}

/* Shrink — press-in effect */
.${p}-hover-shrink {
  transition: transform ${tokens.transitions.fast};
}
.${p}-hover-shrink:hover {
  transform: scale(0.97);
}

/* Glow — brand-colored shadow */
.${p}-hover-glow {
  transition: box-shadow ${tokens.transitions.base};
}
.${p}-hover-glow:hover {
  box-shadow: ${tokens.shadows.colored};
}

/* Border Color — subtle brand tint */
.${p}-hover-border {
  transition: border-color ${tokens.transitions.base};
  border: 1px solid ${tokens.colors.gray[200]};
}
.${p}-hover-border:hover {
  border-color: ${tokens.colors.primary[400]};
}

/* Brightness — lighten on hover */
.${p}-hover-bright {
  transition: filter ${tokens.transitions.base};
}
.${p}-hover-bright:hover {
  filter: brightness(1.05);
}`;

  const classRefs = [
    `${p}-hover-lift`, `${p}-hover-shadow`, `${p}-hover-grow`,
    `${p}-hover-shrink`, `${p}-hover-glow`, `${p}-hover-border`, `${p}-hover-bright`,
  ];

  const html = wrapSection(23, 'Hover Effects', 'extension', {
    description: 'Composable hover effect classes. Apply to any interactive element — cards, buttons, images, list items. Combine multiple effects on the same element.',
    tip: 'These classes are composable: <div class="' + p + '-card ' + p + '-hover-lift ' + p + '-hover-shadow">. Combine lift + shadow for the most polished card interaction.',
    demoHtml,
    classRefs,
    cssCode,
  });

  return { id: 23, anchorId: 'section-23', title: 'Hover Effects', category: 'extension', html, classesGenerated: classRefs };
}

registerSection(23, hoverEffectsGenerator);
export { hoverEffectsGenerator };
