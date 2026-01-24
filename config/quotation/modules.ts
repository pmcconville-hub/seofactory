/**
 * Service Module Catalog
 *
 * Defines all available SEO services with pricing, deliverables, and KPI contributions.
 * These are used to seed the database and as fallback when DB is unavailable.
 */

import { ServiceModule, ServiceCategory, KpiContribution } from '../../types/quotation';

// =============================================================================
// Helper Types
// =============================================================================

type ModuleDefinition = Omit<ServiceModule, 'id'> & { id: string };

// =============================================================================
// KPI Contribution Presets
// =============================================================================

const KPI_TRAFFIC_HIGH: KpiContribution = {
  metric: 'organic_traffic',
  impactMin: 20,
  impactMax: 50,
  timeframeMonths: 6,
  confidence: 0.7,
};

const KPI_TRAFFIC_MEDIUM: KpiContribution = {
  metric: 'organic_traffic',
  impactMin: 10,
  impactMax: 25,
  timeframeMonths: 6,
  confidence: 0.6,
};

const KPI_KEYWORDS_HIGH: KpiContribution = {
  metric: 'keywords_top_10',
  impactMin: 50,
  impactMax: 150,
  timeframeMonths: 6,
  confidence: 0.65,
};

const KPI_KEYWORDS_MEDIUM: KpiContribution = {
  metric: 'keywords_top_10',
  impactMin: 20,
  impactMax: 60,
  timeframeMonths: 6,
  confidence: 0.6,
};

const KPI_AUTHORITY: KpiContribution = {
  metric: 'domain_authority',
  impactMin: 3,
  impactMax: 8,
  timeframeMonths: 12,
  confidence: 0.5,
};

const KPI_CONVERSIONS: KpiContribution = {
  metric: 'conversion_rate',
  impactMin: 0.5,
  impactMax: 2,
  timeframeMonths: 6,
  confidence: 0.5,
};

const KPI_LOCAL_VISIBILITY: KpiContribution = {
  metric: 'local_pack_appearances',
  impactMin: 5,
  impactMax: 20,
  timeframeMonths: 3,
  confidence: 0.7,
};

// =============================================================================
// Semantic SEO Modules
// =============================================================================

const SEMANTIC_SEO_MODULES: ModuleDefinition[] = [
  {
    id: 'semantic_topical_map',
    category: 'semantic_seo',
    name: 'Topical Map Development',
    description: 'Comprehensive topical map with entity strategy, hub-spoke architecture, and content hierarchy',
    basePriceMin: 1500,
    basePriceMax: 3500,
    isRecurring: false,
    kpiContributions: [KPI_KEYWORDS_HIGH, KPI_TRAFFIC_MEDIUM],
    deliverables: [
      'Full topical map with 50-200 topics',
      'Entity relationship mapping',
      'Hub-spoke content architecture',
      'Semantic triple (EAV) documentation',
      'Content priority scoring',
    ],
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'semantic_entity_strategy',
    category: 'semantic_seo',
    name: 'Entity Optimization Strategy',
    description: 'Entity-first SEO strategy with Wikidata alignment and knowledge graph optimization',
    basePriceMin: 800,
    basePriceMax: 1800,
    isRecurring: false,
    kpiContributions: [KPI_KEYWORDS_MEDIUM],
    deliverables: [
      'Entity inventory and audit',
      'Wikidata/Knowledge Graph alignment',
      'Entity disambiguation strategy',
      'Schema.org implementation plan',
    ],
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'semantic_eav_optimization',
    category: 'semantic_seo',
    name: 'EAV Content Optimization',
    description: 'Entity-Attribute-Value optimization for existing content',
    basePriceMin: 600,
    basePriceMax: 1200,
    isRecurring: false,
    kpiContributions: [KPI_TRAFFIC_MEDIUM],
    deliverables: [
      'EAV audit of existing content',
      'Attribute gap analysis',
      'Contextual bridge recommendations',
      'Implementation guidelines',
    ],
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'semantic_contextual_bridging',
    category: 'semantic_seo',
    name: 'Contextual Bridging Strategy',
    description: 'Internal linking and content flow optimization using semantic relationships',
    basePriceMin: 500,
    basePriceMax: 1000,
    isRecurring: false,
    kpiContributions: [KPI_TRAFFIC_MEDIUM],
    deliverables: [
      'Internal link audit',
      'Contextual bridge mapping',
      'Link equity distribution plan',
      'Anchor text optimization',
    ],
    displayOrder: 4,
    isActive: true,
  },
];

