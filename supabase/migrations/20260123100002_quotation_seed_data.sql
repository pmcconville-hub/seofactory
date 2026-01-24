-- supabase/migrations/20260123100001_quotation_seed_data.sql
-- Seed data for quotation service modules and packages

-- =============================================================================
-- Semantic SEO Modules
-- =============================================================================

INSERT INTO quotation_service_modules (id, category, name, description, base_price_min, base_price_max, is_recurring, recurring_interval, kpi_contributions, deliverables, display_order, is_active)
VALUES
  ('semantic_topical_map', 'semantic_seo', 'Topical Map Development', 'Comprehensive topical map with entity strategy, hub-spoke architecture, and content hierarchy', 1500, 3500, false, NULL,
   '[{"metric": "keywords_top_10", "impactMin": 50, "impactMax": 150, "timeframeMonths": 6, "confidence": 0.65}, {"metric": "organic_traffic", "impactMin": 10, "impactMax": 25, "timeframeMonths": 6, "confidence": 0.6}]'::jsonb,
   '["Full topical map with 50-200 topics", "Entity relationship mapping", "Hub-spoke content architecture", "Semantic triple (EAV) documentation", "Content priority scoring"]'::jsonb, 1, true),

  ('semantic_entity_strategy', 'semantic_seo', 'Entity Optimization Strategy', 'Entity-first SEO strategy with Wikidata alignment and knowledge graph optimization', 800, 1800, false, NULL,
   '[{"metric": "keywords_top_10", "impactMin": 20, "impactMax": 60, "timeframeMonths": 6, "confidence": 0.6}]'::jsonb,
   '["Entity inventory and audit", "Wikidata/Knowledge Graph alignment", "Entity disambiguation strategy", "Schema.org implementation plan"]'::jsonb, 2, true),

  ('semantic_eav_optimization', 'semantic_seo', 'EAV Content Optimization', 'Entity-Attribute-Value optimization for existing content', 600, 1200, false, NULL,
   '[{"metric": "organic_traffic", "impactMin": 10, "impactMax": 25, "timeframeMonths": 6, "confidence": 0.6}]'::jsonb,
   '["EAV audit of existing content", "Attribute gap analysis", "Contextual bridge recommendations", "Implementation guidelines"]'::jsonb, 3, true),

  ('semantic_contextual_bridging', 'semantic_seo', 'Contextual Bridging Strategy', 'Internal linking and content flow optimization using semantic relationships', 500, 1000, false, NULL,
   '[{"metric": "organic_traffic", "impactMin": 10, "impactMax": 25, "timeframeMonths": 6, "confidence": 0.6}]'::jsonb,
   '["Internal link audit", "Contextual bridge mapping", "Link equity distribution plan", "Anchor text optimization"]'::jsonb, 4, true)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Traditional SEO Modules
-- =============================================================================

INSERT INTO quotation_service_modules (id, category, name, description, base_price_min, base_price_max, is_recurring, recurring_interval, kpi_contributions, deliverables, display_order, is_active)
VALUES
  ('tech_audit_comprehensive', 'traditional_seo', 'Comprehensive Technical Audit', 'Full technical SEO audit covering crawlability, indexability, and Core Web Vitals', 1200, 2500, false, NULL,
   '[{"metric": "organic_traffic", "impactMin": 10, "impactMax": 25, "timeframeMonths": 6, "confidence": 0.6}]'::jsonb,
   '["Full site crawl analysis", "Core Web Vitals assessment", "Mobile usability audit", "JavaScript rendering analysis", "Prioritized fix list"]'::jsonb, 1, true),

  ('tech_audit_basic', 'traditional_seo', 'Basic Technical Audit', 'Essential technical SEO checkup for small sites', 400, 800, false, NULL,
   '[]'::jsonb,
   '["Site crawl (up to 500 pages)", "Critical issues report", "Quick wins checklist"]'::jsonb, 2, true),

  ('tech_cwv_optimization', 'traditional_seo', 'Core Web Vitals Optimization', 'Performance optimization for LCP, FID/INP, and CLS', 800, 2000, false, NULL,
   '[{"metric": "conversion_rate", "impactMin": 0.5, "impactMax": 2, "timeframeMonths": 6, "confidence": 0.5}]'::jsonb,
   '["Performance baseline report", "Optimization recommendations", "Implementation support", "Post-optimization verification"]'::jsonb, 3, true),

  ('tech_onpage_optimization', 'traditional_seo', 'On-Page SEO Optimization', 'Title tags, meta descriptions, headers, and content optimization', 500, 1500, false, NULL,
   '[{"metric": "organic_traffic", "impactMin": 10, "impactMax": 25, "timeframeMonths": 6, "confidence": 0.6}, {"metric": "keywords_top_10", "impactMin": 20, "impactMax": 60, "timeframeMonths": 6, "confidence": 0.6}]'::jsonb,
   '["On-page audit report", "Optimized title/meta templates", "Header structure recommendations", "Content optimization guidelines"]'::jsonb, 4, true),

  ('tech_schema_implementation', 'traditional_seo', 'Schema Markup Implementation', 'JSON-LD structured data for rich snippets and enhanced SERP presence', 600, 1500, false, NULL,
   '[{"metric": "organic_traffic", "impactMin": 10, "impactMax": 25, "timeframeMonths": 6, "confidence": 0.6}]'::jsonb,
   '["Schema audit and strategy", "JSON-LD templates", "Implementation support", "Validation and testing"]'::jsonb, 5, true),

  ('tech_site_architecture', 'traditional_seo', 'Site Architecture Review', 'URL structure, navigation, and crawl depth optimization', 700, 1500, false, NULL,
   '[{"metric": "organic_traffic", "impactMin": 10, "impactMax": 25, "timeframeMonths": 6, "confidence": 0.6}]'::jsonb,
   '["Site structure analysis", "URL optimization recommendations", "Navigation improvements", "XML sitemap optimization"]'::jsonb, 6, true)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Content Modules
