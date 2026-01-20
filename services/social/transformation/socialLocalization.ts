/**
 * Social Media Localization Service
 *
 * Provides language-aware phrase templates for social media post generation.
 * Supports semantic SEO best practices by avoiding generic filler phrases
 * and ensuring entity-first, fact-focused content in all languages.
 *
 * Key principles:
 * - No hardcoded English phrases in adapters
 * - Entity names should always be used explicitly (never "it" or "this")
 * - Phrases should be culturally appropriate for each platform/language
 * - Fallback to English if language not supported
 */

export type SupportedLanguage = 'en' | 'nl' | 'de' | 'fr' | 'es' | 'it' | 'pt';

/**
 * Phrase template keys used across all platform adapters
 */
export interface SocialPhrases {
  // Hub announcement phrases
  hub_hook_with_entity: string;         // "{entity}: What you need to know"
  hub_hook_generic: string;             // "Important insights"
  hub_key_points_intro: string;         // "Key points:"
  hub_cta_read_more: string;            // "Read the full guide"
  hub_cta_learn_more: string;           // "Learn more"
  hub_cta_deep_dive: string;            // "Deep dive"
  hub_cta_full_analysis: string;        // "Full analysis"

  // Key takeaway phrases
  takeaway_intro_with_entity: string;   // "About {entity}:"
  takeaway_intro_generic: string;       // "Key insight:"
  takeaway_why_matters: string;         // "Why this matters"

  // Entity spotlight phrases
  spotlight_intro: string;              // "About {entity}"
  spotlight_fact_intro: string;         // "{entity} - key fact:"
  spotlight_category_fact: string;      // "This is a {category} fact about {entity}"

  // Question hook phrases
  question_common_misconception: string; // "What's the most misunderstood aspect of {entity}?"
  question_biggest_question: string;     // "What's your biggest question about {entity}?"
  question_did_you_know: string;         // "Did you know?"
  question_what_if: string;              // "What if you've been thinking about this differently?"
  question_surprise: string;             // "The answer might surprise you"

  // Thread phrases (Twitter)
  thread_indicator: string;             // "Thread"
  thread_hook_with_entity: string;      // "Everything about {entity}:"
  thread_hook_generic: string;          // "Important insights:"
  thread_cta: string;                   // "Full breakdown"

  // Engagement phrases
  engagement_save_post: string;         // "Save this post"
  engagement_share: string;             // "Share if useful"
  engagement_comment: string;           // "Share your thoughts"
  engagement_double_tap: string;        // "Double tap if helpful"
  engagement_link_in_bio: string;       // "Link in bio"
  engagement_swipe: string;             // "Swipe to learn more"

  // Carousel/slides phrases (Instagram)
  carousel_cover_with_entity: string;   // "{entity}: What You Need to Know"
  carousel_cover_generic: string;       // "What You Need to Know"
  carousel_swipe_cta: string;           // "Swipe to learn more"
  carousel_final_cta: string;           // "Want more?"
  carousel_slides_explained: string;    // "{entity} explained in {count} slides"

  // Listicle phrases
  listicle_intro_with_entity: string;   // "{count} things about {entity}:"
  listicle_intro_generic: string;       // "{count} key insights:"

  // Pinterest phrases
  pin_learn_about: string;              // "Learn about {entity}"
  pin_complete_guide: string;           // "Complete guide to {entity}"
  pin_key_insight: string;              // "Key insight"
  pin_tips_title: string;               // "{count} {entity} tips"
  pin_discover: string;                 // "Discover"

  // General connectors (entity-safe, no pronouns)
  connector_read_full: string;          // "Read the full article"
  connector_more_details: string;       // "More details"
  connector_get_details: string;        // "Get the details"
}

/**
 * Language-specific phrase translations
 */
