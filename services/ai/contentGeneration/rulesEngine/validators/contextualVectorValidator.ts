// services/ai/contentGeneration/rulesEngine/validators/contextualVectorValidator.ts

import { ValidationViolation, SectionGenerationContext, BriefSection } from '../../../../../types';
import { getLanguageName } from '../../../../../utils/languageUtils';

/**
 * Contextual Vector Validator
 *
 * Validates that heading flow follows a logical "contextual vector" progression:
 * Definition → Attributes → Details → Application → Conclusion
 *
 * Based on Holistic SEO principles where content should flow from:
 * - Macro context (what is X) → Micro context (specific details)
 * - Abstract concepts → Concrete applications
 * - Foundational knowledge → Advanced topics
 */

// Section type classifications for flow analysis
type SectionType = 'definition' | 'attribute' | 'detail' | 'application' | 'comparison' | 'conclusion' | 'unknown';

/**
 * Multilingual section type patterns
 * Supports: English, Dutch, German, French, Spanish
 */
interface LanguageSectionPatterns {
  definition: RegExp[];
  attribute: RegExp[];
  detail: RegExp[];
  application: RegExp[];
  comparison: RegExp[];
  conclusion: RegExp[];
}

const MULTILINGUAL_SECTION_PATTERNS: Record<string, LanguageSectionPatterns> = {
  'English': {
    definition: [
      /^what\s+is/i,
      /^what\s+are/i,
      /^definition/i,
      /^understanding/i,
      /:\s*(an?\s+)?overview/i,
      /^introduct/i,
      /^meaning\s+of/i,
      /^about/i,
    ],
    attribute: [
      /^(characteristics|features|properties)/i,
      /^(benefits|advantages|pros)/i,
      /^(drawbacks|disadvantages|cons)/i,
      /^(types|kinds|categories)/i,
      /^(components|parts|elements)/i,
      /^(qualities|traits)/i,
    ],
    detail: [
      /^how\s+(does|do|it)\s+work/i,
      /^why/i,
      /^when/i,
      /^technical/i,
      /^specifications?/i,
      /^process/i,
      /^steps?\s+(to|for)/i,
      /^mechanism/i,
    ],
    application: [
      /^how\s+to\s+(use|apply)/i,
      /^(applications|uses|usage)/i,
      /^examples?/i,
      /^(using|implementation|implementing)/i,
      /^(tips|best\s+practices)/i,
      /^practical/i,
      /^in\s+practice/i,
    ],
    comparison: [
      /^(comparison|comparing)/i,
      /^vs\.?($|\s)/i,
      /^versus/i,
      /^alternatives?/i,
      /^difference/i,
      /\s+vs\.?\s+/i,
    ],
    conclusion: [
      /^conclusion/i,
      /^summary/i,
      /^final\s+thoughts/i,
      /^wrap.?up/i,
      /^takeaways?/i,
      /^in\s+summary/i,
    ],
  },

  'Dutch': {
    definition: [
      /^wat\s+is/i,
      /^wat\s+zijn/i,
      /^definitie/i,
      /^begrijpen/i,
      /:\s*(een\s+)?overzicht/i,
      /^inleiding/i,
      /^introductie/i,
      /^betekenis\s+van/i,
      /^over\s+/i,
    ],
    attribute: [
      /^(kenmerken|eigenschappen)/i,
      /^(voordelen|pluspunten)/i,
      /^(nadelen|minpunten)/i,
      /^(typen|soorten|categorieën)/i,
      /^(componenten|onderdelen|elementen)/i,
      /^(kwaliteiten|karakteristieken)/i,
    ],
    detail: [
      /^hoe\s+werkt/i,
      /^waarom/i,
      /^wanneer/i,
      /^technische?/i,
      /^specificaties?/i,
      /^proces/i,
      /^stappen/i,
      /^mechanisme/i,
      /^werking/i,
    ],
    application: [
      /^hoe\s+(te\s+)?gebruiken/i,
      /^(toepassingen|gebruik)/i,
      /^voorbeelden?/i,
      /^(implementatie|toepassen)/i,
      /^(tips|beste\s+praktijken)/i,
      /^praktisch/i,
      /^in\s+de\s+praktijk/i,
    ],
    comparison: [
      /^vergelijking/i,
      /^vs\.?($|\s)/i,
      /^versus/i,
      /^alternatieven?/i,
      /^verschil/i,
      /\s+vs\.?\s+/i,
      /^tegenover/i,
    ],
    conclusion: [
      /^conclusie/i,
      /^samenvatting/i,
      /^slotwoord/i,
      /^afsluiting/i,
      /^tot\s+slot/i,
      /^samenvattend/i,
    ],
  },

  'German': {
    definition: [
      /^was\s+ist/i,
      /^was\s+sind/i,
      /^definition/i,
      /^verstehen/i,
      /:\s*(ein\s+)?überblick/i,
      /^einleitung/i,
      /^einführung/i,
      /^bedeutung\s+von/i,
      /^über\s+/i,
    ],
    attribute: [
      /^(merkmale|eigenschaften)/i,
      /^(vorteile|pluspunkte)/i,
      /^(nachteile|minuspunkte)/i,
      /^(typen|arten|kategorien)/i,
      /^(komponenten|bestandteile|elemente)/i,
      /^(qualitäten|charakteristiken)/i,
    ],
    detail: [
      /^wie\s+funktioniert/i,
      /^warum/i,
      /^wann/i,
      /^technische?/i,
      /^spezifikationen?/i,
      /^prozess/i,
      /^schritte/i,
      /^mechanismus/i,
      /^funktionsweise/i,
    ],
    application: [
      /^wie\s+(man\s+)?verwendet/i,
      /^wie\s+benutzt\s+man/i,
      /^(anwendungen|nutzung|verwendung)/i,
      /^beispiele?/i,
      /^(implementierung|umsetzen)/i,
      /^(tipps|best\s+practices)/i,
      /^praktisch/i,
      /^in\s+der\s+praxis/i,
    ],
    comparison: [
      /^vergleich/i,
      /^vs\.?($|\s)/i,
      /^versus/i,
      /^alternativen?/i,
      /^unterschied/i,
      /\s+vs\.?\s+/i,
      /^gegenüber/i,
    ],
    conclusion: [
      /^(fazit|schluss|schlussfolgerung)/i,
      /^zusammenfassung/i,
      /^schlusswort/i,
      /^abschluss/i,
      /^zum\s+schluss/i,
      /^zusammenfassend/i,
    ],
  },

  'French': {
    definition: [
      /^qu['']?est.ce\s+que/i,
      /^que\s+(sont|est)/i,
      /^définition/i,
      /^comprendre/i,
      /:\s*(un\s+)?aperçu/i,
      /^introduction/i,
      /^signification\s+de/i,
      /^à\s+propos/i,
    ],
    attribute: [
      /^(caractéristiques|propriétés)/i,
      /^(avantages|bénéfices|atouts)/i,
      /^(inconvénients|désavantages)/i,
      /^(types|sortes|catégories)/i,
      /^(composants|éléments|parties)/i,
      /^(qualités|traits)/i,
    ],
    detail: [
      /^comment\s+(ça\s+)?fonctionne/i,
      /^pourquoi/i,
      /^quand/i,
      /^technique/i,
      /^spécifications?/i,
      /^processus/i,
      /^étapes?/i,
      /^mécanisme/i,
      /^fonctionnement/i,
    ],
    application: [
      /^comment\s+utiliser/i,
      /^(applications|utilisations|usage)/i,
      /^exemples?/i,
      /^(implémentation|mise\s+en\s+œuvre)/i,
      /^(conseils|meilleures\s+pratiques)/i,
      /^pratique/i,
      /^en\s+pratique/i,
    ],
    comparison: [
      /^comparaison/i,
      /^vs\.?($|\s)/i,
      /^versus/i,
      /^alternatives?/i,
      /^différence/i,
      /\s+vs\.?\s+/i,
      /^par\s+rapport\s+à/i,
    ],
    conclusion: [
      /^conclusion/i,
      /^résumé/i,
      /^mot\s+de\s+la\s+fin/i,
      /^pour\s+conclure/i,
      /^en\s+résumé/i,
      /^synthèse/i,
    ],
  },

  'Spanish': {
    definition: [
      /^qué\s+es/i,
      /^qué\s+son/i,
      /^definición/i,
      /^entender/i,
      /^comprender/i,
      /:\s*(una?\s+)?visión\s+general/i,
      /^introducción/i,
      /^significado\s+de/i,
      /^acerca\s+de/i,
    ],
    attribute: [
      /^(características|propiedades)/i,
      /^(ventajas|beneficios)/i,
      /^(desventajas|inconvenientes)/i,
      /^(tipos|clases|categorías)/i,
      /^(componentes|elementos|partes)/i,
      /^(cualidades|rasgos)/i,
    ],
    detail: [
      /^cómo\s+funciona/i,
      /^por\s+qué/i,
      /^cuándo/i,
      /^técnico/i,
      /^especificaciones?/i,
      /^proceso/i,
      /^pasos?/i,
      /^mecanismo/i,
      /^funcionamiento/i,
    ],
    application: [
      /^cómo\s+(usar|utilizar|aplicar)/i,
      /^(aplicaciones|usos|uso)/i,
      /^ejemplos?/i,
      /^(implementación|puesta\s+en\s+práctica)/i,
      /^(consejos|mejores\s+prácticas)/i,
      /^práctico/i,
      /^en\s+la\s+práctica/i,
    ],
    comparison: [
      /^comparación/i,
      /^vs\.?($|\s)/i,
      /^versus/i,
      /^alternativas?/i,
      /^diferencia/i,
      /\s+vs\.?\s+/i,
      /^frente\s+a/i,
    ],
    conclusion: [
      /^conclusión/i,
      /^resumen/i,
      /^palabras\s+finales/i,
      /^para\s+concluir/i,
      /^en\s+resumen/i,
      /^síntesis/i,
    ],
  },
};

