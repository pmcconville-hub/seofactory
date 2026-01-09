/**
 * Test script to verify multilingual validation patterns work correctly
 * Run with: npx tsx scripts/test/testMultilingualValidation.ts
 */

import { getLanguageName } from '../../utils/languageUtils';

// Import validators
import { ProhibitedLanguageValidator } from '../../services/ai/contentGeneration/rulesEngine/validators/prohibitedLanguage';
import { ModalityValidator } from '../../services/ai/contentGeneration/rulesEngine/validators/modalityValidator';
import { CenterpieceValidator } from '../../services/ai/contentGeneration/rulesEngine/validators/centerpieceValidator';
import { StructureValidator } from '../../services/ai/contentGeneration/rulesEngine/validators/structureValidator';
import { ContextualBridgeValidator } from '../../services/ai/contentGeneration/rulesEngine/validators/contextualBridgeValidator';
import { EAVDensityValidator } from '../../services/ai/contentGeneration/rulesEngine/validators/eavDensity';

// Import audit patterns
import { getAuditPatterns, getSupportedLanguages, isLanguageSupported } from '../../services/ai/contentGeneration/passes/auditPatternsMultilingual';

// Test configuration
const LANGUAGES = ['en', 'nl', 'de', 'fr', 'es'] as const;

// Sample content in different languages for testing
const SAMPLE_CONTENT = {
  en: {
    good: `Search Engine Optimization is a digital marketing strategy. SEO improves website visibility in search results. The process involves technical optimization, content creation, and link building.`,
    bad_modality: `SEO might be important. It could help your website. You may see results.`,
    bad_opinion: `I think SEO is amazing. We believe it's the best strategy. In my opinion, everyone should use it.`,
    bad_fluff: `In this article, we will explore SEO. Let's dive into the details. Welcome to our guide.`,
    supplementary: `To understand more about ranking factors, consider the following aspects.`,
  },
  nl: {
    good: `Zoekmachineoptimalisatie is een digitale marketingstrategie. SEO verbetert de zichtbaarheid van websites in zoekresultaten. Het proces omvat technische optimalisatie, contentcreatie en linkbuilding.`,
    bad_modality: `SEO zou belangrijk kunnen zijn. Het kan misschien je website helpen. Wellicht zie je resultaten.`,
    bad_opinion: `Ik denk dat SEO geweldig is. Wij geloven dat het de beste strategie is. Naar mijn mening zou iedereen het moeten gebruiken.`,
    bad_fluff: `In dit artikel verkennen we SEO. Laten we in de details duiken. Welkom bij onze gids.`,
    supplementary: `Om meer te begrijpen over rankingfactoren, overweeg de volgende aspecten.`,
  },
  de: {
    good: `Suchmaschinenoptimierung ist eine digitale Marketingstrategie. SEO verbessert die Sichtbarkeit von Websites in Suchergebnissen. Der Prozess umfasst technische Optimierung, Content-Erstellung und Linkaufbau.`,
    bad_modality: `SEO könnte wichtig sein. Es kann vielleicht Ihrer Website helfen. Möglicherweise sehen Sie Ergebnisse.`,
    bad_opinion: `Ich denke, SEO ist großartig. Wir glauben, es ist die beste Strategie. Meiner Meinung nach sollte jeder es nutzen.`,
    bad_fluff: `In diesem Artikel werden wir SEO erkunden. Lassen Sie uns in die Details eintauchen. Willkommen zu unserem Leitfaden.`,
    supplementary: `Um mehr über Rankingfaktoren zu verstehen, berücksichtigen Sie die folgenden Aspekte.`,
  },
  fr: {
    good: `L'optimisation pour les moteurs de recherche est une stratégie de marketing numérique. Le SEO améliore la visibilité des sites web dans les résultats de recherche. Le processus comprend l'optimisation technique, la création de contenu et la construction de liens.`,
    bad_modality: `Le SEO pourrait être important. Cela peut peut-être aider votre site web. Vous verrez éventuellement des résultats.`,
    bad_opinion: `Je pense que le SEO est incroyable. Nous croyons que c'est la meilleure stratégie. À mon avis, tout le monde devrait l'utiliser.`,
    bad_fluff: `Dans cet article, nous allons explorer le SEO. Plongeons dans les détails. Bienvenue dans notre guide.`,
    supplementary: `Pour comprendre davantage les facteurs de classement, considérez les aspects suivants.`,
  },
  es: {
    good: `La optimización para motores de búsqueda es una estrategia de marketing digital. El SEO mejora la visibilidad del sitio web en los resultados de búsqueda. El proceso incluye optimización técnica, creación de contenido y construcción de enlaces.`,
    bad_modality: `El SEO podría ser importante. Puede ser que ayude a su sitio web. Tal vez vea resultados.`,
    bad_opinion: `Creo que el SEO es increíble. Creemos que es la mejor estrategia. En mi opinión, todos deberían usarlo.`,
    bad_fluff: `En este artículo, exploraremos el SEO. Sumerjámonos en los detalles. Bienvenido a nuestra guía.`,
    supplementary: `Para comprender más sobre los factores de clasificación, considere los siguientes aspectos.`,
  },
};

