// services/ai/contentGeneration/passes/auditPatternsMultilingual.ts
// Multilingual patterns for audit checks
// Supports: English, Dutch, German, French, Spanish

import { getLanguageName } from '../../../../utils/languageUtils';

/**
 * All language-specific patterns for audit checks
 */
interface AuditLanguagePatterns {
  llmSignaturePhrases: string[];
  genericHeadings: string[];
  positivePredicates: string[];
  negativePredicates: string[];
  instructionalPredicates: string[];
  stopWords: string[];
  stopWordsFull: string[];
  genericAnchors: string[];
  supplementaryHeadingPatterns: RegExp[];
  passivePatterns: RegExp[];
  futureTensePatterns: RegExp[];
  uncertaintyPatterns: RegExp;
  fluffWordsPattern: RegExp;
  pronounsPattern: RegExp;
  definitiveVerbsPattern: RegExp;
  numberWords: string[];
  queryPatterns: {
    list: RegExp[];
    instructional: RegExp[];
    comparison: RegExp[];
    definitional: RegExp[];
  };
}

const PATTERNS: Record<string, AuditLanguagePatterns> = {
  'English': {
    llmSignaturePhrases: [
      'overall', 'in conclusion', "it's important to note", 'it is important to note',
      'it is worth mentioning', 'it is worth noting', 'delve', 'delving', 'delved',
      'i had the pleasure of', 'embark on a journey', 'explore the world of',
      "in today's fast-paced world", 'when it comes to', 'at the end of the day',
      'needless to say', 'it goes without saying', 'without further ado',
      'dive into', 'diving into', 'unpack this', 'unpacking', 'game-changer',
      'a testament to', 'the importance of', 'crucial to understand', 'pivotal', 'paramount',
    ],
    genericHeadings: [
      'introduction', 'conclusion', 'overview', 'summary',
      'getting started', 'final thoughts', 'wrapping up', 'in closing',
    ],
    positivePredicates: [
      'benefits', 'advantages', 'improvements', 'gains', 'pros',
      'opportunities', 'strengths', 'positives', 'success', 'wins',
    ],
    negativePredicates: [
      'risks', 'dangers', 'problems', 'issues', 'cons', 'drawbacks',
      'challenges', 'threats', 'weaknesses', 'failures', 'losses',
      'mistakes', 'errors', 'pitfalls', 'downsides',
    ],
    instructionalPredicates: [
      'how to', 'guide', 'steps', 'tutorial', 'ways to', 'tips',
      'process', 'method', 'approach', 'strategy', 'techniques',
    ],
    stopWords: ['also', 'basically', 'very', 'maybe', 'actually', 'really', 'just', 'quite', 'simply'],
    stopWordsFull: [
      'also', 'basically', 'very', 'maybe', 'actually', 'really', 'just', 'quite', 'simply',
      'definitely', 'certainly', 'obviously', 'clearly', 'literally', 'absolutely',
      'pretty much', 'kind of', 'sort of', 'in order to', 'due to the fact that',
      'at this point in time', 'for the purpose of', 'in the event that',
    ],
    genericAnchors: ['click here', 'read more', 'learn more', 'here', 'link', 'this', 'more', 'view', 'see'],
    supplementaryHeadingPatterns: [
      /related/i, /see also/i, /further reading/i, /additional/i,
      /more on/i, /learn more/i, /what is the (opposite|difference)/i, /how does .+ relate/i,
    ],
    passivePatterns: [
      /\b(is|are|was|were|been|being)\s+(being\s+)?(done|made|created|used|considered|known|found|seen|given|taken|called|named|built|written|designed|developed|established|implemented|performed|executed|completed|achieved)\b/gi,
      /\b(is|are|was|were|been|being)\s+\w+ed\s+by\b/gi,
    ],
    futureTensePatterns: [
      /\b(will be|will have|will become|will make|will provide|will help|will allow|will enable)\b/gi,
      /\b(is going to|are going to|is about to|are about to)\b/gi,
      /\b(shall be|shall have|shall become)\b/gi,
    ],
    uncertaintyPatterns: /\b(can be|might be|could be|may be|possibly|perhaps)\b/gi,
    fluffWordsPattern: /\b(also|basically|very|maybe|actually|really|just|quite|simply)\b/gi,
    pronounsPattern: /\b(it|they|he|she|this|that)\b/gi,
    definitiveVerbsPattern: /\b(is|are|means|refers to|consists of|defines)\b/i,
    numberWords: ['three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
    queryPatterns: {
      list: [/\b(types of|kinds of|categories of|list of|examples of)\b/i, /\b(best|top \d+|ways to)\b/i],
      instructional: [/^how to\b/i, /\b(steps to|guide to|tutorial)\b/i],
      comparison: [/\bvs\.?\b|\bversus\b|\bcompare|\bdifference between\b/i],
      definitional: [/^what is\b/i, /^what are\b/i, /^definition of\b/i],
    },
  },

  'Dutch': {
    llmSignaturePhrases: [
      'over het algemeen', 'ter conclusie', 'het is belangrijk om op te merken',
      'het is de moeite waard om te vermelden', 'verdiepen', 'verdieping', 'verdiept',
      'duiken in', 'op ontdekkingsreis', 'verkennen',
      'in de wereld van vandaag', 'als het gaat om', 'aan het einde van de dag',
      'het spreekt voor zich', 'zonder omwegen', 'laten we beginnen',
      'game-changer', 'een bewijs van', 'het belang van', 'cruciaal om te begrijpen',
      'essentieel', 'van het grootste belang', 'holistisch', 'synergie',
      'naadloos', 'robuust', 'het landschap', 'onmiskenbaar',
    ],
    genericHeadings: [
      'introductie', 'inleiding', 'conclusie', 'overzicht', 'samenvatting',
      'aan de slag', 'tot slot', 'afsluitend', 'ter afsluiting',
    ],
    positivePredicates: [
      'voordelen', 'verbeteringen', 'winsten', 'pluspunten',
      'kansen', 'sterktes', 'positieven', 'succes', 'winst',
    ],
    negativePredicates: [
      'risico\'s', 'gevaren', 'problemen', 'kwesties', 'nadelen', 'minpunten',
      'uitdagingen', 'bedreigingen', 'zwaktes', 'mislukkingen', 'verliezen',
      'fouten', 'valkuilen', 'keerzijdes',
    ],
    instructionalPredicates: [
      'hoe', 'handleiding', 'stappen', 'tutorial', 'manieren om', 'tips',
      'proces', 'methode', 'aanpak', 'strategie', 'technieken',
    ],
    stopWords: ['ook', 'eigenlijk', 'zeer', 'misschien', 'echt', 'gewoon', 'nogal', 'simpelweg'],
    stopWordsFull: [
      'ook', 'eigenlijk', 'zeer', 'misschien', 'echt', 'gewoon', 'nogal', 'simpelweg',
      'zeker', 'natuurlijk', 'duidelijk', 'letterlijk', 'absoluut',
      'min of meer', 'een beetje', 'soort van', 'om', 'vanwege het feit dat',
      'op dit moment', 'met het doel om', 'in het geval dat',
    ],
    genericAnchors: ['klik hier', 'lees meer', 'meer informatie', 'hier', 'link', 'dit', 'meer', 'bekijk', 'zie'],
    supplementaryHeadingPatterns: [
      /gerelateerd/i, /zie ook/i, /verder lezen/i, /aanvullend/i,
      /meer over/i, /meer informatie/i, /wat is het (tegenovergestelde|verschil)/i, /hoe verhoudt .+ zich/i,
    ],
    passivePatterns: [
      /\b(wordt|worden|werd|werden|is|zijn|was|waren)\s+(ge\w+d|ge\w+en|ge\w+t)\b/gi,
      /\b(wordt|worden|werd|werden)\s+\w+\s+door\b/gi,
    ],
    futureTensePatterns: [
      /\b(zal zijn|zal hebben|zal worden|zal maken|zal bieden|zal helpen|zal toestaan|zal mogelijk maken)\b/gi,
      /\b(gaat worden|gaan worden|staat op het punt)\b/gi,
    ],
    uncertaintyPatterns: /\b(kan zijn|zou kunnen|zou kunnen zijn|mag zijn|mogelijk|misschien)\b/gi,
    fluffWordsPattern: /\b(ook|eigenlijk|zeer|misschien|echt|gewoon|nogal|simpelweg)\b/gi,
    pronounsPattern: /\b(het|ze|zij|hij|dit|dat)\b/gi,
    definitiveVerbsPattern: /\b(is|zijn|betekent|verwijst naar|bestaat uit|definieert)\b/i,
    numberWords: ['drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien'],
    queryPatterns: {
      list: [/\b(soorten|typen|categorieën|lijst van|voorbeelden van)\b/i, /\b(beste|top \d+|manieren om)\b/i],
      instructional: [/^hoe\b/i, /\b(stappen voor|handleiding voor|tutorial)\b/i],
      comparison: [/\bvs\.?\b|\bversus\b|\bvergelijk|\bverschil tussen\b/i],
      definitional: [/^wat is\b/i, /^wat zijn\b/i, /^definitie van\b/i],
    },
  },

  'German': {
    llmSignaturePhrases: [
      'insgesamt', 'abschließend', 'es ist wichtig zu beachten',
      'es ist erwähnenswert', 'vertiefen', 'vertiefung', 'vertieft',
      'eintauchen in', 'auf entdeckungsreise', 'erkunden',
      'in der heutigen welt', 'wenn es um', 'am ende des tages',
      'es versteht sich von selbst', 'ohne umschweife', 'lassen sie uns beginnen',
      'game-changer', 'ein beweis für', 'die bedeutung von', 'entscheidend zu verstehen',
      'wesentlich', 'von größter bedeutung', 'holistisch', 'synergie',
      'nahtlos', 'robust', 'die landschaft', 'unbestreitbar',
    ],
    genericHeadings: [
      'einleitung', 'einführung', 'fazit', 'schlussfolgerung', 'überblick', 'zusammenfassung',
      'erste schritte', 'abschließende gedanken', 'zum abschluss', 'schlusswort',
    ],
    positivePredicates: [
      'vorteile', 'verbesserungen', 'gewinne', 'pluspunkte',
      'chancen', 'stärken', 'positive aspekte', 'erfolg', 'gewinne',
    ],
    negativePredicates: [
      'risiken', 'gefahren', 'probleme', 'fragen', 'nachteile', 'minuspunkte',
      'herausforderungen', 'bedrohungen', 'schwächen', 'misserfolge', 'verluste',
      'fehler', 'fallstricke', 'schattenseiten',
    ],
    instructionalPredicates: [
      'wie man', 'anleitung', 'schritte', 'tutorial', 'wege zu', 'tipps',
      'prozess', 'methode', 'ansatz', 'strategie', 'techniken',
    ],
    stopWords: ['auch', 'eigentlich', 'sehr', 'vielleicht', 'wirklich', 'einfach', 'ziemlich', 'schlicht'],
    stopWordsFull: [
      'auch', 'eigentlich', 'sehr', 'vielleicht', 'wirklich', 'einfach', 'ziemlich', 'schlicht',
      'sicher', 'natürlich', 'offensichtlich', 'buchstäblich', 'absolut',
      'mehr oder weniger', 'irgendwie', 'sozusagen', 'um zu', 'aufgrund der tatsache dass',
      'zu diesem zeitpunkt', 'zum zwecke von', 'für den fall dass',
    ],
    genericAnchors: ['klicken sie hier', 'mehr lesen', 'mehr erfahren', 'hier', 'link', 'dies', 'mehr', 'ansehen', 'siehe'],
    supplementaryHeadingPatterns: [
      /verwandt/i, /siehe auch/i, /weiterführende literatur/i, /zusätzlich/i,
      /mehr über/i, /mehr erfahren/i, /was ist das (gegenteil|unterschied)/i, /wie verhält sich .+ zu/i,
    ],
    passivePatterns: [
      /\b(wird|werden|wurde|wurden|ist|sind|war|waren)\s+(ge\w+t|ge\w+en)\b/gi,
      /\b(wird|werden|wurde|wurden)\s+\w+\s+von\b/gi,
    ],
    futureTensePatterns: [
      /\b(wird sein|wird haben|wird werden|wird machen|wird bieten|wird helfen|wird ermöglichen)\b/gi,
      /\b(wird werden|werden werden|ist im begriff)\b/gi,
    ],
    uncertaintyPatterns: /\b(kann sein|könnte sein|könnte|mag sein|möglicherweise|vielleicht)\b/gi,
    fluffWordsPattern: /\b(auch|eigentlich|sehr|vielleicht|wirklich|einfach|ziemlich|schlicht)\b/gi,
    pronounsPattern: /\b(es|sie|er|dies|das)\b/gi,
    definitiveVerbsPattern: /\b(ist|sind|bedeutet|bezieht sich auf|besteht aus|definiert)\b/i,
    numberWords: ['drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'],
    queryPatterns: {
      list: [/\b(arten von|typen von|kategorien von|liste von|beispiele von)\b/i, /\b(beste|top \d+|wege zu)\b/i],
      instructional: [/^wie man\b/i, /\b(schritte zu|anleitung zu|tutorial)\b/i],
      comparison: [/\bvs\.?\b|\bversus\b|\bvergleich|\bunterschied zwischen\b/i],
      definitional: [/^was ist\b/i, /^was sind\b/i, /^definition von\b/i],
    },
  },

  'French': {
    llmSignaturePhrases: [
      'dans l\'ensemble', 'en conclusion', 'il est important de noter',
      'il convient de mentionner', 'approfondir', 'approfondissement',
      'plonger dans', 'partir à la découverte', 'explorer',
      'dans le monde d\'aujourd\'hui', 'quand il s\'agit de', 'à la fin de la journée',
      'il va sans dire', 'sans plus attendre', 'commençons',
      'game-changer', 'un témoignage de', 'l\'importance de', 'crucial à comprendre',
      'essentiel', 'de la plus haute importance', 'holistique', 'synergie',
      'transparent', 'robuste', 'le paysage', 'indéniable',
    ],
    genericHeadings: [
      'introduction', 'conclusion', 'aperçu', 'résumé',
      'pour commencer', 'réflexions finales', 'en conclusion', 'pour conclure',
    ],
    positivePredicates: [
      'avantages', 'améliorations', 'gains', 'points positifs',
      'opportunités', 'forces', 'positifs', 'succès', 'victoires',
    ],
    negativePredicates: [
      'risques', 'dangers', 'problèmes', 'questions', 'inconvénients', 'points négatifs',
      'défis', 'menaces', 'faiblesses', 'échecs', 'pertes',
      'erreurs', 'pièges', 'inconvénients',
    ],
    instructionalPredicates: [
      'comment', 'guide', 'étapes', 'tutoriel', 'façons de', 'conseils',
      'processus', 'méthode', 'approche', 'stratégie', 'techniques',
    ],
    stopWords: ['aussi', 'fondamentalement', 'très', 'peut-être', 'vraiment', 'juste', 'assez', 'simplement'],
    stopWordsFull: [
      'aussi', 'fondamentalement', 'très', 'peut-être', 'vraiment', 'juste', 'assez', 'simplement',
      'certainement', 'naturellement', 'évidemment', 'littéralement', 'absolument',
      'plus ou moins', 'en quelque sorte', 'afin de', 'en raison du fait que',
      'à ce stade', 'dans le but de', 'dans le cas où',
    ],
    genericAnchors: ['cliquez ici', 'en savoir plus', 'plus d\'informations', 'ici', 'lien', 'ceci', 'plus', 'voir', 'voir'],
    supplementaryHeadingPatterns: [
      /connexe/i, /voir aussi/i, /lectures complémentaires/i, /supplémentaire/i,
      /plus sur/i, /en savoir plus/i, /quel est le (contraire|différence)/i, /comment .+ se rapporte/i,
    ],
    passivePatterns: [
      /\b(est|sont|était|étaient|a été|ont été)\s+(\w+é|é\w+)\b/gi,
      /\b(est|sont|était|étaient)\s+\w+\s+par\b/gi,
    ],
    futureTensePatterns: [
      /\b(sera|seront|aura|auront|deviendra|deviendront|fera|feront|fournira|aidera|permettra)\b/gi,
      /\b(va être|vont être|est sur le point de)\b/gi,
    ],
    uncertaintyPatterns: /\b(peut être|pourrait être|pourrait|peut-être|possiblement|éventuellement)\b/gi,
    fluffWordsPattern: /\b(aussi|fondamentalement|très|peut-être|vraiment|juste|assez|simplement)\b/gi,
    pronounsPattern: /\b(il|elle|ils|elles|ceci|cela)\b/gi,
    definitiveVerbsPattern: /\b(est|sont|signifie|se réfère à|consiste en|définit)\b/i,
    numberWords: ['trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'],
    queryPatterns: {
      list: [/\b(types de|sortes de|catégories de|liste de|exemples de)\b/i, /\b(meilleur|top \d+|façons de)\b/i],
      instructional: [/^comment\b/i, /\b(étapes pour|guide pour|tutoriel)\b/i],
      comparison: [/\bvs\.?\b|\bversus\b|\bcomparer|\bdifférence entre\b/i],
      definitional: [/^qu'est-ce que\b/i, /^que sont\b/i, /^définition de\b/i],
    },
  },

  'Spanish': {
    llmSignaturePhrases: [
      'en general', 'en conclusión', 'es importante tener en cuenta',
      'vale la pena mencionar', 'profundizar', 'profundización',
      'sumergirse en', 'partir a descubrir', 'explorar',
      'en el mundo de hoy', 'cuando se trata de', 'al final del día',
      'ni que decir tiene', 'sin más preámbulos', 'comencemos',
      'revolucionario', 'un testimonio de', 'la importancia de', 'crucial para entender',
      'esencial', 'de suma importancia', 'holístico', 'sinergia',
      'sin problemas', 'robusto', 'el panorama', 'innegable',
    ],
    genericHeadings: [
      'introducción', 'conclusión', 'resumen', 'descripción general',
      'para empezar', 'reflexiones finales', 'para concluir', 'en conclusión',
    ],
    positivePredicates: [
      'beneficios', 'ventajas', 'mejoras', 'ganancias', 'pros',
      'oportunidades', 'fortalezas', 'positivos', 'éxito', 'victorias',
    ],
    negativePredicates: [
      'riesgos', 'peligros', 'problemas', 'cuestiones', 'contras', 'desventajas',
      'desafíos', 'amenazas', 'debilidades', 'fracasos', 'pérdidas',
      'errores', 'trampas', 'inconvenientes',
    ],
    instructionalPredicates: [
      'cómo', 'guía', 'pasos', 'tutorial', 'formas de', 'consejos',
      'proceso', 'método', 'enfoque', 'estrategia', 'técnicas',
    ],
    stopWords: ['también', 'básicamente', 'muy', 'quizás', 'realmente', 'solo', 'bastante', 'simplemente'],
    stopWordsFull: [
      'también', 'básicamente', 'muy', 'quizás', 'realmente', 'solo', 'bastante', 'simplemente',
      'ciertamente', 'naturalmente', 'obviamente', 'literalmente', 'absolutamente',
      'más o menos', 'en cierto modo', 'para', 'debido al hecho de que',
      'en este momento', 'con el propósito de', 'en caso de que',
    ],
    genericAnchors: ['haga clic aquí', 'leer más', 'más información', 'aquí', 'enlace', 'esto', 'más', 'ver', 'ver'],
    supplementaryHeadingPatterns: [
      /relacionado/i, /ver también/i, /lecturas adicionales/i, /adicional/i,
      /más sobre/i, /más información/i, /cuál es el (opuesto|diferencia)/i, /cómo se relaciona .+/i,
    ],
    passivePatterns: [
      /\b(es|son|fue|fueron|ha sido|han sido)\s+(\w+ado|\w+ido)\b/gi,
      /\b(es|son|fue|fueron)\s+\w+\s+por\b/gi,
    ],
    futureTensePatterns: [
      /\b(será|serán|tendrá|tendrán|se convertirá|hará|harán|proporcionará|ayudará|permitirá)\b/gi,
      /\b(va a ser|van a ser|está a punto de)\b/gi,
    ],
    uncertaintyPatterns: /\b(puede ser|podría ser|podría|quizás|posiblemente|tal vez)\b/gi,
    fluffWordsPattern: /\b(también|básicamente|muy|quizás|realmente|solo|bastante|simplemente)\b/gi,
    pronounsPattern: /\b(él|ella|ellos|ellas|esto|eso)\b/gi,
    definitiveVerbsPattern: /\b(es|son|significa|se refiere a|consiste en|define)\b/i,
    numberWords: ['tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'],
    queryPatterns: {
      list: [/\b(tipos de|clases de|categorías de|lista de|ejemplos de)\b/i, /\b(mejor|top \d+|formas de)\b/i],
      instructional: [/^cómo\b/i, /\b(pasos para|guía para|tutorial)\b/i],
      comparison: [/\bvs\.?\b|\bversus\b|\bcomparar|\bdiferencia entre\b/i],
      definitional: [/^qué es\b/i, /^qué son\b/i, /^definición de\b/i],
    },
  },
};

/**
 * Get patterns for a specific language, with fallback to English
 */
export function getAuditPatterns(language?: string): AuditLanguagePatterns {
  const langName = getLanguageName(language);
  return PATTERNS[langName] || PATTERNS['English'];
}

/**
 * Get all supported language names
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(PATTERNS);
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(language?: string): boolean {
  if (!language) return true; // Falls back to English
  const langName = getLanguageName(language);
  return langName in PATTERNS;
}

// Export the patterns for direct access if needed
export { PATTERNS as AUDIT_PATTERNS };
