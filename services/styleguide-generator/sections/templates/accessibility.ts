// Section 42: Accessibility
// Skip links, focus styles, screen reader utilities, and WCAG compliance notes.

import type { SectionGeneratorContext, RenderedSection } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';

function accessibilityGenerator(ctx: SectionGeneratorContext): RenderedSection {
  const { tokens } = ctx;
  const p = tokens.prefix;

  const demoHtml = `<div style="font-family: ${tokens.typography.bodyFont}; font-size: 14px;">
    <div style="background: ${tokens.colors.gray[50]}; padding: 16px; border-radius: ${tokens.radius.md}; margin-bottom: 16px;">
      <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Skip Link (visible on focus)</h4>
      <div style="background: ${tokens.colors.primary[400]}; color: white; padding: 8px 16px; border-radius: ${tokens.radius.sm}; display: inline-block; font-size: 14px;">Skip to main content</div>
    </div>

    <div style="background: ${tokens.colors.gray[50]}; padding: 16px; border-radius: ${tokens.radius.md}; margin-bottom: 16px;">
      <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Focus Ring Style</h4>
      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        <button style="padding: 8px 16px; border: 2px solid transparent; border-radius: ${tokens.radius.md}; outline: 3px solid ${tokens.colors.primary[400]}; outline-offset: 2px; background: white; font-size: 14px;">Focused Button</button>
        <a style="color: ${tokens.colors.primary[400]}; outline: 3px solid ${tokens.colors.primary[400]}; outline-offset: 2px; padding: 4px; border-radius: 2px; text-decoration: underline;">Focused Link</a>
      </div>
    </div>

    <div style="background: ${tokens.colors.gray[50]}; padding: 16px; border-radius: ${tokens.radius.md};">
      <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">WCAG Contrast Checklist</h4>
      <div style="font-size: 13px; line-height: 1.6;">
        <div>✓ Body text on white: ${tokens.colors.gray[700]} on #fff (AA compliant)</div>
        <div>✓ Primary on white: ${tokens.colors.primary[700]} for text (use 700+ on white)</div>
        <div>✓ White on primary: #fff on ${tokens.colors.primary[400]} (test with tool)</div>
        <div>✓ Large text (18px+): 3:1 minimum ratio</div>
        <div>✓ Normal text: 4.5:1 minimum ratio</div>
      </div>
    </div>
  </div>`;

  const cssCode = `/* Skip Link — hidden until focused */
.${p}-skip-link {
  position: absolute;
  top: -100%;
  left: 16px;
  z-index: ${tokens.zIndex.toast};
  padding: 8px 16px;
  background: ${tokens.colors.primary[400]};
  color: #ffffff;
  border-radius: ${tokens.radius.sm};
  font-size: 14px;
  text-decoration: none;
  transition: top ${tokens.transitions.fast};
}
.${p}-skip-link:focus {
  top: 8px;
}

/* Global focus style — keyboard users only */
.${p}-focus-visible:focus-visible,
*:focus-visible {
  outline: 3px solid ${tokens.colors.primary[400]};
  outline-offset: 2px;
}

/* Screen reader only — visible to assistive tech */
.${p}-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Screen reader only but focusable (for skip links) */
.${p}-sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  padding: 8px 16px;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}`;

  const classRefs = [
    `${p}-skip-link`, `${p}-focus-visible`, `${p}-sr-only`, `${p}-sr-only-focusable`,
  ];

  const html = wrapSection(42, 'Accessibility', 'site-wide', {
    description: 'Accessibility utilities for WCAG 2.1 AA compliance. Includes skip links, focus styles for keyboard navigation, screen reader utilities, and reduced motion support.',
    tip: 'Add the skip link as the first element inside <body>. Use sr-only for visually hidden labels that screen readers need. Test keyboard navigation on every interactive element.',
    demoHtml,
    classRefs,
    cssCode,
    warning: 'Accessibility is not optional. WCAG 2.1 AA compliance is a legal requirement in many jurisdictions. Test with keyboard navigation, screen readers (NVDA/VoiceOver), and automated tools (axe, Lighthouse).',
  });

  return { id: 42, anchorId: 'section-42', title: 'Accessibility', category: 'site-wide', html, classesGenerated: classRefs };
}

registerSection(42, accessibilityGenerator);
export { accessibilityGenerator };
