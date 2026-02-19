/**
 * Page Type Template Service
 *
 * Defines 6 page-type templates (homepage, service-hub, service-spoke,
 * region-page, knowledge-hub, knowledge-article) and provides utility
 * methods for template lookup, auto-detection, zone ordering, and
 * validation.
 *
 * Each template specifies:
 * - Zone ordering (which semantic zones appear and in what order)
 * - LIFT ordering (strategic content flow)
 * - Required and optional components per zone
 * - Publication checklist
 * - Schema types
 */

import {
  PageType,
  PageTypeTemplate,
  SemanticZone,
  PageZoneDefinition,
} from './layout-engine/types';

// =============================================================================
// TEMPLATE DEFINITIONS
// =============================================================================

const HOMEPAGE_TEMPLATE: PageTypeTemplate = {
  pageType: 'homepage',
  label: 'Homepage',
  description:
    'The foundation page that establishes brand identity, communicates core value propositions, and routes visitors to key service and knowledge areas.',
  websiteTypes: ['all'],
  zoneOrder: [
    { zone: 'BOILERPLATE', label: 'Header / Navigation', description: 'Site-wide header, navigation bar, and brand logo', order: 0, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'TITLE', label: 'Page Title', description: 'H1 headline with primary value proposition', order: 1, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'CENTERPIECE', label: 'Hero Centerpiece', description: 'Primary visual and messaging block that captures the central entity', order: 2, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'CTA', label: 'Primary CTA', description: 'Main call-to-action after hero section', order: 3, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'MAIN', label: 'Services Overview', description: 'Overview of core services or product categories', order: 4, minSections: 1, maxSections: 6, requiredForPageType: true },
    { zone: 'TRUST', label: 'Trust Signals', description: 'Testimonials, certifications, client logos, case study highlights', order: 5, minSections: 1, maxSections: 3, requiredForPageType: true },
    { zone: 'BRIDGE', label: 'Knowledge Bridge', description: 'Connection to knowledge hub or blog content', order: 6, minSections: 0, maxSections: 2, requiredForPageType: false },
    { zone: 'CTA', label: 'Secondary CTA', description: 'Closing call-to-action before footer', order: 7, minSections: 0, maxSections: 1, requiredForPageType: false },
    { zone: 'BOILERPLATE', label: 'Footer', description: 'Site-wide footer with links, legal, and contact info', order: 8, minSections: 1, maxSections: 1, requiredForPageType: true },
  ],
  liftOrdering: ['Lead', 'Impact', 'Trust', 'Route'],
  requiredComponents: {
    CENTERPIECE: ['hero'],
    CTA: ['cta-banner'],
    TRUST: ['testimonial-card'],
  },
  optionalComponents: {
    MAIN: ['feature-grid', 'card', 'prose'],
    BRIDGE: ['card', 'prose'],
    TRUST: ['stat-highlight'],
  },
  publicationChecklist: [
    'H1 contains central entity and primary value proposition',
    'Hero section has clear visual hierarchy',
    'Primary CTA is above the fold',
    'Services overview links to all service hub pages',
    'Trust signals include at least one testimonial or certification',
    'Knowledge bridge links to top-performing articles',
    'Organization schema is present and complete',
    'Page load time is under 2.5 seconds (LCP)',
  ],
  schemaTypes: ['Organization'],
};

