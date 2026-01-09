// config/auditRules.ts
// Unified Audit System Configuration - Phase 6

import { AuditCategory, AuditRule, AuditSeverity } from '../types';
import { getLanguageName } from '../utils/languageUtils';

// =============================================================================
// MULTILINGUAL STOP WORDS AND LLM PHRASES
// =============================================================================

/**
 * Language-specific stop word patterns
 * Keys are normalized language names (English, Dutch, German, etc.)
 */
export const STOP_WORD_PATTERNS: Record<string, { patterns: RegExp[]; replacements: string[] }> = {
  'English': {
    patterns: [
      /\b(Also|Also,)\s+/gi,
      /\b(Basically|Basically,)\s+/gi,
      /\b(Actually|Actually,)\s+/gi,
      /\bvery\s+/gi,
      /\breally\s+/gi,
      /\bjust\s+/gi,
      /\bquite\s+/gi,
      /\bsimply\s+/gi,
      /\bof course,?\s*/gi,
      /\bneedless to say,?\s*/gi,
    ],
    replacements: ['', '', '', '', '', '', '', '', '', ''],
  },
  'Dutch': {
    patterns: [
      /\b(Ook|Ook,)\s+/gi,
      /\b(Eigenlijk|Eigenlijk,)\s+/gi,
      /\b(Feitelijk|Feitelijk,)\s+/gi,
      /\bzeer\s+/gi,
      /\becht\s+/gi,
      /\bgewoon\s+/gi,
      /\bvrij\s+/gi,
      /\bsimpelweg\s+/gi,
      /\bnatuurlijk,?\s*/gi,
      /\buiteraard,?\s*/gi,
      /\bsowieso,?\s*/gi,
      /\bbest wel\s+/gi,
      /\bbehoorlijk\s+/gi,
    ],
    replacements: ['', '', '', '', '', '', '', '', '', '', '', '', ''],
  },
  'German': {
    patterns: [
      /\b(Auch|Auch,)\s+/gi,
      /\b(Eigentlich|Eigentlich,)\s+/gi,
      /\b(Tatsächlich|Tatsächlich,)\s+/gi,
      /\bsehr\s+/gi,
      /\bwirklich\s+/gi,
      /\beinfach\s+/gi,
      /\bziemlich\s+/gi,
      /\bnatürlich,?\s*/gi,
      /\bselbstverständlich,?\s*/gi,
    ],
    replacements: ['', '', '', '', '', '', '', '', ''],
  },
  'French': {
    patterns: [
      /\b(Aussi|Aussi,)\s+/gi,
      /\b(En fait|En fait,)\s+/gi,
      /\b(Vraiment|Vraiment,)\s+/gi,
      /\btrès\s+/gi,
      /\bvraiment\s+/gi,
      /\bsimplement\s+/gi,
      /\bassez\s+/gi,
      /\bbien sûr,?\s*/gi,
      /\bévidemment,?\s*/gi,
    ],
    replacements: ['', '', '', '', '', '', '', '', ''],
  },
  'Spanish': {
    patterns: [
      /\b(También|También,)\s+/gi,
      /\b(Básicamente|Básicamente,)\s+/gi,
      /\b(En realidad|En realidad,)\s+/gi,
      /\bmuy\s+/gi,
      /\brealmente\s+/gi,
      /\bsimplemente\s+/gi,
      /\bbastante\s+/gi,
      /\bpor supuesto,?\s*/gi,
      /\bevidentemente,?\s*/gi,
    ],
    replacements: ['', '', '', '', '', '', '', '', ''],
  },
};

/**
 * Language-specific LLM signature phrase patterns
 * These are common AI-generated phrases that should be removed or replaced
 */