/**
 * Get section type patterns for a specific language
 * Falls back to English patterns for unsupported languages
 */
function getSectionPatterns(language?: string): LanguageSectionPatterns {
  const langName = getLanguageName(language);
  return MULTILINGUAL_SECTION_PATTERNS[langName] || MULTILINGUAL_SECTION_PATTERNS['English'];
}

/**
 * Get combined patterns for all supported languages (for language-agnostic matching)
 */
function getAllLanguagePatterns(): LanguageSectionPatterns {
  const combined: LanguageSectionPatterns = {
    definition: [],
    attribute: [],
    detail: [],
    application: [],
    comparison: [],
    conclusion: [],
  };

  for (const patterns of Object.values(MULTILINGUAL_SECTION_PATTERNS)) {
    combined.definition.push(...patterns.definition);
    combined.attribute.push(...patterns.attribute);
    combined.detail.push(...patterns.detail);
    combined.application.push(...patterns.application);
    combined.comparison.push(...patterns.comparison);
    combined.conclusion.push(...patterns.conclusion);
  }

  return combined;
}

// Expected flow order (lower number = earlier in article)
const SECTION_TYPE_ORDER: Record<SectionType, number> = {
  definition: 1,
  attribute: 2,
  detail: 3,
  application: 4,
  comparison: 5,
  conclusion: 6,
  unknown: 3, // Unknown sections are neutral
};

