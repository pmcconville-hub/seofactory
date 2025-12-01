// config/businessLanguageMap.ts
// Maps technical SEO audit rules to business-friendly language

import { BusinessLanguageTranslation, PhaseBusinessName, EffortLevel } from '../types';

/**
 * Business-friendly translations for each audit rule
 * Used to present technical issues in language that business stakeholders understand
 */
export const ISSUE_TRANSLATIONS: Record<string, BusinessLanguageTranslation> = {
  // ============================================
  // TECHNICAL PHASE (Cost of Retrieval)
  // ============================================
  'tech-ttfb': {
    headline: 'Page is loading too slowly',
    whyItMatters: 'Google penalizes slow pages and visitors leave before content loads',
    businessImpact: 'Every 1 second delay reduces conversions by 7%',
    effortLevel: 'Moderate',
  },
  'tech-dom-size': {
    headline: 'Page has too many elements',
    whyItMatters: 'Complex pages load slowly and confuse search engines',
    businessImpact: 'Can reduce mobile traffic by 20%+',
    effortLevel: 'Complex',
  },
  'tech-html-size': {
    headline: 'Page file is too large',
    whyItMatters: 'Large pages take longer to download, especially on mobile',
    businessImpact: 'Mobile users may abandon the page',
    effortLevel: 'Moderate',
  },
  'tech-status-code': {
    headline: 'Page has server errors',
    whyItMatters: 'Search engines and users cannot access the page',
    businessImpact: 'Page will not appear in search results',
    effortLevel: 'Quick Fix',
  },
  'tech-canonical': {
    headline: 'Duplicate content risk detected',
    whyItMatters: 'Search engines may split your ranking power between multiple URLs',
    businessImpact: 'Can reduce your page authority by 50% or more',
    effortLevel: 'Quick Fix',
  },
  'tech-robots': {
    headline: 'Page is blocked from search engines',
    whyItMatters: 'Search engines are told not to show this page in results',
    businessImpact: 'Page will not appear in Google at all',
    effortLevel: 'Quick Fix',
  },

  // ============================================
  // SEMANTIC PHASE (Foundation)
  // ============================================
  'sem-ce-presence': {
    headline: 'Main topic not clearly stated',
    whyItMatters: 'Google cannot understand what your page is about',
    businessImpact: 'Page may not rank for intended keywords',
    effortLevel: 'Quick Fix',
  },
  'sem-sc-alignment': {
    headline: 'Content doesn\'t match your business model',
    whyItMatters: 'Google may show your page to the wrong audience',
    businessImpact: 'Attracts visitors who won\'t convert into customers',
    effortLevel: 'Moderate',
  },
  'sem-csi-reflection': {
    headline: 'Page doesn\'t address what users are searching for',
    whyItMatters: 'Your content doesn\'t match what people want to find',
    businessImpact: 'Users will leave and look elsewhere',
    effortLevel: 'Moderate',
  },
  'sem-section-classification': {
    headline: 'Page purpose is unclear',
    whyItMatters: 'Google can\'t tell if this is a core service page or informational content',
    businessImpact: 'May rank for wrong type of searches',
    effortLevel: 'Quick Fix',
  },
  'sem-ngram-consistency': {
    headline: 'Key terms used inconsistently',
    whyItMatters: 'Confuses search engines about your main topic',
    businessImpact: 'Weaker keyword relevance signals',
    effortLevel: 'Quick Fix',
  },

  // ============================================
  // LINK STRUCTURE PHASE
  // ============================================
  'link-count': {
    headline: 'Page lacks internal links',
    whyItMatters: 'Search engines use links to discover and understand page importance',
    businessImpact: 'Page may be seen as less important to Google',
    effortLevel: 'Moderate',
  },
  'link-prominence': {
    headline: 'Important links are hidden too low on page',
    whyItMatters: 'Links near the top of page carry more weight',
    businessImpact: 'Key pages get less link equity',
    effortLevel: 'Quick Fix',
  },
  'link-anchor-diversity': {
    headline: 'Link text is too repetitive',
    whyItMatters: 'Over-optimized anchor text looks spammy to Google',
    businessImpact: 'Risk of ranking penalties',
    effortLevel: 'Moderate',
  },
  'link-annotation-text': {
    headline: 'Links lack descriptive context',
    whyItMatters: 'Google uses surrounding text to understand link relevance',
    businessImpact: 'Missed opportunity to boost linked page rankings',
    effortLevel: 'Moderate',
  },
  'link-contextual-bridge': {
    headline: 'Missing connections to related content',
    whyItMatters: 'Users and search engines can\'t find related pages easily',
    businessImpact: 'Lower engagement and page authority spread',
    effortLevel: 'Moderate',
  },
  'link-no-generic': {
    headline: 'Using generic link text like "click here"',
    whyItMatters: 'Generic anchors waste valuable ranking signals',
    businessImpact: 'Links provide less SEO value',
    effortLevel: 'Quick Fix',
  },

  // ============================================
  // CONTENT QUALITY PHASE (Microsemantics)
  // ============================================
  'content-heading-vector': {
    headline: 'Heading structure doesn\'t flow logically',
    whyItMatters: 'Confusing structure makes content hard to scan and understand',
    businessImpact: 'Users and search engines struggle to find information',
    effortLevel: 'Moderate',
  },
  'content-subordinate-text': {
    headline: 'Content doesn\'t support the headings',
    whyItMatters: 'Paragraphs should directly relate to their headings',
    businessImpact: 'Reduces topical relevance signals',
    effortLevel: 'Moderate',
  },
  'content-discourse-integration': {
    headline: 'Content lacks smooth transitions',
    whyItMatters: 'Abrupt topic changes confuse readers and search engines',
    businessImpact: 'Higher bounce rates and lower engagement',
    effortLevel: 'Moderate',
  },
  'content-eav-density': {
    headline: 'Content lacks specific facts and details',
    whyItMatters: 'Google prefers content with concrete, verifiable information',
    businessImpact: 'Seen as less authoritative than detailed competitors',
    effortLevel: 'Complex',
  },
  'content-format-match': {
    headline: 'Content format doesn\'t match user expectations',
    whyItMatters: 'Some topics need lists, others need tables or explanations',
    businessImpact: 'Lower engagement and ranking potential',
    effortLevel: 'Moderate',
  },
  'content-no-fluff': {
    headline: 'Content contains filler text',
    whyItMatters: 'Padding dilutes your message and frustrates readers',
    businessImpact: 'Lower content quality signals to Google',
    effortLevel: 'Moderate',
  },

  // ============================================
  // VISUAL & SCHEMA PHASE
  // ============================================
  'visual-hierarchy': {
    headline: 'Visual layout doesn\'t match content importance',
    whyItMatters: 'Heading sizes should reflect content hierarchy',
    businessImpact: 'Confusing user experience and weaker SEO signals',
    effortLevel: 'Quick Fix',
  },
  'visual-image-alt': {
    headline: 'Images missing descriptions',
    whyItMatters: 'Search engines can\'t understand images without alt text',
    businessImpact: 'Missing out on image search traffic',
    effortLevel: 'Quick Fix',
  },
  'visual-schema-present': {
    headline: 'Missing structured data',
    whyItMatters: 'Schema markup helps search engines understand your content',
    businessImpact: 'Won\'t get rich snippets in search results',
    effortLevel: 'Moderate',
  },
  'visual-schema-complete': {
    headline: 'Structured data is incomplete',
    whyItMatters: 'Partial schema may not trigger rich results',
    businessImpact: 'Missing enhanced search appearance',
    effortLevel: 'Moderate',
  },
  'visual-schema-valid': {
    headline: 'Structured data has errors',
    whyItMatters: 'Invalid schema is ignored by search engines',
    businessImpact: 'No rich snippets despite having markup',
    effortLevel: 'Moderate',
  },
};