// =============================================================================
// Traditional SEO Modules
// =============================================================================

const TRADITIONAL_SEO_MODULES: ModuleDefinition[] = [
  {
    id: 'tech_audit_comprehensive',
    category: 'traditional_seo',
    name: 'Comprehensive Technical Audit',
    description: 'Full technical SEO audit covering crawlability, indexability, and Core Web Vitals',
    basePriceMin: 1200,
    basePriceMax: 2500,
    isRecurring: false,
    kpiContributions: [KPI_TRAFFIC_MEDIUM],
    deliverables: [
      'Full site crawl analysis',
      'Core Web Vitals assessment',
      'Mobile usability audit',
      'JavaScript rendering analysis',
      'Prioritized fix list',
    ],
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'tech_audit_basic',
    category: 'traditional_seo',
    name: 'Basic Technical Audit',
    description: 'Essential technical SEO checkup for small sites',
    basePriceMin: 400,
    basePriceMax: 800,
    isRecurring: false,
    kpiContributions: [],
    deliverables: [
      'Site crawl (up to 500 pages)',
      'Critical issues report',
      'Quick wins checklist',
    ],
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'tech_cwv_optimization',
    category: 'traditional_seo',
    name: 'Core Web Vitals Optimization',
    description: 'Performance optimization for LCP, FID/INP, and CLS',
    basePriceMin: 800,
    basePriceMax: 2000,
    isRecurring: false,
    kpiContributions: [KPI_CONVERSIONS],
    deliverables: [
      'Performance baseline report',
      'Optimization recommendations',
      'Implementation support',
      'Post-optimization verification',
    ],
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'tech_onpage_optimization',
    category: 'traditional_seo',
    name: 'On-Page SEO Optimization',
    description: 'Title tags, meta descriptions, headers, and content optimization',
    basePriceMin: 500,
    basePriceMax: 1500,
    isRecurring: false,
    kpiContributions: [KPI_TRAFFIC_MEDIUM, KPI_KEYWORDS_MEDIUM],
    deliverables: [
      'On-page audit report',
      'Optimized title/meta templates',
      'Header structure recommendations',
      'Content optimization guidelines',
    ],
    displayOrder: 4,
    isActive: true,
  },
  {
    id: 'tech_schema_implementation',
    category: 'traditional_seo',
    name: 'Schema Markup Implementation',
    description: 'JSON-LD structured data for rich snippets and enhanced SERP presence',
    basePriceMin: 600,
    basePriceMax: 1500,
    isRecurring: false,
    kpiContributions: [KPI_TRAFFIC_MEDIUM],
    deliverables: [
      'Schema audit and strategy',
      'JSON-LD templates',
      'Implementation support',
      'Validation and testing',
    ],
    displayOrder: 5,
    isActive: true,
  },
  {
    id: 'tech_site_architecture',
    category: 'traditional_seo',
    name: 'Site Architecture Review',
    description: 'URL structure, navigation, and crawl depth optimization',
    basePriceMin: 700,
    basePriceMax: 1500,
    isRecurring: false,
    kpiContributions: [KPI_TRAFFIC_MEDIUM],
    deliverables: [
      'Site structure analysis',
      'URL optimization recommendations',
      'Navigation improvements',
      'XML sitemap optimization',
    ],
    displayOrder: 6,
    isActive: true,
  },
];

// =============================================================================
// Content Modules
// =============================================================================