-- =============================================================================

INSERT INTO quotation_service_modules (id, category, name, description, base_price_min, base_price_max, is_recurring, recurring_interval, kpi_contributions, deliverables, display_order, is_active)
VALUES
  ('content_strategy', 'content', 'Content Strategy Development', 'Data-driven content strategy aligned with business goals and search demand', 1200, 2500, false, NULL,
   '[{"metric": "organic_traffic", "impactMin": 20, "impactMax": 50, "timeframeMonths": 6, "confidence": 0.7}, {"metric": "keywords_top_10", "impactMin": 50, "impactMax": 150, "timeframeMonths": 6, "confidence": 0.65}]'::jsonb,
   '["Content gap analysis", "Editorial calendar (12 months)", "Content type recommendations", "Competitor content analysis"]'::jsonb, 1, true),

  ('content_briefs_4', 'content', 'Content Briefs (4 Articles)', 'Detailed content briefs with semantic optimization guidelines', 400, 800, false, NULL,
   '[]'::jsonb,
   '["4 comprehensive content briefs", "Target keywords and entities", "Structural guidelines", "Competitor comparison"]'::jsonb, 2, true),

  ('content_articles_4', 'content', 'Article Writing (4 Articles)', 'SEO-optimized articles (1500-2500 words each)', 1200, 2400, false, NULL,
   '[{"metric": "organic_traffic", "impactMin": 10, "impactMax": 25, "timeframeMonths": 6, "confidence": 0.6}, {"metric": "keywords_top_10", "impactMin": 20, "impactMax": 60, "timeframeMonths": 6, "confidence": 0.6}]'::jsonb,
   '["4 SEO-optimized articles", "1500-2500 words each", "Internal linking", "Schema markup"]'::jsonb, 3, true),

  ('content_articles_8', 'content', 'Article Writing (8 Articles)', 'SEO-optimized articles (1500-2500 words each)', 2200, 4400, false, NULL,
   '[{"metric": "organic_traffic", "impactMin": 20, "impactMax": 50, "timeframeMonths": 6, "confidence": 0.7}, {"metric": "keywords_top_10", "impactMin": 50, "impactMax": 150, "timeframeMonths": 6, "confidence": 0.65}]'::jsonb,
   '["8 SEO-optimized articles", "1500-2500 words each", "Internal linking", "Schema markup"]'::jsonb, 4, true),

  ('content_refresh', 'content', 'Content Refresh Package', 'Update and optimize existing content for better performance', 800, 1600, false, NULL,
   '[{"metric": "organic_traffic", "impactMin": 10, "impactMax": 25, "timeframeMonths": 6, "confidence": 0.6}]'::jsonb,
   '["Content audit (up to 20 pages)", "Update recommendations", "Freshness signals", "Re-optimization"]'::jsonb, 5, true)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Off-Site Modules
-- =============================================================================

