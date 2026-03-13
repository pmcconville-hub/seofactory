// services/ai/frameSemanticsAnalyzer.ts

/**
 * FrameSemanticsAnalyzer
 *
 * Maps topics to FrameNet-inspired semantic frames to identify
 * uncovered frames in a topical map. Helps ensure comprehensive
 * coverage of all aspects of a domain.
 *
 * A semantic frame represents a structured situation or event with
 * defined roles (frame elements). For SEO, ensuring all relevant
 * frames are covered means comprehensive topical authority.
 *
 * Supports multilingual topic matching via translated keyword synonyms.
 */

export interface SemanticFrame {
  /** Frame name */
  name: string;
  /** Frame description */
  description: string;
  /** Core frame elements (required roles) */
  coreElements: string[];
  /** Non-core frame elements (optional roles) */
  peripheralElements: string[];
}

export interface FrameCoverageResult {
  /** Frame being analyzed */
  frame: SemanticFrame;
  /** Coverage score (0-1) */
  coverage: number;
  /** Which core elements are covered */
  coveredCore: string[];
  /** Which core elements are missing */
  missingCore: string[];
  /** Which peripheral elements are covered */
  coveredPeripheral: string[];
}

export interface FrameAnalysisReport {
  /** Total frames analyzed */
  totalFrames: number;
  /** Frames with full core coverage */
  fullyCovered: number;
  /** Frames with partial coverage */
  partiallyCovered: number;
  /** Frames with no coverage */
  uncovered: number;
  /** Overall frame coverage score */
  overallCoverage: number;
  /** Per-frame results */
  frameResults: FrameCoverageResult[];
  /** Suggested topics for uncovered frames */
  suggestions: string[];
}

/**
 * Multilingual keywords per frame element for matching topic titles.
 * Maps each core/peripheral element to additional match keywords across languages.
 * Covers: EN, NL, DE, FR, ES (the supported content languages).
 */