const SERVICE_HUB_TEMPLATE: PageTypeTemplate = {
  pageType: 'service-hub',
  label: 'Service Hub',
  description:
    'A pillar page that serves as the central hub for a service category, linking to all related service spoke pages and establishing topical authority.',
  websiteTypes: ['all'],
  zoneOrder: [
    { zone: 'BOILERPLATE', label: 'Header / Navigation', description: 'Site-wide header with service category breadcrumb', order: 0, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'TITLE', label: 'Service Category Title', description: 'H1 defining the service category', order: 1, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'CENTERPIECE', label: 'Service Introduction', description: 'Overview of the service category with core value proposition', order: 2, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'MAIN', label: 'Service Details & TOC', description: 'Table of contents and detailed service descriptions linking to spokes', order: 3, minSections: 2, maxSections: 10, requiredForPageType: true },
    { zone: 'TRUST', label: 'Proof & Credentials', description: 'Case studies, certifications, or expertise indicators', order: 4, minSections: 1, maxSections: 3, requiredForPageType: true },
    { zone: 'CTA', label: 'Service CTA', description: 'Call-to-action for consultation or quote', order: 5, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'BOILERPLATE', label: 'Footer', description: 'Site-wide footer', order: 6, minSections: 1, maxSections: 1, requiredForPageType: true },
  ],
  liftOrdering: ['Lead', 'Impact', 'Features', 'Trust'],
  requiredComponents: {
    CENTERPIECE: ['hero', 'lead-paragraph'],
    MAIN: ['prose', 'feature-grid'],
  },
  optionalComponents: {
    MAIN: ['accordion', 'card', 'step-list'],
    TRUST: ['testimonial-card', 'stat-highlight'],
    CTA: ['cta-banner'],
  },
  publicationChecklist: [
    'H1 includes service category keyword',
    'Centerpiece explains the service scope and audience',
    'TOC links to all service spoke pages',
    'Each service spoke has a clear summary and link',
    'Trust section includes relevant case studies or credentials',
    'CTA is specific to the service category',
    'Article + Service schema types are present',
    'Internal links follow hub-spoke structure',
  ],
  schemaTypes: ['Article', 'Service'],
};

const SERVICE_SPOKE_TEMPLATE: PageTypeTemplate = {
  pageType: 'service-spoke',
  label: 'Service Spoke',
  description:
    'A detailed page covering a specific service within a service category, linking back to the hub and to related services via bridge sections.',
  websiteTypes: ['all'],
  zoneOrder: [
    { zone: 'BOILERPLATE', label: 'Header / Navigation', description: 'Site-wide header with service breadcrumb', order: 0, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'TITLE', label: 'Service Title', description: 'H1 with specific service name', order: 1, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'CENTERPIECE', label: 'Service Introduction', description: 'Concise introduction explaining what the service is and who it is for', order: 2, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'MAIN', label: 'Service Content', description: 'Detailed service description, process, benefits, and specifications', order: 3, minSections: 2, maxSections: 8, requiredForPageType: true },
    { zone: 'BRIDGE', label: 'Related Services Bridge', description: 'Contextual links to related service spokes or the hub', order: 4, minSections: 0, maxSections: 2, requiredForPageType: false },
    { zone: 'SUPPLEMENTARY', label: 'FAQ & Additional Info', description: 'FAQ, pricing details, or additional specifications', order: 5, minSections: 0, maxSections: 3, requiredForPageType: false },
    { zone: 'BOILERPLATE', label: 'Footer', description: 'Site-wide footer', order: 6, minSections: 1, maxSections: 1, requiredForPageType: true },
  ],
  liftOrdering: ['Lead', 'Features', 'Impact', 'Trust', 'Bridge'],
  requiredComponents: {
    CENTERPIECE: ['lead-paragraph'],
    MAIN: ['prose'],
  },
  optionalComponents: {
    MAIN: ['step-list', 'comparison-table', 'feature-grid', 'checklist'],
    BRIDGE: ['card', 'prose'],
    SUPPLEMENTARY: ['faq-accordion', 'info-box', 'definition-box'],
  },
  publicationChecklist: [
    'H1 is specific to the service (not the category)',
    'Centerpiece defines the service and target audience',
    'Main content covers process, benefits, and differentiators',
    'Bridge section links back to hub and to related spokes',
    'FAQ covers common questions about this service',
    'Article + Service schema types are present',
    'Breadcrumb links to parent hub page',
  ],
  schemaTypes: ['Article', 'Service'],
};