// Test results tracking
interface TestResult {
  test: string;
  language: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function logResult(test: string, language: string, passed: boolean, details: string) {
  results.push({ test, language, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${status} [${language}] ${test}: ${details}`);
}

// Create mock context for validators
function createMockContext(language: string, heading?: string, contentZone?: string) {
  return {
    language,
    section: {
      heading: heading || 'Test Section',
      content_zone: contentZone || 'MAIN',
      level: 2,
    },
    businessInfo: {
      seedKeyword: 'SEO',
    },
    brief: {},
    sectionIndex: 0,
    totalSections: 5,
  };
}

// Test 1: Language Name Resolution
function testLanguageNameResolution() {
  console.log('\n📋 Test 1: Language Name Resolution');

  const expected: Record<string, string> = {
    'en': 'English',
    'nl': 'Dutch',
    'de': 'German',
    'fr': 'French',
    'es': 'Spanish',
    'en-US': 'English',
    'nl-NL': 'Dutch',
    'de-DE': 'German',
    'fr-FR': 'French',
    'es-ES': 'Spanish',
  };

  for (const [code, expectedName] of Object.entries(expected)) {
    const result = getLanguageName(code);
    const passed = result === expectedName;
    logResult('getLanguageName', code, passed, `${code} → ${result} (expected: ${expectedName})`);
  }
}

// Test 2: Modality Validator - Should detect uncertain language
function testModalityValidator() {
  console.log('\n📋 Test 2: Modality Validator');

  for (const lang of LANGUAGES) {
    const content = SAMPLE_CONTENT[lang].bad_modality;
    const context = createMockContext(lang);

    const violations = ModalityValidator.validate(content, context as any);
    const passed = violations.length > 0;
    logResult(
      'Detect uncertain modality',
      lang,
      passed,
      `Found ${violations.length} violations in: "${content.substring(0, 50)}..."`
    );
  }
}

// Test 3: Prohibited Language Validator - Should detect opinions
function testProhibitedLanguageValidator() {
  console.log('\n📋 Test 3: Prohibited Language Validator - Opinions');

  for (const lang of LANGUAGES) {
    const content = SAMPLE_CONTENT[lang].bad_opinion;
    const context = createMockContext(lang);

    const violations = ProhibitedLanguageValidator.validate(content, context as any);
    const opinionViolations = violations.filter(v => v.rule === 'OPINIONS');
    const passed = opinionViolations.length > 0;
    logResult(
      'Detect opinion language',
      lang,
      passed,
      `Found ${opinionViolations.length} opinion violations in: "${content.substring(0, 50)}..."`
    );
  }
}

// Test 4: Prohibited Language Validator - Should detect fluff openers
function testFluffOpeners() {
  console.log('\n📋 Test 4: Prohibited Language Validator - Fluff Openers');

  for (const lang of LANGUAGES) {
    const content = SAMPLE_CONTENT[lang].bad_fluff;
    const context = createMockContext(lang);

    const violations = ProhibitedLanguageValidator.validate(content, context as any);
    const fluffViolations = violations.filter(v => v.rule === 'FLUFF_OPENERS');
    const passed = fluffViolations.length > 0;
    logResult(
      'Detect fluff openers',
      lang,
      passed,
      `Found ${fluffViolations.length} fluff violations in: "${content.substring(0, 50)}..."`
    );
  }
}

// Test 5: Contextual Bridge Validator - Should detect bridge language
function testContextualBridgeValidator() {
  console.log('\n📋 Test 5: Contextual Bridge Validator');

  for (const lang of LANGUAGES) {
    const content = SAMPLE_CONTENT[lang].supplementary;
    const context = createMockContext(lang, 'Related Topics', 'SUPPLEMENTARY');

    const violations = ContextualBridgeValidator.validate(content, context as any);
    // Good supplementary content should have NO violations (has proper bridge)
    const passed = violations.length === 0;
    logResult(
      'Detect bridge language',
      lang,
      passed,
      `Found ${violations.length} violations (0 expected for good bridge content)`
    );
  }
}

// Test 6: Centerpiece Validator - Should detect definitive verbs
function testCenterpieceValidator() {
  console.log('\n📋 Test 6: Centerpiece Validator');

  for (const lang of LANGUAGES) {
    const content = SAMPLE_CONTENT[lang].good;
    const context = createMockContext(lang, 'Introduction');

    const violations = CenterpieceValidator.validate(content, context as any);
    // Good content with definitive verb should have fewer violations
    const noDefVerbViolation = !violations.some(v => v.rule === 'FIRST_SENTENCE_NO_DEFINITIVE_VERB');
    logResult(
      'Detect definitive verb',
      lang,
      noDefVerbViolation,
      noDefVerbViolation ? 'Definitive verb found in first sentence' : 'Missing definitive verb (unexpected)'
    );
  }
}

// Test 7: Structure Validator - Entity as subject
function testStructureValidator() {
  console.log('\n📋 Test 7: Structure Validator');

  for (const lang of LANGUAGES) {
    const content = SAMPLE_CONTENT[lang].good;
    const context = createMockContext(lang);

    const violations = StructureValidator.validate(content, context as any);
    // This tests that the validator runs without errors for each language
    logResult(
      'Structure validation runs',
      lang,
      true,
      `Completed with ${violations.length} violations`
    );
  }
}

// Test 8: Audit Pattern Functions
function testAuditPatterns() {
  console.log('\n📋 Test 8: Audit Pattern Functions');

  // Test that all languages are supported
  for (const lang of LANGUAGES) {
    const langName = getLanguageName(lang);
    const supported = isLanguageSupported(lang);
    logResult('isLanguageSupported', lang, supported, supported ? 'Supported' : 'NOT supported');
  }

  // Test that patterns exist for each language
  const patternKeys = [
    'llmSignaturePhrases',
    'genericHeadings',
    'stopWords',
    'passivePatterns',
    'futureTensePatterns',
    'uncertaintyPatterns',
    'definitiveVerbsPattern',
  ] as const;

  for (const lang of LANGUAGES) {
    const langName = getLanguageName(lang);
    const patterns = getAuditPatterns(lang);

    for (const key of patternKeys) {
      const pattern = patterns[key];
      const hasPattern = pattern && (Array.isArray(pattern) ? pattern.length > 0 : pattern instanceof RegExp || typeof pattern === 'object');
      logResult(
        `patterns.${key}`,
        lang,
        hasPattern,
        hasPattern ? 'Has patterns' : 'Missing patterns!'
      );
    }
  }
}

// Test 9: Dutch-specific pattern matching
function testDutchSpecificPatterns() {
  console.log('\n📋 Test 9: Dutch-Specific Pattern Matching');

  // Test Dutch uncertainty patterns
  const dutchUncertain = 'Dit zou kunnen helpen met je website.';
  const context = createMockContext('nl');
  const violations = ModalityValidator.validate(dutchUncertain, context as any);
  logResult(
    'Dutch "zou kunnen" detection',
    'nl',
    violations.length > 0,
    `"${dutchUncertain}" → ${violations.length} violations`
  );

  // Test Dutch opinion patterns
  const dutchOpinion = 'Ik denk dat dit belangrijk is.';
  const opinionViolations = ProhibitedLanguageValidator.validate(dutchOpinion, context as any);
  const hasOpinionViolation = opinionViolations.some(v => v.rule === 'OPINIONS');
  logResult(
    'Dutch "Ik denk" detection',
    'nl',
    hasOpinionViolation,
    `"${dutchOpinion}" → ${hasOpinionViolation ? 'detected' : 'NOT detected'}`
  );

  // Test Dutch stop words using audit patterns
  const dutchPatterns = getAuditPatterns('nl');
  const dutchStopWords = ['ook', 'eigenlijk', 'gewoon', 'echt'];
  for (const word of dutchStopWords) {
    const found = dutchPatterns.stopWords.includes(word) ||
                  dutchPatterns.stopWordsFull.includes(word) ||
                  dutchPatterns.fluffWordsPattern.test(word);
    logResult(
      `Dutch stop word "${word}"`,
      'nl',
      found,
      found ? 'Pattern matches' : 'Pattern NOT found'
    );
  }

  // Test Dutch passive voice
  const dutchPassive = 'wordt gemaakt';
  const passiveFound = dutchPatterns.passivePatterns.some(p => p.test(dutchPassive));
  logResult(
    'Dutch passive voice "wordt gemaakt"',
    'nl',
    passiveFound,
    passiveFound ? 'Pattern matches' : 'Pattern NOT found'
  );

  // Test Dutch uncertainty pattern from audit
  const uncertaintyMatches = dutchPatterns.uncertaintyPatterns.test('zou kunnen zijn');
  logResult(
    'Dutch uncertainty "zou kunnen zijn"',
    'nl',
    uncertaintyMatches,
    uncertaintyMatches ? 'Pattern matches' : 'Pattern NOT found'
  );

  // Test Dutch LLM signature detection
  const dutchLLMPhrases = ['in de wereld van vandaag', 'laten we beginnen', 'verdiepen'];
  for (const phrase of dutchLLMPhrases) {
    const found = dutchPatterns.llmSignaturePhrases.some(p => phrase.toLowerCase().includes(p.toLowerCase()));
    logResult(
      `Dutch LLM phrase "${phrase}"`,
      'nl',
      found,
      found ? 'Detected as LLM signature' : 'NOT detected'
    );
  }

  // Test Dutch generic headings
  const dutchGenericHeadings = ['introductie', 'conclusie', 'samenvatting'];
  for (const heading of dutchGenericHeadings) {
    const found = dutchPatterns.genericHeadings.some(g => heading.toLowerCase().includes(g.toLowerCase()));
    logResult(
      `Dutch generic heading "${heading}"`,
      'nl',
      found,
      found ? 'Detected as generic' : 'NOT detected'
    );
  }
}

// Run all tests
async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  MULTILINGUAL VALIDATION TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════');

  testLanguageNameResolution();
  testModalityValidator();
  testProhibitedLanguageValidator();
  testFluffOpeners();
  testContextualBridgeValidator();
  testCenterpieceValidator();
  testStructureValidator();
  testAuditPatterns();
  testDutchSpecificPatterns();

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\n  Total: ${total} tests`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n  Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`    - [${r.language}] ${r.test}: ${r.details}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════════');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