interface HeadingInfo {
  heading: string;
  type: SectionType;
  order: number;
  level: number;
}

export interface ContextualVectorResult {
  isCoherent: boolean;
  flowScore: number; // 0-100
  issues: ContextualVectorIssue[];
  headingAnalysis: HeadingInfo[];
}

export interface ContextualVectorIssue {
  heading: string;
  issue: 'out_of_order' | 'topic_jump' | 'missing_foundation' | 'premature_detail';
  description: string;
  severity: 'warning' | 'error';
  suggestion: string;
}

export class ContextualVectorValidator {
  /**
   * Classify a heading into a section type
   * @param heading - The heading text to classify
   * @param language - Optional ISO language code (e.g., 'nl', 'en', 'de', 'fr', 'es')
   */
  private static classifySectionType(heading: string, language?: string): SectionType {
    // Get language-specific patterns, or use all patterns if language not specified
    const patterns = language ? getSectionPatterns(language) : getAllLanguagePatterns();

    // Check each section type
    const sectionTypes: SectionType[] = ['definition', 'attribute', 'detail', 'application', 'comparison', 'conclusion'];

    for (const type of sectionTypes) {
      const typePatterns = patterns[type];
      if (typePatterns && typePatterns.some(pattern => pattern.test(heading))) {
        return type;
      }
    }

    return 'unknown';
  }

