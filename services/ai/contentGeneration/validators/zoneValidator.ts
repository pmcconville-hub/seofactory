/**
 * Zone Validator Module
 *
 * Validates content zone ordering and distribution to ensure:
 * - MAIN sections come before SUPPLEMENTARY sections
 * - Adequate primary content (minimum 3 MAIN sections)
 * - MAIN sections outnumber SUPPLEMENTARY sections
 *
 * @module services/ai/contentGeneration/validators/zoneValidator
 */

import { ContentZone } from '../../../../types/content';

/**
 * Section input for zone validation
 */
export interface ZonedSection {
  heading: string;
  content_zone?: ContentZone;
}

/**
 * Result of zone validation
 */
export interface ZoneValidationResult {
  /** Whether all zone validation rules passed */
  valid: boolean;
  /** List of validation issues found */
  issues: string[];
  /** Count of MAIN sections */
  mainCount: number;
  /** Count of SUPPLEMENTARY sections */
  supplementaryCount: number;
}

/**
 * Minimum number of MAIN sections required for valid content
 */
const MIN_MAIN_SECTIONS = 3;

/**
 * Validates content zones for proper ordering and distribution
 *
 * Rules:
 * 1. MAIN sections should come before SUPPLEMENTARY sections (zone flow)
 * 2. At least 3 MAIN sections required for comprehensive content
 * 3. MAIN sections should outnumber SUPPLEMENTARY sections
 *
 * @param sections - Array of sections with content_zone property
 * @returns Validation result with issues array and zone counts
 */
export function validateContentZones(sections: ZonedSection[]): ZoneValidationResult {
  const issues: string[] = [];

  // Count sections by zone
  let mainCount = 0;
  let supplementaryCount = 0;

  for (const section of sections) {
    if (section.content_zone === ContentZone.MAIN) {
      mainCount++;
    } else if (section.content_zone === ContentZone.SUPPLEMENTARY) {
      supplementaryCount++;
    }
  }

  // Rule 1: Check zone flow (MAIN sections should come before SUPPLEMENTARY)
  let seenSupplementary = false;
  for (const section of sections) {
    if (section.content_zone === ContentZone.SUPPLEMENTARY) {
      seenSupplementary = true;
    } else if (section.content_zone === ContentZone.MAIN && seenSupplementary) {
      issues.push(
        `Invalid zone flow: MAIN section "${section.heading}" appears after SUPPLEMENTARY section. ` +
          `MAIN sections should precede SUPPLEMENTARY sections.`
      );
      break; // Only report first occurrence
    }
  }

  // Rule 2: Check minimum MAIN sections
  if (mainCount < MIN_MAIN_SECTIONS) {
    issues.push(
      `Insufficient primary content: Found ${mainCount} MAIN sections, but at least 3 MAIN sections are required ` +
        `for comprehensive coverage.`
    );
  }

  // Rule 3: Check zone ratio (MAIN should >= SUPPLEMENTARY)
  if (supplementaryCount > mainCount) {
    issues.push(
      `Imbalanced zone distribution: SUPPLEMENTARY sections (${supplementaryCount}) exceed ` +
        `MAIN sections (${mainCount}). Primary content should form the majority of the article.`
    );
  }

  return {
    valid: issues.length === 0,
    issues,
    mainCount,
    supplementaryCount,
  };
}

/**
 * Reorders sections to ensure proper zone flow
 *
 * Moves all MAIN sections before SUPPLEMENTARY sections while
 * preserving relative order within each zone.
 *
 * @param sections - Array of sections to reorder
 * @returns New array with sections in correct zone order
 */
export function reorderByZone<T extends ZonedSection>(sections: T[]): T[] {
  const mainSections: T[] = [];
  const supplementarySections: T[] = [];
  const otherSections: T[] = [];

  for (const section of sections) {
    if (section.content_zone === ContentZone.MAIN) {
      mainSections.push(section);
    } else if (section.content_zone === ContentZone.SUPPLEMENTARY) {
      supplementarySections.push(section);
    } else {
      // Sections without zone classification go to "other"
      // Place them at the beginning (could be intro/title sections)
      otherSections.push(section);
    }
  }

  // Return: other (intro) -> MAIN -> SUPPLEMENTARY
  return [...otherSections, ...mainSections, ...supplementarySections];
}