const PHRASE_TRANSLATIONS: Record<SupportedLanguage, SocialPhrases> = {
  en: {
    // Hub announcement
    hub_hook_with_entity: '{entity}: Essential insights',
    hub_hook_generic: 'Essential insights',
    hub_key_points_intro: 'Key points:',
    hub_cta_read_more: 'Read the full guide',
    hub_cta_learn_more: 'Learn more',
    hub_cta_deep_dive: 'Deep dive',
    hub_cta_full_analysis: 'Full analysis',

    // Key takeaway
    takeaway_intro_with_entity: 'About {entity}:',
    takeaway_intro_generic: 'Key insight:',
    takeaway_why_matters: 'Why this matters',

    // Entity spotlight
    spotlight_intro: 'About {entity}',
    spotlight_fact_intro: '{entity}:',
    spotlight_category_fact: 'A {category} fact about {entity}',

    // Questions
    question_common_misconception: 'What\'s often misunderstood about {entity}?',
    question_biggest_question: 'What\'s your question about {entity}?',
    question_did_you_know: 'Did you know?',
    question_what_if: 'A different perspective:',
    question_surprise: 'The data shows:',

    // Thread
    thread_indicator: 'Thread',
    thread_hook_with_entity: 'About {entity}:',
    thread_hook_generic: 'Key insights:',
    thread_cta: 'Full details',

    // Engagement
    engagement_save_post: 'Save for later',
    engagement_share: 'Share if useful',
    engagement_comment: 'Share your perspective',
    engagement_double_tap: 'Double tap if helpful',
    engagement_link_in_bio: 'Link in bio',
    engagement_swipe: 'Swipe for more',

    // Carousel
    carousel_cover_with_entity: '{entity}: Key Facts',
    carousel_cover_generic: 'Key Facts',
    carousel_swipe_cta: 'Swipe for more',
    carousel_final_cta: 'Full guide available',
    carousel_slides_explained: '{entity} in {count} slides',

    // Listicle
    listicle_intro_with_entity: '{count} facts about {entity}:',
    listicle_intro_generic: '{count} key facts:',

    // Pinterest
    pin_learn_about: 'Learn about {entity}',
    pin_complete_guide: '{entity} guide',
    pin_key_insight: 'Key insight',
    pin_tips_title: '{count} {entity} facts',
    pin_discover: 'Discover',

    // Connectors
    connector_read_full: 'Read the full article',
    connector_more_details: 'More details',
    connector_get_details: 'Get the details'
  },

  nl: {
    // Hub announcement
    hub_hook_with_entity: '{entity}: Belangrijke inzichten',
    hub_hook_generic: 'Belangrijke inzichten',
    hub_key_points_intro: 'Kernpunten:',
    hub_cta_read_more: 'Lees de volledige gids',
    hub_cta_learn_more: 'Meer informatie',
    hub_cta_deep_dive: 'Uitgebreide analyse',
    hub_cta_full_analysis: 'Volledige analyse',

    // Key takeaway
    takeaway_intro_with_entity: 'Over {entity}:',
    takeaway_intro_generic: 'Belangrijk inzicht:',
    takeaway_why_matters: 'Waarom dit belangrijk is',

    // Entity spotlight
    spotlight_intro: 'Over {entity}',
    spotlight_fact_intro: '{entity}:',
    spotlight_category_fact: 'Een {category} feit over {entity}',

    // Questions
    question_common_misconception: 'Wat wordt vaak verkeerd begrepen over {entity}?',
    question_biggest_question: 'Wat is jouw vraag over {entity}?',
    question_did_you_know: 'Wist je dat?',
    question_what_if: 'Een ander perspectief:',
    question_surprise: 'De data toont:',

    // Thread
    thread_indicator: 'Draad',
    thread_hook_with_entity: 'Over {entity}:',
    thread_hook_generic: 'Belangrijke inzichten:',
    thread_cta: 'Volledige details',

    // Engagement
    engagement_save_post: 'Bewaar voor later',
    engagement_share: 'Deel als nuttig',
    engagement_comment: 'Deel je perspectief',
    engagement_double_tap: 'Dubbeltik als nuttig',
    engagement_link_in_bio: 'Link in bio',
    engagement_swipe: 'Veeg voor meer',

    // Carousel
    carousel_cover_with_entity: '{entity}: Kernfeiten',
    carousel_cover_generic: 'Kernfeiten',
    carousel_swipe_cta: 'Veeg voor meer',
    carousel_final_cta: 'Volledige gids beschikbaar',
    carousel_slides_explained: '{entity} in {count} slides',

    // Listicle
    listicle_intro_with_entity: '{count} feiten over {entity}:',
    listicle_intro_generic: '{count} kernfeiten:',

    // Pinterest
    pin_learn_about: 'Leer over {entity}',
    pin_complete_guide: '{entity} gids',
    pin_key_insight: 'Belangrijk inzicht',
    pin_tips_title: '{count} {entity} feiten',
    pin_discover: 'Ontdek',

    // Connectors
    connector_read_full: 'Lees het volledige artikel',
    connector_more_details: 'Meer details',
    connector_get_details: 'Bekijk de details'
  },

  de: {
    // Hub announcement
    hub_hook_with_entity: '{entity}: Wichtige Erkenntnisse',
    hub_hook_generic: 'Wichtige Erkenntnisse',
    hub_key_points_intro: 'Kernpunkte:',
    hub_cta_read_more: 'Vollständigen Leitfaden lesen',
    hub_cta_learn_more: 'Mehr erfahren',
    hub_cta_deep_dive: 'Tiefgehende Analyse',
    hub_cta_full_analysis: 'Vollständige Analyse',

    // Key takeaway
    takeaway_intro_with_entity: 'Über {entity}:',
    takeaway_intro_generic: 'Wichtige Erkenntnis:',
    takeaway_why_matters: 'Warum das wichtig ist',

    // Entity spotlight
    spotlight_intro: 'Über {entity}',
    spotlight_fact_intro: '{entity}:',
    spotlight_category_fact: 'Ein {category} Fakt über {entity}',

    // Questions
    question_common_misconception: 'Was wird bei {entity} oft missverstanden?',
    question_biggest_question: 'Was ist Ihre Frage zu {entity}?',
    question_did_you_know: 'Wussten Sie?',
    question_what_if: 'Eine andere Perspektive:',
    question_surprise: 'Die Daten zeigen:',

    // Thread
    thread_indicator: 'Thread',
    thread_hook_with_entity: 'Über {entity}:',
    thread_hook_generic: 'Wichtige Erkenntnisse:',
    thread_cta: 'Vollständige Details',

    // Engagement
    engagement_save_post: 'Für später speichern',
    engagement_share: 'Teilen wenn nützlich',
    engagement_comment: 'Teilen Sie Ihre Perspektive',
    engagement_double_tap: 'Doppeltippen wenn hilfreich',
    engagement_link_in_bio: 'Link in Bio',
    engagement_swipe: 'Wischen für mehr',

    // Carousel
    carousel_cover_with_entity: '{entity}: Kernfakten',
    carousel_cover_generic: 'Kernfakten',
    carousel_swipe_cta: 'Wischen für mehr',
    carousel_final_cta: 'Vollständiger Leitfaden verfügbar',
    carousel_slides_explained: '{entity} in {count} Slides',

    // Listicle
    listicle_intro_with_entity: '{count} Fakten über {entity}:',
    listicle_intro_generic: '{count} Kernfakten:',

    // Pinterest
    pin_learn_about: 'Erfahren Sie mehr über {entity}',
    pin_complete_guide: '{entity} Leitfaden',
    pin_key_insight: 'Wichtige Erkenntnis',
    pin_tips_title: '{count} {entity} Fakten',
    pin_discover: 'Entdecken',

    // Connectors
    connector_read_full: 'Vollständigen Artikel lesen',
    connector_more_details: 'Mehr Details',
    connector_get_details: 'Details ansehen'
  },

  fr: {
    // Hub announcement
    hub_hook_with_entity: '{entity}: Points clés',
    hub_hook_generic: 'Points clés',
    hub_key_points_intro: 'Points essentiels:',
    hub_cta_read_more: 'Lire le guide complet',
    hub_cta_learn_more: 'En savoir plus',
    hub_cta_deep_dive: 'Analyse approfondie',
    hub_cta_full_analysis: 'Analyse complète',

    // Key takeaway
    takeaway_intro_with_entity: 'À propos de {entity}:',
    takeaway_intro_generic: 'Point clé:',
    takeaway_why_matters: 'Pourquoi c\'est important',

    // Entity spotlight
    spotlight_intro: 'À propos de {entity}',
    spotlight_fact_intro: '{entity}:',
    spotlight_category_fact: 'Un fait {category} sur {entity}',

    // Questions
    question_common_misconception: 'Qu\'est-ce qui est souvent mal compris sur {entity}?',
    question_biggest_question: 'Quelle est votre question sur {entity}?',
    question_did_you_know: 'Saviez-vous?',
    question_what_if: 'Une autre perspective:',
    question_surprise: 'Les données montrent:',

    // Thread
    thread_indicator: 'Fil',
    thread_hook_with_entity: 'À propos de {entity}:',
    thread_hook_generic: 'Points clés:',
    thread_cta: 'Détails complets',

    // Engagement
    engagement_save_post: 'Enregistrer pour plus tard',
    engagement_share: 'Partager si utile',
    engagement_comment: 'Partagez votre avis',
    engagement_double_tap: 'Double tap si utile',
    engagement_link_in_bio: 'Lien en bio',
    engagement_swipe: 'Glisser pour plus',

    // Carousel
    carousel_cover_with_entity: '{entity}: Faits clés',
    carousel_cover_generic: 'Faits clés',
    carousel_swipe_cta: 'Glisser pour plus',
    carousel_final_cta: 'Guide complet disponible',
    carousel_slides_explained: '{entity} en {count} slides',

    // Listicle
    listicle_intro_with_entity: '{count} faits sur {entity}:',
    listicle_intro_generic: '{count} faits clés:',

    // Pinterest
    pin_learn_about: 'En savoir plus sur {entity}',
    pin_complete_guide: 'Guide {entity}',
    pin_key_insight: 'Point clé',
    pin_tips_title: '{count} faits sur {entity}',
    pin_discover: 'Découvrir',

    // Connectors
    connector_read_full: 'Lire l\'article complet',
    connector_more_details: 'Plus de détails',
    connector_get_details: 'Voir les détails'
  },

  es: {
    // Hub announcement
    hub_hook_with_entity: '{entity}: Información clave',
    hub_hook_generic: 'Información clave',
    hub_key_points_intro: 'Puntos clave:',
    hub_cta_read_more: 'Leer la guía completa',
    hub_cta_learn_more: 'Más información',
    hub_cta_deep_dive: 'Análisis profundo',
    hub_cta_full_analysis: 'Análisis completo',

    // Key takeaway
    takeaway_intro_with_entity: 'Sobre {entity}:',
    takeaway_intro_generic: 'Punto clave:',
    takeaway_why_matters: 'Por qué esto importa',

    // Entity spotlight
    spotlight_intro: 'Sobre {entity}',
    spotlight_fact_intro: '{entity}:',
    spotlight_category_fact: 'Un hecho {category} sobre {entity}',

    // Questions
    question_common_misconception: '¿Qué se malinterpreta a menudo sobre {entity}?',
    question_biggest_question: '¿Cuál es tu pregunta sobre {entity}?',
    question_did_you_know: '¿Sabías que?',
    question_what_if: 'Otra perspectiva:',
    question_surprise: 'Los datos muestran:',

    // Thread
    thread_indicator: 'Hilo',
    thread_hook_with_entity: 'Sobre {entity}:',
    thread_hook_generic: 'Puntos clave:',
    thread_cta: 'Detalles completos',

    // Engagement
    engagement_save_post: 'Guardar para después',
    engagement_share: 'Compartir si es útil',
    engagement_comment: 'Comparte tu opinión',
    engagement_double_tap: 'Doble tap si es útil',
    engagement_link_in_bio: 'Enlace en bio',
    engagement_swipe: 'Desliza para más',

    // Carousel
    carousel_cover_with_entity: '{entity}: Datos clave',
    carousel_cover_generic: 'Datos clave',
    carousel_swipe_cta: 'Desliza para más',
    carousel_final_cta: 'Guía completa disponible',
    carousel_slides_explained: '{entity} en {count} slides',

    // Listicle
    listicle_intro_with_entity: '{count} datos sobre {entity}:',
    listicle_intro_generic: '{count} datos clave:',

    // Pinterest
    pin_learn_about: 'Aprende sobre {entity}',
    pin_complete_guide: 'Guía de {entity}',
    pin_key_insight: 'Punto clave',
    pin_tips_title: '{count} datos de {entity}',
    pin_discover: 'Descubre',

    // Connectors
    connector_read_full: 'Leer el artículo completo',
    connector_more_details: 'Más detalles',
    connector_get_details: 'Ver detalles'
  },

  it: {
    // Hub announcement
    hub_hook_with_entity: '{entity}: Informazioni chiave',
    hub_hook_generic: 'Informazioni chiave',
    hub_key_points_intro: 'Punti chiave:',
    hub_cta_read_more: 'Leggi la guida completa',
    hub_cta_learn_more: 'Scopri di più',
    hub_cta_deep_dive: 'Analisi approfondita',
    hub_cta_full_analysis: 'Analisi completa',

    // Key takeaway
    takeaway_intro_with_entity: 'Su {entity}:',
    takeaway_intro_generic: 'Punto chiave:',
    takeaway_why_matters: 'Perché è importante',

    // Entity spotlight
    spotlight_intro: 'Su {entity}',
    spotlight_fact_intro: '{entity}:',
    spotlight_category_fact: 'Un fatto {category} su {entity}',

    // Questions
    question_common_misconception: 'Cosa viene spesso frainteso su {entity}?',
    question_biggest_question: 'Qual è la tua domanda su {entity}?',
    question_did_you_know: 'Sapevi che?',
    question_what_if: 'Un\'altra prospettiva:',
    question_surprise: 'I dati mostrano:',

    // Thread
    thread_indicator: 'Thread',
    thread_hook_with_entity: 'Su {entity}:',
    thread_hook_generic: 'Punti chiave:',
    thread_cta: 'Dettagli completi',

    // Engagement
    engagement_save_post: 'Salva per dopo',
    engagement_share: 'Condividi se utile',
    engagement_comment: 'Condividi il tuo punto di vista',
    engagement_double_tap: 'Doppio tap se utile',
    engagement_link_in_bio: 'Link in bio',
    engagement_swipe: 'Scorri per saperne di più',

    // Carousel
    carousel_cover_with_entity: '{entity}: Fatti chiave',
    carousel_cover_generic: 'Fatti chiave',
    carousel_swipe_cta: 'Scorri per saperne di più',
    carousel_final_cta: 'Guida completa disponibile',
    carousel_slides_explained: '{entity} in {count} slide',

    // Listicle
    listicle_intro_with_entity: '{count} fatti su {entity}:',
    listicle_intro_generic: '{count} fatti chiave:',

    // Pinterest
    pin_learn_about: 'Scopri {entity}',
    pin_complete_guide: 'Guida {entity}',
    pin_key_insight: 'Punto chiave',
    pin_tips_title: '{count} fatti su {entity}',
    pin_discover: 'Scopri',

    // Connectors
    connector_read_full: 'Leggi l\'articolo completo',
    connector_more_details: 'Maggiori dettagli',
    connector_get_details: 'Vedi i dettagli'
  },

  pt: {
    // Hub announcement
    hub_hook_with_entity: '{entity}: Informações essenciais',
    hub_hook_generic: 'Informações essenciais',
    hub_key_points_intro: 'Pontos-chave:',
    hub_cta_read_more: 'Leia o guia completo',
    hub_cta_learn_more: 'Saiba mais',
    hub_cta_deep_dive: 'Análise aprofundada',
    hub_cta_full_analysis: 'Análise completa',

    // Key takeaway
    takeaway_intro_with_entity: 'Sobre {entity}:',
    takeaway_intro_generic: 'Ponto-chave:',
    takeaway_why_matters: 'Por que isso importa',

    // Entity spotlight
    spotlight_intro: 'Sobre {entity}',
    spotlight_fact_intro: '{entity}:',
    spotlight_category_fact: 'Um fato {category} sobre {entity}',

    // Questions
    question_common_misconception: 'O que é frequentemente mal interpretado sobre {entity}?',
    question_biggest_question: 'Qual é sua pergunta sobre {entity}?',
    question_did_you_know: 'Você sabia?',
    question_what_if: 'Outra perspectiva:',
    question_surprise: 'Os dados mostram:',

    // Thread
    thread_indicator: 'Thread',
    thread_hook_with_entity: 'Sobre {entity}:',
    thread_hook_generic: 'Pontos-chave:',
    thread_cta: 'Detalhes completos',

    // Engagement
    engagement_save_post: 'Salve para depois',
    engagement_share: 'Compartilhe se útil',
    engagement_comment: 'Compartilhe sua opinião',
    engagement_double_tap: 'Duplo toque se útil',
    engagement_link_in_bio: 'Link na bio',
    engagement_swipe: 'Deslize para mais',

    // Carousel
    carousel_cover_with_entity: '{entity}: Fatos principais',
    carousel_cover_generic: 'Fatos principais',
    carousel_swipe_cta: 'Deslize para mais',
    carousel_final_cta: 'Guia completo disponível',
    carousel_slides_explained: '{entity} em {count} slides',

    // Listicle
    listicle_intro_with_entity: '{count} fatos sobre {entity}:',
    listicle_intro_generic: '{count} fatos principais:',

    // Pinterest
    pin_learn_about: 'Aprenda sobre {entity}',
    pin_complete_guide: 'Guia de {entity}',
    pin_key_insight: 'Ponto-chave',
    pin_tips_title: '{count} fatos sobre {entity}',
    pin_discover: 'Descubra',

    // Connectors
    connector_read_full: 'Leia o artigo completo',
    connector_more_details: 'Mais detalhes',
    connector_get_details: 'Veja os detalhes'
  }
};

