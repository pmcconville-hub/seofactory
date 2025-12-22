// utils/languageUtils.ts
// Utility functions for language handling in AI prompts

/**
 * Map of ISO 639-1 language codes to full language names
 * Used to provide clear language instructions to AI models
 */
const LANGUAGE_MAP: Record<string, string> = {
  // Common languages
  'en': 'English',
  'nl': 'Dutch',
  'de': 'German',
  'fr': 'French',
  'es': 'Spanish',
  'it': 'Italian',
  'pt': 'Portuguese',
  'pl': 'Polish',
  'ru': 'Russian',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'tr': 'Turkish',
  'sv': 'Swedish',
  'da': 'Danish',
  'no': 'Norwegian',
  'fi': 'Finnish',
  'cs': 'Czech',
  'el': 'Greek',
  'he': 'Hebrew',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
  'ms': 'Malay',
  'uk': 'Ukrainian',
  'ro': 'Romanian',
  'hu': 'Hungarian',
  'bg': 'Bulgarian',
  'hr': 'Croatian',
  'sk': 'Slovak',
  'sl': 'Slovenian',
  'et': 'Estonian',
  'lv': 'Latvian',
  'lt': 'Lithuanian',

  // Full names (in case already provided as full name)
  'english': 'English',
  'dutch': 'Dutch',
  'german': 'German',
  'french': 'French',
  'spanish': 'Spanish',
  'italian': 'Italian',
  'portuguese': 'Portuguese',
  'polish': 'Polish',
  'russian': 'Russian',
  'chinese': 'Chinese',
  'japanese': 'Japanese',
  'korean': 'Korean',
  'arabic': 'Arabic',
  'hindi': 'Hindi',
  'turkish': 'Turkish',
  'swedish': 'Swedish',
  'danish': 'Danish',
  'norwegian': 'Norwegian',
  'finnish': 'Finnish',
  'czech': 'Czech',
  'greek': 'Greek',
  'hebrew': 'Hebrew',
  'thai': 'Thai',
  'vietnamese': 'Vietnamese',
  'indonesian': 'Indonesian',
  'malay': 'Malay',
  'ukrainian': 'Ukrainian',
  'romanian': 'Romanian',
  'hungarian': 'Hungarian',
  'bulgarian': 'Bulgarian',
  'croatian': 'Croatian',
  'slovak': 'Slovak',
  'slovenian': 'Slovenian',
  'estonian': 'Estonian',
  'latvian': 'Latvian',
  'lithuanian': 'Lithuanian',

  // Local names
  'nederlands': 'Dutch',
  'deutsch': 'German',
  'français': 'French',
  'español': 'Spanish',
  'italiano': 'Italian',
  'português': 'Portuguese',
  'polski': 'Polish',
};

/**
 * Convert a language code or name to a full language name for AI prompts
 * @param language - ISO code (en, nl) or language name (English, Dutch)
 * @returns Full language name in English (e.g., "English", "Dutch")
 */
export function getLanguageName(language: string | undefined | null): string {
  if (!language) return 'English';

  const normalized = language.trim().toLowerCase();
  return LANGUAGE_MAP[normalized] || language; // Return original if not found
}

/**
 * Get a strong language instruction for AI prompts
 * This creates an emphatic instruction to ensure the AI uses the correct language
 */
export function getLanguageInstruction(language: string | undefined | null): string {
  const langName = getLanguageName(language);
  return `**CRITICAL - OUTPUT LANGUAGE**: You MUST write ALL content in ${langName}. Do NOT use any other language. Every word, sentence, and paragraph must be in ${langName}.`;
}

/**
 * Check if language appears to be an ISO code
 */
export function isIsoCode(language: string): boolean {
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(language.trim());
}
