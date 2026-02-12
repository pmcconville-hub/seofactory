// services/styleguide-generator/assembly/NavigationBuilder.ts
// Generates the sticky navigation bar from rendered sections.

import type { RenderedSection, NavItem, SectionCategory } from '../types';

const CATEGORY_LABELS: Record<SectionCategory, string> = {
  foundation: 'Foundation',
  extension: 'Extension',
  'site-wide': 'Site-Wide',
  reference: 'Reference',
};

/**
 * Build navigation items from rendered sections.
 */
export function buildNavItems(sections: RenderedSection[]): NavItem[] {
  return sections.map(s => ({
    sectionId: s.id,
    anchorId: s.anchorId,
    label: s.title,
    category: s.category,
  }));
}

/**
 * Render the sticky navigation bar HTML.
 */
export function renderNavigation(items: NavItem[], prefix: string): string {
  if (items.length === 0) return '';

  let currentCategory: SectionCategory | null = null;
  const links: string[] = [];

  for (const item of items) {
    if (item.category !== currentCategory) {
      if (currentCategory !== null) {
        links.push(`<span class="sg-nav-divider">|</span>`);
      }
      links.push(`<span class="sg-nav-category">${CATEGORY_LABELS[item.category]}</span>`);
      currentCategory = item.category;
    }
    links.push(`<a href="#${item.anchorId}" class="sg-nav-link">${item.sectionId}. ${item.label}</a>`);
  }

  return `<nav class="sg-nav" id="sg-navigation">
  <div class="sg-nav-inner">
    ${links.join('\n    ')}
  </div>
</nav>`;
}
