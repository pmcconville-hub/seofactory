import { describe, it, expect, beforeEach } from 'vitest';
import { wrapSection, escapeHtml } from '../sections/BaseSectionTemplate';
import {
  SECTION_CATALOG,
  registerSection,
  getGenerator,
  getSectionMeta,
  getSectionsByBatch,
  getTemplateSectionIds,
  getRegistrationStats,
} from '../sections/SectionRegistry';
import type { SectionGeneratorContext, RenderedSection } from '../types';

// ============================================================================
// BaseSectionTemplate
// ============================================================================

describe('wrapSection', () => {
  it('produces valid section HTML with all parts', () => {
    const html = wrapSection(1, 'Color Palette', 'foundation', {
      description: 'Brand color system with 50-900 scales.',
      tip: 'Use CSS custom properties for theming.',
      demoHtml: '<div style="background: red; width: 50px; height: 50px;"></div>',
      classRefs: ['bm-primary-400', 'bm-primary-50'],
      cssCode: '.bm-primary-400 { color: #6EB544; }',
      warning: 'Always check contrast ratios.',
    });

    expect(html).toContain('id="section-1"');
    expect(html).toContain('1. Color Palette');
    expect(html).toContain('sg-description');
    expect(html).toContain('sg-tip');
    expect(html).toContain('sg-demo');
    expect(html).toContain('sg-class-ref');
    expect(html).toContain('sg-code');
    expect(html).toContain('sg-warning');
    expect(html).toContain('background: red');
  });

  it('omits optional sections when not provided', () => {
    const html = wrapSection(2, 'Typography', 'foundation', {
      description: 'Font hierarchy.',
      demoHtml: '<p>Hello</p>',
    });

    expect(html).toContain('id="section-2"');
    expect(html).toContain('2. Typography');
    expect(html).not.toContain('sg-tip');
    expect(html).not.toContain('sg-class-ref');
    expect(html).not.toContain('sg-code');
    expect(html).not.toContain('sg-warning');
  });

  it('does not escape demo HTML (raw insertion)', () => {
    const html = wrapSection(1, 'Test', 'foundation', {
      description: 'Test',
      demoHtml: '<div class="custom"><span>HTML</span></div>',
    });

    expect(html).toContain('<div class="custom"><span>HTML</span></div>');
  });

  it('escapes text content to prevent XSS', () => {
    const html = wrapSection(1, 'Test <script>', 'foundation', {
      description: 'A "dangerous" <description>',
      demoHtml: '',
    });

    expect(html).toContain('Test &lt;script&gt;');
    expect(html).toContain('A &quot;dangerous&quot; &lt;description&gt;');
    expect(html).not.toContain('<script>');
  });
});

describe('escapeHtml', () => {
  it('escapes all special characters', () => {
    expect(escapeHtml('a & b < c > d "e" \'f\'')).toBe(
      'a &amp; b &lt; c &gt; d &quot;e&quot; &#39;f&#39;'
    );
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});

// ============================================================================
// SectionRegistry
// ============================================================================

describe('SECTION_CATALOG', () => {
  it('has exactly 48 sections', () => {
    expect(SECTION_CATALOG).toHaveLength(48);
  });

  it('has unique IDs from 1 to 48', () => {
    const ids = SECTION_CATALOG.map(s => s.id);
    expect(new Set(ids).size).toBe(48);
    expect(Math.min(...ids)).toBe(1);
    expect(Math.max(...ids)).toBe(48);
  });

  it('every section has a title and category', () => {
    for (const s of SECTION_CATALOG) {
      expect(s.title).toBeTruthy();
      expect(['foundation', 'extension', 'site-wide', 'reference']).toContain(s.category);
    }
  });

  it('has 17 template sections', () => {
    const templates = SECTION_CATALOG.filter(s => s.aiCategory === 'template');
    expect(templates).toHaveLength(17);
  });

  it('has correct batch assignments', () => {
    const batchA = getSectionsByBatch('ai-batchA');
    const batchB = getSectionsByBatch('ai-batchB');
    const batchC = getSectionsByBatch('ai-batchC');
    const batchD = getSectionsByBatch('ai-batchD');

    expect(batchA).toEqual([4, 5, 7, 9, 10, 11]);
    expect(batchB).toEqual([12, 13, 14, 16, 17, 18, 19, 21]);
    expect(batchC).toEqual([26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 41]);
    expect(batchD).toEqual([25, 39, 40, 43, 44]);
  });
});

describe('registerSection / getGenerator', () => {
  it('registers and retrieves a generator', () => {
    const mockGen = (ctx: SectionGeneratorContext): RenderedSection => ({
      id: 99, anchorId: 'section-99', title: 'Test',
      category: 'foundation', html: '<div>test</div>', classesGenerated: [],
    });

    registerSection(99, mockGen);
    expect(getGenerator(99)).toBe(mockGen);
  });

  it('returns undefined for unregistered sections', () => {
    expect(getGenerator(999)).toBeUndefined();
  });
});

describe('getSectionMeta', () => {
  it('returns metadata for a valid section', () => {
    const meta = getSectionMeta(1);
    expect(meta).toBeDefined();
    expect(meta!.title).toBe('Color Palette');
    expect(meta!.category).toBe('foundation');
  });

  it('returns undefined for invalid section', () => {
    expect(getSectionMeta(0)).toBeUndefined();
    expect(getSectionMeta(49)).toBeUndefined();
  });
});

describe('getTemplateSectionIds', () => {
  it('returns all template section IDs', () => {
    const ids = getTemplateSectionIds();
    expect(ids).toContain(1);  // Color Palette
    expect(ids).toContain(2);  // Typography
    expect(ids).toContain(3);  // Section Backgrounds
    expect(ids).not.toContain(4);  // Buttons = AI batch A
    expect(ids).toHaveLength(17);
  });
});

describe('getRegistrationStats', () => {
  it('reports total as 48', () => {
    const stats = getRegistrationStats();
    expect(stats.total).toBe(48);
    expect(stats.registered).toBeGreaterThanOrEqual(0);
  });
});