INSERT INTO quotation_service_modules (id, category, name, description, base_price_min, base_price_max, is_recurring, recurring_interval, kpi_contributions, deliverables, display_order, is_active)
VALUES
  ('offsite_link_building', 'offsite', 'Link Building Campaign', 'Outreach-based link acquisition from relevant, authoritative sites', 1500, 4000, true, 'monthly',
   '[{"metric": "domain_authority", "impactMin": 3, "impactMax": 8, "timeframeMonths": 12, "confidence": 0.5}, {"metric": "organic_traffic", "impactMin": 10, "impactMax": 25, "timeframeMonths": 6, "confidence": 0.6}]'::jsonb,
   '["5-15 quality backlinks/month", "Outreach tracking report", "Link quality metrics", "Anchor text diversity"]'::jsonb, 1, true),

  ('offsite_digital_pr', 'offsite', 'Digital PR Campaign', 'PR-driven link acquisition through newsworthy content', 2000, 5000, false, NULL,
   '[{"metric": "domain_authority", "impactMin": 3, "impactMax": 8, "timeframeMonths": 12, "confidence": 0.5}, {"metric": "organic_traffic", "impactMin": 20, "impactMax": 50, "timeframeMonths": 6, "confidence": 0.7}]'::jsonb,
   '["PR-worthy content creation", "Journalist outreach", "Press release distribution", "Coverage tracking"]'::jsonb, 2, true),

  ('offsite_guest_posts', 'offsite', 'Guest Posting Package', 'Guest articles on relevant industry publications', 800, 2000, false, NULL,
   '[{"metric": "domain_authority", "impactMin": 3, "impactMax": 8, "timeframeMonths": 12, "confidence": 0.5}]'::jsonb,
   '["3-5 guest posts", "Topic ideation", "Writing and placement", "Link tracking"]'::jsonb, 3, true),

  ('offsite_citations', 'offsite', 'Citation Building', 'Business directory and citation cleanup/building', 300, 600, false, NULL,
   '[{"metric": "local_pack_appearances", "impactMin": 5, "impactMax": 20, "timeframeMonths": 3, "confidence": 0.7}]'::jsonb,
   '["Citation audit", "30-50 citations built/cleaned", "NAP consistency", "Verification support"]'::jsonb, 4, true)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Paid Ads Modules
-- =============================================================================

INSERT INTO quotation_service_modules (id, category, name, description, base_price_min, base_price_max, is_recurring, recurring_interval, kpi_contributions, deliverables, display_order, is_active)
VALUES
  ('paid_google_ads_setup', 'paid_ads', 'Google Ads Setup', 'Campaign setup and structure for search and display advertising', 800, 2000, false, NULL,
   '[]'::jsonb,
   '["Account structure setup", "Keyword research", "Ad copy creation", "Conversion tracking"]'::jsonb, 1, true),

  ('paid_google_ads_management', 'paid_ads', 'Google Ads Management', 'Ongoing campaign optimization and management', 500, 1500, true, 'monthly',
   '[{"metric": "conversion_rate", "impactMin": 0.5, "impactMax": 2, "timeframeMonths": 6, "confidence": 0.5}]'::jsonb,
   '["Bid optimization", "A/B testing", "Negative keyword management", "Monthly reporting"]'::jsonb, 2, true),

  ('paid_social_ads', 'paid_ads', 'Social Ads Management', 'Facebook/Instagram/LinkedIn advertising management', 600, 1500, true, 'monthly',
   '[{"metric": "conversion_rate", "impactMin": 0.5, "impactMax": 2, "timeframeMonths": 6, "confidence": 0.5}]'::jsonb,
   '["Campaign setup and management", "Audience targeting", "Creative optimization", "Performance reporting"]'::jsonb, 3, true),

  ('paid_remarketing', 'paid_ads', 'Remarketing Setup', 'Retargeting campaign setup across platforms', 400, 900, false, NULL,
   '[{"metric": "conversion_rate", "impactMin": 0.5, "impactMax": 2, "timeframeMonths": 6, "confidence": 0.5}]'::jsonb,
   '["Audience list creation", "Pixel implementation", "Campaign structure", "Creative development"]'::jsonb, 4, true)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- AI/LLM Modules
-- =============================================================================