export const LLM_PHRASE_PATTERNS: Record<string, { patterns: RegExp[]; replacements: string[] }> = {
  'English': {
    patterns: [
      /\bdelve into\b/gi,
      /\bdelve deeper\b/gi,
      /\bgame-?changer\b/gi,
      /\bin today'?s (fast-paced|digital|modern) (world|age|era)\b/gi,
      /\bit'?s (important|worth|crucial) to (note|mention|understand) that\b/gi,
      /\bembark on (a|this) journey\b/gi,
      /\bunlock the (power|potential|secrets)\b/gi,
      /\btake (it|things|your|this) to the next level\b/gi,
      /\b(harness|leverage) the power of\b/gi,
      /\bin conclusion,?\s*/gi,
      /\bto summarize,?\s*/gi,
      /\bin summary,?\s*/gi,
      /\blet'?s dive in\b/gi,
      /\bwithout further ado\b/gi,
      /\bwrap your head around\b/gi,
      /\bat the end of the day\b/gi,
    ],
    replacements: [
      'explore', 'examine further', 'significant development',
      'currently', '', 'start this process', 'use the capabilities',
      'improve', 'use', '', '', '', '', '', '', ''
    ],
  },
  'Dutch': {
    patterns: [
      /\blaten we erin duiken\b/gi,
      /\baan de slag gaan met\b/gi,
      /\bgame-?changer\b/gi,
      /\bin de huidige (snelle|digitale|moderne) (wereld|tijd)\b/gi,
      /\bhet is (belangrijk|de moeite waard|cruciaal) om (op te merken|te vermelden) dat\b/gi,
      /\baan deze reis beginnen\b/gi,
      /\bde kracht (ontgrendelen|ontsluiten) van\b/gi,
      /\bnaar een hoger niveau tillen\b/gi,
      /\bde kracht van .* benutten\b/gi,
      /\btot slot,?\s*/gi,
      /\bsamengevat,?\s*/gi,
      /\bter afsluiting,?\s*/gi,
      /\bzonder verder oponthoud\b/gi,
      /\buiteindelijk\b/gi,
    ],
    replacements: [
      '', 'beginnen met', 'belangrijke ontwikkeling',
      'momenteel', '', 'dit proces starten', 'de mogelijkheden gebruiken',
      'verbeteren', 'gebruiken', '', '', '', '', ''
    ],
  },
  'German': {
    patterns: [
      /\btauchen wir ein\b/gi,
      /\bgame-?changer\b/gi,
      /\bin der heutigen (schnelllebigen|digitalen|modernen) (Welt|Zeit)\b/gi,
      /\bes ist (wichtig|erwähnenswert|entscheidend),? (zu beachten|zu erwähnen),? dass\b/gi,
      /\bauf (diese|eine) Reise gehen\b/gi,
      /\bdas Potenzial (entfalten|freisetzen)\b/gi,
      /\bauf das nächste Level bringen\b/gi,
      /\bdie Kraft von .* nutzen\b/gi,
      /\bzusammenfassend,?\s*/gi,
      /\babschließend,?\s*/gi,
      /\bam Ende des Tages\b/gi,
    ],
    replacements: [
      '', 'bedeutende Entwicklung',
      'derzeit', '', 'diesen Prozess starten', 'die Möglichkeiten nutzen',
      'verbessern', 'nutzen', '', '', ''
    ],
  },
  'French': {
    patterns: [
      /\bplongeons(-nous)?\b/gi,
      /\bgame-?changer\b/gi,
      /\bdans le monde (rapide|numérique|moderne) d'aujourd'hui\b/gi,
      /\bil est (important|utile|crucial) de (noter|mentionner) que\b/gi,
      /\bse lancer dans (ce|un) voyage\b/gi,
      /\blibérer le (potentiel|pouvoir)\b/gi,
      /\bpasser au niveau supérieur\b/gi,
      /\bexploiter la puissance de\b/gi,
      /\ben conclusion,?\s*/gi,
      /\bpour résumer,?\s*/gi,
      /\ben fin de compte\b/gi,
    ],
    replacements: [
      '', 'développement significatif',
      'actuellement', '', 'commencer ce processus', 'utiliser les capacités',
      'améliorer', 'utiliser', '', '', ''
    ],
  },
  'Spanish': {
    patterns: [
      /\bsumerjámonos\b/gi,
      /\bgame-?changer\b/gi,
      /\ben el (rápido|digital|moderno) mundo de hoy\b/gi,
      /\bes (importante|útil|crucial) (notar|mencionar) que\b/gi,
      /\bemprender (este|un) viaje\b/gi,
      /\bdesbloquear el (potencial|poder)\b/gi,
      /\bllevar(lo)? al siguiente nivel\b/gi,
      /\baprovechar el poder de\b/gi,
      /\ben conclusión,?\s*/gi,
      /\bpara resumir,?\s*/gi,
      /\bal final del día\b/gi,
    ],
    replacements: [
      '', 'desarrollo significativo',
      'actualmente', '', 'iniciar este proceso', 'utilizar las capacidades',
      'mejorar', 'utilizar', '', '', ''
    ],
  },
};