/**
 * Category translations for EAV categories
 */
const CATEGORY_TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: { unique: 'unique', rare: 'rare', root: 'fundamental', common: 'key' },
  nl: { unique: 'uniek', rare: 'zeldzaam', root: 'fundamenteel', common: 'belangrijk' },
  de: { unique: 'einzigartig', rare: 'selten', root: 'grundlegend', common: 'wichtig' },
  fr: { unique: 'unique', rare: 'rare', root: 'fondamental', common: 'clé' },
  es: { unique: 'único', rare: 'raro', root: 'fundamental', common: 'clave' },
  it: { unique: 'unico', rare: 'raro', root: 'fondamentale', common: 'chiave' },
  pt: { unique: 'único', rare: 'raro', root: 'fundamental', common: 'chave' }
};

/**
 * Social Localization Service
 *
 * Provides localized phrases for social media post generation.
 */
export class SocialLocalizationService {
  private defaultLanguage: SupportedLanguage = 'en';

  /**
   * Get phrases for a specific language
   */
  getPhrases(language?: string): SocialPhrases {
    const lang = this.normalizeLanguage(language);
    return PHRASE_TRANSLATIONS[lang] || PHRASE_TRANSLATIONS[this.defaultLanguage];
  }

  /**
   * Get a specific phrase with variable substitution
   *
   * @param key - The phrase key
   * @param language - Language code (defaults to 'en')
   * @param vars - Variables to substitute (e.g., { entity: 'SEO', count: 5 })
   */
  getPhrase(
    key: keyof SocialPhrases,
    language?: string,
    vars?: Record<string, string | number>
  ): string {
    const phrases = this.getPhrases(language);
    let phrase = phrases[key] || PHRASE_TRANSLATIONS[this.defaultLanguage][key];

    // Substitute variables
    if (vars) {
      for (const [varKey, varValue] of Object.entries(vars)) {
        phrase = phrase.replace(new RegExp(`\\{${varKey}\\}`, 'g'), String(varValue));
      }
    }

    return phrase;
  }