INSERT INTO quotation_service_modules (id, category, name, description, base_price_min, base_price_max, is_recurring, recurring_interval, kpi_contributions, deliverables, display_order, is_active)
VALUES
  ('ai_mention_strategy', 'ai_llm', 'AI Mention Strategy', 'Optimize content for AI model citations and recommendations', 1000, 2500, false, NULL,
   '[]'::jsonb,
   '["AI mention audit", "Content optimization guidelines", "Entity clarity improvements", "Fact verification strategy"]'::jsonb, 1, true),

  ('ai_content_optimization', 'ai_llm', 'AI-Friendly Content Optimization', 'Structure content for better AI understanding and citation', 600, 1200, false, NULL,
   '[]'::jsonb,
   '["Content clarity audit", "Statement structure optimization", "Source attribution improvements", "FAQ schema optimization"]'::jsonb, 2, true),

  ('ai_monitoring', 'ai_llm', 'AI Mention Monitoring', 'Track brand mentions across AI platforms', 200, 500, true, 'monthly',
   '[]'::jsonb,
   '["Monthly AI mention report", "Competitor comparison", "Sentiment analysis", "Trend tracking"]'::jsonb, 3, true)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Local SEO Modules
-- =============================================================================

INSERT INTO quotation_service_modules (id, category, name, description, base_price_min, base_price_max, is_recurring, recurring_interval, kpi_contributions, deliverables, display_order, is_active)
VALUES
  ('local_gbp_optimization', 'local_seo', 'Google Business Profile Optimization', 'Complete GBP setup and optimization for local visibility', 400, 800, false, NULL,
   '[{"metric": "local_pack_appearances", "impactMin": 5, "impactMax": 20, "timeframeMonths": 3, "confidence": 0.7}]'::jsonb,
   '["Profile optimization", "Category selection", "Photo optimization", "Q&A management setup"]'::jsonb, 1, true),

  ('local_citation_management', 'local_seo', 'Local Citation Management', 'Build and maintain consistent local citations', 300, 600, false, NULL,
   '[{"metric": "local_pack_appearances", "impactMin": 5, "impactMax": 20, "timeframeMonths": 3, "confidence": 0.7}]'::jsonb,
   '["30-50 citations", "NAP audit and cleanup", "Ongoing monitoring"]'::jsonb, 2, true),

  ('local_review_management', 'local_seo', 'Review Management Setup', 'Review acquisition and response strategy', 300, 600, false, NULL,
   '[{"metric": "local_pack_appearances", "impactMin": 5, "impactMax": 20, "timeframeMonths": 3, "confidence": 0.7}, {"metric": "conversion_rate", "impactMin": 0.5, "impactMax": 2, "timeframeMonths": 6, "confidence": 0.5}]'::jsonb,
   '["Review acquisition strategy", "Response templates", "Monitoring setup", "Negative review playbook"]'::jsonb, 3, true),

  ('local_content_creation', 'local_seo', 'Local Content Creation', 'Location-specific content for local search visibility', 500, 1200, false, NULL,
   '[{"metric": "local_pack_appearances", "impactMin": 5, "impactMax": 20, "timeframeMonths": 3, "confidence": 0.7}, {"metric": "organic_traffic", "impactMin": 10, "impactMax": 25, "timeframeMonths": 6, "confidence": 0.6}]'::jsonb,
   '["Location pages", "Service area content", "Local landing pages", "Community content"]'::jsonb, 4, true)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Retainer Modules
-- =============================================================================

INSERT INTO quotation_service_modules (id, category, name, description, base_price_min, base_price_max, is_recurring, recurring_interval, kpi_contributions, deliverables, display_order, is_active)
VALUES
  ('retainer_monitoring', 'retainers', 'SEO Monitoring', 'Ongoing monitoring and monthly reporting', 300, 600, true, 'monthly',
   '[]'::jsonb,
   '["Weekly rank tracking", "Monthly performance report", "Alert notifications", "Competitor tracking"]'::jsonb, 1, true),

  ('retainer_optimization', 'retainers', 'Monthly Optimization', 'Ongoing SEO maintenance and optimization', 800, 2000, true, 'monthly',
   '[{"metric": "organic_traffic", "impactMin": 10, "impactMax": 25, "timeframeMonths": 6, "confidence": 0.6}, {"metric": "keywords_top_10", "impactMin": 20, "impactMax": 60, "timeframeMonths": 6, "confidence": 0.6}]'::jsonb,
   '["Technical monitoring", "Content updates", "Link maintenance", "4 hours optimization work"]'::jsonb, 2, true),

  ('retainer_support', 'retainers', 'Support Hours', 'Dedicated support hours for ad-hoc SEO needs', 500, 1000, true, 'monthly',
   '[]'::jsonb,
   '["5 hours support/month", "Priority response", "Strategy calls", "Ad-hoc analysis"]'::jsonb, 3, true),

  ('retainer_full', 'retainers', 'Full Service Retainer', 'Comprehensive ongoing SEO management', 2500, 6000, true, 'monthly',
   '[{"metric": "organic_traffic", "impactMin": 20, "impactMax": 50, "timeframeMonths": 6, "confidence": 0.7}, {"metric": "keywords_top_10", "impactMin": 50, "impactMax": 150, "timeframeMonths": 6, "confidence": 0.65}, {"metric": "domain_authority", "impactMin": 3, "impactMax": 8, "timeframeMonths": 12, "confidence": 0.5}]'::jsonb,
   '["All monitoring and reporting", "2 articles/month", "Link building", "Technical maintenance", "Strategy sessions", "10 hours support"]'::jsonb, 4, true)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Package Presets