/**
 * Business-friendly names for each audit phase
 */
export const PHASE_BUSINESS_NAMES: Record<string, PhaseBusinessName> = {
  technical: {
    name: 'Site Speed & Accessibility',
    explanation: 'How fast and reliably your pages load for visitors and search engines',
  },
  semantic: {
    name: 'Topic Relevance',
    explanation: 'How well your content matches what your business offers and what users search for',
  },
  linkStructure: {
    name: 'Page Connections',
    explanation: 'How well your pages guide visitors and search engines through your site',
  },
  contentQuality: {
    name: 'Content Clarity',
    explanation: 'How clear, useful, and well-organized your content is',
  },
  visualSchema: {
    name: 'Search Enhancements',
    explanation: 'Extra features that make your pages stand out in search results',
  },
};

/**
 * Plain language explanations for SEO pillars
 */
export const PILLAR_EXPLANATIONS = {
  centralEntity: {
    title: 'Main Topic',
    explanation: 'Your website\'s core subject - what your brand is primarily known for',
  },
  sourceContext: {
    title: 'Business Model',
    explanation: 'How your business serves customers (e.g., retailer, service provider, information source)',
  },
  centralSearchIntent: {
    title: 'User Goal',
    explanation: 'What visitors want to achieve when they search for topics you cover',
  },
};

/**
 * Priority labels in business-friendly language
 */
export const PRIORITY_LABELS: Record<string, { label: string; urgency: string }> = {
  critical: {
    label: 'Critical',
    urgency: 'Fix immediately',
  },
  high: {
    label: 'Important',
    urgency: 'Address this week',
  },
  medium: {
    label: 'Recommended',
    urgency: 'Address this month',
  },
  low: {
    label: 'Nice to Have',
    urgency: 'When time allows',
  },
};

/**
 * Health status descriptions
 */
export const HEALTH_STATUS_LABELS: Record<string, { label: string; description: string; color: string }> = {
  excellent: {
    label: 'Excellent',
    description: 'Your site is well-optimized for search engines',
    color: 'green',
  },
  good: {
    label: 'Good',
    description: 'Your site is performing well with some room for improvement',
    color: 'blue',
  },
  'needs-work': {
    label: 'Needs Work',
    description: 'Several issues are affecting your search visibility',
    color: 'yellow',
  },
  critical: {
    label: 'Critical',
    description: 'Significant issues are severely impacting your search performance',
    color: 'red',
  },
};

/**
 * Get business translation for a rule, with fallback
 */
export const getBusinessTranslation = (ruleId: string, taskTitle: string, taskDescription: string): BusinessLanguageTranslation => {
  const translation = ISSUE_TRANSLATIONS[ruleId];

  if (translation) {
    return translation;
  }

  // Fallback for rules without explicit translation
  return {
    headline: taskTitle,
    whyItMatters: taskDescription,
    businessImpact: 'May affect search rankings and user experience',
    effortLevel: 'Moderate' as EffortLevel,
  };
};

/**
 * Determine health status from overall score
 */
export const getHealthStatus = (score: number): 'excellent' | 'good' | 'needs-work' | 'critical' => {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'needs-work';
  return 'critical';
};
