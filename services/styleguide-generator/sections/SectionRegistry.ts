// services/styleguide-generator/sections/SectionRegistry.ts
// Maps section IDs to their generators.
// Sections 1-48 are registered here. Category 1 (template) sections are available
// immediately; Category 2+3 (AI-enhanced) sections are registered later.

import type { SectionGenerator, SectionCategory, RenderedSection, SectionGeneratorContext } from '../types';

export interface SectionMetadata {
  id: number;
  title: string;
  category: SectionCategory;
  aiCategory: 'template' | 'ai-batchA' | 'ai-batchB' | 'ai-batchC' | 'ai-batchD';
}

// ============================================================================
// SECTION CATALOG — All 48 sections with metadata
// ============================================================================

export const SECTION_CATALOG: SectionMetadata[] = [
  // ─── Foundation (1-14) ───────────────────────────────────────────────
  { id: 1,  title: 'Color Palette',           category: 'foundation', aiCategory: 'template' },
  { id: 2,  title: 'Typography',              category: 'foundation', aiCategory: 'template' },
  { id: 3,  title: 'Section Backgrounds',     category: 'foundation', aiCategory: 'template' },
  { id: 4,  title: 'Buttons',                 category: 'foundation', aiCategory: 'ai-batchA' },
  { id: 5,  title: 'Cards',                   category: 'foundation', aiCategory: 'ai-batchA' },
  { id: 6,  title: 'Images',                  category: 'foundation', aiCategory: 'template' },
  { id: 7,  title: 'Lists',                   category: 'foundation', aiCategory: 'ai-batchA' },
  { id: 8,  title: 'Badges & Tags',           category: 'foundation', aiCategory: 'template' },
  { id: 9,  title: 'Icon Boxes',              category: 'foundation', aiCategory: 'ai-batchA' },
  { id: 10, title: 'Forms',                   category: 'foundation', aiCategory: 'ai-batchA' },
  { id: 11, title: 'Tables',                  category: 'foundation', aiCategory: 'ai-batchA' },
  { id: 12, title: 'Reviews & Testimonials',  category: 'foundation', aiCategory: 'ai-batchB' },
  { id: 13, title: 'CTA Blocks',              category: 'foundation', aiCategory: 'ai-batchB' },
  { id: 14, title: 'Hero Sections',           category: 'foundation', aiCategory: 'ai-batchB' },

  // ─── Extension (15-25) ──────────────────────────────────────────────
  { id: 15, title: 'Dividers',                category: 'extension',  aiCategory: 'template' },
  { id: 16, title: 'Alerts & Notifications',  category: 'extension',  aiCategory: 'ai-batchB' },
  { id: 17, title: 'Process Steps',           category: 'extension',  aiCategory: 'ai-batchB' },
  { id: 18, title: 'Pricing Cards',           category: 'extension',  aiCategory: 'ai-batchB' },
  { id: 19, title: 'FAQ / Accordion',         category: 'extension',  aiCategory: 'ai-batchB' },
  { id: 20, title: 'Breadcrumbs',             category: 'extension',  aiCategory: 'template' },
  { id: 21, title: 'Stats & Counters',        category: 'extension',  aiCategory: 'ai-batchB' },
  { id: 22, title: 'Animations',              category: 'extension',  aiCategory: 'template' },
  { id: 23, title: 'Hover Effects',           category: 'extension',  aiCategory: 'template' },
  { id: 24, title: 'Responsive Utilities',    category: 'extension',  aiCategory: 'template' },
  { id: 25, title: 'Page Compositions',       category: 'extension',  aiCategory: 'ai-batchD' },

  // ─── Site-Wide (26-46) ──────────────────────────────────────────────
  { id: 26, title: 'Header & Navigation',     category: 'site-wide',  aiCategory: 'ai-batchC' },
  { id: 27, title: 'Footer',                  category: 'site-wide',  aiCategory: 'ai-batchC' },
  { id: 28, title: 'Floating Elements',       category: 'site-wide',  aiCategory: 'ai-batchC' },
  { id: 29, title: 'Blog Components',         category: 'site-wide',  aiCategory: 'ai-batchC' },
  { id: 30, title: 'Pagination & TOC',        category: 'site-wide',  aiCategory: 'ai-batchC' },
  { id: 31, title: 'Content Typography',      category: 'site-wide',  aiCategory: 'ai-batchC' },
  { id: 32, title: 'Video Embed',             category: 'site-wide',  aiCategory: 'ai-batchC' },
  { id: 33, title: 'Gallery',                 category: 'site-wide',  aiCategory: 'ai-batchC' },
  { id: 34, title: 'Slider / Carousel',       category: 'site-wide',  aiCategory: 'ai-batchC' },
  { id: 35, title: 'Maps',                    category: 'site-wide',  aiCategory: 'ai-batchC' },
  { id: 36, title: 'Partner Logos',           category: 'site-wide',  aiCategory: 'ai-batchC' },
  { id: 37, title: 'Form & Button States',    category: 'site-wide',  aiCategory: 'template' },
  { id: 38, title: 'Skeleton Loading',        category: 'site-wide',  aiCategory: 'template' },
  { id: 39, title: 'Icon Library',            category: 'site-wide',  aiCategory: 'ai-batchD' },
  { id: 40, title: 'Image Guidelines',        category: 'site-wide',  aiCategory: 'ai-batchD' },
  { id: 41, title: 'Special Page Templates',  category: 'site-wide',  aiCategory: 'ai-batchC' },
  { id: 42, title: 'Accessibility',           category: 'site-wide',  aiCategory: 'template' },
  { id: 43, title: 'Schema Markup Patterns',  category: 'site-wide',  aiCategory: 'ai-batchD' },
  { id: 44, title: 'Tone of Voice & Content', category: 'site-wide',  aiCategory: 'ai-batchD' },
  { id: 45, title: 'Global Settings',         category: 'site-wide',  aiCategory: 'template' },
  { id: 46, title: 'Complete Stylesheet',     category: 'site-wide',  aiCategory: 'template' },

  // ─── Reference (47-48) ──────────────────────────────────────────────
  { id: 47, title: 'Quick Reference Table',   category: 'reference',  aiCategory: 'template' },
  { id: 48, title: 'Version & Changelog',     category: 'reference',  aiCategory: 'template' },
];

