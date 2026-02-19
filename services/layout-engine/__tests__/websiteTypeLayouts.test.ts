import { describe, it, expect } from 'vitest';
import {
  WEBSITE_TYPE_LAYOUTS,
  getWebsiteTypeLayout,
} from '../websiteTypeLayouts';
import type { ComponentType } from '../types';

// All valid ComponentType values from types.ts
const VALID_COMPONENT_TYPES: ComponentType[] = [
  'prose',
  'card',
  'hero',
  'feature-grid',
  'accordion',
  'timeline',
  'comparison-table',
  'testimonial-card',
  'key-takeaways',
  'cta-banner',
  'step-list',
  'checklist',
  'stat-highlight',
  'blockquote',
  'definition-box',
  'faq-accordion',
  'alert-box',
  'info-box',
  'lead-paragraph',
];

describe('websiteTypeLayouts', () => {
  it('should define 17 website types', () => {
    expect(Object.keys(WEBSITE_TYPE_LAYOUTS).length).toBe(17);
  });

  it('e-commerce should have LIFT-ordered components', () => {
    const ecom = WEBSITE_TYPE_LAYOUTS['e-commerce'];
    expect(ecom.componentOrder[0].role).toBe('product-hero');
    expect(ecom.componentOrder[0].liftPriority).toBe(1);
    const featureIdx = ecom.componentOrder.findIndex(c => c.role === 'key-features');
    const reviewIdx = ecom.componentOrder.findIndex(c => c.role === 'reviews');
    expect(featureIdx).toBeLessThan(reviewIdx);
  });

  it('blog should have article-centric layout', () => {
    const blog = WEBSITE_TYPE_LAYOUTS['blog'];
    expect(blog.componentOrder[0].role).toBe('article-title');
  });

  it('getWebsiteTypeLayout should return null for unknown type', () => {
    expect(getWebsiteTypeLayout('unknown-type')).toBeNull();
  });

  it('all types should have valid ComponentType references', () => {
    for (const [, layout] of Object.entries(WEBSITE_TYPE_LAYOUTS)) {
      for (const role of layout.componentOrder) {
        expect(role.preferredComponent).toBeDefined();
        expect(role.liftPriority).toBeGreaterThan(0);
      }
    }
  });

  it('all preferredComponent values should be valid ComponentType strings', () => {
    for (const [typeName, layout] of Object.entries(WEBSITE_TYPE_LAYOUTS)) {
      for (const role of layout.componentOrder) {
        expect(
          VALID_COMPONENT_TYPES,
          `${typeName} role "${role.role}" uses invalid component "${role.preferredComponent}"`
        ).toContain(role.preferredComponent);
      }
    }
  });

  it('each type should have at least 4 component roles', () => {
    for (const [typeName, layout] of Object.entries(WEBSITE_TYPE_LAYOUTS)) {
      expect(
        layout.componentOrder.length,
        `${typeName} should have at least 4 component roles, has ${layout.componentOrder.length}`
      ).toBeGreaterThanOrEqual(4);
    }
  });

  it('LIFT priorities should be sequential starting from 1', () => {
    for (const [typeName, layout] of Object.entries(WEBSITE_TYPE_LAYOUTS)) {
      const priorities = layout.componentOrder.map(c => c.liftPriority);
      const expected = priorities.map((_, i) => i + 1);
      expect(priorities, `${typeName} LIFT priorities should be sequential`).toEqual(expected);
    }
  });

  it('getWebsiteTypeLayout should return correct layout for known type', () => {
    const saas = getWebsiteTypeLayout('saas');
    expect(saas).not.toBeNull();
    expect(saas!.type).toBe('saas');
    expect(saas!.componentOrder.length).toBeGreaterThan(0);
  });

  it('all types should have at least one heading template entry', () => {
    for (const [typeName, layout] of Object.entries(WEBSITE_TYPE_LAYOUTS)) {
      expect(
        layout.headingTemplate.length,
        `${typeName} should have heading templates`
      ).toBeGreaterThan(0);
    }
  });

  it('all types should have internal linking patterns defined', () => {
    for (const [typeName, layout] of Object.entries(WEBSITE_TYPE_LAYOUTS)) {
      expect(
        layout.internalLinkingPattern.primaryTargets.length,
        `${typeName} should have primary link targets`
      ).toBeGreaterThan(0);
      expect(
        ['to-core', 'to-author', 'bidirectional'],
        `${typeName} should have valid linkDirection`
      ).toContain(layout.internalLinkingPattern.linkDirection);
    }
  });

  it('each type.type should match its key in the record', () => {
    for (const [key, layout] of Object.entries(WEBSITE_TYPE_LAYOUTS)) {
      expect(layout.type, `Layout key "${key}" should match type field`).toBe(key);
    }
  });

  it('healthcare should include YMYL-relevant components', () => {
    const healthcare = WEBSITE_TYPE_LAYOUTS['healthcare'];
    const hasDisclaimer = healthcare.componentOrder.some(c => c.role === 'medical-disclaimer');
    expect(hasDisclaimer).toBe(true);
  });

  it('all component roles should have non-empty headingStructure and visualRequirements', () => {
    for (const [typeName, layout] of Object.entries(WEBSITE_TYPE_LAYOUTS)) {
      for (const role of layout.componentOrder) {
        expect(
          role.headingStructure.length,
          `${typeName}/${role.role} should have headingStructure`
        ).toBeGreaterThan(0);
        expect(
          role.visualRequirements.length,
          `${typeName}/${role.role} should have visualRequirements`
        ).toBeGreaterThan(0);
      }
    }
  });
});