const CONTENT_MODULES: ModuleDefinition[] = [
  {
    id: 'content_strategy',
    category: 'content',
    name: 'Content Strategy Development',
    description: 'Data-driven content strategy aligned with business goals and search demand',
    basePriceMin: 1200,
    basePriceMax: 2500,
    isRecurring: false,
    kpiContributions: [KPI_TRAFFIC_HIGH, KPI_KEYWORDS_HIGH],
    deliverables: [
      'Content gap analysis',
      'Editorial calendar (12 months)',
      'Content type recommendations',
      'Competitor content analysis',
    ],
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'content_briefs_4',
    category: 'content',
    name: 'Content Briefs (4 Articles)',
    description: 'Detailed content briefs with semantic optimization guidelines',
    basePriceMin: 400,
    basePriceMax: 800,
    isRecurring: false,
    kpiContributions: [],
    deliverables: [
      '4 comprehensive content briefs',
      'Target keywords and entities',
      'Structural guidelines',
      'Competitor comparison',
    ],
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'content_articles_4',
    category: 'content',
    name: 'Article Writing (4 Articles)',
    description: 'SEO-optimized articles (1500-2500 words each)',
    basePriceMin: 1200,
    basePriceMax: 2400,
    isRecurring: false,
    kpiContributions: [KPI_TRAFFIC_MEDIUM, KPI_KEYWORDS_MEDIUM],
    deliverables: [
      '4 SEO-optimized articles',
      '1500-2500 words each',
      'Internal linking',
      'Schema markup',
    ],
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'content_articles_8',
    category: 'content',
    name: 'Article Writing (8 Articles)',
    description: 'SEO-optimized articles (1500-2500 words each)',
    basePriceMin: 2200,
    basePriceMax: 4400,
    isRecurring: false,
    kpiContributions: [KPI_TRAFFIC_HIGH, KPI_KEYWORDS_HIGH],
    deliverables: [
      '8 SEO-optimized articles',
      '1500-2500 words each',
      'Internal linking',
      'Schema markup',
    ],
    displayOrder: 4,
    isActive: true,
  },
  {
    id: 'content_refresh',
    category: 'content',
    name: 'Content Refresh Package',
    description: 'Update and optimize existing content for better performance',
    basePriceMin: 800,
    basePriceMax: 1600,
    isRecurring: false,
    kpiContributions: [KPI_TRAFFIC_MEDIUM],
    deliverables: [
      'Content audit (up to 20 pages)',
      'Update recommendations',
      'Freshness signals',
      'Re-optimization',
    ],
    displayOrder: 5,
    isActive: true,
  },
];

// =============================================================================
// Off-Site Modules
// =============================================================================

const OFFSITE_MODULES: ModuleDefinition[] = [
  {
    id: 'offsite_link_building',
    category: 'offsite',
    name: 'Link Building Campaign',
    description: 'Outreach-based link acquisition from relevant, authoritative sites',
    basePriceMin: 1500,
    basePriceMax: 4000,
    isRecurring: true,
    recurringInterval: 'monthly',
    kpiContributions: [KPI_AUTHORITY, KPI_TRAFFIC_MEDIUM],
    deliverables: [
      '5-15 quality backlinks/month',
      'Outreach tracking report',
      'Link quality metrics',
      'Anchor text diversity',
    ],
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'offsite_digital_pr',
    category: 'offsite',
    name: 'Digital PR Campaign',
    description: 'PR-driven link acquisition through newsworthy content',
    basePriceMin: 2000,
    basePriceMax: 5000,
    isRecurring: false,
    kpiContributions: [KPI_AUTHORITY, KPI_TRAFFIC_HIGH],
    deliverables: [
      'PR-worthy content creation',
      'Journalist outreach',
      'Press release distribution',
      'Coverage tracking',
    ],
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'offsite_guest_posts',
    category: 'offsite',
    name: 'Guest Posting Package',
    description: 'Guest articles on relevant industry publications',
    basePriceMin: 800,
    basePriceMax: 2000,
    isRecurring: false,
    kpiContributions: [KPI_AUTHORITY],
    deliverables: [
      '3-5 guest posts',
      'Topic ideation',
      'Writing and placement',
      'Link tracking',
    ],
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'offsite_citations',
    category: 'offsite',
    name: 'Citation Building',
    description: 'Business directory and citation cleanup/building',
    basePriceMin: 300,
    basePriceMax: 600,
    isRecurring: false,
    kpiContributions: [KPI_LOCAL_VISIBILITY],
    deliverables: [
      'Citation audit',
      '30-50 citations built/cleaned',
      'NAP consistency',
      'Verification support',
    ],
    displayOrder: 4,
    isActive: true,
  },
];

// =============================================================================
// Paid Advertising Modules
// =============================================================================