  /**
   * Extract headings from content
   * @param content - The content to extract headings from
   * @param language - Optional ISO language code for pattern matching
   */
  private static extractHeadings(content: string, language?: string): HeadingInfo[] {
    const headingRegex = /^(#{2,4})\s+(.+)$/gm;
    const headings: HeadingInfo[] = [];
    let match;
    let order = 0;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const heading = match[2].trim();
      const type = this.classifySectionType(heading, language);

      headings.push({
        heading,
        type,
        order: order++,
        level,
      });
    }

    return headings;
  }

  /**
   * Validate the contextual vector (heading flow) of an entire article
   * This is run at the article level, not section level
   * @param content - The article content to validate
   * @param centralEntity - The central entity/topic of the article
   * @param language - Optional ISO language code for multilingual pattern matching
   */
  static validateArticle(content: string, centralEntity: string, language?: string): ContextualVectorResult {
    const headings = this.extractHeadings(content, language);
    const issues: ContextualVectorIssue[] = [];

    if (headings.length < 2) {
      return {
        isCoherent: true,
        flowScore: 100,
        issues: [],
        headingAnalysis: headings,
      };
    }

    // Only analyze H2 level for main flow
    const h2Headings = headings.filter(h => h.level === 2);

    // Check 1: Definition should come early (if present)
    const definitionIndex = h2Headings.findIndex(h => h.type === 'definition');
    if (definitionIndex > 1) {
      issues.push({
        heading: h2Headings[definitionIndex].heading,
        issue: 'out_of_order',
        description: `Definition section "${h2Headings[definitionIndex].heading}" appears at position ${definitionIndex + 1}, should be first or second`,
        severity: 'warning',
        suggestion: `Move definition section to the beginning of the article, right after any introduction`,
      });
    }

    // Check 2: Conclusion should be last (if present)
    const conclusionIndex = h2Headings.findIndex(h => h.type === 'conclusion');
    if (conclusionIndex !== -1 && conclusionIndex < h2Headings.length - 1) {
      issues.push({
        heading: h2Headings[conclusionIndex].heading,
        issue: 'out_of_order',
        description: `Conclusion section "${h2Headings[conclusionIndex].heading}" is not at the end`,
        severity: 'warning',
        suggestion: `Move conclusion section to the end of the article`,
      });
    }

    // Check 3: Application/examples should come after attributes/details
    const applicationIndex = h2Headings.findIndex(h => h.type === 'application');
    const firstAttributeIndex = h2Headings.findIndex(h => h.type === 'attribute');

    if (applicationIndex !== -1 && firstAttributeIndex !== -1 && applicationIndex < firstAttributeIndex) {
      issues.push({
        heading: h2Headings[applicationIndex].heading,
        issue: 'premature_detail',
        description: `Application section "${h2Headings[applicationIndex].heading}" appears before attribute definitions`,
        severity: 'warning',
        suggestion: `Consider moving practical applications after explaining ${centralEntity}'s characteristics`,
      });
    }

    // Check 4: Major topic jumps (going from definition to conclusion without details)
    const typesPresent = new Set(h2Headings.map(h => h.type));
    if (typesPresent.has('definition') && typesPresent.has('conclusion')) {
      const hasMiddleContent = typesPresent.has('attribute') || typesPresent.has('detail') || typesPresent.has('application');
      if (!hasMiddleContent) {
        issues.push({
          heading: 'Article structure',
          issue: 'missing_foundation',
          description: `Article jumps from definition to conclusion without substantive content`,
          severity: 'error',
          suggestion: `Add sections explaining ${centralEntity}'s attributes, details, or practical applications`,
        });
      }
    }

    // Check 5: Logical flow score based on sequential type ordering
    let flowViolations = 0;
    for (let i = 1; i < h2Headings.length; i++) {
      const prev = h2Headings[i - 1];
      const curr = h2Headings[i];

      // Skip unknown types in flow analysis
      if (prev.type === 'unknown' || curr.type === 'unknown') continue;

      const prevOrder = SECTION_TYPE_ORDER[prev.type];
      const currOrder = SECTION_TYPE_ORDER[curr.type];

      // Allow same level or forward progression
      // Flag if going backwards more than 1 level (e.g., detail → definition)
      if (currOrder < prevOrder - 1) {
        flowViolations++;
        issues.push({
          heading: curr.heading,
          issue: 'topic_jump',
          description: `Section "${curr.heading}" (${curr.type}) follows "${prev.heading}" (${prev.type}), which breaks logical flow`,
          severity: 'warning',
          suggestion: `Consider reordering so ${curr.type} sections appear before ${prev.type} sections`,
        });
      }
    }

    // Calculate flow score
    const maxViolations = Math.max(h2Headings.length - 1, 1);
    const flowScore = Math.round(((maxViolations - flowViolations) / maxViolations) * 100);

    return {
      isCoherent: issues.filter(i => i.severity === 'error').length === 0,
      flowScore,
      issues,
      headingAnalysis: headings,
    };
  }

