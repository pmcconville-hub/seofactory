// Section 38: Skeleton Loading
// Placeholder shimmer components for content loading states.

import type { SectionGeneratorContext, RenderedSection } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';

function skeletonLoadingGenerator(ctx: SectionGeneratorContext): RenderedSection {
  const { tokens } = ctx;
  const p = tokens.prefix;
  const gray = tokens.colors.gray;

  const shimmerGradient = `linear-gradient(90deg, ${gray[200]} 25%, ${gray[100]} 50%, ${gray[200]} 75%)`;

  const demoHtml = `<div style="max-width: 400px;">
    <p style="font-size: 13px; color: ${gray[500]}; margin-bottom: 16px;">Skeleton screens shown while content loads. Uses CSS animation for shimmer effect.</p>

    <!-- Card skeleton -->
    <div style="background: white; border-radius: ${tokens.radius.lg}; padding: 20px; box-shadow: ${tokens.shadows.sm}; margin-bottom: 20px;">
      <div style="width: 100%; height: 160px; background: ${gray[200]}; border-radius: ${tokens.radius.md}; margin-bottom: 16px;"></div>
      <div style="width: 70%; height: 16px; background: ${gray[200]}; border-radius: 4px; margin-bottom: 12px;"></div>
      <div style="width: 100%; height: 12px; background: ${gray[200]}; border-radius: 4px; margin-bottom: 8px;"></div>
      <div style="width: 90%; height: 12px; background: ${gray[200]}; border-radius: 4px; margin-bottom: 16px;"></div>
      <div style="width: 120px; height: 36px; background: ${gray[200]}; border-radius: ${tokens.radius.md};"></div>
    </div>

    <!-- Text skeleton -->
    <div style="margin-bottom: 20px;">
      <div style="width: 50%; height: 20px; background: ${gray[200]}; border-radius: 4px; margin-bottom: 12px;"></div>
      <div style="width: 100%; height: 12px; background: ${gray[200]}; border-radius: 4px; margin-bottom: 8px;"></div>
      <div style="width: 95%; height: 12px; background: ${gray[200]}; border-radius: 4px; margin-bottom: 8px;"></div>
      <div style="width: 85%; height: 12px; background: ${gray[200]}; border-radius: 4px;"></div>
    </div>

    <!-- Avatar + text skeleton -->
    <div style="display: flex; gap: 12px; align-items: center;">
      <div style="width: 48px; height: 48px; background: ${gray[200]}; border-radius: 50%; flex-shrink: 0;"></div>
      <div style="flex: 1;">
        <div style="width: 60%; height: 14px; background: ${gray[200]}; border-radius: 4px; margin-bottom: 8px;"></div>
        <div style="width: 40%; height: 12px; background: ${gray[200]}; border-radius: 4px;"></div>
      </div>
    </div>
  </div>`;

  const cssCode = `/* Shimmer animation */
@keyframes ${p}-shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}

.${p}-skeleton {
  background: ${shimmerGradient};
  background-size: 200px 100%;
  animation: ${p}-shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}

.${p}-skeleton-text {
  height: 12px;
  margin-bottom: 8px;
}

.${p}-skeleton-title {
  height: 20px;
  width: 60%;
  margin-bottom: 12px;
}

.${p}-skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.${p}-skeleton-image {
  width: 100%;
  height: 160px;
  border-radius: ${tokens.radius.md};
}

.${p}-skeleton-button {
  width: 120px;
  height: 36px;
  border-radius: ${tokens.radius.md};
}

/* Reduce motion */
@media (prefers-reduced-motion: reduce) {
  .${p}-skeleton {
    animation: none;
  }
}`;

  const classRefs = [
    `${p}-skeleton`, `${p}-skeleton-text`, `${p}-skeleton-title`,
    `${p}-skeleton-avatar`, `${p}-skeleton-image`, `${p}-skeleton-button`,
  ];

  const html = wrapSection(38, 'Skeleton Loading', 'site-wide', {
    description: 'Placeholder shimmer components for content loading states. Replaces spinners with content-shaped skeletons that match the eventual layout.',
    tip: 'Match skeleton shapes to your actual content layout. Use skeleton-text for paragraphs, skeleton-title for headings, and skeleton-avatar for profile images.',
    demoHtml,
    classRefs,
    cssCode,
  });

  return { id: 38, anchorId: 'section-38', title: 'Skeleton Loading', category: 'site-wide', html, classesGenerated: classRefs };
}

registerSection(38, skeletonLoadingGenerator);
export { skeletonLoadingGenerator };
