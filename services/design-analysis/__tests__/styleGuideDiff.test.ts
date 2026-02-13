import { describe, it, expect } from 'vitest';
import { diffStyleGuides } from '../styleGuideDiff';
import type { StyleGuide, StyleGuideElement, StyleGuideColor } from '../../../types/styleGuide';

// =============================================================================
// Helpers — minimal factories for test data
// =============================================================================

function makeElement(overrides: Partial<StyleGuideElement> = {}): StyleGuideElement {
  return {
    id: overrides.id ?? 'el-1',
    category: (overrides.category as any) ?? 'typography',
    subcategory: overrides.subcategory ?? 'h1',
    label: overrides.label ?? 'Primary Heading',
    pageRegion: 'main',
    outerHtml: '<h1>Hello</h1>',
    computedCss: overrides.computedCss ?? { 'font-size': '48px', color: '#000' },
    selfContainedHtml: overrides.selfContainedHtml ?? '<h1 style="font-size:48px">Hello</h1>',
    selector: 'h1',
    elementTag: 'h1',
    classNames: [],
    approvalStatus: overrides.approvalStatus ?? 'pending',
    qualityScore: overrides.qualityScore,
    ...overrides,
  };
}

function makeColor(hex: string, usage: string = 'brand'): StyleGuideColor {
  return {
    hex,
    rgb: '',
    usage,
    source: 'extracted',
    frequency: 5,
    approvalStatus: 'pending',
  };
}

function makeGuide(overrides: Partial<StyleGuide> = {}): StyleGuide {
  return {
    id: 'guide-1',
    hostname: 'example.com',
    sourceUrl: 'https://example.com',
    extractedAt: new Date().toISOString(),
    elements: overrides.elements ?? [],
    colors: overrides.colors ?? [],
    googleFontsUrls: [],
    googleFontFamilies: [],
    isApproved: false,
    extractionDurationMs: 1000,
    elementCount: (overrides.elements ?? []).length,
    version: overrides.version ?? 1,
    ...overrides,
  };
}

// =============================================================================
// diffStyleGuides
// =============================================================================