const REGION_PAGE_TEMPLATE: PageTypeTemplate = {
  pageType: 'region-page',
  label: 'Region Page',
  description:
    'A locally-focused page that targets a geographic area, combining local service information with trust signals from the local team and region-specific CTAs.',
  websiteTypes: ['all'],
  zoneOrder: [
    { zone: 'BOILERPLATE', label: 'Header / Navigation', description: 'Site-wide header with location breadcrumb', order: 0, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'TITLE', label: 'Region Title', description: 'H1 with region + service keyword', order: 1, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'CENTERPIECE', label: 'Local Introduction', description: 'Introduction connecting the service to the local region', order: 2, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'MAIN', label: 'Local Service Content', description: 'Region-specific service details, local expertise, area coverage', order: 3, minSections: 1, maxSections: 6, requiredForPageType: true },
    { zone: 'TRUST', label: 'Local Team & Reviews', description: 'Local team profiles, region-specific testimonials, and local credentials', order: 4, minSections: 1, maxSections: 3, requiredForPageType: true },
    { zone: 'CTA', label: 'Local CTA', description: 'Region-specific call-to-action (e.g., local phone number, office address)', order: 5, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'SUPPLEMENTARY', label: 'Other Regions', description: 'Links to other regional pages for cross-linking', order: 6, minSections: 0, maxSections: 2, requiredForPageType: false },
    { zone: 'BOILERPLATE', label: 'Footer', description: 'Site-wide footer', order: 7, minSections: 1, maxSections: 1, requiredForPageType: true },
  ],
  liftOrdering: ['Lead', 'Local', 'Trust', 'CTA'],
  requiredComponents: {
    CENTERPIECE: ['lead-paragraph'],
    TRUST: ['testimonial-card'],
    CTA: ['cta-banner'],
  },
  optionalComponents: {
    MAIN: ['prose', 'feature-grid', 'card'],
    TRUST: ['stat-highlight'],
    SUPPLEMENTARY: ['card'],
  },
  publicationChecklist: [
    'H1 includes region name and primary service keyword',
    'Centerpiece mentions specific local context',
    'Main content includes region-specific details (not generic)',
    'Trust section features local team or local testimonials',
    'CTA includes local contact information',
    'Other regions section links to sibling pages',
    'LocalBusiness + Article schema types are present',
    'NAP (Name, Address, Phone) consistency verified',
  ],
  schemaTypes: ['LocalBusiness', 'Article'],
};

const KNOWLEDGE_HUB_TEMPLATE: PageTypeTemplate = {
  pageType: 'knowledge-hub',
  label: 'Knowledge Hub',
  description:
    'A pillar page for an informational topic cluster, establishing topical authority through comprehensive coverage and linking to individual knowledge articles.',
  websiteTypes: ['all'],
  zoneOrder: [
    { zone: 'BOILERPLATE', label: 'Header / Navigation', description: 'Site-wide header with knowledge category breadcrumb', order: 0, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'TITLE', label: 'Knowledge Topic Title', description: 'H1 defining the knowledge domain', order: 1, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'CENTERPIECE', label: 'Topic Definition', description: 'Comprehensive definition and scope of the knowledge domain', order: 2, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'TRUST', label: 'Author Authority', description: 'Author bio, expertise indicators, and editorial standards', order: 3, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'MAIN', label: 'Knowledge Overview & TOC', description: 'Table of contents and overview sections linking to knowledge articles', order: 4, minSections: 2, maxSections: 10, requiredForPageType: true },
    { zone: 'BRIDGE', label: 'Authority-to-Commercial Bridge', description: 'Contextual bridge from authority/knowledge content to commercial service pages', order: 5, minSections: 0, maxSections: 2, requiredForPageType: false },
    { zone: 'SUPPLEMENTARY', label: 'Resources & References', description: 'Additional resources, glossary, or external references', order: 6, minSections: 0, maxSections: 3, requiredForPageType: false },
    { zone: 'BOILERPLATE', label: 'Footer', description: 'Site-wide footer', order: 7, minSections: 1, maxSections: 1, requiredForPageType: true },
  ],
  liftOrdering: ['Definition', 'Expansion', 'Bridge'],
  requiredComponents: {
    CENTERPIECE: ['lead-paragraph', 'definition-box'],
    MAIN: ['prose'],
    TRUST: ['prose'],
  },
  optionalComponents: {
    MAIN: ['accordion', 'feature-grid', 'card', 'timeline'],
    BRIDGE: ['card', 'cta-banner'],
    SUPPLEMENTARY: ['info-box', 'checklist'],
  },
  publicationChecklist: [
    'H1 is a clear topic definition keyword',
    'Centerpiece provides a comprehensive definition',
    'Author authority section establishes E-E-A-T',
    'TOC links to all knowledge articles in the cluster',
    'Bridge section connects to relevant service pages',
    'Supplementary section provides additional references',
    'Article schema type is present with author markup',
    'Internal links follow hub-spoke structure for knowledge cluster',
  ],
  schemaTypes: ['Article'],
};

