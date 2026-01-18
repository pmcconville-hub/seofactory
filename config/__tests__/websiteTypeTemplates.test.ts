/**
 * Website Type Template Coverage Tests
 *
 * Comprehensive test suite validating:
 * 1. All 17 website types have proper template mappings
 * 2. Template selection works correctly for each website type
 * 3. Specific website types get their expected templates
 * 4. Query intent affects template selection appropriately
 * 5. All template structures are valid
 *
 * @module config/__tests__/websiteTypeTemplates.test
 */

import { describe, it, expect } from 'vitest';
import {
  WEBSITE_TYPE_TEMPLATE_MAP,
  CONTENT_TEMPLATES,
  getTemplateForWebsiteType,
  getTemplateByName,
} from '../contentTemplates';
import { selectTemplate } from '../../services/ai/contentGeneration/templateRouter';
import { WebsiteType } from '../../types';

/**
 * All 17 website types defined in the system
 */
const ALL_WEBSITE_TYPES: WebsiteType[] = [
  'ECOMMERCE',
  'SAAS',
  'SERVICE_B2B',
  'INFORMATIONAL',
  'AFFILIATE_REVIEW',
  'LEAD_GENERATION',
  'REAL_ESTATE',
  'MARKETPLACE',
  'RECRUITMENT',
  'HEALTHCARE',
  'EDUCATION',
  'HOSPITALITY',
  'EVENTS',
  'NEWS_MEDIA',
  'DIRECTORY',
  'COMMUNITY',
  'NONPROFIT',
];