const PAID_ADS_MODULES: ModuleDefinition[] = [
  {
    id: 'paid_google_ads_setup',
    category: 'paid_ads',
    name: 'Google Ads Setup',
    description: 'Campaign setup and structure for search and display advertising',
    basePriceMin: 800,
    basePriceMax: 2000,
    isRecurring: false,
    kpiContributions: [],
    deliverables: [
      'Account structure setup',
      'Keyword research',
      'Ad copy creation',
      'Conversion tracking',
    ],
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'paid_google_ads_management',
    category: 'paid_ads',
    name: 'Google Ads Management',
    description: 'Ongoing campaign optimization and management',
    basePriceMin: 500,
    basePriceMax: 1500,
    isRecurring: true,
    recurringInterval: 'monthly',
    kpiContributions: [KPI_CONVERSIONS],
    deliverables: [
      'Bid optimization',
      'A/B testing',
      'Negative keyword management',
      'Monthly reporting',
    ],
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'paid_social_ads',
    category: 'paid_ads',
    name: 'Social Ads Management',
    description: 'Facebook/Instagram/LinkedIn advertising management',
    basePriceMin: 600,
    basePriceMax: 1500,
    isRecurring: true,
    recurringInterval: 'monthly',
    kpiContributions: [KPI_CONVERSIONS],
    deliverables: [
      'Campaign setup and management',
      'Audience targeting',
      'Creative optimization',
      'Performance reporting',
    ],
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'paid_remarketing',
    category: 'paid_ads',
    name: 'Remarketing Setup',
    description: 'Retargeting campaign setup across platforms',
    basePriceMin: 400,
    basePriceMax: 900,
    isRecurring: false,
    kpiContributions: [KPI_CONVERSIONS],
    deliverables: [
      'Audience list creation',
      'Pixel implementation',
      'Campaign structure',
      'Creative development',
    ],
    displayOrder: 4,
    isActive: true,
  },
];

// =============================================================================
// AI/LLM Optimization Modules
// =============================================================================

const AI_LLM_MODULES: ModuleDefinition[] = [
  {
    id: 'ai_mention_strategy',
    category: 'ai_llm',
    name: 'AI Mention Strategy',
    description: 'Optimize content for AI model citations and recommendations',
    basePriceMin: 1000,
    basePriceMax: 2500,
    isRecurring: false,
    kpiContributions: [],
    deliverables: [
      'AI mention audit',
      'Content optimization guidelines',
      'Entity clarity improvements',
      'Fact verification strategy',
    ],
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'ai_content_optimization',
    category: 'ai_llm',
    name: 'AI-Friendly Content Optimization',
    description: 'Structure content for better AI understanding and citation',
    basePriceMin: 600,
    basePriceMax: 1200,
    isRecurring: false,
    kpiContributions: [],
    deliverables: [
      'Content clarity audit',
      'Statement structure optimization',
      'Source attribution improvements',
      'FAQ schema optimization',
    ],
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'ai_monitoring',
    category: 'ai_llm',
    name: 'AI Mention Monitoring',
    description: 'Track brand mentions across AI platforms',
    basePriceMin: 200,
    basePriceMax: 500,
    isRecurring: true,
    recurringInterval: 'monthly',
    kpiContributions: [],
    deliverables: [
      'Monthly AI mention report',
      'Competitor comparison',
      'Sentiment analysis',
      'Trend tracking',
    ],
    displayOrder: 3,
    isActive: true,
  },
];

// =============================================================================
// Local SEO Modules
// =============================================================================

const LOCAL_SEO_MODULES: ModuleDefinition[] = [
  {
    id: 'local_gbp_optimization',
    category: 'local_seo',
    name: 'Google Business Profile Optimization',
    description: 'Complete GBP setup and optimization for local visibility',
    basePriceMin: 400,
    basePriceMax: 800,
    isRecurring: false,
    kpiContributions: [KPI_LOCAL_VISIBILITY],
    deliverables: [
      'Profile optimization',
      'Category selection',
      'Photo optimization',
      'Q&A management setup',
    ],
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'local_citation_management',
    category: 'local_seo',
    name: 'Local Citation Management',
    description: 'Build and maintain consistent local citations',
    basePriceMin: 300,
    basePriceMax: 600,
    isRecurring: false,
    kpiContributions: [KPI_LOCAL_VISIBILITY],
    deliverables: [
      '30-50 citations',
      'NAP audit and cleanup',
      'Ongoing monitoring',
    ],
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'local_review_management',
    category: 'local_seo',
    name: 'Review Management Setup',
    description: 'Review acquisition and response strategy',
    basePriceMin: 300,
    basePriceMax: 600,
    isRecurring: false,
    kpiContributions: [KPI_LOCAL_VISIBILITY, KPI_CONVERSIONS],
    deliverables: [
      'Review acquisition strategy',
      'Response templates',
      'Monitoring setup',
      'Negative review playbook',
    ],
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'local_content_creation',
    category: 'local_seo',
    name: 'Local Content Creation',
    description: 'Location-specific content for local search visibility',
    basePriceMin: 500,
    basePriceMax: 1200,
    isRecurring: false,
    kpiContributions: [KPI_LOCAL_VISIBILITY, KPI_TRAFFIC_MEDIUM],
    deliverables: [
      'Location pages',
      'Service area content',
      'Local landing pages',
      'Community content',
    ],
    displayOrder: 4,
    isActive: true,
  },
];