const KNOWLEDGE_ARTICLE_TEMPLATE: PageTypeTemplate = {
  pageType: 'knowledge-article',
  label: 'Knowledge Article',
  description:
    'An individual knowledge article that covers a specific topic in depth, linking back to the knowledge hub and to related articles.',
  websiteTypes: ['all'],
  zoneOrder: [
    { zone: 'BOILERPLATE', label: 'Header / Navigation', description: 'Site-wide header with topic breadcrumb', order: 0, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'TITLE', label: 'Article Title', description: 'H1 with specific topic keyword', order: 1, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'CENTERPIECE', label: 'Article Introduction', description: 'Lead paragraph establishing the topic scope and reader benefit', order: 2, minSections: 1, maxSections: 1, requiredForPageType: true },
    { zone: 'TRUST', label: 'Author Bio', description: 'Author credentials and publication date', order: 3, minSections: 0, maxSections: 1, requiredForPageType: false },
    { zone: 'MAIN', label: 'Article Body', description: 'Detailed article content with structured headings', order: 4, minSections: 2, maxSections: 15, requiredForPageType: true },
    { zone: 'BRIDGE', label: 'Related Topics Bridge', description: 'Contextual links to related knowledge articles or service pages', order: 5, minSections: 0, maxSections: 2, requiredForPageType: false },
    { zone: 'SUPPLEMENTARY', label: 'Related Articles', description: 'List of related articles from the same knowledge cluster', order: 6, minSections: 0, maxSections: 2, requiredForPageType: false },
    { zone: 'BOILERPLATE', label: 'Footer', description: 'Site-wide footer', order: 7, minSections: 1, maxSections: 1, requiredForPageType: true },
  ],
  liftOrdering: ['Definition', 'Detail', 'Bridge'],
  requiredComponents: {
    CENTERPIECE: ['lead-paragraph'],
    MAIN: ['prose'],
  },
  optionalComponents: {
    MAIN: ['accordion', 'comparison-table', 'step-list', 'definition-box', 'info-box', 'blockquote', 'key-takeaways'],
    TRUST: ['prose'],
    BRIDGE: ['card', 'prose'],
    SUPPLEMENTARY: ['card'],
  },
  publicationChecklist: [
    'H1 targets a specific long-tail keyword',
    'Centerpiece provides a clear topic definition',
    'Article body covers the topic comprehensively',
    'Bridge section links to related articles or services',
    'Related articles section links to sibling articles',
    'Article schema type is present with author markup',
    'Breadcrumb links to parent hub page',
    'Internal links include contextual anchor text',
  ],
  schemaTypes: ['Article'],
};

// =============================================================================
// TEMPLATE REGISTRY
// =============================================================================

const TEMPLATE_MAP: Record<PageType, PageTypeTemplate> = {
  'homepage': HOMEPAGE_TEMPLATE,
  'service-hub': SERVICE_HUB_TEMPLATE,
  'service-spoke': SERVICE_SPOKE_TEMPLATE,
  'region-page': REGION_PAGE_TEMPLATE,
  'knowledge-hub': KNOWLEDGE_HUB_TEMPLATE,
  'knowledge-article': KNOWLEDGE_ARTICLE_TEMPLATE,
};

// =============================================================================
// SERVICE METHODS
// =============================================================================

/**
 * Returns the template for a given page type.
 */
function getTemplateForPageType(pageType: PageType): PageTypeTemplate {
  const template = TEMPLATE_MAP[pageType];
  if (!template) {
    // Fallback to knowledge-article if an unknown page type is passed
    return TEMPLATE_MAP['knowledge-article'];
  }
  return template;
}

/**
 * Returns all available page type templates.
 */
function getAllTemplates(): PageTypeTemplate[] {
  return Object.values(TEMPLATE_MAP);
}

/**
 * Auto-detects the appropriate page type based on topic metadata and topical map context.
 *
 * Detection priority:
 * 1. Homepage: metadata.isFoundation && slug === '/'
 * 2. Region Page: type === 'core' && metadata.hasRegion
 * 3. Service Hub: type === 'core' && cluster_role === 'pillar'
 * 4. Service Spoke: type === 'core' (non-pillar)
 * 5. Knowledge Hub: type === 'outer' && cluster_role === 'pillar'
 * 6. Knowledge Article: type === 'outer' (default)
 * 7. Fallback: 'knowledge-article'
 */