const MULTILINGUAL_KEYWORDS: Record<string, string[]> = {
  // Definition frame
  'entity': ['entiteit', 'entité', 'entidad', 'was ist', 'wat is', 'qu\'est', 'qué es', 'definitie', 'definition', 'definición'],
  'category': ['categorie', 'kategorie', 'catégorie', 'categoría', 'soort', 'type', 'tipo', 'art'],
  'distinguishing features': ['kenmerken', 'eigenschappen', 'merkmale', 'caractéristiques', 'características', 'features'],
  'history': ['geschiedenis', 'historie', 'historisch', 'histoire', 'historia', 'geschicht'],
  'etymology': ['etymologie', 'herkomst', 'oorsprong', 'etymología', 'étymologie'],
  'alternative names': ['andere namen', 'synoniemen', 'andere bezeichnungen', 'noms alternatifs', 'sinónimos'],

  // Components frame
  'parts': ['onderdelen', 'delen', 'componenten', 'bestanddelen', 'teile', 'bestandteile', 'parties', 'composants', 'partes', 'componentes'],
  'relationships between parts': ['relaties', 'samenhang', 'structuur', 'beziehungen', 'struktur', 'relations', 'estructura'],
  'hierarchy': ['hiërarchie', 'hierarchie', 'hiérarchie', 'jerarquía', 'opbouw', 'aufbau'],
  'optional components': ['optioneel', 'optionale', 'optionnel', 'opcional', 'toebehoren', 'zubehör', 'accessoires'],
  'variations': ['variaties', 'varianten', 'variationen', 'variations', 'variaciones', 'soorten', 'types', 'arten'],

  // Process frame
  'steps': ['stappen', 'stappenplan', 'schritte', 'étapes', 'pasos', 'werkwijze', 'aanpak', 'procedure', 'verfahren'],
  'agent': ['uitvoerder', 'specialist', 'vakman', 'bedrijf', 'akteur', 'agent', 'agente', 'professional'],
  'goal': ['doel', 'resultaat', 'ziel', 'ergebnis', 'objectif', 'but', 'objetivo', 'resultado'],
  'tools': ['gereedschap', 'hulpmiddelen', 'werkzeuge', 'outils', 'herramientas', 'materiaal', 'benodigdheden'],
  'duration': ['duur', 'tijdsduur', 'looptijd', 'dauer', 'zeitraum', 'durée', 'duración', 'termijn'],
  'prerequisites': ['vereisten', 'voorwaarden', 'voraussetzungen', 'prérequis', 'requisitos', 'benodigdheden'],
  'outcomes': ['resultaten', 'uitkomsten', 'ergebnisse', 'résultats', 'resultados', 'opbrengst'],

  // Comparison frame
  'alternative': ['alternatief', 'alternatieven', 'alternative', 'alternativa', 'vergelijking', 'vergleich', 'comparaison', 'comparación', 'versus'],
  'differentiators': ['verschil', 'verschillen', 'onderscheid', 'unterschiede', 'différences', 'diferencias'],
  'use cases': ['toepassingen', 'gebruikssituaties', 'anwendungsfälle', 'cas d\'utilisation', 'casos de uso'],
  'trade-offs': ['afwegingen', 'voor en nadelen', 'kompromisse', 'compromis', 'compensaciones'],
  'scenarios': ['scenario', 'situatie', 'szenarien', 'scénarios', 'escenarios'],

  // Benefits frame
  'benefit': ['voordeel', 'voordelen', 'vorteil', 'vorteile', 'avantage', 'avantages', 'ventaja', 'ventajas', 'baat'],
  'beneficiary': ['begunstigde', 'gebruiker', 'nutznießer', 'bénéficiaire', 'beneficiario'],
  'mechanism': ['mechanisme', 'werking', 'mechanismus', 'mécanisme', 'mecanismo'],
  'evidence': ['bewijs', 'onderbouwing', 'nachweis', 'preuve', 'evidencia'],
  'quantification': ['kwantificering', 'cijfers', 'quantifizierung', 'quantification', 'cuantificación'],
  'conditions': ['voorwaarden', 'condities', 'bedingungen', 'conditions', 'condiciones'],

  // Risks frame
  'risk': ['risico', 'risico\'s', 'gevaar', 'gevaren', 'risiko', 'risiken', 'risque', 'risques', 'riesgo', 'riesgos', 'nadeel', 'nadelen'],
  'affected party': ['betrokkene', 'getroffen', 'betroffene', 'partie affectée', 'parte afectada'],
  'likelihood': ['waarschijnlijkheid', 'kans', 'wahrscheinlichkeit', 'probabilité', 'probabilidad'],
  'mitigation': ['beperking', 'mitigatie', 'maatregelen', 'minderung', 'atténuation', 'mitigación'],
  'severity': ['ernst', 'schwere', 'gravité', 'gravedad', 'impact'],
  'prevention': ['preventie', 'voorkomen', 'prävention', 'verhütung', 'prévention', 'prevención'],

  // Cost frame
  'price': ['prijs', 'kosten', 'tarief', 'tarieven', 'preis', 'kosten', 'prix', 'coût', 'precio', 'coste', 'kost'],
  'currency': ['valuta', 'währung', 'devise', 'moneda', 'euro', 'dollar'],
  'what is included': ['inbegrepen', 'inclusief', 'enthalten', 'inclus', 'incluido', 'pakket'],
  'discounts': ['korting', 'kortingen', 'rabatt', 'rabatte', 'réductions', 'descuentos'],
  'alternatives': ['alternatieven', 'alternativen', 'alternatives', 'alternativas'],
  'ROI': ['rendement', 'opbrengst', 'rendite', 'retour', 'retorno', 'besparing'],
  'payment options': ['betaalmogelijkheden', 'betaling', 'zahlungsoptionen', 'options de paiement', 'opciones de pago'],

  // Evaluation frame
  'criteria': ['criteria', 'maatstaven', 'kriterien', 'critères', 'criterios', 'eisen'],
  'measurement': ['meting', 'beoordeling', 'messung', 'bewertung', 'mesure', 'évaluation', 'medición', 'evaluación'],
  'standards': ['normen', 'standaarden', 'standards', 'normas', 'kwaliteitseisen', 'richtlijnen'],
  'best practices': ['best practices', 'richtlijnen', 'bewährte praktiken', 'meilleures pratiques', 'mejores prácticas', 'tips'],
  'benchmarks': ['benchmarks', 'referentie', 'referenzwerte', 'repères', 'puntos de referencia'],

  // Troubleshooting frame
  'problem': ['probleem', 'problemen', 'fout', 'storing', 'problem', 'fehler', 'problème', 'problèmes', 'problema', 'problemas'],
  'cause': ['oorzaak', 'oorzaken', 'ursache', 'ursachen', 'cause', 'causes', 'causa', 'causas', 'reden'],
  'solution': ['oplossing', 'oplossingen', 'lösung', 'lösungen', 'solution', 'solutions', 'solución', 'soluciones'],
  'when to seek help': ['wanneer hulp', 'hulp inschakelen', 'wann hilfe', 'quand demander', 'cuándo buscar'],
  'tools needed': ['benodigdheden', 'benodigd', 'werkzeuge', 'outils nécessaires', 'herramientas necesarias'],

  // Future frame
  'trend': ['trend', 'trends', 'ontwikkeling', 'ontwikkelingen', 'tendenz', 'tendenzen', 'tendance', 'tendances', 'tendencia', 'tendencias'],
  'timeline': ['tijdlijn', 'planning', 'zeitplan', 'chronologie', 'línea de tiempo', 'kalender'],
  'impact': ['impact', 'invloed', 'gevolgen', 'auswirkung', 'auswirkungen', 'effet', 'impacto'],
  'predictions': ['voorspellingen', 'prognose', 'vorhersagen', 'prognosen', 'prédictions', 'predicciones'],
  'emerging technologies': ['nieuwe technologieën', 'innovatie', 'neue technologien', 'technologies émergentes', 'tecnologías emergentes'],
  'preparation': ['voorbereiding', 'vorbereitung', 'préparation', 'preparación'],
};

