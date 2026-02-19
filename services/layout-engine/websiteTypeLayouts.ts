/**
 * Website Type Layouts
 *
 * Defines layout configurations for 17 website types from the Semantic SEO
 * framework. Each type specifies component ordering (LIFT model), heading
 * templates, and internal linking patterns.
 *
 * The LIFT model (Layout Intent Form Test) orders components by user intent
 * importance — the most critical content for the user's task appears first.
 *
 * @see services/layout-engine/ComponentSelector.ts — consumes these configs
 */

import type { ComponentType } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A single component role within a website type layout.
 * Each role maps to a preferred ComponentType and carries a LIFT priority
 * (1 = highest importance to the user's primary intent).
 */
export interface WebsiteTypeComponentRole {
  role: string;
  preferredComponent: ComponentType;
  headingStructure: string;
  visualRequirements: string[];
  liftPriority: number;
}

/**
 * Complete layout configuration for a website type.
 */
export interface WebsiteTypeLayout {
  type: string;
  componentOrder: WebsiteTypeComponentRole[];
  headingTemplate: string[];
  internalLinkingPattern: {
    primaryTargets: string[];
    linkDirection: 'to-core' | 'to-author' | 'bidirectional';
  };
  weightBonuses?: Record<string, number>;
}

// =============================================================================
// WEBSITE TYPE LAYOUT DEFINITIONS
// =============================================================================

export const WEBSITE_TYPE_LAYOUTS: Record<string, WebsiteTypeLayout> = {
  // =========================================================================
  // COMMERCIAL / TRANSACTIONAL
  // =========================================================================

  'e-commerce': {
    type: 'e-commerce',
    componentOrder: [
      {
        role: 'product-hero',
        preferredComponent: 'hero',
        headingStructure: 'H1: Product Name',
        visualRequirements: ['product-image', 'price-display', 'rating-stars'],
        liftPriority: 1,
      },
      {
        role: 'key-features',
        preferredComponent: 'feature-grid',
        headingStructure: 'H2: Key Features',
        visualRequirements: ['icon-list', 'feature-highlights'],
        liftPriority: 2,
      },
      {
        role: 'specifications',
        preferredComponent: 'comparison-table',
        headingStructure: 'H2: Specifications',
        visualRequirements: ['spec-table'],
        liftPriority: 3,
      },
      {
        role: 'reviews',
        preferredComponent: 'testimonial-card',
        headingStructure: 'H2: Customer Reviews',
        visualRequirements: ['star-rating', 'review-cards'],
        liftPriority: 4,
      },
      {
        role: 'comparison',
        preferredComponent: 'comparison-table',
        headingStructure: 'H2: Compare Products',
        visualRequirements: ['comparison-matrix'],
        liftPriority: 5,
      },
      {
        role: 'faq',
        preferredComponent: 'faq-accordion',
        headingStructure: 'H2: Frequently Asked Questions',
        visualRequirements: ['expandable-sections'],
        liftPriority: 6,
      },
      {
        role: 'related-products',
        preferredComponent: 'card',
        headingStructure: 'H2: Related Products',
        visualRequirements: ['product-cards', 'thumbnail-images'],
        liftPriority: 7,
      },
    ],
    headingTemplate: [
      'H1: {Product Name}',
      'H2: Key Features',
      'H2: Specifications',
      'H2: Customer Reviews',
      'H2: Compare with Similar Products',
      'H2: Frequently Asked Questions',
      'H2: Related Products',
    ],
    internalLinkingPattern: {
      primaryTargets: ['category-page', 'related-product', 'buying-guide'],
      linkDirection: 'bidirectional',
    },
    weightBonuses: {
      'product-hero': 2,
      'key-features': 1,
      reviews: 1,
    },
  },

  saas: {
    type: 'saas',
    componentOrder: [
      {
        role: 'value-proposition',
        preferredComponent: 'hero',
        headingStructure: 'H1: Product Headline + Value Prop',
        visualRequirements: ['hero-image', 'cta-button'],
        liftPriority: 1,
      },
      {
        role: 'benefits',
        preferredComponent: 'feature-grid',
        headingStructure: 'H2: Benefits',
        visualRequirements: ['benefit-icons', 'short-descriptions'],
        liftPriority: 2,
      },
      {
        role: 'use-cases',
        preferredComponent: 'card',
        headingStructure: 'H2: Use Cases',
        visualRequirements: ['scenario-cards', 'persona-tags'],
        liftPriority: 3,
      },
      {
        role: 'how-it-works',
        preferredComponent: 'step-list',
        headingStructure: 'H2: How It Works',
        visualRequirements: ['step-diagram', 'numbered-flow'],
        liftPriority: 4,
      },
      {
        role: 'pricing',
        preferredComponent: 'comparison-table',
        headingStructure: 'H2: Pricing',
        visualRequirements: ['pricing-tiers', 'feature-comparison'],
        liftPriority: 5,
      },
      {
        role: 'integrations',
        preferredComponent: 'feature-grid',
        headingStructure: 'H2: Integrations',
        visualRequirements: ['integration-logos', 'grid-layout'],
        liftPriority: 6,
      },
      {
        role: 'testimonials',
        preferredComponent: 'testimonial-card',
        headingStructure: 'H2: What Our Customers Say',
        visualRequirements: ['quote-cards', 'company-logos'],
        liftPriority: 7,
      },
      {
        role: 'cta',
        preferredComponent: 'cta-banner',
        headingStructure: 'H2: Get Started',
        visualRequirements: ['cta-button', 'trial-badge'],
        liftPriority: 8,
      },
    ],
    headingTemplate: [
      'H1: {Product Name} - {Value Proposition}',
      'H2: Benefits',
      'H2: Use Cases',
      'H2: How It Works',
      'H2: Pricing Plans',
      'H2: Integrations',
      'H2: Customer Testimonials',
      'H2: Get Started Today',
    ],
    internalLinkingPattern: {
      primaryTargets: ['feature-page', 'use-case', 'pricing', 'documentation'],
      linkDirection: 'bidirectional',
    },
    weightBonuses: {
      'value-proposition': 2,
      benefits: 1,
      pricing: 1,
    },
  },

  marketplace: {
    type: 'marketplace',
    componentOrder: [
      {
        role: 'category-browser',
        preferredComponent: 'feature-grid',
        headingStructure: 'H1: Browse {Category}',
        visualRequirements: ['category-tiles', 'icon-labels'],
        liftPriority: 1,
      },
      {
        role: 'featured-listings',
        preferredComponent: 'card',
        headingStructure: 'H2: Featured Listings',
        visualRequirements: ['listing-cards', 'thumbnail-images', 'price-tags'],
        liftPriority: 2,
      },
      {
        role: 'seller-profiles',
        preferredComponent: 'testimonial-card',
        headingStructure: 'H2: Top Sellers',
        visualRequirements: ['seller-avatar', 'rating-badge'],
        liftPriority: 3,
      },
      {
        role: 'trust-safety',
        preferredComponent: 'info-box',
        headingStructure: 'H2: Trust & Safety',
        visualRequirements: ['trust-badges', 'security-icons'],
        liftPriority: 4,
      },
      {
        role: 'how-it-works',
        preferredComponent: 'step-list',
        headingStructure: 'H2: How It Works',
        visualRequirements: ['numbered-steps'],
        liftPriority: 5,
      },
      {
        role: 'faq',
        preferredComponent: 'faq-accordion',
        headingStructure: 'H2: Frequently Asked Questions',
        visualRequirements: ['expandable-sections'],
        liftPriority: 6,
      },
    ],
    headingTemplate: [
      'H1: Browse {Category}',
      'H2: Featured Listings',
      'H2: Top Sellers',
      'H2: Trust & Safety',
      'H2: How It Works',
      'H2: Frequently Asked Questions',
    ],
    internalLinkingPattern: {
      primaryTargets: ['category-page', 'listing-page', 'seller-profile'],
      linkDirection: 'bidirectional',
    },
    weightBonuses: {
      'category-browser': 2,
      'featured-listings': 1,
    },
  },

  events: {
    type: 'events',
    componentOrder: [
      {
        role: 'event-hero',
        preferredComponent: 'hero',
        headingStructure: 'H1: {Event Name}',
        visualRequirements: ['event-banner', 'date-badge', 'venue-tag'],
        liftPriority: 1,
      },
      {
        role: 'event-details',
        preferredComponent: 'info-box',
        headingStructure: 'H2: Event Details',
        visualRequirements: ['date-time', 'location-map', 'price-range'],
        liftPriority: 2,
      },
      {
        role: 'performer-venue',
        preferredComponent: 'card',
        headingStructure: 'H2: Performers & Venue',
        visualRequirements: ['performer-images', 'venue-photo'],
        liftPriority: 3,
      },
      {
        role: 'tickets',
        preferredComponent: 'comparison-table',
        headingStructure: 'H2: Tickets',
        visualRequirements: ['tier-pricing', 'availability-badge'],
        liftPriority: 4,
      },
      {
        role: 'what-to-expect',
        preferredComponent: 'prose',
        headingStructure: 'H2: What to Expect',
        visualRequirements: ['event-photos', 'highlight-list'],
        liftPriority: 5,
      },
      {
        role: 'faq',
        preferredComponent: 'faq-accordion',
        headingStructure: 'H2: Frequently Asked Questions',
        visualRequirements: ['expandable-sections'],
        liftPriority: 6,
      },
    ],
    headingTemplate: [
      'H1: {Event Name}',
      'H2: Event Details',
      'H2: Performers & Venue',
      'H2: Ticket Options',
      'H2: What to Expect',
      'H2: Frequently Asked Questions',
    ],
    internalLinkingPattern: {
      primaryTargets: ['venue-page', 'performer-page', 'related-events'],
      linkDirection: 'bidirectional',
    },
    weightBonuses: {
      'event-hero': 2,
      tickets: 1,
    },
  },

  // =========================================================================
  // LEAD GENERATION / LOCAL
  // =========================================================================

  b2b: {
    type: 'b2b',
    componentOrder: [
      {
        role: 'expertise-hero',
        preferredComponent: 'hero',
        headingStructure: 'H1: {Service/Solution Title}',
        visualRequirements: ['professional-hero', 'authority-badge'],
        liftPriority: 1,
      },
      {
        role: 'methodology',
        preferredComponent: 'step-list',
        headingStructure: 'H2: Our Methodology',
        visualRequirements: ['process-diagram', 'numbered-steps'],
        liftPriority: 2,
      },
      {
        role: 'case-studies',
        preferredComponent: 'card',
        headingStructure: 'H2: Case Studies',
        visualRequirements: ['result-metrics', 'client-logos'],
        liftPriority: 3,
      },
      {
        role: 'key-stats',
        preferredComponent: 'stat-highlight',
        headingStructure: 'H2: Results by the Numbers',
        visualRequirements: ['stat-counters', 'data-visuals'],
        liftPriority: 4,
      },
      {
        role: 'expertise-content',
        preferredComponent: 'prose',
        headingStructure: 'H2: Deep Expertise',
        visualRequirements: ['author-credentials'],
        liftPriority: 5,
      },
      {
        role: 'consultation-cta',
        preferredComponent: 'cta-banner',
        headingStructure: 'H2: Schedule a Consultation',
        visualRequirements: ['cta-button', 'calendar-embed'],
        liftPriority: 6,
      },
    ],
    headingTemplate: [
      'H1: {Service/Solution Title}',
      'H2: Our Methodology',
      'H2: Case Studies',
      'H2: Results by the Numbers',
      'H2: Deep Expertise in {Domain}',
      'H2: Schedule a Consultation',
    ],
    internalLinkingPattern: {
      primaryTargets: ['case-study', 'service-page', 'thought-leadership'],
      linkDirection: 'to-author',
    },
    weightBonuses: {
      'expertise-hero': 2,
      'case-studies': 1,
      methodology: 1,
    },
  },

  'local-business': {
    type: 'local-business',
    componentOrder: [
      {
        role: 'service-hero',
        preferredComponent: 'hero',
        headingStructure: 'H1: {Service} in {Location}',
        visualRequirements: ['hero-image', 'location-badge'],
        liftPriority: 1,
      },
      {
        role: 'service-details',
        preferredComponent: 'feature-grid',
        headingStructure: 'H2: Our Services',
        visualRequirements: ['service-icons', 'short-descriptions'],
        liftPriority: 2,
      },
      {
        role: 'contact-cta',
        preferredComponent: 'cta-banner',
        headingStructure: 'H2: Contact Us',
        visualRequirements: ['phone-number', 'map-embed', 'hours'],
        liftPriority: 3,
      },
      {
        role: 'reviews',
        preferredComponent: 'testimonial-card',
        headingStructure: 'H2: Customer Reviews',
        visualRequirements: ['star-rating', 'review-quotes'],
        liftPriority: 4,
      },
      {
        role: 'project-gallery',
        preferredComponent: 'card',
        headingStructure: 'H2: Our Work',
        visualRequirements: ['gallery-images', 'before-after'],
        liftPriority: 5,
      },
      {
        role: 'service-area',
        preferredComponent: 'info-box',
        headingStructure: 'H2: Service Area',
        visualRequirements: ['area-map', 'location-list'],
        liftPriority: 6,
      },
    ],
    headingTemplate: [
      'H1: {Service} in {Location}',
      'H2: Our Services',
      'H2: Contact Us Today',
      'H2: Customer Reviews',
      'H2: Our Work',
      'H2: Service Area',
    ],
    internalLinkingPattern: {
      primaryTargets: ['service-page', 'location-page', 'contact-page'],
      linkDirection: 'to-core',
    },
    weightBonuses: {
      'service-hero': 2,
      'contact-cta': 1,
      reviews: 1,
    },
  },

  'real-estate': {
    type: 'real-estate',
    componentOrder: [
      {
        role: 'listing-hero',
        preferredComponent: 'hero',
        headingStructure: 'H1: {Property Address}',
        visualRequirements: ['property-gallery', 'price-tag', 'status-badge'],
        liftPriority: 1,
      },
      {
        role: 'property-details',
        preferredComponent: 'feature-grid',
        headingStructure: 'H2: Property Details',
        visualRequirements: ['specs-grid', 'floor-plan'],
        liftPriority: 2,
      },
      {
        role: 'neighborhood-guide',
        preferredComponent: 'prose',
        headingStructure: 'H2: Neighborhood Guide',
        visualRequirements: ['area-map', 'amenity-list'],
        liftPriority: 3,
      },
      {
        role: 'market-analysis',
        preferredComponent: 'stat-highlight',
        headingStructure: 'H2: Market Analysis',
        visualRequirements: ['price-trends', 'comparison-data'],
        liftPriority: 4,
      },
      {
        role: 'contact-agent',
        preferredComponent: 'cta-banner',
        headingStructure: 'H2: Contact Agent',
        visualRequirements: ['agent-photo', 'contact-form'],
        liftPriority: 5,
      },
    ],
    headingTemplate: [
      'H1: {Property Address}',
      'H2: Property Details',
      'H2: Neighborhood Guide',
      'H2: Market Analysis',
      'H2: Contact Your Agent',
    ],
    internalLinkingPattern: {
      primaryTargets: ['neighborhood-page', 'similar-listings', 'agent-profile'],
      linkDirection: 'bidirectional',
    },
    weightBonuses: {
      'listing-hero': 2,
      'property-details': 1,
    },
  },

  healthcare: {
    type: 'healthcare',
    componentOrder: [
      {
        role: 'condition-overview',
        preferredComponent: 'lead-paragraph',
        headingStructure: 'H1: {Condition/Treatment}',
        visualRequirements: ['medical-illustration', 'ymyl-disclaimer'],
        liftPriority: 1,
      },
      {
        role: 'symptoms',
        preferredComponent: 'checklist',
        headingStructure: 'H2: Symptoms',
        visualRequirements: ['symptom-list', 'severity-indicators'],
        liftPriority: 2,
      },
      {
        role: 'treatment-options',
        preferredComponent: 'comparison-table',
        headingStructure: 'H2: Treatment Options',
        visualRequirements: ['treatment-comparison', 'efficacy-data'],
        liftPriority: 3,
      },
      {
        role: 'provider-info',
        preferredComponent: 'card',
        headingStructure: 'H2: Our Providers',
        visualRequirements: ['provider-photos', 'credentials'],
        liftPriority: 4,
      },
      {
        role: 'appointment-cta',
        preferredComponent: 'cta-banner',
        headingStructure: 'H2: Book an Appointment',
        visualRequirements: ['booking-button', 'phone-number'],
        liftPriority: 5,
      },
      {
        role: 'medical-disclaimer',
        preferredComponent: 'alert-box',
        headingStructure: 'H2: Medical Disclaimer',
        visualRequirements: ['disclaimer-text', 'review-date'],
        liftPriority: 6,
      },
    ],
    headingTemplate: [
      'H1: {Condition/Treatment}',
      'H2: Symptoms & Signs',
      'H2: Treatment Options',
      'H2: Our Healthcare Providers',
      'H2: Book an Appointment',
      'H2: Medical Disclaimer',
    ],
    internalLinkingPattern: {
      primaryTargets: ['condition-page', 'treatment-page', 'provider-profile'],
      linkDirection: 'to-author',
    },
    weightBonuses: {
      'condition-overview': 2,
      'treatment-options': 1,
      'provider-info': 1,
    },
  },

  travel: {
    type: 'travel',
    componentOrder: [
      {
        role: 'destination-hero',
        preferredComponent: 'hero',
        headingStructure: 'H1: {Destination}',
        visualRequirements: ['destination-image', 'rating-badge'],
        liftPriority: 1,
      },
      {
        role: 'itinerary',
        preferredComponent: 'timeline',
        headingStructure: 'H2: Suggested Itinerary',
        visualRequirements: ['day-by-day', 'route-map'],
        liftPriority: 2,
      },
      {
        role: 'booking-options',
        preferredComponent: 'comparison-table',
        headingStructure: 'H2: Booking Options',
        visualRequirements: ['price-comparison', 'availability'],
        liftPriority: 3,
      },
      {
        role: 'traveler-reviews',
        preferredComponent: 'testimonial-card',
        headingStructure: 'H2: Traveler Reviews',
        visualRequirements: ['review-cards', 'photo-gallery'],
        liftPriority: 4,
      },
      {
        role: 'travel-tips',
        preferredComponent: 'key-takeaways',
        headingStructure: 'H2: Travel Tips',
        visualRequirements: ['tip-list', 'info-icons'],
        liftPriority: 5,
      },
      {
        role: 'practical-info',
        preferredComponent: 'info-box',
        headingStructure: 'H2: Practical Information',
        visualRequirements: ['weather-data', 'currency-info'],
        liftPriority: 6,
      },
    ],
    headingTemplate: [
      'H1: {Destination} Travel Guide',
      'H2: Suggested Itinerary',
      'H2: Booking Options',
      'H2: Traveler Reviews',
      'H2: Essential Travel Tips',
      'H2: Practical Information',
    ],
    internalLinkingPattern: {
      primaryTargets: ['destination-page', 'hotel-listing', 'activity-page'],
      linkDirection: 'bidirectional',
    },
    weightBonuses: {
      'destination-hero': 2,
      itinerary: 1,
    },
  },

  // =========================================================================
  // CONTENT / INFORMATIONAL
  // =========================================================================

  blog: {
    type: 'blog',
    componentOrder: [
      {
        role: 'article-title',
        preferredComponent: 'hero',
        headingStructure: 'H1: {Article Title}',
        visualRequirements: ['featured-image', 'author-byline', 'publish-date'],
        liftPriority: 1,
      },
      {
        role: 'introduction',
        preferredComponent: 'lead-paragraph',
        headingStructure: 'none (intro paragraph)',
        visualRequirements: ['hook-text'],
        liftPriority: 2,
      },
      {
        role: 'body-sections',
        preferredComponent: 'prose',
        headingStructure: 'H2: {Section Headings}',
        visualRequirements: ['inline-images', 'subheadings'],
        liftPriority: 3,
      },
      {
        role: 'key-takeaways',
        preferredComponent: 'key-takeaways',
        headingStructure: 'H2: Key Takeaways',
        visualRequirements: ['summary-box'],
        liftPriority: 4,
      },
      {
        role: 'author-box',
        preferredComponent: 'card',
        headingStructure: 'H2: About the Author',
        visualRequirements: ['author-photo', 'bio-text', 'social-links'],
        liftPriority: 5,
      },
      {
        role: 'related-articles',
        preferredComponent: 'card',
        headingStructure: 'H2: Related Articles',
        visualRequirements: ['article-thumbnails', 'title-links'],
        liftPriority: 6,
      },
    ],
    headingTemplate: [
      'H1: {Article Title}',
      'H2: {Section 1}',
      'H2: {Section 2}',
      'H2: {Section N}',
      'H2: Key Takeaways',
      'H2: About the Author',
    ],
    internalLinkingPattern: {
      primaryTargets: ['pillar-page', 'related-article', 'category-page'],
      linkDirection: 'to-core',
    },
    weightBonuses: {
      'article-title': 1,
      'body-sections': 1,
    },
  },

  affiliate: {
    type: 'affiliate',
    componentOrder: [
      {
        role: 'product-review-hero',
        preferredComponent: 'hero',
        headingStructure: 'H1: {Product} Review',
        visualRequirements: ['product-image', 'rating-score', 'verdict-badge'],
        liftPriority: 1,
      },
      {
        role: 'quick-verdict',
        preferredComponent: 'key-takeaways',
        headingStructure: 'H2: Quick Verdict',
        visualRequirements: ['pros-cons-summary', 'rating-breakdown'],
        liftPriority: 2,
      },
      {
        role: 'comparison-table',
        preferredComponent: 'comparison-table',
        headingStructure: 'H2: Comparison',
        visualRequirements: ['product-comparison', 'feature-matrix'],
        liftPriority: 3,
      },
      {
        role: 'pros-cons',
        preferredComponent: 'checklist',
        headingStructure: 'H2: Pros & Cons',
        visualRequirements: ['pro-list', 'con-list'],
        liftPriority: 4,
      },
      {
        role: 'detailed-review',
        preferredComponent: 'prose',
        headingStructure: 'H2: Detailed Review',
        visualRequirements: ['section-images', 'subheadings'],
        liftPriority: 5,
      },
      {
        role: 'verdict-cta',
        preferredComponent: 'cta-banner',
        headingStructure: 'H2: Final Verdict',
        visualRequirements: ['cta-button', 'affiliate-disclosure'],
        liftPriority: 6,
      },
    ],
    headingTemplate: [
      'H1: {Product} Review ({Year})',
      'H2: Quick Verdict',
      'H2: Comparison with Alternatives',
      'H2: Pros & Cons',
      'H2: Detailed Review',
      'H2: Final Verdict',
    ],
    internalLinkingPattern: {
      primaryTargets: ['comparison-page', 'category-roundup', 'buying-guide'],
      linkDirection: 'to-core',
    },
    weightBonuses: {
      'product-review-hero': 1,
      'comparison-table': 2,
      'pros-cons': 1,
    },
  },

  news: {
    type: 'news',
    componentOrder: [
      {
        role: 'headline',
        preferredComponent: 'hero',
        headingStructure: 'H1: {Headline}',
        visualRequirements: ['lead-image', 'dateline', 'byline'],
        liftPriority: 1,
      },
      {
        role: 'lead-paragraph',
        preferredComponent: 'lead-paragraph',
        headingStructure: 'none (inverted pyramid lead)',
        visualRequirements: ['bold-lead'],
        liftPriority: 2,
      },
      {
        role: 'body',
        preferredComponent: 'prose',
        headingStructure: 'H2: {Section Headings}',
        visualRequirements: ['inline-images', 'pull-quotes'],
        liftPriority: 3,
      },
      {
        role: 'live-updates',
        preferredComponent: 'timeline',
        headingStructure: 'H2: Latest Updates',
        visualRequirements: ['timestamp-entries', 'update-badges'],
        liftPriority: 4,
      },
      {
        role: 'related-articles',
        preferredComponent: 'card',
        headingStructure: 'H2: Related Coverage',
        visualRequirements: ['article-thumbnails', 'topic-tags'],
        liftPriority: 5,
      },
    ],
    headingTemplate: [
      'H1: {Headline}',
      'H2: {Development 1}',
      'H2: {Development 2}',
      'H2: Latest Updates',
      'H2: Related Coverage',
    ],
    internalLinkingPattern: {
      primaryTargets: ['topic-page', 'related-story', 'author-page'],
      linkDirection: 'to-core',
    },
    weightBonuses: {
      headline: 2,
      'lead-paragraph': 1,
    },
  },

  'e-learning': {
    type: 'e-learning',
    componentOrder: [
      {
        role: 'course-overview',
        preferredComponent: 'hero',
        headingStructure: 'H1: {Course Title}',
        visualRequirements: ['course-image', 'enrollment-badge', 'rating'],
        liftPriority: 1,
      },
      {
        role: 'learning-outcomes',
        preferredComponent: 'checklist',
        headingStructure: 'H2: What You Will Learn',
        visualRequirements: ['outcome-list', 'skill-tags'],
        liftPriority: 2,
      },
      {
        role: 'curriculum',
        preferredComponent: 'accordion',
        headingStructure: 'H2: Curriculum',
        visualRequirements: ['module-list', 'duration-tags'],
        liftPriority: 3,
      },
      {
        role: 'instructor',
        preferredComponent: 'card',
        headingStructure: 'H2: Your Instructor',
        visualRequirements: ['instructor-photo', 'credentials', 'bio'],
        liftPriority: 4,
      },
      {
        role: 'enrollment-cta',
        preferredComponent: 'cta-banner',
        headingStructure: 'H2: Enroll Now',
        visualRequirements: ['price-tag', 'cta-button', 'guarantee-badge'],
        liftPriority: 5,
      },
      {
        role: 'student-reviews',
        preferredComponent: 'testimonial-card',
        headingStructure: 'H2: Student Reviews',
        visualRequirements: ['review-cards', 'rating-stars'],
        liftPriority: 6,
      },
    ],
    headingTemplate: [
      'H1: {Course Title}',
      'H2: What You Will Learn',
      'H2: Course Curriculum',
      'H2: Your Instructor',
      'H2: Enroll Now',
      'H2: Student Reviews',
    ],
    internalLinkingPattern: {
      primaryTargets: ['course-category', 'instructor-profile', 'related-course'],
      linkDirection: 'bidirectional',
    },
    weightBonuses: {
      'course-overview': 2,
      curriculum: 1,
      'learning-outcomes': 1,
    },
  },

  // =========================================================================
  // SPECIALIZED / NICHE
  // =========================================================================

  recruitment: {
    type: 'recruitment',
    componentOrder: [
      {
        role: 'job-listing',
        preferredComponent: 'hero',
        headingStructure: 'H1: {Job Title} at {Company}',
        visualRequirements: ['company-logo', 'location-tag', 'salary-range'],
        liftPriority: 1,
      },
      {
        role: 'job-details',
        preferredComponent: 'prose',
        headingStructure: 'H2: Job Description',
        visualRequirements: ['requirements-list', 'responsibilities'],
        liftPriority: 2,
      },
      {
        role: 'company-profile',
        preferredComponent: 'card',
        headingStructure: 'H2: About {Company}',
        visualRequirements: ['company-photos', 'culture-highlights'],
        liftPriority: 3,
      },
      {
        role: 'benefits',
        preferredComponent: 'feature-grid',
        headingStructure: 'H2: Benefits & Perks',
        visualRequirements: ['benefit-icons', 'perk-descriptions'],
        liftPriority: 4,
      },
      {
        role: 'application-cta',
        preferredComponent: 'cta-banner',
        headingStructure: 'H2: Apply Now',
        visualRequirements: ['application-form', 'cta-button'],
        liftPriority: 5,
      },
    ],
    headingTemplate: [
      'H1: {Job Title} at {Company}',
      'H2: Job Description',
      'H2: About {Company}',
      'H2: Benefits & Perks',
      'H2: Apply Now',
    ],
    internalLinkingPattern: {
      primaryTargets: ['company-page', 'similar-jobs', 'career-advice'],
      linkDirection: 'bidirectional',
    },
    weightBonuses: {
      'job-listing': 2,
      'job-details': 1,
    },
  },

  directory: {
    type: 'directory',
    componentOrder: [
      {
        role: 'category-header',
        preferredComponent: 'hero',
        headingStructure: 'H1: {Category} Directory',
        visualRequirements: ['category-icon', 'result-count'],
        liftPriority: 1,
      },
      {
        role: 'listings',
        preferredComponent: 'card',
        headingStructure: 'H2: Listings',
        visualRequirements: ['listing-cards', 'thumbnails', 'ratings'],
        liftPriority: 2,
      },
      {
        role: 'filters',
        preferredComponent: 'feature-grid',
        headingStructure: 'H2: Filter & Sort',
        visualRequirements: ['filter-controls', 'sort-options'],
        liftPriority: 3,
      },
      {
        role: 'reviews-summary',
        preferredComponent: 'stat-highlight',
        headingStructure: 'H2: Reviews Overview',
        visualRequirements: ['aggregate-ratings', 'review-distribution'],
        liftPriority: 4,
      },
      {
        role: 'map-view',
        preferredComponent: 'info-box',
        headingStructure: 'H2: Map View',
        visualRequirements: ['interactive-map', 'pin-markers'],
        liftPriority: 5,
      },
    ],
    headingTemplate: [
      'H1: {Category} Directory',
      'H2: All Listings',
      'H2: Filter & Sort',
      'H2: Reviews Overview',
      'H2: Map View',
    ],
    internalLinkingPattern: {
      primaryTargets: ['listing-detail', 'subcategory', 'location-page'],
      linkDirection: 'bidirectional',
    },
    weightBonuses: {
      listings: 2,
      'category-header': 1,
    },
  },

  community: {
    type: 'community',
    componentOrder: [
      {
        role: 'discussion-feed',
        preferredComponent: 'card',
        headingStructure: 'H1: {Community/Forum Name}',
        visualRequirements: ['thread-cards', 'reply-counts', 'activity-badges'],
        liftPriority: 1,
      },
      {
        role: 'categories',
        preferredComponent: 'feature-grid',
        headingStructure: 'H2: Categories',
        visualRequirements: ['category-tiles', 'post-counts'],
        liftPriority: 2,
      },
      {
        role: 'trending-topics',
        preferredComponent: 'key-takeaways',
        headingStructure: 'H2: Trending Topics',
        visualRequirements: ['topic-tags', 'activity-indicators'],
        liftPriority: 3,
      },
      {
        role: 'user-profiles',
        preferredComponent: 'testimonial-card',
        headingStructure: 'H2: Active Members',
        visualRequirements: ['user-avatars', 'reputation-badges'],
        liftPriority: 4,
      },
      {
        role: 'community-rules',
        preferredComponent: 'info-box',
        headingStructure: 'H2: Community Guidelines',
        visualRequirements: ['rules-list', 'moderation-info'],
        liftPriority: 5,
      },
    ],
    headingTemplate: [
      'H1: {Community Name}',
      'H2: Discussion Categories',
      'H2: Trending Topics',
      'H2: Active Members',
      'H2: Community Guidelines',
    ],
    internalLinkingPattern: {
      primaryTargets: ['thread-page', 'user-profile', 'category-page'],
      linkDirection: 'bidirectional',
    },
    weightBonuses: {
      'discussion-feed': 2,
      categories: 1,
    },
  },

  nonprofit: {
    type: 'nonprofit',
    componentOrder: [
      {
        role: 'mission-hero',
        preferredComponent: 'hero',
        headingStructure: 'H1: {Organization} - {Mission Statement}',
        visualRequirements: ['impact-image', 'mission-text'],
        liftPriority: 1,
      },
      {
        role: 'impact-stats',
        preferredComponent: 'stat-highlight',
        headingStructure: 'H2: Our Impact',
        visualRequirements: ['impact-counters', 'infographic'],
        liftPriority: 2,
      },
      {
        role: 'programs',
        preferredComponent: 'feature-grid',
        headingStructure: 'H2: Our Programs',
        visualRequirements: ['program-cards', 'beneficiary-images'],
        liftPriority: 3,
      },
      {
        role: 'stories',
        preferredComponent: 'testimonial-card',
        headingStructure: 'H2: Stories of Change',
        visualRequirements: ['beneficiary-stories', 'quote-cards'],
        liftPriority: 4,
      },
      {
        role: 'donate-cta',
        preferredComponent: 'cta-banner',
        headingStructure: 'H2: Donate Now',
        visualRequirements: ['donation-tiers', 'cta-button'],
        liftPriority: 5,
      },
      {
        role: 'volunteer',
        preferredComponent: 'card',
        headingStructure: 'H2: Get Involved',
        visualRequirements: ['volunteer-opportunities', 'sign-up-form'],
        liftPriority: 6,
      },
    ],
    headingTemplate: [
      'H1: {Organization} - {Mission}',
      'H2: Our Impact',
      'H2: Our Programs',
      'H2: Stories of Change',
      'H2: Donate Now',
      'H2: Get Involved',
    ],
    internalLinkingPattern: {
      primaryTargets: ['program-page', 'impact-report', 'donation-page'],
      linkDirection: 'to-core',
    },
    weightBonuses: {
      'mission-hero': 2,
      'impact-stats': 1,
      'donate-cta': 1,
    },
  },
};

// =============================================================================
// LOOKUP FUNCTION
// =============================================================================

/**
 * Retrieve the layout configuration for a given website type.
 * Returns null if the type is not recognized.
 */
export function getWebsiteTypeLayout(websiteType: string): WebsiteTypeLayout | null {
  return WEBSITE_TYPE_LAYOUTS[websiteType] ?? null;
}