  /**
   * Validate a single section's heading for contextual appropriateness
   * Used during section generation
   * Automatically uses the language from context for multilingual support
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Get section heading and position
    const heading = context.section.heading || context.section.section_heading || '';
    const sectionOrder = context.section.order || 0;
    const totalSections = context.totalSections || 10;

    // Get language from context for multilingual pattern matching
    const language = context.language;

    if (!heading) return violations;

    const sectionType = this.classifySectionType(heading, language);
    const expectedOrder = SECTION_TYPE_ORDER[sectionType];

    // Check: Definition-type headings should be in first third of article
    if (sectionType === 'definition' && sectionOrder > totalSections / 3) {
      violations.push({
        rule: 'CONTEXTUAL_VECTOR_LATE_DEFINITION',
        text: heading,
        position: 0,
        suggestion: `Definition section "${heading}" appears late in article (position ${sectionOrder + 1}/${totalSections}). Consider moving to the beginning.`,
        severity: 'warning',
      });
    }

    // Check: Conclusion-type headings should be in last quarter
    if (sectionType === 'conclusion' && sectionOrder < totalSections * 0.75) {
      violations.push({
        rule: 'CONTEXTUAL_VECTOR_EARLY_CONCLUSION',
        text: heading,
        position: 0,
        suggestion: `Conclusion section "${heading}" appears too early (position ${sectionOrder + 1}/${totalSections}). Move to end of article.`,
        severity: 'warning',
      });
    }

    // Check: Application sections without prior definition context
    if (sectionType === 'application' && sectionOrder < 2) {
      violations.push({
        rule: 'CONTEXTUAL_VECTOR_PREMATURE_APPLICATION',
        text: heading,
        position: 0,
        suggestion: `Application section "${heading}" appears before establishing foundational knowledge. Add definition/attribute sections first.`,
        severity: 'warning',
      });
    }

    return violations;
  }
}

// Export for testing and direct use
export { MULTILINGUAL_SECTION_PATTERNS, getSectionPatterns, getAllLanguagePatterns };