/**
 * Audit Rule Definitions
 * Organized by category for the unified audit system
 */

// =============================================================================
// CONTENT COMPLETENESS RULES
// =============================================================================
const contentCompletenessRules: AuditRule[] = [
  {
    id: 'content-no-briefs',
    name: 'Topics without content briefs',
    severity: 'warning',
    category: 'content-completeness',
    description: 'Core topics should have content briefs generated for content planning',
  },
  {
    id: 'content-empty-headings',
    name: 'Content briefs with empty headings',
    severity: 'warning',
    category: 'content-completeness',
    description: 'Content briefs should have H2/H3 headings defined for structure',
  },
  {
    id: 'content-missing-serp',
    name: 'Missing SERP analysis',
    severity: 'suggestion',
    category: 'content-completeness',
    description: 'Content briefs should include SERP analysis for competitive insights',
  },
  {
    id: 'content-no-target-keywords',
    name: 'No target keywords defined',
    severity: 'warning',
    category: 'content-completeness',
    description: 'Topics should have primary and secondary keywords defined',
  },
  {
    id: 'content-missing-intent',
    name: 'Search intent not specified',
    severity: 'suggestion',
    category: 'content-completeness',
    description: 'Topics should have search intent (informational, transactional, etc.) specified',
  },
];

// =============================================================================
// HIERARCHY STRUCTURE RULES
// =============================================================================
const hierarchyStructureRules: AuditRule[] = [
  {
    id: 'hierarchy-orphan-topics',
    name: 'Orphaned topics (no parent)',
    severity: 'critical',
    category: 'hierarchy-structure',
    description: 'Topics without a parent pillar break the topical map structure',
  },
  {
    id: 'hierarchy-deep-nesting',
    name: 'Excessive topic depth',
    severity: 'warning',
    category: 'hierarchy-structure',
    description: 'Topics nested more than 3 levels deep may be hard to navigate',
  },
  {
    id: 'hierarchy-pillar-imbalance',
    name: 'Unbalanced pillar content',
    severity: 'suggestion',
    category: 'hierarchy-structure',
    description: 'Pillars should have a balanced number of supporting topics',
  },
  {
    id: 'hierarchy-missing-pillars',
    name: 'No pillar pages defined',
    severity: 'critical',
    category: 'hierarchy-structure',
    description: 'Topical map needs at least one pillar for proper structure',
  },
  {
    id: 'hierarchy-circular-reference',
    name: 'Circular parent-child references',
    severity: 'critical',
    category: 'hierarchy-structure',
    description: 'Topics cannot be their own parent or create circular references',
  },
];

// =============================================================================
// INTERNAL LINKING RULES
// =============================================================================
const internalLinkingRules: AuditRule[] = [
  {
    id: 'linking-orphan-pages',
    name: 'Pages with no internal links',
    severity: 'critical',
    category: 'internal-linking',
    description: 'Every page should have at least one internal link pointing to it',
  },
  {
    id: 'linking-broken-links',
    name: 'Broken internal links',
    severity: 'critical',
    category: 'internal-linking',
    description: 'Internal links pointing to non-existent pages',
  },
  {
    id: 'linking-generic-anchors',
    name: 'Generic anchor text usage',
    severity: 'warning',
    category: 'internal-linking',
    description: 'Avoid "click here", "read more" - use descriptive anchor text',
  },
  {
    id: 'linking-excessive-links',
    name: 'Too many links per page',
    severity: 'warning',
    category: 'internal-linking',
    description: 'Pages should not exceed 150 internal links',
  },
  {
    id: 'linking-anchor-repetition',
    name: 'Same anchor text used excessively',
    severity: 'warning',
    category: 'internal-linking',
    description: 'Same anchor text should not be used more than 3 times for one target',
  },
  {
    id: 'linking-missing-contextual-bridge',
    name: 'Missing contextual bridges',
    severity: 'suggestion',
    category: 'internal-linking',
    description: 'Distant topics need bridge content for smooth user flow',
  },
];