describe('Website Type Template Coverage', () => {
  describe('All 17 website types have template mappings', () => {
    it('should have exactly 17 website types defined', () => {
      expect(ALL_WEBSITE_TYPES).toHaveLength(17);
    });

    it('WEBSITE_TYPE_TEMPLATE_MAP should cover all 17 website types', () => {
      const mappedTypes = Object.keys(WEBSITE_TYPE_TEMPLATE_MAP);
      expect(mappedTypes).toHaveLength(17);
    });

    it.each(ALL_WEBSITE_TYPES)('%s has a template mapping', (websiteType) => {
      const templateName = WEBSITE_TYPE_TEMPLATE_MAP[websiteType];
      expect(templateName).toBeDefined();
      expect(typeof templateName).toBe('string');
      expect(templateName.length).toBeGreaterThan(0);
    });

    it.each(ALL_WEBSITE_TYPES)(
      '%s template mapping points to valid template',
      (websiteType) => {
        const templateName = WEBSITE_TYPE_TEMPLATE_MAP[websiteType];
        expect(CONTENT_TEMPLATES[templateName]).toBeDefined();
      }
    );
  });

  describe('Template selection produces valid results', () => {
    it.each(ALL_WEBSITE_TYPES)(
      '%s returns valid template from selectTemplate',
      (websiteType) => {
        const result = selectTemplate({
          websiteType,
          queryIntent: 'informational',
          queryType: 'definitional',
          topicType: 'core',
          topicClass: 'informational',
        });

        expect(result.template).toBeDefined();
        expect(result.template.templateName).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.confidence).toBeLessThanOrEqual(100);
        expect(result.reasoning.length).toBeGreaterThan(0);
      }
    );

    it.each(ALL_WEBSITE_TYPES)(
      '%s returns template with valid structure',
      (websiteType) => {
        const result = selectTemplate({
          websiteType,
          queryIntent: 'informational',
          queryType: 'definitional',
          topicType: 'core',
          topicClass: 'informational',
        });

        const template = result.template;
        expect(template.label).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.sectionStructure).toBeInstanceOf(Array);
        expect(template.maxSections).toBeGreaterThan(0);
        expect(template.minSections).toBeGreaterThan(0);
        expect(template.stylometry).toBeDefined();
      }
    );
  });

  describe('Website type specific template appropriateness', () => {
    it('ECOMMERCE gets ECOMMERCE_PRODUCT template', () => {
      const template = getTemplateForWebsiteType('ECOMMERCE');
      expect(template.templateName).toBe('ECOMMERCE_PRODUCT');
    });

    it('SAAS gets SAAS_FEATURE template', () => {
      const template = getTemplateForWebsiteType('SAAS');
      expect(template.templateName).toBe('SAAS_FEATURE');
    });

    it('SERVICE_B2B gets SAAS_FEATURE template', () => {
      const template = getTemplateForWebsiteType('SERVICE_B2B');
      expect(template.templateName).toBe('SAAS_FEATURE');
    });

    it('INFORMATIONAL gets DEFINITIONAL template', () => {
      const template = getTemplateForWebsiteType('INFORMATIONAL');
      expect(template.templateName).toBe('DEFINITIONAL');
    });

    it('AFFILIATE_REVIEW gets COMPARISON template', () => {
      const template = getTemplateForWebsiteType('AFFILIATE_REVIEW');
      expect(template.templateName).toBe('COMPARISON');
    });

    it('LEAD_GENERATION gets SAAS_FEATURE template', () => {
      const template = getTemplateForWebsiteType('LEAD_GENERATION');
      expect(template.templateName).toBe('SAAS_FEATURE');
    });

    it('REAL_ESTATE gets LOCATION_REALESTATE template', () => {
      const template = getTemplateForWebsiteType('REAL_ESTATE');
      expect(template.templateName).toBe('LOCATION_REALESTATE');
    });

    it('MARKETPLACE gets LISTING_DIRECTORY template', () => {
      const template = getTemplateForWebsiteType('MARKETPLACE');
      expect(template.templateName).toBe('LISTING_DIRECTORY');
    });

    it('RECRUITMENT gets LISTING_DIRECTORY template', () => {
      const template = getTemplateForWebsiteType('RECRUITMENT');
      expect(template.templateName).toBe('LISTING_DIRECTORY');
    });

    it('HEALTHCARE gets HEALTHCARE_YMYL template', () => {
      const template = getTemplateForWebsiteType('HEALTHCARE');
      expect(template.templateName).toBe('HEALTHCARE_YMYL');
    });

    it('EDUCATION gets COURSE_EDUCATION template', () => {
      const template = getTemplateForWebsiteType('EDUCATION');
      expect(template.templateName).toBe('COURSE_EDUCATION');
    });

    it('HOSPITALITY gets EVENT_EXPERIENCE template', () => {
      const template = getTemplateForWebsiteType('HOSPITALITY');
      expect(template.templateName).toBe('EVENT_EXPERIENCE');
    });

    it('EVENTS gets EVENT_EXPERIENCE template', () => {
      const template = getTemplateForWebsiteType('EVENTS');
      expect(template.templateName).toBe('EVENT_EXPERIENCE');
    });

    it('NEWS_MEDIA gets NEWS_ARTICLE template', () => {
      const template = getTemplateForWebsiteType('NEWS_MEDIA');
      expect(template.templateName).toBe('NEWS_ARTICLE');
    });

    it('DIRECTORY gets LISTING_DIRECTORY template', () => {
      const template = getTemplateForWebsiteType('DIRECTORY');
      expect(template.templateName).toBe('LISTING_DIRECTORY');
    });

    it('COMMUNITY gets DEFINITIONAL template', () => {
      const template = getTemplateForWebsiteType('COMMUNITY');
      expect(template.templateName).toBe('DEFINITIONAL');
    });

    it('NONPROFIT gets IMPACT_NONPROFIT template', () => {
      const template = getTemplateForWebsiteType('NONPROFIT');
      expect(template.templateName).toBe('IMPACT_NONPROFIT');
    });
  });

  describe('Query intent affects template selection', () => {
    it('Commercial intent with comparison hints selects COMPARISON', () => {
      const result = selectTemplate({
        websiteType: 'INFORMATIONAL',
        queryIntent: 'commercial',
        queryType: 'comparative',
        topicType: 'outer',
        topicClass: 'informational',
        briefHints: {
          hasComparisonSections: true,
          hasStepSections: false,
          hasSpecsSections: false,
        },
      });

      expect(result.template.templateName).toBe('COMPARISON');
    });

    it('Procedural query type selects PROCESS_HOWTO', () => {
      const result = selectTemplate({
        websiteType: 'INFORMATIONAL',
        queryIntent: 'informational',
        queryType: 'procedural',
        topicType: 'outer',
        topicClass: 'informational',
        briefHints: {
          hasComparisonSections: false,
          hasStepSections: true,
          hasSpecsSections: false,
        },
      });

      expect(result.template.templateName).toBe('PROCESS_HOWTO');
    });

    it('How-to query type selects PROCESS_HOWTO', () => {
      const result = selectTemplate({
        websiteType: 'SAAS',
        queryIntent: 'informational',
        queryType: 'how-to',
        topicType: 'outer',
        topicClass: 'informational',
      });

      expect(result.template.templateName).toBe('PROCESS_HOWTO');
    });

    it('Versus query type selects COMPARISON', () => {
      const result = selectTemplate({
        websiteType: 'ECOMMERCE',
        queryIntent: 'commercial',
        queryType: 'versus',
        topicType: 'outer',
        topicClass: 'monetization',
      });

      expect(result.template.templateName).toBe('COMPARISON');
    });

    it('Definitional query type prefers DEFINITIONAL for informational sites', () => {
      const result = selectTemplate({
        websiteType: 'INFORMATIONAL',
        queryIntent: 'informational',
        queryType: 'definitional',
        topicType: 'core',
        topicClass: 'informational',
      });

      expect(result.template.templateName).toBe('DEFINITIONAL');
    });

    it('Brief hints with step sections override to PROCESS_HOWTO', () => {
      const result = selectTemplate({
        websiteType: 'ECOMMERCE',
        queryIntent: 'informational',
        queryType: 'guide',
        topicType: 'outer',
        topicClass: 'informational',
        briefHints: {
          hasComparisonSections: false,
          hasStepSections: true,
          hasSpecsSections: false,
        },
      });

      expect(result.template.templateName).toBe('PROCESS_HOWTO');
    });

    it('Brief hints with comparison sections override to COMPARISON', () => {
      const result = selectTemplate({
        websiteType: 'SAAS',
        queryIntent: 'commercial',
        queryType: 'comparison',
        topicType: 'outer',
        topicClass: 'monetization',
        briefHints: {
          hasComparisonSections: true,
          hasStepSections: false,
          hasSpecsSections: false,
        },
      });

      expect(result.template.templateName).toBe('COMPARISON');
    });
  });

  describe('Template section structure validity', () => {
    const validFormatCodes = ['FS', 'PAA', 'LISTING', 'DEFINITIVE', 'TABLE', 'PROSE'];
    const validStyles = [
      'ACADEMIC_FORMAL',
      'DIRECT_TECHNICAL',
      'PERSUASIVE_SALES',
      'INSTRUCTIONAL_CLEAR',
    ];
    const validCategories = [
      'CORE_DEFINITION',
      'SEARCH_DEMAND',
      'COMPETITIVE_EXPANSION',
    ];
    const validZones = ['MAIN', 'SUPPLEMENTARY'];

    // Get template names to iterate
    const templateEntries = Object.entries(CONTENT_TEMPLATES) as [
      string,
      typeof CONTENT_TEMPLATES[keyof typeof CONTENT_TEMPLATES]
    ][];

    it.each(templateEntries)(
      '%s has valid section structure',
      (name, template) => {
        // Verify basic structure
        expect(template.sectionStructure).toBeInstanceOf(Array);
        expect(template.sectionStructure.length).toBeGreaterThan(0);
        expect(template.sectionStructure.length).toBeLessThanOrEqual(
          template.maxSections
        );

        // Verify minSections is reasonable
        expect(template.minSections).toBeGreaterThan(0);
        expect(template.minSections).toBeLessThanOrEqual(template.maxSections);

        // Check all sections have valid format codes
        template.sectionStructure.forEach((section) => {
          expect(validFormatCodes).toContain(section.formatCode);
        });
      }
    );

    it.each(templateEntries)(
      '%s has valid section ordering',
      (name, template) => {
        const orders = template.sectionStructure.map((s) => s.order);
        const sortedOrders = [...orders].sort((a, b) => a - b);

        // Orders should be sequential starting from 1
        expect(sortedOrders[0]).toBe(1);
        expect(sortedOrders[sortedOrders.length - 1]).toBe(sortedOrders.length);
      }
    );

    it.each(templateEntries)(
      '%s has valid attribute categories',
      (name, template) => {
        template.sectionStructure.forEach((section) => {
          expect(validCategories).toContain(section.attributeCategory);
        });
      }
    );

    it.each(templateEntries)(
      '%s has valid content zones',
      (name, template) => {
        template.sectionStructure.forEach((section) => {
          expect(validZones).toContain(section.contentZone);
        });
      }
    );

    it.each(templateEntries)('%s has valid stylometry', (name, template) => {
      expect(template.stylometry).toBeDefined();
      expect(validStyles).toContain(template.stylometry);
    });

    it.each(templateEntries)(
      '%s has CSI predicates defined',
      (name, template) => {
        expect(template.csiPredicates).toBeDefined();
        expect(template.csiPredicates).toBeInstanceOf(Array);
        expect(template.csiPredicates.length).toBeGreaterThan(0);
        template.csiPredicates.forEach((predicate) => {
          expect(typeof predicate).toBe('string');
          expect(predicate.length).toBeGreaterThan(0);
        });
      }
    );
  });

  describe('Template selection confidence scoring', () => {
    it('should return higher confidence when website type matches template default', () => {
      const result = selectTemplate({
        websiteType: 'ECOMMERCE',
        queryIntent: 'transactional',
        queryType: 'product',
        topicType: 'core',
        topicClass: 'monetization',
      });

      // Website type match + transactional intent should give good confidence
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    it('should include reasoning explaining the selection', () => {
      const result = selectTemplate({
        websiteType: 'HEALTHCARE',
        queryIntent: 'informational',
        queryType: 'definitional',
        topicType: 'core',
        topicClass: 'informational',
      });

      expect(result.reasoning.length).toBeGreaterThan(0);
      // Should mention the website type in reasoning
      const hasWebsiteTypeReason = result.reasoning.some((r) =>
        r.toLowerCase().includes('healthcare')
      );
      expect(hasWebsiteTypeReason).toBe(true);
    });

    it('should provide alternatives when available', () => {
      const result = selectTemplate({
        websiteType: 'INFORMATIONAL',
        queryIntent: 'commercial',
        queryType: 'comparative',
        topicType: 'outer',
        topicClass: 'monetization',
      });

      // When query intent/type differs from website type default, should have alternatives
      expect(result.alternatives).toBeInstanceOf(Array);
    });
  });

  describe('Edge cases and fallbacks', () => {
    it('should handle unknown query types gracefully', () => {
      const result = selectTemplate({
        websiteType: 'INFORMATIONAL',
        queryIntent: 'informational',
        queryType: 'unknown-type',
        topicType: 'core',
        topicClass: 'informational',
      });

      // Should fall back to website type default
      expect(result.template.templateName).toBe('DEFINITIONAL');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle child topic types', () => {
      const result = selectTemplate({
        websiteType: 'EDUCATION',
        queryIntent: 'informational',
        queryType: 'definitional',
        topicType: 'child',
        topicClass: 'informational',
      });

      expect(result.template).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should handle competitor analysis input', () => {
      const result = selectTemplate({
        websiteType: 'SAAS',
        queryIntent: 'commercial',
        queryType: 'comparison',
        topicType: 'outer',
        topicClass: 'monetization',
        competitorAnalysis: {
          dominantFormat: 'comparison-table',
          avgSectionCount: 8,
          avgWordCount: 2500,
        },
      });

      expect(result.template).toBeDefined();
      // Should mention competitor analysis in reasoning
      const hasCompetitorReason = result.reasoning.some((r) =>
        r.toLowerCase().includes('competitor')
      );
      expect(hasCompetitorReason).toBe(true);
    });

    it('should handle navigational intent', () => {
      const result = selectTemplate({
        websiteType: 'DIRECTORY',
        queryIntent: 'navigational',
        queryType: 'list',
        topicType: 'core',
        topicClass: 'informational',
      });

      expect(result.template).toBeDefined();
      expect(result.template.templateName).toBe('LISTING_DIRECTORY');
    });
  });

  describe('Template helper functions', () => {
    it('getTemplateByName returns correct template for all template names', () => {
      const templateNames = Object.keys(CONTENT_TEMPLATES);

      templateNames.forEach((name) => {
        const template = getTemplateByName(name as any);
        expect(template).toBeDefined();
        expect(template?.templateName).toBe(name);
      });
    });

    it('getTemplateByName returns undefined for invalid name', () => {
      const template = getTemplateByName('INVALID_TEMPLATE' as any);
      expect(template).toBeUndefined();
    });

    it('getTemplateForWebsiteType returns template for all website types', () => {
      ALL_WEBSITE_TYPES.forEach((websiteType) => {
        const template = getTemplateForWebsiteType(websiteType);
        expect(template).toBeDefined();
        expect(template.templateName).toBeDefined();
        expect(template.sectionStructure.length).toBeGreaterThan(0);
      });
    });
  });
});
