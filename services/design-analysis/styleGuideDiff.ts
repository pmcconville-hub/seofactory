// =============================================================================
// Style Guide Diff Service — Compare two style guide versions
// =============================================================================

import type { StyleGuide, StyleGuideElement, StyleGuideColor } from '../../types/styleGuide';

// =============================================================================
// Types
// =============================================================================

export interface ElementDiff {
  id: string;
  label: string;
  category: string;
  subcategory: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  changes?: {
    htmlChanged: boolean;
    cssChanged: boolean;
    qualityScoreChange?: number;  // new - old
    approvalChanged: boolean;
  };
  oldElement?: StyleGuideElement;
  newElement?: StyleGuideElement;
}

export interface ColorDiff {
  hex: string;
  status: 'added' | 'removed' | 'unchanged';
  usage?: string;
}

export interface StyleGuideDiff {
  oldVersion: number;
  newVersion: number;
  elementDiffs: ElementDiff[];
  colorDiffs: ColorDiff[];
  brandOverviewChanged: boolean;
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
    colorsAdded: number;
    colorsRemoved: number;
  };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Generate a match key for an element (used when IDs differ between versions).
 */
function getElementMatchKey(element: StyleGuideElement): string {
  return `${element.category}:${element.subcategory}:${element.label}`;
}

/**
 * Compare two CSS property maps for equality.
 */
function cssEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    if (keysA[i] !== keysB[i]) return false;
    if (a[keysA[i]] !== b[keysB[i]]) return false;
  }
  return true;
}

// =============================================================================
// Main diff function
// =============================================================================

/**
 * Compute diff between two style guide versions.
 * Elements are matched by id first, then by category+subcategory+label hash if id doesn't match.
 */
export function diffStyleGuides(oldGuide: StyleGuide, newGuide: StyleGuide): StyleGuideDiff {
  const elementDiffs: ElementDiff[] = [];

  // Build lookup maps for old elements — by id and by match key
  const oldById = new Map<string, StyleGuideElement>();
  const oldByKey = new Map<string, StyleGuideElement>();
  for (const el of oldGuide.elements) {
    oldById.set(el.id, el);
    oldByKey.set(getElementMatchKey(el), el);
  }

  // Track which old elements have been matched
  const matchedOldIds = new Set<string>();

  // Process new elements — try to find matches in old
  for (const newEl of newGuide.elements) {
    let oldEl: StyleGuideElement | undefined;

    // Match by id first
    if (oldById.has(newEl.id)) {
      oldEl = oldById.get(newEl.id)!;
    } else {
      // Fall back to match key
      const key = getElementMatchKey(newEl);
      if (oldByKey.has(key)) {
        oldEl = oldByKey.get(key)!;
      }
    }

    if (oldEl) {
      matchedOldIds.add(oldEl.id);

      // Compare elements for changes
      const htmlChanged = oldEl.selfContainedHtml !== newEl.selfContainedHtml;
      const cssChanged = !cssEqual(oldEl.computedCss, newEl.computedCss);
      const approvalChanged = oldEl.approvalStatus !== newEl.approvalStatus;
      const oldScore = oldEl.qualityScore ?? undefined;
      const newScore = newEl.qualityScore ?? undefined;
      const qualityScoreChange = (oldScore !== undefined && newScore !== undefined)
        ? newScore - oldScore
        : undefined;

      const isModified = htmlChanged || cssChanged || approvalChanged ||
        (qualityScoreChange !== undefined && qualityScoreChange !== 0);

      elementDiffs.push({
        id: newEl.id,
        label: newEl.label,
        category: newEl.category,
        subcategory: newEl.subcategory,
        status: isModified ? 'modified' : 'unchanged',
        changes: isModified ? {
          htmlChanged,
          cssChanged,
          qualityScoreChange,
          approvalChanged,
        } : undefined,
        oldElement: isModified ? oldEl : undefined,
        newElement: isModified ? newEl : undefined,
      });
    } else {
      // New element not found in old — added
      elementDiffs.push({
        id: newEl.id,
        label: newEl.label,
        category: newEl.category,
        subcategory: newEl.subcategory,
        status: 'added',
        newElement: newEl,
      });
    }
  }

  // Find removed elements (in old but not matched)
  for (const oldEl of oldGuide.elements) {
    if (!matchedOldIds.has(oldEl.id)) {
      elementDiffs.push({
        id: oldEl.id,
        label: oldEl.label,
        category: oldEl.category,
        subcategory: oldEl.subcategory,
        status: 'removed',
        oldElement: oldEl,
      });
    }
  }

  // Compare color palettes
  const colorDiffs: ColorDiff[] = [];
  const oldColorHexes = new Set(oldGuide.colors.map(c => c.hex.toLowerCase()));
  const newColorHexes = new Set(newGuide.colors.map(c => c.hex.toLowerCase()));

  for (const color of newGuide.colors) {
    const hex = color.hex.toLowerCase();
    if (oldColorHexes.has(hex)) {
      colorDiffs.push({ hex: color.hex, status: 'unchanged', usage: color.usage });
    } else {
      colorDiffs.push({ hex: color.hex, status: 'added', usage: color.usage });
    }
  }
  for (const color of oldGuide.colors) {
    const hex = color.hex.toLowerCase();
    if (!newColorHexes.has(hex)) {
      colorDiffs.push({ hex: color.hex, status: 'removed', usage: color.usage });
    }
  }

  // Compare brand overview (simple changed/unchanged)
  const brandOverviewChanged = JSON.stringify(oldGuide.brandOverview || null) !==
    JSON.stringify(newGuide.brandOverview || null);

  // Build summary stats
  const summary = {
    added: elementDiffs.filter(d => d.status === 'added').length,
    removed: elementDiffs.filter(d => d.status === 'removed').length,
    modified: elementDiffs.filter(d => d.status === 'modified').length,
    unchanged: elementDiffs.filter(d => d.status === 'unchanged').length,
    colorsAdded: colorDiffs.filter(d => d.status === 'added').length,
    colorsRemoved: colorDiffs.filter(d => d.status === 'removed').length,
  };

  return {
    oldVersion: oldGuide.version,
    newVersion: newGuide.version,
    elementDiffs,
    colorDiffs,
    brandOverviewChanged,
    summary,
  };
}