// =============================================================================
// NAVIGATION STRUCTURE RULES
// =============================================================================
const navigationStructureRules: AuditRule[] = [
  {
    id: 'nav-missing-header',
    name: 'Header navigation not defined',
    severity: 'critical',
    category: 'navigation-structure',
    description: 'Website needs header navigation for primary access to key pages',
  },
  {
    id: 'nav-missing-footer',
    name: 'Footer navigation not defined',
    severity: 'warning',
    category: 'navigation-structure',
    description: 'Footer should include important links for E-A-T signals',
  },
  {
    id: 'nav-excessive-header-items',
    name: 'Too many header navigation items',
    severity: 'warning',
    category: 'navigation-structure',
    description: 'Header navigation should have maximum 10 items for usability',
  },
  {
    id: 'nav-missing-eat-links',
    name: 'Missing E-A-T footer links',
    severity: 'warning',
    category: 'navigation-structure',
    description: 'Footer should include About, Privacy, and Contact links',
  },
  {
    id: 'nav-duplicate-anchors',
    name: 'Duplicate anchor text in header/footer',
    severity: 'suggestion',
    category: 'navigation-structure',
    description: 'Header and footer should use different anchor text for same destinations',
  },
];

// =============================================================================
// SEMANTIC CONSISTENCY RULES
// =============================================================================
const semanticConsistencyRules: AuditRule[] = [
  {
    id: 'semantic-missing-eavs',
    name: 'No EAV triples defined',
    severity: 'warning',
    category: 'semantic-consistency',
    description: 'Topics should have Entity-Attribute-Value semantic triples for clarity',
  },
  {
    id: 'semantic-inconsistent-entities',
    name: 'Inconsistent entity naming',
    severity: 'warning',
    category: 'semantic-consistency',
    description: 'Same entity should use consistent naming across topics',
  },
  {
    id: 'semantic-missing-schema',
    name: 'Missing structured data suggestions',
    severity: 'suggestion',
    category: 'semantic-consistency',
    description: 'Content briefs should recommend appropriate schema.org types',
  },
  {
    id: 'semantic-conflicting-attributes',
    name: 'Conflicting attribute values',
    severity: 'warning',
    category: 'semantic-consistency',
    description: 'Same entity-attribute pairs should not have conflicting values',
  },
  {
    id: 'semantic-low-eav-density',
    name: 'Low EAV density per topic',
    severity: 'suggestion',
    category: 'semantic-consistency',
    description: 'Topics should have at least 3 EAV triples for comprehensive semantic coverage',
  },
  {
    id: 'semantic-missing-categories',
    name: 'Missing EAV categories',
    severity: 'suggestion',
    category: 'semantic-consistency',
    description: 'EAV triples should cover UNIQUE, ROOT, RARE, and COMMON categories for authority',
  },
  {
    id: 'semantic-predicate-diversity',
    name: 'Low predicate diversity',
    severity: 'suggestion',
    category: 'semantic-consistency',
    description: 'EAV triples should use diverse predicates (TYPE, COMPONENT, BENEFIT, RISK, PROCESS, SPECIFICATION)',
  },
  {
    id: 'semantic-orphan-eavs',
    name: 'EAVs not linked to topics',
    severity: 'warning',
    category: 'semantic-consistency',
    description: 'EAV triples should be associated with specific topics for content planning',
  },
];