// =============================================================================
// Retainer Modules
// =============================================================================

const RETAINER_MODULES: ModuleDefinition[] = [
  {
    id: 'retainer_monitoring',
    category: 'retainers',
    name: 'SEO Monitoring',
    description: 'Ongoing monitoring and monthly reporting',
    basePriceMin: 300,
    basePriceMax: 600,
    isRecurring: true,
    recurringInterval: 'monthly',
    kpiContributions: [],
    deliverables: [
      'Weekly rank tracking',
      'Monthly performance report',
      'Alert notifications',
      'Competitor tracking',
    ],
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'retainer_optimization',
    category: 'retainers',
    name: 'Monthly Optimization',
    description: 'Ongoing SEO maintenance and optimization',
    basePriceMin: 800,
    basePriceMax: 2000,
    isRecurring: true,
    recurringInterval: 'monthly',
    kpiContributions: [KPI_TRAFFIC_MEDIUM, KPI_KEYWORDS_MEDIUM],
    deliverables: [
      'Technical monitoring',
      'Content updates',
      'Link maintenance',
      '4 hours optimization work',
    ],
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'retainer_support',
    category: 'retainers',
    name: 'Support Hours',
    description: 'Dedicated support hours for ad-hoc SEO needs',
    basePriceMin: 500,
    basePriceMax: 1000,
    isRecurring: true,
    recurringInterval: 'monthly',
    kpiContributions: [],
    deliverables: [
      '5 hours support/month',
      'Priority response',
      'Strategy calls',
      'Ad-hoc analysis',
    ],
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'retainer_full',
    category: 'retainers',
    name: 'Full Service Retainer',
    description: 'Comprehensive ongoing SEO management',
    basePriceMin: 2500,
    basePriceMax: 6000,
    isRecurring: true,
    recurringInterval: 'monthly',
    kpiContributions: [KPI_TRAFFIC_HIGH, KPI_KEYWORDS_HIGH, KPI_AUTHORITY],
    deliverables: [
      'All monitoring and reporting',
      '2 articles/month',
      'Link building',
      'Technical maintenance',
      'Strategy sessions',
      '10 hours support',
    ],
    displayOrder: 4,
    isActive: true,
  },
];

// =============================================================================
// Combined Module Catalog
// =============================================================================

export const SERVICE_MODULES: ModuleDefinition[] = [
  ...SEMANTIC_SEO_MODULES,
  ...TRADITIONAL_SEO_MODULES,
  ...CONTENT_MODULES,
  ...OFFSITE_MODULES,
  ...PAID_ADS_MODULES,
  ...AI_LLM_MODULES,
  ...LOCAL_SEO_MODULES,
  ...RETAINER_MODULES,
];

/**
 * Get modules by category
 */
export function getModulesByCategory(category: ServiceCategory): ModuleDefinition[] {
  return SERVICE_MODULES.filter((m) => m.category === category);
}

/**
 * Get module by ID
 */
export function getModuleById(id: string): ModuleDefinition | undefined {
  return SERVICE_MODULES.find((m) => m.id === id);
}

/**
 * Get all active modules
 */
export function getActiveModules(): ModuleDefinition[] {
  return SERVICE_MODULES.filter((m) => m.isActive);
}

/**
 * Category display names and order
 */
export const CATEGORY_INFO: Record<ServiceCategory, { name: string; description: string; order: number }> = {
  semantic_seo: {
    name: 'Semantic SEO',
    description: 'Topical authority, entity optimization, and contextual relevance',
    order: 1,
  },
  traditional_seo: {
    name: 'Technical SEO',
    description: 'Technical audits, on-page optimization, and site structure',
    order: 2,
  },
  content: {
    name: 'Content',
    description: 'Strategy, creation, and optimization',
    order: 3,
  },
  offsite: {
    name: 'Off-Site SEO',
    description: 'Link building, digital PR, and citations',
    order: 4,
  },
  paid_ads: {
    name: 'Paid Advertising',
    description: 'Google Ads, social advertising, and remarketing',
    order: 5,
  },
  ai_llm: {
    name: 'AI Optimization',
    description: 'Optimize for AI citations and mentions',
    order: 6,
  },
  local_seo: {
    name: 'Local SEO',
    description: 'Google Business Profile, citations, and local content',
    order: 7,
  },
  retainers: {
    name: 'Retainers',
    description: 'Ongoing monitoring, optimization, and support',
    order: 8,
  },
};