// ============================================================================
// REGISTRY
// ============================================================================

const generators = new Map<number, SectionGenerator>();

/** Register a section generator for a given section ID. */
export function registerSection(id: number, generator: SectionGenerator): void {
  generators.set(id, generator);
}

/** Get a registered section generator. */
export function getGenerator(id: number): SectionGenerator | undefined {
  return generators.get(id);
}

/** Get metadata for a section by ID. */
export function getSectionMeta(id: number): SectionMetadata | undefined {
  return SECTION_CATALOG.find(s => s.id === id);
}

/** Get all section IDs that belong to a specific AI batch category. */
export function getSectionsByBatch(batch: SectionMetadata['aiCategory']): number[] {
  return SECTION_CATALOG.filter(s => s.aiCategory === batch).map(s => s.id);
}

/** Get all template (non-AI) section IDs. */
export function getTemplateSectionIds(): number[] {
  return getSectionsByBatch('template');
}

/**
 * Generate all registered template sections.
 * Returns sections in order, skipping any that don't have a registered generator.
 */
export function generateTemplateSections(ctx: SectionGeneratorContext): RenderedSection[] {
  const templateIds = getTemplateSectionIds();
  const results: RenderedSection[] = [];

  for (const id of templateIds) {
    const gen = generators.get(id);
    if (gen) {
      results.push(gen(ctx));
    }
  }

  return results;
}

/**
 * Generate all registered sections (template + AI-enhanced).
 * Returns sections in ID order.
 */
export function generateAllSections(ctx: SectionGeneratorContext): RenderedSection[] {
  const results: RenderedSection[] = [];

  for (const meta of SECTION_CATALOG) {
    const gen = generators.get(meta.id);
    if (gen) {
      results.push(gen(ctx));
    }
  }

  return results;
}

/** Get count of registered generators vs total sections. */
export function getRegistrationStats(): { registered: number; total: number } {
  return { registered: generators.size, total: SECTION_CATALOG.length };
}