// =============================================================================
// FOUNDATION PAGES RULES
// =============================================================================
const foundationPagesRules: AuditRule[] = [
  {
    id: 'foundation-missing-homepage',
    name: 'No homepage defined',
    severity: 'critical',
    category: 'foundation-pages',
    description: 'Website needs a homepage as the central hub',
  },
  {
    id: 'foundation-missing-about',
    name: 'No about page defined',
    severity: 'warning',
    category: 'foundation-pages',
    description: 'About page is essential for E-A-T signals',
  },
  {
    id: 'foundation-missing-contact',
    name: 'No contact page defined',
    severity: 'warning',
    category: 'foundation-pages',
    description: 'Contact page builds trust and credibility',
  },
  {
    id: 'foundation-incomplete-nap',
    name: 'Incomplete NAP information',
    severity: 'warning',
    category: 'foundation-pages',
    description: 'Name, Address, Phone should be complete for local SEO',
  },
  {
    id: 'foundation-missing-service-pages',
    name: 'No service/product pages',
    severity: 'suggestion',
    category: 'foundation-pages',
    description: 'Commercial sites should have dedicated service or product pages',
  },
];

// =============================================================================
// AUDIT CATEGORIES CONFIGURATION
// =============================================================================
export const AUDIT_CATEGORIES: AuditCategory[] = [
  {
    id: 'content-completeness',
    name: 'Content Completeness',
    rules: contentCompletenessRules,
    weight: 25,  // 25% of overall score
  },
  {
    id: 'hierarchy-structure',
    name: 'Hierarchy Structure',
    rules: hierarchyStructureRules,
    weight: 20,  // 20% of overall score
  },
  {
    id: 'internal-linking',
    name: 'Internal Linking',
    rules: internalLinkingRules,
    weight: 20,  // 20% of overall score
  },
  {
    id: 'navigation-structure',
    name: 'Navigation Structure',
    rules: navigationStructureRules,
    weight: 15,  // 15% of overall score
  },
  {
    id: 'semantic-consistency',
    name: 'Semantic Consistency',
    rules: semanticConsistencyRules,
    weight: 10,  // 10% of overall score
  },
  {
    id: 'foundation-pages',
    name: 'Foundation Pages',
    rules: foundationPagesRules,
    weight: 10,  // 10% of overall score
  },
];

// =============================================================================
// SEVERITY CONFIGURATION
// =============================================================================
export const SEVERITY_PENALTIES = {
  critical: 15,   // -15 points per critical issue
  warning: 5,     // -5 points per warning
  suggestion: 1,  // -1 point per suggestion
} as const;

export const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-900/20', text: 'text-red-300', border: 'border-red-700' },
  warning: { bg: 'bg-yellow-900/20', text: 'text-yellow-300', border: 'border-yellow-700' },
  suggestion: { bg: 'bg-blue-900/20', text: 'text-blue-300', border: 'border-blue-700' },
} as const;

// =============================================================================
// AUTO-FIX CONFIGURATION
// =============================================================================
export const FIX_THRESHOLDS = {
  autoApply: 90,      // Auto-apply fixes with confidence >= 90%
  suggest: 70,        // Show as suggestion for confidence >= 70%
  requireReview: 0,   // Always require review below 70%
} as const;