  /**
   * Get translated category name
   */
  getCategory(category: string | undefined, language?: string): string {
    if (!category) return '';
    const lang = this.normalizeLanguage(language);
    const categories = CATEGORY_TRANSLATIONS[lang] || CATEGORY_TRANSLATIONS[this.defaultLanguage];
    return categories[category.toLowerCase()] || category.toLowerCase();
  }

  /**
   * Normalize language code to supported language
   * Handles variants like 'nl-NL', 'en-US', etc.
   */
  normalizeLanguage(language?: string): SupportedLanguage {
    if (!language) return this.defaultLanguage;

    // Get base language code (e.g., 'nl' from 'nl-NL')
    const baseLang = language.split('-')[0].toLowerCase();

    // Check if supported
    if (baseLang in PHRASE_TRANSLATIONS) {
      return baseLang as SupportedLanguage;
    }

    // Map common variants
    const languageMap: Record<string, SupportedLanguage> = {
      'dutch': 'nl',
      'german': 'de',
      'french': 'fr',
      'spanish': 'es',
      'italian': 'it',
      'portuguese': 'pt',
      'english': 'en'
    };

    if (baseLang in languageMap) {
      return languageMap[baseLang];
    }

    return this.defaultLanguage;
  }

  /**
   * Check if a language is supported
   */
  isSupported(language?: string): boolean {
    if (!language) return false;
    const baseLang = language.split('-')[0].toLowerCase();
    return baseLang in PHRASE_TRANSLATIONS;
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return Object.keys(PHRASE_TRANSLATIONS) as SupportedLanguage[];
  }
}

// Export singleton instance
export const socialLocalization = new SocialLocalizationService();
