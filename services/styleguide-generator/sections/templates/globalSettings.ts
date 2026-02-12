// Section 45: Global Settings
// CSS custom properties (:root), base resets, and foundational styles.

import type { SectionGeneratorContext, RenderedSection } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';

function globalSettingsGenerator(ctx: SectionGeneratorContext): RenderedSection {
  const { tokens } = ctx;
  const p = tokens.prefix;

  const demoHtml = `<div style="font-family: ${tokens.typography.bodyFont}; font-size: 13px;">
    <p style="color: ${tokens.colors.gray[500]}; margin-bottom: 16px;">
      All design tokens are exposed as CSS custom properties on <code>:root</code>.
      Reference them with <code>var(--${p}-*)</code> in any component CSS.
    </p>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
      <div style="background: ${tokens.colors.gray[50]}; padding: 12px; border-radius: ${tokens.radius.md};">
        <div style="font-weight: 600; margin-bottom: 4px;">Colors</div>
        <div style="color: ${tokens.colors.gray[500]};">--${p}-primary-{50-900}<br/>--${p}-gray-{50-900}<br/>--${p}-{success,error,warning,info}</div>
      </div>
      <div style="background: ${tokens.colors.gray[50]}; padding: 12px; border-radius: ${tokens.radius.md};">
        <div style="font-weight: 600; margin-bottom: 4px;">Typography</div>
        <div style="color: ${tokens.colors.gray[500]};">--${p}-font-heading<br/>--${p}-font-body<br/>--${p}-text-{h1-caption}</div>
      </div>
      <div style="background: ${tokens.colors.gray[50]}; padding: 12px; border-radius: ${tokens.radius.md};">
        <div style="font-weight: 600; margin-bottom: 4px;">Spacing</div>
        <div style="color: ${tokens.colors.gray[500]};">--${p}-space-{xs,sm,md,lg,xl,2xl,3xl,4xl}</div>
      </div>
      <div style="background: ${tokens.colors.gray[50]}; padding: 12px; border-radius: ${tokens.radius.md};">
        <div style="font-weight: 600; margin-bottom: 4px;">Radius & Shadows</div>
        <div style="color: ${tokens.colors.gray[500]};">--${p}-radius-{sm-full}<br/>--${p}-shadow-{sm-xl}</div>
      </div>
    </div>
  </div>`;

  const cssCode = `:root {
  /* ─── Typography ─── */
  --${p}-font-heading: ${tokens.typography.headingFont};
  --${p}-font-body: ${tokens.typography.bodyFont};

  /* ─── Spacing ─── */
  --${p}-space-xs: ${tokens.spacing.xs};
  --${p}-space-sm: ${tokens.spacing.sm};
  --${p}-space-md: ${tokens.spacing.md};
  --${p}-space-lg: ${tokens.spacing.lg};
  --${p}-space-xl: ${tokens.spacing.xl};
  --${p}-space-2xl: ${tokens.spacing['2xl']};
  --${p}-space-3xl: ${tokens.spacing['3xl']};
  --${p}-space-4xl: ${tokens.spacing['4xl']};

  /* ─── Radius ─── */
  --${p}-radius-sm: ${tokens.radius.sm};
  --${p}-radius-md: ${tokens.radius.md};
  --${p}-radius-lg: ${tokens.radius.lg};
  --${p}-radius-xl: ${tokens.radius.xl};
  --${p}-radius-2xl: ${tokens.radius['2xl']};
  --${p}-radius-full: ${tokens.radius.full};

  /* ─── Shadows ─── */
  --${p}-shadow-sm: ${tokens.shadows.sm};
  --${p}-shadow-md: ${tokens.shadows.md};
  --${p}-shadow-lg: ${tokens.shadows.lg};
  --${p}-shadow-xl: ${tokens.shadows.xl};
  --${p}-shadow-colored: ${tokens.shadows.colored};

  /* ─── Transitions ─── */
  --${p}-transition-fast: ${tokens.transitions.fast};
  --${p}-transition-base: ${tokens.transitions.base};
  --${p}-transition-slow: ${tokens.transitions.slow};

  /* ─── Containers ─── */
  --${p}-container-sm: ${tokens.containers.sm};
  --${p}-container-md: ${tokens.containers.md};
  --${p}-container-lg: ${tokens.containers.lg};
  --${p}-container-xl: ${tokens.containers.xl};
  --${p}-container-2xl: ${tokens.containers['2xl']};
}

/* ─── Base Reset ─── */
*, *::before, *::after {
  box-sizing: border-box;
}

body {
  font-family: var(--${p}-font-body);
  font-size: 1rem;
  line-height: 1.6;
  color: ${tokens.colors.gray[800]};
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--${p}-font-heading);
  line-height: 1.25;
}

a {
  color: ${tokens.colors.primary[400]};
  text-decoration: none;
  transition: color var(--${p}-transition-fast);
}
a:hover {
  color: ${tokens.colors.primary[600]};
  text-decoration: underline;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}`;

  const classRefs = [`${p}-*`]; // meta reference

  const html = wrapSection(45, 'Global Settings', 'site-wide', {
    description: 'Foundation CSS: custom properties for all design tokens, base element resets, and default typography/link styles. Include this stylesheet first, before any component CSS.',
    tip: 'Import this stylesheet at the top of your CSS stack. All component classes reference these custom properties, so they must be loaded first.',
    demoHtml,
    classRefs: [],
    cssCode,
  });

  return { id: 45, anchorId: 'section-45', title: 'Global Settings', category: 'site-wide', html, classesGenerated: [] };
}

registerSection(45, globalSettingsGenerator);
export { globalSettingsGenerator };