/**
 * Generic semantic frames applicable to many domains.
 * These represent common information needs around any entity.
 */
const GENERIC_FRAMES: SemanticFrame[] = [
  {
    name: 'Definition',
    description: 'What the entity is',
    coreElements: ['entity', 'category', 'distinguishing features'],
    peripheralElements: ['history', 'etymology', 'alternative names'],
  },
  {
    name: 'Components',
    description: 'Parts and structure of the entity',
    coreElements: ['parts', 'relationships between parts', 'hierarchy'],
    peripheralElements: ['optional components', 'variations'],
  },
  {
    name: 'Process',
    description: 'How the entity works or is used',
    coreElements: ['steps', 'agent', 'goal'],
    peripheralElements: ['tools', 'duration', 'prerequisites', 'outcomes'],
  },
  {
    name: 'Comparison',
    description: 'How the entity differs from alternatives',
    coreElements: ['entity', 'alternative', 'differentiators'],
    peripheralElements: ['use cases', 'trade-offs', 'scenarios'],
  },
  {
    name: 'Benefits',
    description: 'Advantages and positive outcomes',
    coreElements: ['benefit', 'beneficiary', 'mechanism'],
    peripheralElements: ['evidence', 'quantification', 'conditions'],
  },
  {
    name: 'Risks',
    description: 'Potential problems and concerns',
    coreElements: ['risk', 'affected party', 'likelihood'],
    peripheralElements: ['mitigation', 'severity', 'prevention'],
  },
  {
    name: 'Cost',
    description: 'Financial and resource implications',
    coreElements: ['price', 'currency', 'what is included'],
    peripheralElements: ['discounts', 'alternatives', 'ROI', 'payment options'],
  },
  {
    name: 'Evaluation',
    description: 'How to judge or choose',
    coreElements: ['criteria', 'measurement', 'standards'],
    peripheralElements: ['best practices', 'benchmarks', 'tools'],
  },
  {
    name: 'Troubleshooting',
    description: 'Common problems and solutions',
    coreElements: ['problem', 'cause', 'solution'],
    peripheralElements: ['prevention', 'when to seek help', 'tools needed'],
  },
  {
    name: 'Future',
    description: 'Trends and evolution',
    coreElements: ['trend', 'timeline', 'impact'],
    peripheralElements: ['predictions', 'emerging technologies', 'preparation'],
  },
];

