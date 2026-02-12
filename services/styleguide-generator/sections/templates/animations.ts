// Section 22: Animations
// CSS keyframe animations for entrance effects and attention-getters.

import type { SectionGeneratorContext, RenderedSection } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';

function animationsGenerator(ctx: SectionGeneratorContext): RenderedSection {
  const { tokens } = ctx;
  const p = tokens.prefix;

  const boxStyle = `width: 80px; height: 80px; background: ${tokens.colors.primary[100]}; border: 2px solid ${tokens.colors.primary[400]}; border-radius: ${tokens.radius.md}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-family: monospace; color: ${tokens.colors.primary[700]};`;

  const demoHtml = `<p style="font-size: 13px; color: ${tokens.colors.gray[500]}; margin-bottom: 16px;">Animations are defined via CSS keyframes. Apply classes to elements that should animate on page load or scroll-into-view.</p>
  <div style="display: flex; flex-wrap: wrap; gap: 16px;">
    <div style="${boxStyle}">fade-up</div>
    <div style="${boxStyle}">fade-in</div>
    <div style="${boxStyle}">slide-left</div>
    <div style="${boxStyle}">slide-right</div>
    <div style="${boxStyle}">scale-in</div>
    <div style="${boxStyle}">bounce</div>
  </div>`;

  const cssCode = `/* Fade Up — most common entrance animation */
@keyframes ${p}-fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.${p}-anim-fade-up {
  animation: ${p}-fade-up 0.5s ease-out both;
}

/* Fade In */
@keyframes ${p}-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.${p}-anim-fade-in {
  animation: ${p}-fade-in 0.4s ease-out both;
}

/* Slide from Left */
@keyframes ${p}-slide-left {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}
.${p}-anim-slide-left {
  animation: ${p}-slide-left 0.5s ease-out both;
}

/* Slide from Right */
@keyframes ${p}-slide-right {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}
.${p}-anim-slide-right {
  animation: ${p}-slide-right 0.5s ease-out both;
}

/* Scale In */
@keyframes ${p}-scale-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
.${p}-anim-scale-in {
  animation: ${p}-scale-in 0.4s ease-out both;
}

/* Bounce (attention) */
@keyframes ${p}-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.${p}-anim-bounce {
  animation: ${p}-bounce 0.6s ease-in-out;
}

/* Stagger delays — apply to children for cascading entrance */
.${p}-anim-delay-1 { animation-delay: 0.1s; }
.${p}-anim-delay-2 { animation-delay: 0.2s; }
.${p}-anim-delay-3 { animation-delay: 0.3s; }
.${p}-anim-delay-4 { animation-delay: 0.4s; }
.${p}-anim-delay-5 { animation-delay: 0.5s; }

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  [class*="${p}-anim-"] {
    animation: none !important;
    transition: none !important;
  }
}`;

  const classRefs = [
    `${p}-anim-fade-up`, `${p}-anim-fade-in`, `${p}-anim-slide-left`,
    `${p}-anim-slide-right`, `${p}-anim-scale-in`, `${p}-anim-bounce`,
    `${p}-anim-delay-{1-5}`,
  ];

  const html = wrapSection(22, 'Animations', 'extension', {
    description: 'CSS keyframe animations for entrance effects. Apply to elements that should animate on load or when scrolling into view. Includes stagger delays for cascading effects.',
    tip: 'Combine with Intersection Observer for scroll-triggered animations. Use stagger delay classes on child elements for cascading card entrances.',
    demoHtml,
    classRefs,
    cssCode,
    warning: 'Always respect prefers-reduced-motion. The provided CSS includes an automatic override that disables all animations when the user has requested reduced motion.',
  });

  return { id: 22, anchorId: 'section-22', title: 'Animations', category: 'extension', html, classesGenerated: classRefs };
}

registerSection(22, animationsGenerator);
export { animationsGenerator };