// Rules that can be auto-fixed
// NOTE: Only include rules that have WORKING auto-fix implementations
// For Health Check, we show info only - no broken "Fix" buttons
export const AUTO_FIXABLE_RULES: Record<string, {
  fixType: 'auto' | 'ai-assisted' | 'manual';
  description: string;
  isLanguageAware?: boolean; // If true, use getLanguagePatterns() instead of static patterns
  patterns?: RegExp[];
  replacements?: string[];
}> = {
  // =========================================================================
  // AUTOMATIC FIXES (Simple pattern replacements) - LANGUAGE-AWARE
  // =========================================================================
  'Stop Word Removal': {
    fixType: 'auto',
    description: 'Remove filler words (language-aware)',
    isLanguageAware: true, // Uses STOP_WORD_PATTERNS based on content language
  },

  'LLM Phrase Detection': {
    fixType: 'auto',
    description: 'Remove common AI-generated phrases (language-aware)',
    isLanguageAware: true, // Uses LLM_PHRASE_PATTERNS based on content language
  },

  // =========================================================================
  // AI-ASSISTED FIXES (Require AI rewrite for context-aware changes)
  // =========================================================================
  'Generic Headings': {
    fixType: 'ai-assisted',
    description: 'Replace generic headings like "Introduction" with topic-specific ones',
  },

  'Passive Voice': {
    fixType: 'ai-assisted',
    description: 'Rewrite passive voice sentences to active voice',
  },

  'Modality Certainty': {
    fixType: 'ai-assisted',
    description: 'Replace uncertain language ("can be", "might be") with definitive statements',
  },

  'Subject Positioning': {
    fixType: 'ai-assisted',
    description: 'Rewrite sentences to position the central entity as the grammatical subject',
  },

  'Heading-Entity Alignment': {
    fixType: 'ai-assisted',
    description: 'Update headings to include terms from the central entity',
  },

  'First Sentence Precision': {
    fixType: 'ai-assisted',
    description: 'Rewrite first sentence to include a definitive verb (is, are, means)',
  },

  'Centerpiece Annotation': {
    fixType: 'ai-assisted',
    description: 'Ensure core definition appears in first 400 characters',
  },
};

/**
 * Get patterns for a specific rule in a specific language
 * Falls back to English if the language is not supported
 */
export const getLanguagePatterns = (
  ruleName: string,
  language: string | undefined | null
): { patterns: RegExp[]; replacements: string[] } | null => {
  const langName = getLanguageName(language);

  if (ruleName === 'Stop Word Removal') {
    return STOP_WORD_PATTERNS[langName] || STOP_WORD_PATTERNS['English'];
  }

  if (ruleName === 'LLM Phrase Detection') {
    return LLM_PHRASE_PATTERNS[langName] || LLM_PHRASE_PATTERNS['English'];
  }

  return null;
};

/**
 * Get supported languages for auto-fix patterns
 */