/**
 * Check if a topic title matches a frame element, using both the English
 * element words and multilingual synonyms.
 */
function elementMatchesTopic(element: string, topicsLower: string[]): boolean {
  // 1. English keyword match (original logic)
  const elementWords = element.toLowerCase().split(/\s+/);
  const englishMatch = topicsLower.some(topic =>
    elementWords.some(word => word.length > 3 && topic.includes(word))
  );
  if (englishMatch) return true;

  // 2. Multilingual synonym match
  const synonyms = MULTILINGUAL_KEYWORDS[element.toLowerCase()];
  if (synonyms) {
    return topicsLower.some(topic =>
      synonyms.some(synonym => topic.includes(synonym.toLowerCase()))
    );
  }

  return false;
}

export class FrameSemanticsAnalyzer {
  /**
   * Analyze frame coverage for a set of topics.
   * Topics are matched against frame elements using multilingual keyword matching.
   */
  static analyze(
    topics: string[],
    customFrames?: SemanticFrame[]
  ): FrameAnalysisReport {
    const frames = customFrames || GENERIC_FRAMES;
    const topicsLower = topics.map(t => t.toLowerCase());
    const frameResults: FrameCoverageResult[] = [];

    let fullyCovered = 0;
    let partiallyCovered = 0;
    let uncovered = 0;

    for (const frame of frames) {
      const coveredCore: string[] = [];
      const missingCore: string[] = [];
      const coveredPeripheral: string[] = [];

      // Check core elements (multilingual)
      for (const element of frame.coreElements) {
        if (elementMatchesTopic(element, topicsLower)) {
          coveredCore.push(element);
        } else {
          missingCore.push(element);
        }
      }

      // Check peripheral elements (multilingual)
      for (const element of frame.peripheralElements) {
        if (elementMatchesTopic(element, topicsLower)) {
          coveredPeripheral.push(element);
        }
      }

      // Calculate coverage
      const totalElements = frame.coreElements.length + frame.peripheralElements.length;
      const coveredElements = coveredCore.length + coveredPeripheral.length;
      const coverage = totalElements > 0 ? coveredElements / totalElements : 0;

      if (missingCore.length === 0) fullyCovered++;
      else if (coveredCore.length > 0) partiallyCovered++;
      else uncovered++;

      frameResults.push({
        frame,
        coverage: Math.round(coverage * 100) / 100,
        coveredCore,
        missingCore,
        coveredPeripheral,
      });
    }

    // Generate suggestions for uncovered frames
    const suggestions: string[] = [];
    for (const result of frameResults) {
      if (result.missingCore.length > 0) {
        suggestions.push(
          `Frame "${result.frame.name}": Missing topics for ${result.missingCore.join(', ')}`
        );
      }
    }

    const overallCoverage = frames.length > 0
      ? frameResults.reduce((s, r) => s + r.coverage, 0) / frames.length
      : 0;

    return {
      totalFrames: frames.length,
      fullyCovered,
      partiallyCovered,
      uncovered,
      overallCoverage: Math.round(overallCoverage * 100) / 100,
      frameResults,
      suggestions: suggestions.slice(0, 20),
    };
  }

  /**
   * Get the generic frames. Useful for UI display.
   */
  static getGenericFrames(): SemanticFrame[] {
    return [...GENERIC_FRAMES];
  }
}