describe('diffStyleGuides', () => {
  it('should return all unchanged when guides are identical', () => {
    const elements = [
      makeElement({ id: 'el-1', label: 'Heading 1' }),
      makeElement({ id: 'el-2', label: 'Heading 2', subcategory: 'h2' }),
    ];
    const colors = [makeColor('#ff0000'), makeColor('#00ff00')];

    const oldGuide = makeGuide({ version: 1, elements, colors });
    const newGuide = makeGuide({ version: 2, elements, colors });

    const diff = diffStyleGuides(oldGuide, newGuide);

    expect(diff.oldVersion).toBe(1);
    expect(diff.newVersion).toBe(2);
    expect(diff.summary.added).toBe(0);
    expect(diff.summary.removed).toBe(0);
    expect(diff.summary.modified).toBe(0);
    expect(diff.summary.unchanged).toBe(2);
    expect(diff.summary.colorsAdded).toBe(0);
    expect(diff.summary.colorsRemoved).toBe(0);
    expect(diff.brandOverviewChanged).toBe(false);
  });

  it('should detect added elements', () => {
    const oldGuide = makeGuide({
      version: 1,
      elements: [makeElement({ id: 'el-1' })],
    });
    const newGuide = makeGuide({
      version: 2,
      elements: [
        makeElement({ id: 'el-1' }),
        makeElement({ id: 'el-2', label: 'New Button', category: 'buttons' as any, subcategory: 'primary' }),
      ],
    });

    const diff = diffStyleGuides(oldGuide, newGuide);

    expect(diff.summary.added).toBe(1);
    expect(diff.summary.unchanged).toBe(1);
    expect(diff.summary.removed).toBe(0);

    const addedDiff = diff.elementDiffs.find(d => d.status === 'added');
    expect(addedDiff).toBeDefined();
    expect(addedDiff!.id).toBe('el-2');
    expect(addedDiff!.label).toBe('New Button');
    expect(addedDiff!.newElement).toBeDefined();
    expect(addedDiff!.oldElement).toBeUndefined();
  });

  it('should detect removed elements', () => {
    const oldGuide = makeGuide({
      version: 1,
      elements: [
        makeElement({ id: 'el-1' }),
        makeElement({ id: 'el-2', label: 'Old Card', category: 'cards' as any }),
      ],
    });
    const newGuide = makeGuide({
      version: 2,
      elements: [makeElement({ id: 'el-1' })],
    });

    const diff = diffStyleGuides(oldGuide, newGuide);

    expect(diff.summary.removed).toBe(1);
    expect(diff.summary.unchanged).toBe(1);

    const removedDiff = diff.elementDiffs.find(d => d.status === 'removed');
    expect(removedDiff).toBeDefined();
    expect(removedDiff!.id).toBe('el-2');
    expect(removedDiff!.oldElement).toBeDefined();
    expect(removedDiff!.newElement).toBeUndefined();
  });

  it('should detect modified elements — HTML change', () => {
    const oldGuide = makeGuide({
      version: 1,
      elements: [makeElement({ id: 'el-1', selfContainedHtml: '<h1>Old</h1>' })],
    });
    const newGuide = makeGuide({
      version: 2,
      elements: [makeElement({ id: 'el-1', selfContainedHtml: '<h1>New</h1>' })],
    });

    const diff = diffStyleGuides(oldGuide, newGuide);

    expect(diff.summary.modified).toBe(1);
    expect(diff.summary.unchanged).toBe(0);

    const modDiff = diff.elementDiffs.find(d => d.status === 'modified');
    expect(modDiff).toBeDefined();
    expect(modDiff!.changes!.htmlChanged).toBe(true);
    expect(modDiff!.changes!.cssChanged).toBe(false);
  });

  it('should detect modified elements — CSS change', () => {
    const oldGuide = makeGuide({
      version: 1,
      elements: [makeElement({ id: 'el-1', computedCss: { color: '#000', 'font-size': '48px' } })],
    });
    const newGuide = makeGuide({
      version: 2,
      elements: [makeElement({ id: 'el-1', computedCss: { color: '#333', 'font-size': '48px' } })],
    });

    const diff = diffStyleGuides(oldGuide, newGuide);

    expect(diff.summary.modified).toBe(1);
    const modDiff = diff.elementDiffs.find(d => d.status === 'modified');
    expect(modDiff!.changes!.cssChanged).toBe(true);
  });

  it('should detect modified elements — quality score change', () => {
    const oldGuide = makeGuide({
      version: 1,
      elements: [makeElement({ id: 'el-1', qualityScore: 50 })],
    });
    const newGuide = makeGuide({
      version: 2,
      elements: [makeElement({ id: 'el-1', qualityScore: 80 })],
    });

    const diff = diffStyleGuides(oldGuide, newGuide);

    expect(diff.summary.modified).toBe(1);
    const modDiff = diff.elementDiffs.find(d => d.status === 'modified');
    expect(modDiff!.changes!.qualityScoreChange).toBe(30);
  });

  it('should detect modified elements — approval status change', () => {
    const oldGuide = makeGuide({
      version: 1,
      elements: [makeElement({ id: 'el-1', approvalStatus: 'pending' })],
    });
    const newGuide = makeGuide({
      version: 2,
      elements: [makeElement({ id: 'el-1', approvalStatus: 'approved' })],
    });

    const diff = diffStyleGuides(oldGuide, newGuide);

    expect(diff.summary.modified).toBe(1);
    const modDiff = diff.elementDiffs.find(d => d.status === 'modified');
    expect(modDiff!.changes!.approvalChanged).toBe(true);
  });

  it('should match elements by category+subcategory+label when IDs differ', () => {
    const oldGuide = makeGuide({
      version: 1,
      elements: [makeElement({ id: 'old-id-1', category: 'buttons' as any, subcategory: 'primary', label: 'Submit' })],
    });
    const newGuide = makeGuide({
      version: 2,
      elements: [makeElement({ id: 'new-id-1', category: 'buttons' as any, subcategory: 'primary', label: 'Submit' })],
    });

    const diff = diffStyleGuides(oldGuide, newGuide);

    // Same match key, same content — should be unchanged, not added+removed
    expect(diff.summary.added).toBe(0);
    expect(diff.summary.removed).toBe(0);
    expect(diff.summary.unchanged).toBe(1);
  });

  it('should detect added colors', () => {
    const oldGuide = makeGuide({
      version: 1,
      colors: [makeColor('#ff0000')],
    });
    const newGuide = makeGuide({
      version: 2,
      colors: [makeColor('#ff0000'), makeColor('#0000ff', 'accent')],
    });

    const diff = diffStyleGuides(oldGuide, newGuide);

    expect(diff.summary.colorsAdded).toBe(1);
    expect(diff.summary.colorsRemoved).toBe(0);

    const addedColor = diff.colorDiffs.find(c => c.status === 'added');
    expect(addedColor).toBeDefined();
    expect(addedColor!.hex).toBe('#0000ff');
  });

  it('should detect removed colors', () => {
    const oldGuide = makeGuide({
      version: 1,
      colors: [makeColor('#ff0000'), makeColor('#00ff00')],
    });
    const newGuide = makeGuide({
      version: 2,
      colors: [makeColor('#ff0000')],
    });

    const diff = diffStyleGuides(oldGuide, newGuide);

    expect(diff.summary.colorsAdded).toBe(0);
    expect(diff.summary.colorsRemoved).toBe(1);

    const removedColor = diff.colorDiffs.find(c => c.status === 'removed');
    expect(removedColor).toBeDefined();
    expect(removedColor!.hex).toBe('#00ff00');
  });

  it('should handle case-insensitive color comparison', () => {
    const oldGuide = makeGuide({
      version: 1,
      colors: [makeColor('#FF0000')],
    });
    const newGuide = makeGuide({
      version: 2,
      colors: [makeColor('#ff0000')],
    });

    const diff = diffStyleGuides(oldGuide, newGuide);

    expect(diff.summary.colorsAdded).toBe(0);
    expect(diff.summary.colorsRemoved).toBe(0);
  });

  it('should detect brand overview changes', () => {
    const oldGuide = makeGuide({
      version: 1,
      brandOverview: {
        brandPersonality: 'Professional',
        colorMood: 'cool',
        overallFeel: 'Old feel',
        pageSections: [],
      },
    });
    const newGuide = makeGuide({
      version: 2,
      brandOverview: {
        brandPersonality: 'Modern, bold',
        colorMood: 'warm',
        overallFeel: 'New feel',
        pageSections: [],
      },
    });

    const diff = diffStyleGuides(oldGuide, newGuide);

    expect(diff.brandOverviewChanged).toBe(true);
  });

  it('should report brand overview unchanged when both are undefined', () => {
    const oldGuide = makeGuide({ version: 1 });
    const newGuide = makeGuide({ version: 2 });

    const diff = diffStyleGuides(oldGuide, newGuide);

    expect(diff.brandOverviewChanged).toBe(false);
  });

  it('should handle empty guides', () => {
    const oldGuide = makeGuide({ version: 1, elements: [], colors: [] });
    const newGuide = makeGuide({ version: 2, elements: [], colors: [] });

    const diff = diffStyleGuides(oldGuide, newGuide);

    expect(diff.summary.added).toBe(0);
    expect(diff.summary.removed).toBe(0);
    expect(diff.summary.modified).toBe(0);
    expect(diff.summary.unchanged).toBe(0);
    expect(diff.summary.colorsAdded).toBe(0);
    expect(diff.summary.colorsRemoved).toBe(0);
    expect(diff.elementDiffs).toHaveLength(0);
    expect(diff.colorDiffs).toHaveLength(0);
  });

  it('should provide correct summary stats for mixed changes', () => {
    const oldGuide = makeGuide({
      version: 1,
      elements: [
        makeElement({ id: 'el-1', label: 'Unchanged' }),
        makeElement({ id: 'el-2', label: 'Will Be Modified', selfContainedHtml: '<p>old</p>' }),
        makeElement({ id: 'el-3', label: 'Will Be Removed' }),
      ],
      colors: [makeColor('#aaa'), makeColor('#bbb')],
    });
    const newGuide = makeGuide({
      version: 3,
      elements: [
        makeElement({ id: 'el-1', label: 'Unchanged' }),
        makeElement({ id: 'el-2', label: 'Will Be Modified', selfContainedHtml: '<p>new</p>' }),
        makeElement({ id: 'el-4', label: 'Newly Added', category: 'forms' as any }),
      ],
      colors: [makeColor('#aaa'), makeColor('#ccc')],
    });

    const diff = diffStyleGuides(oldGuide, newGuide);

    expect(diff.oldVersion).toBe(1);
    expect(diff.newVersion).toBe(3);
    expect(diff.summary.unchanged).toBe(1);
    expect(diff.summary.modified).toBe(1);
    expect(diff.summary.removed).toBe(1);
    expect(diff.summary.added).toBe(1);
    expect(diff.summary.colorsAdded).toBe(1);
    expect(diff.summary.colorsRemoved).toBe(1);
    expect(diff.elementDiffs).toHaveLength(4);
  });
});