-- =============================================================================

INSERT INTO quotation_packages (id, name, description, included_modules, base_price, discount_percent, target_site_sizes, display_order, is_active)
VALUES
  ('pkg_starter', 'SEO Starter', 'Essential SEO foundation for small businesses just getting started with search optimization',
   '["tech_audit_basic", "tech_onpage_optimization", "content_briefs_4", "retainer_monitoring"]'::jsonb,
   1500, 10, ARRAY['small'], 1, true),

  ('pkg_growth', 'Growth Accelerator', 'Comprehensive SEO package for businesses ready to scale their organic presence',
   '["semantic_topical_map", "tech_audit_comprehensive", "tech_onpage_optimization", "tech_schema_implementation", "content_strategy", "content_articles_4", "local_gbp_optimization", "retainer_optimization"]'::jsonb,
   4500, 15, ARRAY['small', 'medium'], 2, true),

  ('pkg_authority', 'Authority Builder', 'Full-service SEO with link building and content production for competitive markets',
   '["semantic_topical_map", "semantic_entity_strategy", "tech_audit_comprehensive", "tech_cwv_optimization", "tech_schema_implementation", "tech_site_architecture", "content_strategy", "content_articles_8", "offsite_link_building", "local_gbp_optimization", "local_citation_management", "retainer_optimization"]'::jsonb,
   8500, 18, ARRAY['medium', 'large'], 3, true),

  ('pkg_enterprise', 'Enterprise Suite', 'Complete digital marketing solution for large organizations requiring comprehensive SEO',
   '["semantic_topical_map", "semantic_entity_strategy", "semantic_eav_optimization", "semantic_contextual_bridging", "tech_audit_comprehensive", "tech_cwv_optimization", "tech_onpage_optimization", "tech_schema_implementation", "tech_site_architecture", "content_strategy", "content_articles_8", "content_refresh", "offsite_link_building", "offsite_digital_pr", "ai_mention_strategy", "local_gbp_optimization", "local_citation_management", "local_content_creation", "retainer_full"]'::jsonb,
   18000, 22, ARRAY['large', 'enterprise'], 4, true),

  ('pkg_local', 'Local Dominator', 'Specialized package for local businesses wanting to dominate their geographic area',
   '["tech_audit_basic", "tech_onpage_optimization", "tech_schema_implementation", "content_briefs_4", "local_gbp_optimization", "local_citation_management", "local_review_management", "local_content_creation", "retainer_monitoring"]'::jsonb,
   2800, 12, ARRAY['small', 'medium'], 5, true),

  ('pkg_content_focus', 'Content Focus', 'Content-centric package for businesses with solid technical foundations',
   '["semantic_topical_map", "content_strategy", "content_articles_8", "content_refresh", "retainer_monitoring"]'::jsonb,
   5000, 12, ARRAY['small', 'medium', 'large'], 6, true),

  ('pkg_technical_only', 'Technical Foundation', 'Pure technical SEO package for sites needing infrastructure improvements',
   '["tech_audit_comprehensive", "tech_cwv_optimization", "tech_onpage_optimization", "tech_schema_implementation", "tech_site_architecture"]'::jsonb,
   3500, 10, ARRAY['medium', 'large', 'enterprise'], 7, true),

  ('pkg_ai_ready', 'AI-Ready SEO', 'Future-proof your SEO for the AI search era',
   '["semantic_entity_strategy", "tech_schema_implementation", "ai_mention_strategy", "ai_content_optimization", "ai_monitoring", "content_articles_4", "retainer_monitoring"]'::jsonb,
   3800, 10, ARRAY['small', 'medium', 'large'], 8, true)

ON CONFLICT (id) DO NOTHING;