export const getSupportedLanguages = (): string[] => {
  return Object.keys(STOP_WORD_PATTERNS);
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Apply automatic pattern-based fix to content
 * Only works for rules with fixType: 'auto'
 *
 * @param ruleName - Name of the rule to apply
 * @param content - Content to fix
 * @param language - Language code or name (e.g., 'nl', 'Dutch', 'en', 'English')
 */
export const applyAutomaticFix = (
  ruleName: string,
  content: string,
  language?: string | null
): { fixed: string; changesCount: number; changes: string[]; languageUsed: string } => {
  const rule = AUTO_FIXABLE_RULES[ruleName];

  if (!rule || rule.fixType !== 'auto') {
    return { fixed: content, changesCount: 0, changes: [], languageUsed: 'N/A' };
  }

  let patterns: RegExp[];
  let replacements: string[];
  let languageUsed: string;

  // Get language-specific patterns for language-aware rules
  if (rule.isLanguageAware) {
    const langPatterns = getLanguagePatterns(ruleName, language);
    if (!langPatterns) {
      return { fixed: content, changesCount: 0, changes: [], languageUsed: 'N/A' };
    }
    patterns = langPatterns.patterns;
    replacements = langPatterns.replacements;
    languageUsed = getLanguageName(language);
  } else if (rule.patterns) {
    // Use static patterns for non-language-aware rules
    patterns = rule.patterns;
    replacements = rule.replacements || [];
    languageUsed = 'N/A (language-independent)';
  } else {
    return { fixed: content, changesCount: 0, changes: [], languageUsed: 'N/A' };
  }

  let fixed = content;
  let changesCount = 0;
  const changes: string[] = [];

  patterns.forEach((pattern, index) => {
    const replacement = replacements[index] ?? '';
    const matches = fixed.match(pattern);

    if (matches && matches.length > 0) {
      changesCount += matches.length;
      changes.push(`Replaced ${matches.length}x: "${matches[0]}" → "${replacement || '(removed)'}"`);
      fixed = fixed.replace(pattern, replacement);
    }
  });

  return { fixed, changesCount, changes, languageUsed };
};

/**
 * Apply all automatic fixes to content
 * Applies fixes for all rules with fixType: 'auto'
 *
 * @param content - Content to fix
 * @param language - Language code or name (e.g., 'nl', 'Dutch', 'en', 'English')
 */
export const applyAllAutomaticFixes = (
  content: string,
  language?: string | null
): { fixed: string; totalChanges: number; changesByRule: Record<string, string[]>; languageUsed: string } => {
  let fixed = content;
  let totalChanges = 0;
  const changesByRule: Record<string, string[]> = {};
  const languageUsed = getLanguageName(language);

  Object.entries(AUTO_FIXABLE_RULES)
    .filter(([_, rule]) => rule.fixType === 'auto')
    .forEach(([ruleName]) => {
      const result = applyAutomaticFix(ruleName, fixed, language);
      if (result.changesCount > 0) {
        fixed = result.fixed;
        totalChanges += result.changesCount;
        changesByRule[ruleName] = result.changes;
      }
    });

  return { fixed, totalChanges, changesByRule, languageUsed };
};

/**
 * Check if a rule can be automatically fixed (without AI)
 */
export const canAutoFix = (ruleName: string): boolean => {
  const rule = AUTO_FIXABLE_RULES[ruleName];
  return rule?.fixType === 'auto' && (rule.isLanguageAware || Boolean(rule.patterns));
};

/**
 * Check if a rule requires AI-assisted fix
 */
export const requiresAIFix = (ruleName: string): boolean => {
  const rule = AUTO_FIXABLE_RULES[ruleName];
  return rule?.fixType === 'ai-assisted';
};

/**
 * Get all rules as a flat array
 */
export const getAllRules = (): AuditRule[] => {
  return AUDIT_CATEGORIES.flatMap(category => category.rules);
};

/**
 * Get rule by ID
 */
export const getRuleById = (ruleId: string): AuditRule | undefined => {
  return getAllRules().find(rule => rule.id === ruleId);
};

/**
 * Get category by ID
 */
export const getCategoryById = (categoryId: string): AuditCategory | undefined => {
  return AUDIT_CATEGORIES.find(category => category.id === categoryId);
};

/**
 * Check if a rule is auto-fixable
 */
export const isAutoFixable = (ruleId: string): boolean => {
  return ruleId in AUTO_FIXABLE_RULES;
};

/**
 * Get fix info for a rule
 */
export const getFixInfo = (ruleId: string) => {
  return AUTO_FIXABLE_RULES[ruleId];
};

/**
 * Calculate category score based on issues
 */
export const calculateCategoryScore = (
  issues: { severity: AuditSeverity }[]
): number => {
  let score = 100;
  for (const issue of issues) {
    score -= SEVERITY_PENALTIES[issue.severity];
  }
  return Math.max(0, score);
};

/**
 * Calculate overall audit score
 */
export const calculateOverallScore = (
  categoryResults: { score: number; weight: number }[]
): number => {
  const totalWeight = categoryResults.reduce((sum, cat) => sum + cat.weight, 0);
  if (totalWeight === 0) return 100;

  const weightedSum = categoryResults.reduce(
    (sum, cat) => sum + (cat.score * cat.weight),
    0
  );

  return Math.round(weightedSum / totalWeight);
};

export default {
  AUDIT_CATEGORIES,
  SEVERITY_PENALTIES,
  SEVERITY_COLORS,
  FIX_THRESHOLDS,
  AUTO_FIXABLE_RULES,
  // Multilingual pattern maps
  STOP_WORD_PATTERNS,
  LLM_PHRASE_PATTERNS,
  getAllRules,
  getRuleById,
  getCategoryById,
  isAutoFixable,
  getFixInfo,
  calculateCategoryScore,
  calculateOverallScore,
  // Auto-fix utilities (language-aware)
  applyAutomaticFix,
  applyAllAutomaticFixes,
  canAutoFix,
  requiresAIFix,
  getLanguagePatterns,
  getSupportedLanguages,
};
