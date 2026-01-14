// services/ai/contentGeneration/rulesEngine/validators/prohibitedLanguage.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { getLanguageName } from '../../../../../utils/languageUtils';
import { splitSentences } from '../../../../../utils/sentenceTokenizer';

/**
 * Multilingual patterns for prohibited language detection
 * Supports: English, Dutch, German, French, Spanish
 */
interface LanguagePatterns {
  STOP_WORDS: string[];
  OPINIONS: RegExp[];
  ANALOGIES: RegExp[];
  PASSIVE_VOICE: RegExp[];
  FUTURE_FOR_FACTS: RegExp[];
  AMBIGUOUS_PRONOUNS: RegExp[];
  FLUFF_OPENERS: RegExp[];
}

const MULTILINGUAL_PATTERNS: Record<string, LanguagePatterns> = {
  'English': {
    STOP_WORDS: [
      'also', 'basically', 'actually', 'very', 'really',
      'just', 'quite', 'anyway', 'maybe', 'perhaps',
      'certainly', 'definitely', 'obviously', 'simply',
    ],
    OPINIONS: [
      /\b(I think|we think|I believe|we believe|in my opinion|in our opinion)\b/gi,
      /\b(unfortunately|fortunately|hopefully|ideally|interestingly)\b/gi,
      /\b(beautiful|amazing|wonderful|terrible|horrible|awesome|fantastic)\b/gi,
    ],
    ANALOGIES: [
      /\b(like a|similar to|is like|as if|imagine|think of it as)\b/gi,
      /\b(metaphor|analogy|compared to a|just like)\b/gi,
    ],
    PASSIVE_VOICE: [
      /\b(is|are|was|were|been|being)\s+(being\s+)?\w+ed\b/gi,
    ],
    FUTURE_FOR_FACTS: [
      /\bwill (always|never|typically|usually|generally)\b/gi,
    ],
    AMBIGUOUS_PRONOUNS: [
      /^(It|They|This|That|These|Those)\s+(is|are|was|were|said|mentioned|noted)\b/gi,
    ],
    FLUFF_OPENERS: [
      /^(In this (article|guide|post|section)|Let's (dive|explore|look|discuss)|Have you ever wondered)/i,
      /^(Welcome to|Today we|We will|We're going to)/i,
    ],
  },

  'Dutch': {
    STOP_WORDS: [
      'ook', 'eigenlijk', 'echt', 'zeer', 'erg',
      'gewoon', 'best', 'nogal', 'sowieso', 'misschien',
      'natuurlijk', 'uiteraard', 'wellicht', 'simpelweg',
      'zeker', 'absoluut', 'duidelijk', 'overigens',
    ],
    OPINIONS: [
      /\b(ik denk|wij denken|ik geloof|wij geloven|naar mijn mening|volgens mij|naar onze mening)\b/gi,
      /\b(helaas|gelukkig|hopelijk|idealiter|interessant genoeg)\b/gi,
      /\b(mooi|geweldig|prachtig|verschrikkelijk|vreselijk|fantastisch|schitterend)\b/gi,
    ],
    ANALOGIES: [
      /\b(zoals een|vergelijkbaar met|is als|alsof|stel je voor|denk eraan als)\b/gi,
      /\b(metafoor|analogie|vergeleken met een|net als|net zoals)\b/gi,
    ],
    PASSIVE_VOICE: [
      /\b(wordt|worden|werd|werden|is|zijn|was|waren)\s+(ge\w+d|ge\w+en|ge\w+t)\b/gi,
    ],
    FUTURE_FOR_FACTS: [
      /\bzal (altijd|nooit|doorgaans|meestal|over het algemeen)\b/gi,
      /\bzullen (altijd|nooit|doorgaans|meestal|over het algemeen)\b/gi,
    ],
    AMBIGUOUS_PRONOUNS: [
      /^(Het|Ze|Dit|Dat|Deze|Die)\s+(is|zijn|was|waren|zei|vermeldde|noteerde)\b/gi,
    ],
    FLUFF_OPENERS: [
      /^(In dit (artikel|gids|bericht|sectie)|Laten we (duiken|verkennen|kijken|bespreken)|Heb je je ooit afgevraagd)/i,
      /^(Welkom bij|Vandaag gaan we|We zullen|We gaan)\b/i,
    ],
  },

  'German': {
    STOP_WORDS: [
      'auch', 'eigentlich', 'wirklich', 'sehr', 'echt',
      'einfach', 'ziemlich', 'jedenfalls', 'vielleicht', 'eventuell',
      'natürlich', 'selbstverständlich', 'möglicherweise', 'schlicht',
      'sicher', 'absolut', 'offensichtlich', 'übrigens',
    ],
    OPINIONS: [
      /\b(ich denke|wir denken|ich glaube|wir glauben|meiner Meinung nach|unserer Meinung nach)\b/gi,
      /\b(leider|glücklicherweise|hoffentlich|idealerweise|interessanterweise)\b/gi,
      /\b(schön|großartig|wunderbar|schrecklich|furchtbar|fantastisch|herrlich)\b/gi,
    ],
    ANALOGIES: [
      /\b(wie ein|ähnlich wie|ist wie|als ob|stell dir vor|denk daran als)\b/gi,
      /\b(Metapher|Analogie|verglichen mit einem|genau wie|genauso wie)\b/gi,
    ],
    PASSIVE_VOICE: [
      /\b(wird|werden|wurde|wurden|ist|sind|war|waren)\s+(ge\w+t|ge\w+en)\b/gi,
    ],
    FUTURE_FOR_FACTS: [
      /\bwird (immer|nie|typischerweise|normalerweise|im Allgemeinen)\b/gi,
      /\bwerden (immer|nie|typischerweise|normalerweise|im Allgemeinen)\b/gi,
    ],
    AMBIGUOUS_PRONOUNS: [
      /^(Es|Sie|Dies|Das|Diese|Jene)\s+(ist|sind|war|waren|sagte|erwähnte|notierte)\b/gi,
    ],
    FLUFF_OPENERS: [
      /^(In diesem (Artikel|Leitfaden|Beitrag|Abschnitt)|Lassen Sie uns (eintauchen|erkunden|schauen|besprechen)|Haben Sie sich jemals gefragt)/i,
      /^(Willkommen bei|Heute werden wir|Wir werden|Wir werden)\b/i,
    ],
  },

  'French': {
    STOP_WORDS: [
      'aussi', 'fondamentalement', 'en fait', 'très', 'vraiment',
      'juste', 'assez', 'de toute façon', 'peut-être', 'éventuellement',
      'certainement', 'définitivement', 'évidemment', 'simplement',
      'bien sûr', 'absolument', 'clairement', 'd\'ailleurs',
    ],
    OPINIONS: [
      /\b(je pense|nous pensons|je crois|nous croyons|à mon avis|selon moi|à notre avis)\b/gi,
      /\b(malheureusement|heureusement|espérons|idéalement|curieusement)\b/gi,
      /\b(beau|magnifique|merveilleux|terrible|horrible|fantastique|superbe)\b/gi,
    ],
    ANALOGIES: [
      /\b(comme un|similaire à|est comme|comme si|imaginez|pensez-y comme)\b/gi,
      /\b(métaphore|analogie|comparé à un|tout comme|exactement comme)\b/gi,
    ],
    PASSIVE_VOICE: [
      /\b(est|sont|était|étaient|a été|ont été)\s+(\w+é|é\w+)\b/gi,
    ],
    FUTURE_FOR_FACTS: [
      /\b(sera|seront) (toujours|jamais|typiquement|habituellement|généralement)\b/gi,
    ],
    AMBIGUOUS_PRONOUNS: [
      /^(Il|Elle|Cela|Ce|Ces|Ceux)\s+(est|sont|était|étaient|a dit|a mentionné)\b/gi,
    ],
    FLUFF_OPENERS: [
      /^(Dans cet? (article|guide|publication|section)|Plongeons|Explorons|Regardons|Discutons|Vous êtes-vous jamais demandé)/i,
      /^(Bienvenue|Aujourd'hui nous|Nous allons|Nous allons)\b/i,
    ],
  },

  'Spanish': {
    STOP_WORDS: [
      'también', 'básicamente', 'en realidad', 'muy', 'realmente',
      'solo', 'bastante', 'de todos modos', 'quizás', 'tal vez',
      'ciertamente', 'definitivamente', 'obviamente', 'simplemente',
      'por supuesto', 'absolutamente', 'claramente', 'además',
    ],
    OPINIONS: [
      /\b(yo creo|nosotros creemos|yo pienso|nosotros pensamos|en mi opinión|según yo|en nuestra opinión)\b/gi,
      /\b(desafortunadamente|afortunadamente|ojalá|idealmente|curiosamente)\b/gi,
      /\b(bonito|increíble|maravilloso|terrible|horrible|fantástico|espléndido)\b/gi,
    ],
    ANALOGIES: [
      /\b(como un|similar a|es como|como si|imagina|piénsalo como)\b/gi,
      /\b(metáfora|analogía|comparado con un|igual que|exactamente como)\b/gi,
    ],
    PASSIVE_VOICE: [
      /\b(es|son|fue|fueron|ha sido|han sido)\s+(\w+ado|ido\w*)\b/gi,
    ],
    FUTURE_FOR_FACTS: [
      /\b(será|serán) (siempre|nunca|típicamente|usualmente|generalmente)\b/gi,
    ],
    AMBIGUOUS_PRONOUNS: [
      /^(Esto|Eso|Estos|Esas|Ellos|Ellas)\s+(es|son|fue|fueron|dijo|mencionó)\b/gi,
    ],
    FLUFF_OPENERS: [
      /^(En est[ea] (artículo|guía|publicación|sección)|Vamos a (sumergirnos|explorar|ver|discutir)|¿Alguna vez te has preguntado)/i,
      /^(Bienvenido a|Hoy vamos|Vamos a|Iremos a)\b/i,
    ],
  },
};

// Legacy export for backward compatibility
export const PROHIBITED_PATTERNS = MULTILINGUAL_PATTERNS['English'];

/**
 * Get patterns for a specific language, with fallback to English
 */
function getPatterns(language?: string): LanguagePatterns {
  const langName = getLanguageName(language);
  return MULTILINGUAL_PATTERNS[langName] || MULTILINGUAL_PATTERNS['English'];
}

export class ProhibitedLanguageValidator {
  /**
   * Validate content against prohibited language patterns
   * @param content - The content to validate
   * @param context - Optional context containing language setting
   */
  static validate(content: string, context?: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const language = context?.language;
    const patterns = getPatterns(language);

    // Check stop words
    for (const stopWord of patterns.STOP_WORDS) {
      const indices = this.findWordIndices(content, stopWord);
      for (const index of indices) {
        violations.push({
          rule: 'STOP_WORDS',
          text: stopWord,
          position: index,
          suggestion: `Remove filler word "${stopWord}" - it adds no semantic value`,
          severity: 'warning',
        });
      }
    }

    // Check opinions (BLOCKING - severity: 'error')
    for (const pattern of patterns.OPINIONS) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'OPINIONS',
          text: match[0],
          position: match.index || 0,
          suggestion: `Remove opinionated language "${match[0]}" - use factual statements instead`,
          severity: 'error',
        });
      }
    }

    // Check analogies (BLOCKING - severity: 'error')
    for (const pattern of patterns.ANALOGIES) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'ANALOGIES',
          text: match[0],
          position: match.index || 0,
          suggestion: `Remove analogy "${match[0]}" - analogies introduce irrelevant entities into the semantic space`,
          severity: 'error',
        });
      }
    }

    // Check fluff openers (BLOCKING - severity: 'error')
    for (const pattern of patterns.FLUFF_OPENERS) {
      if (pattern.test(content)) {
        const match = content.match(pattern);
        violations.push({
          rule: 'FLUFF_OPENERS',
          text: match?.[0] || '',
          position: 0,
          suggestion: 'Remove fluff opener - start with a direct definition or fact',
          severity: 'error',
        });
      }
    }

    // Check ambiguous pronouns at sentence starts
    const sentences = splitSentences(content);
    sentences.forEach((sentence) => {
      for (const pattern of patterns.AMBIGUOUS_PRONOUNS) {
        if (pattern.test(sentence)) {
          const match = sentence.match(pattern);
          violations.push({
            rule: 'AMBIGUOUS_PRONOUNS',
            text: match?.[0] || '',
            position: content.indexOf(sentence),
            suggestion: 'Replace ambiguous pronoun with explicit entity name',
            severity: 'warning',
          });
        }
      }
    });

    // Check future tense for facts
    for (const pattern of patterns.FUTURE_FOR_FACTS) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'FUTURE_FOR_FACTS',
          text: match[0],
          position: match.index || 0,
          suggestion: `Use present tense for permanent facts - change "${match[0]}" to present simple`,
          severity: 'warning',
        });
      }
    }

    // Check passive voice
    for (const pattern of patterns.PASSIVE_VOICE) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'PASSIVE_VOICE',
          text: match[0],
          position: match.index || 0,
          suggestion: `Convert passive voice "${match[0]}" to active voice - clarify the subject/agent`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  private static findWordIndices(content: string, word: string): number[] {
    const indices: number[] = [];
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
      indices.push(match.index);
    }
    return indices;
  }
}

// Export for testing and direct use
export { MULTILINGUAL_PATTERNS, getPatterns };