function autoDetectPageType(
  topic: {
    type?: string;
    cluster_role?: string;
    metadata?: Record<string, unknown>;
  },
  _topicalMap?: { pillars?: unknown }
): PageType {
  const metadata = topic.metadata ?? {};
  const type = topic.type;
  const clusterRole = topic.cluster_role;

  // Homepage detection
  if (metadata.isFoundation && metadata.slug === '/') {
    return 'homepage';
  }

  // Core topics (service-oriented)
  if (type === 'core') {
    // Region page detection
    if (metadata.hasRegion) {
      return 'region-page';
    }
    // Pillar = hub, non-pillar = spoke
    if (clusterRole === 'pillar') {
      return 'service-hub';
    }
    return 'service-spoke';
  }

  // Outer topics (knowledge-oriented)
  if (type === 'outer') {
    if (clusterRole === 'pillar') {
      return 'knowledge-hub';
    }
    return 'knowledge-article';
  }

  // Fallback
  return 'knowledge-article';
}

/**
 * Returns the zone definitions for a given page type template.
 */
function getZonesForTemplate(pageType: PageType): PageZoneDefinition[] {
  const template = getTemplateForPageType(pageType);
  return template.zoneOrder;
}

/**
 * Returns the required component types for a specific zone within a page type.
 * Returns an empty array if there are no required components for the zone.
 */
function getRequiredComponentsForZone(pageType: PageType, zone: SemanticZone): string[] {
  const template = getTemplateForPageType(pageType);
  return template.requiredComponents[zone] ?? [];
}

/**
 * Returns the publication checklist for a page type.
 */
function getPublicationChecklist(pageType: PageType): string[] {
  const template = getTemplateForPageType(pageType);
  return template.publicationChecklist;
}

/**
 * Returns the LIFT ordering for a page type.
 */
function getLIFTOrdering(pageType: PageType): string[] {
  const template = getTemplateForPageType(pageType);
  return template.liftOrdering;
}

/**
 * Validates that a set of sections with zone assignments satisfies the
 * requirements of a page type template.
 *
 * Checks:
 * - All required zones are present
 * - Zone section counts are within min/max bounds
 */
function validateZoneAssignment(
  sections: Array<{ zone?: SemanticZone }>,
  pageType: PageType
): { valid: boolean; issues: string[] } {
  const template = getTemplateForPageType(pageType);
  const issues: string[] = [];

  // Count sections per zone
  const zoneCounts: Partial<Record<SemanticZone, number>> = {};
  for (const section of sections) {
    if (section.zone) {
      zoneCounts[section.zone] = (zoneCounts[section.zone] ?? 0) + 1;
    }
  }

  // Check each zone definition in the template
  for (const zoneDef of template.zoneOrder) {
    const count = zoneCounts[zoneDef.zone] ?? 0;

    // Check required zones are present
    if (zoneDef.requiredForPageType && count === 0) {
      issues.push(
        `Required zone "${zoneDef.zone}" (${zoneDef.label}) is missing for page type "${pageType}".`
      );
    }

    // Check minimum section count
    if (zoneDef.minSections !== undefined && count < zoneDef.minSections && count > 0) {
      issues.push(
        `Zone "${zoneDef.zone}" (${zoneDef.label}) has ${count} section(s) but requires at least ${zoneDef.minSections}.`
      );
    }

    // Check maximum section count
    if (zoneDef.maxSections !== undefined && count > zoneDef.maxSections) {
      issues.push(
        `Zone "${zoneDef.zone}" (${zoneDef.label}) has ${count} section(s) but allows at most ${zoneDef.maxSections}.`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// =============================================================================
// EXPORT
// =============================================================================

export const pageTypeTemplateService = {
  getTemplateForPageType,
  getAllTemplates,
  autoDetectPageType,
  getZonesForTemplate,
  getRequiredComponentsForZone,
  getPublicationChecklist,
  getLIFTOrdering,
  validateZoneAssignment,
};

export default pageTypeTemplateService;
